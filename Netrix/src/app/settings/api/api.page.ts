import { Component, OnInit } from '@angular/core';
import { AuthenticationService } from '../../authentication.service';

@Component({
  selector: 'app-api',
  templateUrl: './api.page.html',
  styleUrls: ['./api.page.scss'],
})
export class ApiPage implements OnInit {

  dataPreference = null;
  apiServer = null;

  constructor(private authServ: AuthenticationService) { }

  ngOnInit() {
    // Load default preferences
    this.apiServer = this.authServ.API_SERVER;
    this.dataPreference = this.authServ.dataPreference;
    console.log("settings/api: Analytics preference is " + this.dataPreference);
  }

  updDeviceInfoPreference() {
    // Called on switch change
    console.log("settings/api/updDeviceInfoPreference(): Updated analytics preference to " + this.dataPreference);
    this.authServ.dataPreference = this.dataPreference;
    this.authServ.changePreference("data-preference", this.dataPreference);
  }

}
