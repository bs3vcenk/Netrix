import { Component } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { AuthenticationService } from '../authentication.service';
import { timeout } from 'rxjs/operators';
import { SettingsService } from '../settings.service';
import { trigger, state, style, animate, transition } from "@angular/animations";
import { ToastController } from '@ionic/angular';
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
  currentTests = 0;
  results = null;
  dbError = false;
  noItemsLoaded = false;

  constructor(
    private authServ: AuthenticationService,
    private http: HttpClient,
    private settings: SettingsService,
    private toastCtrl: ToastController,
    private translate: TranslateService
  ) {
    this.getTests();
  }

  async getTests() {
    this.http.get<any>(this.settings.apiServer + '/api/user/' + this.authServ.token + '/classes/0/tests').pipe(timeout(this.settings.httpLimit)).subscribe((response) => {
      this.tests = response.tests;
      this.results = response.tests;
      this.countTests();
      this.noItemsLoaded = false;
      this.dbError = false;
    }, (error) => {
      this.noItemsLoaded = true;
      if (error.error) {
        console.log(error)
        if (error.error.error === "E_TOKEN_NONEXISTENT") {
          // User is not authenticated (possibly token purged from server DB)
          this.toastError(this.translate.instant("generic.alert.expiry"), null, 2500);
          this.authServ.logout();
        } else if (error.error.error === "E_DATABASE_CONNECTION_FAILED") {
          // Server-side issue
          this.dbError = true;
          throw new Error('Database connection failed');
        } else if (error.status === 0) {
          // Server did not respond
          this.dbError = true;
          throw new Error('Server down');
        } else {
          // No network on client
          //this.networkError(this.translate.instant("generic.alert.network.header"), this.translate.instant("generic.alert.network.content"));
          throw new Error('Network error: ' + error);
        }
      } else {
        throw new Error("Network error: " + error);
      }
    });
  }

  toastError(msg, btns, dur) {
    this.toastCtrl.create({
      message: msg,
      buttons: btns,
      color: 'dark',
      duration: dur
    }).then((toast) => {
      toast.present();
    });
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
