import { Component } from '@angular/core';
import { AlertController, PickerController, ToastController } from '@ionic/angular';
import { AuthenticationService } from '../services/authentication.service';
import { SettingsService } from '../services/settings.service';
import { trigger, state, style, animate, transition } from '@angular/animations';
import { PickerOptions } from '@ionic/core';
import { TranslateService } from '@ngx-translate/core';
import { FirebaseX } from '@ionic-native/firebase-x/ngx';
import { ApiService } from '../services/api.service';
import { NotificationService } from '../services/notification.service';
import { environment } from '../../environments/environment';

@Component({
  selector: 'app-tab3',
  templateUrl: 'tab3.page.html',
  styleUrls: ['tab3.page.scss'],
  animations: [
    trigger('fadeInOut', [
      state('void', style({ opacity: '0' })),
      state('*', style({ opacity: '1' })),
      transition('void <=> *', animate('150ms ease-in'))
    ])
  ]
})
export class Tab3Page {

  // dataPreference = null;
  notifPreference = null;
  errorPreference = null;
  adPreference = null;
  testNotifTime = null;
  darkModePreference = null;
  localProcPreference = null;
  dayString = this.translate.instant('settings.api.time_plural');
  developer = !environment.production;

  constructor(
    private authServ: AuthenticationService,
    private settings: SettingsService,
    private pickerCtrl: PickerController,
    private translate: TranslateService,
    private firebase: FirebaseX,
    private apiSvc: ApiService,
    private alertControl: AlertController,
    private toastControl: ToastController,
    private notifSvc: NotificationService
  ) {
    // this.dataPreference = this.settings.dataPreference;
    // this.errorPreference = this.settings.errorPreference;
    this.notifPreference = this.settings.notifPreference;
    this.testNotifTime = this.settings.notifTime;
    this.adPreference = this.settings.adPreference;
    this.darkModePreference = this.settings.globalTheme === 'dark';
    this.localProcPreference = this.settings.localProcPreference;
    if (this.testNotifTime === 1) {
      this.dayString = this.translate.instant('settings.api.time_singular');
    }
  }

  ionViewDidEnter() {
    try { this.firebase.setScreenName('Settings'); } catch (e) {}
  }

  _logout() {
    this.authServ.logout();
  }

  logout() {
    // Data collection alert
    this.alertControl.create({
      header: this.translate.instant('tab3.alert.logout.header'),
      message: this.translate.instant('tab3.alert.logout.content'),
      buttons: [
        {
          text: this.translate.instant('generic.choice.no'),
          role: 'cancel',
          handler: () => {
            this.firebase.logEvent('logout_returned', {});
          }
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

  /*updDeviceInfoPreference() {
    this.settings.setDataCollection(this.dataPreference);
  }*/

  updAdPreference() {
    if (this.adPreference !== this.settings.adPreference) {
      this.settings.changePreference('ad-preference', this.adPreference);
      this.settings.adPreference = this.adPreference;
      this.toastControl.create({
        message: this.translate.instant('tab3.alert.effect_on_restart'),
        duration: 3000,
        color: 'dark'
      }).then((toast) => {
        toast.present();
      });
    }
  }

  updLocalProcPreference() {
    if (this.localProcPreference !== this.settings.localProcPreference) {
      this.localProcPreference = this.settings.localProcPreference;
      this.settings.changePreference('local-processing-preference', this.localProcPreference);
      this.authServ.logout();
    }
  }

  updMainNotificationPreference() {
    this.settings.changePreference('notif-preference', this.notifPreference);
    this.settings.notifPreference = this.notifPreference;
    // this.apiSvc.setNotifDisabled(!this.notifPreference);
  }

  updDarkModePreference() {
    this.settings.changePreference('global-theme', this.darkModePreference ? 'dark' : 'light');
    this.settings.globalTheme = this.darkModePreference ? 'dark' : 'light';
    this.settings.setGlobalTheme(this.settings.globalTheme);
  }

  resetNotif() {
    this.notifSvc.disableAll();
  }

  async openNotifTimePicker() {
    const opts: PickerOptions = {
      buttons: [
        {
          text: this.translate.instant('tab3.alert.time.choice.cancel'),
          role: 'cancel'
        },
        {
          text: this.translate.instant('tab3.alert.time.choice.done'),
          handler: (choice: any) => {
            this.testNotifTime = choice.time.value;
            this.settings.changePreference('notif-time', this.testNotifTime);
            this.settings.notifTime = this.testNotifTime;
            if (this.testNotifTime === 1) {
              this.dayString = this.translate.instant('settings.api.time_singular');
            } else {
              this.dayString = this.translate.instant('settings.api.time_plural');
            }
            this.resetNotif();
          },
        }
      ],
      columns: [
        {
          name: 'time',
          options: [
            {text: '10 days', value: 10},
            {text: '7 days', value: 7},
            {text: '5 days', value: 5},
            {text: '4 days', value: 4},
            {text: '3 days', value: 3},
            {text: '2 days', value: 2},
            {text: '1 day', value: 1}
          ]
        }
      ]
    };
    const picker = await this.pickerCtrl.create(opts);
    picker.present();
  }

  fakeCrash() {
    if (this.developer) {
      throw new Error('Fake exception by development options');
    }
  }

}
