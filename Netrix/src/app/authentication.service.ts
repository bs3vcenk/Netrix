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
import { LogService } from './log.service';

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
        private http: HTTP,
        private device: Device,
        private settings: SettingsService,
        private firebase: FirebaseX,
        private log: LogService
    ) {
        this.plt.ready().then(() => {
            this.http.setDataSerializer('json');
            this.checkToken();
        });
    }

    checkToken() {
        // Check if user has already logged in (meaning has a token already)
        this.storage.get('auth-token').then(res => {
            if (res) {
                this.token = res;
                this.sendDeviceInfo();
                this.authenticationState.next(true);
            }
        });
    }

    private sendDeviceInfo() {
        this.http.post(this.settings.apiServer + '/api/stats',
        {
            token: this.token,
            platform: this.getPlatform(),
            device: this.getDevice(),
            language: this.getLanguage(),
            resolution: this.getResolution()
        },
        this.httpHeader)
        .then((res) => {
            this.log.log('AuthenticationService/sendDeviceInfo(): Successfully sent device info');
        }, (err) => {
            this.log.log('AuthenticationService/sendDeviceInfo(): Failed to send device info');
            throw err;
        });
    }

    private getPlatform() {
        return this.settings.dataPreference ? this.device.platform : null;
    }

    private getDevice() {
        return this.settings.dataPreference ? this.device.model : null;
    }

    private getResolution() {
        return this.settings.dataPreference ? this.plt.width() + 'x' + this.plt.height() : null;
    }

    private getLanguage() {
        return this.settings.language;
    }

    login(username, password) {
        this.firebase.startTrace('login');
        const response: Observable<HTTPResponse> = from(this.http.post(
            this.settings.apiServer + '/api/login',
            {username, password},
            this.httpHeader
        ));

        const jsonResponse = response.pipe(catchError(err => this.handleError(err)));

        const userResponse = jsonResponse.pipe(map(
            data => this.handleLogin(data)
        ));

        return userResponse;
    }

    private handleLogin(data) {
        const token = JSON.parse(data.data).token;
        this.storage.set('auth-token', token).then(() => {
            this.token = token;
            this.sendDeviceInfo();
            this.firebase.stopTrace('login');
            this.authenticationState.next(true);
        });
    }

    private handleError(error) {
        return throwError(error);
    }

    logout() {
        return this.storage.remove('auth-token').then(() => {
            this.http.get(
                this.settings.apiServer + '/api/user/' + this.token + '/logout',
                {},
                this.httpHeader
            ).then((res) => {
                this.log.log('AuthenticationService/logout(): Server-side data successfully deleted');
            }, (err) => {
                this.log.log('AuthenticationService/logout(): Failed to delete server-side data');
            });
            this.firebase.unregister();
            this.authenticationState.next(false);
        });
    }

    isAuthenticated() {
        return this.authenticationState.value;
    }
}
