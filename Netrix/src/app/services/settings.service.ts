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
  settingsReady = new BehaviorSubject(false);

  errorReportPreference = null;
  notifPreference = null;
  adPreference = null;
  forceCroatianPreference = null;
  onDayNotifications = null;
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
  ) {
    this.storage.ready().then(() => {
      this.firebase.logMessage('SettingsService: Storage is ready');
    });
  }

  async readPrefs() {
    const dataPref = await this.storage.get('error-report-preference');
    if (dataPref != null) {
      this.firebase.logMessage('SettingsService/readPrefs(): Crashlytics preference set to ' + dataPref);
      this.firebase.setCrashlyticsCollectionEnabled(dataPref);
      this.errorReportPreference = dataPref;
    } else { // If it isn't stored, store it and set default (treu)
      this.storage.set('error-report-preference', true);
      this.errorReportPreference = true;
      this.firebase.setCrashlyticsCollectionEnabled(true);
      this.firebase.logMessage('SettingsService/readPrefs(): Crashlytics preference defaulted to off');
    }
    const notifPref = await this.storage.get('notif-preference');
    if (notifPref != null) {
      this.notifPreference = notifPref;
    } else {
      this.notifPreference = true;
    }
    const notifTime = await this.storage.get('notif-time');
    if (notifTime != null) {
      this.notifTime = notifTime;
    } else {
      this.notifTime = 3; // three days
    }
    const theme = await this.storage.get('global-theme');
    if (theme != null) {
      this.globalTheme = theme;
      this.setGlobalTheme(this.globalTheme);
    } else {
      this.globalTheme = 'light';
    }
    const onDayNotifs = await this.storage.get('on-test-notif-preference');
    if (onDayNotifs != null) {
      this.onDayNotifications = onDayNotifs;
    } else {
      this.onDayNotifications = true;
    }
    this.adPreference = this.admobSvc.adPreference;
    this.firebase.logMessage('SettingsService/readPrefs(): Firing settingsReady observable');
    this.settingsReady.next(true);
    this.firebase.logMessage('SettingsService/readPrefs(): PREFERENCES:');
    this.firebase.logMessage('SettingsService/readPrefs(): Crashlytics: ' + this.errorReportPreference);
    this.firebase.logMessage('SettingsService/readPrefs(): Notifications: ' + this.notifPreference);
    this.firebase.logMessage('SettingsService/readPrefs(): Notification time: ' + this.notifTime);
    this.firebase.logMessage('SettingsService/readPrefs(): Theme: ' + this.globalTheme);
    this.firebase.logMessage('SettingsService/readPrefs(): 0-day notifications: ' + this.onDayNotifications);
  }

  setGlobalTheme(nThemeName: 'dark' | 'light') {
    /* Set/unset dark mode */
    this.firebase.logMessage('SettingsService/setGlobalTheme(): Setting ' + nThemeName + ' theme');
    document.body.classList.toggle('dark', nThemeName === 'dark');
    nThemeName === 'dark' ? this.statusBar.styleLightContent() : this.statusBar.styleDefault();
    this.statusBar.backgroundColorByHexString(nThemeName === 'dark' ? '#0d0d0d' : '#f8f8f8');
  }

  setCrashReport(val: boolean) {
    /* Change the analytics collection preference */
    this.changePreference('error-report-preference', val);
    this.firebase.setCrashlyticsCollectionEnabled(val);
    this.errorReportPreference = val;
  }

  setAdShow(val: boolean) {
    /* Change whether the banner ad should be initialized on startup */
    this.changePreference('ad-preference', val);
    this.admobSvc.adPreference = val;
    this.adPreference = val;
  }

  async changePreference(pref, prefValue) {
    /* Set `pref` to `prefValue` */
    await this.storage.set(pref, prefValue);
    this.firebase.logMessage('SettingsService/changePreference(): Set ' + pref + ' to ' + prefValue);
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
