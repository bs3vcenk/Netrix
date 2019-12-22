from functools import wraps
from flask import Flask, jsonify, make_response, request, abort
from api_backend import *
import edap, traceback

API_VERSION = "2.13.1"

log = logging.getLogger('EDAP-API')

log.info("eDAP-API version %s starting up", API_VERSION)

# Initialize Flask application
app = Flask("EDAP-API")

# Perform startup checks
do_startup_checks()

# Restore sync threads for all active tokens in DB
restore_syncs()

def check_auth(username, password):
	"""
		Check if the specified username and password hash match the set ones.
	"""
	return username == config.dev.username and hash_password(password) == config.dev.password

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
		# Gather info about accessing IP
		if config.cloudflare.enabled:
			ip = request.headers["CF-Connecting-IP"]
			country = request.headers["CF-IPCountry"]
		else:
			ip = request.remote_addr
			country = "Unknown"
		# Check whether we allow this type of access
		if config.dev.enabled:
			# If we do, verify the supplied HTTP Basic Auth credentials
			auth = request.authorization
			# If no credentials were provided, or the credential pair is incorrect,
			# present an auth prompt
			if not auth or not check_auth(auth.username, auth.password):
				# If credentials were provided and we landed in this if-block, that
				# means this was a failed login attempt, so we log it
				if auth:
					log.warning("FAIL => %s (%s) => Bad auth", ip, country)
				return authenticate()
		else:
			# If we do not, log this access and simply return a 404
			log.warning("FAIL => %s (%s) => DEV endpoints disabled", ip, country)
			abort(404)
		# If the credential pair was correct, log access and return
		log.info('DEV => Successful access from %s using password auth', ip)
		return f(*args, **kwargs)
	return decorated

def dev_area(f):
	"""
		Decorator that marks a function as belonging to the /dev/ API
		endpoints and checks for a token before allowing use.
	"""
	@wraps(f)
	def decorated(*args, **kwargs):
		# Gather info about accessing IP
		if config.cloudflare.enabled:
			ip = request.headers["CF-Connecting-IP"]
			country = request.headers["CF-IPCountry"]
		else:
			ip = request.remote_addr
			country = "Unknown"
		# Check whether we allow this type of access
		if config.dev.enabled:
			# If we do, check if request contains an X-API-Token header
			if "X-API-Token" not in request.headers:
				# If not, log failed request and return
				log.warning("FAIL => %s (%s) => No API token supplied", ip, country)
				abort(403)
			# If it cointains such a header, check if it's a valid one
			elif not verify_dev_request(request.headers["X-API-Token"]):
				# If it is not, log failed request and return
				log.warning("FAIL => %s (%s) => Bad API token %s", ip, country, request.headers["X-API-Token"])
				abort(403)
		else:
			# If we do not, log this access and simply return a 404
			log.warning("FAIL => %s (%s) => DEV endpoints disabled", ip, country)
			abort(404)
		# If the token verification was successful, log access and return
		log.info('DEV => Successful access from %s using token auth', ip)
		return f(*args, **kwargs)
	return decorated

@app.errorhandler(404)
def e404(_):
	"""
		Default handler in case a nonexistent API endpoint is accessed.
	"""
	return make_response(jsonify({'error':'E_UNKNOWN_ENDPOINT'}), 404)

@app.errorhandler(401)
def e401(_):
	"""
		Default handler in case a given token does not exist in the DB.
		This error is also returned if a given class ID or subject ID don't
		exist in the DB.
	"""
	log.warning('Nonexistent token/cID/sID')
	return make_response(jsonify({'error':'E_TOKEN_NONEXISTENT'}), 401)

@app.errorhandler(400)
def e400(_):
	"""
		Default handler in case the user sends an invalid JSON (bad format,
		missing keys/values, etc.)
	"""
	return make_response(jsonify({'error':'E_INVALID_DATA'}), 400)

@app.errorhandler(403)
def e403(_):
	"""
		Default handler for error 403 (Forbidden) responses. These are used
		for example in /dev/* endpoints when an invalid or no token is
		specified.
	"""
	return make_response(jsonify({'error':'E_FORBIDDEN'}), 403)

@app.errorhandler(405)
def e405(_):
	"""
		Default handler in case the request method with which the endpoint
		is called isn't in the specified methods list in the decorator.
	"""
	return make_response(jsonify({'error':'E_INVALID_METHOD'}), 405)

@app.errorhandler(500)
def e500(_):
	"""
		Default handler in case something generic goes wrong on the server
		side.
	"""
	# Check if we need to send server error notifications
	if config.error_notifications.enabled:
		# If we do, get a stacktrace
		exc = traceback.format_exc()
		# Log error
		log.critical('HTTP 500, sending notification')
		# Send message
		notify_error('HTTP 500 RESPONSE', 'generic', stacktrace=exc)
	else:
		# If we don't, just log it
		log.critical('HTTP 500 error!')
	return make_response(jsonify({'error':'E_SERVER_ERROR'}), 500)

@app.errorhandler(Exception)
def exh_unhandled(e):
	"""
		Default exception handler.
	"""
	# Check if we need to send a notification
	if config.error_notifications.enabled:
		# If we do, get a stacktrace
		exc = traceback.format_exc()
		# Send message
		notify_error('UNHANDLED EXC', 'generic', stacktrace=exc)
	# Log exception
	log.warning('Unhandled exception %s', e)
	#abort(500)

@app.errorhandler(redis.exceptions.ConnectionError)
def exh_redis_db_fail(e):
	"""
		Default handler in case the Redis DB connection fails.
	"""
	exc = traceback.format_exc()
	log.critical("DATBASE ACCESS FAILURE!!!!! [%s]", e)
	if config.error_notifications.enabled:
		notify_error('DB CONNECTION FAIL', 'redis', stacktrace=exc)
	return make_response(jsonify({'error':'E_DATABASE_CONNECTION_FAILED'}), 500)

@app.errorhandler(MemoryError)
def exh_memory_error(_):
	"""
		Handler in case we run out of memory.
	"""
	stacktrace = traceback.format_exc()
	log.critical("!! Caught MemoryError !!")
	if config.error_notifications.enabled:
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
	vault_info = get_vault_info()
	return make_response(jsonify({
		'size': convert_size(get_db_size()),
		'keys': get_db_keys(),
		'redis': {
			'version': redis_info['redis_version'],
			'memory': {
				'used': redis_info['used_memory_human'],
				'total': redis_info['total_system_memory_human']
			}
		},
		'vault': vault_info
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
			'cloudflare': None if not config.cloudflare.enabled else {
				'last_ip': data["cloudflare"]["last_ip"],
				'country': data["cloudflare"]["country"]
			},
			'firebase': {
				'status': fb_info['status']
			}
		}
		if fb_info['status']:
			ret_object['firebase']['app_version'] = fb_info['data']['applicationVersion']
			ret_object['firebase']['rooted'] = False
		return ret_object
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
	# Detect some invalid usernames
	pattern_detected = None
	if "@skolers.org" in username:
		pattern_detected = "еСервиси (Srbija)"
	elif "@gmail.com" in username:
		pattern_detected = "Google account"
	elif username.startswith("@"):
		pattern_detected = "Instagram/Twitter username"
	if pattern_detected:
		log.warning("Detected invalid username %s (matched against %s)", username, pattern_detected)
		return make_response(jsonify({'error':'E_INVALID_CREDENTIALS'}), 401)
	token = hash_string(username + ":" + password) # Create the token, this is an MD5 hash of username:password
	if verify_request(token):
		log.info("Returning cached data for %s", username)
		update_counter("logins:success:fast")
		return make_response(jsonify({'token':token}), 200)
	log.debug("Starting login for %s", username)
	try:
		obj = edap.edap(username, password)
	except edap.WrongCredentials:
		log.warning("Failed logging %s in: invalid credentials", username)
		update_counter("logins:fail:credentials")
		return make_response(jsonify({'error':'E_INVALID_CREDENTIALS'}), 401)
	except edap.ParseError as e:
		log.error("Failed logging %s in: eDAP library error - ParseError: %s", username, e)
		update_counter("logins:fail:generic")
		notify_error('PARSE ERROR', 'login', additional_info={'Token': token, 'Username': username, 'IP': dev_ip})
		abort(500)
	except edap.InvalidResponse as e:
		log.error("Failed logging %s in: eDAP library error - InvalidResponse: %s", username, e)
		update_counter("logins:fail:generic")
		notify_error('INVALID SERVER RESPONSE', 'login', additional_info={'Token': token, 'Username': username, 'IP': dev_ip})
		abort(500)
	except edap.NetworkError as e:
		log.error("Failed logging %s in: eDAP library error - NetworkError: %s", username, e)
		update_counter("logins:fail:generic")
		notify_error('CONNECTION FAIL', 'login', additional_info={'Token': token, 'Username': username, 'IP': dev_ip})
		abort(500)
	except edap.ServerInMaintenance as e:
		log.error("Failed logging %s in: upstream server maintenance in progress", username)
		update_counter("logins:fail:generic")
		notify_error('SERVER MAINTENANCE', 'login', additional_info={'Token': token, 'Username': username, 'IP': dev_ip})
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
	if config.cloudflare.enabled:
		dataObj["cloudflare"] = {"last_ip": None, "country": None}
	save_data(token, dataObj)
	log.debug("Starting sync for %s", username)
	start_sync(token)
	update_counter("logins:success:slow")
	return make_response(jsonify({'token':token}), 200)

@app.route('/api/user/<string:token>/firebase', methods=["POST"])
def set_firebase_token(token):
	"""
		Store a Firebase token into a user's data object.
	"""
	if not verify_request(token):
		abort(401)
	if not request.json or not "deviceToken" in request.json:
		abort(400)
	log.debug("%s: Saving Firebase Cloud Messaging token", token)
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
	log.info("%s: Fetching class ID %s", token, request.json["class_id"])
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
		log.info("%s: Processing action SET %s with parameter %s", token, action, request.json["parameter"])
		try:
			process_setting(token, action, request.json["parameter"])
		except NonExistentSetting:
			return make_response(jsonify({'error':'E_SETTING_NONEXISTENT'}), 400)
		return make_response(jsonify({'status':'ok'}), 200)
	elif request.method == "GET":
		log.info("%s: Processing action GET %s", token, action)
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
	log.info("%s: List absences for class %s", token, class_id)
	return make_response(jsonify(get_data(token)['data']['classes'][class_id]['absences']), 200)

@app.route('/api/user/<string:token>/classes/<int:class_id>/subjects', methods=["GET"])
def get_subjects(token, class_id):
	"""
		Get the subjects for a given class ID.
	"""
	if not verify_request(token, class_id):
		abort(401)
	log.info("%s: List subjects for class %s", token, class_id)
	o = get_data(token)['data']['classes'][class_id]
	return make_response(jsonify({'subjects': o['subjects'], 'class_avg':o['complete_avg']}), 200)

@app.route('/api/user/<string:token>/classes/<int:class_id>/tests', methods=["GET"])
def get_tests(token, class_id):
	"""
		Get the tests for a given class ID.
	"""
	if not verify_request(token, class_id):
		abort(401)
	log.info("%s: List tests for class %s", token, class_id)
	o = get_data(token)['data']['classes'][class_id]['tests']
	return make_response(jsonify({'tests': o}), 200)

@app.route('/api/user/<string:token>/classes/<int:class_id>/subjects/<int:subject_id>', methods=["GET"])
def get_subject(token, class_id, subject_id):
	"""
		Get subject info for a given subject ID.
	"""
	if not verify_request(token, class_id, subject_id):
		abort(401)
	log.info("%s: Get subject data for class %s, subject %s", token, class_id, subject_id)
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
		"%s: Save device info: platform::%s, model::%s, language::%s",
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
	if config.cloudflare.enabled:
		dataObj['cloudflare']['country'] = request.headers["CF-IPCountry"]
		dataObj['cloudflare']['last_ip'] = request.headers["CF-Connecting-IP"]
	save_data(token, dataObj)
	return make_response(jsonify({"result":"ok"}), 200)

if __name__ == '__main__':
	app.run(debug=True)
