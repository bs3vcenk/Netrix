// tslint:disable: variable-name
import { Injectable } from '@angular/core';
import { SettingsService } from './settings.service';
import { AuthenticationService } from './authentication.service';
import { TranslateService } from '@ngx-translate/core';
import { FirebaseX } from '@ionic-native/firebase-x/ngx';
import { BehaviorSubject, forkJoin } from 'rxjs';
import { HTTP } from '@ionic-native/http/ngx';

interface SubjectData {
  name: string;
  grades: any[];
  notes: any[];
  average: 0.00;
  professors: string;
}

@Injectable({
  providedIn: 'root'
})
export class ApiService {

  httpHeader = {
    'Content-Type': 'application/json',
    'User-Agent': 'Netrix'
  };

  subjCacheMap = {};

  loadingFinishedAll = new BehaviorSubject(false);

  loadingFinishedSubj = new BehaviorSubject(false);
  loadingFinishedTests = new BehaviorSubject(false);
  loadingFinishedAbsences = new BehaviorSubject(false);
  loadingFinishedNotif = new BehaviorSubject(false);

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
    private http: HTTP,
    private settings: SettingsService,
    private authServ: AuthenticationService,
    private translate: TranslateService,
    private firebase: FirebaseX
  ) {
    this.http.setDataSerializer('json');
  }

  async preCacheData() {
    this.getSubjects();
    this.getTests();
    this.getAbsences();
    this.getNotifConfig();
    forkJoin([this.loadingFinishedAbsences, this.loadingFinishedNotif, this.loadingFinishedSubj, this.loadingFinishedTests])
    .subscribe(([abs, notif, subj, test]) => {
      if (abs && notif && subj && test) {
        this.loadingFinishedAll.next(true);
      }
    });
  }

  receiveNotifType(nType: string) {
    if (this.ignoredNotifTypes.includes(nType)) {
      this.firebase.startTrace('receiveNotifType');
      this.http.post(
        this.settings.apiServer + '/api/user/' + this.authServ.token + '/settings/notif.ignore.del',
        {parameter: nType},
        this.httpHeader
      ).then((response) => {
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
      this.http.post(
        this.settings.apiServer + '/api/user/' + this.authServ.token + '/settings/notif.ignore.add',
        {parameter: nType},
        this.httpHeader
      ).then((response) => {
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
    this.http.get(
      this.settings.apiServer + '/api/user/' + this.authServ.token + '/settings/notif.all',
      {},
      this.httpHeader
    ).then((response) => {
      this.ignoredNotifTypes = JSON.parse(response.data).value.ignore;
      this.firebase.stopTrace('getNotifConfig');
      this.loadingFinishedNotif.next(true);
      this.loadingFinishedNotif.complete();
    }, (err) => {
      this.loadingFinishedNotif.next(true);
      this.loadingFinishedNotif.complete();
      this.firebase.stopTrace('getNotifConfig');
      console.log(err);
    });
  }

  getSubjects() {
    this.firebase.startTrace('getSubjects');
    this.http.get(
      this.settings.apiServer + '/api/user/' + this.authServ.token + '/classes/0/subjects',
      {},
      this.httpHeader
    ).then((rx) => {
      const response = JSON.parse(rx.data);
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
      this.loadingFinishedSubj.next(true);
      this.loadingFinishedSubj.complete();
    },
    (error) => {
      this.subj_noItemsLoaded = true;
      this.firebase.stopTrace('getSubjects');
      if (error.error) {
        if (error.error.error === 'E_TOKEN_NONEXISTENT') {
          // User is not authenticated (possibly token purged from server DB)
          this.authServ.logout();
        } else if (error.error.error === 'E_DATABASE_CONNECTION_FAILED' || error.status === 521) {
          // Server-side issue
          this.dbError = true;
        } else {
          console.log(error);
        }
      }
      this.loadingFinishedSubj.next(true);
      this.loadingFinishedSubj.complete();
    });
  }

  getTests() {
    this.firebase.startTrace('getTests');
    this.http.get(
      this.settings.apiServer + '/api/user/' + this.authServ.token + '/classes/0/tests',
      {},
      this.httpHeader
    ).then((rx) => {
      const response = JSON.parse(rx.data);
      this.tests = response.tests;
      this.countTests();
      this.tests_noItemsLoaded = false;
      this.dbError = false;
      this.firebase.stopTrace('getTests');
      this.loadingFinishedTests.next(true);
      this.loadingFinishedTests.complete();
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
        } else {
          console.log(error);
        }
      }
      this.loadingFinishedTests.next(true);
      this.loadingFinishedTests.complete();
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
    this.http.get(
      this.settings.apiServer + '/api/user/' + this.authServ.token + '/classes/0/absences',
      {},
      this.httpHeader
    ).then((response) => {
      this.absences = JSON.parse(response.data);
      this.firebase.stopTrace('getAbsences');
      this.loadingFinishedAbsences.next(true);
      this.loadingFinishedAbsences.complete();
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
        } else {
          console.log(error);
        }
      }
      this.loadingFinishedAbsences.next(true);
      this.loadingFinishedAbsences.complete();
    });
  }

  getSubject(subjId: string) {
    return new Promise<SubjectData>((resolve, reject) => {
      if (this.subjCacheMap[subjId]) {
        console.log('ApiService/getSubjectNativeHTTP(): Have subject ID ' + subjId + ' cached, returning that');
        resolve(this.subjCacheMap[subjId]);
      } else {
        console.log('ApiService/getSubjectNativeHTTP(): Subject ID ' + subjId + ' not cached, fetching remote');
        this.http.get(
          this.settings.apiServer + '/api/user/' + this.authServ.token + '/classes/0/subjects/' + subjId,
          {},
          this.httpHeader
        ).then((rx) => {
          const response = JSON.parse(rx.data);
          let subjGrades = [];
          let subjAvg;
          let subjNotes = [];
          const subjName = response.subject;
          const subjProfs = response.professors.join(', ');
          if (response.grades) {
            subjAvg = response.average;
            subjGrades = response.grades;
          }
          if (response.notes) {
            subjNotes = response.notes;
          }
          const subject: SubjectData = {
            name: subjName,
            grades: subjGrades,
            notes: subjNotes,
            average: subjAvg,
            professors: subjProfs
          };
          this.subjCacheMap[subjId] = subject;
          resolve(subject);
        }, (err) => {
          reject(err);
        });
      }
    });
  }
}
