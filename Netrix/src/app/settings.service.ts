import { Injectable } from '@angular/core';
import { Storage } from '@ionic/storage';
import { FirebaseService } from './firebase.service';
import { AdmobService } from './admob.service';

@Injectable({
  providedIn: 'root'
})
export class SettingsService {

  dataPreference = null;
  dataPrefUnset = true;
  errorPreference = null;
  notifPreference = null;
  adPreference = null;
  language = null;
  notifTime = null;
  apiServer = 'https://api.netrix.io';
  httpLimit = 5000;

  constructor(
    private storage: Storage,
    private firebase: FirebaseService,
    private admobSvc: AdmobService
  ) {}

  readPrefs() {
    this.storage.get('data-preference').then(res => {
      // Check if it is stored at all
      if (res != null) {
        this.firebase.setAnalytics(res);
        this.dataPreference = res;
        this.dataPrefUnset = false;
      } else { // If it isn't stored, store it and set default (false)
        this.storage.set('data-preference', false).then(() => {
          this.dataPreference = false;
          this.dataPrefUnset = true;
          this.firebase.setAnalytics(false);
          console.log('SettingsService/readPrefs(): API analytics preference defaulted to false');
        });
      }
      this.storage.get('error-preference').then(resx => {
        if (resx != null) {
          this.errorPreference = resx;
        } else {
          this.errorPreference = true;
        }
      });
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
      this.adPreference = this.admobSvc.adPreference;
    });
  }

  setDataCollection(val) {
    this.changePreference('data-preference', val);
    this.firebase.setAnalytics(val);
    this.dataPreference = val;
    this.dataPrefUnset = false;
  }

  setAdShow(val) {
    this.changePreference('ad-preference', val);
    this.admobSvc.adPreference = val;
    this.adPreference = val;
  }

  /*setErrorReporting(val) {
    Sentry.setShouldSendCallback((event) => {
      return val;
    });
    this.changePreference("error-preference", val);
    this.errorPreference = val;
  }*/

  changePreference(pref, prefValue) {
    this.storage.set(pref, prefValue).then(() => {
      console.log('SettingsService/changePreference(): Set ' + pref + ' to ' + prefValue);
    });
  }
}
