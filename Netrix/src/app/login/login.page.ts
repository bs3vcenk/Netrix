import { Component, OnInit } from '@angular/core';
import { AuthenticationService } from '../authentication.service';
import { AlertController, LoadingController, ToastController } from '@ionic/angular';
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

  constructor(
    private toastCtrl: ToastController,
    private translate: TranslateService,
    private authServ: AuthenticationService,
    private alertControl: AlertController,
    private loadControl: LoadingController
  ) { }

  ngOnInit() {
  }

  networkError(header, msg) {
    // Simple present error function
    this.alertControl.create({
      header: header,
      message: msg,
      buttons: ["OK"]
    }).then(alert => {
      alert.present();
    });
  }

  toastError(msg, btns, dur) {
    this.toastCtrl.create({
      message: msg,
      buttons: btns,
      color: 'dark',
      duration: dur
    }).then((toast) => {
      toast.present();
    });
  }

  dataAlert() {
    // Data collection alert
    this.alertControl.create({
      header: this.translate.instant("login.alert.data.header"),
      message: this.translate.instant("login.alert.data.content"),
      buttons: [
        {
          text: 'OK',
          role: 'cancel',
          handler: () => {
            // Proceed to login when accepted
            this.login();
          }
        }
      ]
    }).then(alert => {
      // Show the alert
      alert.present();
    })
  }

  async loadDisplay(msg) {
    this.ldController = await this.loadControl.create({
      message: msg
    })
    await this.ldController.present();
  }

  async stopLoad() {
    return await this.ldController.dismiss().then(() => console.log('login/stopLoad(): Dismissed loading screen'));
  }

  _login() {
    if (this.dataAlertShown === false) {
      // User hasn't seen alert, so we show it and set dataAlertShown to true,
      // so we don't show it again
      console.log("login/_login(): Data alert wasn't shown, showing it now")
      this.dataAlertShown = true;
      this.dataAlert();
    } else {
      // User has seen alert, so no need to show it
      console.log("login/_login(): Data alert already shown, skipping")
      this.login()
    }
  }

  login() {
    // Show "Logging in..."
    this.loadDisplay(this.translate.instant("login.alert.loggingin"));

    // Send the request
  	this.authServ.login(this.loUsername, this.loPassword).subscribe((stat) => {
      // Everything fine
      console.log("login/login(): Successful login")
      this.stopLoad(); // Stop the "Logging in..." alert
    },(err) => {
      this.stopLoad(); // Stop alert
      console.log(err) // Log error
      if (err.error.error === "E_INVALID_CREDENTIALS") {
        // Bad creds
        console.log("login/login(): Failed - Invalid credentials");
        this.networkError(this.translate.instant("login.alert.credentials.header"), this.translate.instant("login.alert.credentials.content"))
      } else {
        // Server/network error
        // TODO: Handle server and network errors separately
        console.log("login/login(): Failed - Network error");
        this.toastError(this.translate.instant("generic.alert.network"), null, 2500);
        throw new Error('Network error');
      }
    })
  }

}
