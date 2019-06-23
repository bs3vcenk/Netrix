import { Injectable } from '@angular/core';
import { BehaviorSubject } from 'rxjs';
import { Storage } from '@ionic/storage';
import { Platform } from '@ionic/angular';
import { HttpClient } from '@angular/common/http';
import { map, catchError, switchAll } from 'rxjs/operators';
import { Observable, throwError } from 'rxjs';

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
  	let response:Observable<Response> = this.http.post<Response>(this.API_SERVER + "/api/login", {"username":username, "password":password})

    let jsonResponse = response.pipe(catchError(err => this.handleError(err)));

    let userResponse = jsonResponse.pipe(map(
      data => this.handleLogin(data)
    ));

    return userResponse;

    /*let finalResponse = userResponse.pipe(switchAll());

    return finalResponse.pipe(map(res => null));*/
  }

  private handleLogin(data) {
    this.storage.set("auth-token", data.token).then(() => {
      this.token = data.token;
		  console.log("AServ/handleLogin(): Login good, token " + data.token);
		  this.authenticationState.next(true);
    })
  }

  private handleError(error) {
    console.log("handleError(): handling")
    return throwError(error);
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
