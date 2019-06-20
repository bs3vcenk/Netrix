import edap, platform, threading
from flask import Flask, jsonify, make_response, request, abort
from flask import __version__ as _flaskVersion
from hashlib import md5 as _MD5HASH

api_version = "1.0-dev"

server_header = "eDAP/%s eDAP-API/%s Flask/%s" % (edap.edap_version, api_version, _flaskVersion)

class localFlask(Flask):
	def process_response(self, response):
		response.headers['Server'] = server_header
		super(localFlask, self).process_response(response)
		return response

app = Flask("EDAP-API")
users = {}
threads = {}

def hashString(inp):
	return _MD5HASH(inp.encode()).hexdigest()

class DataPopulationThread(threading.Thread):
	def __init__(self):
		self.status = None
		super().__init__()

	def populateData(obj):
		"""
			Fill in the 'data' part of the user dict. This will contain subjects, grades, etc.
		"""
		dataDict = {'classes':None, 'tests':None}

		try:
			self.status = {"status":"S_CLASSES","progress":None}
			cl = obj.getClasses()
		except Exception as e:
			print('PDATA || Error getting classes: %s' % e)
			abort(500)

		output = cl
		for x in range(len(output)):
			self.status = {"status":"S_SUBJECTS","progress":"%s/%s" % (x, len(output))}
			try:
				output[x]['subjects'] = obj.getSubjects(x)
			except Exception as e:
				print('PDATA || Error getting subjects for class %s: %s' % (x, e))
				output[x]['subjects'] = None
				continue
			for z in range(len(output[x]['subjects'])):
				self.status = {"status":"S_GRADES", "progress":"%s/%s" % (z+1, len(output[x]['subjects'])+1)}
				try:
					output[x]['subjects'][z]['grades'] = obj.getGradesForSubject(x, z)
				except Exception as e:
					print('PDATA || Error getting grades for class %s, subject %s: %s' % (x, z, e))
					output[x]['subjects'][z]['grades'] = None
					continue
		self.status = {'status':'S_DONE', 'progress':None}
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
	if hashString(request.json["username"]) in users.keys():
		return make_response(jsonify({'token':token}), 200)
	print("LOGIN || Attempting to log user %s in..." % request.json['username'])
	try:
		obj = edap.edap(request.json["username"], request.json["password"])
	except edap.WrongCredentials:
		print("LOGIN || Failed for user %s, invalid credentials." % request.json["username"])
		return make_response(jsonify({'error':'E_INVALID_CREDENTIALS'}), 401)
	except edap.FatalLogExit:
		print("LOGIN || Failed for user %s, program error." % request.json["username"])
		abort(500)
	token = hashString(request.json["username"])
	print("LOGIN || Success for user %s, saving to user list - token is %s." % (request.json["username"], token))
	users[token] = {'user':request.json["username"], 'object':obj, 'data':populateData(obj)}
	return make_response(jsonify({'token':token}), 200)

@app.route('/api/user/<string:token>/classes', methods=["GET"])
def getClasses(token):
	if token not in users.keys():
		print('CLASS || Token %s does not exist' % token)
		abort(401)
	o = users[token]['data']
	for i in o['classes']:
		del i['subjects']
	return make_response(jsonify(o), 200)

@app.route('/api/user/<string:token>/classes/<int:class_id>/subjects', methods=["GET"])
def getSubjects(token, class_id):
	if token not in users.keys() or class_id not in range(len(users[token]['data'])):
		print('SUBJS || Either token (%s) or class ID (%s) is invalid' % (token, class_id))
		abort(401)
	return "a"

if __name__ == '__main__':
	app.run(debug=True, host="0.0.0.0")