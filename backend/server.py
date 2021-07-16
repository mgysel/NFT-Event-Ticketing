from flask import Flask, request, redirect, url_for
from flask_mail import Mail, Message
from flask_cors import CORS
from bson.objectid import ObjectId
# imports for PyJWT authentication
import jwt
from json import dumps, load
import sys
from flask.json import jsonify
import json
from flask.helpers import make_response


APP = Flask(__name__)
# Allows cross-origin AJAX, so React can talk to this API
CORS(APP)

APP.config['SECRET_KEY'] = 'your secret key'




########## EVENT ROUTES ##########

@APP.route('/event/add', methods=['POST'])
def event_add():
    '''
    Given a smart contract ID, event name, venue, ticket price
    Adds event to database
    '''
    data = request.get_json()
    result = add_event(data, APP.secret_key)
    return result

@APP.route('/event/<event_id>', methods=['GET'])
def event_get():
    '''
    Returns an event given an event ID
    '''
    data = request.get_json()
    result = get_event(data, APP.secret_key)
    return result




########## TICKET ROUTES ##########

@APP.route('/ticket/add', methods=['POST'])
def event_get():
    '''
    Given a ticketID and userID
    Adds ticket to database
    '''
    data = request.get_json()
    result = add_ticket(data, APP.secret_key)
    return result

@APP.route('/tickets/<user_id>', methods=['GET'])
def event_get():
    '''
    Given a ticketID and userID
    Adds ticket to database
    '''
    data = request.get_json()
    result = get_ticket(data, APP.secret_key)
    return result




########## AUTH ROUTES ##########

@APP.route('/auth/register', methods=['POST'])
def register_user():
    '''
    Registers a user
    '''
    data = request.get_json()
    result = auth_register(data, APP.secret_key)
    return result

@APP.route('/auth/login', methods=['POST'])
def login_user():
    '''
    Logs in a user
    '''
    data = request.get_json()
    result = auth_login(data, APP.secret_key)
    return result


if __name__ == "__main__":
    APP.run(port=(int(sys.argv[1]) if len(sys.argv) == 2 else 2119), debug=True)