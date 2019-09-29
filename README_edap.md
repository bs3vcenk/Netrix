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

Varijable označene s [R] moraju biti definirane.

### DATA_FOLDER [R]

Zadana vrijednost: `/data`

Ovdje se spremaju logovi te se pretpostavlja da je i Redis AOF baza podataka (`appendonly.aof`) na istoj lokaciji.

### CLOUDFLARE

Zadana vrijednost: `N`

Omogućuje integraciju s Cloudflareom. Uključivanjem dobivaju se dodatne informacije za klijent (npr. država) te se iz headera izvlači prava IP adresa korisnika.

### VAULT_SERVER [R]

Zadana vrijednost: ništa

HTTPS adresa Hashicorp Vault servera. Koristi se u daljnjim zahtjevima za spremanje, modificiranje i brisanje podataka za prijavu na servis e-Dnevnik.

### VAULT_TOKEN_READ [R]

Zadana vrijednost: ništa

Token za Hashicorp Vault server s dopuštenjem čitanja.

### VAULT_TOKEN_WRITE [R]

Zadana vrijednost: ništa

Token za Hashicorp Vault server s dopuštenjem kreiranja/pisanja i modificiranja.

### FIREBASE

Zadana vrijednost: `N`

Omogućuje Firebase Cloud Messaging integraciju. Koristi se za slanje obavijesti o promjenama podataka.

Ako je ova varijabla uključena, potrebno je dopuniti i FIREBASE_TOKEN, inače će se automatski isključiti.

### FIREBASE_TOKEN [R samo ako FIREBASE == Y]

Zadana vrijednost: ništa

Token za Firebase Cloud Messaging.

### DEV_ACCESS

Zadana vrijednost: `N`

Omogućuje pristup statistikama, popisima i zapisima na serveru te ograničenu kontrolu nad nekim korisnicima. Endpointovi koje ova varijabla kontrolira imaju prefix `/dev/` u zahtjevima i `dev_` u funkcijama.

Ako je ova varijabla uključena, potrebno je dopuniti i DEV_USER i DEV_PASW, inače će se automatski isključiti.

### DEV_USER [R samo ako DEV_ACCESS == Y]

Zadana vrijednost: ništa

Korisničko ime za dio dev sučelja koji podržava pristup pomoću preglednika.

### DEV_PASW [R samo ako DEV_ACCESS == Y]

Zadana vrijednost: ništa

SHA256 hash lozinke za dio dev sučelja koji podržava pristup pomoću preglednika.

### SERVER_NAME [R]

Zadana vrijednost: `api.netrix.io`

Hostname servera; koristi se u NGINX konfiguraciji (instrukcija `server_name`).

### SSL

Zadana vrijednost: `N`

Omogućuje HTTPS konfiguraciju s podrškom za moderne klijente (ocjena A+ na ssllabs.com).

Ako je ova varijabla uključena, potrebno je dopuniti i SSL_CERT i SSL_KEY te osigurati da su te datoteke dostupne i certifikati važeći za domenu navedenu pod SERVER_NAME.

### SSL_CERT [R samo ako SSL == Y]

Zadana vrijednost: ništa

SSL certifikat.

### SSL_KEY [R samo ako SSL == Y]

Zadana vrijednost: ništa

SSL private key.

### ADMIN_NOTIFICATIONS

Zadana vrijednost: `N`

Omogućuje slanje obavijesti o kritičnim greškama pomoću Telegrama.

Ako je ova varijabla uključena, potrebno je dopuniti i TELEGRAM_TOKEN i TELEGRAM_TARGET_UID.

### TELEGRAM_TOKEN [R samo ako ADMIN_NOTIFICATIONS == Y]

Zadana vrijednost: ništa

Token za Telegram bota. Za više informacija o tome kako dobiti bot token provjerite [ovdje](https://telegram.org/blog/bot-revolution).

### TELEGRAM_TARGET_UID [R samo ako ADMIN_NOTIFICATIONS == Y]

Zadana vrijednost: ništa.

ID korisnika kojem će se slati poruke. Moguće ga je saznati kontaktiranjem @IDBot porukom `/getid`.