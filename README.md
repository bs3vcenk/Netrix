# e-Dnevnik for Android
Aplikacija za e-Dnevnik (koja nije samo WebKit browser u okviru). Pisano za Python 3.

## Upute za instalaciju
Zasad projekt nije potpuno realiziran, stoga trenutno ne postoji aplikacija za mobilne uređaje.

Ako želite isprobati trenutnu funkcionalnost EDAP librarya (library koji handlea sve vezano za buduću aplikaciju), možete isprobati testnu skriptu `ednevnik.py`.

Podržani i testirani operativni sustavi:
* **Android** pomoću aplikacije [Termux](https://termux.com/)
* **Windows**
* **Linux** 

### Windows
* Preuzmite [Python 3](https://www.python.org/) te ga instalirajte sa opcijom "Add Python to PATH".
* Preuzmite sadržaj ovog git repositorya pritiskom na zeleni gumb "Clone or download", pa zatim na "Download ZIP".
* Raspakirajte ZIP.
* Pritisnite tipku Windows i R, pa unesite `cmd` u prozor koji se otvori te stisnite Enter.
* Pomoću komande `cd`, dođite u mapu u koju ste raspakirali ZIP (npr. `cd Desktop\eDnevnikAndroid-master`).
* Upišite `pip install -r requirements.txt` za instalaciju potrebnih dodataka.
* Na kraju, upišite `python ednevnik.py` i slijedite upute na ekranu.

### Linux (Ubuntu)
* Instalirajte `python3` i `python3-pip` - `apt install -y python3 python3-pip`
* Klonirajte repository - `git clone https://github.com/btx3/eDnevnikAndroid.git`
* Promijenite aktivni directory - `cd eDnevnikAndroid`
* Instalirajte potrebne dodatke - `pip install -r requirements.txt`
* Na kraju, pokrenite skriptu - `python3 ednevnik.py`

### Android (Termux)
* Instalirajte Termux sa Play Store-a
* Slijedite upute za Linux (Ubuntu), mijenjajući `python3` za `python`

## Screenshot

<img src="https://github.com/btx3/eDnevnikAndroid/raw/master/img/i1.jpg" width="300">

<img src="https://github.com/btx3/eDnevnikAndroid/raw/master/img/i2.jpg" width="300">

## Roadmap
- [x] Slanje user i pass
- [x] Dobivanje i integriranje tokena u daljnje HTTP zahtjeve
- [x] Ispisivanje razreda
- [x] Odabir razreda
- [x] Učitavanje predmeta i profesora
- [x] Učitavanje ispita
- [x] Parsiranje ispita (sorting u datum, predmet, subjekt)
- [x] Parsiranje ocjena, prosjeka itd. iz predmeta i općeniti prosjek
- [ ] "Koliko još ocjena treba do ciljanog prosjeka?"
- [ ] Prijevod programa
- [x] Java/Android aplikacija
  - [ ] Obavijesti za ispite
  - [ ] Funkcionalnost upisivanja datuma odgovaranja
  - [ ] e-Građani login
- [ ] Play Store
- [ ] Reklame (??)
