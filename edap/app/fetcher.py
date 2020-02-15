import requests, edap, logging, configparser, os
from os.path import exists as file_exists
from apscheduler.schedulers.background import BackgroundScheduler
from math import floor as _math_floor
from math import ceil as _math_ceil

## Init logging
logging.basicConfig(
	level=logging.INFO,
	format="%(asctime)s > %(levelname)s => %(message)s"
)
log = logging.getLogger(__name__)

JOB_SEARCH_INTERVAL = 5 # seconds

CONFIG_FILE = os.environ.get('FETCHER_CONFIG', '/opt/fetcher.config')

## These values will be read from the config file
SERVER = None
TOKEN = None
NAME = None

## These values will be further configured in the code
session = requests.Session()
scheduler = BackgroundScheduler()

## Exceptions
class eDAPFetcherError(Exception):
	"""
		Base exception class.
	"""

class BadConfiguration(eDAPFetcherError):
	"""
		Error while parsing/verifying config.
	"""

class NoConfiguration(eDAPFetcherError):
	"""
		Configuration file does not exist (only in __main__).
	"""

class ServerUnreachable(eDAPFetcherError):
	"""
		Master server is unreachable.
	"""

class RegistrationDenied(eDAPFetcherError):
	"""
		Registration failed
	"""

def get_jobs():
	"""
		Ask master server for jobs.
	"""
	return session.get('%s/remote/jobs').json()

def get_job_data(job_id: str):
	"""
		Get data about and for a job.
	"""
	return session.get('%s/remote/jobs/%s' % (SERVER, job_id)).json()

def send_job_result(job_id: str, success: bool, result):
	"""
		Send job result.
	"""
	job_result_object = {
		'success': success,
		'result': result
	}
	session.post('%s/remote/jobs/%s' % (SERVER, job_id), data=job_result_object)

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

def _populate_data(obj) -> dict:
	"""
		Call get_class_profile() to initialize the data object in
		a newly-created profile.
	"""
	data_dict = {'classes':None}
	try:
		output = obj.getClasses()
	except Exception as e:
		log.error("Error getting classes: %s", e)
		raise e

	output[0] = _get_class_profile(obj, 0, output[0])
	data_dict['classes'] = output
	return data_dict

def _get_class_profile(obj, class_id: int, class_obj) -> dict:
	"""
		Add/modify a list of classes from eDAP. `class_id` is the
		class ID that will be "expanded" (add grades, exams, etc.)
		and class_obj is the class object to which the data will
		be assigned to.
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

def process_job(job):
	"""
		Process job depending on type.
	"""
	if job['type'] == 'fetch':
		# fetch job:
		# {
		# 	'type': 'fetch',
		#	'id': '...',
		# 	'data': {
		#		'username': '...',
		#		'password': '...'
		# 	}
		# }
		job_data = job['data']
		edap_obj = edap.edap(job_data['username'], job_data['password'])
		retdata = None
		try:
			retdata = _populate_data(edap_obj)
			success = True
		except:
			success = False
		send_job_result(job['id'], success, retdata)
	else:
		log.warning('Unknown job type %s', job['type'])

def register():
	"""
		Register as active with server.
	"""
	register_data = {
		'name': NAME
	}
	req = session.post('%s/remote/nodes/%s' % (SERVER, NAME), data=register_data)
	if req.status_code != 200:
		log.critical('Non-200 response in registration: %s', req.status_code)
		raise RegistrationDenied('Server HTTP response: %s' % req.status_code)

def ask_and_run_jobs():
	"""
		Ask for and execute jobs.
	"""
	jobs = get_jobs()['jobs']
	log.info('Fetched %s jobs', len(jobs))
	for job in jobs:
		process_job(job)

def initialize():
	"""
		Verify and initialize variables.
	"""
	if SERVER == None:
		raise BadConfiguration('SERVER variable not defined')
	elif TOKEN == None:
		raise BadConfiguration('TOKEN variable not defined')
	elif NAME == None:
		raise BadConfiguration('NAME variable not defined')

	# Configure requests.Session
	session.headers = {
		'User-Agent': 'eDAP-Fetcher',
		'X-API-Token': TOKEN
	}
	# Verify server is reachable
	try:
		req = session.get('%s/remote/check' % SERVER)
	except (requests.exceptions.ConnectionError, requests.exceptions.Timeout, requests.exceptions.SSLError) as e:
		log.critical('Failed to reach master server: %s', e)
		raise ServerUnreachable(e)
	if req.status_code != 200:
		log.critical('Server responded with non-200 status code: %s', req.status_code)
		raise ServerUnreachable('Server responded with non-200 status code: %s' % req.status_code)

	# All checks have been passed
	log.info('Configuration verified, registering')
	register()
	log.info('Registered successfully')

def schedule():
	"""
		Schedule and start background job search.
	"""
	scheduler.add_job(func=ask_and_run_jobs, trigger='interval', seconds=JOB_SEARCH_INTERVAL)
	scheduler.start()

def main():
	"""
		Function run if in __main__
	"""
	global SERVER
	global TOKEN
	global NAME
	if not file_exists(CONFIG_FILE):
		log.critical('%s does not exist', CONFIG_FILE)
		raise NoConfiguration('%s does not exist' % CONFIG_FILE)
	log.info('Reading configuration...')
	config = configparser.ConfigParser()
	config.read(CONFIG_FILE)
	if 'name' not in config['fetcher'] or 'master' not in config['fetcher'] or 'server_token' not in config['fetcher']:
		log.critical('Configuration file is missing name, master or server_token entries')
		raise BadConfiguration('Configuration file is missing name, master or server_token entries')
	SERVER = config['fetcher']['master']
	TOKEN = config['fetcher']['server_token']
	NAME = config['fetcher']['name']
	log.info('Connecting with ID %s', NAME)
	initialize()
	log.info('Starting job poll')
	schedule()

if __name__ == "__main__":
	main()
