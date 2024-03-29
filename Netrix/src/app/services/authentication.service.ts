import { Injectable } from '@angular/core';
import { BehaviorSubject } from 'rxjs';
import { Storage } from '@ionic/storage';
import { Platform } from '@ionic/angular';
import { HttpClient } from '@angular/common/http';
import { Device } from '@ionic-native/device/ngx';
import { SettingsService } from './settings.service';
import { FirebaseX } from '@ionic-native/firebase-x/ngx';

@Injectable({
  providedIn: 'root'
})
export class AuthenticationService {

  httpHeader = {
    'Content-Type': 'application/json',
    'User-Agent': 'Netrix'
  };

  authenticationState = new BehaviorSubject(false);
  token = null;
  dataPreference = true;

  constructor(
    private storage: Storage,
    private plt: Platform,
    private http: HttpClient,
    private device: Device,
    private settings: SettingsService,
    private firebase: FirebaseX
  ) {
    this.plt.ready().then(() => {
      this.settings.migrationFinished.subscribe(status => {
        if (status) { this.checkToken(); }
      });
    });
  }

  checkToken() {
    /* Check if user has already logged in (meaning they have a token already) */
    this.storage.get('auth-token').then(res => {
      if (res) {
        this.token = res;
        /* Send analytics to API */
        this.sendDeviceInfo();
        /* Let app.component know we're logged in */
        this.authenticationState.next(true);
      }
    });
  }

  private sendDeviceInfo() {
    /* Send the platform (Android/iOS), device model, language and WebView resolution to the API */
    this.http.post(
      this.settings.apiServer + '/stats',
      {
        token: this.token,
        platform: this.device.platform,
        device: this.device.model,
        language: this.settings.language
      })
    .subscribe(() => {
      this.firebase.logMessage('AuthenticationService/sendDeviceInfo(): Successfully sent device info');
    }, () => {
      this.firebase.logMessage('AuthenticationService/sendDeviceInfo(): Failed to send device info');
    });
  }

  async login(username, password) {
    /* Called from the login page, sends a POST request to log in which returns back a token */
    /*const response: Observable<HTTPResponse> = from(this.http.post(
      this.settings.apiServer + '/login',
      {username, password},
      this.httpHeader
    ));*/
    const response = await this.http.post(
      this.settings.apiServer + '/login',
      {username, password}
    ).toPromise();
    this.handleLogin(response);
    return response;
  }

  private handleLogin(data) {
    console.log(data);
    const token = data.token;
    /* Store the token so we don't have to log in every time */
    this.storage.set('auth-token', token).then(() => {
      this.token = token;
      /* Send analytics to API */
      this.sendDeviceInfo();
      /* Let app.component know we're logged in */
      this.authenticationState.next(true);
    });
  }

  logout() {
    /* Remove the authentication token from storage */
    return this.storage.remove('auth-token').then(() => {
      /* Let the API know the user has logged out, so it knows it can discard the user's data */
      this.http.get(
        this.settings.apiServer + '/user/' + this.token + '/logout'
      ).subscribe(() => {
        this.firebase.logMessage('AuthenticationService/logout(): Server-side data successfully deleted');
      }, () => {
        this.firebase.logMessage('AuthenticationService/logout(): Failed to delete server-side data');
      });
      /* Unregister from FCM */
      this.firebase.unregister();
      /* Let app.component know we're logged out */
      this.authenticationState.next(false);
    });
  }
}
