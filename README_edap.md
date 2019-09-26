# eDnevnikAndroidProject

eDAP je Python 3 library koji pruža API za CARNetov servis [eDnevnik](https://ocjene.skole.hr).

To je API pisan pomoću Flask frameworka koji mapira funkcije eDAPa na [ReST](https://en.wikipedia.org/wiki/Representational_State_Transfer)-kompatibilno sučelje.

Za bazu podataka koristi [Redis](https://redis.io/) u (po mogućnosti) AOF (Append-Only file) načinu.

## Potrebni programi

* [Docker](https://docs.docker.com/install/) – za produkciju
* [Python 3.5+](https://www.python.org/downloads/) – za dev testing na računalu

## Instalacija

Za vrijeme razvijanja projekta je potrebno pokrenuti Redis instancu u jednom prozoru:
```bash
redis-server --dir /tmp
```
te u drugom prozoru pokrenuti server:
```bash
cd Netrix/edap
pip3 install -r requirements.txt
DATA_FOLDER=/tmp python3 api.py # Ovako pokretati samo u developer okruženju!
```

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

Dodatna konfiguracija (npr. Firebase ili Cloudflare integracija) je moguća pomoću varijabla okruženja (environment variables) koje se definiraju pomoću Docker argumenta `-e`, na primjer:

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

## Lista konfiguracijskih varijabla

Zadani iznos varijabla je unutar zagrada.

```bash
DATA_FOLDER=[/data] # Mapa za logove, DB i Firebase token JSON
CLOUDFLARE=[N] # Cloudflare integracije (hvatanje pravog IP-a iza Cloudflare servera)
VAULT_SERVER=[] # Adresa Hashicorp Vault servera (API)
VAULT_TOKEN_READ=[] # Token za Vault server koji ima dopuštenje čitanja
VAULT_TOKEN_WRITE=[] # Token za Vault server koji ima dopuštenje pisanja/kreiranja
FIREBASE=[N] # Firebase integracija (obavijesti)
  FIREBASE_TOKEN=[] # Token za Firebase Cloud Messaging
DEV_ACCESS=[N] # /dev/ interface
  DEV_USER=[] # Username za /dev/ interface
  DEV_PASW=[] # SHA256 lozinke za /dev/ interface
SERVER_NAME=[api.netrix.io] # Hostname servera
SSL=[N] # SSL konfiguracija za NGINX
  SSL_CERT=[] # Putanja do PEM certifikata
  SSL_KEY=[] # Putanja do PEM ključa/private key
```