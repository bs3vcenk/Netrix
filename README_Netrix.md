# Netrix

Netrix je frontend za eDAP API, pisan u [Ionic](https://ionicframework.com/) frameworku (Angular).

## Instalacija okruženja

### Linux/macOS

1. **Klonirajte repository na disk**:

```bash
git clone git@github.com:btx3/Netrix # ili "git clone https://github.com/btx3/Netrix" ako nemate SSH podešen
cd Netrix/Netrix
```

2. **Instalirajte potrebne programe**:

```bash
sudo apt install npm nodejs -y # NodeJS i package manager NPM
curl https://github.com/frekele/oracle-java/releases/download/8u212-b10/jdk-8u212-linux-x64.tar.gz | tar xz
cd jdk1.8.0_212
sudo cp -r bin/ lib/ include/ /usr/
sudo cp -r jre/{bin,lib} /usr/
cd .. && rm -rf jdk1.8.0_212
```

Testirajte radi li sve kako treba:

```bash
btx3@machine:~/Dokumente/Projects/Netrix/Netrix$ javac -version
javac 1.8.0_212
```

Nakon toga treba instalirati `gradle`:
```bash
curl https://services.gradle.org/distributions/gradle-5.5-bin.zip | tar xz
sudo cp -r gradle-5.5/{bin,lib} /usr/
rm -rf gradle-5.5
```

Opet, provjerite radi li:
```bash
btx3@machine:~$ gradle -v

------------------------------------------------------------
Gradle 5.5
------------------------------------------------------------

Build time:   2019-06-28 17:36:05 UTC
Revision:     83820928f3ada1a3a1dbd9a6c0d47eb3f199378f

Kotlin:       1.3.31
Groovy:       2.5.4
Ant:          Apache Ant(TM) version 1.9.14 compiled on March 12 2019
JVM:          1.8.0_212 (Oracle Corporation 25.212-b10)
OS:           Linux 5.0.0-20-generic amd64

```

Zatim trebate skinuti [Android Studio](https://developer.android.com/studio) (bit će u .tar.gz formatu) i instalirati ga:

(u novom terminalu [Ctrl+Alt+T]):
```bash
mv Downloads/android-studio-* .
tar xzf android-studio-*
rm -f android-studio-*
cd android-studio/bin/
./studio.sh
```

Kroz instalaciju sve "Next", a nakon što završi, odite pod "Configure" u donjem desnom kutu na "SDK Manager" i odaberite "Android 9.0 (Pie)", pa onda gore "SDK Tools" gdje treba odabrati "NDK". Pritisnite "Apply", označite "Accept" na prozoru koji se otvori i stisnite "Next".

Ovo preuzimanje i instalacija će možda potrajati (pošto ima ~1GB za preuzeti).

Nakon toga, potrebno je konfigurirati SDK instalaciju (ovo u prvotno otvorenom terminalu):
```bash
# Linux
echo -e "ANDROID_HOME=$HOME/Android/Sdk\nPATH=\${PATH}:\$ANDROID_HOME/tools:\$ANDROID_HOME/platform-tools" >> ~/.bashrc
source ~/.bashrc
# macOS
echo -e "ANDROID_HOME=$HOME/Library/Android/sdk\nPATH=\${PATH}:\$ANDROID_HOME/tools:\$ANDROID_HOME/platform-tools" >> ~/.bash_profile
source ~/.bash_profile
```

I, na kraju, provjerite je li SDK dobro konfiguriran:
```bash
btx3@machine:~/Dokumente/Projects/Netrix/Netrix$ adb --version
Android Debug Bridge version 1.0.41
Version 29.0.1-5644136
Installed as /home/btx3/Android/Sdk/platform-tools/adb
```

3. **Instalirajte NodeJS module**:

Za dostupnost nekih NPM moduleova potrebno ih je instalirati globalno (`-g` argument). Ako se ne želite zamarati problemima pristupa, preporučeno je da slijedite [ove upute](https://github.com/sindresorhus/guides/blob/master/npm-global-without-sudo.md) za omogućivanje *sudo-less global NPM* prije instalacije.

Kada ste gotovi, pokrenite ovo:

```bash
npm i
npm i -g cordova cordova-res ionic native-run
```

## Konfiguracija aplikacije

1. **Podesite Firebase**:

Potrebno je preuzeti `google-services.json` (za Android) i `GoogleService-Info.plist` (za iOS) datoteke i staviti ih u `Netrix/` mapu.

Nakon toga, potrebno je i omogućiti korištenje `logError()` funkcije u `@ionic-native/firebase-x` pomoću ove komande:

```bash
./patches/patchFirebase.sh
```

2. **Podesite Android platformu**:

Potrebno je pokrenuti ovu komandu:
```bash
ionic cordova platform add android --no-resources
```

3. **Pokrenite**:

### Android

Testno okruženje s automatskim ažuriranjem (live reloading, ostavite mobitel povezan s računalom):
```bash
ionic cordova run android -s --ssl
```
Standalone debug build (omogućava remote DevTools):
```bash
ionic cordova build android
```
Standalone release build u APK formatu (bez debug mogućnosti, za Play Store):
```bash
rm -rf www && ionic cordova build android --prod --release
```

### iOS

**UPOZORENJE**: Podrška za iOS nije najbolja, uglavnom zato što nemam iOS uređaj za testiranje, a ni 99 dolara godišnje za obavijesti nije baš jeftino.

Debug build:
```bash
ionic cordova run ios
```
Debug build za uređaj:
```bash
ionic cordova run ios --device
```