import { Component } from '@angular/core';
import { trigger, state, style, animate, transition } from '@angular/animations';
import { ApiService } from '../services/api.service';
import { FirebaseX } from '@ionic-native/firebase-x/ngx';

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
  results = null;

  constructor(
    private apiSvc: ApiService,
    private firebase: FirebaseX
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
    return date.toLocaleDateString();
  }

}
