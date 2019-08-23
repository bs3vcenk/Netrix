import { Component, OnInit } from '@angular/core';
import { AuthenticationService } from '../services/authentication.service';
import { AlertController, ToastController } from '@ionic/angular';
import { TranslateService } from '@ngx-translate/core';
import { FirebaseX } from '@ionic-native/firebase-x/ngx';

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
    private firebase: FirebaseX
  ) { }

  ngOnInit() {
  }

  networkError(header, msg) {
    // Simple present error function
    this.alertControl.create({
      header,
      message: msg,
      buttons: ['OK']
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
      header: this.translate.instant('login.alert.data.header'),
      message: this.translate.instant('login.alert.data.content'),
      buttons: [
        {
          text: 'OK',
          handler: () => {
            // Proceed to login when accepted
            this.login();
          }
        }
      ]
    }).then(alert => {
      // Show the alert
      alert.present();
    });
  }

  _login() {
    /*if (this.dataAlertShown === false) {
      // User hasn't seen alert, so we show it and set dataAlertShown to true,
      // so we don't show it again
      console.log('login/_login(): Data alert wasn\'t shown, showing it now');
      this.dataAlertShown = true;
      this.dataAlert();
    } else {*/
      // User has seen alert, so no need to show it
      console.log('login/_login(): Data alert already shown, skipping');
      this.login();
    // }
  }

  login() {
    // Show "Logging in..."
    this.isLoading = true;

    // Send the request
    this.authServ.login(this.loUsername, this.loPassword);
  }

}
