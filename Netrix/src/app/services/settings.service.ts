import { Injectable } from '@angular/core';
import { Storage } from '@ionic/storage';
import { AdmobService } from './admob.service';
import { StatusBar } from '@ionic-native/status-bar/ngx';
import { FirebaseX } from '@ionic-native/firebase-x/ngx';
import { BehaviorSubject } from 'rxjs';

@Injectable({
  providedIn: 'root'
})
export class SettingsService {

  migrationFinished = new BehaviorSubject(false);

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
        this.firebase.logMessage('SettingsService/readPrefs(): Firebase Analytics preference set to ' + res);
        this.firebase.setAnalyticsCollectionEnabled(res);
        this.dataPreference = res;
      } else { // If it isn't stored, store it and set default (false)
        this.storage.set('data-preference', false).then(() => {
          this.dataPreference = false;
          this.firebase.setAnalyticsCollectionEnabled(false);
          this.firebase.logMessage('SettingsService/readPrefs(): Firebase Analytics preference defaulted to off');
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
    this.firebase.logMessage('SettingsService/setGlobalTheme(): Setting ' + nThemeName + ' theme');
    document.body.classList.toggle('dark', nThemeName === 'dark');
    nThemeName === 'dark' ? this.statusBar.styleLightContent() : this.statusBar.styleDefault();
    this.statusBar.backgroundColorByHexString(nThemeName === 'dark' ? '#0d0d0d' : '#f8f8f8');
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
      this.firebase.logMessage('SettingsService/changePreference(): Set ' + pref + ' to ' + prefValue);
    });
  }

  async migrateData() {
    /* Migrate DB from Chrome's IndexedDB to SQLite */
    const dummyKeyTitle = '_migration_finished';
    const dummyKeyContent = 'This is a dummy key to let migrateData() know migration has been completed.';
    // Check if we are running SQLite
    const res = await this.storage.get(dummyKeyTitle);
    if (res) {
      this.firebase.logMessage('SettingsService/migrateData(): Don\'t need to migrate data, migration already finished.');
      this.migrationFinished.next(true);
      return;
    }
    // Open the default Ionic database, named "_ionicstorage"
    const idb = window.indexedDB.open('_ionicstorage');
    idb.onsuccess = (_) => {
      this.firebase.logMessage('SettingsService/migrateData(): Opened IndexedDB');
      const database = idb.result;
      // Now open the "_ionickv" store
      let objStore: IDBObjectStore;
      try {
        objStore = database.transaction('_ionickv', 'readonly').objectStore('_ionickv');
      } catch (e) {
        this.firebase.logMessage('SettingsService/migrateData(): Failed to open db transaction');
        this.firebase.logMessage('SettingsService/migrateData(): Assuming this is a new install and does not need migrating');
        this.storage.set(dummyKeyTitle, dummyKeyContent);
        this.migrationFinished.next(true);
        return;
      }
      objStore.openCursor().onsuccess = (event: any) => { // Need to append ": any" because TS thinks there's no result on event.target
        const cursor = event.target.result;
        if (cursor) {
          this.storage.set(cursor.key, cursor.value); // Write into the SQLite DB
          cursor.continue();
        } else {
          this.migrationFinished.next(true);
          this.storage.set(dummyKeyTitle, dummyKeyContent);
          this.firebase.logMessage('SettingsService/migrateData(): No more keys left');
        }
      };
    };
  }
}
