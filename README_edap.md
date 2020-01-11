# eDnevnikAndroidProject API

eDAP je Python 3 library koji pruža API za CARNetov servis [eDnevnik](https://ocjene.skole.hr).

eDAP-API je kod pisan pomoću Flask frameworka koji daje mogućnosti eDAP-a kroz HTTP sučelje.

Za bazu podataka koristi [Redis](https://redis.io/) u AOF (Append-Only file) načinu.

## Potrebni programi

* [Docker](https://docs.docker.com/install/) – za produkciju
* [Python 3.5+](https://www.python.org/downloads/) i [Redis](https://redis.io/) – za dev testing na računalu

## Korištenje

### Razvijanje

Za pokretanje eDAP-API poslužitelja u privremenom okruženju moguće je koristiti `run_instance.py` skriptu u mapi `edap/app`. Skripta će stvoriti privremenu mapu i konfigurirati Redis u pozadini.

```console
btx3@btx3s-mbp app % python3 run_instance.py 
[dev] [INFO] Started Redis in the background, waiting 2 seconds...
[dev] [INFO] Successfully connected to Redis
[eDAP] [INFO] Storing data in: /var/folders/ql/xy1641592rj0x5h5fsrg4w700000gn/T/tmpgneumha1
[eDAP] [INFO] Using Hashicorp Vault: False
[eDAP] [WARN] Not using Vault for credential storage -- storing data insecurely in Redis!
[eDAP] [INFO] Developer access enabled: True
[eDAP] [INFO] Using Cloudflare: None
[eDAP] [INFO] Using Firebase: None
[eDAP] [INFO] Send administrative notifications: None
[eDAP] [INFO] Waiting between 1800 and 6000 seconds before syncing for each user
[eDAP] [INFO] Automatically adjusting sync times: None
[eDAP] [INFO] Further logging is in /var/folders/ql/xy1641592rj0x5h5fsrg4w700000gn/T/tmpgneumha1/edap_api.log
[dev] [INFO] Starting; listening on port 39143
[dev] [INFO] Dev access enabled with username 'user' and password 'password'
 * Serving Flask app "EDAP-API" (lazy loading)
 * Environment: production
   WARNING: This is a development server. Do not use it in a production deployment.
   Use a production WSGI server instead.
 * Debug mode: off
```

Skripta otvara development server za eDAP-API na nasumičnom portu (gore `39143`) i u privremenoj mapi (gore `/var/folders/ql/xy1641592rj0x5h5fsrg4w700000gn/T/tmpgneumha1/`).

Pristup `/dev/` endpointovima je moguć putem korisničkog imena `user` i lozinke `password`.

Logovi su dostupni u privremenoj mapi u datoteci `edap_api.log`:

```console
btx3@btx3s-mbp ~ % tail -f /var/folders/ql/xy1641592rj0x5h5fsrg4w700000gn/T/tmpgneumha1/edap_api.log
2020-01-02 22:38:39,860 > _init_db(INFO) => Database connection successful
2020-01-02 22:38:39,861 > <module>(INFO) => eDAP-API version 2.14.2 starting up
2020-01-02 22:38:39,863 > do_startup_checks(WARNING) => Vault not being used - passwords will be stored insecurely!
2020-01-02 22:38:39,863 > restore_syncs(INFO) => Starting sync threads for 0 tokens
2020-01-02 22:38:39,893 > _log(INFO) =>  * Running on http://0.0.0.0:39143/ (Press CTRL+C to quit)
```

### Production (Docker)

Ako se aplikacija postavlja u *production*/javno okruženje, potrebno ju je integrirati sa *uWSGI*-em i web-serverom po želji (najbolje *nginx*). Mapa `/edap/` već sadrži unaprijed konfiguriran Dockerfile, te je za hostanje servera potrebno pokrenuti samo ovo:

```bash
cd Netrix/edap
docker build -t netrix:latest . # Build docker imagea (možete `netrix` zamijeniti s tagom po želji)
docker volume create redis-data # Ovo će biti pohrana/storage za bazu podataka, moguće je koristiti i mapu na serveru
docker run -d --name netrix \
        -p 80:80 # eDAP-API je dostupan na portu 80 \
        -v redis-data:/data \
        netrix:latest
```

Dodatna konfiguracija (npr. Firebase ili Cloudflare integracija) je moguća pomoću varijabla u okruženju (environment variables) koje se definiraju pomoću Docker argumenta `-e`, na primjer:

```bash
docker run -d --name netrix \
        -p 80:80 \
        -v redis-data:/data \
        -e CLOUDFLARE=Y # Omogućuje integraciju s Cloudflareom \
        netrix:latest
```

Preporučeni način konfiguracije je spremanje konfiguracijskih varijabla u `env.list` datoteku, npr.:
```bash
# /opt/env.list
CLOUDFLARE=Y

VAULT_SERVER=https://vault.netrix.io:8200
VAULT_TOKEN_READ=abcdefgh...
VAULT_TOKEN_WRITE=ijklmnopq...

SERVER_NAME=api-test.netrix.io
# itd.
```
i onda ju dati kao argument `docker` komandi:
```bash
docker run -d --name netrix \
      --env-file /opt/env.list \
      -p 80:80 \
      -v redis-data:/data \
      --restart unless-stopped \
      netrix:latest
```

## Konfiguracija

eDAP-API je potrebno konfigurirati prije korištenja, što je moguće pomoću varijabli u okruženju. Popis tih varijabli je dostupan [ovdje](https://github.com/btx3/Netrix/blob/master/edap/CONFIG.md) skupa s opisom čime koja varijabla upravlja.