import { Injectable } from '@angular/core';
import { Storage } from '@ionic/storage';
import { FirebaseService } from './firebase.service';

@Injectable({
  providedIn: 'root'
})
export class SettingsService {

  dataPreference = null;
  dataPrefUnset = true;
  errorPreference = null;
  notifPreference = null;
  language = null;
  apiServer = "https://api.netrix.io";
  httpLimit = 5000;

  constructor(
    private storage: Storage,
    private firebase: FirebaseService
  ) {}

  readPrefs() {
    this.storage.get("data-preference").then(res => {
      // Check if it is stored at all
      if (res != null) {
        this.firebase.setAnalytics(res);
        this.dataPreference = res;
        this.dataPrefUnset = false;
      } else { // If it isn't stored, store it and set default (false)
        this.storage.set("data-preference", false).then(() => {
          this.dataPreference = false;
          this.dataPrefUnset = true;
          this.firebase.setAnalytics(false);
          console.log("SettingsService/readPrefs(): API analytics preference defaulted to false");
        });
      }
      this.storage.get("error-preference").then(res => {
        if (res != null) {
          this.errorPreference = res;
        } else {
          this.errorPreference = true;
          console.log()
        }
      });
      this.storage.get("notif-preference").then(res => {
        if (res != null) {
          this.notifPreference = res;
        } else {
          this.notifPreference = true;
        }
      });
    });
  }

  setDataCollection(val) {
    this.changePreference("data-preference", val);
    this.firebase.setAnalytics(val);
    this.dataPreference = val;
    this.dataPrefUnset = false;
  }

  setErrorReporting(val) {
    /*Sentry.setShouldSendCallback((event) => {
      return val;
    });
    this.changePreference("error-preference", val);
    this.errorPreference = val;*/
  }

  changePreference(pref, prefValue) {
    this.storage.set(pref, prefValue).then(() => {
      console.log("SettingsService/changePreference(): Set " + pref + " to " + prefValue);
    });
  }
}
