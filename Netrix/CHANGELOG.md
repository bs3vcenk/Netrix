## 1.9.2 (2019-10-12)
* Prestanak podrške za Android 5.0 i 5.1
* Popravljeno krivo sortiranje ispita po tjednima
* Svi datumi se sada prikazuju u hrvatskom formatu, bez obzira na jezik uređaja
* Vraćen stari sustav reklama (banner)
* Popravljeno prikazivanje izostanaka na čekanju
* Broj neopravdanih izostanaka se sada prikazuje samo ako ih ima

## 1.9.1 (2019-10-07)
* Uz ispite se prikazuje i broj dana do ispita
* (opet :) Popravljeno krivo računanje raspona tjedana za ispite
* Prikazivanje pune liste profesora ispod predmeta

# 1.9.0 (2019-10-07)
* Novi sustav reklama - nema više banner reklama, zamijenile su ih interstitial reklame
* Opcija "Prikazuj reklame" se sada zove "Rjeđe prikazuj reklame"
* Za sad se ne preuzimaju informacije o učeniku, jer se trenutno ne koriste 

## 1.8.10 (2019-10-04)
* Riješeno krivo računanje tjedana u pregledu ispita
* Promjena nekih prijevoda za bolje razumijevanje grešaka i drugih poruka
* Prosjek ocjena se sada na stranici predmeta prikazuje samo ako ima ocjena

## 1.8.9 (2019-09-28)
* Novi dizajn za stranicu predmeta – ispiti su grupirani po tjednima, a za svaku grupu piše i broj ispita u tjednu
* Optimizacija rada na sporijim uređajima
* Pravila o privatnosti su sada dostupna pod katogorijom "Analitika i reklame"
* Smanjeno prikupljanje podataka dok je opcija "Šalji podatke o koristenju" uključena

## 1.8.8 (2019-09-16)
* Popravljena kriva identifikacija za prijevod prilikom promjene postavke "Obavijesti prije ispita"

## 1.8.7 (2019-09-14)
* Od sada je po zadanom isključeno prikupljanje podataka o korištenju
* Maknuto upozorenje pri prijavi
* Tamni način sada mijenja i boju navigacijske trake
* Tamni način je sada pod kategorijom "Izgled"
* Ako nema ocjena (tj. prosjek je 0), prikazuje se tekst "Nema ocjena"
* Popravljena greška zbog koje se ispiti i izostanci nisu ažurirali pri promjeni razreda
* Popravljena greška zbog koje su obavijesti ostale zakazane i nakon odjave
* Popravljen izgled stranice izbora razreda
* Popravljen naslov na stranici izbora razreda
* Popravljene neke greške vezane za Firebase i svojstva elemenata
* Dodan handling u slučaju greške s mrežom

## 1.8.6 (2019-09-06)
* Dodan izbor razreda – sada je moguće odabrati i starije razrede
* Popravljena greška zbog koje se u nekim slučajevima izostanci nisu učitavali
* Popravljen prikaz općeg prosjeka – ako je prosjek bio 0 (bez ikakvih ocjena), prikazivalo se kao da ga nije bilo
* Popravljena prijava za razrede bez ocjena
* Sigurnije spremanje podataka za prijavu

## 1.8.5 (2019-08-27)
* Postavke više nisu zasebni tab, već pod gumbom na stranici "Predmeti"
* Spremanje tokena prebačeno na API umjesto Firestore
* Puno optimizacija na strani servera, kao npr. brža prijava
* Riješena greška zbog koje se korišteni font spremio dva puta

## 1.8.4 (2019-08-19)
* Novi logo (obavijesti, aplikacijski i na ekranu prijave)
* Uklonjen splash screen
* Dodan template ekran u slučaju da učitavanje predmeta dugo traje
* Popravljeno prikazivanje poruke o primjeni postavke, čak i kada postavka nije bila promijenjena
* Popravljeno hvatanje pravila o privatnosti
* Optimizacija pokrivenosti koda

## 1.8.3 (2019-08-18)
* SSL pinning (sigurnost od MITM napada)
* Riješena greška koja je povećala veličinu zadnje dvije verzije
* Riješena greška koja je u nekim slučajevima mogla onemogućiti postavljanje obavijesti za ispite

## 1.8.2 (2019-08-15)
* Riješavanje problema s performansom kada su reklame uključene
* Prijevod na švedski (napravio Logaridexus)

## 1.8.1 (2019-08-13)
* Novi dizajn ekrana za prijavu
* Zamjena sumnjivog librarya za reklame s open-source libraryem
* Ažuriranje na Angular 8
* Slanje ekvivalentne verzije servera za usporedbu
* Dodana poruka pri promjeni postavke za prikazivanje reklama

# 1.8.0 (2019-08-09)
* Restrukturiranje servisa (pod svoj zasebni folder)
* Lokalne obavijesti pomoću NotificationService
    * `currentTests` prevoren u Array nepisanih testova
    * Ponovno uključena opcija izbora vremenskog razmaka za obavijest
        * Poboljšan handling odabira vremenskog razmaka (cancel više ne odabire već prekida)
        * Preveden izbor
    * Dodano svojstvo `scheduled` na svaki ispit
    * Dodana ikona zvona na ispite koji imaju `scheduled == true`
* Vrijeme prebačeno u UNIX timestamp umjesto parsiranog teksta
* Novi dizajn stranice izostanaka
    * Uklonjena posebna stranica "Detaljni pregled"
    * Uklonjen graf sa stranice
    * Detaljni pregled prebačen na glavnu stranicu
    * Stanje prikazuju od dvije do četiri brojke na vrhu ekrana
    * Zelena kvačica sa opravdane izostanke, crveni križ za neopravdane
    * Popravljen prikaz u slučaju da nema izostanaka
    * Uklonjen `chart.js` dependency
* Preloading predmeta pretvoren u zadan način hvatanja podataka
    * Funkcionalnost `ApiService.preloadSubjects` prebačena u `ApiService.getSubjects()`
* Omogućena opcija `experimentalTransitionShadow` za izgled sličniji iOSu
* Preveden tekst u tražilici na stranici ispita
* `ApiService.handleErr()` funkcija pretvorena u `public`
    * `ApiService.handleErr()` korišten u `subjOverview`
* Uklonjene animacije iz `subjOverview`
* Dodani datumi na ocjene i bilješke u `subjOverview`
* Iskorišten `ApiService.SubjectData` interface u `SubjOverview` umjesto zasebnih varijabli
* Omogućeno slanje detaljnih izjava o greškama pomoću librarya `stacktrace.js`

## 1.7.6 (2019-08-04)
* Opcija "Preloadaj predmete" sada efikasnije hvata podatke sa servera (planirano je da to postane zadani način)
* Nova ikona za izostanke
* Dodan upit pri odjavi
* Prevedene eksperimentalne opcije
* Poboljšano procesiranje predmeta

## 1.7.5 (2019-08-02)
* Sada dostupno za uređaje na Androidu 5.0+
* Dodana opcija "Preload subjects on app open" pod Postavke > Experimental, koja usporava vrijeme otvaranja aplikacije u zamjenu za brže otvaranje pojedinih predmeta
* Ažurirani NPM paketi

## 1.7.4 (2019-07-30)
* Dodan tamni način pod Postavke > Experimental
* Promijenjena funkcionalnost prikupljanja podataka (sada je zadano uključeno, umanjeno prikupljanje)
* Optimiziran graf u pregledu izostanaka
* Popravljena opcija za uključivanje/isključivanje obavijesti
* Ažurirani backend NPM paketi
* Optimiziran error handling APIServicea

## 1.7.3 (2019-07-26)
* Sada se koriste Native HTTP funkcije sustava
* Novi dizajn ekrana greške
* Implementirano potpuno isključenje obavijesti
* Poboljšan handling grešaka
* Ažuriranje frameworka
* Popravljen krivi ID dan Firebaseu
* Nekorišten kod uklonjen

## 1.7.2 (2019-07-24)
* Optimizirano hvatanje podataka o predmetima
* Optimizirana lista ispita
* Privremeno uklonjena opcija prikaza svih testova
* Uklonjen "spinner" s početnog ekrana
* Uklonjen nekorišten kod
* Poboljšano izvršavanje Firebase funkcija
* Dodano prijavljivanje grešaka pomoću Crashlytics

## 1.7.1 (2019-07-23)
* Popravljeno slanje statistika
* Uklonjeno nepotrebno zapisivanje logova
* Poboljšan handling grešaka

# 1.7.0 (2019-07-23)
* Imena ekrana i korisnički ID-evi dodani na Firebase
* Deregistracija s Firebasea pri odjavi
* Dodana mogućnost blokiranja obavijesti po tipu
* Uklonjen Sentry, uskoro će ga zamijeniti Firebase Crashlytics
* Firebase ažuriran na FirebaseX
* Popravljena greška u kojoj je bilo moguće da se ne učita niti jedan predmet ni prosjek
* Privremeno uklonjen in-app notification toast
* Slanje jezika neovisno o postavci analitike

## 1.6.5 (2019-07-20)
* Uklonjene postavke obavijesti, vratit ce se kad su potpuno implementirane
* Popravljeni gumbi ponovnog ucitavanja na ekranama gresaka
* Popravljena greska gdje je API caching mogao zamrznuti rad aplikacije

## 1.6.4 (2019-07-20)
* Preloading nekih API metoda
* Postavljanje grafa izostanaka prebačeno u ionViewDidEnter
* Dodane postavke za obavijesti (trenutno ne rade ništa)
* Neki problemi s performansom riješeni
* Popravljena specifikacija FirebaseService
* Nadogradnja nekih node paketa

## 1.6.3 (2019-07-18)
* Prikazan prosjek razreda na glavnom ekranu
* Popravljen njemački prijevod za limit profesora
* Zaustavljano slanje greške u slučaju pada mreže
* Dodan pravilni handling grešaka u nekim mjestima
* Popravljen prazan unos u listi u stranici detaljnog prikaza izostanaka

## 1.6.2 (2019-07-17)
* Dodane reklame (samo mali dio ekrana, dolje)
* Funkcija odjave sada briše podatke sa servera
* Veličina aplikacije smanjena sa 20MB na 5MB

## 1.6.1 (2019-07-16)
* GDPR (Pravila o privatnosti)
* Opt-in slanje informacija o uređaju prebačeno u opt-out
* Opcija slanja informacija kontrolira i Firebase Analytics
* Maknut izbornik "API postavke"
* Promijenjena funkcija mrežnog upozorenja

# 1.6.0 (2019-07-15)
* Stavljen limit na profesore (ako je više od 3, stavlja se "i N više")
* Promijenjen izgled grafa za izostanke (boja, veličina itd.)
* Timeout HTTP zahtjeva promijenjen sa 3 na 5 sekundi
* Dodan detaljni pregled izostanaka

# 1.5.0 (2019-07-15)
* Popravljen CSS stil za obavijesti dok je aplikacija otvorena
* Dodan (privremeni) header u in-app obavijesti
* Font promijenjen iz Eina u San Francisco
* Dodan error handling u stranicu s testovima
* Promijenjen izgled izostanaka