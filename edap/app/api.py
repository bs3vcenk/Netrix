from apiBackend import *
import edap
from flask import Flask, jsonify, make_response, request, abort, redirect, escape
from flask_cors import CORS
from time import sleep
from random import randint
from functools import wraps
from time import time as _time

api_version = "2.4-dev"

log = logging.getLogger('EDAP-API')

log.info("eDAP-API v%s starting up..." % api_version)

app = Flask("EDAP-API")
CORS(app)

restoreSyncs()

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
		if config["USE_CLOUDFLARE"]:
			ip = request.headers["CF-Connecting-IP"]
			country = request.headers["CF-IPCountry"]
		else:
			ip = request.remote_addr
			country = "Unknown"
		if config["ALLOW_DEV_ACCESS"]:
			auth = request.authorization
			if not auth or not check_auth(auth.username, auth.password):
				if auth:
					log.warning("FAIL => %s (%s) => Bad auth" % (ip, country))
				return authenticate()
		else:
			log.warning("FAIL => %s (%s) => DEV endpoints disabled" % (ip, country))
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
	log.critical(" ==> DATBASE ACCESS FAILURE!!!!! <==")
	return make_response(jsonify({'error':'E_DATABASE_CONNECTION_FAILED'}), 500)

@app.route('/dev', methods=["GET"])
@dev_area
def devStartPage():
	"""
		DEV: Main dev page listing all available functions
	"""
	html = '<a href="/dev/info">Generic info + counters page</a><br>'
	html += '<a href="/dev/threads">Sync thread info</a><br>'
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
	html += "<p>Full/slow (with data fetch): %i</p>" % getCounter("logins:success:slow")
	html += "<p>Fast (data cached): %i</p>" % getCounter("logins:success:fast")
	html += "<h3>Failed</h3>"
	html += "<p>Wrong password: %i</p>" % getCounter("logins:fail:credentials")
	html += "<p>Generic (bad JSON, library exception etc.): %i</p>" % getCounter("logins:fail:generic")
	html += "<h3>Options</h3>"
	html += "<p><a href=\"/dev/info/recreate\">Recreate data for all tokens</a> [WARNING: Clicking will proceed with operation!]</p>"
	html += "<p><a href=\"/dev/info/testuser\">Add test user</a></p>"
	html += timeGenerated(start)
	return makeHTML(title="eDAP dev info", content=html)

@app.route('/dev/threads', methods=["GET"])
@dev_area
def devThreadList():
	"""
		DEV: List running background threads.
	"""
	return makeHTML(title="eDAP dev thread info", content='<h2>List</h2><pre>%s</pre>' % '\n'.join(getSyncThreads()))

@app.route('/dev/threads/<string:token>', methods=["GET"])
@dev_area
def devThreadInfo(token):
	"""
		DEV: Show if a thread is still running.
	"""
	if not verifyRequest(token):
		return make_response('Token does not exist', 404)
	return makeHTML(title="eDAP dev thread info", content='<pre>isAlive: %s</pre>' % isThreadAlive(token))

@app.route('/dev/info/testuser', methods=["GET"])
@dev_area
def devAddTestUser():
	"""
		DEV: Add a test user
	"""
	testUser, testPasw, testToken = generateTestUser()
	html = "<p>Username: <code>%s</code></p>" % testUser
	html += "<p>Password: <code>%s</code></p>" % testPasw
	html += "<p>Token: <code>%s</code></p>" % testToken
	return makeHTML(title="Test user creation", content=html)

@app.route('/dev/info/recreate', methods=["GET"])
@dev_area
def devReloadInfo():
	"""
		DEV: Re-fetches the 'data' key for all tokens in the database.
	"""
	tokens = getTokens()
	failed = []
	log.info("DEV OPERATION => RECREATING DATA OBJECTS FOR %i TOKENS" % len(tokens))
	for token in tokens:
		try:
			o = getData(token)
			userObj = edap.edap(o['user'], o['pasw'])
			o['data'] = populateData(userObj)
			o['generated_with'] = api_version
			saveData(token, o)
		except Exception as e:
			failed.append({'token':token, 'reason':e})
			log.error('DEV OPERATION => Update FAILED for token %s, reason %s' % (token, e))
			continue
	html = "<p>Success for %i/%i tokens<p>" % (len(tokens) - len(failed), len(tokens))
	if len(failed) > 0:
		html += "<h2>Fails</h2>"
		for fail in failed:
			html += "<h3>%s<h3>" % fail['token']
			html += str(fail['reason'])
	return makeHTML(title="Token resync", content=html)

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
		html += "<p>Last originating IP: %s</p>" % data["cloudflare"]["last_ip"]
		html += "<p>Last country: %s</p>" % data["cloudflare"]["country"]
	else:
		html += "<p>Last originating IP: %s</p>"  % data["last_ip"]
	html += "<h2>Device</h2>"
	html += "<p>OS: %s</p>" % data["device"]["platform"]
	html += "<p>Device: %s</p>" % data["device"]["model"]
	html += "<p>Language: %s</p>" % data["lang"]
	html += "<p>Resolution: %s</p>" % data["resolution"]
	html += "<h2>Management</h2>"
	html += "<p><a href=\"/dev/info/tokendebug/%s/revoke\">Remove from DB</a></p>" % token
	html += "<p><a href=\"/dev/info/tokendebug/%s/diff\">Update local data</a></p>" % token
	html += timeGenerated(start)
	return makeHTML(title="eDAP dev token manage", content=html)

@app.route('/dev/info/tokendebug/<string:token>/diff', methods=["GET"])
@dev_area
def devDiffToken(token):
	"""
		DEV: Use profileDifference() to show upstream profile changes.
	"""
	return make_response(jsonify(sync(token)), 200)

@app.route('/dev/info/tokendebug/<string:token>/testdiff', methods=["POST"])
@dev_area
def devTestDiff(token):
	if not request.json or not "subjId" in request.json or not "gradeData" in request.json:
		log.error("Bad JSON")
		abort(400)
	elif not "grade" in request.json["gradeData"] or not "note" in request.json["gradeData"]:
		log.error("Bad grade spec in JSON")
		abort(400)
	elif not verifyRequest(token):
		abort(401)
	o = getData(token)["data"]
	o['classes'][0]['subjects'][request.json["subjId"]]['grades'].append(request.json["gradeData"])
	syncDev(o, token)
	return make_response(jsonify({'status':'ok'}), 200)

@app.route('/dev/info/tokendebug/<string:token>/revoke', methods=["GET"])
@dev_area
def devRemoveToken(token):
	"""
		DEV: Remove the data for a token for a DB.
	"""
	try:
		purgeToken(token)
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
	if 'data' in request.json:
		data = request.json['data']
	else:
		data = None
	try:
		sendNotification(token, request.json['title'], request.json['content'], data=data)
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
		updateCounter("logins:fail:generic")
		abort(400)
	elif request.json["username"] == None or request.json["password"] == None or len(request.json["username"]) < 4 or len(request.json["password"]) < 4:
		log.error("Bad auth data")
		updateCounter("logins:fail:generic")
		return make_response(jsonify({'error':'E_INVALID_CREDENTIALS'}), 401)
	devIP = request.remote_addr
	username = request.json["username"]
	password = request.json["password"]
	if "@skole.hr" in username:
		username = username.replace("@skole.hr", "")
	token = hashString(username + ":" + password)
	if userInDatabase(token):
		log.info("FAST => %s" % username)
		updateCounter("logins:success:fast")
		return make_response(jsonify({'token':token}), 200)
	log.info("SLOW => %s" % username)
	try:
		obj = edap.edap(username, password)
	except edap.WrongCredentials:
		log.error("SLOW => WRONG CREDS => %s" % username)
		updateCounter("logins:fail:credentials")
		return make_response(jsonify({'error':'E_INVALID_CREDENTIALS'}), 401)
	except edap.FatalLogExit as e:
		log.error("SLOW => eDAP FAIL => %s => %s" % (username, str(e)))
		updateCounter("logins:fail:generic")
		abort(500)
	except Exception as e:
		log.error("SLOW => UNHANDLED EXCEPTION => %s => %s" % (username, str(e)))
		updateCounter("logins:fail:generic")
		abort(500)
	log.info("SLOW => SUCCESS => %s (%s)" % (username, token))
	dataObj = {
		'user': username,
		'pasw': password,
		'data': populateData(obj, time=True),
		'last_ip': devIP,
		'device': {
			'platform': None,
			'model': None
		},
		'lang': None,
		'resolution': None,
		'new': None,
		'generated_with': api_version,
		'settings': {
			'notif': {
				'disable': False,
				'ignore': []
			}
		},
		'messages': []
	}
	if config["USE_CLOUDFLARE"]:
		dataObj["cloudflare"] = {}
		dataObj["cloudflare"]["last_ip"] = None
		dataObj["cloudflare"]["country"] = None
	saveData(token, dataObj)
	log.debug("SLOW => Starting sync for %s" % username)
	startSync(token)
	updateCounter("logins:success:slow")
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

@app.route('/api/user/<string:token>/settings/<string:action>', methods=["POST", "GET"])
def setting(token, action):
	"""
		Set a user's setting.
	"""
	if not verifyRequest(token):
		abort(401)
	if request.method == "POST":
		if not request.json or not "parameter" in request.json:
			abort(400)
		log.info("SET => %s => %s => %s" % (token, action, request.json["parameter"]))
		try:
			processSetting(token, action, request.json["parameter"])
		except NonExistentSetting:
			return make_response(jsonify({'error':'E_SETTING_NONEXISTENT'}), 400)
		return make_response(jsonify({'status':'ok'}), 200)
	elif request.method == "GET":
		log.info("GET => %s => %s" % (token, action))
		try:
			val = getSetting(token, action)
		except NonExistentSetting:
			return make_response(jsonify({'error':'E_SETTING_NONEXISTENT'}), 400)
		return make_response(jsonify({'value':val}), 200)

@app.route('/api/user/<string:token>/msg', methods=["GET"])
def generateMessage(token):
	"""
		Fetch a message for a user, if available. If not, generate
		a message if needed (e.g. country != HR, device, etc.).
	"""
	if not verifyRequest(token):
		abort(401)
	log.info(token)
	rsp = {'messages':[]}
	o = getData(token)
	# TEMP CODE
	if not 'messages' in o.keys():
		o['messages'] = []
	if len(o['messages']) > 0:
		rsp['messages'].append(o['messages'])
	return rsp

@app.route('/api/user/<string:token>/new', methods=["GET"])
def getNewGrades(token):
	"""
		Get the user's new grades/tests.
	"""
	if not verifyRequest(token):
		abort(401)
	log.info(token)
	o = getData(token)
	new = o['new']
	o['new'] = []
	saveData(token, o)
	return make_response(jsonify({'new':new}), 200)

@app.route('/api/user/<string:token>/logout', methods=["GET"])
def logOut(token):
	"""
		Log the user out.
	"""
	if not verifyRequest(token):
		abort(401)
	purgeToken(token)
	return make_response(jsonify({"status":"ok"}), 200)

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
			del i['tests']
			del i['absences']
		except:
			pass
	del o['info']
	return make_response(jsonify(o), 200)

@app.route('/api/user/<string:token>/classes/<int:class_id>/absences', methods=["GET"])
def getAbsences(token, class_id):
	"""
		Get the user's absences.
	"""
	if not verifyRequest(token, class_id):
		abort(401)
	log.info("%s => Class %s" % (token, class_id))
	return make_response(jsonify(getData(token)['data']['classes'][class_id]['absences']), 200)

@app.route('/api/user/<string:token>/classes/<int:class_id>/subjects', methods=["GET"])
def getSubjects(token, class_id):
	"""
		Get the subjects for a given class ID.
	"""
	if not verifyRequest(token, class_id):
		abort(401)
	ad = request.args.get('alldata', default=0, type=int)
	log.info("%s => %s => Class %s" % ("STRIPPED" if ad == 0 else "FULL", token, class_id))
	o = getData(token)['data']['classes'][class_id]
	if ad == 0:
		log.warning('DEPRECATED METHOD (accessing in stripped-data mode)')
		for x in o['subjects']:
			try:
				del x['notes']
				del x['grades']
			except:
				pass
	return make_response(jsonify({'subjects': o['subjects'], 'class_avg':o['complete_avg']}), 200)

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
	app.run(debug=True)
