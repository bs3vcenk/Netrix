#! /usr/bin/env sh
set -e

# Explicitly add installed Python packages and uWSGI Python packages to PYTHONPATH
# Otherwise uWSGI can't import Flask
export PYTHONPATH=$PYTHONPATH:/usr/local/lib/python3.7/site-packages:/usr/lib/python3.7/site-packages

# Get the maximum upload file size for Nginx, default to 0: unlimited
USE_NGINX_MAX_UPLOAD=${NGINX_MAX_UPLOAD:-0}

# Get the number of workers for Nginx, default to 1
USE_NGINX_WORKER_PROCESSES=${NGINX_WORKER_PROCESSES:-1}

# Set the max number of connections per worker for Nginx, if requested
# Cannot exceed worker_rlimit_nofile, see NGINX_WORKER_OPEN_FILES below
NGINX_WORKER_CONNECTIONS=${NGINX_WORKER_CONNECTIONS:-1024}

# Get the listen port for Nginx, default to 80
USE_LISTEN_PORT=${LISTEN_PORT:-80}

if [ -f /app/nginx.conf ]; then
    cp /app/nginx.conf /etc/nginx/nginx.conf
else
    content='user  nginx;\n'
    # Set the number of worker processes in Nginx
    content=$content"worker_processes ${USE_NGINX_WORKER_PROCESSES};\n"
    content=$content'error_log  /var/log/nginx/error.log warn;\n'
    content=$content'pid        /var/run/nginx.pid;\n'
    content=$content'events {\n'
    content=$content"    worker_connections ${NGINX_WORKER_CONNECTIONS};\n"
    content=$content'}\n'
    content=$content'http {\n'
    content=$content'    include       /etc/nginx/mime.types;\n'
    content=$content'    default_type  application/octet-stream;\n'
    content=$content'    log_format  main  '"'\$remote_addr - \$remote_user [\$time_local] \"\$request\" '\n"
    content=$content'                      '"'\$status \$body_bytes_sent \"\$http_referer\" '\n"
    content=$content'                      '"'\"\$http_user_agent\" \"\$http_x_forwarded_for\"';\n"
    content=$content'    access_log  /var/log/nginx/access.log  main;\n'
    content=$content'    sendfile        on;\n'
    content=$content'    keepalive_timeout  65;\n'
    content=$content'    include /etc/nginx/conf.d/*.conf;\n'
    content=$content'}\n'
    content=$content'daemon off;\n'
    # Set the max number of open file descriptors for Nginx workers, if requested
    if [ -n "${NGINX_WORKER_OPEN_FILES}" ] ; then
        content=$content"worker_rlimit_nofile ${NGINX_WORKER_OPEN_FILES};\n"
    fi
    # Save generated /etc/nginx/nginx.conf
    printf "$content" > /etc/nginx/nginx.conf

    content_server='server {\n'
    content_server=$content_server"    listen ${USE_LISTEN_PORT};\n"
    content_server=$content_server"    server_name ${SERVER_NAME};\n"
    # If SSL is disabled, don't redirect anything
    if [[ "${SSL}" == "N" ]]; then
        content_server=$content_server'    location / {\n'
        content_server=$content_server'        include uwsgi_params;\n'
        content_server=$content_server'        uwsgi_pass unix:///tmp/uwsgi.sock;\n'
        content_server=$content_server'    }\n'
    else
        content_server=$content_server'    return 302 https://$server_name$request_uri;\n'
    fi
    content_server=$content_server'}\n'
    # Save generated server /etc/nginx/conf.d/nginx.conf
    printf "$content_server" > /etc/nginx/conf.d/nginx.conf

    # If SSL is enabled, set up NGINX to use SSL
    if [[ "${SSL}" == "Y" ]]; then
        content_ssl='server {\n'
        content_ssl=$content_ssl'    listen 443 ssl http2;\n'
        content_ssl=$content_ssl"    server_name ${SERVER_NAME};\n"
        # Set SSL cert paths
        content_ssl=$content_ssl"    ssl_certificate ${SSL_CERT};\n"
        content_ssl=$content_ssl"    ssl_certificate_key ${SSL_KEY};\n"
        # Hardened SSL settings
        content_ssl=$content_ssl'    ssl_protocols TLSv1.3 TLSv1.2;\n'
        content_ssl=$content_ssl'    ssl_prefer_server_ciphers on;\n'
        content_ssl=$content_ssl'    ssl_ciphers EECDH+AESGCM:EDH+AESGCM;\n'
        content_ssl=$content_ssl'    ssl_ecdh_curve secp384r1;\n'
        content_ssl=$content_ssl'    ssl_session_timeout  10m;\n'
        content_ssl=$content_ssl'    ssl_session_cache shared:SSL:10m;\n'
        content_ssl=$content_ssl'    ssl_session_tickets off;\n'
        content_ssl=$content_ssl'    ssl_stapling on;\n'
        content_ssl=$content_ssl'    ssl_stapling_verify on;\n'
        content_ssl=$content_ssl'    resolver 1.1.1.1 1.0.0.1 valid=300s;\n'
        content_ssl=$content_ssl'    resolver_timeout 5s;\n'
        content_ssl=$content_ssl'    add_header Strict-Transport-Security "max-age=63072000; includeSubDomains; preload";\n'
        content_ssl=$content_ssl'    add_header X-Frame-Options DENY;\n'
        content_ssl=$content_ssl'    add_header X-Content-Type-Options nosniff;\n'
        content_ssl=$content_ssl'    add_header X-XSS-Protection "1; mode=block";\n'
        # UWSGI passthrough
        content_ssl=$content_ssl'    location / {\n'
        content_ssl=$content_ssl'        include uwsgi_params;\n'
        content_ssl=$content_ssl'        uwsgi_pass unix:///tmp/uwsgi.sock;\n'
        content_ssl=$content_ssl'    }\n'
        content_ssl=$content_ssl'}\n'
        printf "$content_ssl" > /etc/nginx/conf.d/ssl.conf
    fi

    # Generate Nginx config for maximum upload file size
    printf "client_max_body_size $USE_NGINX_MAX_UPLOAD;\n" > /etc/nginx/conf.d/upload.conf
fi

exec "$@"
