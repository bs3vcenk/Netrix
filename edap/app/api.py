import edap, platform, threading, redis, logging
from pyfcm import FCMNotification
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
from os.path import getsize as _getFileSize
from os.path import exists as _fileExists
from math import floor as _mFloor
from math import log as _mLog
from math import pow as _mPow
from multiprocessing import Value
from sys import exit as _exit
from google.cloud import firestore

api_version = "2.0-dev"

def getVar(varname, _bool=False, default=None):
	"""
		Get environment variable and return it if it exists. If _bool is True,
		return it as a boolean value. If default is set, return its value if
		the given variable does not exist.
	"""
	if _bool:
		default = default if default != None else False
	try:
		return environ[varname] if not _bool else environ[varname] == "Y"
	except:
		print("ERROR => %s => Variable not present" % varname)
		return default

DATA_FOLDER = getVar("DATA_FOLDER", default="/data")
GOOGLE_TOKEN_FILE = getVar("GOOGLE_TOKEN_FILE", default="google_creds.json")

def initGoogleToken(fpath=_joinPath(DATA_FOLDER, GOOGLE_TOKEN_FILE)):
	if not _fileExists(fpath):
		print("ERROR => File %s given to initGoogleToken() does not exist!" % fpath)
		_exit(1)
	environ["GOOGLE_APPLICATION_CREDENTIALS"] = fpath

log = logging.getLogger('EDAP-API')
log.setLevel(logging.DEBUG)
ch = logging.FileHandler(_joinPath(DATA_FOLDER, "edap_api.log"))
ch.setLevel(logging.DEBUG)
ch.setFormatter(logging.Formatter('%(asctime)s || %(funcName)-16s || %(levelname)-8s || %(message)s'))
log.addHandler(ch)

ALLOW_DEV_ACCESS = getVar("DEV_ACCESS", _bool=True)
USE_CLOUDFLARE = getVar("CLOUDFLARE", _bool=True)
USE_FIREBASE = getVar("FIREBASE", _bool=True)

if ALLOW_DEV_ACCESS:
	privUsername = getVar("DEV_USER")
	privPassword = getVar("DEV_PASW")
	if not privUsername or not privPassword:
		log.warning("[configuration] Dev access has been disabled, either no user or pass specified")
		privUsername = privPassword = None
		ALLOW_DEV_ACCESS = False

if USE_FIREBASE:
	FIREBASE_TOKEN = getVar("FIREBASE_TOKEN")
	initGoogleToken()
	if not FIREBASE_TOKEN:
		log.warning("[configuration] Firebase has been disabled, no token specified")
		USE_FIREBASE = False
	else:
		log.info("[configuration] Initializing Firebase Cloud Messaging...")
		fbPushService = FCMNotification(api_key=FIREBASE_TOKEN)
		log.info("[configuration] Initializing Firestore...")
		fbFirestoreDB = firestore.Client()

log.info("eDAP-API v%s starting up..." % api_version)

app = Flask("EDAP-API")
CORS(app)

r = redis.Redis(host='localhost', port=6379, db=0)

def getData(token):
	"""
		Retreive JSON from Redis by token, format it from bytes to string,
		and return it as a dict.
	"""
	return _jsonLoad(r.get("token:" + token).decode("utf-8"))

def getTokens():
	"""
		Return a list of all tokens in the DB.
	"""
	return [i.decode('utf-8').replace("token:", "") for i in r.keys('token:*')]

def getLogins(logintype):
	"""
		UNUSED: Get various login counters for stats, doesn't work properly
		right now.
	"""
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
	"""
		Check if a given token exists in the DB.
	"""
	return "token:" + token in [i.decode('utf-8') for i in r.keys('token:*')]

def classIDExists(token, cid):
	"""
		Check if a given class ID exists in the DB. Assumes that userInDatabase()
		was already called and returned True.
	"""
	return cid in range(len(getData(token)['data']))

def subjectIDExists(token, cid, sid):
	"""
		Check if a given subject ID exists in the DB. Assumes that userInDatabase()
		and classIDExists() were both already called and returned True.
	"""
	return sid in range(len(getData(token)['data']['classes'][cid]['subjects']))

class PeriodicAnalyticsSave(threading.Thread):
	"""
		UNUSED: Periodically save login counters, doesn't work properly right now.
	"""
	def run(self):
		while True:
			r.set("logincounter:full", logins_full.value)
			r.set("logincounter:fast", logins_fast.value)
			r.set("logincounter:fail:generic", logins_fail_ge.value)
			r.set("logincounter:fail:password", logins_fail_wp.value)
			sleep(5)

logins_full = getLogins("full")
logins_fast = getLogins("fast")
logins_fail_ge = getLogins("fail:generic")
logins_fail_wp = getLogins("fail:password")

threads = {}

#threads["analytics"] = PeriodicAnalyticsSave()
#threads["analytics"].start()

def hashString(inp):
	"""
		Return the MD5 hash of a string. Used for tokens.
	"""
	return _MD5HASH(inp.encode()).hexdigest()

def hashPassword(inp):
	"""
		Return the SHA256 hash of a string. Used for the /dev/ password.
	"""
	return _SHA256HASH(inp.encode()).hexdigest()

def populateData(obj=None, username=None, password=None):
	"""
		Fill in the 'data' part of the user dict. This will contain subjects, grades, etc.

		First, get the class list (this also fills the class ID list for eDAP).

		Second, get the list of tests for the first class, both current and full, and
		compare them, assigning a "current" flag to each which will say if the test
		has already been written or not.

		Third, get the subjects for a class, and get the grades for each one. If there
		is a concluded grade available, use it as the average, otherwise calculate an average.
		Get the list of "additional notes" for each subject.

		Fourth, write this data into the "classes" key in the dict.

		Fifth, get the user's personal info and write it into the "info" key in the dict.

		Finally, return all the collected data.
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
			if len(output[0]['subjects'][z]['grades']) == 0:
				output[0]['subjects'][z]['grades'] = None
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
		try:
			output[0]['subjects'][z]['notes'] = obj.getNotesForSubject(0, z)
			if len(output[0]['subjects'][z]['notes']) == 0:
				output[0]['subjects'][z]['notes'] = None
		except Exception as e:
			log.error("Error getting notes for subject %s: %s" % (z, e))
			output[0]['subjects'][z]['notes'] = None
			continue
	dataDict['classes'] = output
	try:
		dataDict['info'] = obj.getInfoForUser(0)
	except Exception as e:
		log.error("Error getting info for %s: %s" % (token, str(e)))
	return dataDict

def check_auth(username, password):
	"""
		Check if the specified username and password hash match the set ones.
	"""
	return username == privUsername and hashPassword(password) == privPassword

def authenticate():
	"""
		Sends a 401 request in case of a failed auth attempt or first time
		accessing the /dev/ dashboard.
	"""
	return make_response(
	'Could not verify your access level for that URL.\n'
	'You have to login with proper credentials', 401,
	{'WWW-Authenticate': 'Basic realm="Login Required"'})

def dev_area(f):
	"""
		Decorator that marks a function as belonging to the /dev/ dashboard,
		protecting it with a username and password (if enabled).
	"""
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
	"""
		HTML creator template for the /dev/ dashboard. Allows specifying the title,
		content, and if the page needs to have no header (e.g. the /dev/log page).
	"""
	if bare == False:
		return '<!DOCTYPE html><html><head><title>%s</title></head><body><h1>%s</h1>%s</body></html>' % (title, title, content)
	elif bare == True:
		return '<!DOCTYPE html><html><head><title>%s</title></head><body>%s</body></html>' % (title, content)

def sendNotification(token, title, content):
	"""
		Send a notification to a user's device through Firebase.
	"""
	if not verifyRequest(token):
		raise Exception("Bad token")
	documentReference = fbFirestoreDB.collection('devices').document(token)

	try:
		doc = documentReference.get()
		firebaseToken = doc.to_dict()["token"]
	except google.cloud.exceptions.NotFound as e:
		log.error('No such document!')
		raise e
	except Exception as e:
		log.error('Unknown error (Firestore) => %s' % str(e))
		raise e

	try:
		fbPushService.notify_single_device(registration_id=firebaseToken, message_title=title, message_body=content)
	except Exception as e:
		log.error('Unknown error (Firebase Cloud Messaging) => %s' % str(e))
		raise e

def verifyRequest(token, class_id=None, subject_id=None):
	"""
		Verify if a given token, class_id, and/or subject_id exist in the DB.
	"""
	if not userInDatabase(token):
		log.warning("Token %s not in DB" % token)
		return False
	if class_id:
		if not classIDExists(token, class_id):
			log.warning("Class ID %s does not exist for token %s" % (class_id, token))
			return False
	if subject_id:
		if not subjectIDExists(token, class_id, subject_id):
			log.warning("Subject ID %s does not exist for class ID %s for token %s" % (subject_id, class_id, token))
			return False
	return True

# https://stackoverflow.com/a/14822210
def convertSize(size_bytes):
	"""
		Convert bytes to a human-readable format.
	"""
	if size_bytes == 0:
		return "0B"
	size_name = ("B", "KB", "MB", "GB", "TB", "PB", "EB", "ZB", "YB")
	i = int(_mFloor(_mLog(size_bytes, 1024)))
	p = _mPow(1024, i)
	s = round(size_bytes / p, 2)
	return "%s %s" % (s, size_name[i])

@app.errorhandler(404)
def e404(err):
	"""
		Default handler in case a nonexistent API endpoint is accessed.
	"""
	return make_response(jsonify({'error':'E_UNKNOWN_ENDPOINT'}), 404)

@app.errorhandler(401)
def e401(err):
	"""
		Default handler in case a given token does not exist in the DB.
		This error is also returned if a given class ID or subject ID don't
		exist in the DB.
	"""
	return make_response(jsonify({'error':'E_TOKEN_NONEXISTENT'}), 401)

@app.errorhandler(400)
def e400(err):
	"""
		Default handler in case the user sends an invalid JSON (bad format,
		missing keys/values, etc.)
	"""
	return make_response(jsonify({'error':'E_INVALID_DATA'}), 400)

@app.errorhandler(405)
def e405(err):
	"""
		Default handler in case the request method with which the endpoint
		is called isn't in the specified methods list in the decorator.
	"""
	return make_response(jsonify({'error':'E_INVALID_METHOD'}), 405)

@app.errorhandler(500)
def e500(err):
	"""
		Default handler in case something generic goes wrong on the server
		side.
	"""
	return make_response(jsonify({'error':'E_SERVER_ERROR'}), 500)

@app.route('/', methods=["GET"])
def index():
	"""
		Default page, redirects to the Netrix page.
	"""
	return redirect('https://netrix.io/')

@app.errorhandler(redis.exceptions.ConnectionError)
def exh_RedisDatabaseFailure(e):
	"""
		Default handler in case the Redis DB fails.
	"""
	log.critical("DATBASE ACCESS FAILURE!!!!!")
	return make_response(jsonify({'error':'E_DATABASE_CONNECTION_FAILED'}), 500)

@app.route('/dev', methods=["GET"])
@dev_area
def devStartPage():
	"""
		DEV: Main dev page listing all available functions
	"""
	html = '<a href="/dev/info">Generic info + counters page</a><br>'
	html += '<a href="/dev/threads">Running thread info</a><br>'
	html += '<a href="/dev/log">View log</a><br>'
	html += '<a href="/dev/dbinfo">Database info</a><br>'
	html += '<a href="/dev/vars">Config/env variables</a>'
	return makeHTML(content=html)

@app.route('/dev/vars', methods=["GET"])
@dev_area
def devShowVars():
	html = '<pre>'
	html += '\n'.join(["%s=%s" % (x, environ[x]) for x in environ])
	html += '</pre>'
	return makeHTML(bare=True, title="eDAP dev variables", content=html)

@app.route('/dev/dbinfo', methods=["GET"])
@dev_area
def devDBInfo():
	"""
		DEV: Database info page, currently only showing the size of the DB.
	"""
	html = '<p>DB Size: %s</p>' % convertSize(_getFileSize(_joinPath(DATA_FOLDER, "appendonly.aof")))
	return makeHTML(title="eDAP dev DB info", content=html)

@app.route('/dev/log', methods=["GET"])
@dev_area
def devGetLog():
	"""
		DEV: Simple page to print the log file.
	"""
	with open(_joinPath(DATA_FOLDER, "edap_api.log"), "r") as f:
		return makeHTML(bare=True, content='<pre>%s</pre>' % f.read())

@app.route('/dev/info', methods=["GET"])
@dev_area
def devInfo():
	"""
		DEV: Statistics page, also lists tokens (shown as usernames) and provides
		a link to manage each one.
	"""
	html = "<h2>Tokens</h2>"
	html += '<br>'.join(['%s || <a href="/dev/info/tokendebug/%s">Manage</a>' % (getData(i)["user"], i) for i in getTokens()])
	html += "<h2>Logins</h2>"
	html += "<h3>Successful</h3>"
	html += "<p>Full (with data fetch): %i</p>" % logins_full.value
	html += "<p>Fast (data cached): %i</p>" % logins_fast.value
	html += "<h3>Failed</h3>"
	html += "<p>Wrong password: %i</p>" % logins_fail_wp.value
	html += "<p>Generic (bad JSON, library exception etc.): %i</p>" % logins_fail_ge.value
	return makeHTML(title="eDAP dev info", content=html)

@app.route('/dev/threads', methods=["GET"])
@dev_area
def devThreadList():
	"""
		DEV: List running background threads.
	"""
	return makeHTML(title="eDAP dev thread info", content='<h2>List</h2><pre>%s</pre>' % '\n'.join(threads.keys()))

@app.route('/dev/threads/<string:threadname>', methods=["GET"])
@dev_area
def devThreadInfo(threadname):
	"""
		DEV: Show if a thread is still running.
	"""
	if threadname not in threads:
		return make_response('Thread does not exist', 404)
	return makeHTML(title="eDAP dev thread info", content='<pre>isAlive: %s</pre>' % threads[threadname].isAlive())

@app.route('/dev/info/tokendebug/<string:token>', methods=["GET"])
@dev_area
def devTokenDebug(token):
	"""
		DEV: Management page for a given token. Shows things such as the
		username, IP, country (if using Cloudflare), OS, device model,
		language, WebView resoultion. Also has an option to delete the
		token from the DB (e.g. if the dataset needs to be recreated
		because of a new feature).
	"""
	data = getData(token)
	html = "<h2>General</h2>"
	html += "<p>Username: %s</p>" % data["user"]
	if USE_CLOUDFLARE:
		html += "<p>Originating IP: %s</p>" % data["cloudflare"]["last_ip"]
		html += "<p>Country: %s</p>" % data["cloudflare"]["country"]
	else:
		html += "<p>Last login from: %s</p>"  % data["last_ip"]
	html += "<h2>Device</h2>"
	html += "<p>OS: %s</p>" % data["device"]["platform"]
	html += "<p>Device: %s</p>" % data["device"]["model"]
	html += "<p>Language: %s</p>" % data["lang"]
	html += "<p>Resolution: %s</p>" % data["resolution"]
	html += "<h2>Management</h2>"
	html += "<p><a href=\"/dev/info/tokendebug/%s/revoke\">Remove from DB</a></p>" % token
	return makeHTML(title="eDAP dev token manage", content=html)

@app.route('/dev/info/tokendebug/<string:token>/revoke', methods=["GET"])
@dev_area
def devRemoveToken(token):
	"""
		DEV: Remove the data for a token for a DB.
	"""
	try:
		r.delete('token:' + token)
		return 'Success!'
	except Exception as e:
		return make_response("Error! %s" % e, 500)

@app.route('/dev/info/tokendebug/<string:token>/notification', methods=["POST"])
@dev_area
def devSendNotification(token):
	"""
		DEV: Send a notification through Firebase to the device belonging
		to a given token.
	"""
	if not request.json or not 'title' in request.json or not 'content' in request.json:
		log.error("Bad JSON")
		abort(400)
	if not verifyRequest(token):
		abort(401)
	try:
		sendNotification(token, request.json['title'], request.json['content'])
	except Exception as e:
		return make_response(jsonify({'error':str(e)}), 500)
	return make_response(jsonify({'status':'SENT'}), 200)

@app.route('/api/login', methods=["POST"])
def login():
	"""
		Log the user in. The JSON in the POST request is checked, and if
		correct, the user can proceed to two types of logins: FAST or SLOW.

		A "SLOW" login includes a full fetch of all of the user's data on
		the e-Dnevnik server, which may take a while. The data is saved
		into a template dictionary containing the user's data, which is
		then sent to Redis.

		A "FAST" login is done only if the user's token is already found
		in the DB, meaning no full fetch is needed, and the user's token
		is instantly returned.
	"""
	if not request.json or not 'username' in request.json or not 'password' in request.json:
		log.error("Bad JSON")
		logins_fail_ge.value += 1
		abort(400)
	devIP = request.remote_addr
	username = request.json["username"]
	password = request.json["password"]
	if "@skole.hr" in username:
		username = username.replace("@skole.hr", "")
	token = hashString(username + ":" + password)
	if userInDatabase(token):
		log.info("FAST => %s" % username)
		logins_fast.value += 1
		return make_response(jsonify({'token':token}), 200)
	log.info("SLOW => %s" % username)
	try:
		obj = edap.edap(username, password)
	except edap.WrongCredentials:
		log.error("SLOW => WRONG CREDS => %s" % username)
		logins_fail_wp.value += 1
		return make_response(jsonify({'error':'E_INVALID_CREDENTIALS'}), 401)
	except edap.FatalLogExit as e:
		log.error("SLOW => eDAP FAIL => %s => %s" % (username, str(e)))
		logins_fail_ge.value += 1
		abort(500)
	log.info("Success for %s, saving to Redis (%s)" % (username, token))
	dataObj = {'user':username, 'pasw':password, 'data':populateData(obj), 'last_ip':devIP, 'device':{'platform':None, 'model':None}, 'lang':None, 'resolution':None, 'generated_with':api_version}
	if USE_CLOUDFLARE:
		dataObj["cloudflare"] = {}
		dataObj["cloudflare"]["last_ip"] = None
		dataObj["cloudflare"]["country"] = None
	r.set('token:' + token, _jsonConvert(dataObj))
	logins_full.value += 1
	return make_response(jsonify({'token':token}), 200)

@app.route('/api/user/<string:token>/info', methods=["GET"])
def getInfoUser(token):
	"""
		Get the user's personal information.
	"""
	if not verifyRequest(token):
		abort(401)
	username = getData(token)["user"]
	log.info(username)
	return make_response(jsonify(getData(token)['data']['info']), 200)

@app.route('/api/user/<string:token>/classes', methods=["GET"])
def getClasses(token):
	"""
		Get the user's classes. Currently unused by the frontend, as
		we currently fetch data for the newest/most recent class only.
	"""
	if not verifyRequest(token):
		abort(401)
	username = getData(token)["user"]
	log.info(username)
	o = getData(token)['data']
	for i in o['classes']:
		try:
			del i['subjects']
		except:
			pass
	return make_response(jsonify(o), 200)

@app.route('/api/user/<string:token>/classes/<int:class_id>/subjects', methods=["GET"])
def getSubjects(token, class_id):
	"""
		Get the subjects for a given class ID.
	"""
	if not verifyRequest(token, class_id):
		abort(401)
	username = getData(token)["user"]
	log.info("%s => Class %s" % (username, class_id))
	o = getData(token)['data']['classes'][class_id]['subjects']
	return make_response(jsonify({'subjects': o}), 200)

@app.route('/api/user/<string:token>/classes/<int:class_id>/tests', methods=["GET"])
def getTests(token, class_id):
	"""
		Get the tests for a given class ID.
	"""
	if not verifyRequest(token, class_id):
		abort(401)
	username = getData(token)["user"]
	log.info("%s => Class %s" % (username, class_id))
	o = getData(token)['data']['classes'][class_id]['tests']
	return make_response(jsonify({'tests': o}), 200)

@app.route('/api/user/<string:token>/classes/<int:class_id>/subjects/<int:subject_id>', methods=["GET"])
def getSubject(token, class_id, subject_id):
	"""
		Get subject info for a given subject ID.
	"""
	if not verifyRequest(token, class_id, subject_id):
		abort(401)
	username = getData(token)["user"]
	log.info("%s => Class %s => Subject %s" % (username, class_id, subject_id))
	o = getData(token)['data']['classes'][class_id]['subjects'][subject_id]
	del o['grades']
	return make_response(jsonify(o), 200)

@app.route('/api/user/<string:token>/classes/<int:class_id>/subjects/<int:subject_id>/grades', methods=["GET"])
def getGrades(token, class_id, subject_id):
	"""
		Get the grades for a given subject ID (TODO: Unify into getSubject(),
		calculate grade in populateData()).
	"""
	if not verifyRequest(token, class_id, subject_id):
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

@app.route('/api/user/<string:token>/classes/<int:class_id>/subjects/<int:subject_id>/notes', methods=["GET"])
def getNotes(token, class_id, subject_id):
	"""
		Get only the "additional notes" for a given subject ID.
	"""
	if not verifyRequest(token, class_id, subject_id):
		abort(401)
	o = getData(token)['data']['classes'][class_id]['subjects'][subject_id]['notes']
	if o == None:
		log.info("No notes for subject ID %s" % subject_id)
		return make_response(jsonify({'error':'E_NO_NOTES'}), 404)
	return make_response(jsonify({'notes':o}), 200)

@app.route('/api/stats', methods=["POST"])
def logStats():
	"""
		Save the stats to a user's profile.
	"""
	if not "token" in request.json or not "platform" in request.json or not "device" in request.json or not "language" in request.json or not "resolution" in request.json:
		log.warning("Invalid JSON from %s" % request.remote_addr)
		abort(400)
	token = request.json["token"]
	if not verifyRequest(token):
		abort(401)
	username = getData(token)["user"]
	log.info("STATS => %s => %s, %s, %s, %s" % (username, request.json["platform"], request.json["device"], request.json["language"], request.json["resolution"]))
	dataObj = getData(token)
	dataObj['last_ip'] = request.remote_addr
	dataObj['device']['platform'] = request.json["platform"]
	dataObj['device']['model'] = request.json["device"]
	dataObj['lang'] = request.json["language"]
	dataObj['resolution'] = request.json["resolution"]
	if USE_CLOUDFLARE:
		dataObj['cloudflare']['country'] = request.headers["CF-IPCountry"]
		dataObj['cloudflare']['last_ip'] = request.headers["CF-Connecting-IP"]
	r.set('token:' + token, _jsonConvert(dataObj))
	return make_response(jsonify({"result":"ok"}), 200)

if __name__ == '__main__':
	app.run()
