import { Injectable } from '@angular/core';
import { BehaviorSubject } from 'rxjs';
import { Storage } from '@ionic/storage';
import { Platform } from '@ionic/angular';
import { HttpClient } from '@angular/common/http';
import { map, catchError, switchAll } from 'rxjs/operators';
import { Observable, throwError } from 'rxjs';
import { Device } from '@ionic-native/device/ngx';

@Injectable({
	providedIn: 'root'
})
export class AuthenticationService {

	authenticationState = new BehaviorSubject(false);
	token = null;
	dataPreference = null;
	notifPreference = null;
	API_SERVER = "https://api.netrix.io";

	constructor(private storage: Storage, private plt: Platform, private http: HttpClient, private device: Device) {
		this.plt.ready().then(() => {
			console.log("AuthenticationService: API server is " + this.API_SERVER);
			this.initDataPreference();
			this.checkToken();
		})
	}

	changePreference(pref, prefValue) {
		this.storage.set(pref, prefValue).then(() => {
			console.log("AuthenticationService/changePreference(): Set " + pref + " to " + prefValue);
		})
	}

	checkToken() {
		// Check if user has already logged in (meaning has a token already)
		this.storage.get("auth-token").then(res => {
			if (res) {
				this.token = res;
				console.log("AuthenticationService/checkToken(): Found saved token (" + this.token + ")");
				this.storage.get("data-preference").then(res => {
					this.dataPreference = res;
					console.log("AuthenticationService/checkToken(): Found analytics preference (" + this.dataPreference + ")");
					this.http.post(this.API_SERVER + "/api/stats", {"token":this.token, "platform":this.getPlatform(), "device":this.getDevice()}).subscribe((res) => {
						console.log("AuthenticationService/checkToken(): Successfully sent device info");
					}, (err) => {
						console.log("AuthenticationService/checkToken(): Failed to send device info:");
						console.log(err);
					})
				});
				this.authenticationState.next(true);
			}
		})
	}

	private initDataPreference() {
		this.storage.get("data-preference").then(res => {
			// Check if it is stored at all
			if (res) {
				this.dataPreference = res;
			} else { // If it isn't stored, store it and set default (true)
				this.storage.set("data-preference", true).then(() => {
					this.dataPreference = true;
					console.log("AuthenticationService/handleLogin(): Analytics preference defaulted to true");
				});
			}
		})
	}

	private getPlatform() {
		if (this.dataPreference === true) {
			console.log('AuthenticationService/getPlatform(): Returning actual platform ('+ this.device.platform + ')');
			return this.device.platform;
		} else {
			return null;
		}
	}

	private getDevice() {
		if (this.dataPreference === true) {
			return this.device.model;
		} else {
			return null;
		}
	}

	login(username, password) {
		let response:Observable<Response> = this.http.post<Response>(this.API_SERVER + "/api/login", {"username":username, "password":password, "platform":this.getPlatform(), "device":this.getDevice()});

		let jsonResponse = response.pipe(catchError(err => this.handleError(err)));

		let userResponse = jsonResponse.pipe(map(
			data => this.handleLogin(data)
		));

		return userResponse;
	}

	private handleLogin(data) {
		this.storage.set("auth-token", data.token).then(() => {
			this.token = data.token;
			console.log("AuthenticationService/handleLogin(): Login successful, got token (" + data.token + ")");
			this.authenticationState.next(true);
		})
	}

	private handleError(error) {
		return throwError(error);
	}

	logout() {
		return this.storage.remove("auth-token").then(() => {
			this.authenticationState.next(false);
		})
	}

	isAuthenticated() {
		return this.authenticationState.value;
	}
}
