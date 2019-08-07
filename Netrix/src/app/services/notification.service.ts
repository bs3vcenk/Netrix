import { Injectable } from '@angular/core';
import { LocalNotifications, ILocalNotification } from '@ionic-native/local-notifications/ngx';
import { ApiService } from './api.service';
import { BehaviorSubject } from 'rxjs';
import { TranslateService } from '@ngx-translate/core';

@Injectable({
  providedIn: 'root'
})
export class NotificationService {

  notifInitFinished = new BehaviorSubject(false);
  scheduledNotifs = [];
  scheduledNotifIDs = [];
  oneDayInMiliseconds = 86400000;

  constructor(
    private notif: LocalNotifications,
    private apiSvc: ApiService,
    private translate: TranslateService
  ) {
    /* Get all scheduled notifications and let scheduleTestNotifications
     * know we're done */
    this.syncLocalLists();
  }

  syncLocalLists() {
    this.notif.getAll().then(notifs => {
      notifs.forEach(notifX => {
        this.scheduledNotifIDs.push(notifX.id);
      });
      this.scheduledNotifs = notifs;
      this.notifInitFinished.next(true);
    });
  }

  disableNotif(id: number) {
    /* Disable notification for a test */
    if (this.scheduledNotifIDs.includes(id)) {
      this.notif.cancel(id);
      this.syncLocalLists();
    }
  }

  disableAll() {
    this.notif.cancelAll();
    this.syncLocalLists();
  }

  scheduleTestNotifications(days: number) {
    /* Wait until notif.getAll() is done */
    this.notifInitFinished.subscribe(val => {
      if (val) {
        console.log('NotificationService/scheduleTestNotifications(): notifInitFinished is true');
        // tslint:disable-next-line: prefer-const
        let toBeScheduled = [];
        /* Format every 'current' test into a notification and append it
         * to a list of to-be-scheduled tests */
        this.apiSvc.currentTests.forEach(test => {
          /* If it's already scheduled, avoid scheduling again */
          if (!this.scheduledNotifIDs.includes(test.id)) {
            toBeScheduled.push({
              id: test.id,
              title: this.translate.instant('notif.text.test'),
              text: test.subject + ':' + test.test,
              foreground: true,
              trigger: { at: new Date((test.date * 1000) - (days * this.oneDayInMiliseconds)) }
            } as ILocalNotification);
            this.apiSvc.tests[test.id].scheduled = true;
          }
        });
        this.scheduleNotifications(toBeScheduled);
      }
    });
  }

  private scheduleNotifications(notifications: ILocalNotification | ILocalNotification[]) {
    /* Schedules a list of notifications. Time is in miliseconds */
    this.notif.schedule(notifications);
  }
}
