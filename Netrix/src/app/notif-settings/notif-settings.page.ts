import { Component, OnInit } from '@angular/core';
import { FirebaseX } from '@ionic-native/firebase-x/ngx';
import { ApiService } from '../api.service';
import { TranslateService } from '@ngx-translate/core';

@Component({
  selector: 'app-notif-settings',
  templateUrl: './notif-settings.page.html',
  styleUrls: ['./notif-settings.page.scss'],
})
export class NotifSettingsPage implements OnInit {

  excludes = [];
  fullTypes = [
    {name: this.translate.instant('notifSettings.tests'), checked: true, id: 'test'},
    {name: this.translate.instant('notifSettings.grades'), checked: true, id: 'grade'},
    {name: this.translate.instant('notifSettings.classes'), checked: true, id: 'class'},
    {name: this.translate.instant('notifSettings.notes'), checked: true, id: 'note'},
    {name: this.translate.instant('notifSettings.absences'), checked: true, id: 'absence'}
  ];

  constructor(
    private firebase: FirebaseX,
    private apiSvc: ApiService,
    private translate: TranslateService
  ) {}

  ngOnInit() {
    this.fullTypes.forEach((fType) => {
      if (this.apiSvc.ignoredNotifTypes.includes(fType.id)) {
        fType.checked = false;
      }
    });
  }

  ionViewDidEnter() {
    try { this.firebase.setScreenName('NotificationSettings'); } catch (e) {}
  }

  addToIgnoreList(ignId: string) {
    this.apiSvc.ignoreNotifType(ignId);
  }

  removeFromIgnoreList(ignId: string) {
    this.apiSvc.receiveNotifType(ignId);
  }

  handleChk(fType) {
    const currentStatus = !fType.checked;
    if (currentStatus) { // Now checked
      this.removeFromIgnoreList(fType.id);
    } else { // Now unchecked
      this.addToIgnoreList(fType.id);
    }
  }
}
