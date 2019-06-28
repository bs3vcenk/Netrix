import { Component, OnInit } from '@angular/core';
import { AuthenticationService } from '../authentication.service';
import { AlertController, LoadingController } from '@ionic/angular';
import { TranslateService } from '@ngx-translate/core';

@Component({
  selector: 'app-login',
  templateUrl: './login.page.html',
  styleUrls: ['./login.page.scss'],
})
export class LoginPage implements OnInit {

  loUsername = null;
  loPassword = null;
  ldController = null;
  isLoading = false;
  dataAlertShown = false;

  constructor(private translate: TranslateService, private authServ: AuthenticationService, private alertControl: AlertController, private loadControl: LoadingController) { }

  ngOnInit() {
  }

  networkError(header, msg) {
    this.alertControl.create({
      header: header,
      message: msg,
      buttons: ["OK"]
    }).then(alert => {
      alert.present();
    });
  }

  dataAlert() {
    this.alertControl.create({
      header: this.translate.instant("login.alert.data.header"),
      message: this.translate.instant("login.alert.data.content"),
      buttons: [
        {
          text: 'OK',
          role: 'cancel',
          handler: () => {
            this.login();
          }
        }
      ]
    }).then(alert => {
      alert.present();
    })
  }

  async loadDisplay(msg) {
    this.isLoading = true;
    this.ldController = await this.loadControl.create({
      message: msg
    })
    await this.ldController.present();
  }

  async stopLoad() {
    this.isLoading = false;
    return await this.ldController.dismiss().then(() => console.log('login/stopLoad(): Dismissed loading screen'));
  }

  _login() {
    if (this.dataAlertShown === false) {
      console.log("login/_login(): Data alert wasn't shown, showing it now")
      this.dataAlertShown = true;
      this.dataAlert();
    } else {
      console.log("login/_login(): Data alert already shown, skipping")
      this.login()
    }
  }

  login() {
    this.loadDisplay(this.translate.instant("login.alert.loggingin"));

  	this.authServ.login(this.loUsername, this.loPassword).subscribe((stat) => {
      console.log("login/login(): Successful login")
      this.stopLoad();
    },(err) => {
      this.stopLoad();
      console.log(err)
      if (err.error.error === "E_INVALID_CREDENTIALS") {
        console.log("login/login(): Failed - Invalid credentials")
        this.networkError(this.translate.instant("login.alert.credentials.header"), this.translate.instant("login.alert.credentials.content"))
      } else {
        console.log("login/login(): Failed - Server error")
        this.networkError(this.translate.instant("login.alert.serverdown.header"), this.translate.instant("login.alert.serverdown.content"))
      }
    })
  }

}
