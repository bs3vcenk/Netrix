# [Netrix](https://netrix.io)
![CircleCI](https://img.shields.io/circleci/build/github/btx3/Netrix.svg?label=build%3ANetrix&token=3f60d33e9cd7618f9b9af8b7c5e731baefb7934f)

* Backend - [eDAP](https://github.com/btx3/eDnevnik/blob/master/README_edap.md) (eDnevnikAndroidProject) [Python]
* Frontend - [Netrix](https://github.com/btx3/eDnevnik/blob/master/README_Netrix.md) [JS/Ionic]

![Banner za Netrix](https://i.imgur.com/VkQ7SQX.jpg)

## Buildovi/APKovi

Buildovi (.apk) su dostupni na [Releases](https://github.com/btx3/Netrix/releases) stranici (do v1.4.0) i na [Play Store stranici](https://play.google.com/store/apps/details?id=io.btx3.netrix) (od v1.4.0).

Molimo pazite kako se projekt još uvijek razvija, pa stoga nemojte očekivati iskustvo bez grešaka.

Ako je moguće, nemojte koristiti master branch za build, već koristite unaprijed testirane i provjerene verzije preuzimanjem sa [Releases](https://github.com/btx3/Netrix/releases) stranice ili pomoću [`git checkout`](https://stackoverflow.com/a/792027) komande.

## Kako funkcionira

```
            ------------                 ----------------
           |  Frontend  |               |      API       |     --------              ----------
 - User -> | (JS/Ionic) | - ReST API -> | (Flask/Python) | -> |  eDAP  | - HTTPS -> | eDnevnik |
            ------------                |    TCP/5000    |     --------              ----------
                                         ----------------  
```

## Instalacija/pomoć u razvijanju
Projekt je trenutno u fazi razvijanja, pa stoga nema jednostavnih skripta za postavljanje.

Upute za postavljanje okruženja za razvijanje možete pronaći na linkovima za backend i frontend gore.
