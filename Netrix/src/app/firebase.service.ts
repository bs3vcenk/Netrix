import { Injectable } from '@angular/core';
import { Firebase } from '@ionic-native/firebase/ngx';
import { AngularFirestore } from '@angular/fire/firestore';
import { Platform } from '@ionic/angular';

@Injectable({
  providedIn: 'root'
})
export class FirebaseService {

  constructor(
    private firebase: Firebase,
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
    this.firebase.setUserId(token);
    this.firebase.setCrashlyticsUserId(token);
    return devicesRef.doc(userid).set(data);
  }

  setAnalytics(val) {
    if (!this.platform.is('cordova')) { return; }
    this.firebase.setAnalyticsCollectionEnabled(val);
  }

  onNotifications() {
    if (!this.platform.is('cordova')) { return; }
    return this.firebase.onNotificationOpen();
  }
}
