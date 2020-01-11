# Često postavljana pitanja

## Zašto mi kasne obavijesti o ocjenama?
Server sinkronizira informacije o svakom korisniku svakih pola sata (1800 sekundi) do ~1.6 sati (6000 sekundi). Razlog za tako dugo vrijeme je to što previše zahtjeva u kratkom vremenu previše opterećuje i Netrix i CARNetove servere.

Naravno, taj raspon se može mijenjati ovisno o broju korisnika, praznicima ili početku/kraju školske godine.

## Zašto je aplikacija na [jezik]?
Aplikacija prilagođava jezik sučelja prema jeziku uređaja. Podržani jezici su hrvatski, engleski i njemački, a ako je uređaj nekom
drugom jeziku, postavlja se na hrvatski.

## Što uzrokuje upozorenje o starim podacima kad otvorim aplikaciju?
To upozorenje se prikazuje u slučaju da se aplikacija ne može spojiti s poslužiteljem. Mogući razlozi su:
* **Nedostupna internetska veza** - WLAN odnosno mobilni podaci nisu uključeni ili nisu upotrebljivi
* **Nesigurna veza** - certifikat poslužitelja nije važeći; obično jer uređaj nije prijavljen na javnu mrežu
* **Greška na strani servera** - neki (obično privremeni) problem kod procesiranja podataka
