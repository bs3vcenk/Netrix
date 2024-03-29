"""
eDAP-API backend functions
====

This module contains various functions which interact with the backend
of the eDAP-API system.
"""

import logging, redis, edap, requests, setproctitle, gc
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
from threading import Thread, currentThread
from time import sleep
from string import ascii_letters
from typing import List
from api_backend_config import Config
from datetime import datetime
from dateutil.relativedelta import relativedelta

log = logging.getLogger(__name__)
_redis = None

_threads = {}

class NonExistentSetting(Exception):
	"""Specified setting ID is non-existent."""

def _get_month_start_timestamp(input_date: int) -> int:
	return int(datetime.fromtimestamp(input_date).replace(hour=0, minute=0, day=1).timestamp())

def _filter_grade_list_by_date(input_gradelist: list, from_date: int, to_date: int) -> list:
	"""
		Filter a list of grade objects by showing only grades in
		a specified month span.
	"""
	return list(filter(lambda x: from_date <= x['date'] <= to_date, input_gradelist))

def _search_dict_list(input_list: list, key, match, return_type: str = 'boolean'):
	"""
		Search a list of dictionaries (`input_list`) and return if dict[`key`] matches
		`match`. If the item does not exist, it will return None (unless `return_type`
		is `bool`).

		`return_type` can be:
			boolean - return True if the object exists and False if it does not (default)
			index - return the position of the element in the list
			object - return the result
	"""
	result = next((item for item in input_list if item[key] == match), None)
	if return_type == 'boolean':
		return result != None
	elif return_type == 'object' or result == None:
		return result
	elif return_type == 'index':
		try:
			return input_list.index(result)
		except ValueError:
			return None
	else:
		raise Exception('Unknown `return_type` value `%s`' % return_type)

def graph_average(input_gradelist: list) -> list:
	"""
		Return the history of a user's average by month. This is used to
		construct the graph in the client.
	"""
	# Sort the grade list so we can assume the first element is the oldest,
	# and the last is the newest
	sorted_input_list = sorted(input_gradelist, key=lambda k: k['date'])
	grades_sorted_by_month = []
	# List of months
	months_to_scan = [9, 10, 11, 12, 1, 2, 3, 4, 5, 6]
	# Get lower limit for our grade range (oldest grade)
	lower_month_limit = _get_month_start_timestamp(sorted_input_list[0]['date'])
	# Get upper limit (newest grade)
	upper_month_limit = int((datetime.fromtimestamp(sorted_input_list[-1]['date']) + relativedelta(months=1)).timestamp())
	sclist = [datetime.fromtimestamp(lower_month_limit) + relativedelta(months=1)]
	for _ in months_to_scan[1:]:
		sclist.append(sclist[-1] + relativedelta(months=1))
	for current_month in sclist:
		if current_month.timestamp() > upper_month_limit:
			break
		# Filter grade list to include every grade between the oldest one and the last one
		# in the current month
		glist = _filter_grade_list_by_date(sorted_input_list, lower_month_limit, int(current_month.timestamp()))
		# Set up/configure our dictionary
		scan_result = _search_dict_list(grades_sorted_by_month, 'month', current_month.month - 1)
		if not scan_result:
			grades_sorted_by_month.append({'month': current_month.month - 1, 'grades': {}})
		# Iterate over grades in the filtered list
		for grade in glist:
			if grade['subject'] not in grades_sorted_by_month[-1]['grades']:
				grades_sorted_by_month[-1]['grades'][grade['subject']] = []
			grades_sorted_by_month[-1]['grades'][grade['subject']].append(grade)
	# Initialize the variable we'll return
	returnable = []
	# Calculate averages for each of the subjects, then calculate the overall
	# average for each month
	for month in grades_sorted_by_month:
		subject_averages = []
		for subject_id in month['grades']:
			if month['grades'][subject_id]:
				gradesx = [x['grade'] for x in month['grades'][subject_id]]
				subject_averages.append(
					_round(sum(gradesx)/len(gradesx), 0)
				)
		returnable.append({
			'month': int(month['month']),
			'average': _round(sum(subject_averages)/len(subject_averages), 2) if subject_averages else 0
		})
	# Sort final list by month in descending order
	returnable.sort(key=lambda k: k['month'])
	return returnable

def memory_summary():
	"""
		Use Pympler to get a summary of used memory. This is used for
		debugging memory leaks in live environments (with /dev/ endpoints
		enabled).
	"""
	from pympler import summary, muppy
	mem_summary = summary.summarize(muppy.get_objects())
	rows = summary.format_(mem_summary)
	return '\n'.join(rows)

def do_startup_checks():
	"""
		Verify we've got a correctly configured server.
	"""
	# Check if we're using Vault
	if not config.vault.enabled:
		log.warning('Vault not being used - passwords will be stored insecurely!')
	else:
		log.info('Vault used for credential storage')
		# Check Vault server scheme
		if "https://" not in config.vault.server and ("localhost" not in config.vault.server or "127.0.0.1" not in config.vault.server or "::1" not in config.vault.server):
			log.critical('Vault will not be accessed through HTTPS! This is an insecure and unsupported configuration; shutting down now.')
			_exit(1)
		# Check if we can reach Vault
		try:
			reqst = requests.get('%s/v1/sys/health' % config.vault.server)
			reqst.raise_for_status()
		except requests.exceptions.MissingSchema:
			log.critical('Configuration error - incorrect address specified as Vault server (%s)', config.vault.server)
			log.critical('Perhaps missing http:// or https:// ?')
			_exit(1)
		except requests.exceptions.ConnectionError:
			log.critical('Connection error - failed while connecting to the Vault server')
			_exit(1)
		except requests.exceptions.HTTPError:
			log.critical('Vault error - server is up but responded with non-200 code')
			_exit(1)
		health = reqst.json()
		if health['sealed']:
			log.critical('Vault error - vault is sealed')
			_exit(1)

def get_vault_info() -> dict:
	"""
		Get info about Hashicorp Vault.
	"""
	# Return immediately if Vault is not enabled
	if not config.vault.enabled:
		return {'enabled': False}
	# Otherwise setup an HTTP session
	session = requests.Session()
	session.headers = {'X-Vault-Token': config.vault.read_token}
	# Set up an object we'll edit with more data later and return
	returnable = {'enabled': True}
	# Get Vault health
	health = session.get('%s/v1/sys/health' % config.vault.server).json()
	# Store seal status and version in object
	returnable['sealed'] = health['sealed']
	returnable['version'] = health['version']
	# Check TTL (Time-To-Live) for the read token
	read_token_status = session.get('%s/v1/auth/token/lookup-self' % config.vault.server).json()
	returnable['read_token_ttl'] = read_token_status['data']['ttl']
	# Check TTL (Time-To-Live) for the write token
	write_token_status = session.get('%s/v1/auth/token/lookup-self' % config.vault.server, headers={'X-Vault-Token': config.vault.write_token}).json()
	returnable['write_token_ttl'] = write_token_status['data']['ttl']
	return returnable

def _round(n, decimals=0):
	"""
		Improved round function. Rounds .5 upwards instead of builtin
		round()'s downwards rounding.
		Taken from this StackOverflow answer: https://stackoverflow.com/a/52617883
	"""
	expoN = n * 10 ** decimals
	if abs(expoN) - abs(_math_floor(expoN)) < 0.5:
		return _math_floor(expoN) / 10 ** decimals
	return _math_ceil(expoN) / 10 ** decimals

def _send_telegram_notification(message: str, parse_mode: str = "Markdown"):
	"""
		Send a notification through Telegram. Refer to https://core.telegram.org/bots/api#sendMessage
		for more info on what this does.
	"""
	requests.post(
		'https://api.telegram.org/bot%s/sendMessage' % config.error_notifications.telegram_token,
		data={
			"chat_id": config.error_notifications.telegram_uid,
			"text": message,
			"parse_mode": parse_mode
		}
	)

def notify_error(problem_header: str, component: str, stacktrace=None, additional_info: dict = None):
	"""
		Format (Markdown) and send a notification about an exception/error.

		This is a kind of intermediary function, just in case I implement
		more notification providers later on.

		Messages will look like this:
		<HEADER>
		Component: <whichever component failed>
		<additional_info key>: <value>
		...

		If `stacktrace` is supplied, that will also be sent as a separate message.
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
		Decide which method to use to get credentials based on config.
	"""
	if config.vault.enabled:
		return _get_credentials_vault(token)
	else:
		return _get_credentials_redis(token)

def set_credentials(token: str, username: str, password: str):
	"""
		Decide which method to use to set credentials based on config.
	"""
	if config.vault.enabled:
		return _set_credentials_vault(token, username, password)
	else:
		return _set_credentials_redis(token, username, password)

def _get_credentials_redis(token: str):
	"""
		Get credential object from Redis (insecure).
	"""
	c_object = _redis.get('creds:%s' % token)
	if c_object:
		return _json_load(c_object)

def _set_credentials_redis(token: str, username: str, password: str):
	"""
		Write credentials into Redis (insecure).
	"""
	c_object = {
		"username": username,
		"password": password
	}
	_redis.set('creds:%s' % token, _json_convert(c_object))

def _get_credentials_vault(token: str):
	"""
		Call Vault to get the creds for a token.
	"""
	data = requests.get(
		'%s/v1/secret/data/%s' % (config.vault.server, token),
		headers={'X-Vault-Token': config.vault.read_token}
	)
	try:
		data.raise_for_status()
	except requests.exceptions.HTTPError:
		log.critical('Failed to access credentials!')
		if config.error_notifications.enabled:
			notify_error('VAULT GET ERROR', 'vault', additional_info={"token": token})
	return data.json()["data"]["data"]

def _set_credentials_vault(token: str, username: str, password: str):
	"""
		Call Vault to set a credential pair for a token.
	"""
	data = requests.post(
		'%s/v1/secret/data/%s' % (config.vault.server, token),
		headers={'X-Vault-Token': config.vault.write_token},
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
		if config.error_notifications.enabled:
			notify_error('VAULT SET ERROR', 'vault', additional_info={"token": token})

def rm_credentials(token: str):
	"""
		Call Vault to remove a credential pair for a token.
	"""
	data = requests.delete(
		'%s/v1/secret/data/%s' % (config.vault.server, token),
		headers={'X-Vault-Token': config.vault.write_token}
	)
	try:
		data.raise_for_status()
	except requests.exceptions.HTTPError:
		log.critical('Failed to delete credentials!')
		if config.error_notifications.enabled:
			notify_error('VAULT DELETE ERROR', 'vault', additional_info={"token": token})

def _exit(exitCode: int):
	"""
		Present additional information on exit (exit code and instructions).
	"""
	print("!!! Exited with code %i\n    If possible, check the log file for more information.\n    Make sure you configured eDAP correctly! Read the documentation\n    completely and verify your configuration." % exitCode)
	_sys_exit(exitCode)

def localize(token: str, notif_type: str) -> str:
	"""
		Localize a string according to the language reported by
		the phone through /api/stats.
	"""
	locs = {
		"note": "Nova bilješka",
		"grade": "Nova ocjena",
		"absence": "Novi izostanak",
		"test": "Novi ispit",
		"class": "Novi razred"
	}
	return locs[notif_type]

def random_string(length: int) -> str:
	"""
		Return a random string of a specified length.
	"""
	return ''.join(_random_choice(ascii_letters) for _ in range(length))

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

def process_setting(token: str, action: str, val):
	"""
		Modify user settings. Currently, this is only used to control notifications.

		`action` can be:
			notif.disable - whether to send notifications; `val` is of type `bool`
			notif.ignore.add - add a notification type to the blacklist; `val` is of type `str`
			notif.ignore.del - remove a notification type from the blacklist; `val` is of type `str`

		Notification types can be: grade, note, test, absence.
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
	toSendQueue = [] # List of notifications to send
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
		Get the subject name belonging to a subject ID.
	"""
	if not verify_request(token, class_id, subject_id):
		raise Exception('Bad auth data')
	return get_data(token)['data']['classes'][class_id]['subjects'][subject_id]['subject']

def _stop_sync(token: str):
	"""
		Stop background sync thread for a given token. This will stop the
		thread on the next run (once `sleep()` finishes inside the thread).
	"""
	if "sync:" + token in _threads:
		_threads["sync:" + token]["obj"].do_run = False

def get_sync_threads() -> List[str]:
	"""
		Get a list of sync threads.
	"""
	return [i.replace("sync:", "") for i in _threads]

def start_sync(token: str):
	"""
		Start a background sync thread for a given token.
	"""
	global _threads
	if "sync:" + token not in _threads:
		to = Thread(target=_sync, args=(token,))
		to.start()
		_threads["sync:" + token] = {"obj":to, "run":True}

def restore_syncs():
	"""
		Restore all sync threads (this is run on startup).
	"""
	tokens = get_tokens()
	log.info('Starting sync threads for %s tokens', len(tokens))
	for token in tokens:
		if not 'ignore_updating' in get_data(token):
			start_sync(token)

def sync_dev(data2, token: str):
	"""
		DEV: Simulate sync with two objects.
	"""
	log.info("Simulating sync for %s", token)
	o = get_data(token)
	diff = _profile_difference(o["data"], data2)
	if diff:
		log.info("Difference detected: %s", diff)
		o["new"] = diff
		save_data(token, o)
		_formatAndSendNotification(token, diff)
	else:
		log.warning("No difference detected (??) This should not happen :P")

def sync(token: str):
	"""
		Pull remote data, compare with current and replace if needed.
	"""
	log.debug("Syncing %s", token)
	fData = get_data(token)
	if config.firebase.enabled:
		fb_token_info = get_firebase_info(fData['firebase_device_token'])
		if not fb_token_info['status']:
			# Inactive token, stop sync
			log.warning('Inactive token %s detected, stopping sync', token)
			purge_token(token)
			return
	data = fData["data"] # Old data
	credentials = get_credentials(token)
	nData = populate_data(edap.edap(credentials["username"], credentials["password"])) # New data
	diff = _profile_difference(data, nData)
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
	# Free memory
	gc.collect()

def _profile_difference(dObj1, dObj2) -> List[dict]:
	"""
		Return the difference between two student data dicts.
	"""
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
	t1 = deepcopy(dObj1['classes'][0]['absences']['full'])
	t2 = deepcopy(dObj2['classes'][0]['absences']['full'])
	difflist = [x for x in t2 if x not in t1]
	if difflist:
		log.info("Found difference in absences")
		_finalReturn.append({'type':'absence', 'classId':0, 'data':None})
	## PER-SUBJECT GRADE DIFFERENCE (FIRST CLASS ONLY) ##
	# Iterating over two lists at once using `zip()`: https://stackoverflow.com/a/1663826
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
	return _get_file_size(_join_path(config.storage, "appendonly.aof"))

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
	if firebase_token:
		a = requests.get(
			'https://iid.googleapis.com/iid/info/' + firebase_token,
			params={'details': 'true'},
			headers={
				"Authorization": "key=%s" % config.firebase.token
			}
		)
		token_status = True
		if a.status_code != 200:
			token_status = False
		return {'status': token_status, 'data': a.json()}
	return {'status': False, 'data': {'error': 'E_FB_TOKEN_NULL'}}

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
		# https://firebase.google.com/docs/cloud-messaging/http-server-ref
		# TODO: Migrate to new API
		a = requests.post(
			'https://fcm.googleapis.com/fcm/send',
			json=out_json,
			headers={
				"Authorization": "key=%s" % config.firebase.token
			}
		)
		a.raise_for_status()
	except requests.exceptions.HTTPError as e:
		log.error('Non-200 code (Firebase Cloud Messaging) => %s', str(e))
		raise e

def _sync(token: str):
	"""
		Wrapper around sync, for bg execution (random timeout).
	"""
	setproctitle.setproctitle('eDAP sync thread [%s]' % token)
	t = currentThread()
	while getattr(t, 'do_run', True):
		val = randint(config.sync.min_delay, config.sync.max_delay)
		log.debug("Waiting %i s for %s", val, token)
		sleep(val)
		sync(token)
	log.info('Sync thread %s ending', token)

def _get_var(varname: str, _bool: bool = False, default=None):
	"""
		Get environment variable and return it if it exists. If _bool is True,
		return it as a boolean value. If default is set, return its value if
		the given variable does not exist.
	"""
	try:
		return environ[varname] if not _bool else environ[varname] == "Y"
	except KeyError:
		return default

def _read_config() -> Config:
	"""
		Read, verify and print the configuration.
	"""
	cfg_obj = Config()

	cfg_obj.storage = _get_var("DATA_FOLDER", default="/data")
	print("[eDAP] [INFO] Storing data in: %s" % cfg_obj.storage)

	cfg_obj.vault.enabled = _get_var("VAULT", _bool=True, default=True)
	print("[eDAP] [INFO] Using Hashicorp Vault: %s" % cfg_obj.vault.enabled)

	if cfg_obj.vault.enabled:
		cfg_obj.vault.server = _get_var("VAULT_SERVER")
		cfg_obj.vault.read_token = _get_var("VAULT_TOKEN_READ")
		cfg_obj.vault.write_token = _get_var("VAULT_TOKEN_WRITE")
		if not cfg_obj.vault.read_token or not cfg_obj.vault.write_token:
			print("[eDAP] [ERROR] Vault read and/or write tokens not specified!")
			_exit(1)
		elif not cfg_obj.vault.server:
			print("[eDAP] [ERROR] Vault server not specified!")
			_exit(1)
		print("[eDAP] [INFO] Hashicorp Vault server at: %s" % cfg_obj.vault.server)
	else:
		print("[eDAP] [WARN] Not using Vault for credential storage -- storing data insecurely in Redis!")

	cfg_obj.dev.enabled = _get_var("DEV_ACCESS", _bool=True)
	cfg_obj.firebase.enabled = _get_var("FIREBASE", _bool=True)
	cfg_obj.error_notifications.enabled = _get_var("ADMIN_NOTIFICATIONS", _bool=True)
	cfg_obj.sync.min_delay = int(_get_var("SYNC_TIME_MIN", default=1800))
	cfg_obj.sync.max_delay = int(_get_var("SYNC_TIME_MAX", default=6000))
	cfg_obj.sync.auto_adjust = _get_var("SYNC_TIME_AUTOADJUST", _bool=True)

	if cfg_obj.dev.enabled:
		cfg_obj.dev.username = _get_var("DEV_USER")
		cfg_obj.dev.password = _get_var("DEV_PASW")
		if not cfg_obj.dev.username or not cfg_obj.dev.password:
			print("[eDAP] [WARN] Dev access has been DISABLED; both user & password need to be specified!")
			cfg_obj.dev.enabled = False

	if cfg_obj.firebase.enabled:
		cfg_obj.firebase.token = _get_var("FIREBASE_TOKEN")
		if not cfg_obj.firebase.token:
			print("[eDAP] [WARN] Firebase has been DISABLED; no FCM token was specified!")
			cfg_obj.firebase.enabled = False

	if cfg_obj.error_notifications.enabled:
		cfg_obj.error_notifications.telegram_token = _get_var("TELEGRAM_TOKEN")
		cfg_obj.error_notifications.telegram_uid = _get_var("TELEGRAM_TARGET_UID")
		if not cfg_obj.error_notifications.telegram_token or not cfg_obj.error_notifications.telegram_uid:
			print("[eDAP] [WARN] Administrative notifications have been disabled; both the bot token and target UID need to be specified!")
			cfg_obj.error_notifications.enabled = False

	cfg_obj.redis.connection_type = _get_var("REDIS_CONN_TYPE", default='tcp')
	cfg_obj.redis.address = _get_var("REDIS_ADDR", default='127.0.0.1')
	cfg_obj.redis.port = int(_get_var("REDIS_PORT", default=6379))

	print("[eDAP] [INFO] Developer access enabled: %s" % cfg_obj.dev.enabled)
	print("[eDAP] [INFO] Using Firebase: %s" % cfg_obj.firebase.enabled)
	print("[eDAP] [INFO] Send administrative notifications: %s" % cfg_obj.error_notifications.enabled)
	print("[eDAP] [INFO] Waiting between %s and %s seconds before syncing for each user" % (cfg_obj.sync.min_delay, cfg_obj.sync.max_delay))
	print("[eDAP] [INFO] Automatically adjusting sync times: %s" % cfg_obj.sync.auto_adjust)
	print("[eDAP] [INFO] Redis connection type: %s" % ('TCP' if cfg_obj.redis.connection_type == 'tcp' else 'UNIX socket'))
	print("[eDAP] [INFO] Redis address/path: %s" % cfg_obj.redis.address)
	if cfg_obj.redis.connection_type == 'tcp':
		print("[eDAP] [INFO] Redis port: %s" % cfg_obj.redis.port)
	print()
	print("[eDAP] [INFO] Further logging is in %s/edap_api.log" % cfg_obj.storage)
	return cfg_obj

def read_log() -> str:
	"""
		Read the log file.
	"""
	with open(_join_path(config.storage, "edap_api.log")) as f:
		return f.read()

def make_html(title="eDAP dev", content=None, bare=False) -> str:
	"""
		HTML creator template for the /dev/ dashboard. Allows specifying the title,
		content, and if the page needs to have a header.
	"""
	if not bare:
		return '<!DOCTYPE html><html><head><title>%s</title></head><body><h1>%s</h1>%s</body></html>' % (title, title, content)
	else:
		return '<!DOCTYPE html><html><head><title>%s</title></head><body>%s</body></html>' % (title, content)

def convert_size(size_bytes: int):
	"""
		Convert bytes to a human-readable format.
		Taken from this StackOverflow answer: https://stackoverflow.com/a/14822210
	"""
	if size_bytes == 0:
		return "0B"
	size_name = ("B", "KB", "MB", "GB", "TB", "PB", "EB", "ZB", "YB")
	i = int(_math_floor(_math_log(size_bytes, 1024)))
	p = _math_pow(1024, i)
	s = round(size_bytes / p, 2)
	return "%s %s" % (s, size_name[i])

def _init_db(host: str = "localhost", port: int = 6379, db: int = 0, unix_socket: bool = False) -> redis.Redis:
	"""
		Initialize the Redis DB by connecting to it and running a
		`ping` command.
	"""
	try:
		if unix_socket:
			cpool = redis.ConnectionPool(connection_class=redis.UnixDomainSocketConnection, path=host)
			r = redis.Redis(connection_pool=cpool, db=db)
		else:
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
	try:
		return _json_load(_redis.get("token:" + token).decode("utf-8"))
	except AttributeError:
		notify_error('DATA GET ERROR', 'get_data', additional_info={'token':token})

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
	"""
	# TODO: Should probably be merged with `get_class_profile()`.
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
	"""
	# TODO: Rewrite a lot of this and the invoking code, makes very little sense right now; handle exceptions properly.
	obj.switchActiveClass(class_id)
	try:
		# Get a list of current tests and all tests
		tests = obj.getTests()
		# Init a testId var so we can assign an ID to the tests
		testId = 0
		for x in tests:
			x['id'] = testId
			testId += 1
		# Create a new 'tests' item in the dictionary
		class_obj['tests'] = tests
	except Exception as e:
		log.error("Error getting tests for class: %s", e)
		class_obj['tests'] = None

	"""
	try:
		# Get an overview of absences (counters)
		absences_overview = obj.getAbsenceOverview(class_id)
		class_obj['absences'] = {'overview':absences_overview, 'full': []}
	except Exception as e:
		log.error("Error getting absence overview for class: %s", e)
		class_obj['absences'] = {'overview': None, 'full': []}
	"""
	try:
		# If we have an overview, we can continue with making a full
		# list of absences, sorted by day.
		if class_obj['absences']['overview']:
			absences_full = obj.getAbsenceList()
			class_obj['absences']['full'] = absences_full
	except Exception as e:
		log.error("Error getting absence full list for class: %s", e)

	try:
		# Get a list of subjects
		class_obj['subjects'] = obj.getSubjects()
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
			class_obj['subjects'][z]['grades'], class_obj['subjects'][z]['notes'] = obj.getGrades(z)
			# Check if we have a concluded grade
			isconcl, concluded = obj.getConcludedGrade(z)
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
		# Calculate the general average
		class_obj['complete_avg'] = _round(sum(allSubjAverageGrades)/len(allSubjAverageGrades), 2)
	except ZeroDivisionError:
		# Avoid division by zero/no grades
		class_obj['complete_avg'] = 0
	"""
	try:
		# Finally, get user information
		class_obj['info'] = obj.getInfo(0)
	except Exception as e:
		log.error("Error getting info: %s", str(e))
		class_obj['info'] = None
	"""
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

def get_db_keys() -> int:
	"""
		Get the number of stored keys in the Redis DB.
	"""
	return _redis.dbsize()

def get_db_info() -> dict:
	"""
		Get info about the Redis DB. (https://redis.io/commands/info)
	"""
	return _redis.info()

def optimize_db_aof():
	"""
		Optimize/rewrite the AOF. (https://redis.io/commands/bgrewriteaof)
	"""
	_redis.bgrewriteaof()

config = _read_config()
logging.basicConfig(
	filename=_join_path(config.storage, "edap_api.log"),
	level=logging.INFO,
	format="%(asctime)s > %(levelname)s => %(message)s"
)
logging._srcfile = None
_redis = _init_db(
	host=config.redis.address,
	port=config.redis.port,
	unix_socket=(config.redis.connection_type == 'unix')
)
