import { Injectable } from '@angular/core';
import { Storage } from '@ionic/storage';

@Injectable({
  providedIn: 'root'
})
export class SettingsService {

  dataPreference = null;
  language = null;
  apiServer = "https://api.netrix.io";

  constructor(private storage: Storage) {}

  readPrefs() {
    this.storage.get("data-preference").then(res => {
      // Check if it is stored at all
      if (res) {
        this.dataPreference = res;
      } else { // If it isn't stored, store it and set default (true)
        this.storage.set("data-preference", true).then(() => {
        this.dataPreference = true;
        console.log("AuthenticationService/initPreferences(): Analytics preference defaulted to true");
        });
      }
    });
  }

  changePreference(pref, prefValue) {
    this.storage.set(pref, prefValue).then(() => {
      console.log("SettingsService/changePreference(): Set " + pref + " to " + prefValue);
    });
  }
}
