FROM alpine:latest

    # Install run dependencies
RUN apk add --no-cache nginx python3 uwsgi-python3 redis libxml2 libxslt libstdc++ \
	# Install build dependencies
	&& apk add --no-cache --virtual .bdep \
		python3-dev \
		openssl-dev \
		git \
		build-base \
		libxml2-dev \
		libxslt-dev \
	# Install Supervisor \
	&& python3 -m pip install git+https://github.com/Supervisor/supervisor \
	# Show NGINX logs in docker logs output
	&& ln -sf /dev/stdout /var/log/nginx/access.log \
	&& ln -sf /dev/stderr /var/log/nginx/error.log

# Expose HTTP/S
EXPOSE 80
EXPOSE 443

# Install dependencies
COPY requirements.txt /req.txt
RUN python3 -m pip install -r /req.txt

# Clean up
RUN apk del .bdep \
	&& rm -rf /root/.cache /req.txt \
	&& rm -rf /sbin/apk /etc/apk /lib/apk /usr/share/apk /var/lib/apk

# General uWSGI config
COPY uwsgi.ini /etc/uwsgi/
# Custom Supervisord config
COPY supervisord.conf /etc/supervisord.conf
# Which uWSGI .ini file should be used, to make it customizable
ENV UWSGI_INI /edap/uwsgi.ini

# Add eDAP
COPY ./app /edap
WORKDIR /edap

# Default eDAP config
ENV DATA_FOLDER /data
ENV GOOGLE_TOKEN_FILE google_creds.json
ENV DEV_ACCESS N
ENV CLOUDFLARE N
ENV FIREBASE N
ENV SSL N
ENV SERVER_NAME api.netrix.io

# Copy the entrypoint that will generate Nginx additional configs
COPY entrypoint.sh /entrypoint.sh
RUN chmod +x /entrypoint.sh

ENTRYPOINT ["sh", "/entrypoint.sh"]

CMD ["/usr/bin/supervisord"]
