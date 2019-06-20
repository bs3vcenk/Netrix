# Netrix

Netrix je frontend za EDAP library, pisan u Ionic frameworku (Angular).

![Screenshot](https://i.imgur.com/IabVfJy.jpg)

## Upotreba

### Potrebni programi

* [Android Studio](https://developer.android.com/studio)
* [JDK 8](https://github.com/frekele/oracle-java/releases) (odabrati `jdk-8u*`)
	* `set PATH=%PATH%;C:\Program Files\Java\jdk1.8.0_*\bin`
* [NodeJS + NPM](https://nodejs.org/en/download/)
	* `npm install -g cordova ionic native-run` (nakon instalacije NodeJS)

### Postupak

```bash
cd eDnevnik/Netrix
npm install
ionic serve # lokalno, na računalu
ionic cordova run android # na emulatoru/ADB uređaju
ionic cordova run ios # macOS only, na iOS simulatoru
```