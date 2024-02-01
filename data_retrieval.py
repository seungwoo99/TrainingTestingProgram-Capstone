# Standard library imports
import random
import logging

# Related third-party imports
from sqlalchemy import text

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
            blooms_levels = connection.execute(text("SELECT DISTINCT name FROM blooms_tax")).fetchall()
            subjects = connection.execute(text("SELECT DISTINCT name FROM subjects")).fetchall()
            topics = connection.execute(text("SELECT DISTINCT name FROM topics")).fetchall()
            question_types = connection.execute(text("SELECT DISTINCT question_type FROM questions")).fetchall()
            question_difficulty = connection.execute(text("SELECT DISTINCT question_difficulty FROM questions")).fetchall()

        # Clean and simplify the fetched data into a dictionary.
        options = {
            'blooms_levels': [level[0].strip() for level in blooms_levels],
            'subjects': [subject[0].strip() for subject in subjects],
            'topics': [topic[0].strip() for topic in topics],
            'question_types': [q_type[0].strip() for q_type in question_types],
            'question_difficulty': [str(q_difficulty[0]).strip() for q_difficulty in question_difficulty]
        }
        return options

    except Exception as e:
        # Log and raise any exceptions that occur during the process.
        logging.error("An error occurred while fetching test creation options:", exc_info=True)
        raise

# Function to query the database for questions that match user inputs to create a pool of questions
def get_questions(blooms_levels, subjects, topics, question_types, question_difficulties):
    try:
        # Log that we are connecting to the database.
        logging.info("Connecting to the database.")

        # Use a context manager to safely interact with the database.
        with db.engine.connect() as connection:
            where_clauses = []  # List to store WHERE clauses.
            params = {}  # Dictionary to store parameters for the SQL query.

            # Check if blooms_levels filter is provided.
            if blooms_levels:
                # Generate placeholders for the IN clause.
                placeholders = ', '.join([f':blooms_level_{i}' for i in range(len(blooms_levels))])
                clause = f'b.name IN ({placeholders})'
                where_clauses.append(clause)  # Add the clause to the list.
                # Update the params dictionary with parameter values.
                params.update({f'blooms_level_{i}': level for i, level in enumerate(blooms_levels)})

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

            # Construct the WHERE statement based on the clauses or set to '1' if no filters are provided.
            where_statement = ' OR '.join(where_clauses) if where_clauses else '1'

            # Define the SQL query with placeholders.
            sql = text(f"""
                SELECT q.question_id, q.max_points
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

    except Exception as e:
        # Log an error message with exception details.
        logging.error(f"Error while getting questions: {e}", exc_info=True)


# Function to select questions from a pool based on user preferences.
def select_questions(questions_pool, num_questions, max_points):
    logging.info("Selecting questions from the pool.")
    if num_questions > len(questions_pool):
        # Log a warning and raise an exception if there are not enough questions.
        logging.warning("Requested more questions than are available in the pool.")
        raise ValueError("Not enough questions in the pool to meet the requested number of questions.")
    
    # Shuffle the questions in the pool randomly.
    random.shuffle(questions_pool)
    
    selected_questions = []
    current_points = 0
    
    # Iterate through the shuffled questions and select them based on points.
    for question in questions_pool:
        if current_points + question[1] <= max_points:
            selected_questions.append(question)
            current_points += question[1]
            
            if len(selected_questions) == num_questions:
                break
    
    # Log the selected questions and return them.
    logging.debug(f"Selected Questions: {selected_questions}")
    return selected_questions
