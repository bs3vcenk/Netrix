import { Injectable } from '@angular/core';
import { Storage } from '@ionic/storage';
import { AdmobService } from './admob.service';
import { StatusBar } from '@ionic-native/status-bar/ngx';
import { FirebaseX } from '@ionic-native/firebase-x/ngx';
import { BehaviorSubject } from 'rxjs';

interface Preferences {
  theme: 'dark' | 'light';
  dataCollection: boolean;
  showAd: boolean;
  enableNotifications: boolean;
  testNotifTime: number;
}

@Injectable({
  providedIn: 'root'
})
export class SettingsService {

  migrationFinished = new BehaviorSubject(false);
  prefsFinished = new BehaviorSubject(false);

  /*dataPreference = null;
  notifPreference = null;
  adPreference = null;
  forceCroatianPreference = null;*/
  language = null;
  // notifTime = null;
  apiServer = 'https://api.netrix.io';
  // httpLimit = 5000;
  // globalTheme: 'dark' | 'light';

  private defaultPreferences: Preferences = {
    theme: 'light',
    dataCollection: false,
    showAd: true,
    enableNotifications: true,
    testNotifTime: 3
  };
  preferences: Preferences = this.defaultPreferences;

  constructor(
    private storage: Storage,
    private admobSvc: AdmobService,
    private statusBar: StatusBar,
    private firebase: FirebaseX
  ) {
    this.storage.ready().then(() => {
      this.firebase.logMessage('SettingsService: Storage is ready');
    });
  }

  async resetPreferences() {
    /* Reset user preferences (also called on first start) */
    await this.storage.set('user-preferences', this.defaultPreferences);
    this.firebase.logMessage('SettingsService/resetPreferences(): Successfully (re)set preferences');
  }

  async syncPreferences() {
    /* Sync `preferences` variable with database */
    await this.storage.set('user-preferences', this.preferences);
    this.firebase.logMessage('SettingsService/syncPreferences(): Successfully synced preferences with database');
  }

  readPrefs() {
    this.storage.get('user-preferences').then((res: Preferences) => {
      if (res === null) {
        this.resetPreferences();
      } else {
        this.preferences = res;
      }
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
    this.firebase.setAnalyticsCollectionEnabled(val);
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
