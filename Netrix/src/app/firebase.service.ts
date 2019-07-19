import { Injectable } from '@angular/core';
import { Firebase } from '@ionic-native/firebase/ngx';
import { AngularFirestore } from '@angular/fire/firestore';

@Injectable({
  providedIn: 'root'
})
export class FirebaseService {

  constructor(private firebase: Firebase,
              private afs: AngularFirestore) { }

  async getToken(userid) {
    const token = await this.firebase.getToken();
    this.saveToken(token, userid);
  }

  private saveToken(token, userid) {
    if (!token) { return; }

    const devicesRef = this.afs.collection('devices');

    const data = {
      token,
      userId: userid
    };

    return devicesRef.doc(userid).set(data);
  }

  setAnalytics(val) {
    this.firebase.setAnalyticsCollectionEnabled(val);
  }

  onNotifications() {
    return this.firebase.onNotificationOpen();
  }
}
