# eDnevnikAndroidProject

eDAP je library za interfacing sa CARNetovim servisom [eDnevnik](https://ocjene.skole.hr), u Pythonu 3. Uključuje i [ReST](https://en.wikipedia.org/wiki/Representational_State_Transfer) API pisan pomoću Flask frameworka, default na portu 5000. Za bazu podataka koristi [Redis](https://redis.io/).

**UPOZORENJE**: Trenutno nedostaje dosta toga iz instalacije. Potrebno je ispočetka napisati upute pošto je mnogo toga promijenjeno od zadnje izmjene. Zadnji *provjeren* commit gdje eDAP-API funkcionira s ovim uputama je [ovdje](https://github.com/btx3/Netrix/tree/c21213c8a7f977e6bc392d5062f913f99fa5bdc7).

## Upotreba

Osim ako želite hostati server za testing novih funkcija, dostupan je već konfigurirani i službeni server na https://api.netrix.io - ne trebate ništa mijenjati, već je upisan po defaultu u Netrix.

### Potrebni programi

* [Redis](https://redis.io/)
  * Linux (distribucije s `apt`): `apt install -y redis-server`
  * Windows: https://redislabs.com/blog/redis-on-windows-10/ (uglavnom ista stvar, samo u WSL)
* [Python 3](https://www.python.org/downloads/) (Python 2 nije podržan)
* [Docker](https://docs.docker.com/install/) - samo ako želite hostati production server

### Instalacija

Za vrijeme razvijanja projekta je dovoljno ovo:
```bash
cd eDnevnik/edap
pip install -r requirements.txt
python api.py # ReST API, za frontend (u Flask developer načinu)
```

Ako bi se aplikacija postavljala u "production" okruženje, potrebno ju je integrirati sa uWSGI i web-serverom po želji (najbolje nginx). Mapa `/edap/` već sadrži unaprijed konfiguriran Dockerfile, te je za hostanje servera potrebno pokrenuti samo ovo:

```bash
cd eDnevnik/edap
docker build -t netrix:latest .
docker volume create redis-data # Ovo će biti spremnik za bazu podataka
docker run -d --name netrix -p 80:80 -v redis-data:/data netrix # eDAP-API je dostupan na portu 80
```

Dodatna konfiguracija (npr. Firebase ili Cloudflare integracija) je moguća pomoću varijabla okruženja (environment variables) koje se definiraju pomoću Docker argumenta `-e`, na primjer:

```bash
docker run -d --name netrix -p 80:80 -v redis-data:/data -e CLOUDFLARE=Y netrix # Omogućuje integraciju sa Cloudflareom
```

### Lista konfiguracijskih varijabla

```bash
DATA_FOLDER=[/data] # Mapa za logove, DB i Firebase token JSON
CLOUDFLARE=[N] # Cloudflare integracije (hvatanje pravog IP-a iza Cloudflare servera)
FIREBASE=[N] # Firebase integracija (obavijesti)
  GOOGLE_TOKEN_FILE=[google_creds.json] # https://console.firebase.google.com/project/_/settings/serviceaccounts/adminsdk
  FIREBASE_TOKEN=[] # Token za Firebase Cloud Messaging
DEV_ACCESS=[N] # /dev/ interface
  DEV_USER=[] # Username za /dev/ interface
  DEV_PASW=[] # SHA256 lozinke za /dev/ interface
```

## Korištenje s frontendom (tijekom razvijanja)
### URL
Potrebno je u frontendu promijeniti adresu API-a. Ako aplikaciju mislite korisiti samo kao web-aplikaciju (`ionic serve`), za adresu uzmite `http://localhost:5000` (port se može mijenjati, provjerite `app.run()` u `api.py`).

Ako aplikaciju mislite testirati na mobilnim računalima, potrebno je unijeti lokalnu adresu Vašeg računala, te se osigurati da tu adresu drugi uređaji mogu dohvatiti.
