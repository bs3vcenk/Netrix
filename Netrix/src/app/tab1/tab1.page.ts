import { Component } from '@angular/core';
import { trigger, state, style, animate, transition } from '@angular/animations';
import { AdmobService } from '../admob.service';
import { ApiService } from '../api.service';
import { FirebaseX } from '@ionic-native/firebase-x/ngx';

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
export class Tab1Page {

  subjects = null;
  fullAvg = null;
  noItemsLoaded = false;
  dbError = false;

  constructor(
    private admobSvc: AdmobService,
    private apiSvc: ApiService,
    private firebase: FirebaseX
  ) {
    try { this.firebase.setScreenName('Subjects'); } catch (e) {}
  }

  ngOnInit() {
    this.admobSvc.showBanner();
  }

  ionViewDidEnter() {
    this.initInBg();
  }

  initInBg() {
    console.log('Syncing');
    if (this.apiSvc.subjects === null) {
      console.log('tab1/initInBg(): Sync failed, redoing manually');
      this.apiSvc.getSubjects();
    }
    this.fullAvg = this.apiSvc.fullAvg;
    this.noItemsLoaded = this.apiSvc.subj_noItemsLoaded;
    this.dbError = this.apiSvc.dbError;
    this.subjects = this.apiSvc.subjects;
  }
}
