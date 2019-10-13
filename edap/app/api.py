from functools import wraps
from flask import Flask, jsonify, make_response, request, abort, redirect
from flask_cors import CORS
from api_backend import *
import edap, traceback

API_VERSION = "2.9.2"

log = logging.getLogger('EDAP-API')

log.info("eDAP-API v%s starting up...", API_VERSION)

app = Flask("EDAP-API")
CORS(app)

restore_syncs()

def check_auth(username, password):
	"""
		Check if the specified username and password hash match the set ones.
	"""
	return username == config["privUsername"] and hash_password(password) == config["privPassword"]

def authenticate():
	"""
		Sends a 401 request in case of a failed auth attempt or first time
		accessing the /dev/ dashboard.
	"""
	return make_response(
		'Verification failed. This attempt has been logged.',
		401, {'WWW-Authenticate': 'Basic realm="Login Required"'}
	)

def dev_pw_area(f):
	"""
		Decorator that marks a function as belonging to the browser-side
		/dev/ dashboard, and protects it with a username and password
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
					log.warning("FAIL => %s (%s) => Bad auth", ip, country)
				return authenticate()
		else:
			log.warning("FAIL => %s (%s) => DEV endpoints disabled", ip, country)
			abort(404)
		return f(*args, **kwargs)
	return decorated

def dev_area(f):
	"""
		Decorator that marks a function as belonging to the /dev/ API
		endpoints and checks for a token before allowing use.
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
			if "X-API-Token" not in request.headers:
				log.warning("FAIL => %s (%s) => No API token supplied", ip, country)
				abort(403)
			elif not verify_dev_request(request.headers["X-API-Token"]):
				log.warning("FAIL => %s (%s) => Bad API token %s", ip, country, request.headers["X-API-Token"])
				abort(403)
		else:
			log.warning("FAIL => %s (%s) => DEV endpoints disabled", ip, country)
			abort(404)
		return f(*args, **kwargs)
	return decorated

@app.errorhandler(404)
def e404(err):
	"""
		Default handler in case a nonexistent API endpoint is accessed.
	"""
	log.debug('HTTP 404 (%s)', err)
	return make_response(jsonify({'error':'E_UNKNOWN_ENDPOINT'}), 404)

@app.errorhandler(401)
def e401(err):
	"""
		Default handler in case a given token does not exist in the DB.
		This error is also returned if a given class ID or subject ID don't
		exist in the DB.
	"""
	log.info('HTTP 401 (%s)', err)
	return make_response(jsonify({'error':'E_TOKEN_NONEXISTENT'}), 401)

@app.errorhandler(400)
def e400(err):
	"""
		Default handler in case the user sends an invalid JSON (bad format,
		missing keys/values, etc.)
	"""
	log.info('HTTP 400 (%s)', err)
	return make_response(jsonify({'error':'E_INVALID_DATA'}), 400)

@app.errorhandler(405)
def e405(err):
	"""
		Default handler in case the request method with which the endpoint
		is called isn't in the specified methods list in the decorator.
	"""
	log.info('HTTP 405 (%s)', err)
	return make_response(jsonify({'error':'E_INVALID_METHOD'}), 405)

@app.errorhandler(500)
def e500(err):
	"""
		Default handler in case something generic goes wrong on the server
		side.
	"""
	exc = traceback.format_exc()
	if config['USE_NOTIFICATIONS']:
		log.critical('HTTP 500, sending notification')
		notify_error('HTTP 500 RESPONSE', 'generic', stacktrace=exc)
	else:
		log.critical('HTTP 500 error!')
	return make_response(jsonify({'error':'E_SERVER_ERROR'}), 500)

@app.route('/', methods=["GET"])
def index():
	"""
		Default page, redirects to the Netrix page.
	"""
	return redirect('https://netrix.io/')

@app.errorhandler(redis.exceptions.ConnectionError)
def exh_redis_db_fail(e):
	"""
		Default handler in case the Redis DB connection fails.
	"""
	exc = traceback.format_exc()
	log.critical(" ==> DATBASE ACCESS FAILURE!!!!! <== [%s]", e)
	if config['USE_NOTIFICATIONS']:
		notify_error('DB CONNECTION FAIL', 'redis', stacktrace=exc)
	return make_response(jsonify({'error':'E_DATABASE_CONNECTION_FAILED'}), 500)

@app.errorhandler(MemoryError)
def exh_memory_error(e):
	"""
		Handler in case we run out of memory.
	"""
	stacktrace = traceback.format_exc()
	log.critical("!! Caught MemoryError !!")
	if config['USE_NOTIFICATIONS']:
		notify_error('MEMORY ERROR', 'generic', stacktrace)
	return make_response(jsonify({'error':'E_SERVER_OUT_OF_MEMORY'}), 500)

@app.route('/dev/dboptimize', methods=["GET"])
@dev_area
def dev_db_optimize():
	"""
		DEV: Rewrite the AOF file.
	"""
	pre_size = convert_size(get_db_size())
	optimize_db_aof()
	post_size = convert_size(get_db_size())
	return make_response(jsonify({
		'size_prev': pre_size,
		'size_curr': post_size
	}))

@app.route('/dev/dbinfo', methods=["GET"])
@dev_area
def dev_db_info():
	"""
		DEV: Database info page, currently only showing the size of the DB.
	"""
	redis_info = get_db_info()
	return make_response(jsonify({
		'size': convert_size(get_db_size()),
		'keys': get_db_size(),
		'redis': {
			'version': redis_info['redis_version'],
			'memory': {
				'used': redis_info['used_memory_human'],
				'total': redis_info['total_system_memory_human']
			}
		}
	}))

@app.route('/dev/log', methods=["GET"])
@dev_area
def dev_log():
	"""
		DEV: Simple page to print the log file.
	"""
	filter_sync = request.args.get('filter', type=bool)
	return make_response(jsonify({'log':read_log(exclude_syncing=filter_sync)}), 200)

@app.route('/dev/firebase', methods=["GET"])
@dev_area
def dev_firebase_filter():
	"""
		DEV: Check for inactive users, and delete if specified.
	"""
	auto_delete = request.args.get('delete', type=bool)
	out = check_inactive_fb_tokens(auto_delete)
	return make_response(jsonify(out), 200)

@app.route('/dev/users', methods=["GET"])
@dev_area
def dev_users():
	"""
		DEV: Get usernames and tokens.
	"""
	tklist = []
	for token in get_tokens():
		creds = get_credentials(token)
		tklist.append({'token': token, 'name': creds['username']})
	return make_response(jsonify({'users':tklist}), 200)

@app.route('/dev/users/<string:token>', methods=["DELETE", "GET"])
@dev_area
def dev_token_mgmt(token):
	"""
		DEV: Token management endpoint, allows getting info or deleting
		the token.
	"""
	if request.method == "GET":
		data = get_data(token)
		creds = get_credentials(token)
		fb_info = get_firebase_info(data['firebase_device_token'])
		ret_object = {
			'username': creds["username"],
			'device': {
				'os': data["device"]["platform"],
				'device': data["device"]["model"],
				'language': data["lang"]
			},
			'ip': data["last_ip"],
			'cloudflare': None if not config["USE_CLOUDFLARE"] else {
				'last_ip': data["cloudflare"]["last_ip"],
				'country': data["cloudflare"]["country"]
			},
			'firebase': {
				'status': fb_info['status']
			}
		}
		if fb_info['status']:
			ret_object['firebase']['app_version'] = fb_info['data']['applicationVersion']
			ret_object['firebase']['rooted'] = fb_info['data']['attestStatus'] == 'ROOTED'
	elif request.method == "DELETE":
		purge_token(token)
		return {'status':'success'}

@app.route('/dev/stats', methods=["GET"])
@dev_area
def dev_stats():
	"""
		DEV: Statistics report, shows full and cached logins along with failed
		ones.
	"""
	return make_response(jsonify({
		'success': {
			'slow_logins': get_counter("logins:success:slow"),
			'fast_logins': get_counter("logins:success:fast")
		},
		'fails': {
			'wrong_pw': get_counter("logins:fail:credentials"),
			'exceptions': get_counter("logins:fail:generic")
		}
	}), 200)

@app.route('/dev/token', methods=["GET"])
@dev_pw_area
def dev_make_token():
	"""
		DEV: Create a dev API token.
	"""
	return make_html(title="eDAP dev API token generator", content="<p>Your token is: <code>%s<code></p>" % add_dev_token())

@app.route('/dev/threads', methods=["GET"])
@dev_area
def dev_thread_list():
	"""
		DEV: List running background threads.
	"""
	return make_response(jsonify({'threads': get_sync_threads()}), 200)

@app.route('/dev/info/testuser', methods=["GET"])
@dev_pw_area
def devAddTestUser():
	"""
		DEV: Add a test user. Contains a test dataset; more info
		in api_backend/generate_test_user().
	"""
	testUser, testPasw, testToken = generate_test_user()
	html = "<p>Username: <code>%s</code></p>" % testUser
	html += "<p>Password: <code>%s</code></p>" % testPasw
	html += "<p>Token: <code>%s</code></p>" % testToken
	return make_html(title="Test user creation", content=html)

@app.route('/dev/recreate', methods=["GET"])
@dev_area
def dev_reload_info():
	"""
		DEV: Re-fetches the 'data' key for all tokens in the database.
	"""
	tokens = get_tokens()
	failed = []
	log.info("DEV OPERATION => RECREATING DATA OBJECTS FOR %i TOKENS", len(tokens))
	for token in tokens:
		try:
			o = get_data(token)
			creds = get_credentials(token)
			userObj = edap.edap(creds['username'], creds['password'])
			o['data'] = populate_data(userObj)
			o['generated_with'] = API_VERSION
			save_data(token, o)
		except Exception as e:
			failed.append({'token':token, 'reason':str(e)})
			log.error('DEV OPERATION => Update FAILED for token %s, reason %s', token, e)
			continue
	return make_response(jsonify({'sample': len(tokens), 'fails': failed}))

@app.route('/dev/users/<string:token>/testdiff', methods=["POST"])
@dev_pw_area
def dev_test_diff(token):
	"""
		DEV: Simulate a sync by adding a fake grade object to a list
		of a subject's grades. This new dataset will then be checked
		against the current one and a notification will be fired off
		to the user.
	"""
	if not request.json or not "subjId" in request.json or not "gradeData" in request.json:
		log.error("Bad JSON")
		abort(400)
	elif not "grade" in request.json["gradeData"] or not "note" in request.json["gradeData"]:
		log.error("Bad grade spec in JSON")
		abort(400)
	elif not verify_request(token):
		abort(401)
	o = get_data(token)["data"]
	o['classes'][0]['subjects'][request.json["subjId"]]['grades'].append(request.json["gradeData"])
	sync_dev(o, token)
	return make_response(jsonify({'status':'ok'}), 200)

@app.route('/dev/users/<string:token>/diff', methods=["POST"])
@dev_pw_area
def dev_force_diff(token):
	"""
		DEV: Force a sync operation for a token. Will output debugging
		logs, which include credentials!
	"""
	if not verify_request(token):
		abort(401)
	debug_output = sync(token, debug=True)
	return make_response(debug_output, 200)

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
		update_counter("logins:fail:generic")
		abort(400)
	elif (request.json["username"] is None or
	      request.json["password"] is None or
	      len(request.json["username"]) < 4 or
	      len(request.json["password"]) < 4):
		log.error("Bad auth data")
		update_counter("logins:fail:generic")
		return make_response(jsonify({'error':'E_INVALID_CREDENTIALS'}), 401)
	dev_ip = request.remote_addr
	username = request.json["username"].strip()
	password = request.json["password"]
	if "@skole.hr" in username:
		username = username.replace("@skole.hr", "")
	token = hash_string(username + ":" + password)
	if verify_request(token):
		log.info("FAST => %s", username)
		update_counter("logins:success:fast")
		return make_response(jsonify({'token':token}), 200)
	log.info("SLOW => %s", username)
	try:
		obj = edap.edap(username, password)
	except edap.WrongCredentials:
		log.error("SLOW => WRONG CREDS => %s", username)
		update_counter("logins:fail:credentials")
		return make_response(jsonify({'error':'E_INVALID_CREDENTIALS'}), 401)
	except edap.FatalLogExit as e:
		log.error("SLOW => eDAP FAIL => %s => %s", username, e)
		update_counter("logins:fail:generic")
		abort(500)
	except edap.ServerInMaintenance as e:
		log.error("SLOW => MAINTENANCE => %s", username)
		update_counter("logins:fail:generic")
		return make_response(jsonify({'error':'E_UPSTREAM_MAINTENANCE'}), 500)
	log.info("SLOW => SUCCESS => %s (%s)", username, token)
	dataObj = {
		'data': populate_data(obj),
		'last_ip': dev_ip,
		'device': {
			'platform': None,
			'model': None
		},
		'lang': None,
		'new': [],
		'generated_with': API_VERSION,
		'firebase_device_token': None,
		'settings': {
			'notif': {
				'disable': False,
				'ignore': []
			}
		},
		'messages': []
	}
	set_credentials(token, username, password)
	if config["USE_CLOUDFLARE"]:
		dataObj["cloudflare"] = {"last_ip": None, "country": None}
	save_data(token, dataObj)
	log.debug("SLOW => Starting sync for %s", username)
	start_sync(token)
	update_counter("logins:success:slow")
	return make_response(jsonify({'token':token}), 200)

@app.route('/api/user/<string:token>/info', methods=["GET"])
def get_user_info_old(token):
	"""
		Get the user's personal information.
	"""
	if not verify_request(token):
		abort(401)
	log.warning('DEPRECATED METHOD')
	log.info(token)
	return make_response(jsonify({'name':'Upgrade time'}), 200)

@app.route('/api/user/<string:token>/firebase', methods=["POST"])
def set_firebase_token(token):
	"""
		Store a Firebase token into a user's data object.
	"""
	if not verify_request(token):
		abort(401)
	if not request.json or not "deviceToken" in request.json:
		abort(400)
	log.info("FIREBASE => %s", token)
	user_data = get_data(token)
	user_data['firebase_device_token'] = request.json['deviceToken']
	save_data(token, user_data)
	return make_response(jsonify({'status':'ok'}), 200)

@app.route('/api/user/<string:token>/fetchclass', methods=["POST"])
def fill_class(token):
	"""
		Expand a class object by class ID (specified in POST JSON).
	"""
	if not verify_request(token):
		abort(401)
	if not request.json or not "class_id" in request.json:
		abort(400)
	log.info("FETCH => %s => %s", token, request.json["class_id"])
	fetch_new_class(token, request.json["class_id"])
	return make_response('', 200)

@app.route('/api/user/<string:token>/settings/<string:action>', methods=["POST", "GET"])
def setting(token, action):
	"""
		Set a user's setting.
	"""
	if not verify_request(token):
		abort(401)
	if request.method == "POST":
		if not request.json or not "parameter" in request.json:
			abort(400)
		log.info("SET => %s => %s => %s", token, action, request.json["parameter"])
		try:
			process_setting(token, action, request.json["parameter"])
		except NonExistentSetting:
			return make_response(jsonify({'error':'E_SETTING_NONEXISTENT'}), 400)
		return make_response(jsonify({'status':'ok'}), 200)
	elif request.method == "GET":
		log.info("GET => %s => %s", token, action)
		try:
			val = get_setting(token, action)
		except NonExistentSetting:
			return make_response(jsonify({'error':'E_SETTING_NONEXISTENT'}), 400)
		return make_response(jsonify({'value':val}), 200)

@app.route('/api/user/<string:token>/msg', methods=["GET"])
def generate_message(token):
	"""
		Fetch a message for a user, if available. If not, generate
		a message if needed (e.g. country != HR, device, etc.).
	"""
	if not verify_request(token):
		abort(401)
	log.info(token)
	rsp = {'messages':[]}
	o = get_data(token)
	# TEMP CODE
	if not 'messages' in o:
		o['messages'] = []
	if o['messages']:
		rsp['messages'].append(o['messages'])
	return rsp

@app.route('/api/user/<string:token>/new', methods=["GET"])
def get_new(token):
	"""
		Get the user's new grades/tests.
	"""
	if not verify_request(token):
		abort(401)
	log.info(token)
	o = get_data(token)
	new = o['new']
	o['new'] = []
	save_data(token, o)
	return make_response(jsonify({'new':new}), 200)

@app.route('/api/user/<string:token>/logout', methods=["GET"])
def logout(token):
	"""
		Log the user out.
	"""
	if not verify_request(token):
		abort(401)
	purge_token(token)
	return make_response(jsonify({"status":"ok"}), 200)

@app.route('/api/user/<string:token>/classes', methods=["GET"])
def get_classes(token):
	"""
		Get the user's classes. Currently unused by the frontend, as
		we currently fetch data for the newest/most recent class only.
	"""
	if not verify_request(token):
		abort(401)
	log.info(token)
	o = get_data(token)['data']
	for i in o['classes']:
		try:
			del i['subjects']
			del i['tests']
			del i['absences']
			del i['info']
		except KeyError:
			pass
	return make_response(jsonify(o), 200)

@app.route('/api/user/<string:token>/classes/<int:class_id>/info', methods=["GET"])
def get_user_info(token, class_id):
	"""
		Get the user's personal information.
	"""
	if not verify_request(token, class_id):
		abort(401)
	log.info(token)
	return make_response(jsonify(get_data(token)['data']['classes'][class_id]['info']), 200)

@app.route('/api/user/<string:token>/classes/<int:class_id>/absences', methods=["GET"])
def get_absences(token, class_id):
	"""
		Get the user's absences.
	"""
	if not verify_request(token, class_id):
		abort(401)
	log.info("%s => Class %s", token, class_id)
	return make_response(jsonify(get_data(token)['data']['classes'][class_id]['absences']), 200)

@app.route('/api/user/<string:token>/classes/<int:class_id>/subjects', methods=["GET"])
def get_subjects(token, class_id):
	"""
		Get the subjects for a given class ID.
	"""
	if not verify_request(token, class_id):
		abort(401)
	log.info("%s => Class %s", token, class_id)
	o = get_data(token)['data']['classes'][class_id]
	return make_response(jsonify({'subjects': o['subjects'], 'class_avg':o['complete_avg']}), 200)

@app.route('/api/user/<string:token>/classes/<int:class_id>/tests', methods=["GET"])
def get_tests(token, class_id):
	"""
		Get the tests for a given class ID.
	"""
	if not verify_request(token, class_id):
		abort(401)
	log.info("%s => Class %s", token, class_id)
	o = get_data(token)['data']['classes'][class_id]['tests']
	return make_response(jsonify({'tests': o}), 200)

@app.route('/api/user/<string:token>/classes/<int:class_id>/subjects/<int:subject_id>', methods=["GET"])
def get_subject(token, class_id, subject_id):
	"""
		Get subject info for a given subject ID.
	"""
	if not verify_request(token, class_id, subject_id):
		abort(401)
	log.info("%s => Class %s => Subject %s", token, class_id, subject_id)
	o = get_data(token)['data']['classes'][class_id]['subjects'][subject_id]
	return make_response(jsonify(o), 200)

@app.route('/api/stats', methods=["POST"])
def log_stats():
	"""
		Save the stats to a user's profile.
	"""
	if (not "token" in request.json
	    or not "platform" in request.json
	    or not "device" in request.json
	    or not "language" in request.json):
		log.warning("Invalid JSON from %s", request.remote_addr)
		abort(400)
	token = request.json["token"]
	if not verify_request(token):
		abort(401)
	log.info(
		"STATS => %s => %s, %s, %s",
		token,
		request.json["platform"],
		request.json["device"],
		request.json["language"]
	)
	dataObj = get_data(token)
	dataObj['last_ip'] = request.remote_addr
	dataObj['device']['platform'] = request.json["platform"]
	dataObj['device']['model'] = request.json["device"]
	dataObj['lang'] = request.json["language"]
	if config["USE_CLOUDFLARE"]:
		dataObj['cloudflare']['country'] = request.headers["CF-IPCountry"]
		dataObj['cloudflare']['last_ip'] = request.headers["CF-Connecting-IP"]
	save_data(token, dataObj)
	return make_response(jsonify({"result":"ok"}), 200)

if __name__ == '__main__':
	app.run(debug=True)
