import { Injectable } from '@angular/core';
import { LocalNotifications } from '@ionic-native/local-notifications/ngx';

@Injectable({
  providedIn: 'root'
})
export class NotificationService {

  constructor(
    private notif: LocalNotifications
  ) { }

  testNotif() {
    const a = this.notif.schedule({
      text: 'Hello',
      trigger: {at: new Date(new Date().getTime() + 10)},
    });
    console.log(this.notif.getAll());
  }
}
