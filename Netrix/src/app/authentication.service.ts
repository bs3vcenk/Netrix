import { Injectable } from '@angular/core';
import { BehaviorSubject } from 'rxjs';
import { Storage } from '@ionic/storage';
import { Platform } from '@ionic/angular';
import { HttpClient } from '@angular/common/http';

@Injectable({
  providedIn: 'root'
})
export class AuthenticationService {

  authenticationState = new BehaviorSubject(false);
  token = null;
  API_SERVER = "http://192.168.43.96:5000";

  constructor(private storage: Storage, private plt: Platform, private http: HttpClient) {
  	this.plt.ready().then(() => {
  		console.log("AServ: Initializing: API server is " + this.API_SERVER)
  		this.checkToken()
  	})
  }

  checkToken() {
  	this.storage.get("auth-token").then(res => {
      if (res) {
      	this.token = res;
      	console.log("AServ: checkToken() good, token " + this.token);
        this.authenticationState.next(true);
      }
    })
  }

  login(username, password) {
  	this.http.post<any>(this.API_SERVER + "/api/login", {"username":username, "password":password}).subscribe((response) => {
  		return this.storage.set("auth-token", response.token).then(() => {
  			this.token = response.token;
  			console.log("AServ: login() good, token " + this.token);
      		this.authenticationState.next(true);
    	});
  	})
  }

  logout() {
  	return this.storage.remove("auth-token").then(() => {
      this.authenticationState.next(false);
  	})
  }

  isAuthenticated() {
  	return this.authenticationState.value
  }
}
