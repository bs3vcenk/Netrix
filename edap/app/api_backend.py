"""
eDAP-API backend functions
====

This module contains various functions which interact with the backend
of the eDAP-API system.
"""

import logging, redis, edap, requests
from hashlib import md5 as _MD5HASH
from hashlib import sha256 as _SHA256HASH
from json import loads as _json_load
from json import dumps as _json_convert
from copy import deepcopy
from random import randint
from random import choice as _random_choice
from sys import exit as _sys_exit
from math import floor as _math_floor
from math import ceil as _math_ceil
from math import log as _math_log
from math import pow as _math_pow
from os import environ
from os.path import join as _join_path
from os.path import getsize as _get_file_size
from threading import Thread
from time import sleep
from time import time as _time
from time import clock as _clock
from string import ascii_letters
from typing import List, Dict

log = logging.getLogger(__name__)
_redis = None

_threads = {}

class NonExistentSetting(Exception):
	"""Specified setting ID is non-existent."""

def _round(n, decimals=0):
	"""
		Improved round function. Rounds .5 upwards instead of builtin
		round()'s downwards rounding.
	"""
	expoN = n * 10 ** decimals
	if abs(expoN) - abs(_math_floor(expoN)) < 0.5:
		return _math_floor(expoN) / 10 ** decimals
	return _math_ceil(expoN) / 10 ** decimals

def _send_telegram_notification(message: str, parse_mode: str = "Markdown"):
	"""
		Send a notification through Telegram.
	"""
	requests.post(
		'https://api.telegram.org/bot%s/sendMessage' % config["TELEGRAM_TOKEN"],
		data={
			"chat_id": config["TELEGRAM_TARGET_UID"],
			"text": message,
			"parse_mode": parse_mode
		}
	)

def notify_error(problem_header: str, component: str, stacktrace=None, additional_info=None):
	"""
		Send a notification about an exception/error.
	"""
	message_content = "*%s*\nComponent: `%s`" % (problem_header, component)
	if additional_info:
		for key in additional_info:
			message_content += "\n%s: `%s`" % (key, additional_info[key])
	_send_telegram_notification(message_content)
	if stacktrace:
		_send_telegram_notification("```%s```" % stacktrace)

def get_credentials(token: str):
	"""
		Call Vault to get the creds for a token.
	"""
	data = requests.get(
		'%s/v1/secret/data/%s' % (config["VAULT_SERVER"], token),
		headers={'X-Vault-Token': config["VAULT_TOKEN_READ"]}
	)
	try:
		data.raise_for_status()
	except requests.exceptions.HTTPError:
		log.critical('Failed to access credentials!')
		if config['USE_NOTIFICATIONS']:
			notify_error('VAULT GET ERROR', 'vault', additional_info={"token": token})
	return data.json()["data"]["data"]

def set_credentials(token: str, username: str, password: str):
	"""
		Call Vault to set a credential pair for a token.
	"""
	data = requests.post(
		'%s/v1/secret/data/%s' % (config["VAULT_SERVER"], token),
		headers={'X-Vault-Token': config["VAULT_TOKEN_WRITE"]},
		json={
			"data": {
				"username": username,
				"password": password
			}
		}
	)
	try:
		data.raise_for_status()
	except requests.exceptions.HTTPError:
		log.critical('Failed to set credentials!')
		if config['USE_NOTIFICATIONS']:
			notify_error('VAULT SET ERROR', 'vault', additional_info={"token": token})

def rm_credentials(token: str):
	"""
		Call Vault to remove a credential pair for a token.
	"""
	data = requests.delete(
		'%s/v1/secret/data/%s' % (config["VAULT_SERVER"], token),
		headers={'X-Vault-Token': config["VAULT_TOKEN_WRITE"]}
	)
	try:
		data.raise_for_status()
	except requests.exceptions.HTTPError:
		log.critical('Failed to delete credentials!')
		if config['USE_NOTIFICATIONS']:
			notify_error('VAULT DELETE ERROR', 'vault', additional_info={"token": token})

def _exit(exitCode: int):
	"""
		Present additional information on exit (exit code and instructions).
	"""
	print("!!! Exited with code %i\n    If possible, check the log file for more information.\n    Make sure you configured eDAP correctly! Read the documentation\n    completely and verify your configuration before reporting an error." % exitCode)
	_sys_exit(exitCode)

def localize(token: str, notif_type: str) -> str:
	"""
		Localize a string according to the language reported by
		the phone through /api/stats.
	"""
	locs = {
		"en": {
			"note": "New note",
			"grade": "New grade",
			"absence": "New absence",
			"test": "New test",
			"class": "New class"
		},
		"hr": {
			"note": "Nova bilješka",
			"grade": "Nova ocjena",
			"absence": "Novi izostanak",
			"test": "Novi ispit",
			"class": "Novi razred"
		},
		"de": {
			"note": "New note",
			"grade": "New grade",
			"absence": "New absence",
			"test": "New test",
			"class": "New class"
		},
		"sv": {
			"note": "New note",
			"grade": "New grade",
			"absence": "New absence",
			"test": "New test",
			"class": "New class"
		}
	}
	lang = get_data(token)['lang']
	return locs[lang][notif_type]

def random_string(length: int) -> str:
	"""
		Return a random string with of specified length.
	"""
	return ''.join(_random_choice(ascii_letters) for m in range(length))

def generate_test_user() -> (str, str, str):
	"""
		Generate a user for testing purposes.
	"""
	user = random_string(6)
	pasw = random_string(10)
	token = hash_string(user + ":" + pasw)
	data = {
		'ignore_updating': True,
		'data': {
			'classes': [
				{
					"class": "1.a",
					"classmaster": "Razrednik",
					"complete_avg": 4.20,
					"school_city": "Grad",
					"school_name": "Ime škole",
					"year": "2018./2019.",
					"subjects": [
						{
							"average": 4.58,
							"id": 0,
							"professors": ["Netko Netkić", "Nitko Nitkić"],
							"subject": "Hrvatski jezik"
						},
						{
							"average": 5.00,
							"id": 1,
							"professors": ["Netko Netkić"],
							"subject": "Engleski jezik"
						},
						{
							"average": 3.89,
							"id": 1,
							"professors": ["Nitko Nitkić"],
							"subject": "Latinski jezik"
						},
						{
							"average": 4.96,
							"id": 1,
							"professors": ["Ivan Ivanović"],
							"subject": "Fizika"
						}
					],
					"tests": [
						{
							"current": False,
							"date": _time() - 120,
							"id": 0,
							"subject": "Hrvatski",
							"test": "Prvi ispit znanja"
						},
						{
							"current": True,
							"date": _time() + 259200 + 120,
							"id": 1,
							"subject": "Hrvatski",
							"test": "Drugi ispit znanja"
						}
					],
					'info': {
						"address": "Ulica, Mjesto",
						"birthdate": "1. 1. 2000.",
						"birthplace": "Grad, Država",
						"name": "Netko Netkić",
						"number": 1,
						"program": "Program"
					},
					"absences": {
						"overview":{
							"awaiting": 0,
							"justified": 0,
							"sum": 0,
							"sum_leftover": 0,
							"unjustified": 0
						},
						"full":[]
					}
				}
			]
		},
		'last_ip': '0.0.0.0',
		'device': {
			'platform': None,
			'model': None
		},
		'lang': None,
		'resolution': None,
		'new': None,
		'generated_with': 'testUser',
		'settings': {
			'notif': {
				'disable': False,
				'ignore': []
			}
		},
		'messages': []
	}
	save_data(token, data)
	set_credentials(token, user, pasw)
	return user, pasw, token

def get_setting(token: str, action: str):
	"""
		Get action data/value for token.
	"""
	o = get_data(token)
	if 'settings' not in o:
		o['settings'] = {'notif':{'disable': False, 'ignore':[]}}
	if action == 'notif.disable':
		return o['settings']['notif']['disable']
	if action == 'notif.ignore':
		return o['settings']['notif']['ignore']
	if action == 'notif.all':
		return o['settings']['notif']
	raise NonExistentSetting

def process_setting(token: str, action: str, val: str):
	"""
		Do an action, with val as the data/arguments on a profile.
	"""
	o = get_data(token)
	if 'settings' not in o:
		o['settings'] = {'notif':{'disable': False, 'ignore':[]}}
	if action == 'notif.disable':
		o['settings']['notif']['disable'] = val
	elif action == 'notif.ignore.add':
		if val not in o['settings']['notif']['ignore']:
			o['settings']['notif']['ignore'].append(val)
	elif action == 'notif.ignore.del':
		if val in o['settings']['notif']['ignore']:
			del o['settings']['notif']['ignore'][o['settings']['notif']['ignore'].index(val)]
		else:
			raise NonExistentSetting
	else:
		raise NonExistentSetting
	save_data(token, o)

def purge_token(token: str):
	"""
		Remove a token from the DB and terminate its sync thread.
	"""
	log.info("LOGOUT => %s", token)
	_stop_sync(token)
	_redis.delete('token:' + token)
	rm_credentials(token)

def _formatAndSendNotification(token: str, notifData):
	"""
		Format a notification for the user based on data gotten from
		profileDifference() in sync().
	"""
	gradeNotif = []
	testNotif = []
	noteNotif = []
	absenceNotif = False
	toSendQueue = []
	exceptions = get_data(token)['settings']['notif']['ignore']
	for x in notifData:
		# TODO: Fix test notifications
		#if x['type'] == 'test' and 'test' not in exceptions:
		#	testNotif.append("%s: %s" % (x['data']['subject'], x['data']['test']))
		if x['type'] == 'grade' and 'grade' not in exceptions:
			gradeNotif.append("%s: %s (%s)" % (_subj_id_to_name(token, x['classId'], x['subjectId']), x['data']['grade'], x['data']['note']))
		elif x['type'] == 'note' and 'note' not in exceptions:
			noteNotif.append("%s: %s" % (_subj_id_to_name(token, x['classId'], x['subjectId']), x['data']['note']))
		#elif x['type'] == 'absence' and 'absence' not in exceptions:
		#	absenceNotif = True
	if gradeNotif:
		toSendQueue.append({
			'head': localize(token, 'grade'),
			'content': ", ".join(gradeNotif)
		})
	if testNotif:
		toSendQueue.append({
			'head': localize(token, 'test'),
			'content': ", ".join(testNotif)
		})
	if noteNotif:
		toSendQueue.append({
			'head': localize(token, 'note'),
			'content': ", ".join(noteNotif)
		})
	if absenceNotif:
		toSendQueue.append({
			'head': localize(token, 'absence'),
			'content': None
		})
	for i in toSendQueue:
		sendNotification(token, i['head'], i['content'])

def _subj_id_to_name(token: str, class_id: int, subject_id: int) -> str:
	"""
		Get the name belonging to a subject ID.
	"""
	if not verify_request(token, class_id, subject_id):
		raise Exception('Bad auth data')
	return get_data(token)['data']['classes'][class_id]['subjects'][subject_id]['subject']

def _stop_sync(token: str):
	"""
		Stop background sync thread for a given token, e.g. if
		terminated.
	"""
	if "sync:" + token in _threads:
		_threads["sync:" + token]["run"] = False

def get_sync_threads() -> List[str]:
	"""
		Get a list of sync threads.
	"""
	return [i.replace("sync:", "") for i in _threads]

def start_sync(token: str):
	"""
		Start a sync thread for a given token.
	"""
	global _threads
	if "sync:" + token not in _threads:
		to = Thread(target=_sync, args=(token,))
		to.start()
		_threads["sync:" + token] = {"obj":to, "run":True}

def _maintenance():
	"""
		Run maintenance tasks
	"""
	log.info('Optimizing AOF database file')
	_redis.bgrewriteaof()

def restore_syncs():
	"""
		Restore all sync threads (on startup).
	"""
	for token in get_tokens():
		if not 'ignore_updating' in get_data(token):
			start_sync(token)

def sync_dev(data2, token: str):
	"""
		DEV: Simulate sync with two objects.
	"""
	log.debug("Simulating sync")
	o = get_data(token)
	diff = _profile_difference(o["data"], data2)
	if diff:
		log.debug("Difference detected")
		o["new"] = diff
		save_data(token, o)
		_formatAndSendNotification(token, diff)

def sync(token: str, debug: bool = False):
	"""
		Pull remote data, compare with current and replace if needed.
	"""
	if debug:
		log_buffer = ""
	log.debug("Syncing %s", token)
	if debug:
		log_buffer += "START_SYNC token:%s\n" % token
		log_buffer += "FETCH_OLD_DATA\n"
	fData = get_data(token)
	fb_token_info = get_firebase_info(fData['firebase_device_token'])
	if debug:
		log_buffer += "VERIFY_ACTIVITY status:%s\n" % fb_token_info['status']
	if not fb_token_info['status']:
		# Inactive token, stop sync
		_stop_sync(token)
		log.warning('Inactive token %s detected, stopping sync', token)
		if debug:
			return log_buffer
		return
	data = fData["data"] # Old data
	credentials = get_credentials(token)
	if debug:
		log_buffer += "CREDENTIALS username:%s password:%s\n" % (credentials['username'], credentials['password'])
		log_buffer += "FETCH_NEW_DATA\n"
	nData = populate_data(edap.edap(credentials["username"], credentials["password"])) # New data
	if debug:
		log_buffer += "GET_DIFFERENCE\n"
	diff = _profile_difference(data, nData)
	if debug:
		log_buffer += "DIFF_RESULT diff:%s\n" % diff
	if diff:
		# Overwrite everything if new class
		if diff[0]['type'] == 'class':
			fData["data"] = nData
		else:
			fData["data"]["classes"][0] = nData["classes"][0]
		fData["new"] = diff
		save_data(token, fData)
		if not fData["settings"]["notif"]["disable"]:
			_formatAndSendNotification(token, diff)
	if debug:
		return log_buffer

def _profile_difference(dObj1, dObj2) -> List[dict]:
	"""
		Return the difference between two student data dicts.
	"""
	start = _clock()
	_finalReturn = []
	## CLASS DIFFERENCE ##
	t1 = deepcopy(dObj1['classes'])
	t2 = deepcopy(dObj2['classes'])
	difflist = len(t1) != len(t2)
	if difflist:
		log.info("Found difference in classes")
		_finalReturn.append({'type':'class'})
		# At this point, we can't compare anything else, as only the
		# first class' information is pulled by populateData(), so
		# we'll just return.
		return _finalReturn
	## TEST DIFFERENCE (FIRST CLASS ONLY) ##
	t1 = deepcopy(dObj1['classes'][0]['tests'])
	t2 = deepcopy(dObj2['classes'][0]['tests'])
	difflist = [x for x in t2 if x not in t1]
	if difflist:
		log.info("Found difference in tests")
		for i in difflist:
			_finalReturn.append({'type':'test', 'classId':0, 'data':i})
	## ABSENCE DIFFERENCE (FIRST CLASS ONLY) ##
	# Only check length to avoid spamming notifications for
	# each class period.
	t1 = deepcopy(dObj1['classes'][0]['absences']['full'])
	t2 = deepcopy(dObj2['classes'][0]['absences']['full'])
	difflist = [x for x in t2 if x not in t1]
	if difflist:
		log.info("Found difference in absences")
		_finalReturn.append({'type':'absence', 'classId':0, 'data':None})
	## PER-SUBJECT GRADE DIFFERENCE (FIRST CLASS ONLY) ##
	# https://stackoverflow.com/a/1663826
	sId = 0
	for i, j in zip(dObj1['classes'][0]['subjects'], dObj2['classes'][0]['subjects']):
		if "grades" in j:
			if j["grades"] is None:
				continue
			t1 = deepcopy(i['grades'])
			t2 = deepcopy(j['grades'])
			difflist = [x for x in t2 if x not in t1]
			if difflist:
				log.info("Found difference in grades")
				for x in difflist:
					_finalReturn.append({'type':'grade', 'classId':0, 'subjectId': sId, 'data':x})
		if "notes" in j:
			if j["notes"] is None:
				continue
			t1 = deepcopy(i['notes'])
			t2 = deepcopy(j['notes'])
			difflist = [x for x in t2 if x not in t1]
			if difflist:
				log.info("Found difference in notes")
				for x in difflist:
					_finalReturn.append({'type':'note', 'classId':0, 'subjectId': sId, 'data':x})
		sId += 1
	request_time = _clock() - start
	log.debug("==> TIMER => {0:.0f}ms".format(request_time))
	return _finalReturn

def save_data(token: str, dataObj):
	"""
		Save data for a token.
	"""
	_redis.set('token:' + token, _json_convert(dataObj))

def get_db_size() -> int:
	"""
		Get the size of Redis' appendonly.aof database in bytes.
	"""
	return _get_file_size(_join_path(config["DATA_FOLDER"], "appendonly.aof"))

def check_inactive_fb_tokens(auto_delete: bool = False) -> dict:
	"""
		Check for inactive Firebase tokens in DB and delete associated
		user if specified.
	"""
	tokens = get_tokens()
	log.info('Verifying %i Firebase tokens', len(tokens))
	returnable = {'inactive_tokens': [], 'deleted_tokens': []}
	for token in tokens:
		fb_token = get_data(token)['firebase_device_token']
		if fb_token:
			out = get_firebase_info(fb_token)
			if not out['status']:
				returnable['inactive_tokens'].append(token)
				if auto_delete:
					purge_token(token)
					returnable['deleted_tokens'].append(token)
		else:
			log.info('FB token is null value for %s', token)
			returnable['inactive_tokens'].append(token)
	log.info('Verification returned %i inactive Firebase tokens', len(returnable['inactive_tokens']))
	return returnable

def get_firebase_info(firebase_token: str) -> dict:
	"""
		Return information about a Firebase token, if possible.
	"""
	a = requests.get(
		'https://iid.googleapis.com/iid/info/' + firebase_token,
		params={'details': 'true'},
		headers={
			"Authorization": "key=%s" % config["FIREBASE_TOKEN"]
		}
	)
	token_status = True
	if a.status_code != 200:
		token_status = False
	return {'status': token_status, 'data': a.json()}

def sendNotification(token: str, title: str, content: str, data=None):
	"""
		Send a notification to a user's device through Firebase.
	"""
	if not verify_request(token):
		raise Exception("Bad token")
	log.info("Sending notification to %s", token)
	firebase_token = get_data(token)["firebase_device_token"]

	out_json = {
		"to": firebase_token,
		"notification": {
			"title": title,
			"body": content
		}
	}

	if data:
		out_json["data"] = data

	try:
		a = requests.post(
			'https://fcm.googleapis.com/fcm/send',
			json=out_json,
			headers={
				"Authorization": "key=%s" % config["FIREBASE_TOKEN"]
			}
		)
		a.raise_for_status()
	except requests.exceptions.HTTPError as e:
		log.error('Non-200 code (Firebase Cloud Messaging) => %s', str(e))
		raise e
	# EXPERIMENT: Checking responses to detect inactive users
	with open(config["DATA_FOLDER"] + '/firebase.log', 'a') as fb_log:
		fb_log.write('!! TOKEN:%s; FCM_TOKEN:%s; HTTP_CODE:%s; HTTP_RESPONSE:\n%s\n\n'
		             % (token, firebase_token, a.status_code, a.text))

def _sync(token: str):
	"""
		Wrapper around sync, for bg execution (random timeout).
	"""
	while True:
		val = randint(1800, 3600)
		log.debug("Waiting %i s for %s", val, token)
		sleep(val)
		if not _threads["sync:" + token]["run"]:
			del _threads["sync:" + token]
			break
		sync(token)

def _get_var(varname: str, _bool: bool = False, default=None):
	"""
		Get environment variable and return it if it exists. If _bool is True,
		return it as a boolean value. If default is set, return its value if
		the given variable does not exist.
	"""
	if _bool:
		default = default if default != None else False
	try:
		return environ[varname] if not _bool else environ[varname] == "Y"
	except KeyError:
		return default

def _read_config() -> Dict[str, str]:
	"""
		Read, verify and print the configuration.
	"""
	DATA_FOLDER = _get_var("DATA_FOLDER", default="/data")
	print("[eDAP] [INFO] Storing data in: %s" % DATA_FOLDER)

	VAULT_SERVER = _get_var("VAULT_SERVER")
	VAULT_TOKEN_READ = _get_var("VAULT_TOKEN_READ")
	VAULT_TOKEN_WRITE = _get_var("VAULT_TOKEN_WRITE")

	if not VAULT_TOKEN_READ or not VAULT_TOKEN_WRITE:
		print("[eDAP] [ERROR] Vault read and/or write tokens not specified!")
		_exit(1)
	elif not VAULT_SERVER:
		print("[eDAP] [ERROR] Vault server not specified!")
		_exit(1)

	print("[eDAP] [INFO] Hashicorp Vault server at: %s" % VAULT_SERVER)

	ALLOW_DEV_ACCESS = _get_var("DEV_ACCESS", _bool=True)
	USE_CLOUDFLARE = _get_var("CLOUDFLARE", _bool=True)
	USE_FIREBASE = _get_var("FIREBASE", _bool=True)
	USE_NOTIFICATIONS = _get_var("ADMIN_NOTIFICATIONS", _bool=True)

	privUsername = privPassword = None
	FIREBASE_TOKEN = None
	TELEGRAM_TOKEN = None
	TELEGRAM_TARGET_UID = None

	if ALLOW_DEV_ACCESS:
		privUsername = _get_var("DEV_USER")
		privPassword = _get_var("DEV_PASW")
		if not privUsername or not privPassword:
			print("[eDAP] [WARN] Dev access has been DISABLED; both user & password need to be specified!")
			ALLOW_DEV_ACCESS = False

	if USE_FIREBASE:
		FIREBASE_TOKEN = _get_var("FIREBASE_TOKEN")
		if not FIREBASE_TOKEN:
			print("[eDAP] [WARN] Firebase has been DISABLED; no FCM token was specified!")
			USE_FIREBASE = False

	if USE_NOTIFICATIONS:
		TELEGRAM_TOKEN = _get_var("TELEGRAM_TOKEN")
		TELEGRAM_TARGET_UID = _get_var("TELEGRAM_TARGET_UID")
		if not TELEGRAM_TOKEN or not TELEGRAM_TARGET_UID:
			print("[eDAP] [WARN] Administrative notifications have been disabled; both the bot token and target UID need to be specified!")

	print("[eDAP] [INFO] Developer access enabled: %s" % ALLOW_DEV_ACCESS)
	print("[eDAP] [INFO] Using Cloudflare: %s" % USE_CLOUDFLARE)
	print("[eDAP] [INFO] Using Firebase: %s" % USE_FIREBASE)
	print("[eDAP] [INFO] Send administrative notifications: %s" % USE_NOTIFICATIONS)
	return {
		"DATA_FOLDER": DATA_FOLDER,
		"USE_CLOUDFLARE": USE_CLOUDFLARE,
		"ALLOW_DEV_ACCESS": ALLOW_DEV_ACCESS,
		"privUsername": privUsername,
		"privPassword": privPassword,
		"USE_FIREBASE": USE_FIREBASE,
		"FIREBASE_TOKEN": FIREBASE_TOKEN,
		"VAULT_SERVER": VAULT_SERVER,
		"VAULT_TOKEN_READ": VAULT_TOKEN_READ,
		"VAULT_TOKEN_WRITE": VAULT_TOKEN_WRITE,
		"USE_NOTIFICATIONS": USE_NOTIFICATIONS,
		"TELEGRAM_TOKEN": TELEGRAM_TOKEN,
		"TELEGRAM_TARGET_UID": TELEGRAM_TARGET_UID
	}

def read_log(exclude_syncing=False) -> str:
	"""
		Read the log file. Setting `exclude_syncing` to True will exclude
		all lines from the `get_class_profile` function.
	"""
	log_lines = []
	with open(_join_path(config["DATA_FOLDER"], "edap_api.log")) as f:
		for x in f.readlines():
			if exclude_syncing and 'get_class_profile' in x:
				continue
			log_lines.append(x)
	return ''.join(log_lines)

def make_html(title="eDAP dev", content=None, bare=False) -> str:
	"""
		HTML creator template for the /dev/ dashboard. Allows specifying the title,
		content, and if the page needs to have no header (e.g. the /dev/log page).
	"""
	if not bare:
		return '<!DOCTYPE html><html><head><title>%s</title></head><body><h1>%s</h1>%s</body></html>' % (title, title, content)
	else:
		return '<!DOCTYPE html><html><head><title>%s</title></head><body>%s</body></html>' % (title, content)

# https://stackoverflow.com/a/14822210
def convert_size(size_bytes: int):
	"""
		Convert bytes to a human-readable format.
	"""
	if size_bytes == 0:
		return "0B"
	size_name = ("B", "KB", "MB", "GB", "TB", "PB", "EB", "ZB", "YB")
	i = int(_math_floor(_math_log(size_bytes, 1024)))
	p = _math_pow(1024, i)
	s = round(size_bytes / p, 2)
	return "%s %s" % (s, size_name[i])

def _init_db(host: str = "localhost", port: int = 6379, db: int = 0) -> redis.Redis:
	"""
		Initialize the Redis DB.
	"""
	try:
		r = redis.Redis(host=host, port=port, db=db)
		if r.ping():
			log.info("Database connection successful")
			return r
		else:
			log.critical("Database connection failed!")
			_exit(1)
	except redis.exceptions.ConnectionError:
		log.critical("Database connection failed!")
		_exit(1)

def get_data(token: str):
	"""
		Retreive JSON from Redis by token, format it from bytes to string,
		and return it as a dict.
	"""
	return _json_load(_redis.get("token:" + token).decode("utf-8"))

def get_tokens() -> List[str]:
	"""
		Return a list of all tokens in the DB.
	"""
	return [i.decode('utf-8').replace("token:", "") for i in _redis.keys('token:*')]

def _user_in_database(token: str) -> bool:
	"""
		Check if a given token exists in the DB.
	"""
	return "token:" + token in [i.decode('utf-8') for i in _redis.keys('token:*')]

def _class_id_exists(token: str, cid: int) -> bool:
	"""
		Check if a given class ID exists in the DB. Assumes that userInDatabase()
		was already called and returned True.
	"""
	data = get_data(token)['data']['classes']
	if cid <= len(data) and cid > 0:
		return 'full' in data[cid]

def _subject_id_exists(token: str, cid: int, sid: int) -> bool:
	"""
		Check if a given subject ID exists in the DB. Assumes that userInDatabase()
		and classIDExists() were both already called and returned True.
	"""
	return sid in range(len(get_data(token)['data']['classes'][cid]['subjects']))

def fetch_new_class(token: str, class_id: int):
	"""
		Fetch a new class. Handles all the background credential collection
		and other things.
	"""
	full_data = get_data(token)
	# If not already pulled
	if not 'full' in full_data['data']['classes'][class_id]:
		credentials = get_credentials(token)
		edap_object = edap.edap(credentials['username'], credentials['password'])
		# Get the classes so they're saved in the object
		edap_object.getClasses()
		# Overwrite existing "bare" class profile with new complete profile
		full_data['data']['classes'][class_id] = get_class_profile(
			edap_object,
			class_id,
			full_data['data']['classes'][class_id]
		)
		save_data(token, full_data)

def populate_data(obj) -> dict:
	"""
		Call get_class_profile() to initialize the data object in
		a newly-created profile.
		TODO: Should probably be removed and the invoking code
		refactored to just call get_class_profile().
	"""
	data_dict = {'classes':None}
	try:
		output = obj.getClasses()
	except Exception as e:
		log.error("Error getting classes: %s", e)
		raise e

	output[0] = get_class_profile(obj, 0, output[0])
	data_dict['classes'] = output
	return data_dict

def get_class_profile(obj, class_id: int, class_obj) -> dict:
	"""
		Add/modify a list of classes from eDAP. `class_id` is the
		class ID that will be "expanded" (add grades, exams, etc.)
		and class_obj is the class object to which the data will
		be assigned to.

		TODO: Refactor a lot of this and the invoking code, makes
		very little sense right now.
	"""
	try:
		# Get a list of current tests and all tests
		tests_nowonly = obj.getTests(class_id, alltests=False)
		tests_all = obj.getTests(class_id, alltests=True)
		# Init a testId var so we can assign an ID to the tests
		testId = 0
		for x in tests_all:
			# Check if a test is present in the list of current tests
			# and mark it as such (so we know which ones to show and
			# which to ignore)
			if x not in tests_nowonly:
				x['current'] = False
			else:
				x['current'] = True
			x['id'] = testId
			testId += 1
		# Create a new 'tests' item in the dictionary
		class_obj['tests'] = tests_all
	except Exception as e:
		log.error("Error getting tests for class: %s", e)
		class_obj['tests'] = None

	try:
		# Get an overview of absences (counters)
		absences_overview = obj.getAbsenceOverview(class_id)
		class_obj['absences'] = {'overview':absences_overview, 'full': []}
	except Exception as e:
		log.error("Error getting absence overview for class: %s", e)
		class_obj['absences'] = {'overview': None, 'full': []}
	try:
		# If we have an overview, we can continue with making a full
		# list of absences, sorted by day.
		if class_obj['absences']['overview']:
			absences_full = obj.getAbsenceList(class_id)
			class_obj['absences']['full'] = absences_full
	except Exception as e:
		log.error("Error getting absence full list for class: %s", e)

	try:
		# Get a list of subjects
		class_obj['subjects'] = obj.getSubjects(class_id)
	except Exception as e:
		log.error("Error getting subjects for class: %s", e)
		class_obj['subjects'] = None
	# Init a list of average grades for all subjects (for calculating
	# the general average)
	allSubjAverageGrades = []
	for z in range(len(class_obj['subjects'])):
		class_obj['subjects'][z]['id'] = z
		try:
			# Get a list of all grades
			class_obj['subjects'][z]['grades'] = obj.getGrades(class_id, z)
			# Check if we have a concluded grade
			isconcl, concluded = obj.getConcludedGrade(0, z)
			# Store the boolean for use in the UI
			class_obj['subjects'][z]['concluded'] = isconcl
			if isconcl:
				# Skip calculating grade if it's already concluded
				class_obj['subjects'][z]['average'] = concluded
				allSubjAverageGrades.append(concluded)
			elif class_obj['subjects'][z]['grades']:
				# Otherwise do the standard calculating (sum(grades)/len(grades))
				lgrades = []
				for i in class_obj['subjects'][z]['grades']:
					lgrades.append(i['grade'])
				class_obj['subjects'][z]['average'] = _round(sum(lgrades)/len(lgrades), 2)
				allSubjAverageGrades.append(_round(sum(lgrades)/len(lgrades), 0))
			else:
				log.debug('No grades for sID %s', z)
		except Exception as e:
			log.error("Error getting grades for subject %s: %s", z, e)
			class_obj['subjects'][z]['grades'] = []
		try:
			# Get a list of notes
			class_obj['subjects'][z]['notes'] = obj.getNotes(class_id, z)
		except Exception as e:
			log.error("Error getting notes for subject %s: %s", z, e)
			class_obj['subjects'][z]['notes'] = []
	try:
		# Calculate the general average
		class_obj['complete_avg'] = _round(sum(allSubjAverageGrades)/len(allSubjAverageGrades), 2)
	except ZeroDivisionError:
		# Avoid division by zero/no grades
		class_obj['complete_avg'] = 0
	try:
		# Finally, get user information
		class_obj['info'] = obj.getInfo(0)
	except Exception as e:
		log.error("Error getting info: %s", str(e))
		class_obj['info'] = None
	# Mark it as full/expanded
	class_obj['full'] = True
	return class_obj

def verify_dev_request(token: str) -> bool:
	"""
		Verify if a given dev API token is valid.
	"""
	return "dev-token:" + token in [i.decode('utf-8') for i in _redis.keys('dev-token:*')]

def add_dev_token() -> str:
	"""
		Authorizes a dev API token.
	"""
	token = hash_password(random_string(28))
	_redis.set('dev-token:' + token, 'ALLOWED')
	return token

def verify_request(token: str, class_id=None, subject_id=None) -> bool:
	"""
		Verify if a given token, class_id, and/or subject_id exist in the DB.
	"""
	if not _user_in_database(token):
		log.debug("Token %s not in DB", token)
		return False
	if class_id:
		if not _class_id_exists(token, class_id):
			log.debug("Class ID %s does not exist for token %s", class_id, token)
			return False
	if subject_id:
		if not _subject_id_exists(token, class_id, subject_id):
			log.debug("Subject ID %s does not exist for class ID %s for token %s", subject_id, class_id, token)
			return False
	return True

def hash_string(inp: str) -> str:
	"""
		Return the MD5 hash of a string. Used for tokens.
	"""
	return _MD5HASH(inp.encode()).hexdigest()

def hash_password(inp: str) -> str:
	"""
		Return the SHA256 hash of a string. Used for the /dev/ password.
	"""
	return _SHA256HASH(inp.encode()).hexdigest()

def get_counter(counter_id: str) -> int:
	"""
		Get a value of a counter by its ID.
	"""
	val = _redis.get("counter:"+counter_id)
	if val is None:
		_redis.set("counter:"+counter_id, 0)
		return 0
	return int(val)

def _set_counter(counter_id: str, value: int):
	"""
		Set a counter to an integer value.
	"""
	_redis.set("counter:"+counter_id, value)

def update_counter(counter_id: str):
	"""
		Increment a counter by 1.
	"""
	val = get_counter(counter_id)
	_set_counter(counter_id, val+1)

def get_db_keys() -> int:
	"""
		Get the number of stored keys in the Redis DB.
	"""
	return _redis.dbsize()

def get_db_info() -> dict:
	"""
		Get info about the Redis DB.
	"""
	return _redis.info()

def optimize_db_aof():
	"""
		Optimize/rewrite the AOF.
	"""
	_redis.bgrewriteaof()

config = _read_config()
logging.basicConfig(
	filename=_join_path(config["DATA_FOLDER"], "edap_api.log"),
	level=logging.INFO,
	format="%(asctime)s || %(funcName)-16s || %(levelname)-8s || %(message)s"
)
_redis = _init_db()
