# Netrix
Netrix je aplikacija koja unaprjeđuje iskustvo korištenja e-Dnevnika pomoću obavijesti o ocjenama, ispitima i izostancima te modernim izgledom dizajniranim za mobilne uređaje - platforma gdje se e-Dnevnik najviše koristi.

* Backend - [eDAP](https://github.com/btx3/Netrix/blob/master/README_edap.md) (eDnevnikAndroidProject) [Python]
* Frontend - [Netrix](https://github.com/btx3/Netrix/blob/master/README_Netrix.md) [JS (Typescript)/Ionic Framework]

![Banner za Netrix](https://i.imgur.com/VkQ7SQX.jpg)

## Instalacija aplikacije

Najnovija verzija je dostupna na [Play Store stranici](https://play.google.com/store/apps/details?id=io.btx3.netrix).

U slučaju da vam je potrebna starija verzija (od 1.1.0 do 1.4.0), moguće ju je preuzeti pod [Releases](https://github.com/btx3/Netrix/releases). [UPOZORENJE: 1.3.0 i starije verzije trebaju stariji eDAP API, jer u novijim verzijama ne postoji `/grades` i `/notes` endpoint]

## Netrix v2.0 (Javascript parser)
Buduća verzija Netrixa, 2.0, će imati procesiranje podataka potpuno u Javascriptu. Trenutno je implementacija nestabilna, ali ako želite probati, dostupna je na [`purejs`](https://github.com/btx3/Netrix/tree/purejs) branchu. Moguće ga je klonirati putem komande:

```shell
git clone -b purejs git@github.com:btx3/Netrix.git
```
