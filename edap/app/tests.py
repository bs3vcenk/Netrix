import httpx, os, tempfile, subprocess, threading, redis, sys, json
from time import sleep
from hashlib import md5

directory = tempfile.mkdtemp()

REMOTE = False
REMOTE_URL = None	

def log(level: str, lstr: str):
	print('[test] [%s] %s' % (level, lstr))

if "--remote" in sys.argv:
	REMOTE = True
	REMOTE_URL = sys.argv[sys.argv.index("--remote")+1]
	log('INFO', 'Targeting remote server @ %s instead of locally' % REMOTE_URL)

username = os.environ.get('ED_USERNAME')
password = os.environ.get('ED_PASSWORD')
if not username or not password:
	log('ERROR', 'No username or password specified! Use environment variables ED_USERNAME and ED_PASSWORD.')
	sys.exit(1)
token = md5(('%s:%s' % (username, password)).encode()).hexdigest()

def run_redis(datadir):
	"""Start redis, meant to be run in the background"""
	subprocess.check_output(['redis-server',
	                         '--daemonize', 'no',
	                         '--bind', '127.0.0.1',
	                         '--appendonly', 'yes',
	                         '--dir', datadir])

if not REMOTE:
	# Start redis
	redis_thread = threading.Thread(target=run_redis, args=(directory,))
	redis_thread.start()
	log('INFO', 'Started Redis in the background, waiting 2 seconds...')
	sleep(2)
	r = redis.Redis()
	if r.ping():
		log('INFO', 'Successfully established connection to Redis')
	else:
		log('ERROR', 'Failed to connect to Redis')
		sys.exit(1)

def get_data():
	return json.loads(r.get('token:%s' % token))

if not REMOTE:
	# Configure eDAP-API
	os.environ["VAULT"] = "N"
	os.environ["DATA_FOLDER"] = directory
	from api import app

try:
	with httpx.Client(base_url='http://app/' if not REMOTE else REMOTE_URL, app=app if not REMOTE else None) as client:
		### LOGIN
		## LOGIN: Pre-fetch checks
		log('TEST', 'login:bad_json')
		request = client.post('/api/login', json={
			'invalid': 'json'
		})
		assert request.status_code == 400, "Invalid JSON did not return 'Bad Request'"
		log('TEST', 'login:null_value')
		request = client.post('/api/login', json={
			'username': None,
			'password': None
		})
		assert request.status_code == 401, "Credentials with null value did not return 'Unauthorized'"
		log('TEST', 'login:length_check')
		request = client.post('/api/login', json={
			'username': 'abc',
			'password': 'def'
		})
		assert request.status_code == 401, "Sub-5-character credentials did not return 'Unauthorized'"
		log('TEST', 'login:pattern_detection')
		request_a = client.post('/api/login', json={
			'username': 'ime.prezime@skolers.org',
			'password': 'ovo_je_lozinka'
		})
		assert request_a.status_code == 401, "Username with @skolers.org did not return 'Unauthorized'"
		request_b = client.post('/api/login', json={
			'username': 'ime.prezime@gmail.com',
			'password': 'ovo_je_lozinka'
		})
		assert request_b.status_code == 401, "Username with @gmail.com did not return 'Unauthorized'"
		request_c = client.post('/api/login', json={
			'username': '@ime.prezime',
			'password': 'ovo_je_lozinka'
		})
		assert request_c.status_code == 401, "Username starting with @ did not return 'Unauthorized'"
		## LOGIN: Login process
		log('TEST', 'login:general')
		request = client.post('/api/login', json={
			'username': username,
			'password': password
		})
		assert request.status_code == 200, "Login request was not successful"
		## LOGIN: Response validity
		log('TEST', 'login:token_validity')
		_r = request.json()
		assert 'token' in _r, "No 'token' field in response from login request"
		assert _r['token'] == token, "Token in response is not equal to locally calculated token"
		### DATA
		## DATA: Save Firebase token
		log('TEST', 'data:firebase')
		request = client.post('/api/user/%s/firebase' % token, json={
			'deviceToken': 'ovo_je_neki_firebase_token1234567890'
		})
		assert request.status_code == 200, "Token save was not successful"
		if not REMOTE:
			user_data = get_data()
			assert user_data['firebase_device_token'] == 'ovo_je_neki_firebase_token1234567890', "Token was not saved to Redis"
		### ACCESS
		## ACCESS: Token check
		log('TEST', 'access:token')
		request = client.get('/api/user/rANdOMtOKeN123456/classes')
		assert request.status_code == 401, "Non-existent token access did not return 'Unauthorized'"
		## DATA: Classes
		log('TEST', 'data:classes')
		request = client.get('/api/user/%s/classes' % token)
		assert request.status_code == 200, "Classes fetch was not successful"
		_r = request.json()
		assert 'classes' in _r, "No 'classes' field in response"
		for i, class_obj in enumerate(_r['classes']):
			assert 'class' in class_obj, "No 'class' field in class ID %s" % i
			assert 'classmaster' in class_obj, "No 'classmaster' field in class ID %s" % i
			assert 'school_city' in class_obj, "No 'school_city' field in class ID %s" % i
			assert 'school_name' in class_obj, "No 'school_name' field in class ID %s" % i
			assert 'year' in class_obj, "No 'year' field in class ID %s" % i
		## DATA: Info
		log('TEST', 'data:user_info')
		request = client.get('/api/user/%s/classes/0/info' % token)
		assert request.status_code == 200, "Info fetch was not successful"
		_r = request.json()
		assert 'birthdate' in _r, "No 'birthdate' field in info"
		assert 'birthplace' in _r, "No 'birthplace' field in info"
		assert 'name' in _r, "No 'name' field in info"
		assert 'number' in _r, "No 'number' field in info"
		assert isinstance(_r['number'], int), "'number' field in info is not an integer"
		assert 'program' in _r, "No 'program' field in info"

finally:
	print()
	log('INFO', 'TEST FINISHED')
	if not REMOTE:
		redis_info = r.info()
		log('INFO', '[Redis] Total commands processed: %s' % redis_info['total_commands_processed'])
		log('INFO', '[Redis] Peak used memory: %s' % redis_info['used_memory_peak_human'])
		log('INFO', 'Shutting down Redis')
		r.shutdown()
