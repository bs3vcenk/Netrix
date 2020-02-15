"""
eDAP-API backend config provider
===

This module exports the Config class, which is used by api_backend.by
to store its configuration.
"""

class Config:
	"""
		The main configuration class; separated into subclasses.

		sync: User data sync parameters.
		vault: Hashicorp Vault parameters.
		dev: Dev access (/dev/ endpoint) parameters.
		firebase: FCM (Firebase Cloud Messaging) parameters.
		cloudflare: Cloudflare parameters.
		error_notifications: Parameters for notifications about critical errors.
	"""
	storage = '/data'

	class sync:
		"""
			User data sync parameters.

			max_delay: The upper limit when choosing a delay time between syncs.
			min_delay: The lower limit when choosing a delay time between syncs.
			auto_adjust: Whether to automatically adjust global sync times based on the current day or period.
		"""
		min_delay = 3600
		max_delay = 6000
		auto_adjust = True

	class vault:
		"""
			Hashicorp Vault parameters.

			enabled: Whether to use Vault for credentials. If disabled, credentials will be stored in plain text in Redis.
			server: The server address, e.g. "https://vault.netrix.io"
			read_token: Vault token which will be used for making read requests.
			write_token: Vault token which will be used for making write requests.
		"""
		enabled = False
		server = ""
		read_token = None
		write_token = None

	class dev:
		"""
			Dev access (/dev/ endpoint) parameters.

			enabled: Whether to enable the /dev/ endpoint. Disabling it also disables token access.
			username: Plain text username
			password: SHA256 hash
		"""
		enabled = False
		username = None
		password = None

	class firebase:
		"""
			FCM (Firebase Cloud Messaging) parameters.

			enabled: Whether to use FCM to send messages to users.
			token: FCM Admin token.
		"""
		enabled = False
		token = None

	class cloudflare:
		"""
			Cloudflare parameters. Enabling this will read the country and IP from
			CF's headers.

			enabled: Whether to enable Cloudflare integration.
		"""
		enabled = False

	class error_notifications:
		"""
			Parameters for notifications about critical errors.

			enabled: Whether to enable notifications.
			telegram_token: Telegram bot token.
			telegram_uid: The UID of the user to which messages will be sent to.
		"""
		enabled = False
		telegram_token = None
		telegram_uid = None

	class redis:
		"""
			Parameters for establishing a connection to the Redis DB.

			connection_type: `tcp` or `unix`.
			address: IP address or UNIX socket path.
			port: If type is `tcp`, this is the port to which we will connect to.
		"""
		connection_type = 'tcp'
		address = '127.0.0.1'
		port = 6379

	class fetcher:
		token = "test"