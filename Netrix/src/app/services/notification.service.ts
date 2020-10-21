import { Injectable } from '@angular/core';
import { LocalNotifications, ILocalNotification } from '@ionic-native/local-notifications/ngx';
import { ApiService } from './api.service';
import { BehaviorSubject } from 'rxjs';
import { TranslateService } from '@ngx-translate/core';
import { SettingsService } from './settings.service';
import { Platform } from '@ionic/angular';
import { FirebaseX } from '@ionic-native/firebase-x/ngx';

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
    private translate: TranslateService,
    private settings: SettingsService,
    private plt: Platform,
    private firebase: FirebaseX
  ) {
    /* Get all scheduled notifications and let scheduleTestNotifications
     * know we're done */
    this.syncLocalLists();
  }

  syncLocalLists() {
    this.plt.ready().then(() => {
      this.firebase.logMessage('NotificationService/syncLocalLists(): Resetting notification lists');
      this.notif.getAll().then(notifs => {
        this.firebase.logMessage('NotificationService/syncLocalLists(): ' + JSON.stringify(notifs));
        this.scheduledNotifIDs = [];
        notifs.forEach(notifX => {
          this.scheduledNotifIDs.push(notifX.id);
        });
        this.scheduledNotifs = notifs;
        this.notifInitFinished.next(true);
      });
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

  formatDate(origDate: number): Date {
    /* Get notification date from test date, and set it to 7 AM */
    const notifDate = new Date(origDate - (this.settings.notifTime * this.oneDayInMiliseconds));
    notifDate.setHours(7, 0); // Make sure it triggers at 7 instead of midnight
    return notifDate;
  }

  scheduleTestNotifications(days: number) {
    if (this.apiSvc.usingCachedContent) {
      this.firebase.logMessage('NotificationService/scheduleTestNotifications(): Running in offline mode, not scheduling notifications');
      return;
    } else if (this.apiSvc.classId.value !== 0) {
      this.firebase.logMessage('NotificationService/scheduleTestNotifications(): Class ID not 0, not scheduling notifications');
      return;
    }
    /* Wait until notif.getAll() is done */
    this.notifInitFinished.subscribe((notifInitFinished) => {
      if (notifInitFinished) {
        this.settings.settingsReady.subscribe((settingsReady) => {
          if (settingsReady) {
            this.firebase.logMessage('NotificationService/scheduleTestNotifications(): notifInitFinished, starting schedule');
            // tslint:disable-next-line: prefer-const
            let toBeScheduled = [];
            /* Format every 'current' test into a notification and append it
            * to a list of to-be-scheduled tests */
            this.apiSvc.tests.forEach(test => {
              /* If it's already scheduled, avoid scheduling again */
              if (!this.scheduledNotifIDs.includes(test.id)) {
                toBeScheduled.push({
                  id: test.id,
                  title: this.translate.instant('notif.text.test'),
                  text: test.subject + ': ' + test.test + ' '
                    + this.translate.instant('notif.text.inXdays').replace('DAYS', this.settings.notifTime),
                  trigger: { at: this.formatDate(test.date * 1000) }
                } as ILocalNotification);
              }
            });
            this.scheduleNotifications(toBeScheduled);
          }
        });
      }
    });
  }

  private scheduleNotifications(notifications: ILocalNotification[]) {
    /* Schedules a list of notifications. Time is in miliseconds */
    this.firebase.logMessage(
      'NotificationService/scheduleNotifications(): Scheduling ' + notifications.length + ' notifications'
    );
    this.notif.schedule(notifications);
  }
}
