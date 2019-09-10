import { Injectable, ErrorHandler } from '@angular/core';
import { FirebaseX } from '@ionic-native/firebase-x/ngx';
import { Platform } from '@ionic/angular';
import * as StackTrace from 'stacktrace-js';
import { ApiService } from './api.service';
import { environment } from '../../environments/environment';

@Injectable({
  providedIn: 'root'
})
export class FirebaseService {

  constructor(
    private firebase: FirebaseX,
    private platform: Platform,
    private apiSvc: ApiService
  ) { }

  async getToken(userid) {
    /* Get a device token for Firebase */
    if (!this.platform.is('cordova')) { return; }
    const token = await this.firebase.getToken();
    this.saveToken(token, userid);
  }

  private saveToken(firebaseToken: string, serviceToken: string) {
    /* Store device token (for FCM) and API token (for server-side identification) */
    if (!this.platform.is('cordova')) { return; }
    /* Add the token to crash reports */
    this.firebase.setUserId(serviceToken);
    this.firebase.setCrashlyticsUserId(serviceToken);
    /* Push the device token to the API */
    this.apiSvc.saveFirebaseToken(firebaseToken);
  }

  setAnalytics(val) {
    /* Control if Firebase Analytics sends data */
    if (!this.platform.is('cordova')) { return; }
    this.firebase.setAnalyticsCollectionEnabled(val);
  }

  onNotifications() {
    /* Return notification handler */
    if (!this.platform.is('cordova')) { return; }
    return this.firebase.onMessageReceived();
  }
}

@Injectable({
  providedIn: 'root'
})
export class CrashlyticsErrorHandler extends ErrorHandler {

  constructor(
    private firebase: FirebaseX
  ) {
    super();
  }

  handleError(error) {
    /* Send exceptions to Crashlytics
     *
     * NOTE: Requires patching the FirebaseX index.js and index.d.ts files to
     *       allow a second argument. */
    super.handleError(error);
    /* Only send if this is a production build (don't want to clutter
     * Crashlytics with debug errors) */
    if (environment.production) {
      try {
        /* Try to expand the stacktrace using stacktrace.js */
        StackTrace.fromError(error).then(st => {
          this.firebase.logError(error.message, st);
        });
      } catch (e) {
        console.error(e);
      }
    }
  }
}
