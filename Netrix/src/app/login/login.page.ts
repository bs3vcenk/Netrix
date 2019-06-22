import { Component, OnInit } from '@angular/core';
import { AuthenticationService } from '../authentication.service';

@Component({
  selector: 'app-login',
  templateUrl: './login.page.html',
  styleUrls: ['./login.page.scss'],
})
export class LoginPage implements OnInit {

  loUsername = null;
  loPassword = null;

  constructor(private authServ: AuthenticationService) { }

  ngOnInit() {
  }

  login() {
  	console.log(this.loUsername)
  	console.log(this.loPassword)
  	this.authServ.login(this.loUsername, this.loPassword);
  }

}
