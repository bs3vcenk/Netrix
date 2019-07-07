from apiBackend import *
import edap
from flask import Flask, jsonify, make_response, request, abort, redirect, escape
from flask_cors import CORS
from time import sleep
from random import randint
from functools import wraps
from time import time as _time

api_version = "2.0-dev"

log = logging.getLogger('EDAP-API')

log.info("eDAP-API v%s starting up..." % api_version)

app = Flask("EDAP-API")
CORS(app)

logins_full = 0
logins_fast = 0
logins_fail_ge = 0
logins_fail_wp = 0

threads = {}


def check_auth(username, password):
	"""
		Check if the specified username and password hash match the set ones.
	"""
	return username == config["privUsername"] and hashPassword(password) == config["privPassword"]

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
		if config["ALLOW_DEV_ACCESS"]:
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
	start = _time()
	html = '<pre>'
	html += '\n'.join(["%s=%s" % (x, config[x]) for x in config])
	html += '</pre>'
	html += timeGenerated(start)
	return makeHTML(title="eDAP dev variables", content=html)

@app.route('/dev/dbinfo', methods=["GET"])
@dev_area
def devDBInfo():
	"""
		DEV: Database info page, currently only showing the size of the DB.
	"""
	start = _time()
	html = '<p>DB Size: %s</p>' % convertSize(getDBSize())
	html += timeGenerated(start)
	return makeHTML(title="eDAP dev DB info", content=html)

@app.route('/dev/log', methods=["GET"])
@dev_area
def devGetLog():
	"""
		DEV: Simple page to print the log file.
	"""
	return makeHTML(bare=True, content='<pre>%s</pre>' % escape(readLog()))

@app.route('/dev/info', methods=["GET"])
@dev_area
def devInfo():
	"""
		DEV: Statistics page, also lists tokens (shown as usernames) and provides
		a link to manage each one.
	"""
	start = _time()
	html = "<h2>Users</h2>"
	html += '<br>'.join(['%s || <a href="/dev/info/tokendebug/%s">Manage</a>' % (getData(i)["user"], i) for i in getTokens()])
	html += "<h2>Logins</h2>"
	html += "<h3>Successful</h3>"
	html += "<p>Full (with data fetch): %i</p>" % logins_full
	html += "<p>Fast (data cached): %i</p>" % logins_fast
	html += "<h3>Failed</h3>"
	html += "<p>Wrong password: %i</p>" % logins_fail_wp
	html += "<p>Generic (bad JSON, library exception etc.): %i</p>" % logins_fail_ge
	html += timeGenerated(start)
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
	start = _time()
	data = getData(token)
	html = "<h2>General</h2>"
	html += "<p>Username: %s</p>" % data["user"]
	if config["USE_CLOUDFLARE"]:
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
	html += timeGenerated(start)
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
		logins_fail_ge += 1
		abort(400)
	global logins_fast
	global logins_fail_ge
	global logins_fail_wp
	global logins_full
	devIP = request.remote_addr
	username = request.json["username"]
	password = request.json["password"]
	if "@skole.hr" in username:
		username = username.replace("@skole.hr", "")
	token = hashString(username + ":" + password)
	if userInDatabase(token):
		log.info("FAST => %s" % username)
		logins_fast += 1
		return make_response(jsonify({'token':token}), 200)
	log.info("SLOW => %s" % username)
	try:
		obj = edap.edap(username, password)
	except edap.WrongCredentials:
		log.error("SLOW => WRONG CREDS => %s" % username)
		logins_fail_wp += 1
		return make_response(jsonify({'error':'E_INVALID_CREDENTIALS'}), 401)
	except edap.FatalLogExit as e:
		log.error("SLOW => eDAP FAIL => %s => %s" % (username, str(e)))
		logins_fail_ge += 1
		abort(500)
	log.info("Success for %s, saving to Redis (%s)" % (username, token))
	dataObj = {
		'user': username,
		'pasw': password,
		'data': populateData(obj),
		'last_ip': devIP,
		'device': {
			'platform': None,
			'model': None
		},
		'lang': None,
		'resolution': None,
		'generated_with': api_version
	}
	if config["USE_CLOUDFLARE"]:
		dataObj["cloudflare"] = {}
		dataObj["cloudflare"]["last_ip"] = None
		dataObj["cloudflare"]["country"] = None
	saveData(token, dataObj)
	logins_full += 1
	return make_response(jsonify({'token':token}), 200)

@app.route('/api/user/<string:token>/info', methods=["GET"])
def getInfoUser(token):
	"""
		Get the user's personal information.
	"""
	if not verifyRequest(token):
		abort(401)
	log.info(token)
	return make_response(jsonify(getData(token)['data']['info']), 200)

@app.route('/api/user/<string:token>/new', methods=["GET"])
def getNewGrades(token):
	"""
		Get the user's new grades/tests.
	"""

@app.route('/api/user/<string:token>/classes', methods=["GET"])
def getClasses(token):
	"""
		Get the user's classes. Currently unused by the frontend, as
		we currently fetch data for the newest/most recent class only.
	"""
	if not verifyRequest(token):
		abort(401)
	log.info(token)
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
	log.info("%s => Class %s" % (token, class_id))
	o = getData(token)['data']['classes'][class_id]['subjects']
	return make_response(jsonify({'subjects': o}), 200)

@app.route('/api/user/<string:token>/classes/<int:class_id>/tests', methods=["GET"])
def getTests(token, class_id):
	"""
		Get the tests for a given class ID.
	"""
	if not verifyRequest(token, class_id):
		abort(401)
	log.info("%s => Class %s" % (token, class_id))
	o = getData(token)['data']['classes'][class_id]['tests']
	return make_response(jsonify({'tests': o}), 200)

@app.route('/api/user/<string:token>/classes/<int:class_id>/subjects/<int:subject_id>', methods=["GET"])
def getSubject(token, class_id, subject_id):
	"""
		Get subject info for a given subject ID.
	"""
	if not verifyRequest(token, class_id, subject_id):
		abort(401)
	log.info("%s => Class %s => Subject %s" % (token, class_id, subject_id))
	o = getData(token)['data']['classes'][class_id]['subjects'][subject_id]
	return make_response(jsonify(o), 200)

@app.route('/api/user/<string:token>/classes/<int:class_id>/subjects/<int:subject_id>/grades', methods=["GET"])
def getGrades(token, class_id, subject_id):
	"""
		Get the grades for a given subject ID (TODO: Unify into getSubject(),
		calculate grade in populateData()).
	"""
	log.warning("DEPRECATION :: Deprecated endpoint getGrades() used")
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
	log.warning("DEPRECATION :: Deprecated endpoint getNotes() used")
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
	log.info("STATS => %s => %s, %s, %s, %s" % (token, request.json["platform"], request.json["device"], request.json["language"], request.json["resolution"]))
	dataObj = getData(token)
	dataObj['last_ip'] = request.remote_addr
	dataObj['device']['platform'] = request.json["platform"]
	dataObj['device']['model'] = request.json["device"]
	dataObj['lang'] = request.json["language"]
	dataObj['resolution'] = request.json["resolution"]
	if config["USE_CLOUDFLARE"]:
		dataObj['cloudflare']['country'] = request.headers["CF-IPCountry"]
		dataObj['cloudflare']['last_ip'] = request.headers["CF-Connecting-IP"]
	saveData(token, dataObj)
	return make_response(jsonify({"result":"ok"}), 200)

if __name__ == '__main__':
	app.run()
