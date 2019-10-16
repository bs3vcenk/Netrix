import { Component } from '@angular/core';
import { trigger, state, style, animate, transition } from '@angular/animations';
import { ApiService } from '../services/api.service';
import { FirebaseX } from '@ionic-native/firebase-x/ngx';
import { TranslateService } from '@ngx-translate/core';

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
  oneDay = 86400000;
  currentDate = Date.now();

  constructor(
    private apiSvc: ApiService,
    private firebase: FirebaseX,
    private translate: TranslateService
  ) {
    this.apiSvc.loadingFinishedTests.subscribe((val) => {
      if (val) {
        this.initInBg();
      }
    });
  }

  ionViewDidEnter() {
    try { this.firebase.setScreenName('Tests'); } catch (e) {}
  }

  initInBg() {
    this.tests = this.apiSvc.tests;
    this.currentTests = this.apiSvc.currentTests;
  }

  convertToReadableDate(unixTimestamp: number): string {
    const date = new Date(unixTimestamp * 1000);
    const day = date.getDate();
    const month = date.getMonth() + 1;
    const year = date.getFullYear();
    return day + '.' + month + '.' + year + '.';
  }

  convertToReadableWeekSpan(startingWeekTimestamp: number): string {
    const startUNIXStamp = this.getMonday(startingWeekTimestamp * this.oneWeek).getTime();
    const startWeek = new Date(startUNIXStamp + this.oneWeek);
    const startWeekMonth = startWeek.getMonth() + 1; // Months start from 0 in JS
    const startWeekDay = startWeek.getDate();
    const endWeek = new Date(startWeek.getTime() + (this.oneWeek - this.oneDay));
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

  calculateRemainingDays(toDate: number): string {
    const numberOfDays = Math.ceil(((toDate * 1000) - this.currentDate) / 1000 / 60 / 60 / 24);
    return numberOfDays === 0 ? this.translate.instant('tab2.today') : numberOfDays.toString() + 'd';
  }

}
