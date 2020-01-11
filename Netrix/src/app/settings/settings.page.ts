import { Component } from '@angular/core';
import { AlertController, PickerController, ToastController } from '@ionic/angular';
import { AuthenticationService } from '../services/authentication.service';
import { SettingsService } from '../services/settings.service';
import { trigger, state, style, animate, transition } from '@angular/animations';
import { PickerOptions } from '@ionic/core';
import { TranslateService } from '@ngx-translate/core';
import { ApiService } from '../services/api.service';
import { NotificationService } from '../services/notification.service';
import { environment } from '../../environments/environment';
import { AdmobService } from '../services/admob.service';

@Component({
  selector: 'app-settings',
  templateUrl: 'settings.page.html',
  styleUrls: ['settings.page.scss'],
  animations: [
    trigger('fadeInOut', [
      state('void', style({ opacity: '0' })),
      state('*', style({ opacity: '1' })),
      transition('void <=> *', animate('150ms ease-in'))
    ])
  ]
})
export class SettingsPage {

  timeSingular = this.translate.instant('settings.time_singular');
  timePlural = this.translate.instant('settings.time_plural');

  dataPreference = null;
  notifPreference = null;
  errorPreference = null;
  adPreference = null;
  forceCroatianPreference = null;
  testNotifTime = null;
  darkModePreference = null;
  usingCache = null;
  dayString = this.timePlural;
  developer = !environment.production;

  constructor(
    private authServ: AuthenticationService,
    private settings: SettingsService,
    private pickerCtrl: PickerController,
    private translate: TranslateService,
    private apiSvc: ApiService,
    private alertControl: AlertController,
    private toastControl: ToastController,
    private notifSvc: NotificationService,
    private admobSvc: AdmobService
  ) {
    this.dataPreference = this.settings.dataPreference;
    // this.errorPreference = this.settings.errorPreference;
    this.notifPreference = this.settings.notifPreference;
    this.testNotifTime = this.settings.notifTime;
    this.adPreference = this.settings.adPreference;
    this.forceCroatianPreference = this.settings.forceCroatianPreference;
    this.darkModePreference = this.settings.globalTheme === 'dark';
    this.usingCache = this.apiSvc.usingCachedContent;
    if (this.testNotifTime === 1) {
      this.dayString = this.timeSingular;
    }
  }

  _logout() {
    this.authServ.logout();
  }

  logout() {
    // Data collection alert
    this.alertControl.create({
      header: this.translate.instant('settings_page.alert.logout.header'),
      message: this.translate.instant('settings_page.alert.logout.content'),
      buttons: [
        {
          text: this.translate.instant('generic.choice.no'),
          role: 'cancel'
        },
        {
          text: this.translate.instant('generic.choice.yes'),
          handler: () => {
            // Proceed to logout if accepted
            this._logout();
          }
        }
      ]
    }).then(alert => {
      // Show the alert
      alert.present();
    });
  }

  effectOnRestart() {
    this.toastControl.create({
      message: this.translate.instant('settings_page.alert.effect_on_restart'),
      duration: 3000,
      color: 'dark'
    }).then((toast) => {
      toast.present();
    });
  }

  updDeviceInfoPreference() {
    if (this.dataPreference !== this.settings.dataPreference) {
      this.settings.setDataCollection(this.dataPreference);
    }
  }

  updAdPreference() {
    if (this.adPreference !== this.settings.adPreference) {
      this.settings.changePreference('ad-preference', this.adPreference);
      this.settings.adPreference = this.adPreference;
      this.effectOnRestart();
    }
  }

  updMainNotificationPreference() {
    if (this.notifPreference !== this.settings.notifPreference) {
      this.settings.changePreference('notif-preference', this.notifPreference);
      this.settings.notifPreference = this.notifPreference;
      this.apiSvc.setNotifDisabled(!this.notifPreference);
    }
  }

  updDarkModePreference() {
    if (this.darkModePreference ? 'dark' : 'light' === this.settings.globalTheme) {
      this.settings.changePreference('global-theme', this.darkModePreference ? 'dark' : 'light');
      this.settings.globalTheme = this.darkModePreference ? 'dark' : 'light';
      this.settings.setGlobalTheme(this.settings.globalTheme);
    }
  }

  updHRForcePreference() {
    if (this.forceCroatianPreference !== this.settings.forceCroatianPreference) {
      this.settings.changePreference('force-croatian-preference', this.forceCroatianPreference);
      this.settings.forceCroatianPreference = this.forceCroatianPreference;
      this.effectOnRestart();
    }
  }

  resetNotif() {
    this.notifSvc.disableAll();
  }

  async openNotifTimePicker() {
    const opts: PickerOptions = {
      buttons: [
        {
          text: this.translate.instant('settings_page.alert.time.choice.cancel'),
          role: 'cancel'
        },
        {
          text: this.translate.instant('settings_page.alert.time.choice.done'),
          handler: (choice: any) => {
            this.testNotifTime = choice.time.value;
            this.settings.changePreference('notif-time', this.testNotifTime);
            this.settings.notifTime = this.testNotifTime;
            if (this.testNotifTime === 1) {
              this.dayString = this.timeSingular;
            } else {
              this.dayString = this.timePlural;
            }
            this.resetNotif();
          },
        }
      ],
      columns: [
        {
          name: 'time',
          options: [
            {text: '14 ' + this.timePlural, value: 14},
            {text: '7 ' + this.timePlural, value: 7},
            {text: '5 ' + this.timePlural, value: 5},
            {text: '4 ' + this.timePlural, value: 4},
            {text: '3 ' + this.timePlural, value: 3},
            {text: '2 ' + this.timePlural, value: 2},
            {text: '1 ' + this.timeSingular, value: 1}
          ]
        }
      ]
    };
    const picker = await this.pickerCtrl.create(opts);
    picker.present();
  }

  forceCroatian() {
    this.translate.use('hr');
  }

  invertCacheIndicator() {
    this.usingCache = !this.usingCache;
    this.apiSvc.usingCachedContent = this.usingCache;
  }

  clearCache() {
    this.apiSvc.clearCache();
  }

  disableBanner() {
    this.admobSvc.hideBanner();
  }

}
