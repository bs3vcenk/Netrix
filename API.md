# API config

Ako je moguće, uvijek se koristi `requests.Session()` (na početku u `__init__` funkciji se podešava) za izvršavanje zahtjeva jer čuva cookies-e i CSRF token.

## Dobivanje CSRF tokena

Tip HTTP zahtjeva: `GET`

Lokacija: `https://ocjene.skole.hr/pocetna/prijava`

Format: ništa

Ovaj request je potreban kako bi se CSRF cookie spremio u `session` objekt.

## Login funkcija

Tip HTTP zahtjeva: `POST`

Lokacija: `https://ocjene.skole.hr/pocetna/posalji/`

Format: `application/x-www-form-urlencoded`

Podaci/tražene varijable i objašnjenje:
```
csrf_token: CSRF (Cross-Site Request Forgery) token
user_login: Korisničko ime
user_password: Password korisnika (nema hash, plaintext)
```

Primjer:
```
session = requests.Session()
session.post("https://ocjene.skole.hr/pocetna/posalji/", data={"csrf_token":"xxxxxxxxxxxxxxxxxxxx", "user_login":"pero.peric", "user_password":"abc123def"})
```