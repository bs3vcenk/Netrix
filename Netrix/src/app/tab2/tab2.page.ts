import { Component } from '@angular/core';
import { trigger, state, style, animate, transition } from '@angular/animations';
import { ApiService } from '../api.service';

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
  currentTests = 0;
  results = null;
  dbError = false;
  noItemsLoaded = false;

  constructor(
    private apiSvc: ApiService
  ) {
    this.tests = this.apiSvc.tests;
    this.reInit();
    this.noItemsLoaded = this.apiSvc.tests_noItemsLoaded;
    this.dbError = this.apiSvc.dbError;
    this.currentTests = this.apiSvc.currentTests;
  }

  private reInit() {
    this.results = this.tests;
  }

  searchHandler(event) {
    this.reInit();
    const val = event.target.value;
    // console.log(val);
    if (val && val.trim() !== '') {
      this.results = this.results.filter((item) => {
        return ((item.test.toLowerCase().indexOf(val.toLowerCase()) > -1) || (item.subject.toLowerCase().indexOf(val.toLowerCase()) > -1));
      });
    } else {
      this.results = this.tests;
    }
  }

}
