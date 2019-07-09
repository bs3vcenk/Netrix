import { Component } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { AuthenticationService } from '../authentication.service';
import { timeout } from 'rxjs/operators';
import { SettingsService } from '../settings.service';
import { trigger, state, style, animate, transition } from "@angular/animations";

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

  constructor(
    private authServ: AuthenticationService,
    private http: HttpClient,
    private settings: SettingsService
  ) {
    this.http.get<any>(this.settings.apiServer + '/api/user/' + this.authServ.token + '/classes/0/tests').pipe(timeout(3000)).subscribe((response) => {
      this.tests = response.tests;
      this.results = response.tests;
      this.countTests();
    }, (error) => {
      console.log(error);
    })
  }

  async countTests() {
    this.tests.forEach((test) => {
      if (test.current === true) {
        this.currentTests += 1;
      }
    });
  }

  private reInit() {
    this.results = this.tests;
  }

  searchHandler(event) {
    this.reInit()
    const val = event.target.value;
    //console.log(val);
    if (val && val.trim() != '') {
      this.results = this.results.filter((item) => {
        return ((item.test.toLowerCase().indexOf(val.toLowerCase()) > -1) || (item.subject.toLowerCase().indexOf(val.toLowerCase()) > -1));
      });
    } else {
      this.results = this.tests;
    }
  }

}
