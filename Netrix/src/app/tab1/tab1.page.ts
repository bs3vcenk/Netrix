import { Component, OnInit } from '@angular/core';
import { trigger, state, style, animate, transition } from '@angular/animations';
import { ApiService } from '../services/api.service';
import { AdmobService } from '../services/admob.service';

@Component({
  selector: 'app-tab1',
  templateUrl: 'tab1.page.html',
  styleUrls: ['tab1.page.scss'],
  animations: [
    trigger('fadeInOut', [
      state('void', style({ opacity: '0' })),
      state('*', style({ opacity: '1' })),
      transition('void <=> *', animate('150ms ease-in'))
    ])
  ]
})
export class Tab1Page implements OnInit {

  subjects = null;
  fullAvg = null;
  tempSubjects: Array<any> = new Array(10);
  currentTestsLen = null;
  remainingTests = null;
  usingCache = null;

  constructor(
    private apiSvc: ApiService,
    private admobSvc: AdmobService
  ) {
    this.initInBg();
    this.calculateRemainingTests();
  }

  ngOnInit() {
    this.admobSvc.showBanner();
  }

  calculateRemainingTests() {
    const weekStart = this.apiSvc.getMonday(new Date().getTime());
    const weekID = Math.floor(weekStart.getTime() / (7 * 24 * 60 * 60 * 1000));
    this.apiSvc.loadingFinishedTests.subscribe((isLoaded) => {
      if (isLoaded) {
        this.currentTestsLen = this.apiSvc.currentTests.length;
        if (this.currentTestsLen > 0) {
          for (let i = 0; i < this.apiSvc.tests.length; i++) {
            if (this.apiSvc.tests[i].week === weekID) {
              console.log('Tab1Page/calculateRemainingTests(): Found matching test group for week ID ' + weekID);
              this.remainingTests = this.apiSvc.tests[i].currentTests;
            }
          }
        }
      } else {
        this.currentTestsLen = null;
        this.remainingTests = null;
      }
    });
  }

  initInBg() {
    this.apiSvc.loadingFinishedSubj.subscribe((isLoaded) => {
      this.fullAvg = this.apiSvc.fullAvg;
      if (this.fullAvg > 0) {
        this.fullAvg = this.fullAvg.toFixed(2);
      }
      this.subjects = this.apiSvc.subjects;
      this.usingCache = this.apiSvc.usingCachedContent;
    });
  }
}
