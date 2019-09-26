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
        this.firebase.setAnalyticsCollectionEnabled(res);
        this.dataPreference = res;
      } else { // If it isn't stored, store it and set default (false)
        this.storage.set('data-preference', false).then(() => {
          this.dataPreference = false;
          this.firebase.setAnalyticsCollectionEnabled(false);
          console.log('SettingsService/readPrefs(): API analytics preference defaulted to off');
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
    /* CSS variables for theming the app */
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
      /* Set the light theme */
      console.log('SettingsService/setGlobalTheme(): Setting light theme');
      /* Recursively apply values in themeVars */
      // tslint:disable-next-line: forin
      for (const varName in themeVars.light) {
        root.style.setProperty(varName, themeVars.light[varName]);
      }
      /* Make status bar colour fit with theme */
      this.statusBar.backgroundColorByHexString('#ffffff');
      this.statusBar.styleDefault();
    } else if (nThemeName === 'dark') {
      /* Set the dark theme */
      console.log('SettingsService/setGlobalTheme(): Setting dark theme');
      /* Recursively apply values in themeVars */
      // tslint:disable-next-line: forin
      for (const varName in themeVars.dark) {
        root.style.setProperty(varName, themeVars.dark[varName]);
      }
      /* Make status bar colour fit with theme */
      this.statusBar.backgroundColorByHexString('#000000');
      this.statusBar.styleLightContent();
    }
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
    this.firebase.logEvent('changed_preference', {
      preference: pref,
      value: prefValue
    });
    this.storage.set(pref, prefValue).then(() => {
      console.log('SettingsService/changePreference(): Set ' + pref + ' to ' + prefValue);
    });
  }
}
