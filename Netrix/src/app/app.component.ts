import { Component } from '@angular/core';
import { Router } from '@angular/router';

import { Platform, ToastController, Config } from '@ionic/angular';
import { SplashScreen } from '@ionic-native/splash-screen/ngx';
import { StatusBar } from '@ionic-native/status-bar/ngx';
import { AuthenticationService } from './authentication.service';
import { LanguageService } from './language.service';
import { FirebaseService } from './firebase.service';
import { SettingsService } from './settings.service';
import { TranslateService } from '@ngx-translate/core';

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
    private toastController: ToastController,
    private fcm: FirebaseService,
    private settings: SettingsService,
    private translate: TranslateService,
    private config: Config
  ) {
    this.initializeApp();
  }

  private async presentToast(header, message) {
    const toast = await this.toastController.create({
      header,
      message,
      duration: 3000,
      color: 'dark',
      position: 'top'
    });
    toast.present();
  }

  private notificationSetup(token) {
    this.fcm.getToken(token);
    try {
      this.fcm.onNotifications().subscribe(
        (msg) => {
          this.presentToast('Header', msg.body);
        });
    } catch (e) {
      console.log('AppComponent/notificationSetup(): Failed to start sub to notifications, probably not running cordova.');
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
          const token = this.authenticationService.token;
          this.notificationSetup(token);
          this.router.navigate(['tabs', 'tabs', 'tab1'], {replaceUrl: true});
        } else {
          this.router.navigate(['login'], {replaceUrl: true});
        }
      });
    });
  }
}
