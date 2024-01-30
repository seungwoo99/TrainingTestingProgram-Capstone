# Standard library imports
from datetime import datetime, timezone, timedelta
import os
from random import randint
import logging


# Related third party imports
from dotenv import load_dotenv, dotenv_values  # pip install python-dotenv
from flask import Flask, render_template, request, url_for, redirect, session, flash, get_flashed_messages, jsonify
from flask_bcrypt import Bcrypt
from flask_mail import Message, Mail
from flask_sqlalchemy import SQLAlchemy
from sqlalchemy import create_engine, text
from sqlalchemy.sql import func
from sqlalchemy.exc import SQLAlchemyError

# Local application/library specific imports
from config import MailConfig
from db_config import db
from data_retrieval import fetch_test_creation_options, get_questions, select_questions

load_dotenv()

app = Flask(__name__)

# Configure Flask app to use SQLAlchemy for a local MySQL database
app.config["SQLALCHEMY_DATABASE_URI"] = "mysql+pymysql://root:@localhost:3306/test_train_db"
app.config["SQLALCHEMY_TRACK_MODIFICATIONS"] = False
app.config["SECRET_KEY"] = os.getenv("SECRET_KEY")
# Configure Flask app to use Mail system
app.config.from_object(MailConfig)

# Initialize SQLAlchemy
db.init_app(app)
bcrypt = Bcrypt(app)
# Initialize Mail
mail = Mail(app)

# Hash the password before storing it in the database
# hashed_password = bcrypt.generate_password_hash(password,12).decode('utf-8')

# print(hashed_password)

#@app.route('/')
#def index():
#    return redirect(url_for('trylogin'))

# This route renders a page for creating a random test with various options.
@app.route('/random_test_creation')
def show_options():
    try:
        # Fetch test creation options from a function.
        options = fetch_test_creation_options()
        # Render the template 'random_test_creation.html' with the fetched options.
        return render_template(
            'random_test_creation.html',
            blooms_levels=options['blooms_levels'],
            subjects=options['subjects'],
            topics=options['topics'],
            question_types=options['question_types'],
            question_difficulty=options['question_difficulty']
        )
    except Exception as e:
        # Handle any exceptions that may occur and provide an error message.
        print("An error occurred in show_options:", str(e))
        return "An error occurred while preparing the test creation page."

# This route handles the POST request to get random questions based on user selections.
@app.route('/get-questions', methods=['POST'])    
def handle_get_questions():
    try:
        # Parse JSON data from the request.
        data = request.json
        logging.debug(f"Received data: {data}")

        # Extract various filters and parameters from the JSON data.
        blooms_levels = data.get('blooms_levels', [])
        subjects = data.get('subjects', [])
        topics = data.get('topics', [])
        question_types = data.get('question_types', [])
        question_difficulties = data.get('question_difficulties', [])
        num_questions = int(data.get('num_questions', 0))
        max_points = int(data.get('max_points', 0))

        logging.debug(f"Filter parameters: blooms_levels: {blooms_levels}, subjects: {subjects}, topics: {topics}, question_types: {question_types}, question_difficulties: {question_difficulties}")
        logging.debug(f"Test parameters: num_questions: {num_questions}, max_points: {max_points}")

        # Retrieve a pool of questions based on the user's filters.
        questions_pool = get_questions(blooms_levels, subjects, topics, question_types, question_difficulties)
        total_questions_in_pool = len(questions_pool)
        logging.debug(f"Total questions in pool: {total_questions_in_pool}")

        # If no questions meet the selection criteria, return a message.
        if total_questions_in_pool == 0:
            logging.warning("No questions found that meet the selection criteria.")
            return jsonify({
                'total_questions_in_pool': total_questions_in_pool,
                'questions_chosen_for_test': 0,
                'selected_questions': [],
                'message': "No questions found that meet the selection criteria."
            })

        # Select a subset of questions for the test based on user preferences.
        selected_questions = select_questions(questions_pool, num_questions, max_points)
        questions_chosen_for_test = len(selected_questions)
        logging.debug(f"Questions chosen for test: {questions_chosen_for_test}")

        # Return information about the selected questions and the test creation status.
        response = jsonify({
            'total_questions_in_pool': total_questions_in_pool,
            'questions_chosen_for_test': questions_chosen_for_test,
            'selected_questions': [question[0] for question in selected_questions],
            'message': "Questions successfully retrieved and test created."
        })
        logging.debug(f"Response: {response.get_data(as_text=True)}")
        return response

    except ValueError as ve:
        logging.error(f"ValueError: {ve}")
        return jsonify({'error': str(ve), 'selected_questions': []}), 400
    except SQLAlchemyError as sae:
        logging.error(f"SQLAlchemyError: {sae}")
        return jsonify({'error': "A database error occurred."}), 500
    except Exception as e:
        logging.error(f"Unhandled exception: {e}", exc_info=True)
        return jsonify({'error': "An error occurred while preparing the test creation page."}), 500

@app.route('/logout')
def logout():
    session.pop('user', None)
    return redirect(url_for('trylogin'))

@app.route("/trylogin")
def trylogin():
    # Check if user session is already active
    if 'user' in session and session['user'].get('is_authenticated', False):
        return redirect(url_for('homepage'))

    # Check for any failed login or access denied messages
    messages = get_flashed_messages()

    # Serve login page
    return render_template("login.html", messages=messages)

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

@app.route("/homepage")
def homepage():
    # Check if user session is inactive
    if 'user' not in session or not session['user'].get('is_authenticated', False):
        flash("Access denied, please login.")
        return redirect(url_for('trylogin'))

    # Serve homepage
    return "<h2>This is the under-construction homepage</h2><a href=\"/logout\">Logout</a>"

@app.route("/login", methods=["POST"])
def login():
    if request.method == "POST":

        # Load form variables
        input_username = request.form.get("username")
        input_password = request.form.get("password")

        # Query hashed password by username
        query = text("SELECT * FROM user WHERE username = :username")
        result = db.engine.execute(query, username=input_username)

        row = result.fetchone()

        # Check if a row was found
        if row:
            # Extract the hashed password from the 'password' column
            hashed_password = row['password']
        else:
            flash("Invalid username or password")
            return redirect(url_for('trylogin'))

        user = {'username': row['username'], 'email': row['email'],
                'authenticated': True, 'name': row['name'], 'is_verified': row['is_verified'],
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

            # Send email to user using SMTP - Simple Mail Transfer Protocol
            # Send email to user using SMTP - Simple Mail Transfer Protocol
            msg = Message('Training Test Program Verification.', sender=app.config['MAIL_USERNAME'],
                          recipients=[user['email']])
            msg.body = ('Dear ' + user['name'] +
                        '\n\nWe received a request to access your account ' + user['username'] + '.' +
                        '\nPlease insert verification code.\nVerification code: ' + str(otp))
            mail.send(msg)

            # Set up user session cookie
            session['user'] = user
            session['user']['is_authenticated'] = True

            # Move to verification page
            return render_template('verification.html', password=input_password, time=otp_created_time, user_email=user['email'])
        else:
            # Flash failed authentication message and redirect to login page
            flash("Invalid username or password")
            return redirect(url_for('trylogin'))

# Generate a verification otp
def generate_otp(email, time):
    otp = str(randint(100000, 999999))
    session[f'otp_{email}'] = otp
    session[f'time_{email}'] = time
    return otp

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
        return redirect(url_for('homepage'))
    elif otp != session_otp:
        verification_result = {'category': 'error', 'message': 'Invalid OTP. Please try again.'}
        return render_template('verification.html', verification_result=verification_result, user_email=session_email)

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

        # Check if passwords match
        if input_password != input_confirm_password:
            # Flash failed authentication message and redirect to register page
            flash("Entered passwords do not match")
            return redirect(url_for('tryregister'))

        # Check if by username or email is already registered
        query = text("SELECT * FROM user WHERE username = :username OR email = :email")
        result = db.engine.execute(query, username=input_username, email=input_email)

        row = result.fetchone()

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

            # Return to homepage
            return redirect(url_for("homepage"))

if __name__ == "__main__":
    app.run(host='0.0.0.0')
