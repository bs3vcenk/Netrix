import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { timeout } from 'rxjs/operators';
import { SettingsService } from './settings.service';
import { AuthenticationService } from './authentication.service';
import { TranslateService } from '@ngx-translate/core';
import { Firebase } from '@ionic-native/firebase/ngx';

@Injectable({
  providedIn: 'root'
})
export class ApiService {

  ignoredNotifTypes = [];

  tests = null;
  currentTests = 0;

  absences = null;

  subjects = null;
  dbError = null;
  fullAvg = null;

  subj_noItemsLoaded = null;
  subj_attemptedLoad = null;
  tests_noItemsLoaded = null;
  abs_noItemsLoaded = null;

  constructor(
    private http: HttpClient,
    private settings: SettingsService,
    private authServ: AuthenticationService,
    private translate: TranslateService,
    private firebase: Firebase
  ) { }

  async preCacheData() {
    this.getSubjects();
    this.getTests();
    this.getAbsences();
    this.getNotifConfig();
  }

  receiveNotifType(nType: string) {
    if (this.ignoredNotifTypes.includes(nType)) {
      this.firebase.startTrace('receiveNotifType');
      this.http.post<any>(this.settings.apiServer + '/api/user/' + this.authServ.token + '/settings/notif.ignore.del', {parameter: nType})
      .pipe(timeout(this.settings.httpLimit))
      .subscribe((response) => {
        this.firebase.stopTrace('receiveNotifType');
        delete this.ignoredNotifTypes[this.ignoredNotifTypes.indexOf(nType)];
      }, (err) => {
        this.firebase.stopTrace('receiveNotifType');
        throw err;
      });
    }
  }

  ignoreNotifType(nType: string) {
    if (!this.ignoredNotifTypes.includes(nType)) {
      this.firebase.startTrace('ignoreNotifType');
      this.http.post<any>(this.settings.apiServer + '/api/user/' + this.authServ.token + '/settings/notif.ignore.add', {parameter: nType})
      .pipe(timeout(this.settings.httpLimit))
      .subscribe((response) => {
        this.firebase.stopTrace('ignoreNotifType');
        this.ignoredNotifTypes.push(nType);
      }, (err) => {
        this.firebase.stopTrace('ignoreNotifType');
        throw err;
      });
    }
  }

  getNotifConfig() {
    this.firebase.startTrace('getNotifConfig');
    this.http.get<any>(this.settings.apiServer + '/api/user/' + this.authServ.token + '/settings/notif.all')
    .pipe(timeout(this.settings.httpLimit))
    .subscribe((response) => {
      this.firebase.stopTrace('getNotifConfig');
      this.ignoredNotifTypes = response.value.ignore;
    }, (err) => {
      this.firebase.stopTrace('getNotifConfig');
      throw err;
    });
  }

  getSubjects() {
    this.firebase.startTrace('getSubjects');
    this.http.get<any>(this.settings.apiServer + '/api/user/' + this.authServ.token + '/classes/0/subjects')
    .pipe(timeout(this.settings.httpLimit))
    .subscribe((response) => {
      const allsubs = response.subjects;
      // Iterate over professors list and join it into a comma-separated string
      allsubs.forEach((subj) => {
        const profs = subj.professors;
        let profsC = null;
        if (profs.length > 3) {
          console.log('tab1/getSubjects(): Hit professor limit');
          profsC = profs.slice(0, 3);
          profsC.push(this.translate.instant('tab1.text.other').replace('NUM_PROFS', profs.slice(3, profs.length).length));
        } else {
          profsC = profs;
        }
        subj.professors = profsC.join(', ');
      });
      // Set for display
      this.subjects = allsubs;
      this.fullAvg = response.class_avg;
      this.subj_noItemsLoaded = false;
      this.dbError = false;
      this.firebase.stopTrace('getSubjects');
    },
    (error) => {
      this.subj_noItemsLoaded = true;
      this.firebase.stopTrace('getSubjects');
      if (error.error) {
        console.log(error);
        if (error.error.error === 'E_TOKEN_NONEXISTENT') {
          // User is not authenticated (possibly token purged from server DB)
          this.authServ.logout();
        } else if (error.error.error === 'E_DATABASE_CONNECTION_FAILED') {
          // Server-side issue
          this.dbError = true;
          throw new Error('Database connection failed');
        } else if (error.status === 0) {
          // Server did not respond
          throw new Error('Server down');
        }
      }
    });
  }

  getTests() {
    this.firebase.startTrace('getTests');
    this.http.get<any>(this.settings.apiServer + '/api/user/' + this.authServ.token + '/classes/0/tests')
    .pipe(timeout(this.settings.httpLimit))
    .subscribe((response) => {
      this.tests = response.tests;
      this.countTests();
      this.tests_noItemsLoaded = false;
      this.dbError = false;
      this.firebase.stopTrace('getTests');
    }, (error) => {
      this.tests_noItemsLoaded = true;
      this.firebase.stopTrace('getTests');
      if (error.error) {
        console.log(error);
        if (error.error.error === 'E_TOKEN_NONEXISTENT') {
          // User is not authenticated (possibly token purged from server DB)
          this.authServ.logout();
        } else if (error.error.error === 'E_DATABASE_CONNECTION_FAILED') {
          // Server-side issue
          this.dbError = true;
          throw new Error('Database connection failed');
        } else if (error.status === 0) {
          // Server did not respond
          throw new Error('Server down');
        }
      }
    });
  }

  private async countTests() {
    this.tests.forEach((test) => {
      if (test.current === true) {
        this.currentTests += 1;
      }
    });
  }

  getAbsences() {
    this.firebase.startTrace('getAbsences');
    this.http.get<any>(this.settings.apiServer + '/api/user/' + this.authServ.token + '/classes/0/absences')
    .pipe(timeout(this.settings.httpLimit))
    .subscribe((response) => {
      this.absences = response;
      this.firebase.stopTrace('getAbsences');
    }, (error) => {
      this.firebase.stopTrace('getAbsences');
      this.abs_noItemsLoaded = true;
      if (error.error) {
        if (error.error.error === 'E_TOKEN_NONEXISTENT') {
          // User is not authenticated (possibly token purged from server DB)
          this.authServ.logout();
        } else if (error.error.error === 'E_DATABASE_CONNECTION_FAILED') {
          // Server-side issue
          this.dbError = true;
          throw new Error('Database connection failed');
        } else if (error.status === 0) {
          // Server did not respond
          throw new Error('Server down');
        }
      }
    });
  }
}