import edap, platform, threading, redis, logging
from flask import Flask, jsonify, make_response, request, abort, redirect
from flask import __version__ as _flaskVersion
from flask_cors import CORS
from hashlib import md5 as _MD5HASH
from hashlib import sha256 as _SHA256HASH
from copy import deepcopy
from time import sleep
from random import randint
from json import loads as _jsonLoad
from json import dumps as _jsonConvert
from functools import wraps
from os import environ
from os.path import join as _joinPath
from multiprocessing import Value
from sys import exit as _exit

from types import ModuleType, FunctionType
from gc import get_referents
from sys import getsizeof

ALLOW_DEV_ACCESS = True # Allow access to /dev endpoints
DATA_FOLDER = "/data" # For logs, etc.

api_version = "1.1-dev"

#server_header = "eDAP/%s eDAP-API/%s Flask/%s" % (edap.edap_version, api_version, _flaskVersion)

#class localFlask(Flask):
#	def process_response(self, response):
#		response.headers['Server'] = server_header
#		super(localFlask, self).process_response(response)
#		return response

try:
	privUsername = environ["NETRIX_DEV_USER"]
	privPassword = environ["NETRIX_DEV_PASW"]
except:
	privUsername = None
	privPassword = None
	ALLOW_DEV_ACCESS = False

log = logging.getLogger('EDAP-API')
log.setLevel(logging.DEBUG)
ch = logging.FileHandler(_joinPath(DATA_FOLDER, "edap_api.log"))
ch.setLevel(logging.DEBUG)
ch.setFormatter(logging.Formatter('%(asctime)s || %(funcName)s || %(levelname)s => %(message)s'))
log.addHandler(ch)

app = Flask("EDAP-API")
CORS(app)

r = redis.Redis(host='localhost', port=6379, db=0)

def getData(token):
	 return _jsonLoad(r.get("token:" + token).decode("utf-8"))

def getTokens():
	return [i.decode('utf-8').replace("token:", "") for i in r.keys('token:*')]

def getLogins(logintype):
	try:
		return Value('i', int(r.get("logincounter:" + logintype)))
	except TypeError:
		log.warning("TypeError for getLogins")
		r.set("logincounter:" + logintype, 0)
		return Value('i', 0)
	except redis.exceptions.ConnectionError:
		# This is one of the first connections to the database, so we can handle connection errors here
		log.fatal("Database connection failed!")
		_exit(1)

def userInDatabase(token):
	return "token:" + token in [i.decode('utf-8') for i in r.keys('token:*')]

def classIDExists(token, cid):
	return cid in range(len(getData(token)['data']))

def subjectIDExists(token, cid, sid):
	return sid in range(len(getData(token)['data']['classes'][cid]['subjects']))

class PeriodicAnalyticsSave(threading.Thread):
	def run(self):
		while True:
			r.set("logincounter:full", logins_full.value)
			r.set("logincounter:fast", logins_fast.value)
			r.set("logincounter:fail:generic", logins_fail_ge.value)
			r.set("logincounter:fail:password", logins_fail_wp.value)
			sleep(5)

class PeriodicDatabaseSaveToDisk(threading.Thread):
	def run(self):
		while True:
			r.save()
			sleep(120)

logins_full = getLogins("full")
logins_fast = getLogins("fast")
logins_fail_ge = getLogins("fail:generic")
logins_fail_wp = getLogins("fail:password")

threads = {}

#threads["analytics"] = PeriodicAnalyticsSave()
#threads["analytics"].start()
#threads["database"] = PeriodicDatabaseSaveToDisk()
#threads["database"].start()

def hashString(inp):
	return _MD5HASH(inp.encode()).hexdigest()

def hashPassword(inp):
	return _SHA256HASH(inp.encode()).hexdigest()

class DataPopulationThread(threading.Thread):
	def __init__(self):
		self.status = None
		super().__init__()

def periodicDataUpdate(user_token):
	while True:
		sleep(randint(1200, 3600))
		users[user_token]['data'] = populateData(users[user_token]['object'])

def populateData(obj=None, username=None, password=None):
	"""
		Fill in the 'data' part of the user dict. This will contain subjects, grades, etc.
	"""
	dataDict = {'classes':None, 'info':None}
	try:
		output = obj.getClasses()
	except Exception as e:
		log.error("Error getting classes: %s" % e)
		abort(500)

	try:
		tests_nowonly = obj.getTests(0, alltests=False)
		tests_all = obj.getTests(0, alltests=True)
		for x in tests_all:
			if x not in tests_nowonly:
				x['current'] = False
			else:
				x['current'] = True
		output[0]['tests'] = tests_all
	except Exception as e:
		log.error("Error getting tests for class: %s" % e)
		output[0]['tests'] = None

	try:
		output[0]['subjects'] = obj.getSubjects(0)
	except Exception as e:
		log.error("Error getting subjects for class: %s" % e)
		output[0]['subjects'] = None
	for z in range(len(output[0]['subjects'])):
		output[0]['subjects'][z]['id'] = z
		try:
			output[0]['subjects'][z]['grades'] = obj.getGradesForSubject(0, z)
			isconcl, concluded = obj.getConcludedGradeForSubject(0, z)
			if isconcl:
				output[0]['subjects'][z]['average'] = concluded
			else:
				lgrades = []
				for i in output[0]['subjects'][z]['grades']:
					lgrades.append(x['grade'])
				output[0]['subjects'][z]['average'] = round(sum(lgrades)/len(lgrades), 2)
		except Exception as e:
			log.error("Error getting grades for subject %s: %s" % (z, e))
			output[0]['subjects'][z]['grades'] = None
			continue
	dataDict['classes'] = output
	try:
		dataDict['info'] = obj.getInfoForUser(0)
	except Exception as e:
		log.error("Error getting info for %s: %s" % (token, str(e)))
	return dataDict

def check_auth(username, password):
	"""This function is called to check if a username /
	password combination is valid.
	"""
	return username == privUsername and hashPassword(password) == privPassword

def authenticate():
	"""Sends a 401 response that enables basic auth"""
	return make_response(
	'Could not verify your access level for that URL.\n'
	'You have to login with proper credentials', 401,
	{'WWW-Authenticate': 'Basic realm="Login Required"'})

def dev_area(f):
	@wraps(f)
	def decorated(*args, **kwargs):
		if ALLOW_DEV_ACCESS:
			auth = request.authorization
			if not auth or not check_auth(auth.username, auth.password):
				if auth:
					log.warning("Dev access attempt by %s, but wrong auth data" % request.remote_addr)
				return authenticate()
		else:
			log.warning("Dev access attempt by %s, but it is disabled" % request.remote_addr)
			abort(404)
		return f(*args, **kwargs)
	return decorated

def makeHTML(title="eDAP dev", content="None", bare=False):
	if bare == False:
		return '<!DOCTYPE html><html><head><title>%s</title></head><body><h1>%s</h1>%s</body></html>' % (title, title, content)
	elif bare == True:
		return '<!DOCTYPE html><html><head><title>%s</title></head><body>%s</body></html>' % (title, content)


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
	return redirect('https://netrix.io/')

@app.errorhandler(redis.exceptions.ConnectionError)
def exh_RedisDatabaseFailure(e):
	log.critical("DATBASE ACCESS FAILURE!!!!!")
	return make_response(jsonify({'error':'E_DATABASE_CONNECTION_FAILED'}), 500)

@app.route('/dev', methods=["GET"])
@dev_area
def devStartPage():
	return makeHTML(content='<a href="/dev/info">Generic info + counters page</a><br><a href="/dev/threads">Running thread info</a><br><a href="/dev/log">View log</a>')

@app.route('/dev/log', methods=["GET"])
@dev_area
def devGetLog():
	with open(_joinPath(DATA_FOLDER, "edap_api.log"), "r") as f:
		return makeHTML(bare=True, content='<pre>%s</pre>' % f.read())

@app.route('/dev/info', methods=["GET"])
@dev_area
def info():
	return makeHTML(title="eDAP dev info", content="<h2>Tokens</h2>%s<h2>Logins</h2><h3>Successful</h3><p>Full (with data fetch): %i</p><p>Fast (data cached): %i</p><h3>Failed</h3><p>Wrong password: %i</p><p>Generic (bad JSON, library exception etc.): %i</p>" % ('<br>'.join(['%s || <a href="/dev/info/tokendebug/%s">Manage</a>' % (i, i) for i in getTokens()]), logins_full.value, logins_fast.value, logins_fail_wp.value, logins_fail_ge.value))

@app.route('/dev/threads', methods=["GET"])
@dev_area
def threadList():
	return makeHTML(title="eDAP dev thread info", content='<h2>List</h2><pre>%s</pre>' % '\n'.join(threads.keys()))

@app.route('/dev/threads/<string:threadname>', methods=["GET"])
@dev_area
def threadInfo(threadname):
	if threadname not in threads:
		return make_response('Thread does not exist', 404)
	return makeHTML(title="eDAP dev thread info", content='<pre>isAlive: %s</pre>' % threads[threadname].isAlive())

@app.route('/dev/info/tokendebug/<string:token>', methods=["GET"])
@dev_area
def tokenDebug(token):
	data = getData(token)
	html = "<h2>General</h2>"
	html += "<p>Username: %s</p>" % data["user"]
	html += "<p>Last login from: %s</p>"  % data["last_ip"]
	html += "<h2>Device</h2>"
	html += "<p>OS: %s</p>" % data["device"]["platform"]
	html += "<p>Device: %s</p>" % data["device"]["model"]
	html += "<h2>Management</h2>"
	html += "<p><a href=\"/dev/info/tokendebug/%s/revoke\">Remove from DB</a></p>" % token
	return makeHTML(title="eDAP dev token manage", content=html)

@app.route('/dev/info/tokendebug/<string:token>/revoke', methods=["GET"])
@dev_area
def removeToken(token):
	try:
		r.delete('token:' + token)
		return 'Success!'
	except Exception as e:
		return make_response("Error! %s" % e, 500)

@app.route('/api/login', methods=["POST"])
def login():
	if not request.json or not 'username' in request.json or not 'password' in request.json:
		log.error("Bad JSON")
		logins_fail_ge.value += 1
		abort(400)
	devIP = request.remote_addr
	token = hashString(request.json["username"] + ":" + request.json["password"])
	log.info("Logging %s in (platform=%s, device=%s)" % (token, devPlatform, devModel))
	if userInDatabase(token):
		log.info("Processed fast login for token %s" % token)
		r.set('token:' + token, _jsonConvert(dataObj))
		logins_fast.value += 1
		return make_response(jsonify({'token':token}), 200)
	log.info("Slow login start for %s" % token)
	try:
		obj = edap.edap(request.json["username"], request.json["password"])
	except edap.WrongCredentials:
		log.error("Wrong credentials for %s" % token)
		logins_fail_wp.value += 1
		return make_response(jsonify({'error':'E_INVALID_CREDENTIALS'}), 401)
	except edap.FatalLogExit:
		log.error("eDAP failure for %s" % token)
		logins_fail_ge.value += 1
		abort(500)
	log.info("Success for %s, saving to Redis" % token)
	dataObj = {'user':request.json["username"], 'pasw':request.json["password"], 'data':populateData(obj), 'periodic_updates':0, 'last_ip':devIP, 'device':{'platform':None, 'model':None}, 'lang':None, 'resolution':None}
	r.set('token:' + token, _jsonConvert(dataObj))
	logins_full.value += 1
	return make_response(jsonify({'token':token}), 200)

@app.route('/api/user/<string:token>/info', methods=["GET"])
def getInfoUser(token):
	if not userInDatabase(token):
		log.warning("Token %s not in DB" % token)
		abort(401)
	return make_response(jsonify(getData(token)['data']['info']), 200)

@app.route('/api/user/<string:token>/classes', methods=["GET"])
def getClasses(token):
	if not userInDatabase(token):
		log.warning("Token %s not in DB" % token)
		abort(401)
	log.info("Getting classes for %s" % token)
	o = getData(token)['data']
	for i in o['classes']:
		try:
			del i['subjects']
		except:
			pass
	return make_response(jsonify(o), 200)

@app.route('/api/user/<string:token>/classes/<int:class_id>/subjects', methods=["GET"])
def getSubjects(token, class_id):
	if not userInDatabase(token):
		log.warning("Token %s not in DB" % token)
		abort(401)
	elif not classIDExists(token, class_id):
		log.warning("Class ID %s does not exist for token %s" % (class_id, token))
		abort(401)
	log.info("Getting subjects for %s (cID=%s)" % (token, class_id))
	o = getData(token)['data']['classes'][class_id]['subjects']
	return make_response(jsonify({'subjects': o}), 200)

@app.route('/api/user/<string:token>/classes/<int:class_id>/tests', methods=["GET"])
def getTests(token, class_id):
	if not userInDatabase(token):
		log.warning("Token %s not in DB" % token)
		abort(401)
	elif not classIDExists(token, class_id):
		log.warning("Class ID %s does not exist for token %s" % (class_id, token))
		abort(401)
	log.info("Getting tests for %s (cID=%s)" % (token, class_id))
	o = getData(token)['data']['classes'][class_id]['tests']
	return make_response(jsonify({'tests': o}), 200)

@app.route('/api/user/<string:token>/classes/<int:class_id>/subjects/<int:subject_id>', methods=["GET"])
def getSpecSubject(token, class_id, subject_id):
	if not userInDatabase(token):
		log.warning("Token %s not in DB" % token)
		abort(401)
	elif not classIDExists(token, class_id):
		log.warning("Class ID %s does not exist for token %s" % (class_id, token))
		abort(401)
	elif not subjectIDExists(token, class_id, subject_id):
		log.warning("Subject ID %s does not exist for class ID %s for token %s" % (subject_id, class_id, token))
		abort(401)
	log.info("Getting subject info for %s (cID=%s, sID=%s)" % (token, class_id, subject_id))
	o = getData(token)['data']['classes'][class_id]['subjects'][subject_id]
	del o['grades']
	return make_response(jsonify(o), 200)

@app.route('/api/user/<string:token>/classes/<int:class_id>/subjects/<int:subject_id>/grades', methods=["GET"])
def getGrades(token, class_id, subject_id):
	if not userInDatabase(token):
		log.warning("Token %s not in DB" % token)
		abort(401)
	elif not classIDExists(token, class_id):
		log.warning("Class ID %s does not exist for token %s" % (class_id, token))
		abort(401)
	elif not subjectIDExists(token, class_id, subject_id):
		log.warning("Subject ID %s does not exist for class ID %s for token %s" % (subject_id, class_id, token))
		abort(401)
	o = getData(token)['data']['classes'][class_id]['subjects'][subject_id]['grades']
	if o == None:
		log.info("No grades for subject ID %s" % subject_id)
		return make_response(jsonify({'error':'E_NO_GRADES'}), 404)
	lgrades = []
	for i in o:
		lgrades.append(i['grade'])
	avg = round(sum(lgrades)/len(lgrades), 2)
	return make_response(jsonify({'grades': o, 'average': avg}), 200)

@app.route('/api/stats', methods=["POST"])
def logStats():
	if not "token" in request.json or not "platform" in request.json or not "device" in request.json or not "language" in request.json or not "resolution" in request.json:
		log.warning("Invalid JSON from %s" % request.remote_addr)
		abort(400)
	token = request.json["token"]
	if not userInDatabase(token):
		log.warning("Token %s not in DB" % token)
		abort(401)
	log.info("APP LAUNCH: Updating stats for %s" % token)
	dataObj = getData(token)
	dataObj['last_ip'] = request.remote_addr
	dataObj['device']['platform'] = request.json["platform"]
	dataObj['device']['model'] = request.json["device"]
	dataObj['lang'] = request.json["language"]
	dataObj['resolution'] = request.json["resolution"]
	r.set('token:' + token, _jsonConvert(dataObj))
	return make_response(jsonify({"result":"ok"}), 200)

if __name__ == '__main__':
	app.run(debug=True, host="0.0.0.0")
