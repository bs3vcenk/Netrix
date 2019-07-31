import { Component } from '@angular/core';
import { Router } from '@angular/router';

import { Platform, Config } from '@ionic/angular';
import { SplashScreen } from '@ionic-native/splash-screen/ngx';
import { StatusBar } from '@ionic-native/status-bar/ngx';
import { AuthenticationService } from './authentication.service';
import { LanguageService } from './language.service';
import { FirebaseService } from './firebase.service';
import { SettingsService } from './settings.service';
import { TranslateService } from '@ngx-translate/core';
import { ApiService } from './api.service';
import { LogService } from './log.service';

@Component({
  selector: 'app-root',
  templateUrl: 'app.component.html'
})
export class AppComponent {
  constructor(
    private platform: Platform,
    private splashScreen: SplashScreen,
    private statusBar: StatusBar,
    private authenticationService: AuthenticationService,
    private router: Router,
    private languageService: LanguageService,
    // private toastController: ToastController,
    private fcm: FirebaseService,
    private settings: SettingsService,
    private translate: TranslateService,
    private config: Config,
    private apiSvc: ApiService,
    private log: LogService
  ) {
    this.initializeApp();
  }

  /*private async presentToast(message) {
    const toast = await this.toastController.create({
      message,
      duration: 3000,
      color: 'dark',
      position: 'top'
    });
    toast.present();
  }*/

  private notificationSetup(token) {
    this.fcm.getToken(token);
    try {
      this.fcm.onNotifications().subscribe(
        (notifObject) => {
          // this.log.log(notifObject);
        });
    } catch (e) {
      this.log.log('AppComponent/notificationSetup(): Failed to start sub to notifications, probably not running cordova.');
    }
  }

  initializeApp() {
    this.platform.ready().then(() => {
      this.statusBar.backgroundColorByHexString('#ffffff');
      this.statusBar.styleDefault();
      this.splashScreen.hide();

      this.languageService.setInitialLang();
      this.settings.readPrefs();
      this.translate.get('generic.back').subscribe((res: string) => {
        this.config.set('backButtonText', res);
      });
      this.authenticationService.authenticationState.subscribe(state => {
        if (state) {
          this.apiSvc.preCacheData();
          this.notificationSetup(this.authenticationService.token);
          this.router.navigate(['tabs', 'tabs', 'tab1'], {replaceUrl: true});
        } else {
          this.router.navigate(['login'], {replaceUrl: true});
        }
      });
      this.apiSvc.networkError.subscribe(val => {
        if (val) {
          this.router.navigate(['error'], {replaceUrl: true});
        }
      });
      this.apiSvc.dbError.subscribe(val => {
        if (val) {
          this.router.navigate(['error'], {replaceUrl: true});
        }
      });
    });
  }
}
