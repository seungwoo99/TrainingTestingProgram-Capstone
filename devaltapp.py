import os
from flask import Flask, render_template, request, url_for, redirect
from flask_sqlalchemy import SQLAlchemy
from sqlalchemy import create_engine
from sqlalchemy.sql import func, text
from flask_bcrypt import Bcrypt
import pymysql.cursors
from sshtunnel import SSHTunnelForwarder

app = Flask(__name__)

# Configure SSH tunnel details
SSH_USER = 'nathan'
SSH_HOST = 'wildcats.training'
SSH_PORT = 22
SSH_KEY_PATH = 'C:/Users/nmill/PycharmProjects/testingtraining/nathanPrivateKeyOpenssh.pem'

# Configure MySQL database details
DB_USER = 'nathan'
DB_PASSWORD = 'winter24capstone'
DB_NAME = 'test_train_db'
DB_HOST = '127.0.0.1'
DB_PORT = 3306


# Set up SSH tunnel
with SSHTunnelForwarder(
    (SSH_HOST, SSH_PORT),
    ssh_username=SSH_USER,
    ssh_pkey=SSH_KEY_PATH,
    remote_bind_address=(DB_HOST, DB_PORT)
) as tunnel:
    # Create PyMySQL connection using the SSH tunnel
    pymysql_connection = pymysql.connect(
        host=DB_HOST,
        port=tunnel.local_bind_port,
        user=DB_USER,
        password=DB_PASSWORD,
        database=DB_NAME,
        charset='utf8mb4',
        cursorclass=pymysql.cursors.DictCursor,
        connect_timeout=5
    )

    # Configure Flask app to use SQLAlchemy with the PyMySQL connection
    app.config['SQLALCHEMY_DATABASE_URI'] = 'mysql+pymysql://'
    app.config['SQLALCHEMY_ENGINE_OPTIONS'] = {
        'creator': lambda: pymysql_connection
    }
    app.config['SQLALCHEMY_TRACK_MODIFICATIONS'] = False

    # Initialize SQLAlchemy
    db = SQLAlchemy(app)
    bcrypt = Bcrypt(app)

# Hash the password before storing it in the database
# hashed_password = bcrypt.generate_password_hash(password,12).decode('utf-8')

# print(hashed_password)

@app.route("/")
def hello():
    try:
        # Check the database connection by executing a simple query
        result = db.engine.execute("SELECT * FROM test_train_db.user;")
        print(result)
        connection_status = "Connected" if result.scalar() == 1 else "Not Connected"

        return f"<h1 style='color:green'>Database Status: {connection_status}</h1>"
    except Exception as e:
        return f"<h1 style='color:red'>Error connecting to the database: {str(e)}</h1>"


@app.route("/users")
def show_users():
    try:
        # Execute the SELECT query
        result = db.engine.execute("SELECT * FROM user")

        # Fetch all rows from the result set
        rows = result.fetchall()

        # Display the results
        result_html = "<h2>Users:</h2>"
        for row in rows:
            result_html += f"<p>{row}</p>"

        return result_html

    except Exception as e:
        return f"<h1 style='color:red'>Error: {str(e)}</h1>"


@app.route("/trylogin")
def trylogin():
    return render_template("home.html")

@app.route("/login", methods=["POST"])
def login():
    if request.method == "POST":
        input_username = request.form.get("username")
        input_password = request.form.get("password")

        # Using parameterized query
        query = text("SELECT password FROM user WHERE username = :username")
        result = db.engine.execute(query, username=input_username)

        row = result.fetchone()

        # Check if a row was found
        if row:

            # Extract the hashed password from the 'password' column
            hashed_password = row['password']
        else:
            return "Invalid username or password."

        if bcrypt.check_password_hash(hashed_password, input_password):
            return "Login successful!"
        else:
            return "Invalid username or password."


if __name__ == "__main__":
    app.run(host='0.0.0.0')
