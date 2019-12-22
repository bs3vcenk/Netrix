import { Component } from '@angular/core';
import { Router } from '@angular/router';
import { Platform, Config } from '@ionic/angular';
import { StatusBar } from '@ionic-native/status-bar/ngx';
import { AuthenticationService } from './services/authentication.service';
import { LanguageService } from './services/language.service';
import { FirebaseService } from './services/firebase.service';
import { SettingsService } from './services/settings.service';
import { TranslateService } from '@ngx-translate/core';
import { ApiService } from './services/api.service';
import { NotificationService } from './services/notification.service';
import { SplashScreen } from '@ionic-native/splash-screen/ngx';

@Component({
  selector: 'app-root',
  templateUrl: 'app.component.html'
})
export class AppComponent {
  constructor(
    private platform: Platform,
    private statusBar: StatusBar,
    private authenticationService: AuthenticationService,
    private router: Router,
    private languageService: LanguageService,
    private fcm: FirebaseService,
    private settings: SettingsService,
    private translate: TranslateService,
    private config: Config,
    private apiSvc: ApiService,
    private notifSvc: NotificationService,
    private splash: SplashScreen
  ) {
    this.initializeApp();
  }

  private notificationSetup(token) {
    this.fcm.getToken(token);
    try {
      this.fcm.onNotifications().subscribe(
        () => this.apiSvc.switchActiveClass(0));
    } catch (e) {
      console.warn('AppComponent/notificationSetup(): Failed to start sub to notifications, probably not running Cordova.');
      console.warn('AppComponent/notificationSetup(): This means we won\'t be receiving any Firebase notifications.');
    }
  }

  private handleErrorSender(val) {
    if (val) {
      this.router.navigate(['error'], {replaceUrl: true});
    }
  }

  initializeApp() {
    this.platform.ready().then(() => {
      this.settings.migrateData();
      /* Set status bar color, style for white bg and black icons, hide splash screen */
      this.statusBar.backgroundColorByHexString('#f8f8f8');
      this.statusBar.styleDefault();
      this.splash.hide();

      /* Set the language */
      this.languageService.setInitialLang();
      /* Initialize preferences */
      this.settings.readPrefs();
      /* Localize back button text */
      this.translate.get('generic.back').subscribe((res: string) => {
        this.config.set('backButtonText', res);
      });
      this.apiSvc.getMaintenanceMode();
      /* Subscribe to the authenticationState object, and check if the user is
       * logged in or not. */
      this.authenticationService.authenticationState.subscribe(state => {
        if (state) {
          /* Navigate to the subject list and prevent returning to the login screen with
           * the back button/gesture */
          this.router.navigate(['tabs', 'tabs', 'tab1'], {replaceUrl: true});
          /* Reset the class ID to 0, since only ID 0 is stored on login
           * (other IDs are available by calling the /fetchclass endpoint).
           *
           * This is needed because after a logout and a login without restarting
           * the app, the app will try to fetch the last set ID, which may not be
           * zero. */
          this.apiSvc.classId.next(0);
          /* If the user is logged in, preload some data such as subjects, absences, tests
           * and settings (also all subjects' info if chosen) */
          this.apiSvc.preCacheData();
          /* Set up Firebase Cloud Messaging for notifications */
          this.notificationSetup(this.authenticationService.token);
        } else {
          /* If the user is not logged in, direct to the login page */
          this.router.navigate(['login'], {replaceUrl: true});
          /* Reset BehaviorSubjects in case of a logout */
          this.apiSvc.resetLoadingState();
          /* Delete scheduled test notifications */
          this.notifSvc.disableAll();
        }
      });

      /* Handle network and server errors, switching to the appropriate page if
       * there is an error */
      this.apiSvc.networkError.subscribe(val => {
        this.handleErrorSender(val);
      });
      this.apiSvc.dbError.subscribe(val => {
        this.handleErrorSender(val);
      });
      this.apiSvc.trustError.subscribe(val => {
        this.handleErrorSender(val);
      });
      this.apiSvc.maintenanceError.subscribe(val => {
        this.handleErrorSender(val);
      });

      /* Check and schedule exam notifications when ready */
      this.apiSvc.loadingFinishedTests.subscribe(val => {
        if (val) {
          console.log('AppComponent/initializeApp(): Test loading finished');
          this.notifSvc.scheduleTestNotifications(this.settings.notifTime);
        }
      });
    });
  }
}
