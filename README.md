# e-Dnevnik for Android
Python skripta za e-Dnevnik. Pisano za Python 3.

Aplikacija za mobilne uređaje dostupna je [ovdje](https://github.com/btx3/eDnevnikAndroid).

## Upute za instalaciju
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
* Slijedite upute za Linux (Ubuntu)

## Značajke/Features

* Dobivanje razreda i informacije o njima
* Dobivanje predmeta i informacije o njima
* Čitanje ocjena, bilježaka i datuma upisvanja za svaki predmet
* Čitanje datuma i predmeta ispita (svih ili samo preostalih)
* Računanje prosjeka (sveukupni i po predmetu) [u demo skripti]
