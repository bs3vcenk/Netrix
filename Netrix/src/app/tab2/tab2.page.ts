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
  dbError = false;
  noItemsLoaded = false;

  constructor(
    private apiSvc: ApiService,
    private firebase: FirebaseX
  ) {
    this.initInBg();
  }

  ionViewDidEnter() {
    try { this.firebase.setScreenName('Tests'); } catch (e) {}
  }

  initInBg() {
    if (this.apiSvc.tests === null) {
      this.apiSvc.getTests();
    }
    this.tests = this.apiSvc.tests;
    this.reInit();
    this.currentTests = this.apiSvc.currentTests;
  }

  private reInit() {
    this.results = this.tests;
  }

  convertToReadableDate(unixTimestamp: number): string {
    const date = new Date(unixTimestamp * 1000);
    return date.toLocaleDateString();
  }

  searchHandler(event) {
    this.reInit();
    const val = event.target.value;
    if (val && val.trim() !== '') {
      this.results = this.results.filter((item) => {
        return ((item.test.toLowerCase().indexOf(val.toLowerCase()) > -1) || (item.subject.toLowerCase().indexOf(val.toLowerCase()) > -1));
      });
    } else {
      this.results = this.tests;
    }
  }

}
