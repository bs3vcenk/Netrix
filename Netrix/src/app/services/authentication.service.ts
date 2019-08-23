import { Injectable } from '@angular/core';
import { BehaviorSubject } from 'rxjs';
import { Storage } from '@ionic/storage';
import { Platform } from '@ionic/angular';
import { HTTP, HTTPResponse } from '@ionic-native/http/ngx';
import { map, catchError } from 'rxjs/operators';
import { Observable, throwError, from } from 'rxjs';
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
  username = null;
  password = null;
  dataPreference = true;

  constructor(
    private storage: Storage,
    private plt: Platform,
    private http: HTTP,
    private device: Device,
    private settings: SettingsService,
    private firebase: FirebaseX
    ) {
      this.plt.ready().then(() => {
        /* Default to JSON as we'll be receiving only JSON from the API */
        this.http.setDataSerializer('json');
        /* Check if the user already has a stored token */
        this.checkToken();
        /* Enable certificate pinning */
        this.http.setSSLCertMode('pinned');
    });
  }

  checkToken() {
    /* Check if user has already logged in (meaning they have a token already) */
    this.storage.get('u-p-combo').then(res => {
      if (res) {
        const data = res.split(':');
        this.username = data[0];
        this.password = data[1];
        /* Log the login event to Firebase */
        this.firebase.logEvent('login', {});
        /* Let app.component know we're logged in */
        this.authenticationState.next(true);
      }
    });
  }

  /*private sendDeviceInfo() {
    this.http.post(
      this.settings.apiServer + '/api/stats',
      {
        token: this.token,
        platform: this.getPlatform(),
        device: this.getDevice(),
        language: this.getLanguage(),
        resolution: this.getResolution(),
        equivSupportedVersion: this.settings.equivSupportedServerVersion
      },
      this.httpHeader)
    .then(() => {
      console.log('AuthenticationService/sendDeviceInfo(): Successfully sent device info');
    }, () => {
      console.log('AuthenticationService/sendDeviceInfo(): Failed to send device info');
    });
  }

  private getPlatform() {
    return this.device.platform;
  }

  private getDevice() {
    return this.device.model;
  }

  private getResolution() {
    return this.plt.width() + 'x' + this.plt.height();
  }

  private getLanguage() {
    return this.settings.language;
  }*/

  login(username, password) {
    /* Called from the login page, sends a POST request to log in which returns back a token */
    this.storage.set('u-p-combo', this.username + ':' + this.password).then(() => {
      this.username = username;
      this.password = password;
      this.authenticationState.next(true);
    });
  }

  logout() {
    /* Remove the authentication token from storage */
    return this.storage.remove('u-p-combo').then(() => {
      /* Log event to Firebase */
      this.firebase.logEvent('logout', {});
      /* Let app.component know we're logged out */
      this.authenticationState.next(false);
    });
  }

  isAuthenticated() {
    return this.authenticationState.value;
  }
}
