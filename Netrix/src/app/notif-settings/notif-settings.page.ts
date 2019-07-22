import { Component, OnInit } from '@angular/core';
import { Firebase } from '@ionic-native/firebase/ngx';
import { ApiService } from '../api.service';

@Component({
  selector: 'app-notif-settings',
  templateUrl: './notif-settings.page.html',
  styleUrls: ['./notif-settings.page.scss'],
})
export class NotifSettingsPage implements OnInit {

  excludes = [];
  fullTypes = [
    {name: 'Tests', checked: true, id: 'test'},
    {name: 'Grades', checked: true, id: 'grade'},
    {name: 'Classes', checked: true, id: 'class'},
    {name: 'Notes', checked: true, id: 'note'},
    {name: 'Absences', checked: true, id: 'absence'}
  ];

  constructor(
    private firebase: Firebase,
    private apiSvc: ApiService
  ) {
    try { this.firebase.setScreenName('NotificationSettings'); } catch (e) {}
  }

  ngOnInit() {
    this.fullTypes.forEach((fType) => {
      if (this.apiSvc.ignoredNotifTypes.includes(fType.id)) {
        fType.checked = false;
      }
    });
  }

  addToIgnoreList(ignId: string) {
    this.apiSvc.ignoreNotifType(ignId);
  }

  removeFromIgnoreList(ignId: string) {
    this.apiSvc.receiveNotifType(ignId);
  }

  handleChk(fType) {
    console.log(fType);
    const currentStatus = !fType.checked;
    if (currentStatus) { // Now checked
      console.log('notif-settings/handleChk(): Checked property ' + fType.id);
      this.removeFromIgnoreList(fType.id);
    } else { // Now unchecked
      console.log('notif-settings/handleChk(): Unchecked property ' + fType.id);
      this.addToIgnoreList(fType.id);
    }
  }
}
