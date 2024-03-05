# Standard library imports
import os
import logging
from logging.handlers import RotatingFileHandler
from datetime import datetime, timezone, timedelta
from random import randint
import random

# Statistics related imports
from io import BytesIO
from base64 import urlsafe_b64decode
import base64
import numpy as np
from PIL import Image
import matplotlib
import matplotlib.pyplot as plt

# Related third-party imports
from dotenv import load_dotenv, dotenv_values  # pip install python-dotenv
from flask import (Flask, render_template, request, url_for, redirect, session, flash,
                   get_flashed_messages, jsonify, make_response)
from flask_bcrypt import Bcrypt
from flask_mail import Message, Mail
from reportlab.pdfgen import canvas
from reportlab.lib.pagesizes import letter
from sqlalchemy import create_engine, text
from sqlalchemy.sql import func
from sqlalchemy.exc import SQLAlchemyError
from itsdangerous import URLSafeTimedSerializer

# Local application/library specific imports
from config import MailConfig
from db_config import db
from data_retrieval import (fetch_test_creation_options, get_questions,get_questions_for_modify, create_test,create_test_for_modify, get_user,

                            get_test_questions,
                            check_registered, get_test_data, get_tests, get_topics, get_subjects,
                            get_all_subjects, get_tester_list,
                            selectSubjectNames, selectSubjectDescriptions, insertSubject, get_all_topics, insertTopic,
                            get_all_objectives, get_objs_temp, insertLearningObjective, get_all_questions, get_obj_desc,
                            get_question_by_id, get_test_question_conflicts)

# Load environment variables from a .env file
load_dotenv()

#Initialize Flask App
app = Flask(__name__)

# Configure Flask app to use SQLAlchemy for a local MySQL database
app.config["SQLALCHEMY_DATABASE_URI"] = "mysql+pymysql://root:@localhost:3306/test_train_db"
app.config["SQLALCHEMY_TRACK_MODIFICATIONS"] = False

# Configure logging to write to a file
handler = RotatingFileHandler('app_errors.log', maxBytes=10000, backupCount=1)
handler.setLevel(logging.ERROR)
app.logger.addHandler(handler)

# Configure Flask app with a secret key
app.config["SECRET_KEY"] = 'os.getenv("SECRET_KEY")'

# Configure Flask app to use Mail system
app.config.from_object(MailConfig)

# Configure Flask app to use Token system
app.config["SECURITY_PASSWORD_SALT"] = os.getenv("SECRET_KEY")

# Initialize SQLAlchemy
db.init_app(app)

# Initialize Bcrypt for password hashing
bcrypt = Bcrypt(app)

# Initialize Mail
mail = Mail(app)

# Hash the password before storing it in the database
#hashed_password = bcrypt.generate_password_hash('',12).decode('utf-8')
#print("Password: ", hashed_password)

# Set the backend to 'Agg' for Matplotlib
matplotlib.use('Agg')

#----------Helper functions for OTP and token generation----------

# Generate a verification otp
def generate_otp(email, time):
    otp = str(randint(100000, 999999))
    session[f'otp_{email}'] = otp
    session[f'time_{email}'] = time
    return otp

def generate_token(email):
    serializer = URLSafeTimedSerializer(app.config['SECRET_KEY'])
    return serializer.dumps(email, salt=app.config['SECURITY_PASSWORD_SALT'])

def confirm_token(token, expiration=300):
    serializer = URLSafeTimedSerializer(app.config['SECRET_KEY'])
    try:
        email = serializer.loads(
            token, salt=app.config['SECURITY_PASSWORD_SALT'], max_age=expiration
        )
        return email
    except Exception:
        return False

#----------Routes for login and authentication----------

@app.route('/')
def index():
    return redirect(url_for('trylogin'))

# Logouts user and redirects to login
@app.route('/logout')
def logout():
    session.pop('user', None)
    return redirect(url_for('trylogin'))

# Route for the login page
@app.route("/trylogin")
def trylogin():
    # Check if user session is already active
    if 'user' in session and session['user'].get('is_authenticated', False):
        return redirect(url_for('homepage'))

    # Check for any failed login or access denied messages
    messages = get_flashed_messages()

    # Serve login page
    return render_template("login.html", messages=messages)

# Processes login attempt
@app.route("/login", methods=["POST"])
def login():
    if request.method == "POST":

        # Load form variables
        input_username = request.form.get("username")
        input_password = request.form.get("password")

        row = get_user(input_username)
        # Check if a row was found
        if row:
            # Extract the hashed password from the 'password' column
            hashed_password = row['password']
        else:
            flash("Invalid username or password")
            return redirect(url_for('trylogin'))

        user = {'username': row['username'], 'email': row['email'],
                'name': row['name'], 'is_verified': row['is_verified'],
                'is_admin': row['is_admin'], 'is_authenticated': False}

        # Check if entered password matches hashed_password
        if bcrypt.check_password_hash(hashed_password, input_password):
            # Check if account is verified
            if user['is_verified'] == 0:

                # Flash failed authentication message and redirect to login page
                flash("Account not verified, please check your email")
                return redirect(url_for('trylogin'))

            # Create otp
            session[f'email_{input_username}'] = user['email']
            otp_created_time = datetime.now(timezone.utc)
            otp = generate_otp(user['email'], otp_created_time)

            # Set up user session cookie
            session['user'] = user
            session['username'] = input_username  # Add username to session
            
            # Send email to user using SMTP - Simple Mail Transfer Protocol
            # Create URL link
            full_url = request.url + 'code'
            token = generate_token(user['email'])
            confirm_url = f"{full_url}?token={token}"
            msg = Message('Training Test Program Verification.', sender=app.config['MAIL_USERNAME'],
                          recipients=[user['email']])
            msg.body = ('Dear ' + user['name'] +
                        '\n\nWe received a request to access your account ' + user['username'] + '.' +
                        '\nPlease insert verification code.\nVerification code: ' + str(otp) +
                        '\nURL: ' + confirm_url)
            mail.send(msg)

            # Set up user session cookie
            session['user'] = user

            # Move to verification page
            return render_template('verification.html', password=input_password, time=otp_created_time, user_email=user['email'])
        else:
            # Flash failed authentication message and redirect to login page
            flash("Invalid username or password")
            return redirect(url_for('trylogin'))

#---------- Routes for the homepage and user actions----------
       
# Route for the homepage, logged in users only.
@app.route("/homepage")
def homepage():
    # Check if user session is inactive
    if 'user' not in session or not session['user'].get('is_authenticated', False):
        flash("Access denied, please login.")
        return redirect(url_for('trylogin'))

    # Serve homepage
    #return "<h2>This is the under-construction homepage</h2><a href=\"/logout\">Logout</a>"
    # Temporary redirect to a different page
    return redirect(url_for('data'))
  
@app.route('/datahierarchy',methods = ['POST', 'GET'])
def data():
    #if 'user' not in session or not session['user'].get('is_authenticated', False):
        #flash("Access denied, please login.")
        #return redirect(url_for('trylogin'))
    if request.method == "POST":
        pData = request.get_json()
        if pData.get("type") == "add":
            #insertSubject(pData.get("value1"),pData.get("value2"))
            name = pData.get("value1")
            description = pData.get("value2")

            insertSubject(name,description)
            #query = text("""INSERT INTO subjects (name,description) VALUES (:name,:description)""")
            #db.engine.execute(query, name=name, description=description)
            logging.debug("adding new data")
        elif pData.get("type") == "delete":
            # Attempt to delete subject
            try:
                subject_id = pData.get("value1")
                query = text("""DELETE FROM subjects where subject_id = :subject_id""")
                db.engine.execute(query, subject_id=subject_id)
            except Exception as e:

                # Log an error message with exception details.
                logging.error(f"Error while attempting subject deletion: {e}", exc_info=True)

                # Get and display any topics that need to be deleted.
                topics, subject_data = get_all_topics(subject_id)

                # Create alert response
                alert = ("Unable to delete subject " + subject_data['name'] +
                         " . The following topics must be deleted first: \n")
                for topic in topics:
                    alert += "\u2022 " + topic.name + "\n"

                response_data = {"category": "FAILURE", 'error_message': alert}
                return jsonify(response_data)

        elif pData.get("type") == "edit":
            subject_id = pData.get("value1")
            name = pData.get("value2")
            description = pData.get("value3")
            query = text("""UPDATE subjects SET name = :name, description = :description WHERE subject_id = :subject_id""")
            db.engine.execute(query, subject_id=subject_id, name=name, description=description)

        return jsonify({"category":"SUCCESS"})
    else:
        subjects = get_all_subjects()
        return render_template('datahierarchy.html', subjects=subjects)

@app.route('/datatopichierarchy', methods=['GET', 'POST'])
def topics():

    # Get the selected subject_id from the query parameters
    subject_id = request.args.get('subject_id')

    # Use the subject_id to fetch topics
    topics, subject_data = get_all_topics(subject_id)

    # Check which database function to execute
    if request.method == "POST":
        pData = request.get_json()
        if pData.get("type") == "add":
            subject_id = pData.get("value1")
            name = pData.get("value2")
            description = pData.get("value3")
            facility = pData.get("value4")
            insertTopic(subject_id, name, description, facility)

        elif pData.get("type") == "edit":
            topic_id = pData.get("value1")
            name = pData.get("value2")
            description = pData.get("value3")
            facility = pData.get("value4")
            query = text(
                """UPDATE topics SET name = :name, description = :description, facility=:facility WHERE topic_id = :topic_id""")
            db.engine.execute(query, topic_id=topic_id, name=name, description=description, facility=facility)
            print()
        elif pData.get("type") == "delete":
            # Attempt to delete subject
            try:
                topic_id = pData.get("value1")
                query = text("""DELETE FROM topics where topic_id = :topic_id""")
                db.engine.execute(query, topic_id=topic_id)
            except Exception as e:

                # Log an error message with exception details.
                logging.error(f"Error while attempting topic deletion: {e}", exc_info=True)

                # Get and display any objectives that need to be deleted.
                objectives, topic_data = get_all_objectives(topic_id)

                # Create alert response
                alert = ("Unable to delete topic " + topic_data['name'] +
                         " . The following learning objectives must be deleted first: \n")
                for obj in objectives:
                    alert += "\u2022 " + obj.obj_description + "\n"

                response_data = {"category": "FAILURE", 'error_message': alert}
                return jsonify(response_data)

        return jsonify({"category": "SUCCESS"})
    else:
        # Pass topics to the template
        return render_template('datatopichierarchy.html', topics=topics ,subject_id=subject_id, subject_data=subject_data)

@app.route('/dataobjhierarchy', methods=['GET', 'POST'])
def objectives():

    # Get the selected subject_id from the query parameters
    topic_id = request.args.get('topic_id')
    subject_id = request.args.get('subject_id')

    # Use the subject_id to fetch topics
    objectives, topic_data = get_all_objectives(topic_id)

    # Check which database function to execute
    if request.method == "POST":
        pData = request.get_json()
        if pData.get("type") == "add":
            topic_id = pData.get("value1")
            description = pData.get("value2")
            bloom = pData.get("value3")
            skills = pData.get("value4")
            tags = pData.get("value5")
            if "1" in skills:
                applicant = 1
            else:
                applicant = 0
            if "2" in skills:
                apprentice = 1
            else:
                apprentice = 0
            if "3" in skills:
                journeyman = 1
            else:
                journeyman = 0
            if "4" in skills:
                senior = 1
            else:
                senior = 0
            if "5" in skills:
                chief = 1
            else:
                chief = 0
            if "6" in skills:
                coordinator = 1
            else:
                coordinator = 0
            insertLearningObjective(topic_id, description, bloom, applicant, apprentice, journeyman, senior, chief, coordinator, tags)
        if pData.get("type") == "edit":
            objId = pData.get("value1")
            topic_id = pData.get("value2")
            description = pData.get("value3")
            bloom = pData.get("value4")
            skills = pData.get("value5")
            tags = pData.get("value6")
            if "1" in skills:
                applicant = 1
            else:
                applicant = 0
            if "2" in skills:
                apprentice = 1
            else:
                apprentice = 0
            if "3" in skills:
                journeyman = 1
            else:
                journeyman = 0
            if "4" in skills:
                senior = 1
            else:
                senior = 0
            if "5" in skills:
                chief = 1
            else:
                chief = 0
            if "6" in skills:
                coordinator = 1
            else:
                coordinator = 0
            query = text(
                """UPDATE learning_objectives SET topic_id = :topic_id, description = :description, blooms_id=:bloom, is_applicant=:applicant,is_apprentice = :apprentice, 
                is_journeyman=:journeyman, is_senior=:senior, is_chief=:chief, is_coordinator=:coordinator, tags=:tags WHERE obj_id = :objId""")
            db.engine.execute(query, topic_id=topic_id, description=description, bloom=bloom,applicant=applicant, apprentice=apprentice, journeyman=journeyman, senior=senior, chief=chief, coordinator=coordinator, tags=tags,objId=objId)
        elif pData.get("type") == "delete":
            # Attempt to delete objective
            try:
                obj_id = pData.get("value1")
                query = text("""DELETE FROM learning_objectives where obj_id = :obj_id""")
                db.engine.execute(query, obj_id=obj_id)
            except Exception as e:

                # Log an error message with exception details.
                logging.error(f"Error while attempting learning objective deletion: {e}", exc_info=True)

                # Get and display any objectives that need to be deleted.
                questions, obj_data = get_all_questions(obj_id)

                # Create alert response
                alert = ("Unable to delete learning objective " + obj_data +
                         " . The following questions must be deleted first: \n")
                for question in questions:
                    alert += "\u2022 " + question.question_desc + "\n"

                response_data = {"category": "FAILURE", 'error_message': alert}
                return jsonify(response_data)
        return jsonify({"category": "SUCCESS"})


    else:
        # Pass topics to the template
        return render_template('dataobjhierarchy.html', objectives=objectives,topic_id=topic_id, topic_data=topic_data,subject_id=subject_id)
    
@app.route('/dataquestionhierarchy', methods=['GET', 'POST'])
def questions():
    # Check which database function to execute
    if request.method == "POST":
        pData = request.get_json()
        if pData.get("type") == "delete":
            # Attempt to delete question
            try:
                question_id = pData.get("value1")
                query = text("""DELETE FROM questions where question_id = :question_id""")
                db.engine.execute(query, question_id=question_id)
            except Exception as e:

                # Log an error message with exception details.
                logging.error(f"Error while attempting question deletion: {e}", exc_info=True)

                # Get all conflicting tests
                tests = get_test_question_conflicts(question_id);

                # Create alert response
                alert = ("Unable to delete question id " + question_id +
                         " . The following tests must be deleted first: \n")
                for test in tests:
                    alert += "\u2022 " + test.test_name + "\n"

                response_data = {"category": "FAILURE", 'error_message': alert}
                return jsonify(response_data)
            return jsonify({"category": "SUCCESS"})



    # Get the selected subject_id from the query parameters
    obj_id = request.args.get('obj_id')
    topic_id = request.args.get('topic_id')
    subject_id = request.args.get('subject_id')

    questions, obj_data = get_all_questions(obj_id)

    return render_template('dataquestionhierarchy.html', questions=questions, obj_id=obj_id, obj_data=obj_data,topic_id=topic_id,subject_id=subject_id)

@app.route('/addquestion')
def addquestion():

    # Get the selected subject_id from the query parameters
    obj_id = request.args.get('obj_id')

    # Get the objective desc
    obj_desc = get_obj_desc(obj_id)


    return render_template('addquestion.html', obj_id=obj_id, obj_desc=obj_desc)

@app.route('/editquestion')
def editquestion():

    # Get the selected subject_id from the query parameters
    obj_id = request.args.get('obj_id')

    # Get the selected question_id from the query parameters
    question_id = request.args.get('question_id')

    # Get the objective desc
    obj_desc = get_obj_desc(obj_id)

    # Get the selected question
    question = get_question_by_id(question_id)

    return render_template('editquestion.html', obj_id=obj_id, obj_desc=obj_desc, question=question)


#---------- Routes for the test list page and tester list page ----------

# Route for test list page
@app.route('/test_list')
def test_list():
    # Check if user session is inactive
    if 'user' not in session or not session['user'].get('is_authenticated', False):
        flash("Access denied, please login.")
        return redirect(url_for('trylogin'))

    # Query to fetch data from the tests table
    test_data = get_tests()
    # get subject list
    subject_data = get_subjects()
    # get topic list
    topic_data = get_topics()

    return render_template("test_list.html", data=test_data, subject_data=subject_data, topic_data=topic_data)


# Route for showing filtered test list

@app.route('/filter')
def filter_data():
    # Check if user session is inactive
    if 'user' not in session or not session['user'].get('is_authenticated', False):
        flash("Access denied, please login.")
        return redirect(url_for('trylogin'))

    # Get filtered data from test list page
    subject_id = request.args.get('subject')
    topic_id = request.args.get('topic')
    start_date = request.args.get('start')
    end_date = request.args.get('end')
    search_name = request.args.get('name')

    # Set default value for start date and end date
    if start_date == '':
        start_date = '0000-00-00'
    if end_date == '':
        end_date = '9999-12-31'

    base_select_query = """SELECT t.test_id, t.test_name, GROUP_CONCAT(DISTINCT s.name) AS subject_name, GROUP_CONCAT(DISTINCT tp.name) AS topic_name, t.creation_date, t.last_modified_date FROM tests t 
                        LEFT JOIN test_questions tq ON t.test_id = tq.test_id 
                        LEFT JOIN questions q ON tq.question_id = q.question_id 
                        LEFT JOIN learning_objectives lo ON q.obj_id = lo.obj_id 
                        LEFT JOIN topics tp ON lo.topic_id = tp.topic_id 
                        LEFT JOIN subjects s ON tp.subject_id = s.subject_id """
    where_clause = "WHERE (creation_date) BETWEEN :start_date AND :end_date "
    group_by_clause = "GROUP BY t.test_id, t.test_name, s.name, t.creation_date, t.last_modified_date "

    # When subject is selected
    if subject_id != '':
        where_subject_clause = " AND s.subject_id = :subject_id "
        where_clause = where_clause + where_subject_clause
    # When topic is selected
    if topic_id != '':
        where_topic_clause = " AND tp.topic_id = :topic_id "
        where_clause = where_clause + where_topic_clause
    # When search name has an input
    if search_name != '':
        where_search_clause = " AND t.test_name LIKE CONCAT('%', :search_name, '%') "
        where_clause = where_clause + where_search_clause

    complete_query = text(base_select_query + where_clause + group_by_clause)

    test_result = db.engine.execute(complete_query, topic_id=topic_id, subject_id=subject_id, start_date=start_date, end_date=end_date, search_name=search_name)
    test_list_data = test_result.fetchall()

    return render_template("test_table.html", data=test_list_data)

# Route for displaying a list of testers of the clicked test
@app.route('/test/<int:test_id>')
def tester_list(test_id):
    # Check if user session is inactive
    if 'user' not in session or not session['user'].get('is_authenticated', False):
        flash("Access denied, please login.")
        return redirect(url_for('trylogin'))

    # Get a list of testers from database
    tester_list_data = get_tester_list(test_id)

    # Get all existing tester from database
    all_tester_query = text("SELECT * FROM testee")
    all_tester_result = db.engine.execute(all_tester_query)
    all_tester_data = all_tester_result.fetchall()

    return render_template("tester_list.html", tester_data=tester_list_data, testId=test_id, all_tester_data=all_tester_data)

# Route for updating tester's score
@app.route('/update_score')
def update_score():
    # Check if user session is inactive
    if 'user' not in session or not session['user'].get('is_authenticated', False):
        flash("Access denied, please login.")
        return redirect(url_for('trylogin'))

    # Get data from tester_table.html
    score_id = request.args.get('scoreId')
    tester_id = request.args.get('testerId')
    test_id = request.args.get('testId')
    new_grade = request.args.get('newGrade')

    # If there is no input for score, set to -1
    if new_grade == '':
        new_grade = '-1'

    # Update score
    update_query = text("UPDATE test_scores SET total_score = :new_grade WHERE test_id = :test_id and score_id = :score_id and tester_id = :tester_id")
    db.engine.execute(update_query, new_grade=new_grade, test_id=test_id, score_id=score_id, tester_id=tester_id)
    tester_list_data = get_tester_list(test_id)

    # Get all existing tester from database
    all_tester_query = text("SELECT * FROM testee")
    all_tester_result = db.engine.execute(all_tester_query)
    all_tester_data = all_tester_result.fetchall()

    return render_template("tester_table.html", tester_data=tester_list_data, testId=test_id, all_tester_data=all_tester_data)


# Route for updating tester's attempt date
@app.route('/update_date', methods=['POST'])
def update_date():
    # Check if user session is inactive
    if 'user' not in session or not session['user'].get('is_authenticated', False):
        flash("Access denied, please login.")
        return redirect(url_for('trylogin'))

    # Get data from tester_table.html
    new_attemptDate_data = request.get_json()
    score_id = new_attemptDate_data.get('scoreId')
    tester_id = new_attemptDate_data.get('testerId')
    test_id = new_attemptDate_data.get('testId')
    new_date = new_attemptDate_data.get('newDate')

    # Update attempt date
    update_query = text("UPDATE test_scores SET attempt_date = :new_date WHERE test_id = :test_id and score_id = :score_id and tester_id = :tester_id")
    db.engine.execute(update_query, new_date=new_date, test_id=test_id, score_id=score_id, tester_id=tester_id)
    tester_list_data = get_tester_list(test_id)

    # Get all existing tester from database
    all_tester_query = text("SELECT * FROM testee")
    all_tester_result = db.engine.execute(all_tester_query)
    all_tester_data = all_tester_result.fetchall()

    return render_template("tester_table.html", tester_data=tester_list_data, testId=test_id, all_tester_data=all_tester_data)


# Route for updating tester's pass status
@app.route('/update_status', methods=['POST'])
def update_status():
    # Check if user session is inactive
    if 'user' not in session or not session['user'].get('is_authenticated', False):
        flash("Access denied, please login.")
        return redirect(url_for('trylogin'))

    # Get data from tester_table.html
    new_status_data = request.get_json()
    score_id = new_status_data.get('scoreId')
    tester_id = new_status_data.get('testerId')
    test_id = new_status_data.get('testId')
    new_status = new_status_data.get('newStatus')

    # Update pass status
    update_query = text("UPDATE test_scores SET pass_status = :new_status WHERE test_id = :test_id and score_id = :score_id and tester_id = :tester_id")
    db.engine.execute(update_query, new_status=new_status, test_id=test_id, score_id=score_id, tester_id=tester_id)
    tester_list_data = get_tester_list(test_id)

    # Get all existing tester from database
    all_tester_query = text("SELECT * FROM testee")
    all_tester_result = db.engine.execute(all_tester_query)
    all_tester_data = all_tester_result.fetchall()

    return render_template("tester_table.html", tester_data=tester_list_data, testId=test_id, all_tester_data=all_tester_data)

# Route for displaying tester history records
@app.route('/display_history')
def display_history():
    # Check if user session is inactive
    if 'user' not in session or not session['user'].get('is_authenticated', False):
        flash("Access denied, please login.")
        return redirect(url_for('trylogin'))

    # Get data from tester_table.html
    tester_id = request.args.get('testerId')
    test_id = request.args.get('testId')

    # Query to get tester's all records
    history_query = text("SELECT ts.score_id, ts.tester_id, ts.test_id, te.testee_name, ts.attempt_date, ts.total_score, ts.pass_status "
                        + "FROM test_scores ts "
                        + "LEFT JOIN testee te ON ts.tester_id = te.tester_id "
                        + "WHERE ts.test_id = :test_id AND ts.tester_id = :tester_id "
                        + "ORDER BY ts.attempt_date DESC")
    history_result = db.engine.execute(history_query, test_id=test_id, tester_id=tester_id)
    tester_history_data = history_result.fetchall()

    return render_template("tester_history_table.html", tester_history_data=tester_history_data)

# Add new tester in the tester list table
@app.route('/add_new_tester', methods=['POST'])
def add_tester():
    # Get data from tester_list.html
    new_tester_data = request.get_json()
    testee_name = new_tester_data.get("testerName")
    attempt_date = new_tester_data.get("attemptDate")
    score = new_tester_data.get("score")
    pass_status = new_tester_data.get("passStatus")
    test_id = new_tester_data.get("testId")

    try:
        # check testee name is already exist in the database
        check_testee_name_query = text("SELECT * FROM testee WHERE testee_name = :testee_name")
        result = db.engine.execute(check_testee_name_query, testee_name=testee_name)
        exist = result.fetchone()

        if exist:
            response_data = {"Category": "invalid"}
            return jsonify(response_data)
    except Exception as e:
        response_data = {"Category": "invalid"}
        return jsonify(response_data)

    # Insert new tester in the database
    add_tester_query = text("INSERT INTO testee (testee_name) VALUES (:testee_name)")
    db.engine.execute(add_tester_query, testee_name=testee_name)

    # Get tester_id for new tester
    tester_id_query = text("SELECT tester_id FROM testee WHERE testee_name = :testee_name")
    tester_data_result = db.engine.execute(tester_id_query, testee_name=testee_name)
    tester_data = tester_data_result.fetchall()
    tester_id = 0
    for row in tester_data:
        tester_id = row['tester_id']

    # Insert new score in the database
    add_tester_score_query = text("INSERT INTO test_scores (test_id, tester_id, attempt_date, total_score, pass_status) "
                                  +" VALUES (:test_id, :tester_id, :attempt_date, :total_score, :pass_status)")
    db.engine.execute(add_tester_score_query, test_id=test_id, tester_id=tester_id, attempt_date=attempt_date, total_score=score, pass_status=pass_status)

    response_data = {"Category": "valid"}
    return jsonify(response_data)

# Add exist tester data in the tester list table
@app.route('/add_existing_tester', methods=['POST'])
def add_existing_tester():
    # Get data from test_list.html
    existing_tester_data = request.get_json()
    tester_id = existing_tester_data.get("testerId")
    attempt_date = existing_tester_data.get("attemptDate")
    score = existing_tester_data.get("score")
    pass_status = existing_tester_data.get("passStatus")
    test_id = existing_tester_data.get("testId")

    # Insert new score in the database
    add_tester_score_query = text("INSERT INTO test_scores (test_id, tester_id, attempt_date, total_score, pass_status) "
                                + " VALUES (:test_id, :tester_id, :attempt_date, :total_score, :pass_status)")
    db.engine.execute(add_tester_score_query, test_id=test_id, tester_id=tester_id, attempt_date=attempt_date,
                      total_score=score, pass_status=pass_status)

    return ''

# Delete tester's record
@app.route('/delete_record', methods=['POST'])
def delete_record():
    # Check if user session is inactive
    if 'user' not in session or not session['user'].get('is_authenticated', False):
        flash("Access denied, please login.")
        return redirect(url_for('trylogin'))

    # Get data from tester_history_table.html
    tester_record = request.get_json()
    score_id = tester_record.get("score_id")
    test_id = tester_record.get("test_id")
    tester_id = tester_record.get("tester_id")

    # Delete tester record
    delete_query = text("DELETE FROM test_scores WHERE score_id = :score_id AND test_id = :test_id AND tester_id = :tester_id")
    db.engine.execute(delete_query, score_id=score_id, test_id=test_id, tester_id=tester_id)

    return ''

# Add new record to tester
@app.route('/add_record', methods=['POST'])
def add_record():
    # Get data from tester_history_table.html
    new_record = request.get_json()
    score_id = new_record.get("score_id")
    test_id = new_record.get("test_id")
    tester_id = new_record.get("tester_id")
    attempt_date = new_record.get("attemptDate")
    score = new_record.get("score")
    pass_status = new_record.get("passStatus")

    # Insert new record to database
    insert_query = text("INSERT INTO test_scores (test_id, tester_id, attempt_date, total_score, pass_status) "
                        +"VALUES (:test_id, :tester_id, :attempt_date, :score, :pass_status)")
    db.engine.execute(insert_query, test_id=test_id, tester_id=tester_id, attempt_date=attempt_date, score=score, pass_status=pass_status)

    return ''

# Routes for deleting selected test
@app.route('/delete_test/<int:test_id>')
def delete_test_validation(test_id):
    try:
        # Check testers' scores exist for the test
        check_tester_query = text("SELECT * FROM test_scores WHERE test_id = :test_id")
        result = db.engine.execute(check_tester_query, test_id=test_id)
        exist = result.fetchone()

        # If testers' scores exist
        if exist:
            delete_test_query = text("DELETE FROM tests WHERE test_id = :test_id")
            db.engine.execute(delete_test_query, test_id=test_id)
        else:
            # Delete the questions on the test
            delete_test_questions = text("DELETE FROM test_questions WHERE test_id = :test_id")
            db.engine.execute(delete_test_questions, test_id=test_id)

        # Delete the test
        delete_test_query = text("DELETE FROM tests WHERE test_id = :test_id")
        db.engine.execute(delete_test_query, test_id=test_id)

        # Send data
        alert = "Successfully deleted"
        response_data = {"Category": "Success", 'Message': alert}

        return jsonify(response_data)
    except Exception as e:
        # If testers' scores or questions for the test are not completely deleted
        # Create alert response
        alert = "Unable to delete the test. All the testers' records must be deleted first."
        response_data = {"Category": "Failure", 'error_message': alert}

        return jsonify(response_data)

#------ Route for Scoring  Metrics---------

# function to retrieve statistics for a test
def get_test_statistics(test_id):
    query = text("""
        SELECT
            t.test_id,
            t.test_name,
            COUNT(ts.score_id) AS times_taken,
            SUM(ts.pass_status) AS passed_count,
            GROUP_CONCAT(ts.total_score) AS scores
        FROM
            tests t
        LEFT JOIN
            test_scores ts ON t.test_id = ts.test_id
        WHERE
            t.test_id = :test_id AND ts.total_score >= 0
        GROUP BY
            t.test_id, t.test_name
    """)
    result = db.engine.execute(query, test_id=test_id)

    # Fetch the first row as we expect only one result for a specific test_id
    row = result.fetchone()

    if row:
        # Create a dictionary to hold the statistics
        dummy_statistics = {
            'test_id': row['test_id'],
            'test_name': row['test_name'],
            'times_taken': row['times_taken'] or 0,
            'passed_count': row['passed_count'] or 0,
            'scores': [int(score) for score in row['scores'].split(',')] if row['scores'] else [],
        }
        #print(dummy_statistics)
        return dummy_statistics
    else:
        return {'error': 'Test not found'}

@app.route('/scoring_metrics')
def scoring():
    if 'user' not in session or not session['user'].get('is_authenticated', False):
        flash("Access denied, please login.")
        return redirect(url_for('trylogin'))

    query = text("SELECT * FROM tests")
    result = db.engine.execute(query)

    # Convert the result into a list of dictionaries
    tests = [dict(row) for row in result.fetchall()]
    return render_template('scoring_metrics.html', tests=tests)

# funcion to generate graphs
def generate_graphs(statistics):
    graph_images = []
    # score distribution histgram
    scores = statistics['scores']
    if not statistics['scores']:
        return graph_images
    # Create histogram
    plt.hist(scores, bins=5, color='skyblue', edgecolor='black')

    # Add labels and title
    plt.xlabel('Score')
    plt.ylabel('Frequency')
    plt.title('Score Distribution')
    plt.savefig('graph1.png')  # Save the graph as an image file
    plt.close()
    graph_images.append('graph1.png')
    #Mean score boxplot
    # Calculate mean score
    mean_score = sum(statistics['scores']) / len(statistics['scores'])

    # Create boxplot
    plt.figure(figsize=(8, 2))
    plt.boxplot(statistics['scores'], vert=False)
    plt.axvline(mean_score, color='r', linestyle='--', label='Mean Score')  # Add mean score line
    plt.xlabel('Scores')
    plt.title('Boxplot of Scores with Mean Score')
    plt.legend()
    plt.savefig('graph2.png')  # Save the graph as an image file
    plt.close()
    graph_images.append('graph2.png')


    # Return paths to graph images
    return graph_images

# Function to generate PDF from statistics data
def generate_pdf_from_statistics(statistics, graph_images):
    # Generate PDF using a library like reportlab or fpdf
    # For demonstration purposes, let's assume we're creating a simple PD

    buffer = BytesIO()
    c = canvas.Canvas(buffer, pagesize=letter)
    try:
        c.drawString(50, 750, "Test Statistics")
        c.drawString(50, 730, f"Test Name: {statistics['test_name']}")
        c.drawString(400, 730, f"Test ID: {statistics['test_id']}")
        c.drawString(100, 680, f"-    Test taken {statistics['times_taken']} times.")
        c.drawString(100, 660, f"-    {statistics['times_taken']} test takers have passed.")


        # Embed graphs into the PDF
        y_offset = 630
        if graph_images:  # Check if graph_images is not empty
            for image_path in graph_images:
                # Open the image file and retrieve its dimensions
                img = Image.open(image_path)
                img_width, img_height = img.size

                # Set the width and height dynamically based on the image dimensions
                c.drawImage(image_path, 100, y_offset - (img_height*0.45), width=(img_width*0.45), height=(img_height*0.45))
                y_offset -= (img_height*0.45) + 50  # Adjust this value based on the spacing between graphs

        # Add statistics if statistics['scores'] is not empty
        if statistics['scores']:
            # Mean
            mean_score = np.mean(statistics['scores'])
            mean_str = "{:.2f}".format(mean_score)
            c.drawString(100, 250, f"Mean: {mean_str}")
            # High Score
            high_score = max(statistics['scores'])
            c.drawString(250, 250, f"High: {high_score}")
            # Upper Quartile
            upper_quartile = np.percentile(statistics['scores'], 75)
            upper_str = "{:.2f}".format(upper_quartile)
            c.drawString(250, 230, f"Upper Quartile: {upper_str}")
            # Low Score
            low_score = min(statistics['scores'])
            c.drawString(400, 250, f"Low: {low_score}")
            # Lower Quartile
            lower_quartile = np.percentile(statistics['scores'], 25)
            lower_str = "{:.2f}".format(lower_quartile)
            c.drawString(400, 230, f"Lower Quartile: {lower_str}")
            # Median
            median_score = np.median(statistics['scores'])
            c.drawString(100, 230, f"Median: {median_score}")
        c.save()
        pdf_data = buffer.getvalue()
    finally:
        buffer.close()
    return pdf_data

# Route to generate PDF data for a specific test
@app.route('/generate_pdf/<int:test_id>')
def generate_pdf(test_id):
    # Retrieve statistics for the specific test with test_id
    statistics = get_test_statistics(test_id)
    # Generate graphs
    graph_images = generate_graphs(statistics)
    # Generate PDF
    pdf = generate_pdf_from_statistics(statistics,graph_images)

    # Create a response with PDF data
    response = make_response(pdf)
    response.headers['Content-Type'] = 'application/pdf'
    response.headers['Content-Disposition'] = 'inline; filename=statistics.pdf'

    return response

#------ Routes for Test Creation ---------

# Route for random test creation page.
@app.route('/random_test_creation')
def random_test_creation():
    return show_test_creation_page('random_test_creation.html')

# Route for manual test creation page.
@app.route('/manual_test_creation')
def manual_test_creation():
    return show_test_creation_page('manual_test_creation.html')

# Route to render the appropriate test creation page with filters 
def show_test_creation_page(template_name):
    if 'user' not in session or not session['user'].get('is_authenticated', False):
        flash("Access denied, please login.")
        return redirect(url_for('trylogin'))
    
    try:
        options_response = fetch_test_creation_options()
        if isinstance(options_response, dict) and "error" in options_response:
            flash(options_response["error"])
            return redirect(url_for('index'))
        
        options = options_response
        return render_template(
            template_name,
            blooms_taxonomy=options['blooms_taxonomy'],
            subjects=options['subjects'],
            topics=options['topics'],
            question_types=options['question_types'],
            question_difficulty=options['question_difficulty']
        )
    except Exception as e:
        flash("An error occurred while preparing the test creation page.")
        return redirect(url_for('index'))

# Define the mapping of training levels to database columns
training_level_mapping = {
    'applicant': 'is_applicant',
    'apprentice': 'is_apprentice',
    'journeyman': 'is_journeyman',
    'senior': 'is_senior',
    'chief': 'is_chief',
    'coordinator': 'is_coordinator'
}

# Route to handle the POST request to get random questions based on user selections.
@app.route('/get_questions', methods=['POST'])
def handle_get_questions():
    logging.info("Executing handle_get_questions function.")
    try:
        data = request.json
        test_type = data.get('test_type', 'random')
        # logging.debug(f"Received data: {data}")

        blooms_taxonomy = data.get('blooms_taxonomy', [])
        subjects = data.get('subjects', [])
        topics = data.get('topics', [])
        question_types = data.get('question_types', [])
        question_difficulties = data.get('question_difficulties', [])
        num_questions = int(data.get('num_questions', 0))
        keywords = data.get('keywords')
        
        training_level_text = data.get('training_level', 'all')
        
        if training_level_text == 'all':
            training_level_conditions = None
        else:
            training_level_column = training_level_mapping.get(training_level_text)
            if not training_level_column:
                raise ValueError(f"Invalid training level: {training_level_text}")
            training_level_conditions = {training_level_column: 1}
        
        if test_type == 'manual':
            question_max_points = int(data.get('question_max_points', 0))
            logging.debug(f"Filter parameters: blooms_taxonomy: {blooms_taxonomy}, subjects: {subjects}, topics: {topics}, question_types: {question_types}, question_difficulties: {question_difficulties}, training_level_conditions: {training_level_conditions}, keywords: {keywords}, question_max_points: {question_max_points}")
            response, status_code = get_questions(test_type, blooms_taxonomy, subjects, topics, question_types, question_difficulties, training_level_conditions, keywords, question_max_points)
        else:
            test_max_points = int(data.get('test_max_points', 0))
            logging.debug(f"Filter parameters: blooms_taxonomy: {blooms_taxonomy}, subjects: {subjects}, topics: {topics}, question_types: {question_types}, question_difficulties: {question_difficulties}")
            logging.debug(f"Test parameters: num_questions: {num_questions}, test_max_points: {test_max_points}")
            response, status_code = get_questions(test_type, blooms_taxonomy, subjects, topics, question_types, question_difficulties, training_level_conditions, keywords, test_max_points)
        
        status = response.get('status')
        message = response.get('message')
        
        if status == 'error':
            logging.error('Error in question retrieval occurred.')
            return jsonify({
                'status': status,
                'message': message,
            }), status_code
        else:
            questions_pool = response.get('search_result')
        
        if test_type == 'manual':
            selected_questions = sorted(
                [
                    {
                    'question_id': q['question_id'], 
                    'max_points': q['max_points'],
                    'question_desc': q['question_desc']
                    } 
                    for q in questions_pool
                ],
                key=lambda x: x['max_points']
            )

            return jsonify({
                'status': 'success',
                'message': 'Questions successfully retrieved for manual selection.',
                'selected_questions': selected_questions
            }), 200
        else:
            return jsonify({
                'status': 'success',
                'message': "Questions successfully retrieved for random selection.",
                'questions_pool': questions_pool
            }), 200
            
    # Error handling
    except ValueError as ve:
        logging.error(f"ValueError: {ve}")
        return jsonify({
            'status': 'error',
            'message': str(ve), 
            'selected_questions': []
        }), 400
    except SQLAlchemyError as sae:
        logging.error(f"SQLAlchemyError: {sae}")
        return jsonify({
            'status': 'error',
            'message': 'A database error occurred.'
        }), 500
    except Exception as e:
        logging.error(f"Unhandled exception: {e}", exc_info=True)
        return jsonify({
            'status': 'error',
            'message': 'An unhandled exception occurred while retrieving questions from the database.'
        }), 500
    
# Route to handle question selection from available pool for random test creation
@app.route('/select_questions', methods=['POST'])
def select_questions():
    logging.info("Executing handle_select_questions function.")
    data = request.json
    questions_pool = data['questions_pool']
    num_questions = data['num_questions']
    test_max_points = data['test_max_points']
    
    # Run checks to see if the question_pool is able to meet 
    # user specified number of questions and have a max point total
    # equal to or less then the user specified value
    valid, response = validate_questions_pool(questions_pool, num_questions, test_max_points)
    
    if not valid:
        # Initialize a default status code for general validation failures
        status_code = 400
        # Check if the issue is because the sum of max points exceeds the limit and there are fewer available questions than requested
        if 'total_questions_in_pool' in response and 'total_max_points' in response:
            status_code = 412
        # Check if the issue is because the sum of max points exceeds the limit
        elif 'total_questions_in_pool' in response and not 'total_max_points' in response:
            status_code = 422 
        # Check if no valid combination could be found
        elif response.get('error_code') == 'NO_VALID_COMBINATION':
            status_code = 406
        logging.info(f"Response: {response}")
        logging.info(f"Status code: {status_code}")
        return jsonify(response), status_code
    
    logging.info("Proceeding to question selection process.")
    
    # Flatten the question pool for easier random access
    flattened_questions = [
        {"question_id": question_id, "max_points": max_points}
        for max_points, questions in questions_pool.items()
        for question_id in questions
    ]
    
    selected_questions_info = []  # This will store dictionaries with question info
    total_score = 0  # Initialize total_score
    attempts = 0
    max_attempts = 1000  # Set a reasonable limit to prevent infinite loops
    
    while attempts < max_attempts:
        selected_questions_info.clear()  # Reset for each attempt
        total_score = 0  # Reset total_score for each attempt
        selected_indices = set()  # Track selected indices to avoid duplicates
        
        while len(selected_questions_info) < num_questions and total_score <= test_max_points:
            idx = random.randint(0, len(flattened_questions) - 1)
            if idx in selected_indices:  # Skip if already selected
                continue
            
            question_info = flattened_questions[idx]
            if total_score + int(question_info["max_points"]) <= test_max_points:
                selected_questions_info.append(question_info)
                total_score += int(question_info["max_points"])
                selected_indices.add(idx)
            
            if len(selected_questions_info) == num_questions:
                break  # Exit the loop once we've selected enough questions
            
        logging.info("Questions selection finished, giving selected questions order.")
        
        if len(selected_questions_info) == num_questions:
            # If successfully selected, assign order numbers
            order_nums = random.sample(range(1, num_questions + 1), num_questions)
            question_order = [
                {
                    "question_id": question_info["question_id"],
                    "question_order": order
                } for question_info, order in zip(selected_questions_info, order_nums)
            ]
            
            logging.info("Process finished and questions ready for test creation.")
            # Return the structured response with question_order and total_score
            return jsonify({
                'status': 'success',
                'question_order': question_order,
                'total_score': total_score,
                'message': "Questions successfully selected based on criteria."
            }), 200
        
        attempts += 1  # Increment attempt counter if not successful

    # If unable to select questions within max_attempts, return an error message
    return jsonify({
        'status': 'error',
        'message': 'Unable to select questions within constraints.'
    }), 400
    
def validate_questions_pool(questions_pool, num_questions, test_max_points):
    logging.info("Executing validate_questions_pool function.")
    
    total_questions_in_pool = 0
    total_max_points = 0
    
    # Iterate over each max_points value and its associated list of questions in question_pool
    for q_max_points, questions in questions_pool.items():
        # Convert q_max_points to integer
        q_max_points = int(q_max_points)
        # Add the number of questions at each key to the sum of all questions
        total_questions_in_pool += len(questions)
        # Calculate the sum of all question points by multipling the key
        # by the number fo questions that have that max_point value
        total_max_points += q_max_points * len(questions)

    logging.info("Check 1: Performing check to see if the number of questions available in the pool can meet the requirements of the requested number of questions and maximum point total.")
    # Perform initial checks for the number of questions and total max points
    logging.info(f"{total_questions_in_pool} < {num_questions}")
    if total_questions_in_pool < num_questions:
        message = f'Fewer questions available than requested (Available questions: {total_questions_in_pool}). '
        response = {
            'status': 'error',
            'message': message,
            'total_questions_in_pool': total_questions_in_pool
        }
        logging.info(f"{total_max_points} > {test_max_points}")
        if total_max_points > test_max_points:
            message = f'Fewer questions available than requested (Available questions: {total_questions_in_pool}) and the sum of max points of available questions ({total_max_points}) is greater than the specified limit of {test_max_points}.'
            response = {
            'status': 'error',
            'message': message,
            'total_questions_in_pool': total_questions_in_pool,
            'total_max_points': total_max_points
            }
        
        # If failing any initial check, return error details for the frontend to use
        logging.info("Check 1: Validation check failed.")
        return False, response

    logging.info("Check 1: Validation check passed.")
    logging.info("Check 2: Performing check to see if the questions available in the questions pool can meet the user defined criteria of num_questions and test_max_points")
    dp = [[False] * (test_max_points + 1) for _ in range(num_questions + 1)]
    dp[0][0] = True

    for max_points, questions in questions_pool.items():
        max_points = int(max_points)
        question_count = len(questions)

        for n in range(num_questions, 0, -1):
            for k in range(max_points, test_max_points + 1):  # Adjusted range
                for q in range(1, min(question_count, n) + 1):
                    # print(f'n: {n}, q: {q}, k: {k}, max_points: {max_points}, dp size: {len(dp)}, {len(dp[0])}')
                    if k - max_points * q >= 0 and dp[n-q][k-max_points*q]:
                        dp[n][k] = True

        if any(dp[num_questions][:test_max_points+1]):
            print('Validation checks passed!')
            return True, {'status': 'success', 'message': 'Both validation checks passed'}
    
    # If no valid combination is found by this point, return False, indicating failure.
    logging.info("Check 2: Validation check failed.")
    message = f'No valid combination of {num_questions} from the current question pool will result in a test score less then or equal to {test_max_points}. Alter test parameters and try again.'
    return False, {
        'status': 'error',
        'message': message,
        'error_code': 'NO_VALID_COMBINATION'
    }
    
# Route to handle test creation
@app.route('/test_creation', methods=['POST'])
def handle_test_creation():
    try:
        # Get JSON data from the request
        data = request.get_json()

        is_active = data.get('is_active')
        created_by = session.get('username')
        creation_date = datetime.now(timezone.utc).strftime('%Y-%m-%d %H:%M:%S')
        test_name = data.get('test_name')
        test_description = data.get('test_description')
        total_score = data.get('total_score', 0)
        question_order = data.get('question_order')
        
        # Ensure total score is an integer
        total_score = int(total_score) if isinstance(total_score, int) else 0
        
        # Create the test using extracted data
        response, status_code = create_test(is_active, created_by, creation_date, test_name, test_description, total_score, question_order)

        logging.info("Received response from create_test")
        logging.info(f"Response content: {response}")

        # If there's an error in test creation, log it and return an error response
        if 'error' in response:
            error_message = response["error"]
            logging.error(f"Error in test creation: {error_message}")
            return jsonify({"error": error_message}), status_code
        
        # If the test is created successfully, log it and return a success response
        logging.info(f"Test creation message: {response.get('message', '')}")
        logging.info("Test created successfully")
        return jsonify(response), status_code

    except Exception as e:
        logging.error("An error occurred while processing the request: %s", str(e), exc_info=True)
        return jsonify({"error": "An error occurred processing your request."}), 500
    
#------ Routes for question creation and modification ---------
@app.route('/process_question', methods=['POST'])
def process_question():
    obj_id = request.form['obj_id']
    question_desc = request.form['question_desc']
    question_text = request.form['question_text']
    question_answer = request.form['question_answer']
    question_type = request.form['question_type']
    question_difficulty = request.form['question_difficulty']
    answer_explanation = request.form['answer_explanation']
    points_definition = request.form['points_definition']
    max_points = request.form['max_points']
    source = request.form['source']

    query = text("""
            INSERT INTO questions (question_id, obj_id, question_desc, question_text, question_answer, question_type, question_difficulty, answer_explanation, points_definition, max_points, source)
            VALUES (0, :obj_id, :question_desc, :question_text, :question_answer, :question_type, :question_difficulty, :answer_explanation, :points_definition, :max_points, :source)
        """)

    # Execute the query
    db.engine.execute(query, obj_id=obj_id, question_desc=question_desc, question_text=question_text, question_answer=question_answer, question_type=question_type, question_difficulty=question_difficulty, answer_explanation=answer_explanation, points_definition=points_definition, max_points=max_points, source=source)

    return 'Question added successfully!'

@app.route('/modify_question', methods=['POST'])
def modify_question():
    obj_id = request.form['obj_id']
    question_id = request.form['question_id']
    question_desc = request.form['question_desc']
    question_text = request.form['question_text']
    question_answer = request.form['question_answer']
    question_type = request.form['question_type']
    question_difficulty = request.form['question_difficulty']
    answer_explanation = request.form['answer_explanation']
    points_definition = request.form['points_definition']
    max_points = request.form['max_points']
    source = request.form['source']

    query = text("""
            UPDATE questions 
            SET obj_id = :obj_id, 
                question_desc = :question_desc, 
                question_text = :question_text, 
                question_answer = :question_answer, 
                question_type = :question_type, 
                question_difficulty = :question_difficulty, 
                answer_explanation = :answer_explanation, 
                points_definition = :points_definition, 
                max_points = :max_points, 
                source = :source
            WHERE question_id = :question_id
        """)

    # Execute the query
    db.engine.execute(query, obj_id=obj_id, question_desc=question_desc, question_text=question_text, question_answer=question_answer, question_type=question_type, question_difficulty=question_difficulty, answer_explanation=answer_explanation, points_definition=points_definition, max_points=max_points, source=source, question_id=question_id)

    return 'Question updated successfully!'

#------ Routes for rendering tests and questions ---------

# Route to render tests as a html file for export
@app.route('/generate_test', methods=['POST'])
def generate_test():

    # Get the selected test ID from the form submission
    selected_test_id = request.form.get('test_id')

    # Render page
    return render_template('test_template.html', test_questions=get_test_questions(selected_test_id),
                           test_data=get_test_data(selected_test_id))

# Route to render test answers as a html file for export
@app.route('/generate_test_answers', methods=['POST'])
def generate_test_answers():

    # Get the selected test ID from the form submission
    selected_test_id = request.form.get('test_id')

    # Render page
    return render_template('test_answers_template.html', test_questions=get_test_questions(selected_test_id),
                           test_data=get_test_data(selected_test_id))

#------ Routes for Test Test Modification ---------

@app.route('/modify-test/<test_id>', methods=['GET'])
def modify_test(test_id):

        return show_test_modification_page('modify_tests.html', test_id = test_id)

def show_test_modification_page(template_name, test_id):
    # Check if user session is inactive
    if 'user' not in session or not session['user'].get('is_authenticated', False):
        flash("Access denied, please login.")
        return redirect(url_for('trylogin'))

    try:
        # Fetch test creation options from a function.
        options = fetch_test_creation_options()
        # Render the template 'random_test_creation.html' with the fetched options.
        return render_template(
            template_name,
            blooms_taxonomy=options['blooms_taxonomy'],
            subjects=options['subjects'],
            topics=options['topics'],
            question_types=options['question_types'],
            question_difficulty=options['question_difficulty'],
            test_id = test_id
        )
    except Exception as e:
        # Handle any exceptions that may occur and provide an error message.
        print("An error occurred in show_options:", str(e))
        return "An error occurred while preparing the test creation page."

@app.route('/get-questions-for-modify/<int:test_id>', methods=['POST'])
def handle_questions_for_modify(test_id):
    try:
        # Get selected questions for the provided test_id
        selected_questions = get_questions_for_modify(test_id)

        if len(selected_questions) == 0:
            return jsonify({'error': 'No questions found that meet the selection criteria.'}), 500

        # Sort questions based on their order
        selected_questions.sort(key=lambda x: x['question_order'])

        # Construct response data with question order and maximum points
        question_order = [
            {
                'question_id': q['question_id'],
                'question_order': q['question_order'],
                'max_points': q['max_points'],
                'question_desc': q['question_desc']  # Include question_text
            }
            for q in selected_questions
        ]

        # Calculate total score (if needed)
        total_score = sum(q['max_points'] for q in selected_questions)
        
        #print(question_order)
        return jsonify({
            'question_order': question_order
        })

    except Exception as e:
        return jsonify({'error': str(e)}), 500
    
@app.route('/handle_test_creation_for_modify', methods=['POST'])
def handle_test_creation_for_modify():
    try:
        # Get JSON data from the request
        data = request.get_json()
        # Get the test type from the data, defaulting to 'random'
        test_type = data.get('test_type', 'random')

        # Extract data directly from the request

        is_active = data.get('is_active')
        modified_by = session.get('username')
        last_modified_date = datetime.now(timezone.utc).strftime('%Y-%m-%d %H:%M:%S')
        test_name = data.get('test_name')
        test_description = data.get('test_description')
        total_score = data.get('total_score', 0)
        question_order = data.get('question_order')
        test_id = data.get('test_id')


        # Ensure total score is an integer
        total_score = int(total_score) if isinstance(total_score, int) else 0

        # Create the test using extracted data
        test_message = create_test_for_modify(is_active, modified_by, last_modified_date, test_name, test_description, total_score, question_order, test_id)

        logging.info("Received test_message from create_test")
        logging.info(f"test_message content: {test_message}")

        # If there's an error in test creation, log it and return an error response
        if "error" in test_message:
            logging.error(f"Error in test creation: {test_message['error']}")
            return jsonify({"error": test_message["error"]}), 500

        # If the test is created successfully, log it and return a success response
        logging.info("Test created successfully")
        return jsonify({"message": test_message["message"]}), 200

    except Exception as e:
        # Log any unexpected error that occurs during test creation and return an error response
        logging.error("An error occurred while creating the test: %s", str(e), exc_info=True)
        return jsonify({"error": str(e)}), 500
    
#----------Routes for registration and verification----------

# Route for the registration page, admin only.
@app.route("/tryregister")
def tryregister():

    # Check if user session is inactive
    if 'user' not in session or not session['user'].get('is_authenticated', False):
        flash("Access denied, please login.")
        return redirect(url_for('trylogin'))

    # Check if user is not an admin
    if session['user']['is_admin'] == 0:
        flash("Access denied, page is admin only.")
        return redirect(url_for('homepage'))

    # Check for any failed login or access denied messages
    messages = get_flashed_messages()

    # Serve login page
    return render_template("register.html", messages=messages)

@app.route("/register", methods=["POST"])
def register():
    if request.method == "POST":

        # Load form variables
        input_username = request.form.get("username")
        input_password = request.form.get("password")
        input_confirm_password = request.form.get("confirm_password")
        input_email = request.form.get("email")
        input_first_name = request.form.get("first_name")
        input_last_name = request.form.get("last_name")
        input_is_admin = request.form.get("is_admin")

        row = check_registered(input_username, input_email)

        # Check if a row was found
        if row:
            # Determine if the input corresponds to the found username or email
            if input_username == row['username']:
                flash("Username " + input_username + " already exists")
                return redirect(url_for('tryregister'))
            else:
                flash("Email " + input_email + " already exists")
                return redirect(url_for('tryregister'))

        else:
            # Insert the user into the database
            insert_query = text("""
                INSERT INTO user (username, email, password, name, is_admin, is_verified)
                VALUES (:username, :email, :password, :name, :is_admin, :is_verified)
            """)

            # Hash password for database storage
            hashed_password = bcrypt.generate_password_hash(input_password)

            if input_is_admin == "on":
                is_admin = 1
            else:
                is_admin = 0

            # Execute insert statement
            db.engine.execute(insert_query, username=input_username, email=input_email,
                              password=hashed_password, name=f"{input_first_name} {input_last_name}",
                              is_admin=is_admin, is_verified=0)

            user = {'username': input_username, 'email': input_email,
                    'name': input_first_name + " " + input_last_name, 'is_verified': 0,
                    'is_admin': is_admin, 'is_authenticated': False}


            # Hash username for verification
            username_hash = bcrypt.generate_password_hash(input_username + os.getenv("SALT"))

            # Encode the hash using base64
            encoded_hash = base64.urlsafe_b64encode(username_hash).decode('utf-8')

            # Send Email Verification email:

            # Send email to user using SMTP - Simple Mail Transfer Protocol
            # Create URL link
            url = request.url.replace('register', 'verify_email/' + input_username + '/' + str(encoded_hash))

            msg = Message('Training Test Program Email Verification.', sender=app.config['MAIL_USERNAME'],
                          recipients=[user['email']])
            msg.body = ('Dear ' + user['name'] +
                        '\n\nWe received a request to verify your new account ' + user['username'] + '. Please disregard this email if you did not register an account.' +
                        '\nClick the following link to verify your account.' +
                        '\nURL: ' + url)
            mail.send(msg)

            # Return to homepage
            flash("Account registered, please check your email for a verification link.")
            return redirect(url_for('homepage'))

# Action when the given link is clicked
@app.route('/logincode')
def verify_token():
    token = request.args.get('token')
    if 'user' not in session:
        return redirect(url_for('trylogin'))

    if session['user']['is_authenticated']:
        return redirect(url_for('homepage'))

    tokenized_email = confirm_token(token)
    user = session['user']
    email = user['email']
    username = user['username']
    password = session.get(f'password{username}')
    time = session.get(f'time{email}')
    if tokenized_email == email:
        return render_template('verification.html', password=password, time=time, user_email=email)

    # Handle invalid link
    error_message = {'category': 'error', 'message': 'Invalid or expired verification link.<br>Please make sure you are using the correct link provided in your email.'}
    return render_template("error_page.html", error_message=error_message)

# Action when submit button is clicked on verification page
@app.route('/verification', methods=['POST'])
def verify_otp():
    otp = request.form['otp']
    session_email = request.form['user_email']

    session_otp = session.get(f'otp_{session_email}')
    session_time = session.get(f'time_{session_email}')

    # When otp and time is not stored in session
    if not session_otp or not session_time:
        verification_result = {'category': 'error', 'message': 'Invalid OTP. Please try again.'}
        return render_template('verification.html',verification_result=verification_result, user_email=session_email)

    # When session is over
    current_time = datetime.now(timezone.utc)
    if current_time > session_time + timedelta(minutes=5):
        # Delete otp and time in session
        session.pop(f'otp_{session_email}')
        session.pop(f'time_{session_email}')
        verification_result = {'category': 'error', 'message': 'OTP verification is expired. Please try again.'}
        return render_template('verification.html', verification_result=verification_result, user_email=session_email)

    if otp == session_otp:  # Success in verification
        session.pop(f'otp_{session_email}')
        session.pop(f'time_{session_email}')

        # Update session as authenticated
        session['user']['is_authenticated'] = True
        return redirect(url_for('homepage'))

    elif otp != session_otp:
        verification_result = {'category': 'error', 'message': 'Invalid OTP. Please try again.'}
        return render_template('verification.html', verification_result=verification_result, user_email=session_email)

@app.route("/password_reset", methods=["GET", "POST"])
def password_reset():
    if request.method == "POST":
        input_email = request.form.get("email")

        # Query hashed password by email
        query = text("SELECT * FROM user WHERE email = :email")
        result = db.engine.execute(query, email=input_email)

        row = result.fetchone()
        if row:
            # Store the email in the session for later use
            session['reset_email'] = input_email

            otp_created_time = datetime.now(timezone.utc)
            otp = generate_otp(row['email'], otp_created_time)

            # Send email to user using SMTP - Simple Mail Transfer Protocol
            msg = Message('Training Test Program Password Reset.', sender=app.config['MAIL_USERNAME'],
                          recipients=[row['email']])
            msg.body = ('We received a request to renew your password.' +
                        '\nPlease insert verification code.\nVerification code: ' + str(otp))
            mail.send(msg)

            return render_template('reset_otp.html', time=otp_created_time,
                                   user_email=row['email'])
        else:
            flash("Invalid email address. Please try again.", 'error')
            return redirect(url_for("password_reset"))  # Redirect back to password reset form
    else:
        # Render the password reset form
        return render_template("password_reset.html")

@app.route('/reset_otp', methods=['GET', 'POST'])
def reset_otp():

    otp = request.form['otp']
    session_email = request.form['user_email']

    session_otp = session.get(f'otp_{session_email}')
    session_time = session.get(f'time_{session_email}')

    # When otp and time is not stored in session
    if not session_otp or not session_time:
        verification_result = {'category': 'error', 'message': 'Invalid OTP. Please try again.'}
        return render_template('reset_otp.html', verification_result=verification_result, user_email=session_email)

    # When session is over
    current_time = datetime.now(timezone.utc)
    if current_time > session_time + timedelta(minutes=5):
        # Delete otp and time in session
        session.pop(f'otp_{session_email}')
        session.pop(f'time_{session_email}')
        verification_result = {'category': 'error', 'message': 'OTP verification is expired. Please try again.'}
        return render_template('reset_otp.html', verification_result=verification_result, user_email=session_email)

    if otp == session_otp:  # Success in verification
        session.pop(f'otp_{session_email}')
        session.pop(f'time_{session_email}')
        return render_template('update_password.html')
    elif otp != session_otp:
        verification_result = {'category': 'error', 'message': 'Invalid OTP. Please try again.'}
        return render_template('reset_otp.html', verification_result=verification_result, user_email=session_email)

@app.route("/update_password", methods=["POST"])
def update_password():
    if request.method == "POST":
        new_password = request.form.get('new_password')
        confirm_password = request.form.get('confirm_password')

        if new_password != confirm_password:
            flash('Passwords do not match. Please try again.', 'error')
            return redirect(url_for('reset_otp'))  # Redirect back to password reset form

        # Hash the new password before updating in the database
        hashed_password = bcrypt.generate_password_hash(new_password).decode('utf-8')

        # Retrieve the email of the user whose password is being reset
        session_email = session.get('reset_email')

        if not session_email:
            flash('Invalid request. Please try again.', 'error')
            return redirect(url_for('trylogin'))  # Redirect to login page if no email found in session

        # Update the password in the database
        try:
            
            update_query = text("UPDATE user SET password = :hashed_password WHERE email = :email")
            db.engine.execute(update_query, hashed_password=hashed_password, email=session_email)

            # Check if the password was successfully updated in the database
            user_query = text("SELECT * FROM user WHERE email = :email")
            result = db.engine.execute(user_query, email=session_email)
            row = result.fetchone()
            newly_hashed_password = row['password']
            
            if bcrypt.check_password_hash(newly_hashed_password, new_password):
                # Password update was successful
                flash('Password updated successfully!', 'success')
                session.pop('reset_email')
                return redirect(url_for('trylogin'))  # Redirect to login page after password update
            else:
                flash('Failed to update password. Please try again later.', 'error')
                return redirect(url_for('reset_otp'))  # Redirect back to password reset form

        except Exception as e:
            flash('Failed to update password. Please try again later.', 'error')
            return redirect(url_for('reset_otp'))  # Redirect back to password reset form

# Route to handle initial email verification link
@app.route('/verify_email/<string:username>/<string:user_hash>', methods=['GET'])
def verify_email(username, user_hash):

    # Decode the encoded hash
    user_hash = urlsafe_b64decode(user_hash).decode('utf-8')

    # Check if hash matches username + salt
    if bcrypt.check_password_hash(user_hash, username + os.getenv("SALT")):

        # Flash success message and update user to verified in database
        flash('Account verified, you may now login')
        query = f"UPDATE user SET is_verified = 1 WHERE username = '" + username + "'"
        db.engine.execute(query)

    else:  # Shouldn't be reached unless attempting to verify without original link

        # Flash failure message
        flash('Verification failed, please try the original link in the verification email.')

    # Pop any existing sessions and redirect to login page
    session.pop('user', None)
    return redirect(url_for('trylogin'))

#----------Server Configuration and Startup----------

if __name__ == "__main__":
    app.run(host='0.0.0.0')

