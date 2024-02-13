# Standard library imports
from datetime import datetime, timezone, timedelta
import os
from random import randint
import logging
import urllib.parse
from urllib.parse import unquote
import base64
from base64 import urlsafe_b64decode

# Related third party imports
from dotenv import load_dotenv, dotenv_values  # pip install python-dotenv
from flask import Flask, render_template, request, url_for, redirect, session, flash, get_flashed_messages, jsonify
from flask_bcrypt import Bcrypt
from flask_mail import Message, Mail
from sqlalchemy import create_engine, text
from sqlalchemy.sql import func
from sqlalchemy.exc import SQLAlchemyError
from itsdangerous import URLSafeTimedSerializer


# Local application/library specific imports
from config import MailConfig
from db_config import db
from data_retrieval import fetch_test_creation_options, get_questions, select_questions

# Load environment variables from a .env file
load_dotenv()

#Initialize Flask App
app = Flask(__name__)

# Configure Flask app to use SQLAlchemy for a local MySQL database
app.config["SQLALCHEMY_DATABASE_URI"] = "mysql+pymysql://root:@localhost:3306/test_train_db"
app.config["SQLALCHEMY_TRACK_MODIFICATIONS"] = False

# Configure Flask app with a secret key
app.config["SECRET_KEY"] = os.getenv("SECRET_KEY")

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
# hashed_password = bcrypt.generate_password_hash(password,12).decode('utf-8')
# print("Password: ", hashed_password)

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
  
@app.route('/datahierarchy')
def data():
    if 'user' not in session or not session['user'].get('is_authenticated', False):
        flash("Access denied, please login.")
        return redirect(url_for('trylogin'))

    return render_template('datahierarchy.html')

@app.route('/scoring_metrics')
def scoring():
    if 'user' not in session or not session['user'].get('is_authenticated', False):
        flash("Access denied, please login.")
        return redirect(url_for('trylogin'))
    
    return render_template('scoring_metrics.html')

# Route to render a page for creating a random test with various options.
@app.route('/random_test_creation')
def show_options():
    # Check if user session is inactive
    if 'user' not in session or not session['user'].get('is_authenticated', False):
        flash("Access denied, please login.")
        return redirect(url_for('trylogin'))

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

# Route to handle the POST request to get random questions based on user selections.
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

    # Error handling
    except ValueError as ve:
        logging.error(f"ValueError: {ve}")
        return jsonify({'error': str(ve), 'selected_questions': []}), 400
    except SQLAlchemyError as sae:
        logging.error(f"SQLAlchemyError: {sae}")
        return jsonify({'error': "A database error occurred."}), 500
    except Exception as e:
        logging.error(f"Unhandled exception: {e}", exc_info=True)
        return jsonify({'error': "An error occurred while preparing the test creation page."}), 500

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
