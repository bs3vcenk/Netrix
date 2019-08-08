# Netrix Changelog

## 1.7.6
* Opcija "Preloadaj predmete" sada efikasnije hvata podatke sa servera (planirano je da to postane zadani način)
* Nova ikona za izostanke
* Dodan upit pri odjavi
* Prevedene eksperimentalne opcije
* Poboljšano procesiranje predmeta

## 1.7.5
* Sada dostupno za uređaje na Androidu 5.0+
* Dodana opcija "Preload subjects on app open" pod Postavke > Experimental, koja usporava vrijeme otvaranja aplikacije u zamjenu za brže otvaranje pojedinih predmeta
* Ažurirani NPM paketi

## 1.7.4
* Dodan tamni način pod Postavke > Experimental
* Promijenjena funkcionalnost prikupljanja podataka (sada je zadano uključeno, umanjeno prikupljanje)
* Optimiziran graf u pregledu izostanaka
* Popravljena opcija za uključivanje/isključivanje obavijesti
* Ažurirani backend NPM paketi
* Optimiziran error handling APIServicea

## 1.7.3
* Sada se koriste Native HTTP funkcije sustava
* Novi dizajn ekrana greške
* Implementirano potpuno isključenje obavijesti
* Poboljšan handling grešaka
* Ažuriranje frameworka
* Popravljen krivi ID dan Firebaseu
* Nekorišten kod uklonjen

## 1.7.2
* Optimizirano hvatanje podataka o predmetima
* Optimizirana lista ispita
* Privremeno uklonjena opcija prikaza svih testova
* Uklonjen "spinner" s početnog ekrana
* Uklonjen nekorišten kod
* Poboljšano izvršavanje Firebase funkcija
* Dodano prijavljivanje grešaka pomoću Crashlytics

## 1.7.1
* Popravljeno slanje statistika
* Uklonjeno nepotrebno zapisivanje logova
* Poboljšan handling grešaka

## 1.7.0
* Imena ekrana i korisnički ID-evi dodani na Firebase
* Deregistracija s Firebasea pri odjavi
* Dodana mogućnost blokiranja obavijesti po tipu
* Uklonjen Sentry, uskoro će ga zamijeniti Firebase Crashlytics
* Firebase ažuriran na FirebaseX
* Popravljena greška u kojoj je bilo moguće da se ne učita niti jedan predmet ni prosjek
* Privremeno uklonjen in-app notification toast
* Slanje jezika neovisno o postavci analitike

## 1.6.5
* Uklonjene postavke obavijesti, vratit ce se kad su potpuno implementirane
* Popravljeni gumbi ponovnog ucitavanja na ekranama gresaka
* Popravljena greska gdje je API caching mogao zamrznuti rad aplikacije

## 1.6.4
* Preloading nekih API metoda
* Postavljanje grafa izostanaka prebačeno u ionViewDidEnter
* Dodane postavke za obavijesti (trenutno ne rade ništa)
* Neki problemi s performansom riješeni
* Popravljena specifikacija FirebaseService
* Nadogradnja nekih node paketa

## 1.6.3
* Prikazan prosjek razreda na glavnom ekranu
* Popravljen njemački prijevod za limit profesora
* Zaustavljano slanje greške u slučaju pada mreže
* Dodan pravilni handling grešaka u nekim mjestima
* Popravljen prazan unos u listi u stranici detaljnog prikaza izostanaka

## 1.6.2
* Dodane reklame (samo mali dio ekrana, dolje)
* Funkcija odjave sada briše podatke sa servera
* Veličina aplikacije smanjena sa 20MB na 5MB

## 1.6.1
* GDPR (Pravila o privatnosti)
* Opt-in slanje informacija o uređaju prebačeno u opt-out
* Opcija slanja informacija kontrolira i Firebase Analytics
* Maknut izbornik "API postavke"
* Promijenjena funkcija mrežnog upozorenja

# 1.6.0
* Stavljen limit na profesore (ako je više od 3, stavlja se "i N više")
* Promijenjen izgled grafa za izostanke (boja, veličina itd.)
* Timeout HTTP zahtjeva promijenjen sa 3 na 5 sekundi
* Dodan detaljni pregled izostanaka

# 1.5.0
* Popravljen CSS stil za obavijesti dok je aplikacija otvorena
* Dodan (privremeni) header u in-app obavijesti
* Font promijenjen iz Eina u San Francisco
* Dodan error handling u stranicu s testovima
* Promijenjen izgled izostanaka