import { Component } from '@angular/core';
import { PickerController } from '@ionic/angular';
import { AuthenticationService } from '../authentication.service';
import { SettingsService } from '../settings.service';
import { trigger, state, style, animate, transition } from '@angular/animations';
import { PickerOptions, PickerButton } from '@ionic/core';
import { TranslateService } from '@ngx-translate/core';

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

  dataPreference = null;
  notifPreference = null;
  errorPreference = null;
  adPreference = null;
  testNotifTime = null;
  dayString = this.translate.instant('settings.api.time_plural');

  constructor(
    private authServ: AuthenticationService,
    private settings: SettingsService,
    private pickerCtrl: PickerController,
    private translate: TranslateService
  ) {
    this.dataPreference = this.settings.dataPreference;
    this.errorPreference = this.settings.errorPreference;
    this.notifPreference = this.settings.notifPreference;
    this.testNotifTime = this.settings.notifTime;
    this.adPreference = this.settings.adPreference;
    if (this.testNotifTime === 1) {
      this.dayString = this.translate.instant('settings.api.time_singular');
    }
  }

  logout() {
    this.authServ.logout();
  }

  updDeviceInfoPreference() {
    this.settings.setDataCollection(this.dataPreference);
  }

  updAdPreference() {
    this.settings.changePreference('ad-preference', this.adPreference);
    this.settings.adPreference = this.adPreference;
  }

  updMainNotificationPreference() {
    this.settings.changePreference('notif-preference', this.notifPreference);
    this.settings.notifPreference = this.notifPreference;
  }

  async openNotifTimePicker() {
    const opts: PickerOptions = {
      buttons: [
        {
          text: 'Cancel',
          role: 'cancel'
        },
        {
          text: 'Done'
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
    picker.onDidDismiss().then(async data => {
      const col = await picker.getColumn('time');
      this.testNotifTime = col.options[col.selectedIndex].value;
      this.settings.changePreference('notif-time', this.testNotifTime);
      this.settings.notifTime = this.testNotifTime;
      if (this.testNotifTime === 1) {
        this.dayString = this.translate.instant('settings.api.time_singular');
      } else {
        this.dayString = this.translate.instant('settings.api.time_plural');
      }
    });
  }

}
