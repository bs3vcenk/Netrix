# Zaštita podataka

## Što je Netrix?

**Netrix** je naziv neslužbene frontend aplikacije za CARNetov servis "e-Dnevnik". Netrix kontaktira API server pod imenom *eDAP* na adresi api.netrix.io.

Netrix omogućuje brz pregled ocjena, izostanaka, ispita i korisničkih informacija te obavijesti o promjeni istih.

**eDAP** je API (*Application Programming Interface*) server koji služi kao backend aplikaciji. Pomoću tzv. *web scrapinga* izvlači važne informacije i sastavlja ih u oblik jednostavan za upotrebu u programu.

## Spremanje i korištenje podataka

### eDAP (backend)

**eDAP** sprema sljedeće podatke nakon prijave:

* **Korisničko ime** (zaštičeno sustavom Hashicorp Vault) - koristi se za pozadinsku sinkronizaciju i uspoređivanje podataka (za obavijesti o novostima)
* **Lozinka** (zaštićena sustavom Hashicorp Vault) - koristi se za pozadinsku sinkronizaciju i uspoređivanje podataka (za obavijesti o novostima)
* **Token** - hash korisničkog imena i lozinke, koji se koristi za daljnju upotrebu API-a i identifikaciju u zapisima na strani servera
* **Jezik uređaja** - npr. hr/de/en, služi za lokaliziranje odnosno prevođenje sadržaja kao npr. obavijesti
* **Informacije o školskoj godini**, što uključuje:
    * **Popis razreda i pripadajuće informacije** - oznaka (npr. 2.e), školska godina (npr. 2018./2019.), ime i mjesto škole te ime razrednika
    * **Popis predmeta i pripadajuće informacije** (samo sinkronizirani razredi) - ime predmeta, imena profesora koji predaju ili su predavali taj predmet i prosjek (zaključna ocjena, ako je dostupna, a ako nije onda se koristi izračunati prosjek)
    * **Popis ocjena, bilježaka za pojedini predmet i pripadajuće informacije** (samo sinkronizirani razredi) - datum upisivanja ocjene odnosno bilješke te bilješka uz ocjenu
    * **Popis ispita za pojedini razred i pripadajuće informacije** (samo sinkronizirani razredi) - datum ispita, predmet ispita te školski predmet za koji se taj ispit piše
    * **Popis izostanaka za pojedini razred i pripadajuće informacije** (samo sinkronizirani razredi)
        * **Brzi pregled** - broj sati na čekanju, broj opravdanih i neopravdanih sati, zbroj svih neodlučenih sati
        * **Detaljno** - datum skupine izostanaka, te za svaku skupinu izostanaka: status (opravdan/neopravdan), redni broj školskog sata, razlog i ime predmeta
    * **Informacije o učeniku** (samo sinkronizirani razredi, trenutno se ne koristi nigdje u aplikaciji) - datum rođenja, rodno mjesto, puno ime, redni broj i školski program
* **Postavke obavijesti**, što uključuje:
    * **Status obavijesti** - treba li slati korisniku obavijesti ili ne
    * **Isključene kategorije** - koje vrste obavijesti ne treba slati
* **Firebase Cloud Messaging token** - koristi se za slanje obavijesti na uređaj i za provjeru je li aplikacija još uvijek instalirana
* **Platforma uređaja** - npr. *Android/iOS/drugo*, služi za bolje kategoriziranje mogućih problema u radu aplikacije (npr. događa li se greška samo na toj platformi)
* **Model uređaja** - npr. *SM-G965F*, služi za bolje kategoriziranje mogućih problema u radu aplikacije (npr. događa li se greška samo kod tog proizvođača ili tog modela uređaja)

**Sinkronizirani razred** je svaki razred čiji podatci se nalaze u bazi podataka na eDAP poslužitelju. Nakon prve prijave, jedini sinkronizirani razred je prvi razred u listi (tekuća školska godina). Druge razrede moguće je sinkronizirati s poslužiteljem pritiskom na razred u izborniku "Razredi".

Gore navedene podatke je moguće isbrisati pritiskom na gumb "Odjava" pod tabom "Postavke" u aplikaciji.

Deinstalacija aplikacije deaktivira vezani FCM (Firebase Cloud Messaging) token, što koristimo za detektiranje neaktivnih korisnika, pri čemu s naših servera brišemo vezane podatke kako bi se smanjila upotreba bandwidtha i opterećenje i naših i CARNetovih servera.

Također, pošto je eDAP web servis, za svaki zahtjev spremaju se i ove informacije:
* **IP adresa**
* **Vrijeme i datum zahtjeva**
* **Zatražena stranica/URL**
* **Veličina odgovora u bajtovima**
* **User agent** - sadrži ime i verziju web preglednika te model uređaja i verziju operativnog sustava
* **Referrer** - web stranica s koje je došao zahtjev

Ti podaci se dalje upotrebljavaju u svrhu detektiranja napada i poboljšanja usluge.

eDAP se spaja na CARNetov servis e-Dnevnik, čija pravila o privatnosti možete pročitati [ovdje](https://www.carnet.hr/obavijest-o-privatnosti/).

### Netrix (frontend)

Netrix koristi Googleov **Firebase Cloud Messaging** za obavijesti, **Firebase Crashlytics** za izjave o greškama i **AdMob** za prikazivanje reklama. Za više informacija o podacima koji se šalju, provjerite [Googleova pravila o privatnosti](https://policies.google.com/privacy) i [Kako Google koristi Vaše podatke](https://policies.google.com/technologies/partner-sites).

**Firebase Crashlytics** šalje izvještaje o rušenju aplikacije, ili o drugim problemima tijekom rada aplikacije. Moguće ga je isključiti u postavkama aplikacije.

U izvještaju o grešci sadržane su sljedeće informacije:

* Proizvođač i model uređaja
* Količina slobodnog RAM-a i prostora za pohranu
* Verzija operativnog sustava
* Je li uređaj rootan
* Datum događaja
* Verzija aplikacije
* Zapis događaja koji je doveo do greške (log), koji sadrži:
    * Vrijeme i datum
    * Funkciju koja ostavlja zapis

Niti jedan unos u zapis događaja ne sadržava identificirajuće podatke.

**AdMob** je moguće isključiti opcijom "Prikazuj reklame".

Google može koristiti Vaš profil za bolje ciljanje reklama (eng. *ad targeting*) prema Vašim interesima. Više informacija o tome i kako upravljati tom opcijom nalazi se [ovdje](https://support.google.com/ads/answer/1660762).

Ako korisnik ne stisne gumb "Prijava", aplikacija se neće javiti na eDAP poslužitelj, ali je moguće da će napraviti neke zahtjeve na Googleove poslužitelje vezane za Firebase.

## netrix.io (web-stranica)

Web stranica [netrix.io](https://netrix.io) koristi Cloudflare Workers, koji daje samo statističke podatke o korištenju (broj zahtjeva i HTTP statusni kod). Ne skupljaju se nikakvi podatci kojima se može identificirati ili pratiti korisnika.

## Sigurnost prijenosa podataka

Netrix koristi HTTPS protokol za komunikaciju sa svojim API-em i *Firebaseom*. Ako HTTPS provjera ne uspije, aplikacija neće poslati nikakve podatke, te će korisnik biti upozoren.

## Sigurnost spremljenih podataka

eDAP kao spremište za korisnička imena i lozinke koristi open-source program Hashicorp Vault. Način na koji funkcionira enkripcija u tom sustavu možete pročitati [ovdje](https://www.hashicorp.com/resources/how-does-vault-encrypt-data).

Pri odjavi se brišu svi korisnički podaci sa servera.

## Upravljanje podatcima

### Brisanje podataka s Netrix servisa

Podatke je moguće potpuno obrisati sa servera pritiskom na gumb "Odjava" u postavkama aplikacije. Taj postupak briše sve podatke navedene u "eDAP" pod "Spremanje i korištenje podataka".

### Kopija podataka

Možete zatražiti kopiju Vaših podataka upitom na e-mail bs3vcenk@gmail.com. Kopija uključuje podatke s naših servera (potpuni profil i zapisi vezani za Vaš profil, ako su još dostupni) te nama dostupne podatke s Googleovih servisa (npr. *Firebase Analytics*, ako je omogućeno).

## Druge stvari

Zadnje ažuriranje ovog dokumenta je bilo 28.1.2020.

Prijašnje inačice ovog dokumenta možete zatražiti upitom na e-mail bs3vcenk@gmail.com.