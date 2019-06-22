# Netrix (eDnevnik for Android)
* Backend - [eDAP](https://github.com/btx3/eDnevnik/blob/master/README_edap.md) (eDnevnikAndroidProject) [Python]
* Frontend - [Netrix](https://github.com/btx3/eDnevnik/blob/master/README_Netrix.md) [JS/Ionic]

## Kako funkcionira

```
            ------------                 ----------------
           |  Frontend  |               |      API       |     --------              ----------
 - User -> | (JS/Ionic) | - ReST API -> | (Flask/Python) | -> |  eDAP  | - HTTPS -> | eDnevnik |
            ------------                |    TCP/5000    |     --------              ----------
                                         ----------------  
```

## Instalacija
Projekt je trenutno u fazi razvijanja, pa stoga nema jednostavnih skripta za postavljanje.

Upute za instalaciju možete pronaći na linkovima za backend i frontend gore.