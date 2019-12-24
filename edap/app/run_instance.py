"""
Run a local instance of eDAP for testing.
"""
from threading import Thread
from random import randint
from tempfile import mkdtemp
from time import sleep
from redis import Redis
from sys import exit as _exit
from subprocess import check_output
from os import environ

directory = mkdtemp()
port = randint(30000, 60000)

def log(level: str, lstr: str):
	print('[dev] [%s] %s' % (level, lstr))

def run_redis(datadir):
	"""Start redis, meant to be run in the background"""
	check_output(['redis-server',
	              '--daemonize', 'no',
	              '--bind', '127.0.0.1',
	              '--appendonly', 'yes',
	              '--dir', datadir])

# Start redis
redis_thread = Thread(target=run_redis, args=(directory,))
redis_thread.start()
log('INFO', 'Started Redis in the background, waiting 2 seconds...')
sleep(2)
r = Redis()
if r.ping():
	log('INFO', 'Successfully connected to Redis')
else:
	log('CRIT', 'Failed to connect to Redis; did not respond to ping')
	_exit(1)

# Disable Vault
environ["VAULT"] = "N"
# Set storage path to our temp directory
environ["DATA_FOLDER"] = directory
# Enable /dev/ endpoints
environ["DEV_ACCESS"] = "Y"
# Set username to "user"
environ["DEV_USER"] = "user"
# Set password to SHA256 hash of "password"
environ["DEV_PASW"] = "5e884898da28047151d0e56f8dc6292773603d0d6aabbdd62a11ef721d1542d8"
from api import app

log('INFO', 'Starting; listening on port %s' % port)
log('INFO', 'Dev access enabled with username \'user\' and password \'password\'')
try:
	app.run(host='0.0.0.0', port=port)
finally:
	r.shutdown()
	log('INFO', 'Stopped Redis')
