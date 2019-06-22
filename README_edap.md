# eDnevnikAndroidProject

eDAP je library za interfacing sa servisom [eDnevnik](https://ocjene.skole.hr), u Pythonu 3. Uključuje i [ReST](https://en.wikipedia.org/wiki/Representational_State_Transfer) API pisan pomoću Flask frameworka, default na portu 5000.

## Instalacija
```bash
cd eDnevnik/edap
pip install -r requirements.txt
python ednevnik.py # Demo skripta
python api.py # ReST API, za frontend
```

## Korištenje s frontendom
### URL
Potrebno je u frontendu navesti adresu API-a i token. Ako aplikaciju mislite korisiti samo kao web-aplikaciju (`ionic serve`), za adresu uzmite `http://localhost:5000` (port se može mijenjati, provjerite `app.run()` u `api.py`).

Ako aplikaciju mislite testirati na mobilnim računalima, potrebno je unijeti lokalnu adresu Vašeg računala, te se osigurati da tu adresu drugi uređaji mogu dohvatiti.