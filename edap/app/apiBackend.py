import logging, redis, edap
from hashlib import md5 as _MD5HASH
from hashlib import sha256 as _SHA256HASH
from json import loads as _jsonLoad
from json import dumps as _jsonConvert
from copy import deepcopy
from random import randint
from random import choice as _randomChoice
from sys import exit as _sysExit
from math import floor as _mFloor
from math import log as _mLog
from math import pow as _mPow
from os import environ
from os.path import exists as _fileExists
from os.path import join as _joinPath
from os.path import getsize as _getFileSize
from google.cloud import firestore
from pyfcm import FCMNotification
from threading import Thread
from time import sleep
from time import clock as _clock
from string import ascii_letters

log = logging.getLogger(__name__)
fbPushService = None
fbFirestoreDB = None
r = None

threads = {}

class NonExistentSetting(Exception):
	pass

def _exit(exitCode):
	print("!!! Exiting with code %i\n    Check the log file for more information." % exitCode)
	_sysExit(exitCode)

def localize(token, locId):
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
		}
	}
	lang = getData(token)['lang']
	return locs[lang][locId]

def random_string(length: int) -> str:
    return ''.join(_randomChoice(ascii_letters) for m in range(length))

def generateTestUser() -> (str, str, str):
	"""
		Generate a user for testing purposes.
	"""
	user = random_string(6)
	pasw = random_string(10)
	token = hashString(user + ":" + pasw)
	data = {
		'user': user,
		'pasw': pasw,
		'ignore_updating': True,
		'data': {
			'info': {
				"address": "Street, Place",
				"birthdate": "1. 1. 2000.",
				"birthplace": "City, Country",
				"name": "Name Surname",
				"number": 1,
				"program": "Program"
			},
			'classes': [
				{
					"class": "1.a",
					"classmaster": "Classmaster",
					"complete_avg": 4.20,
					"school_city": "City",
					"school_name": "School Name",
					"year": "6969./6969.",
					"subjects": [
						{
							"average": 4.20,
							"id": 0,
							"professors": ["Professor", "Professor", "Professor", "Professor", "Professor", "Professor"],
							"subject": "Subject Name"
						}
					],
					"tests": [
						{
							"current": True,
							"date": 1565208831,
							"id": 0,
							"subject": "School subject",
							"test": "Test subject"
						}
					],
					"absences": {"overview":{"awaiting":0,"justified":0,"sum":0,"sum_leftover":0,"unjustified":0}, "full":[]}
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
	saveData(token, data)
	return user, pasw, token

def getSetting(token, action):
	"""
		Get action data/value for token.
	"""
	o = getData(token)
	if 'settings' not in o.keys():
		o['settings'] = {'notif':{'disable': False, 'ignore':[]}}
	if action == 'notif.disable':
		return o['settings']['notif']['disable']
	elif action == 'notif.ignore':
		return o['settings']['notif']['ignore']
	elif action == 'notif.all':
		return o['settings']['notif']
	else:
		raise NonExistentSetting

def processSetting(token, action, val):
	"""
		Do an action, with val as the data/arguments on a profile.
	"""
	o = getData(token)
	if 'settings' not in o.keys():
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
	saveData(token, o)

def purgeToken(token):
	"""
		Remove a token from the DB and terminate its sync thread.
	"""
	log.info("LOGOUT => %s" % token)
	stopSync(token)
	r.delete('token:' + token)

def formatAndSendNotification(token, notifData):
	"""
		Format a notification for the user based on data gotten from
		profileDifference() in sync().
	"""
	classNotif = []
	gradeNotif = []
	testNotif = []
	noteNotif = []
	absenceNotif = ""
	toSendQueue = []
	exceptions = getData(token)['settings']['notif']['ignore']
	for x in notifData:
		if x['type'] == 'class' and 'class' not in exceptions:
			classNotif.append("%s (%s)" % (x['data']['class'], x['data']['class']))
		elif x['type'] == 'test' and 'test' not in exceptions:
			testNotif.append("%s: %s" % (x['data']['subject'], x['data']['test']))
		elif x['type'] == 'grade' and 'grade' not in exceptions:
			gradeNotif.append("%s: %s (%s)" % (getNameForSubjId(token, x['classId'], x['subjectId']), x['data']['grade'], x['data']['note']))
		elif x['type'] == 'note' and 'note' not in exceptions:
			noteNotif.append("%s: %s" % (getNameForSubjId(token, x['classId'], x['subjectId']), x['data']['note']))
		elif x['type'] == 'absence' and 'absence' not in exceptions:
			absenceNotif = "ABS"
	if len(classNotif) > 0:
		toSendQueue.append({
			'head': localize(token, 'class'),
			'content': ", ".join(classNotif)
		})
	if len(gradeNotif) > 0:
		toSendQueue.append({
			'head': localize(token, 'grade'),
			'content': ", ".join(gradeNotif)
		})
	if len(testNotif) > 0:
		toSendQueue.append({
			'head': localize(token, 'test'),
			'content': ", ".join(testNotif)
		})
	if len(noteNotif) > 0:
		toSendQueue.append({
			'head': localize(token, 'note'),
			'content': ", ".join(noteNotif)
		})
	if len(absenceNotif) > 0:
		toSendQueue.append({
			'head': localize(token, 'absence'),
			'content': absenceNotif
		})
	for i in toSendQueue:
		sendNotification(token, i['head'], i['content'])

def getNameForSubjId(token, class_id, subject_id):
	"""
		Get the name belonging to a subject ID.
	"""
	if not verifyRequest(token, class_id, subject_id):
		raise Exception('Bad auth data')
	return getData(token)['data']['classes'][class_id]['subjects'][subject_id]['subject']

def stopSync(token):
	"""
		Stop background sync thread for a given token, e.g. if
		terminated.
	"""
	if "sync:" + token in threads.keys():
		threads["sync:" + token]["run"] = False

def getSyncThreads():
	"""
		Get a list of sync threads.
	"""
	return [i.replace("sync:", "") for i in threads.keys()]

def isThreadAlive(token):
	"""
		Return the isAlive() of the sync thread belonging to a
		given token.
	"""
	return threads["sync:" + token]["obj"].isAlive()

def startSync(token):
	"""
		Start a sync thread for a given token.
	"""
	global threads
	if "sync:" + token not in threads:
		to = Thread(target=_sync, args=(token,))
		to.start()
		threads["sync:" + token] = {"obj":None, "run":True}
		threads["sync:" + token]["obj"] = to

def restoreSyncs():
	"""
		Restore all sync threads (on startup).
	"""
	global threads
	for token in getTokens():
		if 'ignore_updating' in getData(token).keys():
			startSync(token)

def syncDev(data2, token):
	"""
		DEV: Simulate sync with two objects.
	"""
	log.debug("Simulating sync")
	o = getData(token)
	diff = profileDifference(o["data"], data2)
	if len(diff) > 0:
		log.debug("Difference detected")
		o["new"] = diff
		saveData(token, o)
		formatAndSendNotification(token, diff)

def sync(token):
	"""
		Pull remote data, compare with current and replace if needed.
	"""
	log.debug("Syncing %s" % token)
	fData = getData(token)
	data = fData["data"] # Old data
	nData = populateData(edap.edap(fData["user"], fData["pasw"])) # New data
	diff = profileDifference(data, nData)
	if len(diff) > 0:
		fData["data"] = nData
		fData["new"] = diff
		saveData(token, fData)
		formatAndSendNotification(token, diff)

def profileDifference(dObj1, dObj2):
	"""
		Return the difference between two student data dicts.
	"""
	start = _clock()
	_finalReturn = []
	## CLASS DIFFERENCE ##
	t1 = deepcopy(dObj1['classes'])
	t2 = deepcopy(dObj2['classes'])
	for y in [t1,t2]:
		del y[0]['tests']
		del y[0]['subjects']
	difflist = [x for x in t2 if x not in t1]
	if len(difflist) > 0:
		log.debug("Found difference in classes")
		for i in difflist:
			_finalReturn.append({'type':'class', 'data':{'year':i["year"], 'class':i["class"]}})
		# At this point, we can't compare anything else, as only the
		# first class' information is pulled by populateData(), so
		# we'll just return.
		return _finalReturn
	## TEST DIFFERENCE (FIRST CLASS ONLY) ##
	t1 = deepcopy(dObj1['classes'][0]['tests'])
	t2 = deepcopy(dObj2['classes'][0]['tests'])
	difflist = [x for x in t2 if x not in t1]
	if len(difflist) > 0:
		log.debug("Found difference in tests")
		for i in difflist:
			_finalReturn.append({'type':'test', 'classId':0, 'data':i})
	## ABSENCE DIFFERENCE (FIRST CLASS ONLY) ##
	# Only check length to avoid spamming notifications for
	# each class period.
	t1 = deepcopy(dObj1['classes'][0]['absences']['full'])
	t2 = deepcopy(dObj2['classes'][0]['absences']['full'])
	if len(t1) != len(t2):
		log.info("Found difference in absences")
		_finalReturn.append({'type':'absence', 'classId':0, 'data':{'diff':len(t2)-len(t1)}})
	## PER-SUBJECT GRADE DIFFERENCE (FIRST CLASS ONLY) ##
	# https://stackoverflow.com/a/1663826
	sId = 0
	for i, j in zip(dObj1['classes'][0]['subjects'], dObj2['classes'][0]['subjects']):
		if "grades" in j.keys():
			if j["grades"] == None:
				continue
			t1 = deepcopy(i['grades'])
			t2 = deepcopy(j['grades'])
			difflist = [x for x in t2 if x not in t1]
			if len(difflist) > 0:
				log.debug("Found difference in grades")
				for x in difflist:
					_finalReturn.append({'type':'grade', 'classId':0, 'subjectId': sId, 'data':x})
		elif "notes" in j.keys():
			if j["notes"] == None:
				continue
			t1 = deepcopy(i['notes'])
			t2 = deepcopy(j['notes'])
			difflist = [x for x in t2 if x not in t1]
			if len(difflist) > 0:
				log.debug("Found difference in notes")
				for x in difflist:
					_finalReturn.append({'type':'note', 'classId':0, 'subjectId': sId, 'data':x})
		else:
			continue
		sId += 1
	request_time = _clock() - start
	log.debug("==> TIMER => {0:.0f}ms".format(request_time))
	return _finalReturn

def saveData(token, dataObj):
	"""
		Save data for a token.
	"""
	r.set('token:' + token, _jsonConvert(dataObj))

def getDBSize():
	"""
		Get the size of Redis' appendonly.aof database in bytes.
	"""
	return _getFileSize(_joinPath(config["DATA_FOLDER"], "appendonly.aof"))

def timeGenerated(startTime):
	"""
		Return a templated "Page generated in <time>" footer for dynamic
		/dev/ pages.
	"""
	return "<small>Page generated in %0.3f ms</small>" % ((_clock() - startTime)*1000.0)

def sendNotification(token, title, content, data=None):
	"""
		Send a notification to a user's device through Firebase.
	"""
	if not verifyRequest(token):
		raise Exception("Bad token")
	log.info("Sending notification to %s" % token)
	documentReference = fbFirestoreDB.collection('devices').document(token)

	try:
		doc = documentReference.get()
		firebaseToken = doc.to_dict()["token"]
	except Exception as e:
		log.error('Error in Firestore => %s' % str(e))
		raise e

	try:
		fbPushService.notify_single_device(registration_id=firebaseToken, message_title=title, message_body=content, data_message=data)
	except Exception as e:
		log.error('Unknown error (Firebase Cloud Messaging) => %s' % str(e))
		raise e

def _sync(token):
	"""
		Wrapper around sync, for bg execution (random timeout).
	"""
	while True:
		val = randint(3600,5000)
		log.debug("Waiting %i s for %s" % (val, token))
		sleep(val)
		if threads["sync:" + token]["run"] != True:
			del threads["sync:" + token]
			break
		sync(token)

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

def initGoogleToken(fpath):
	if not _fileExists(fpath):
		print("ERROR => File %s given to initGoogleToken() does not exist!" % fpath)
		_exit(1)
	environ["GOOGLE_APPLICATION_CREDENTIALS"] = fpath

def readConfig():
	global fbPushService
	global fbFirestoreDB
	DATA_FOLDER = getVar("DATA_FOLDER", default="/data")
	GOOGLE_TOKEN_FILE = getVar("GOOGLE_TOKEN_FILE", default="google_creds.json")

	ALLOW_DEV_ACCESS = getVar("DEV_ACCESS", _bool=True)
	USE_CLOUDFLARE = getVar("CLOUDFLARE", _bool=True)
	USE_FIREBASE = getVar("FIREBASE", _bool=True)

	privUsername = privPassword = None
	FIREBASE_TOKEN = None

	if ALLOW_DEV_ACCESS:
		privUsername = getVar("DEV_USER")
		privPassword = getVar("DEV_PASW")
		if not privUsername or not privPassword:
			print("[configuration] Dev access has been disabled, either no user or pass specified")
			privUsername = privPassword = None
			ALLOW_DEV_ACCESS = False

	if USE_FIREBASE:
		FIREBASE_TOKEN = getVar("FIREBASE_TOKEN")
		initGoogleToken(_joinPath(DATA_FOLDER, GOOGLE_TOKEN_FILE))
		if not FIREBASE_TOKEN:
			print("[configuration] Firebase has been disabled, no token specified")
			USE_FIREBASE = False
		else:
			print("[configuration] Initializing Firebase Cloud Messaging...")
			fbPushService = FCMNotification(api_key=FIREBASE_TOKEN)
			print("[configuration] Initializing Firestore...")
			fbFirestoreDB = firestore.Client()
	return {
		"DATA_FOLDER": DATA_FOLDER,
		"GOOGLE_TOKEN_FILE": GOOGLE_TOKEN_FILE,
		"USE_CLOUDFLARE": USE_CLOUDFLARE,
		"ALLOW_DEV_ACCESS": ALLOW_DEV_ACCESS,
		"privUsername": privUsername,
		"privPassword": privPassword,
		"USE_FIREBASE": USE_FIREBASE,
		"FIREBASE_TOKEN": FIREBASE_TOKEN
	}

def readLog():
	with open(_joinPath(config["DATA_FOLDER"], "edap_api.log")) as f:
		return f.read()

def makeHTML(title="eDAP dev", content="None", bare=False):
	"""
		HTML creator template for the /dev/ dashboard. Allows specifying the title,
		content, and if the page needs to have no header (e.g. the /dev/log page).
	"""
	if bare == False:
		return '<!DOCTYPE html><html><head><title>%s</title></head><body><h1>%s</h1>%s</body></html>' % (title, title, content)
	elif bare == True:
		return '<!DOCTYPE html><html><head><title>%s</title></head><body>%s</body></html>' % (title, content)

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

def initDB(host="localhost", port=6379, db=0):
	"""
		Initialize the Redis DB.
	"""
	try:
		r = redis.Redis(host=host, port=port, db=db)
		r.get('token:*')
		log.info("Database connection successful")
		return r
	except redis.exceptions.ConnectionError:
		log.critical("Database connection failed!")
		_exit(1)

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

def populateData(obj=None, username=None, password=None, time=False):
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
	start = _clock()
	dataDict = {'classes':None, 'info':None}
	try:
		output = obj.getClasses()
	except Exception as e:
		log.error("Error getting classes: %s" % e)
		raise e

	try:
		tests_nowonly = obj.getTests(0, alltests=False)
		tests_all = obj.getTests(0, alltests=True)
		testId = 0
		for x in tests_all:
			if x not in tests_nowonly:
				x['current'] = False
			else:
				x['current'] = True
			x['id'] = testId
			testId += 1
		output[0]['tests'] = tests_all
	except Exception as e:
		log.debug("Error getting tests for class: %s" % e)
		output[0]['tests'] = None

	try:
		absences_overview = obj.getAbsentOverviewForClass(0)
		absences_full = obj.getAbsentFullListForClass(0)
		output[0]['absences'] = {'overview':absences_overview, 'full':absences_full}
	except Exception as e:
		log.debug("Error getting absences for class: %s" % e)
		output[0]['absences'] = None

	try:
		output[0]['subjects'] = obj.getSubjects(0)
	except Exception as e:
		log.debug("Error getting subjects for class: %s" % e)
		output[0]['subjects'] = None
	allSubjAverageGrades = []
	for z in range(len(output[0]['subjects'])):
		output[0]['subjects'][z]['id'] = z
		try:
			output[0]['subjects'][z]['grades'] = obj.getGradesForSubject(0, z)
			if len(output[0]['subjects'][z]['grades']) == 0:
				output[0]['subjects'][z]['grades'] = None
			isconcl, concluded = obj.getConcludedGradeForSubject(0, z)
			if isconcl:
				output[0]['subjects'][z]['average'] = concluded
				allSubjAverageGrades.append(concluded)
			else:
				lgrades = []
				for i in output[0]['subjects'][z]['grades']:
					lgrades.append(i['grade'])
				output[0]['subjects'][z]['average'] = round(sum(lgrades)/len(lgrades), 2)
				allSubjAverageGrades.append(round(sum(lgrades)/len(lgrades), 0))
		except Exception as e:
			log.debug("Error getting grades for subject %s: %s" % (z, e))
			output[0]['subjects'][z]['grades'] = None
			continue
		try:
			output[0]['subjects'][z]['notes'] = obj.getNotesForSubject(0, z)
			if len(output[0]['subjects'][z]['notes']) == 0:
				output[0]['subjects'][z]['notes'] = None
		except Exception as e:
			log.debug("Error getting notes for subject %s: %s" % (z, e))
			output[0]['subjects'][z]['notes'] = None
			continue
	output[0]['complete_avg'] = round(sum(allSubjAverageGrades)/len(allSubjAverageGrades), 2)
	dataDict['classes'] = output
	try:
		dataDict['info'] = obj.getInfoForUser(0)
	except Exception as e:
		log.debug("Error getting info: %s" % (str(e)))
	request_time = _clock() - start
	if time == False:
		log.debug("==> TIMER => {0:.0f}ms".format(request_time))
	else:
		log.info("==> TIMER => {0:.0f}ms".format(request_time))
	return dataDict

def updateData(token):
	"""
		Update the stored data for a token.
	"""
	if not verifyRequest(token):
		raise Exception('Bad token')
	o = getData(token)
	username = o["user"]
	log.debug(username)
	o['data'] = populateData()

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

def getCounter(counter_id):
	val = r.get("counter:"+counter_id)
	if val == None:
		r.set("counter:"+counter_id, 0)
		return 0
	else:
		try:
			return int(val)
		except:
			r.set("counter:"+counter_id, 0)
			return 0

def setCounter(counter_id, value):
	r.set("counter:"+counter_id, value)

def updateCounter(counter_id):
	val = getCounter(counter_id)
	setCounter(counter_id, val+1)

config = readConfig()
logging.basicConfig(
	filename=_joinPath(config["DATA_FOLDER"], "edap_api.log"),
	level=logging.INFO,
	format="%(asctime)s || %(funcName)-16s || %(levelname)-8s || %(message)s"
)
r = initDB()
