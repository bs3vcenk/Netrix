import { Injectable, ErrorHandler } from '@angular/core';
import { FirebaseX } from '@ionic-native/firebase-x/ngx';
import { AngularFirestore } from '@angular/fire/firestore';
import { Platform } from '@ionic/angular';
import * as StackTrace from 'stacktrace-js';

@Injectable({
  providedIn: 'root'
})
export class FirebaseService {

  constructor(
    private firebase: FirebaseX,
    private afs: AngularFirestore,
    private platform: Platform
  ) { }

  async getToken(userid) {
    /* Get a device token for Firebase */
    if (!this.platform.is('cordova')) { return; }
    const token = await this.firebase.getToken();
    this.saveToken(token, userid);
  }

  private saveToken(token, userid) {
    /* Store device token (for FCM) and API token (for server-side identification) onto Firebase */
    if (!this.platform.is('cordova')) { return; }
    if (!token) { return; }

    const devicesRef = this.afs.collection('devices');

    const data = {
      token,
      userId: userid
    };
    this.firebase.setUserId(userid);
    this.firebase.setCrashlyticsUserId(userid);
    return devicesRef.doc(userid).set(data);
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
    /* Send exceptions to Crashlytics */
    super.handleError(error);
    try {
      StackTrace.fromError(error).then(st => {
        this.firebase.logError(error.message, st);
      });
    } catch (e) {
      console.error(e);
    }
  }
}
