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

# Add overlay
COPY overlay/ /

# Install dependencies
COPY requirements.txt /req.txt
RUN python3 -m pip install -r /req.txt \
    # Clean up
    && apk del .bdep \
	&& rm -rf /root/.cache /req.txt \
	&& rm -rf /sbin/apk /etc/apk /lib/apk /usr/share/apk /var/lib/apk

# Add eDAP
COPY app /edap

ENTRYPOINT ["sh", "/entrypoint.sh"]
CMD ["/usr/bin/supervisord"]
