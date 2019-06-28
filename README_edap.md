# eDnevnikAndroidProject

eDAP je library za interfacing sa CARNetovim servisom [eDnevnik](https://ocjene.skole.hr), u Pythonu 3. Uključuje i [ReST](https://en.wikipedia.org/wiki/Representational_State_Transfer) API pisan pomoću Flask frameworka, default na portu 5000. Za bazu podataka koristi [Redis](https://redis.io/).

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

## Korištenje s frontendom (tijekom razvijanja)
### URL
Potrebno je u frontendu promijeniti adresu API-a. Ako aplikaciju mislite korisiti samo kao web-aplikaciju (`ionic serve`), za adresu uzmite `http://localhost:5000` (port se može mijenjati, provjerite `app.run()` u `api.py`).

Ako aplikaciju mislite testirati na mobilnim računalima, potrebno je unijeti lokalnu adresu Vašeg računala, te se osigurati da tu adresu drugi uređaji mogu dohvatiti.
