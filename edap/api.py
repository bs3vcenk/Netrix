import edap, platform
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

def hashString(inp):
	return _MD5HASH(inp.encode()).hexdigest()

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
	users[token] = {'user':request.json["username"], 'object':obj}
	return make_response(jsonify({'token':token}), 200)

@app.route('/api/user/<str:token>/classes', methods=["GET"])
def getClasses(token):
	if token not in users.keys():
		print('CLASS || Token %s does not exist' % token)
		abort(401)
	try:
		

if __name__ == '__main__':
	app.run(debug=True, host="0.0.0.0")