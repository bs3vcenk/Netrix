# Pravila o privatnosti

Zadnje ažuriranje: 10.9.2019.

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
        * **U načinu pregleda (*overview*)** - broj sati na čekanju, broj opravdanih i neopravdanih sati, zbroj svih neodlučenih sati
        * **U detaljnom načinu** - datum skupine izostanaka, te za svaku skupinu izostanaka: status (opravdan/neopravdan), redni broj školskog sata, razlog i ime predmeta
    * **Informacije o korisniku** (samo sinkronizirani razredi, trenutno se ne koristi nigdje u aplikaciji) - datum rođenja, rodno mjesto, puno ime, redni broj i školski program
* **Postavke obavijesti**, što uključuje:
    * **Status obavijesti** - treba li slati korisniku obavijesti ili ne
    * **Isključene kategorije** - koje vrste obavijesti ne treba slati
* **Firebase Cloud Messaging token uređaja** - koristi se za slanje obavijesti na uređaj
* **IP adresa s koje je zadnji zahtjev stigao** - kako bi se identificirali i blokirali potencijalni napadi na servis
* **Platforma uređaja** - npr. *Android/iOS/drugo*, služi za bolje kategoriziranje mogućih problema u radu aplikacije (npr. događa li se greška samo na toj platformi)
* **Model uređaja** - npr. *SM-G965F*, služi za bolje kategoriziranje mogućih problema u radu aplikacije (npr. događa li se greška samo kod tog proizvođača ili tog modela uređaja)

Gore navedene podatke je moguće isbrisati pritiskom na gumb "Odjava" pod tabom "Postavke" u aplikaciji.

Držimo popis svih zahtjeva (log) na eDAP server koji se briše svaka tri dana.

eDAP se spaja na CARNetov servis e-Dnevnik, čija pravila o privatnosti možete pročitati [ovdje](https://www.carnet.hr/obavijest-o-privatnosti/).

### Netrix (frontend)

Netrix koristi Googleov *Firebase Cloud Messaging* za primanje obavijesti, *Firebase Crashlytics* za izjave o greškama i AdMob za prikazivanje reklama. Za više informacija o podacima koji se šalju, provjerite [Googleova pravila o privatnosti](https://policies.google.com/privacy) i [Kako Google koristi Vaše podatke](https://policies.google.com/technologies/partner-sites).

U slučaju da korisnik uključi opciju "Šalji podatke o korištenju" (koja je isključena sve dok korisnik ne odluči suprotno), uključuje se i Googleov *Firebase Analytics*.

*Firebase Analytics* šalje površne zapise o korištenju aplikacije (npr. prijava, odjava, ime trenutnog ekrana) koji mogu biti korisni u utvrđivanju uzroka greške. Uz to prati trajanje hvatanja i razrade podataka, što služi za optimizaciju tih funkcija.

*Firebase Crashlytics* šalje informacije o grešci ako se dogodi. U izjavi o grešci sadržane su sljedeće informacije:

* Token/ID korisnika
* Proizvođač i model uređaja
* Količina slobodnog RAM-a i prostora za pohranu
* Verzija operativnog sustava (8, 9, 10, itd.)
* Je li uređaj rootan
* Datum događaja
* Verzija aplikacije
* Zapis događaja koji je doveo do greške

*AdMob* je moguće isključiti opcijom "Prikazuj reklame". Google može koristiti Vaš profil za bolje ciljanje (eng. *targeting*) reklama prema Vašim interesima. Više informacija o tome i kako upravljati tom opcijom nalazi se [ovdje](https://support.google.com/ads/answer/1660762).

Ako korisnik ne stisne gumb "Prijava", aplikacija se neće javiti na server.

## netrix.io (web-stranica)

Web stranica [netrix.io](https://netrix.io) koristi Cloudflare Workers, koji nam daje samo statističke podatke o korištenju (broj zahtjeva). Ne skupljaju se nikakvi podatci kojima se može identificirati ili pratiti korisnik.

## Sigurnost prijenosa podataka

Netrix koristi HTTPS protokol za komunikaciju sa svojim API-em i *Firebaseom*. Aplikacija koristi *SSL pinning*, što znači da neće poslati podatke na poslužitelj ako HTTPS provjera ne uspije, te će korisnik biti upozoren.

## Sigurnost spremljenih podataka

eDAP kao spremište za korisnička imena i lozinke koristi open-source program Hashicorp Vault. Način na koji funkcionira enkripcija u tom sustavu možete pročitati [ovdje](https://www.hashicorp.com/resources/how-does-vault-encrypt-data).

Pri odjavi se brišu svi korisnički podaci sa servera.

Poslužitelje održavamo ažuriranima te provjeravamo aplikaciju i kod o kojem ovisi (eng. *dependency*) za bilo kakve sigurnosne propuste.

## Upravljanje podatcima

### Brisanje podataka s Netrix servisa

Vaše podatke je moguće potpuno obrisati sa servera pritiskom na gumb "Odjava" u postavkama aplikacije. Taj postupak briše sve gore navedene podatke.

### Kopija podataka

Možete zatražiti kopiju Vaših podataka upitom na e-mail bs3vcenk@gmail.com. Kopija uključuje podatke s naših servera (potpuni profil i zapisi vezani za Vaš profil, ako su još dostupni) te nama dostupne podatke s Googleovih servisa (npr. *Firebase Analytics*, ako je omogućeno).