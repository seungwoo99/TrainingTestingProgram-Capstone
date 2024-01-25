import os
from flask import Flask, render_template, request, url_for, redirect
from flask_sqlalchemy import SQLAlchemy

from sqlalchemy.sql import func

app = Flask(__name__)
app.config["SQLALCHEMY_DATABASE_URI"] = "mysql+pymysql://root:winter24capstone@127.0.0.1:3306/testDB1"

app.config['SQLALCHEMY_TRACK_MODIFICATIONS'] = False

db = SQLAlchemy(app)

@app.route("/")
def hello():
	return "<h1 style='color:green'>Hello World!</h1>"

if __name__ == "__main__":
	app.run(host='0.0.0.0')
