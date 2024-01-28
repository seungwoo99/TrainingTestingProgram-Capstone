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
    return render_template("home.html", messages=messages)


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
        #if bcrypt.check_password_hash(hashed_password, input_password):
        if input_password == hashed_password:
            # Create otp
            session[f'email_{input_username}'] = user['email']
            otp_created_time = datetime.now(timezone.utc)
            otp = generate_otp(user['email'], otp_created_time)


            # Send email to user using SMTP - Simple Mail Transfer Protocol
            msg = Message('Training Test Program Verification.', sender=app.config['MAIL_USERNAME'],
                          recipients=[user['email']])
            msg.body = ('Dear ' + user['name'] +
                        '\n\nWe received a request to access your account ' + user['username'] + '.' +
                        '\nPlease insert verification code.\nVerification code: '+str(otp))
            mail.send(msg)

            # Set up user session cookie
            session['user'] = user
            session['user']['is_authenticated'] = True

            # Redirect to homepage
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


#action when submit button is clicked
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
        return "<h2>This is the under-construction homepage</h2><a href=\"/logout\">Logout</a>"
    elif otp != session_otp:
        verification_result = {'category': 'error', 'message': 'Invalid OTP. Please try again.'}
        return render_template('verification.html', verification_result=verification_result, user_email=session_email)


if __name__ == "__main__":
    app.run(host='0.0.0.0', port=5003)
