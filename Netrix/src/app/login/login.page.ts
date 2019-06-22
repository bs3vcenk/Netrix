import { Component, OnInit } from '@angular/core';
import { AuthenticationService } from '../authentication.service';
import { AlertController } from '@ionic/angular';

@Component({
  selector: 'app-login',
  templateUrl: './login.page.html',
  styleUrls: ['./login.page.scss'],
})
export class LoginPage implements OnInit {

  loUsername = null;
  loPassword = null;

  constructor(private authServ: AuthenticationService, private alertControl: AlertController) { }

  ngOnInit() {
  }

  login() {
  	console.log(this.loUsername);
  	console.log(this.loPassword);
  	let aTemp = this.authServ.login(this.loUsername, this.loPassword);
  }

}
