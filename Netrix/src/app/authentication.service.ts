import { Injectable } from '@angular/core';
import { BehaviorSubject } from 'rxjs';
import { Storage } from '@ionic/storage';
import { Platform } from '@ionic/angular';
import { HttpClient } from '@angular/common/http';
import { map, catchError, switchAll } from 'rxjs/operators';
import { Observable, throwError } from 'rxjs';
import { Device } from '@ionic-native/device/ngx';
import { SettingsService } from './settings.service';
import { FirebaseX } from '@ionic-native/firebase-x/ngx';

@Injectable({
    providedIn: 'root'
})
export class AuthenticationService {

    authenticationState = new BehaviorSubject(false);
    token = null;
    dataPreference = null;

    constructor(
        private storage: Storage,
        private plt: Platform,
        private http: HttpClient,
        private device: Device,
        private settings: SettingsService,
        private firebase: FirebaseX
    ) {
        this.plt.ready().then(() => {
            console.log('AuthenticationService: API server is ' + this.settings.apiServer);
            this.checkToken();
        });
    }

    checkToken() {
        // Check if user has already logged in (meaning has a token already)
        this.storage.get('auth-token').then(res => {
            if (res) {
                this.token = res;
                console.log('AuthenticationService/checkToken(): Found saved token (' + this.token + ')');
                this.settings.hasLoadedDataPref.subscribe((dPrefLoaded) => {
                    if (dPrefLoaded) {
                        // tslint:disable-next-line: max-line-length
                        console.log('AuthenticationService/checkToken(): Found analytics preference (' + this.settings.dataPreference + ')');
                        this.sendDeviceInfo();
                    }
                });
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
        })
        .subscribe((res) => {
            console.log('AuthenticationService/sendDeviceInfo(): Successfully sent device info');
        }, (err) => {
            console.log('AuthenticationService/sendDeviceInfo(): Failed to send device info:');
            throw new Error('Stats send fail: ' + err);
        });
    }

    private getPlatform() {
        console.log(this.settings.dataPreference);
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
        const response: Observable<Response> = this.http.post<Response>(this.settings.apiServer + '/api/login', {username, password});

        const jsonResponse = response.pipe(catchError(err => this.handleError(err)));

        const userResponse = jsonResponse.pipe(map(
            data => this.handleLogin(data)
        ));

        return userResponse;
    }

    private handleLogin(data) {
        this.storage.set('auth-token', data.token).then(() => {
            this.token = data.token;
            console.log('AuthenticationService/handleLogin(): Login successful, got token (' + data.token + ')');
            this.sendDeviceInfo();
            this.authenticationState.next(true);
        });
    }

    private handleError(error) {
        return throwError(error);
    }

    logout() {
        return this.storage.remove('auth-token').then(() => {
            this.http.get<any>(this.settings.apiServer + '/api/user/' + this.token + '/logout').subscribe((res) => {
                console.log('AuthenticationService/logout(): Server-side data successfully deleted');
            }, (err) => {
                console.log('AuthenticationService/logout(): Failed to delete server-side data');
            });
            this.firebase.unregister();
            this.authenticationState.next(false);
        });
    }

    isAuthenticated() {
        return this.authenticationState.value;
    }
}
