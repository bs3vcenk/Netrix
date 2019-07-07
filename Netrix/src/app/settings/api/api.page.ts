import { Component, OnInit } from '@angular/core';
import { AuthenticationService } from '../../authentication.service';
import { SettingsService } from '../../settings.service';

@Component({
  selector: 'app-api',
  templateUrl: './api.page.html',
  styleUrls: ['./api.page.scss'],
})
export class ApiPage implements OnInit {

  dataPreference = null;
  apiServer = null;

  constructor(
    private authServ: AuthenticationService,
    private settings: SettingsService
  ) { }

  ngOnInit() {
    // Load default preferences
    this.apiServer = this.settings.apiServer;
    this.dataPreference = this.settings.dataPreference;
    console.log("settings/api: Analytics preference is " + this.dataPreference);
  }

  updDeviceInfoPreference() {
    // Called on switch change
    console.log("settings/api/updDeviceInfoPreference(): Updated analytics preference to " + this.dataPreference);
    this.settings.dataPreference = this.dataPreference;
    this.settings.changePreference("data-preference", this.dataPreference);
  }

}
