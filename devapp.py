import os
from flask import Flask, render_template, request, url_for, redirect
from flask_sqlalchemy import SQLAlchemy
from sqlalchemy import create_engine
from sqlalchemy.sql import func, text
from flask_bcrypt import Bcrypt
from dotenv import load_dotenv, dotenv_values #pip install python-dotenv

load_dotenv()

app = Flask(__name__)

## Configure Flask app to use SQLAlchemy for a local MySQL database
app.config["SQLALCHEMY_DATABASE_URI"] = "mysql+pymysql://root:@localhost:3306/test_train_db"
app.config["SQLALCHEMY_TRACK_MODIFICATIONS"] = False
app.config["SECRET_KEY"] = os.getenv("SECRET_KEY")

# Initialize SQLAlchemy
db = SQLAlchemy(app)
bcrypt = Bcrypt(app)

# Hash the password before storing it in the database
# hashed_password = bcrypt.generate_password_hash(password,12).decode('utf-8')

# print(hashed_password)

# test login

@app.route("/")
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
