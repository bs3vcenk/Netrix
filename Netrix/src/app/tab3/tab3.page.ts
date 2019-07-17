import { Component } from '@angular/core';
import { AuthenticationService } from '../authentication.service';
import { SettingsService } from '../settings.service';
import { trigger, state, style, animate, transition } from "@angular/animations";

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

  constructor(
    private authServ: AuthenticationService,
    private settings: SettingsService
  ) {
    this.dataPreference = this.settings.dataPreference;
    this.errorPreference = this.settings.errorPreference;
    this.notifPreference = this.settings.notifPreference;
    this.adPreference = this.settings.adPreference;
  }

  logout() {
  	this.authServ.logout()
  }

  updDeviceInfoPreference() {
    this.settings.setDataCollection(this.dataPreference);
  }

  updAdPreference() {
    this.settings.changePreference("ad-preference", this.adPreference);
    this.settings.adPreference = this.adPreference;
  }

  updMainNotificationPreference() {
    this.settings.setAdShow(this.adPreference);
  }

  updErrorReportPreference() {
    //this.settings.setErrorReporting(this.errorPreference);
  }

}
