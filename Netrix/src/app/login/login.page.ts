import { Component, OnInit } from '@angular/core';
import { AuthenticationService } from '../authentication.service';
import { AlertController, LoadingController } from '@ionic/angular';

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

  constructor(private authServ: AuthenticationService, private alertControl: AlertController, private loadControl: LoadingController) { }

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
    return await this.ldController.dismiss().then(() => console.log('dismissed'));
  }

  login() {
    this.loadDisplay("Logging in");
  	console.log(this.loUsername);
  	console.log(this.loPassword);

  	this.authServ.login(this.loUsername, this.loPassword).subscribe((stat) => {
      console.log("all good")
      this.stopLoad();
    },(err) => {
      this.stopLoad();
      console.log(err)
      if (err.error.error === "E_INVALID_CREDENTIALS") {
        this.networkError("Invalid credentials", "Check your username and password, and try again.")
        console.log("login() failed, wrong creds")
      } else {
        this.networkError("Server offline", "The server is down, probably for maintenance.")
      }
    })
  }

}
