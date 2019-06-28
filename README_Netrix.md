# Netrix

Netrix je frontend za EDAP library, pisan u [Ionic](https://ionicframework.com/) frameworku (Angular).

## Upotreba

### Potrebni programi

* [Android Studio](https://developer.android.com/studio)
* [JDK 8](https://github.com/frekele/oracle-java/releases) (odabrati `jdk-8u*`)
	* `set PATH=%PATH%;C:\Program Files\Java\jdk1.8.0_*\bin` (nakon instalacije JDK)
* [NodeJS + NPM](https://nodejs.org/en/download/)
	* `npm install -g cordova cordova-res ionic native-run` (nakon instalacije NodeJS)

Android Studio i JDK su potrebni samo ako želite aplikaciju instalirati na Android uređaj.

### Postupak

Ako želite konfigurirati svoj server (self-hosted), potrebno je promijeniti `API_SERVER` varijablu u `src/app/authentication.service.ts`. Ako ne želite, već uneseni server https://api.netrix.io je dovoljan.

```bash
cd eDnevnik/Netrix
npm install
ionic serve # lokalno, na računalu
ionic cordova run android # na emulatoru/ADB uređaju
ionic cordova run ios # macOS only, na iOS simulatoru
```
