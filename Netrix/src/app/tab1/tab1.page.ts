import { Component } from '@angular/core';
import { trigger, state, style, animate, transition } from '@angular/animations';
import { AdmobService } from '../admob.service';
import { ApiService } from '../api.service';

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
  subjsLoaded = false;
  noItemsLoaded = false;
  dbError = false;

  constructor(
    private admobSvc: AdmobService,
    private apiSvc: ApiService
  ) { }

  ngOnInit() {
    this.admobSvc.showBanner();
  }

  ionViewDidEnter() {
    this.initInBg();
  }

  private initInBg() {
    let atts = 0;
    while (atts !== 3000) {
      atts += 1;
      if (!this.apiSvc.subj_attemptedLoad || (this.subjects === null && (this.noItemsLoaded === false && this.dbError === false))) {
        console.log('Syncing');
        this.fullAvg = this.apiSvc.fullAvg;
        this.noItemsLoaded = this.apiSvc.subj_noItemsLoaded;
        this.dbError = this.apiSvc.dbError;
        this.subjects = this.apiSvc.subjects;
      } else {
        console.log('Breaking loop');
        break;
      }
    }
  }
}
