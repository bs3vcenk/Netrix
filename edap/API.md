# ReST API za eDAP

Ovaj dokument opisuje ReST API za eDnevnikAndroidProject.

Upute za instalaciju i konfiguraciju eDAP su [ovdje](https://github.com/btx3/eDnevnik/blob/master/README_edap.md).

## Endpointovi

### /

* Tip zahtjeva: `GET`

Primjer zahtjeva i odgovora:
```bash
btx3@DESKTOP-KH2DCP0:~$ curl 127.0.0.1:5000/
{
  "flask-version": "1.0.3",
  "host-os": "Windows 10.0.18362",
  "name": "eDnevnikAndroidProject",
  "version": "B2"
}
```

* `flask-version` - Verzija frameworka Flask koji pokreće API
* `host-os` - OS i verzija host računala
* `name` - Ime projekta
* `version` - Verzija projekta

### /api/Login

Ovim zahtjevom se korisnik prijavljuje na eDnevnik, te se njegovi podaci prikupljaju i spremaju u memoriju za daljnje pristupanje tokenom (MD5(username)).

* Tip zahtjeva: `POST`
* Potrebni podatci: `{"username": "...", "password": "..."}` u tijelu zahtjeva
* Potreban header: `Content-Type: application/json`

* Moguće greške:
  * `E_INVALID_DATA` (HTTP 400) - Netočan ili nepostojeći JSON u zahtjevu
  * `E_INVALID_CREDENTIALS` (HTTP 401) - Pogrešan username ili password
  * `E_SERVER_ERROR` (HTTP 500) - Greška u eDAP libraryu (exception FatalLogExit)

Primjer uspješnog zahtjeva i odgovora:
```bash
btx3@DESKTOP-KH2DCP0:~$ curl 192.168.43.96:5000/api/login -X POST -H "Content-Type: application/json" -d '{"username":"pero.peric","password":"abc123def"}'
{
  "token": "6a596325837132fc8cef406789b01d86"
}
```

Primjer neuspješnog zahtjeva i odgovora (bez podataka):
```bash
btx3@DESKTOP-KH2DCP0:~$ curl 127.0.0.1:5000/api/login -X POST -H "Content-Type: application/json"
{
  "error": "E_INVALID_DATA"
}
```

### /api/user/<token>/classes

Ovim zahtjevom se dobivaju svi razredi na korisnikovom profilu.

* Tip zahtjeva: `GET`
* Potrebni podatci: token

* Moguće greške:
  * `E_TOKEN_NONEXISTENT` (HTTP 401) - Dani token ne postoji u bazi podataka

Primjer uspješnog zahtjeva i odgovora:
```bash
btx3@DESKTOP-KH2DCP0:~$ curl 127.0.0.1:5000/api/user/6a596325837132fc8cef406789b01d86/classes
{
  "classes": [
    {
      "class": "1.ž",
      "classmaster": "Netko Netkić",
      "school_city": "Mjesto",
      "school_name": "Osnovna \u0161kola Nekog Netkića",
      "year": "2017./2018."
    }
  ],
  "tests": null
}
```

Primjer neuspješnog zahtjeva i odgovora (krivi token):
```bash
btx3@DESKTOP-KH2DCP0:~$ curl 127.0.0.1:5000/api/user/n3p0st0jec1t0k3n/classes
{
  "error": "E_TOKEN_NONEXISTENT"
}
```

### /api/user/<token>/classes/<id predmeta>/subjects

Ovim zahtjevom se dobivaju svi pretmeti za dani razred.

* Tip zahtjeva: `GET`
* Potrebni podatci: token, ID predmeta (broj u listi, od nule)

* Moguće greške:
  * `E_TOKEN_NONEXISTENT` (HTTP 401) - Ili token ili ID predmeta je nepostojeći ili netočan
