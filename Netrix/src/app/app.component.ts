import { Component } from '@angular/core';
import { Router } from '@angular/router';

import { Platform, Config } from '@ionic/angular';
import { SplashScreen } from '@ionic-native/splash-screen/ngx';
import { StatusBar } from '@ionic-native/status-bar/ngx';
import { AuthenticationService } from './services/authentication.service';
import { LanguageService } from './services/language.service';
import { FirebaseService } from './services/firebase.service';
import { SettingsService } from './services/settings.service';
import { TranslateService } from '@ngx-translate/core';
import { ApiService } from './services/api.service';
import { NotificationService } from './services/notification.service';

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
    private notifSvc: NotificationService
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
          console.log(notifObject);
        });
    } catch (e) {
      console.log('AppComponent/notificationSetup(): Failed to start sub to notifications, probably not running cordova.');
    }
  }

  initializeApp() {
    this.platform.ready().then(() => {
      /* Set status bar color, style for white bg, black icons, and hide
       * the splash screen once loaded */
      this.statusBar.backgroundColorByHexString('#ffffff');
      this.statusBar.styleDefault();
      this.splashScreen.hide();

      /* Set the language */
      this.languageService.setInitialLang();
      /* Initialize preferences */
      this.settings.readPrefs();
      /* Localize back button text */
      this.translate.get('generic.back').subscribe((res: string) => {
        this.config.set('backButtonText', res);
      });
      /* Subscribe to the authenticationState object, and check if the user is
       * logged in or not. */
      this.authenticationService.authenticationState.subscribe(state => {
        if (state) {
          /* If the user is logged in, preload some data such as subjects, absences, tests
           * and settings (also all subjects' info if chosen) */
          this.apiSvc.preCacheData();
          /* Set up Firebase Cloud Messaging for notifications */
          this.notificationSetup(this.authenticationService.token);
          /* Navigate to the subject list and prevent returning to the login screen with
           * the back button/gesture */
          this.router.navigate(['tabs', 'tabs', 'tab1'], {replaceUrl: true});
        } else {
          /* If the user is not logged in, direct to the login page */
          this.router.navigate(['login'], {replaceUrl: true});
        }
      });

      /* Handle network and server errors, switching to the appropriate page if
       * there is an error */
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
      this.notifSvc.testNotif();
    });
  }
}
