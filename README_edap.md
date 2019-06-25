# eDnevnikAndroidProject

eDAP je library za interfacing sa CARNetovim servisom [eDnevnik](https://ocjene.skole.hr), u Pythonu 3. Uključuje i [ReST](https://en.wikipedia.org/wiki/Representational_State_Transfer) API pisan pomoću Flask frameworka, default na portu 5000. Za bazu podataka koristi [Redis](https://redis.io/).

## Upotreba

### Potrebni programi

* [Redis](https://redis.io/)
  * Linux (distribucije s `apt`): `apt install -y redis-server`
  * Windows: https://redislabs.com/blog/redis-on-windows-10/ (uglavnom ista stvar, samo u WSL)
* [Python 3](https://www.python.org/downloads/) (Python 2 nije podržan)

### Instalacija

Za vrijeme razvijanja projekta je dovoljno ovo:
```console
cd eDnevnik/edap
pip install -r requirements.txt
python api.py # ReST API, za frontend (u Flask developer načinu)
```

Ako bi se aplikacija postavljala u "production" okruženje, potrebno ju je integrirati sa uWSGI i web-serverom po želji (najbolje nginx). [Ovaj projekt](https://github.com/tiangolo/uwsgi-nginx-flask-docker) sadrži mnoge predloške za Docker integraciju [TODO].

## Korištenje s frontendom
### URL
Potrebno je u frontendu navesti adresu API-a. Ako aplikaciju mislite korisiti samo kao web-aplikaciju (`ionic serve`), za adresu uzmite `http://localhost:5000` (port se može mijenjati, provjerite `app.run()` u `api.py`).

Ako aplikaciju mislite testirati na mobilnim računalima, potrebno je unijeti lokalnu adresu Vašeg računala, te se osigurati da tu adresu drugi uređaji mogu dohvatiti.
