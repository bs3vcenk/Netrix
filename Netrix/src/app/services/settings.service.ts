import { Injectable } from '@angular/core';
import { Storage } from '@ionic/storage';
import { AdmobService } from './admob.service';
import { StatusBar } from '@ionic-native/status-bar/ngx';
import { FirebaseX } from '@ionic-native/firebase-x/ngx';

@Injectable({
  providedIn: 'root'
})
export class SettingsService {

  // hasLoadedDataPref = new BehaviorSubject(false);

  dataPreference = null;
  notifPreference = null;
  adPreference = null;
  forceCroatianPreference = null;
  language = null;
  notifTime = null;
  apiServer = 'https://api.netrix.io';
  // httpLimit = 5000;
  globalTheme: 'dark' | 'light';

  constructor(
    private storage: Storage,
    private admobSvc: AdmobService,
    private statusBar: StatusBar,
    private firebase: FirebaseX
  ) {}

  readPrefs() {
    this.storage.get('data-preference').then(res => {
      if (res != null) {
        console.log('SettingsService/readPrefs(): Firebase Analytics preference set to ' + res);
        this.firebase.setAnalyticsCollectionEnabled(res);
        this.dataPreference = res;
      } else { // If it isn't stored, store it and set default (false)
        this.storage.set('data-preference', false).then(() => {
          this.dataPreference = false;
          this.firebase.setAnalyticsCollectionEnabled(false);
          console.log('SettingsService/readPrefs(): Firebase Analytics preference defaulted to off');
        });
      }
      // this.hasLoadedDataPref.next(true);
      this.storage.get('notif-preference').then(resx => {
        if (resx != null) {
          this.notifPreference = resx;
        } else {
          this.notifPreference = true;
        }
      });
      this.storage.get('notif-time').then(resx => {
        if (resx != null) {
          this.notifTime = resx;
        } else {
          this.notifTime = 3; // three days
        }
      });
      this.storage.get('global-theme').then(resx => {
        if (resx != null) {
          this.globalTheme = resx;
          this.setGlobalTheme(this.globalTheme);
        } else {
          this.globalTheme = 'light';
        }
      });
      this.adPreference = this.admobSvc.adPreference;
    });
  }

  setGlobalTheme(nThemeName: 'dark' | 'light') {
    /* Set/unset dark mode */
    console.log('SettingsService/setGlobalTheme(): Setting ' + nThemeName + ' theme');
    document.body.classList.toggle('dark', nThemeName === 'dark');
    nThemeName === 'dark' ? this.statusBar.styleLightContent() : this.statusBar.styleDefault();
    this.statusBar.backgroundColorByHexString(nThemeName === 'dark' ? '#000000' : '#ffffff');
  }

  setDataCollection(val: boolean) {
    /* Change the analytics collection preference */
    this.changePreference('data-preference', val);
    this.firebase.setAnalyticsCollectionEnabled(val);
    this.dataPreference = val;
  }

  setAdShow(val: boolean) {
    /* Change whether the banner ad should be initialized on startup */
    this.changePreference('ad-preference', val);
    this.admobSvc.adPreference = val;
    this.adPreference = val;
  }

  changePreference(pref, prefValue) {
    /* Set `pref` to `prefValue` */
    this.storage.set(pref, prefValue).then(() => {
      console.log('SettingsService/changePreference(): Set ' + pref + ' to ' + prefValue);
    });
  }
}
