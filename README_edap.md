# eDnevnikAndroidProject

eDAP je Python 3 library koji daje pseudo-API za CARNetov servis [eDnevnik](https://ocjene.skole.hr). U ovoj dokumentaciji misli se na API pisan pomoću Flask frameworka koji mapira funkcije eDAPa na [ReST](https://en.wikipedia.org/wiki/Representational_State_Transfer)-kompatibilno sučelje. Za bazu podataka koristi [Redis](https://redis.io/) u AOF (Append-Only file) načinu.

## Upotreba

Osim ako želite hostati server za testing novih funkcija, dostupan je već konfigurirani i službeni server na https://api.netrix.io - ne trebate ništa mijenjati, već je upisan po defaultu u Netrix.

### Potrebni programi

* [Docker](https://docs.docker.com/install/)

### Instalacija

Za vrijeme razvijanja projekta je dovoljno ovo:
```bash
cd Netrix/edap
pip install -r requirements.txt
python api.py # ReST API, za frontend (u Flask developer načinu)
```

U slučaju da se aplikacija postavlja u *production*/javno okruženje, potrebno ju je integrirati sa *uWSGI*-em i web-serverom po želji (najbolje *nginx*). Mapa `/edap/` već sadrži unaprijed konfiguriran Dockerfile, te je za hostanje servera potrebno pokrenuti samo ovo:

```bash
cd Netrix/edap
docker build -t netrix:latest . # Build docker imagea (možete netrix:latest zamijeniti s tagom po želji)
docker volume create redis-data # Ovo će biti pohrana/storage za bazu podataka
docker run -d --name netrix -p 80:80 -v redis-data:/data netrix # eDAP-API je dostupan na portu 80
```

Dodatna konfiguracija (npr. Firebase ili Cloudflare integracija) je moguća pomoću varijabla okruženja (environment variables) koje se definiraju pomoću Docker argumenta `-e`, na primjer:

```bash
docker run -d --name netrix -p 80:80 -v redis-data:/data -e CLOUDFLARE=Y netrix # Omogućuje integraciju s Cloudflareom
```

### Lista konfiguracijskih varijabla

```bash
DATA_FOLDER=[/data] # Mapa za logove, DB i Firebase token JSON
CLOUDFLARE=[N] # Cloudflare integracije (hvatanje pravog IP-a iza Cloudflare servera)
VAULT_SERVER=[] # Adresa Hashicorp Vault servera (API)
VAULT_TOKEN_READ=[] # Token za Vault server koji ima dopuštenje čitanja
VAULT_TOKEN_WRITE=[] # Token za Vault server koji ima dopuštenje pisanja/kreiranja
FIREBASE=[N] # Firebase integracija (obavijesti)
  GOOGLE_TOKEN_FILE=[google_creds.json] # https://console.firebase.google.com/project/_/settings/serviceaccounts/adminsdk
  FIREBASE_TOKEN=[] # Token za Firebase Cloud Messaging
DEV_ACCESS=[N] # /dev/ interface
  DEV_USER=[] # Username za /dev/ interface
  DEV_PASW=[] # SHA256 lozinke za /dev/ interface
SERVER_NAME=[api.netrix.io] # Hostname servera
SSL=[N] # SSL konfiguracija za NGINX
  SSL_CERT=[] # Putanja do PEM certifikata
  SSL_KEY=[] # Putanja do PEM ključa/private key
```