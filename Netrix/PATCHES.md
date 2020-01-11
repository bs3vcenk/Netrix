# Potrebne promjene za potpunu funkcionalnost

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

## Google Ads Lite

Potrebno je izmjeniti liniju

```xml
<framework src="com.google.android.gms:play-services-ads:$PLAY_SERVICES_VERSION" />
```

u datoteci `plugins/cordova-admob-plus/config.xml` tako da `play-services-ads` postane `play-services-ads-lite`:

```xml
<framework src="com.google.android.gms:play-services-ads-lite:$PLAY_SERVICES_VERSION" />
```

To smanjuje veličinu release builda za 1MB.