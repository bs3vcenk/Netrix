# Potrebne promjene za potpunu funkcionalnost

## FirebaseX.logError()

Potrebno je izmijeniti datoteke `index.d.ts` i `index.js` u mapi `node_modules/@ionic-native/firebase-x/ngx`; treba se dodati još jedan argument na logError funkciju, da izgleda ovako:

![Prikaz izmjene koda](https://i.imgur.com/AdzBuD0.png)

Najbolje ga je nazvati `stackTrace`, ali ime može biti bilo kakvo.

## Dark mode

Potrebno je izmjeniti funkciju `setStatusBarBackgroundColor` u datoteci `plugins/cordova-plugin-statusbar/src/android/StatusBar.java`.

Prvo treba pronaći ovu liniju koda:
```java
window.getClass().getMethod("setStatusBarColor", int.class).invoke(window, Color.parseColor(colorPref));
```
pa ispod nje nadodati:
```java
window.getClass().getMethod("setNavigationBarColor", int.class).invoke(window, Color.parseColor(colorPref));
```

To omogućuje potpuni dark mode (bez bijelog nav-bara na nekim mobitelima).