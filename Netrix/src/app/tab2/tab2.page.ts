import { Component } from '@angular/core';
import { trigger, state, style, animate, transition } from '@angular/animations';
import { ApiService } from '../services/api.service';
import { FirebaseX } from '@ionic-native/firebase-x/ngx';
import { AdmobService } from '../services/admob.service';

@Component({
  selector: 'app-tab2',
  templateUrl: 'tab2.page.html',
  styleUrls: ['tab2.page.scss'],
  animations: [
    trigger('fadeInOut', [
      state('void', style({ opacity: '0' })),
      state('*', style({ opacity: '1' })),
      transition('void <=> *', animate('150ms ease-in'))
    ])
  ]
})
export class Tab2Page {

  tests = null;
  showAllPreference = false;
  currentTests = [];
  oneWeek = 604800000; // in ms

  constructor(
    private apiSvc: ApiService,
    private firebase: FirebaseX,
    private admob: AdmobService
  ) {
    this.apiSvc.loadingFinishedTests.subscribe((val) => {
      if (val) {
        this.initInBg();
      }
    });
  }

  ionViewDidEnter() {
    try { this.firebase.setScreenName('Tests'); } catch (e) {}
    this.admob.showInterstitial();
  }

  initInBg() {
    this.tests = this.apiSvc.tests;
    this.currentTests = this.apiSvc.currentTests;
  }

  convertToReadableDate(unixTimestamp: number): string {
    const date = new Date(unixTimestamp * 1000);
    return date.toLocaleDateString();
  }

  convertToReadableWeekSpan(startingWeekTimestamp: number): string {
    const startUNIXStamp = this.getMonday(startingWeekTimestamp * this.oneWeek).getTime();
    const startWeek = new Date(startUNIXStamp);
    const startWeekMonth = startWeek.getMonth() + 1; // Months start from 0 in JS
    const startWeekDay = startWeek.getDate();
    const endWeek = new Date(startUNIXStamp + this.oneWeek);
    const endWeekMonth = endWeek.getMonth() + 1;
    const endWeekDay = endWeek.getDate();
    return startWeekDay + '.' + startWeekMonth + '. - ' + endWeekDay + '.' + endWeekMonth + '.';
  }

  getMonday(timestamp: number): Date {
    /* https://stackoverflow.com/a/4156516 */
    const d = new Date(timestamp);
    const day = d.getDay();
    const diff = d.getDate() - day + (day === 0 ? -6 : 1); // adjust when day is sunday
    return new Date(d.setDate(diff));
  }

  calculateRemainingDays(): number {
    return 0; // TODO: Implement
  }

}
