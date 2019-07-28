import { Injectable } from '@angular/core';
import { Storage } from '@ionic/storage';
import { FirebaseService } from './firebase.service';
import { AdmobService } from './admob.service';
import { BehaviorSubject } from 'rxjs';
import { StatusBar } from '@ionic-native/status-bar/ngx';

@Injectable({
  providedIn: 'root'
})
export class SettingsService {

  hasLoadedDataPref = new BehaviorSubject(false);

  dataPreference = null;
  dataPrefUnset = true;
  errorPreference = null;
  notifPreference = null;
  adPreference = null;
  language = null;
  notifTime = null;
  apiServer = 'https://api.netrix.io';
  httpLimit = 5000;
  globalTheme: string;

  constructor(
    private storage: Storage,
    private firebase: FirebaseService,
    private admobSvc: AdmobService,
    private statusBar: StatusBar
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
      this.hasLoadedDataPref.next(true);
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

  setGlobalTheme(nThemeName: string) {
    const themeVars = {
      dark: {
        '--ion-background-color': '#000000',
        '--ion-background-color-rgb': '0,0,0',
        '--ion-text-color': '#ffffff',
        '--ion-text-color-rgb': '255,255,255',
        '--ion-color-step-50': '#000000',
        '--ion-color-step-100': '#1a1a1a',
        '--ion-color-step-150': '#262626',
        '--ion-color-step-200': '#333333',
        '--ion-color-step-250': '#404040',
        '--ion-color-step-300': '#4d4d4d',
        '--ion-color-step-350': '#595959',
        '--ion-color-step-400': '#666666',
        '--ion-color-step-450': '#737373',
        '--ion-color-step-500': '#808080',
        '--ion-color-step-550': '#8c8c8c',
        '--ion-color-step-600': '#999999',
        '--ion-color-step-650': '#a6a6a6',
        '--ion-color-step-700': '#b3b3b3',
        '--ion-color-step-750': '#bfbfbf',
        '--ion-color-step-800': '#cccccc',
        '--ion-color-step-850': '#d9d9d9',
        '--ion-color-step-900': '#e6e6e6',
        '--ion-color-step-950': '#f2f2f2',
      },
      light: {
        '--ion-background-color': '#ffffff',
        '--ion-background-color-rgb': '255,255,255',
        '--ion-text-color': '#000000',
        '--ion-text-color-rgb': '0,0,0',
        '--ion-color-step-50': '#ffffff',
        '--ion-color-step-100': '#e6e6e6',
        '--ion-color-step-150': '#d9d9d9',
        '--ion-color-step-200': '#cccccc',
        '--ion-color-step-250': '#bfbfbf',
        '--ion-color-step-300': '#b3b3b3',
        '--ion-color-step-350': '#a6a6a6',
        '--ion-color-step-400': '#999999',
        '--ion-color-step-450': '#8c8c8c',
        '--ion-color-step-500': '#808080',
        '--ion-color-step-550': '#737373',
        '--ion-color-step-600': '#666666',
        '--ion-color-step-650': '#595959',
        '--ion-color-step-700': '#4d4d4d',
        '--ion-color-step-750': '#404040',
        '--ion-color-step-800': '#333333',
        '--ion-color-step-850': '#262626',
        '--ion-color-step-900': '#191919',
        '--ion-color-step-950': '#0d0d0d'
      }
    };
    const root = document.documentElement;
    if (nThemeName === 'light') {
      console.log('SettingsService/setGlobalTheme(): Setting light theme');
      // tslint:disable-next-line: forin
      for (const varName in themeVars.light) {
        root.style.setProperty(varName, themeVars.light[varName]);
      }
      this.statusBar.backgroundColorByHexString('#ffffff');
      this.statusBar.styleDefault();
    } else if (nThemeName === 'dark') {
      console.log('SettingsService/setGlobalTheme(): Setting dark theme');
      // tslint:disable-next-line: forin
      for (const varName in themeVars.dark) {
        root.style.setProperty(varName, themeVars.dark[varName]);
      }
      this.statusBar.backgroundColorByHexString('#000000');
      this.statusBar.styleLightContent();
    }
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
