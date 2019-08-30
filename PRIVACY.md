# Pravila o privatnosti

Zadnje ažuriranje: 30. kolovoza, 2019.

Prijašnje inačice ovog dokumenta možete zatražiti upitom na e-mail bs3vcenk@gmail.com.

## Što je Netrix?

**Netrix** je naziv neslužbene frontend aplikacije za CARNetov servis "e-Dnevnik". Netrix kontaktira API server pod imenom *eDnevnikAndroidProject* (skraćeno eDAP).

Netrix omogućuje brz pregled ocjena, izostanaka, ispita i korisničkih informacija te obavijesti o promjeni istih.

**eDAP** je API (*Application Programming Interface*) server koji služi kao backend aplikaciji. Pomoću tzv. *web scrapinga* izvlači važne informacije i sastavlja ih u oblik jednostavan za upotrebu u programu.

## Spremanje i korištenje podataka

### eDAP (backend)

**eDAP** sprema sljedeće podatke nakon prijave:

* **Korisničko ime (kriptirano)** - koristi se za identifikaciju korisnika u zahtjevima podršci, te za pozadinsku sinkronizaciju i uspoređivanje podataka (za obavijesti o novostima)
* **Lozinka (kriptirana)** - koristi se za pozadinsku sinkronizaciju i uspoređivanje podataka (za obavijesti o novostima)
* **Token** - MD5 hash korisničkog imena i lozinke, koji se koristi za daljnju upotrebu API-a i identifikaciju u zapisima na strani servera
* **Jezik uređaja** - npr. hr/de/en, služi za lokaliziranje odnosno prevođenje sadržaja kao npr. obavijesti
* **Informacije o školskoj godini**, što uključuje:
    * **Popis razreda i pripadajuće informacije** - oznaka (npr. 2.e), školska godina (npr. 2018./2019.), ime i mjesto škole te ime razrednika
    * **Popis predmeta i pripadajuće informacije** (samo sinkronizirani razredi) - ime predmeta, imena profesora koji predaju ili su predavali taj predmet i prosjek (zaključna ocjena, ako je dostupna, a ako nije onda se koristi izračunati prosjek)
    * **Popis ocjena, bilježaka za pojedini predmet i pripadajuće informacije** (samo sinkronizirani razredi) - datum upisivanja ocjene odnosno bilješke te bilješka uz ocjenu
    * **Popis ispita za pojedini razred i pripadajuće informacije** (samo sinkronizirani razredi) - datum ispita, predmet ispita te školski predmet za koji se taj ispit piše
    * **Popis izostanaka za pojedini razred i pripadajuće informacije** (samo sinkronizirani razredi)
        * **U načinu pregleda** - broj sati na čekanju, broj opravdanih i neopravdanih sati, zbroj svih neodlučenih sati
        * **U detaljnom načinu** - datum skupine izostanaka, te za svaku skupinu izostanaka: status (opravdan/neopravdan), redni broj školskog sata, razlog i ime predmeta
    * **Informacije o korisniku** (samo sinkronizirani razredi, trenutno se ne koristi nigdje u aplikaciji) - adresa stanovanja, datum rođenja, rodno mjesto, puno ime, redni broj i školski program
* **IP adresa s koje je zahtjev prijave stigao** - kako bi se identificirali i blokirali potencijalni napadi na servis
* **Platforma uređaja** - npr. *Android/iOS/drugo*, služi za bolje kategoriziranje mogućih problema u radu aplikacije (npr. događa li se greška samo na toj platformi)
* **Model uređaja** - npr. *SM-G965F*, služi za bolje kategoriziranje mogućih problema u radu aplikacije (npr. događa li se greška samo kod tog proizvođača ili tog modela uređaja)

Gore navedene podatke je moguće isbrisati pritiskom na gumb "Odjava" pod tabom "Postavke" u aplikaciji.

Držimo popis svih zahtjeva na eDAP koji se briše svaka tri dana.

eDAP se spaja na CARNetov servis e-Dnevnik, čija pravila o privatnosti možete pročitati [ovdje](https://www.carnet.hr/obavijest-o-privatnosti/).

eDAP kao spremište za korisnička imena i lozinke koristi open-source Hashicorp Vault. Način na koji funkcionira enkripcija u tom sustavu možete pročitati [ovdje](https://www.hashicorp.com/resources/how-does-vault-encrypt-data).

### Netrix (frontend)

Netrix koristi Googleov *Firebase* servis za analitike u aplikaciji, *Firebase Crashlytics* za prijavljivanje grešaka u radu, *Firebase Cloud Messaging* za primanje obavijesti, te AdMob za prikazivanje reklama. Za više informacija o podacima koji se šalju, provjerite [Googleova pravila o privatnosti](https://policies.google.com/privacy).

Uz prijavu greške automatski se šalje i korisnikov ID/token, koji je drugome beskoristan, a nama služi za lakše pronalaženje greške koju korisnik prijavljuje.

*Firebase Analytics* šalje površne zapise o korištenju aplikacije (npr. prijava, odjava, ime trenutnog ekrana) koji mogu biti korisni u utvrđivanju uzroka greške. Uz to prati i trajanje hvatanja i razrade podataka s poslužitelja, što služi za optimizaciju tih funkcija.

U slučaju da korisnik ne stisne gumb "Prijava", aplikacija se neće javiti na server.

## netrix.io

Web stranica [netrix.io](https://netrix.io) koristi Cloudflare Workers, koji nam daje samo statističke podatke o korištenju (broj korisnika).

## Sigurnost prijenosa podataka

Netrix koristi HTTPS protokol za komunikaciju sa svojim API-em i *Firebaseom*. Aplikacija koristi *SSL pinning*, što znaći da neće poslati podatke na poslužitelj ako HTTPS provjera ne uspije, te će korisnik biti upozoren.

## Sigurnost spremljenih podataka

eDAP implementira tzv. *rate limiting* koji ograničava broj zahtjeva koji se mogu napraviti na server u određenom vremenskom prostoru. Zahtjevi koji ne dolaze iz Hrvatske se posebno zabilježuju i ograničavaju, te će potrebne mjere biti poduzete u slučaju uočavanja neovlaštenog pristupa.

Pri odjavi se brišu svi korisnički podaci sa servera.

Poslužitelje održavamo ažuriranima te provjeravamo aplikaciju i kod o kojem ovisi (*dependency*) za bilo kakve sigurnosne propuste.