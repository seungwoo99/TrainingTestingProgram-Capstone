import os
from flask import Flask, render_template, request, url_for, redirect, session, flash, get_flashed_messages
from flask_sqlalchemy import SQLAlchemy
from sqlalchemy import create_engine
from sqlalchemy.sql import func, text
from flask_bcrypt import Bcrypt
from dotenv import load_dotenv, dotenv_values  # pip install python-dotenv
from flask_mail import Message, Mail
from random import randint
from datetime import datetime, timezone, timedelta
from config import MailConfig

load_dotenv()

app = Flask(__name__)

# Configure Flask app to use SQLAlchemy for a local MySQL database
app.config["SQLALCHEMY_DATABASE_URI"] = "mysql+pymysql://root:@localhost:3306/test_train_db"
app.config["SQLALCHEMY_TRACK_MODIFICATIONS"] = False
app.config["SECRET_KEY"] = os.getenv("SECRET_KEY")
# Configure Flask app to use Mail system
app.config.from_object(MailConfig)

# Initialize SQLAlchemy
db = SQLAlchemy(app)
bcrypt = Bcrypt(app)
# Initialize Mail
mail = Mail(app)


# Hash the password before storing it in the database
# hashed_password = bcrypt.generate_password_hash(password,12).decode('utf-8')

# print(hashed_password)

@app.route('/')
def index():
    return redirect(url_for('trylogin'))

@app.route('/random_test_creation')
def show_options():
    try:
        # Start a connection and execute queries within the context
        with db.engine.connect() as connection:
            # Fetch distinct Bloom's taxonomy levels
            blooms_query = text("SELECT DISTINCT name FROM blooms_tax")
            blooms_levels = connection.execute(blooms_query).fetchall()
            #print("Bloom's Taxonomy Levels:", blooms_levels)

            # Fetch distinct subjects
            subjects_query = text("SELECT DISTINCT name FROM subjects")
            subjects = connection.execute(subjects_query).fetchall()
            #print("Subjects:", subjects)

            # Fetch distinct topics
            topics_query = text("SELECT DISTINCT name FROM topics")
            topics = connection.execute(topics_query).fetchall()
            #print("Topics:", topics)

            # Fetch distinct question types
            question_types_query = text("SELECT DISTINCT question_type FROM questions")
            question_types = connection.execute(question_types_query).fetchall()
            #print("Question Types:", question_types)
            
            # Fetch distinct question types
            question_difficulty_query = text("SELECT DISTINCT question_difficulty FROM questions")
            question_difficulty = connection.execute(question_difficulty_query).fetchall()
            #print("Question Difficulty:", question_difficulty)
            
        # Clean and simplify the data
        blooms_levels = [level[0].strip() for level in blooms_levels]
        subjects = [subject[0].strip() for subject in subjects]
        topics = [topic[0].strip() for topic in topics]
        question_types = [q_type[0].strip() for q_type in question_types]
        question_difficulty = [str(q_difficulty[0]).strip() for q_difficulty in question_difficulty]
        
        return render_template(
            'random_test_creation.html', 
            blooms_levels=blooms_levels,
            subjects=subjects, 
            topics=topics, 
            question_types=question_types,
            question_difficulty=question_difficulty
        )

    except Exception as e:  # Catching a general exception for broader error coverage
        print("An error occurred: ", str(e))
        return "An error occurred while fetching data from the database."


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


if __name__ == "__main__":
    app.run(host='0.0.0.0')
