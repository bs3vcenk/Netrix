import logging, redis
from hashlib import md5 as _MD5HASH
from hashlib import sha256 as _SHA256HASH
from json import loads as _jsonLoad
from json import dumps as _jsonConvert
from sys import exit as _exit
from math import floor as _mFloor
from math import log as _mLog
from math import pow as _mPow
from os import environ
from os.path import exists as _fileExists
from os.path import join as _joinPath
from os.path import getsize as _getFileSize
from google.cloud import firestore
from pyfcm import FCMNotification
from threading import Timer
from time import time as _time

log = logging.getLogger(__name__)
fbPushService = None
fbFirestoreDB = None
r = None

def saveData(token, dataObj):
	r.set('token:' + token, _jsonConvert(dataObj))

def getDBSize():
	return _getFileSize(_joinPath(config["DATA_FOLDER"], "appendonly.aof"))

def timeGenerated(startTime):
	return "<small>Page generated in %0.3f ms</small>" % ((_time() - startTime)*1000.0)

def sendNotification(token, title, content):
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

class RepeatedTimer(object):
	"""
		Taken from https://stackoverflow.com/a/13151299

		Runs a given function x every y seconds, with x being defined
		in self.function (2nd argument) and y being defined in
		in self.interval (1st argument).
	"""
	def __init__(self, interval, function, *args, **kwargs):
		self._timer     = None
		self.interval   = interval
		self.function   = function
		self.args       = args
		self.kwargs     = kwargs
		self.is_running = False
		self.start()

	def _run(self):
		self.is_running = False
		self.start()
		self.function(*self.args, **self.kwargs)

	def start(self):
		if not self.is_running:
			self._timer = Timer(self.interval, self._run)
			self._timer.start()
			self.is_running = True

	def stop(self):
		self._timer.cancel()
		self.is_running = False

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
		"ALLOW_DEV_ACCESS": ALLOW_DEV_ACCESS,
		"USE_CLOUDFLARE": USE_CLOUDFLARE,
		"USE_FIREBASE": USE_FIREBASE,
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

def updateData(token):
	"""
		Update the stored data for a token.
	"""
	if not verifyRequest(token):
		log.error("Bad token %s" % token)
		raise Exception('Bad token')
	o = getData(token)
	username = o["user"]
	log.info(username)
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

config = readConfig()
logging.basicConfig(
	filename=_joinPath(config["DATA_FOLDER"], "edap_api.log"),
	level=logging.INFO,
	format="%(asctime)s || %(funcName)-16s || %(levelname)-8s || %(message)s"
)
r = initDB()
