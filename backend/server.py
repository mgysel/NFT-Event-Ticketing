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
@APP.route('/ticket/add', methods=['POST'])
def newticket_add():
    '''
    Given a smart contract ID, event name, venue, ticket price
    Adds event to database
    '''
    data = request.get_json()
    fields = ['contractAddress', 'eventName', 'userAddress',  'ticketId']
    for field in fields:
        if not field in data:
            return make_response(
                dumps(
                    {"message": "No eventName, userAddress or ticketId parameters."}
                ), 
                400
            ) 

    contract_Address = data['contractAddress']
    event_name = data['eventName']
    user_Address = data['userAddress']
    ticket_Id = data['ticketId']
    print(event_name)
    print(user_Address)
    print(ticket_Id)
    
    code_json = {
        'contract_Address': contract_Address,
        'event_name': event_name,
        'user_Address': user_Address,
        'ticket_Id': ticket_Id
    }

    db = client['project']
    coll = db['NewTicket']
    coll.insert_one(code_json)

    return make_response(
        dumps(
            {
                "result": "success",
            }
        ), 
        201
    ) 

@APP.route('/ticket/delete', methods=['POST'])
def newticket_delete():
    '''
    Given a smart contract ID, event name, venue, ticket price
    Adds event to database
    '''
    data = request.get_json()
    fields = ['eventName', 'userAddress',  'ticketId']
    for field in fields:
        if not field in data:
            return make_response(
                dumps(
                    {"message": "No eventName, userAddress or ticketId parameters."}
                ), 
                400
            ) 

    event_name = data['eventName']
    user_Address = data['userAddress']
    ticket_Id = data['ticketId']
    print(event_name)
    print(user_Address)
    print(ticket_Id)
    
    code_json = {
        'event_name': event_name,
        'user_Address': user_Address,
        'ticket_Id': ticket_Id
    }

    db = client['project']
    coll = db['NewTicket']
    coll.remove(code_json)

    return make_response(
        dumps(
            {
                "result": "success",
            }
        ), 
        200
    ) 

@APP.route('/ticket/query', methods=['GET'])
def newticket_get():
    '''
    Returns tickets for a user
    '''
    # Get eventName and useraddress, 400 eror if parameters not in args
    event_name = request.args.get('eventName')
    user_Address = request.args.get('userAddress')
    if user_Address is None:    
        return make_response(
        dumps(
            {"message": "user_Address."}
        ), 
        400
    ) 

    # Get all events 
    db = client['project']
    coll = db['NewTicket']
    #coll.remove()
    code_json = coll.find({ 'user_Address': user_Address })
    list_cursor = list(code_json)
    
    arrOutput = []
    for oRec in list_cursor:
        arrOutput.append({'contractAddress': oRec['contract_Address'],
                            'eventName': oRec['event_name'],
                            'userAddress': oRec['user_Address'],
                            'ticketID': oRec['ticket_Id']})
    print("Array Output", arrOutput)
    return make_response(
        dumps(arrOutput), 
        200
    ) 
    
    
############################
#QR Code Functionality start
############################
    
@APP.route('/usedticket/add', methods=['POST'])
def usedticket_add():
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
    coll = db['UsedTicket']
    coll.insert_one(code_json)

    return make_response(
        dumps(
            {
                "result": "success",
            }
        ), 
        201
    ) 


@APP.route('/usedticket/query', methods=['GET'])
def usedticket_get():
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
    coll = db['UsedTicket']
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
        200
    ) 

if __name__ == "__main__":
    APP.run(port=(int(sys.argv[1]) if len(sys.argv) == 2 else 2122), debug=True)