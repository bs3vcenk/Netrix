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
  isLoading = false;

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

  login() {
    // Show "Logging in..."
    this.isLoading = true;

    // Send the request
    this.authServ.login(this.loUsername, this.loPassword).then(() => {
      // Everything fine
      this.firebase.logMessage('login/login(): Successful login');
      this.isLoading = false; // Stop the "Logging in..." alert
    }, (err) => {
      this.isLoading = false; // Stop alert
      let e;
      try { e = JSON.parse(err.error); } catch (ex) { e = {error: null}; }
      if (e.error === 'E_INVALID_CREDENTIALS') {
        // Bad creds
        this.networkError(
          this.translate.instant('login.alert.credentials.header'),
          this.translate.instant('login.alert.credentials.content')
        );
      } else if (err.status >= 500 && err.status <= 599) {
        // Server/network error
        this.toastError(this.translate.instant('generic.alert.server'), null, 2500);
      } else {
        this.toastError(this.translate.instant('generic.alert.network'), null, 2500);
      }
    });
  }

}
