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

  constructor(private translate: TranslateService, private authServ: AuthenticationService, private alertControl: AlertController, private loadControl: LoadingController) { }

  ngOnInit() {
  }

  async networkError(header, msg) {
    const alert = await this.alertControl.create({
      header: header,
      message: msg,
      buttons: ["OK"]
    });

    await alert.present();
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
