import { Injectable, ErrorHandler } from '@angular/core';
import { FirebaseX } from '@ionic-native/firebase-x/ngx';
import { AngularFirestore } from '@angular/fire/firestore';
import { Platform } from '@ionic/angular';

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
    if (!this.platform.is('cordova')) { return; }
    const token = await this.firebase.getToken();
    this.saveToken(token, userid);
  }

  private saveToken(token, userid) {
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
    if (!this.platform.is('cordova')) { return; }
    this.firebase.setAnalyticsCollectionEnabled(val);
  }

  onNotifications() {
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
    super.handleError(error);
    try {
      this.firebase.logError(error.message + ' | stack: ' + error.stack);
    } catch (e) {
      console.error(e);
    }
  }
}
