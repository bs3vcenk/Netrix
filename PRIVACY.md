# Pravila o privatnosti

Zadnje ažuriranje: 16. srpnja, 2019.

## Što je Netrix?

Netrix je naziv frontend aplikacije za CARNetov servis "e-Dnevnik". Netrix kontaktira API server pod imenom eDnevnikAndroidProject (skraćeno eDAP).

Netrix omogućuje brz pregled ocjena, izostanaka, ispita i korisničkih informacija te obavijesti o promjeni istih.

eDAP je API (Application Programming Interface) server koji služi kao backend aplikaciji, ali je dostupan za bilo kakva druga softverska rješenja.

## Spremanje i korištenje podataka

### eDAP (backend)

eDAP sprema sljedeće podatke pri prijavi, bez obzira na postavku "Šalji informacije o uređaju":

* **Korisničko ime** - koristi se za identifikaciju korisnika u zahtjevima podršci, te za pozadinsku sinkronizaciju i uspoređivanje podataka (za obavijesti o novostima)
* **Lozinka** - koristi se za pozadinsku sinkronizaciju i uspoređivanje podataka (za obavijesti o novostima) -- CARNet nema dostupan API, stoga je ovo zasad potrebno, barem dok implementacija sinkronizacije na korisničkoj strani nije dovršena (u tom slučaju bi lozinka bila samo na korisničkoj strani)
* **Token** - hash korisničkog imena i lozinke algoritma MD5, koji se koristi za daljnju upotrebu API-a i identifikaciju u zapisima na strani servera
* **Informacije o školskoj godini**, što uključuje:
  * **Popis razreda i pripadajuće informacije** - oznaka (npr. 2.e), školska godina (npr. 2018./2019.), ime i mjesto škole te ime razrednika
  * **Popis predmeta i pripadajuće informacije** (samo aktualni razred) - ime predmeta, imena profesora koji predaju ili su predavali taj predmet i prosjek (zaključna ocjena, ako je dostupna, a ako nije onda se koristi izračunati prosjek)
  * **Popis ocjena, bilježaka za pojedini predmet i pripadajuće informacije** (samo aktualni razred) - datum upisivanja ocjene odnosno bilješke te bilješka uz ocjenu
  * **Popis ispita za pojedini razred i pripadajuće informacije** (samo aktualni razred) - datum ispita, predmet ispita te školski predmet za koji se taj ispit piše
  * **Popis izostanaka za pojedini razred i pripadajuće informacije** (samo aktualni razred)
    * **U načinu pregleda** - broj sati na čekanju, broj opravdanih i neopravdanih sati, zbroj svih zbroj neodlučenih sati
    * **U detaljnom načinu** - datum skupine izostanaka, te za svaku skupino izostanaka: status (opravdan/neopravdan), redni broj školskog sata, razlog i ime predmeta
  * **Informacije o korisniku** (samo aktualni razred, trenutno se ne koristi nigdje u aplikaciji) - adresa stanovanja, datum rođenja, rodno mjesto, puno ime, redni broj i školski program
* **IP adresa s koje je zahtjev prijave stigao** - u slučaju javnog servisa https://api.netrix.io, to je adresa Cloudflare servera koji je primio zahtjev
* **IP adresa i država korisnika iza Cloudflare servera** - Cloudflare javlja stvarnu IP adresu koja šalje zahtjev, te se ona zapisuje u korisnikov profil kako bi se identificirali i blokirali potencijalni napadi na servis, te kako bi se odredila razina ograničenja u slučaju da korisnik servisu ne pristupa iz Hrvatske

eDAP sprema sljedeće podatke, ako je opcija "Šalji informacije o uređaju" uključena na klijentu:

* **Platforma uređaja** - npr. Android/iOS/drugo, služi za bolje kategoriziranje mogućih problema u radu aplikacije (npr. događa li se greška samo na toj platformi)
* **Model uređaja** - npr. SM-G965F, služi za bolje kategoriziranje mogućih problema u radu aplikacije (npr. događa li se greška samo kod tog proizvođača ili tog modela uređaja)
* **Jezik uređaja** - npr. hr/en/de, služi za potrebe statistike
* **Rezolucija ekrana** - služi za bolje kategoriziranje mogućih problema u radu aplikacije (npr. je li tekst nečitljiv na ovoj rezoluciji i sl.)

Javni eDAP servis na adresi https://api.netrix.io koristi Cloudflare. Njihova pravila o privatnosti možete pročitati [ovdje](https://www.cloudflare.com/privacypolicy/).

### Netrix (frontend)

Netrix koristi Googleov Firebase servis za analitike u aplikaciji, te Firebase Cloud Messaging za primanje obavijesti o promjenama stanja. Za više informacija o podacima koji se šalju, provjerite [Googleova pravila o privatnosti](https://policies.google.com/privacy).

Od verzije 1.6.1, pri prijavi postavljen je upit za uključenje opcije "Šalji informacije o uređaju", te se obavijesti i analitika mogu isključiti u postavkama aplikacije.

Aplikacija je napravljena u Ionic Frameworku, čija pravila o privatnosti možete pročitati [ovdje](https://ionicframework.com/privacy).

Za automatsko prijavljivanje grešaka Netrix koristi Sentry, čija pravila privatnosti možete pročitati [ovdje](https://sentry.io/privacy/).

## Sigurnost u prijenosu podataka

Netrix koristi HTTPS protokol za komunikaciju s API-em, Firebaseom i Sentryem. Aplikacija neće poslati podatke na navedene servere ako HTTPS provjera ne uspije.
