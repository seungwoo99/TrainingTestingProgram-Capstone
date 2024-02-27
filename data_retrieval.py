# Standard library imports
import random
import logging

# Related third-party imports
from sqlalchemy import text
from sqlalchemy.exc import SQLAlchemyError

# Local application/library specific imports
from db_config import db

# Configure logging settings to log messages to the terminal.
# Set log level to DEBUG and specify log message format.
logging.basicConfig(level=logging.DEBUG, format='%(name)s - %(levelname)s - %(message)s')

# Function to fetch test creation options from the database.
def fetch_test_creation_options():
    try:
        # Connect to the database using db.engine.
        with db.engine.connect() as connection:
            # Retrieve distinct values for various parameters.
            blooms_taxonomy = connection.execute(text("SELECT DISTINCT name FROM blooms_tax")).fetchall()
            subjects = connection.execute(text("SELECT DISTINCT name FROM subjects")).fetchall()
            topics = connection.execute(text("SELECT DISTINCT name FROM topics")).fetchall()
            question_types = connection.execute(text("SELECT DISTINCT question_type FROM questions")).fetchall()
            question_difficulty = connection.execute(text("SELECT DISTINCT question_difficulty FROM questions")).fetchall()

        # Clean and simplify the fetched data into a dictionary.
        options = {
            'blooms_taxonomy': [category[0].strip() for category in blooms_taxonomy],
            'subjects': [subject[0].strip() for subject in subjects],
            'topics': [topic[0].strip() for topic in topics],
            'question_types': [q_type[0].strip() for q_type in question_types],
            'question_difficulty': [str(q_difficulty[0]).strip() for q_difficulty in question_difficulty]
        }
        return options
    
    except SQLAlchemyError as e:
        logging.error("An error occurred while creating the test", exc_info=True)
        return {"error": str(e)}, 500
    except Exception as e:
        # Log and raise any exceptions that occur during the process.
        logging.error("An error occurred while fetching test creation options:", exc_info=True)
        raise

# Function to query the database for questions that match user inputs to create a pool of questions
def get_questions(blooms_taxonomy, subjects, topics, question_types, question_difficulties, training_level_conditions, max_points=None):
    try:
        # Log that we are connecting to the database.
        logging.info("Connecting to the database.")

        # Use a context manager to safely interact with the database.
        with db.engine.connect() as connection:
            where_clauses = []  # List to store WHERE clauses.
            params = {}  # Dictionary to store parameters for the SQL query.

            # Check if blooms_taxonomy filter is provided.
            if blooms_taxonomy:
                placeholders = ', '.join([f':blooms_taxonomy{i}' for i in range(len(blooms_taxonomy))])
                clause = f'b.name IN ({placeholders})'
                where_clauses.append(clause)
                params.update({f'blooms_taxonomy{i}': category for i, category in enumerate(blooms_taxonomy)})

            # Check if subjects filter is provided.
            if subjects:
                placeholders = ', '.join([f':subject_{i}' for i in range(len(subjects))])
                clause = f's.name IN ({placeholders})'
                where_clauses.append(clause)
                params.update({f'subject_{i}': subject for i, subject in enumerate(subjects)})

            # Check if topics filter is provided.
            if topics:
                placeholders = ', '.join([f':topic_{i}' for i in range(len(topics))])
                clause = f't.name IN ({placeholders})'
                where_clauses.append(clause)
                params.update({f'topic_{i}': topic for i, topic in enumerate(topics)})

            # Group the conditions for blooms_taxonomy, subjects, and topics.
            grouped_conditions = ' OR '.join(where_clauses) if where_clauses else '1'
            where_clauses = [f"({grouped_conditions})"]

            # Check if question_types filter is provided.
            if question_types:
                placeholders = ', '.join([f':question_type_{i}' for i in range(len(question_types))])
                clause = f'q.question_type IN ({placeholders})'
                where_clauses.append(clause)
                params.update({f'question_type_{i}': q_type for i, q_type in enumerate(question_types)})

            # Check if question_difficulties filter is provided.
            if question_difficulties:
                placeholders = ', '.join([f':question_difficulty_{i}' for i in range(len(question_difficulties))])
                clause = f'q.question_difficulty IN ({placeholders})'
                where_clauses.append(clause)
                params.update({f'question_difficulty_{i}': q_difficulty for i, q_difficulty in enumerate(question_difficulties)})

            # Check if a specified training level is provided.
            if training_level_conditions:
                for column, value in training_level_conditions.items():
                    where_clauses.append(f"lo.{column} = :{column}")
                    params[column] = value
            
            # Check if a specified question point value is provided.
            if max_points is not None and max_points > 0:
                where_clauses.append("q.max_points <= :max_points")
                params['max_points'] = max_points

            # Construct the WHERE statement based on the clauses.
            where_statement = ' AND '.join(where_clauses)

            # Define the SQL query with placeholders.
            sql = text(f"""
                SELECT q.question_id, q.question_desc, q.max_points
                FROM questions q
                INNER JOIN learning_objectives lo ON q.obj_id = lo.obj_id
                INNER JOIN blooms_tax b ON lo.blooms_id = b.blooms_id
                INNER JOIN topics t ON lo.topic_id = t.topic_id
                INNER JOIN subjects s ON t.subject_id = s.subject_id
                WHERE {where_statement}
            """)

            # Execute the SQL query with the provided parameters.
            result = connection.execute(sql, params).fetchall()

            # Log the generated SQL query and parameters.
            logging.debug(f"Generated SQL Query: {sql}")
            logging.debug(f"Parameters: {params}")

            # Log a success message.
            logging.info("Query executed successfully.")

            # Return the result of the SQL query.
            return result

    except SQLAlchemyError as e:
        logging.error("An error occurred while creating the test", exc_info=True)
        return {"error": str(e)}, 500
    except Exception as e:
        logging.error(f"Error while getting questions: {e}", exc_info=True)
        return None

# Function to select questions from a pool based on user preferences.
def select_questions(questions_pool, num_questions, max_points):
    logging.info("Selecting questions from the pool.")
    logging.debug(f"Starting question selection. Total questions in pool: {len(questions_pool)}, Requested number of questions: {num_questions}, Max points allowed: {max_points}")

    random.shuffle(questions_pool)
    selected_questions = []
    current_points = 0

    for question in questions_pool:
        question_points = int(question[2])
        if current_points + question_points > max_points:
            logging.debug(f"Skipping question ID: {question[0]} due to exceeding max points. Question points: {question_points}, Current total points: {current_points}, Max points: {max_points}")
            continue
        logging.debug(f"Selecting question ID: {question[0]}. Question points: {question_points}, Current total points before selection: {current_points}")
        selected_questions.append(question)
        current_points += question_points
        if len(selected_questions) == num_questions:
            break

    logging.debug(f"Finished question selection. Total selected questions: {len(selected_questions)}, Total points of selected questions: {current_points}")
    return selected_questions, current_points

def create_test(is_active, created_by, creation_date, test_name, test_description, total_score, question_order):
    # Log the start of the create_test function
    logging.info("Starting create_test function")
    try:
        # Convert is_active to integer
        is_active_db = int(is_active)
        # Log parameters received for creating the test
        logging.info(f"Parameters received: active_status={is_active_db}, created_by={created_by}, test_name={test_name}, ...")

        # Begin a transaction
        with db.engine.begin() as transaction:
            logging.info("Transaction started")
            logging.info("Attempting to insert into tests table")
            # Execute SQL query to insert test data into tests table
            result = transaction.execute(
                text(
                    "INSERT INTO tests (active_status, created_by, creation_date, last_modified_date, modified_by, test_name, test_description, total_score) "
                    "VALUES (:active_status, :created_by, :creation_date, :creation_date, :created_by, :test_name, :test_description, :total_score)"
                ),
                {
                    "active_status": is_active_db,
                    "created_by": created_by,
                    "creation_date": creation_date,
                    "last_modified_date": creation_date,
                    "modified_by": created_by,
                    "test_name": test_name,
                    "test_description": test_description,
                    "total_score": total_score
                }
            )
            # Get the ID of the newly inserted test
            test_id = result.lastrowid
            # Log successful insertion of the test
            logging.info(f"Successfully inserted test with ID {test_id}")

            # Track the number of successful inserts for questions
            successful_inserts = 0
            # Iterate over question order to insert each question into test_questions table
            for order in question_order:
                # Check if question_order is not None
                if order['question_order'] is not None:
                    # Convert question_order to integer
                    question_order_int = int(order['question_order'])
                    # Execute SQL query to insert question into test_questions table
                    transaction.execute(
                        text(
                            "INSERT INTO test_questions (question_id, question_order, test_id) "
                            "VALUES (:question_id, :question_order, :test_id)"
                        ),
                        {
                            "question_id": order['question_id'],
                            "question_order": question_order_int,
                            "test_id": test_id
                        }
                    )
                    # Increment successful inserts count
                    successful_inserts += 1

            # If not all questions were successfully inserted, raise an error
            if successful_inserts != len(question_order):
                raise ValueError("Not all questions were successfully inserted.")
                
            # Commit the transaction if everything went well
            transaction.execute("COMMIT")
            # Log the commitment of the transaction
            logging.info("Transaction committed")
            # Return a success message with the ID of the created test
            return {"message": f"Test '{test_name}' created successfully with ID {test_id}"}

    except ValueError as e:
        logging.error("There was a problem inserting the questions: %s", str(e), exc_info=True)
        return {"error": str(e)}
    except SQLAlchemyError as e:
        logging.error("An error occurred while creating the test in the database", exc_info=True)
        return {"error": str(e)}
    except Exception as e:
        logging.error("Unexpected error while creating the test", exc_info=True)
        return {"error": "An unexpected error occurred while creating the test."}
    
# Function to get user from database
def get_user(input_user):

    try:
        # Connect to the database using db.engine.
        with db.engine.connect() as connection:

            # Query hashed password by username
            query = text("SELECT * FROM user WHERE username = :username")
            result = connection.execute(query, username=input_user)

            row = result.fetchone()

            return row

    except Exception as e:
        # Log an error message with exception details.
        logging.error(f"Error while getting questions: {e}", exc_info=True)


def check_registered(input_username, input_email):

    try:
        # Connect to the database using db.engine.
        with db.engine.connect() as connection:

            # Check if by username or email is already registered
            query = text("SELECT * FROM user WHERE username = :username OR email = :email")
            result = connection.execute(query, username=input_username, email=input_email)

            row = result.fetchone()

            return row

    except Exception as e:
        # Log an error message with exception details.
        logging.error(f"Error while getting questions: {e}", exc_info=True)

def get_test_questions(test_id):

    try:
        # Connect to the database using db.engine.
        with db.engine.connect() as connection:

            # Execute the SQL query to retrieve question data for the selected test ID
            sql_query = text("""
                    SELECT *
                    FROM tests t
                    JOIN test_questions tq ON t.test_id = tq.test_id
                    JOIN questions q ON tq.question_id = q.question_id
                    WHERE t.test_id = :test_id
                    ORDER BY question_order
                """)

            result = connection.execute(sql_query, test_id=test_id)

            # Extract question texts from the result
            test_questions = [row for row in result]

            return test_questions

    except Exception as e:
        # Log an error message with exception details.
        logging.error(f"Error while getting questions: {e}", exc_info=True)

def get_test_data(test_id):

    try:
        # Connect to the database using db.engine.
        with db.engine.connect() as connection:

            # Execute query to retrieve all tests
            # Execute the SQL query to retrieve test data
            sql_query = text("""
                    SELECT * FROM tests
                    WHERE test_id = :test_id
            """)
            result = connection.execute(sql_query, test_id=test_id)

            # Fetch the test data
            test_data = result.fetchone()

            if test_data:
                # Convert the row to a dictionary where column names are the keys
                test_data_dict = dict(test_data)
                return test_data_dict

            return "Error fetching test information"

    except Exception as e:
        # Log an error message with exception details.
        logging.error(f"Error while getting test data: {e}", exc_info=True)


# Function that returns test list from the database
def get_tests():
    test_query = text("SELECT t.test_id, t.test_name, GROUP_CONCAT(DISTINCT s.name) AS subject_name, GROUP_CONCAT(DISTINCT tp.name) AS topic_name, t.creation_date, t.last_modified_date FROM tests t "
                      + "LEFT JOIN test_questions tq ON t.test_id = tq.test_id "
                      + "LEFT JOIN questions q ON tq.question_id = q.question_id "
                      + "LEFT JOIN learning_objectives lo ON q.obj_id = lo.obj_id "
                      + "LEFT JOIN topics tp ON lo.topic_id = tp.topic_id "
                      + "LEFT JOIN subjects s ON tp.subject_id = s.subject_id "
                      + "GROUP BY t.test_id, t.test_name, s.name, t.creation_date, t.last_modified_date")
    test_result = db.engine.execute(test_query)

    # fetch all rows of the result
    test_data = test_result.fetchall()
    return test_data

# Function that returns subject list from the database
def get_subjects():
    subject_query = text("SELECT subject_id, name FROM subjects")
    subject_result = db.engine.execute(subject_query)
    data = subject_result.fetchall()

    return data

# Function that returns topic list from the database
def get_topics():
    topic_query = text("SELECT topic_id, name FROM topics")
    topic_result = db.engine.execute(topic_query)
    data = topic_result.fetchall()

    return data


# Function that returns tester list from the database
def get_tester_list(test_id):
    tester_query = text("SELECT score_id, tester_id, test_id, testee_name, attempt_date, total_score, pass_status "
                        +"FROM ( "
                        +"SELECT ts.score_id, ts.tester_id, ts.test_id, te.testee_name, ts.attempt_date, ts.total_score, ts.pass_status, "
                        +"ROW_NUMBER() OVER (PARTITION BY ts.tester_id ORDER BY ts.attempt_date DESC) AS rn "
                        +"FROM test_scores ts "
                        +"LEFT JOIN testee te ON ts.tester_id = te.tester_id "
                        +"WHERE ts.test_id = :test_id "
                        +") AS ranked "
                        +"WHERE rn = 1")

    tester_result = db.engine.execute(tester_query, test_id=test_id)
    data = tester_result.fetchall()

    return data

def selectSubjectNames():
    with db.engine.connect() as connection:
        query = text("SELECT name FROM subjects")
        result = connection.execute(query).fetchall()

    return result

def selectSubjectDescriptions():
    with db.engine.connect() as connection:
        query = text("SELECT description FROM subjects")
        result = connection.execute(query).fetchall()

    return result

def insertSubject(name, description):
    with db.engine.connect() as connection:
        query=text("""INSERT INTO subjects (subject_id,name,description) VALUES (0,:name,:description)""")
        connection.execute(query,name=name, description=description)

def insertTopic(subject_id, name, description, facility):
    with db.engine.connect() as connection:
        query=text("""INSERT INTO topics (topic_id, subject_id, name, description, facility) VALUES (0,:subject_id,:name,:description,:facility)""")
        connection.execute(query,subject_id=subject_id,name=name, description=description, facility=facility)




def get_all_subjects():
    with db.engine.connect() as connection:
        query = text("SELECT * FROM subjects")
        result = connection.execute(query).fetchall()

    return result

def get_all_topics(subject_id):
    with db.engine.connect() as connection:

        # Execute the SQL query to retrieve all topics for a subject
        sql_query = text("""
                            SELECT * FROM topics 
                            WHERE subject_id = :subject_id
                    """)
        result = connection.execute(sql_query, subject_id=subject_id)

        # get subject name and description
        sql_query = text("""
                                    SELECT name, description FROM subjects 
                                    WHERE subject_id = :subject_id
                            """)
        subject_data = connection.execute(sql_query, subject_id=subject_id)
        subject_data = subject_data.fetchone()

    return result, subject_data

def get_all_objectives(topic_id):
    with db.engine.connect() as connection:

        # Execute the SQL query to retrieve all topics for a subject
        sql_query = text("""
                            SELECT l.obj_id, l.description as obj_description,
                             name as blooms_name, is_applicant, is_apprentice,
                              is_journeyman, is_senior, is_chief, is_coordinator,
                               tags FROM learning_objectives l 
                            JOIN blooms_tax b ON b.blooms_id = l.blooms_id
                            WHERE topic_id = :topic_id
                    """)
        result = connection.execute(sql_query, topic_id=topic_id)

        # get subject name and description
        sql_query = text("""
                                    SELECT name FROM topics
                                    WHERE topic_id = :topic_id
                            """)
        topic_data = connection.execute(sql_query, topic_id=topic_id)
        topic_data = topic_data.fetchone()

    return result, topic_data

def get_all_questions(obj_id):
    with db.engine.connect() as connection:
        # Execute the SQL query to retrieve all questions for a learning objective
        sql_query = text("""
                            SELECT * FROM questions
                            WHERE obj_id = :obj_id
                    """)
        result = connection.execute(sql_query, obj_id=obj_id)

        # get objective description
        sql_query = text("""
                            SELECT description FROM learning_objectives
                            WHERE obj_id = :obj_id
                        """)
        obj_data = connection.execute(sql_query, obj_id=obj_id)
        obj_data = obj_data.fetchone()

    return result, obj_data

def get_objs_temp():

    try:
        # Connect to the database using db.engine.
        with db.engine.connect() as connection:

            # Execute query to retrieve all tests
            # Execute the SQL query to retrieve all tests
            sql_query = text("""
                        SELECT obj_id, description
                        FROM learning_objectives
                    """)
            result = connection.execute(sql_query)

            # Extract tests from the result
            obj_list = [row for row in result]

            return obj_list

    except Exception as e:
        # Log an error message with exception details.
        logging.error(f"Error while getting test list: {e}", exc_info=True)

def insertLearningObjective(topic_id, description, blooms_id, applicant, apprentice, journeyman, senior, chief, coordinator, tags):
    with db.engine.connect() as connection:
        query=text("""INSERT INTO learning_objectives (obj_id, topic_id, description, blooms_id, is_applicant, is_apprentice, is_journeyman, is_senior, is_chief, is_coordinator, tags) VALUES (0,:topic_id,:description,:blooms_id,:applicant,:apprentice,:journeyman,:senior,:chief,:coordinator,:tags)""")
        connection.execute(query,topic_id=topic_id, description=description, blooms_id=blooms_id, applicant=applicant, apprentice=apprentice, journeyman=journeyman, senior=senior, chief=chief, coordinator=coordinator, tags=tags)