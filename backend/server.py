from flask import Flask, request, redirect, url_for
from flask_cors import CORS
from werkzeug.security import generate_password_hash, check_password_hash
from bson.objectid import ObjectId
# imports for PyJWT authentication
import jwt
from json import dumps, load
import sys
from flask.json import jsonify
import json
from flask.helpers import make_response
import pymongo
from pymongo import MongoClient
import hashlib


APP = Flask(__name__)
# Allows cross-origin AJAX, so React can talk to this API
CORS(APP)

APP.config['SECRET_KEY'] = 'your secret key'

# Connect to MongoDB
connection_string = "mongodb+srv://comp4337:comp4337@cluster0.mzbuz.mongodb.net/myFirstDatabase?retryWrites=true&w=majority"
client = MongoClient(connection_string)



########## EVENT ROUTES ##########
@APP.route('/event/add', methods=['POST'])
def event_add():
    '''
    Given a smart contract ID, event name, venue, ticket price
    Adds event to database
    '''
    data = request.get_json()
    fields = ['eventName', 'qrCode']
    for field in fields:
        if not field in data:
            return make_response(
                dumps(
                    {"message": "No eventName or qrCode parameters."}
                ), 
                400
            ) 

    event_name = data['eventName']
    qr_code = hashlib.sha256(data['qrCode'].encode()).hexdigest()
    print(qr_code)
    
    code_json = {
        'event_name': event_name,
        'qr_code': qr_code
    }

    db = client['project']
    coll = db['events']
    coll.insert_one(code_json)

    return make_response(
        dumps(
            {
                "result": "success",
            }
        ), 
        201
    ) 




@APP.route('/event/query', methods=['GET'])
def event_get():
    '''
    Returns True if QR Code is valid, false otherwise
    '''
    # Get eventName and qrCode, 400 eror if parameters not in args
    event_name = request.args.get('eventName')
    qr_code = hashlib.sha256(request.args.get('qrCode').encode()).hexdigest()
    if event_name is None or qr_code is None:    
        return make_response(
        dumps(
            {"message": "No eventName or qrCode parameters."}
        ), 
        400
    ) 

    # Get all events 
    db = client['project']
    coll = db['events']
    code_json = coll.find_one({ 'event_name': event_name, 'qr_code': qr_code })

    if code_json:
        result = True
    else:
        result = False

    return make_response(
        dumps(
            {
                "result": result,
            }
        ), 
        201
    ) 




if __name__ == "__main__":
    APP.run(port=(int(sys.argv[1]) if len(sys.argv) == 2 else 2122), debug=True)