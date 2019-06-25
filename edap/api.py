import edap, platform, threading
from flask import Flask, jsonify, make_response, request, abort
from flask import __version__ as _flaskVersion
from flask_cors import CORS
from hashlib import md5 as _MD5HASH
from copy import deepcopy
from time import sleep
from random import randint

api_version = "1.0-dev"

#server_header = "eDAP/%s eDAP-API/%s Flask/%s" % (edap.edap_version, api_version, _flaskVersion)

#class localFlask(Flask):
#	def process_response(self, response):
#		response.headers['Server'] = server_header
#		super(localFlask, self).process_response(response)
#		return response

app = Flask("EDAP-API")
CORS(app)

users = {}
threads = {}

def hashString(inp):
	return _MD5HASH(inp.encode()).hexdigest()

class DataPopulationThread(threading.Thread):
	def __init__(self):
		self.status = None
		super().__init__()

def periodicDataUpdate(user_token):
	while True:
		sleep(randint(1200, 3600))
		users[user_token]['data'] = populateData(users[user_token]['object'])

def populateData(obj):
	"""
		Fill in the 'data' part of the user dict. This will contain subjects, grades, etc.
	"""
	dataDict = {'classes':None, 'tests':None}
	try:
		#self.status = {"status":"S_CLASSES","progress":None}
		cl = obj.getClasses()
	except Exception as e:
		print('PDATA || Error getting classes: %s' % e)
		abort(500)

	output = cl
	try:
		output[0]['subjects'] = obj.getSubjects(0)
	except Exception as e:
		print('PDATA || Error getting subjects for class')
		output[0]['subjects'] = None
	for z in range(len(output[0]['subjects'])):
		#self.status = {"status":"S_GRADES", "progress":"%s/%s" % (z+1, len(output[x]['subjects'])+1)}
		output[0]['subjects'][z]['id'] = z
		try:
			output[0]['subjects'][z]['grades'] = obj.getGradesForSubject(0, z)
		except Exception as e:
			print('PDATA || Error getting grades for subject %s: %s' % (z, e))
			output[0]['subjects'][z]['grades'] = None
			continue
	#self.status = {'status':'S_DONE', 'progress':None}
	dataDict['classes'] = output
	return dataDict

@app.errorhandler(404)
def e404(err):
	return make_response(jsonify({'error':'E_UNKNOWN_ENDPOINT'}), 404)

@app.errorhandler(401)
def e401(err):
	return make_response(jsonify({'error':'E_TOKEN_NONEXISTENT'}), 401)

@app.errorhandler(400)
def e400(err):
	return make_response(jsonify({'error':'E_INVALID_DATA'}), 400)

@app.errorhandler(405)
def e405(err):
	return make_response(jsonify({'error':'E_INVALID_METHOD'}), 405)

@app.errorhandler(500)
def e500(err):
	return make_response(jsonify({'error':'E_SERVER_ERROR'}), 500)

@app.route('/', methods=["GET"])
def index():
	return make_response(jsonify({'name':'eDnevnikAndroidProject', 'version':edap.edap_version, 'host-os':platform.system()+' '+platform.version(),'flask-version':_flaskVersion}), 200)

@app.route('/api/login', methods=["POST"])
def login():
	if not request.json or not 'username' in request.json or not 'password' in request.json:
		print("LOGIN || Invalid JSON [%s]" % request.data)
		abort(400)
	if hashString(request.json["username"] + ":" + request.json["password"]) in users.keys():
		return make_response(jsonify({'token':hashString(request.json["username"])}), 200)
	print("LOGIN || Attempting to log user %s in..." % request.json['username'])
	try:
		obj = edap.edap(request.json["username"], request.json["password"])
	except edap.WrongCredentials:
		print("LOGIN || Failed for user %s, invalid credentials." % request.json["username"])
		return make_response(jsonify({'error':'E_INVALID_CREDENTIALS'}), 401)
	except edap.FatalLogExit:
		print("LOGIN || Failed for user %s, program error." % request.json["username"])
		abort(500)
	token = hashString(request.json["username"] + ":" + request.json["password"])
	print("LOGIN || Success for user %s, saving to user list - token is %s." % (request.json["username"], token))
	users[token] = {'user':request.json["username"], 'object':obj, 'data':populateData(obj)}
	return make_response(jsonify({'token':token}), 200)

@app.route('/api/user/<string:token>/classes', methods=["GET"])
def getClasses(token):
	if token not in users.keys():
		print('CLASS || Token %s does not exist' % token)
		abort(401)
	o = deepcopy(users[token]['data'])
	for i in o['classes']:
		del i['subjects']
	return make_response(jsonify(o), 200)

@app.route('/api/user/<string:token>/classes/<int:class_id>/subjects', methods=["GET"])
def getSubjects(token, class_id):
	if token not in users.keys() or class_id not in range(len(users[token]['data'])):
		print('SUBJS || Either token (%s) or class ID (%s) is invalid' % (token, class_id))
		abort(401)
	o = deepcopy(users[token]['data']['classes'][class_id]['subjects'])
	for i in o:
		del i['grades']
	return make_response(jsonify({'subjects': o}), 200)

@app.route('/api/user/<string:token>/classes/<int:class_id>/subjects/<int:subject_id>', methods=["GET"])
def getSpecSubject(token, class_id, subject_id):
	if token not in users.keys() or class_id not in range(len(users[token]['data'])) or subject_id not in range(len(users[token]['data']['classes'][class_id]['subjects'])):
		print('SPSBJ || Either token (%s), class ID (%s) or subject ID (%s) is invalid' % (token, class_id, subject_id))
		abort(401)
	o = deepcopy(users[token]['data']['classes'][class_id]['subjects'][subject_id])
	del o['grades']
	return make_response(jsonify(o), 200)

@app.route('/api/user/<string:token>/classes/<int:class_id>/subjects/<int:subject_id>/grades', methods=["GET"])
def getGrades(token, class_id, subject_id):
	if token not in users.keys() or class_id not in range(len(users[token]['data'])) or subject_id not in range(len(users[token]['data']['classes'][class_id]['subjects'])):
		print('GRADE || Either token (%s), class ID (%s) or subject ID (%s) is invalid' % (token, class_id, subject_id))
		abort(401)
	o = users[token]['data']['classes'][class_id]['subjects'][subject_id]['grades']
	lgrades = []
	for i in o:
		lgrades.append(i['grade'])
	avg = round(sum(lgrades)/len(lgrades), 2)
	return make_response(jsonify({'grades': users[token]['data']['classes'][class_id]['subjects'][subject_id]['grades'], 'average': avg}), 200)

if __name__ == '__main__':
	app.run(debug=True, host="0.0.0.0")
