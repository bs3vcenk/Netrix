import requests, edap, logging, configparser
from os.path import exists as file_exists

## Init logging
logging.basicConfig(
	level=logging.INFO,
	format="%(asctime)s > %(funcName)s(%(levelname)s) => %(message)s"
)
log = logging.getLogger(__name__)

CONFIG_FILE = '/opt/fetcher.config'

## These values will be read from the config file
SERVER = None
TOKEN = None
NAME = None

## These values will be further configured by initialize()
session = requests.Session()

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

def process_job(job):
	"""
		Process job depending on type.
	"""
	if job['type'] == 'fetch':
		# TODO: Implement
		log.info('Starting fetch job')
	else:
		log.warning('Unknown job type %s', job['type'])

def register():
	"""
		Register as active with server.
	"""
	register_data = {
		'name': NAME
	}
	session.post('%s/remote/nodes/%s' % (SERVER, NAME), data=register_data)

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
		req = session.get('%s/remote/check')
	except (requests.exceptions.ConnectionError, requests.exceptions.Timeout, requests.exceptions.SSLError) as e:
		log.critical('Failed to reach master server: %s', e)
		raise ServerUnreachable(e)
	if req.status_code != 200:
		log.critical('Server responded with non-200 status code: %s', req.status_code)
		raise ServerUnreachable('Server responded with non-200 status code: %s' % req.status_code)

	# All checks have been passed
	log.info('Configuration verified')

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
	register()

if __name__ == "__main__":
	main()
