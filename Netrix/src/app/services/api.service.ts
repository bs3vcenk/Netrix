import { Injectable } from '@angular/core';
import { SettingsService } from './settings.service';
import { AuthenticationService } from './authentication.service';
import { TranslateService } from '@ngx-translate/core';
import { FirebaseX } from '@ionic-native/firebase-x/ngx';
import { BehaviorSubject } from 'rxjs';
import { HTTP } from '@ionic-native/http/ngx';
import { Platform } from '@ionic/angular';

export interface SubjectData {
  name: string;
  grades: any[];
  notes: any[];
  average: 0.00;
  professors: string;
  id: 0;
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

  loadingFinishedSubj = new BehaviorSubject(false);
  loadingFinishedTests = new BehaviorSubject(false);
  loadingFinishedAbsences = new BehaviorSubject(false);
  loadingFinishedNotif = new BehaviorSubject(false);
  loadingFinishedInfo = new BehaviorSubject(false);

  ignoredNotifTypes = [];

  classId = new BehaviorSubject(0);

  classes = null;

  tests = null;
  currentTests = [];

  absences = null;

  subjects = null;
  fullAvg = null;

  info = null;

  dbError = new BehaviorSubject(false);
  networkError = new BehaviorSubject(false);
  trustError = new BehaviorSubject(false);
  maintenanceError = new BehaviorSubject(false);

  constructor(
    private http: HTTP,
    private settings: SettingsService,
    private authServ: AuthenticationService,
    private translate: TranslateService,
    private firebase: FirebaseX,
    private plt: Platform
  ) {
    this.plt.ready().then(() => {
      /* Default to JSON as we'll be receiving only JSON from the API */
      this.http.setDataSerializer('json');
      /* Enable certificate pinning */
      this.http.setSSLCertMode('pinned');
    });
  }

  async preCacheData() {
    this.plt.ready().then(() => {
      this.classId.subscribe((activeClassId) => {
        /* Execute all get functions */
        this.getClasses();
        this.getSubjects(activeClassId);
        this.getTests(activeClassId);
        this.getAbsences(activeClassId);
        this.getNotifConfig();
        this.getUserInfo(activeClassId);
      });
    });
  }

  handleErr(errorObj) {
    /* Error handler function, decides what type of error message to display to the user */
    let e;
    try { e = JSON.parse(errorObj.error); } catch (ex) { e = {error: null}; }
    if (e.error === 'E_TOKEN_NONEXISTENT') {
      /* User is not authenticated (possibly token purged from server DB, or logged out
       * from another device) */
      this.authServ.logout();
    } else if (e.error === 'E_DATABASE_CONNECTION_FAILED' || errorObj.status === 521 || errorObj.status === 500) {
      /* Server-side issue, such as a failed DB connection (first statement), unreachable
       * origin server (second statement), or a generic server error (third statement) */
      this.dbError.next(true);
    } else if (errorObj.status === -2) {
      /* Certificate not trusted, either MITM or public Wi-Fi login page */
      this.trustError.next(true);
    } else {
      /* Unknown error, probably a network error (e.g. no Internet access)
       *
       * Also could be something unhandled, so we throw the object so that Crashlytics
       * picks it up */
      this.networkError.next(true);
      throw errorObj;
    }
  }

  resetLoadingState() {
    this.classes = null;
    this.tests = null;
    this.currentTests = [];
    this.absences = null;
    this.subjects = null;
    this.fullAvg = null;
    this.info = null;
    this.loadingFinishedAbsences.next(false);
    this.loadingFinishedInfo.next(false);
    this.loadingFinishedNotif.next(false);
    this.loadingFinishedSubj.next(false);
    this.loadingFinishedTests.next(false);
  }

  async switchActiveClass(classId: number) {
    /* Clear out subject cache */
    this.subjCacheMap = {};
    /* Reset loadingFinished objects */
    this.resetLoadingState();
    /* Fetch class ID */
    await this.fetchClass(classId);
    /* Re-fetch all data by setting a new classId (the classId.subscribe()
     * in preCacheData() will be re-executed) */
    this.classId.next(classId);
  }

  async fetchClass(classId: number) {
    this.firebase.startTrace('fetchClass');
    try {
      await this.http.post(
        this.settings.apiServer + '/api/user/' + this.authServ.token + '/fetchclass',
        {class_id: classId},
        this.httpHeader
      );
    } catch (e) {
      this.firebase.stopTrace('fetchClass');
      this.handleErr(e);
    }
  }

  getClasses() {
    this.firebase.startTrace('getClasses');
    this.http.get(
      this.settings.apiServer + '/api/user/' + this.authServ.token + '/classes',
      {},
      this.httpHeader
    ).then((rx) => {
      const response = JSON.parse(rx.data);
      this.classes = response.classes;
      this.firebase.stopTrace('getClasses');
    }, (error) => {
      this.firebase.stopTrace('getClasses');
      this.handleErr(error);
    });
  }

  getMaintenanceMode() {
    this.firebase.startTrace('getMaintenanceMode');
    this.http.get(
      'https://ocjene.skole.hr/',
      {},
      this.httpHeader
    ).then((rx) => {
      if (rx.data.includes('trenutno u nadogradnji')) {
        this.maintenanceError.next(true);
      }
      this.firebase.stopTrace('getMaintenanceMode');
    }, (error) => {
      this.firebase.stopTrace('getMaintenanceMode');
      this.handleErr(error);
    });
  }

  saveFirebaseToken(firebaseToken: string) {
    this.firebase.startTrace('saveFirebaseToken');
    this.http.post(
      this.settings.apiServer + '/api/user/' + this.authServ.token + '/firebase',
      {deviceToken: firebaseToken},
      this.httpHeader
    ).then(() => {
      this.firebase.stopTrace('saveFirebaseToken');
    }, (error) => {
      this.firebase.stopTrace('saveFirebaseToken');
      this.handleErr(error);
    });
  }

  receiveNotifType(nType: string) {
    /* Delete a notification type from the ignore list, if it exists */
    if (this.ignoredNotifTypes.includes(nType)) {
      this.firebase.startTrace('receiveNotifType');
      this.http.post(
        this.settings.apiServer + '/api/user/' + this.authServ.token + '/settings/notif.ignore.del',
        {parameter: nType},
        this.httpHeader
      ).then(() => {
        this.firebase.stopTrace('receiveNotifType');
        delete this.ignoredNotifTypes[this.ignoredNotifTypes.indexOf(nType)];
      }, (error) => {
        this.firebase.stopTrace('receiveNotifType');
        this.handleErr(error);
      });
    }
  }

  setNotifDisabled(nState: boolean) {
    /* Toggle master notification switch */
    this.firebase.startTrace('setNotifState');
    this.http.post(
      this.settings.apiServer + '/api/user/' + this.authServ.token + '/settings/notif.disable',
      {parameter: nState},
      this.httpHeader
    ).then(() => {
      this.firebase.stopTrace('setNotifState');
    }, (error) => {
      this.firebase.stopTrace('setNotifState');
      this.handleErr(error);
    });
  }

  ignoreNotifType(nType: string) {
    /* Add a notification type to the ignore list, if it does not already exist */
    if (!this.ignoredNotifTypes.includes(nType)) {
      this.firebase.startTrace('ignoreNotifType');
      this.http.post(
        this.settings.apiServer + '/api/user/' + this.authServ.token + '/settings/notif.ignore.add',
        {parameter: nType},
        this.httpHeader
      ).then(() => {
        this.firebase.stopTrace('ignoreNotifType');
        this.ignoredNotifTypes.push(nType);
      }, (error) => {
        this.firebase.stopTrace('ignoreNotifType');
        this.handleErr(error);
      });
    }
  }

  getUserInfo(classId: number) {
    this.firebase.startTrace('getUserInfo');
    this.http.get(
      this.settings.apiServer + '/api/user/' + this.authServ.token + '/classes/' + classId + '/info',
      {},
      this.httpHeader
    ).then((response) => {
      this.info = JSON.parse(response.data);
      this.firebase.stopTrace('getUserInfo');
      this.loadingFinishedInfo.next(true);
    }, (error) => {
      this.firebase.stopTrace('getUserInfo');
      this.handleErr(error);
      this.loadingFinishedInfo.next(true);
    });
  }

  getNotifConfig() {
    /* Get list of disabled notification types, for display in the Notification management view */
    this.firebase.startTrace('getNotifConfig');
    this.http.get(
      this.settings.apiServer + '/api/user/' + this.authServ.token + '/settings/notif.all',
      {},
      this.httpHeader
    ).then((response) => {
      this.ignoredNotifTypes = JSON.parse(response.data).value.ignore;
      this.firebase.stopTrace('getNotifConfig');
      /* Let preCacheData() know we're done */
      this.loadingFinishedNotif.next(true);
      // this.loadingFinishedNotif.complete();
    }, (error) => {
      this.firebase.stopTrace('getNotifConfig');
      this.handleErr(error);
      /* Let preCacheData() know we're done */
      this.loadingFinishedNotif.next(true);
      // this.loadingFinishedNotif.complete();
    });
  }

  getSubjects(classId: number) {
    /* Get a stripped list of all subjects (alldata=0), containing no grades or notes */
    this.firebase.startTrace('getSubjects');
    this.http.get(
      this.settings.apiServer + '/api/user/' + this.authServ.token + '/classes/' + classId + '/subjects?alldata=1',
      {},
      this.httpHeader
    ).then((rx) => {
      const response = JSON.parse(rx.data);
      const allsubs = response.subjects;
      // Iterate over professors list and join it into a comma-separated string
      allsubs.forEach((subj) => {
        const processed = this.processSubjectData(subj);
        this.subjCacheMap[processed.id] = processed;
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
      this.firebase.stopTrace('getSubjects');
      /* Let preCacheData() know we're done */
      this.loadingFinishedSubj.next(true);
      // this.loadingFinishedSubj.complete();
    },
    (error) => {
      this.firebase.stopTrace('getSubjects');
      this.handleErr(error);
      /* Let preCacheData() know we're done */
      this.loadingFinishedSubj.next(true);
      // this.loadingFinishedSubj.complete();
    });
  }

  getTests(classId: number) {
    this.firebase.startTrace('getTests');
    this.http.get(
      this.settings.apiServer + '/api/user/' + this.authServ.token + '/classes/' + classId + '/tests',
      {},
      this.httpHeader
    ).then((rx) => {
      const response = JSON.parse(rx.data);
      this.tests = response.tests;
      /* Count the number of "current" tests, so that we know if we need to show the
       * "No tests" message or not */
      this.countTests();
      this.firebase.stopTrace('getTests');
      /* Let preCacheData() know we're done */
      this.loadingFinishedTests.next(true);
      // this.loadingFinishedTests.complete();
    }, (error) => {
      this.firebase.stopTrace('getTests');
      this.handleErr(error);
      /* Let preCacheData() know we're done */
      this.loadingFinishedTests.next(true);
      // this.loadingFinishedTests.complete();
    });
  }

  private async countTests() {
    this.tests.forEach((test) => {
      if (test.current === true) {
        this.currentTests.push(test);
      } else {
        this.tests[test.id].scheduled = false;
      }
    });
  }

  getAbsences(classId: number) {
    /* Get a list of absences, both an overview and a detailed list */
    this.firebase.startTrace('getAbsences');
    this.http.get(
      this.settings.apiServer + '/api/user/' + this.authServ.token + '/classes/' + classId + '/absences',
      {},
      this.httpHeader
    ).then((response) => {
      this.absences = JSON.parse(response.data);
      this.firebase.stopTrace('getAbsences');
      /* Let preCacheData() know we're done */
      this.loadingFinishedAbsences.next(true);
      // this.loadingFinishedAbsences.complete();
    }, (error) => {
      this.firebase.stopTrace('getAbsences');
      this.handleErr(error);
      /* Let preCacheData() know we're done */
      this.loadingFinishedAbsences.next(true);
      // this.loadingFinishedAbsences.complete();
    });
  }

  private processSubjectData(subjObject): SubjectData {
    /* Turns a subjObject (dict/JSON containing information about a subject) into
     * a SubjectData object */
    let subjGrades = [];
    let subjAvg;
    let subjNotes = [];
    const subjName = subjObject.subject;
    const subjProfs = subjObject.professors.join(', ');
    const subjId = subjObject.id;
    if (subjObject.grades) {
      subjAvg = subjObject.average;
      subjGrades = subjObject.grades;
    }
    if (subjObject.notes) {
      subjNotes = subjObject.notes;
    }
    const subject: SubjectData = {
      name: subjName,
      grades: subjGrades,
      notes: subjNotes,
      average: subjAvg,
      professors: subjProfs,
      id: subjId
    };
    return subject;
  }

  getSubject(subjId: string, classId: number) {
    return new Promise<SubjectData>((resolve, reject) => {
      /* Check if we have the subject ID cached already */
      if (this.subjCacheMap[subjId]) {
        /* If we do, return the cached object */
        console.log('ApiService/getSubjectNativeHTTP(): Have subject ID ' + subjId + ' cached, returning that');
        resolve(this.subjCacheMap[subjId]);
      } else {
        /* If we don't, fetch the data from the server, process it, and store it
         * into the cache */
        console.log('ApiService/getSubjectNativeHTTP(): Subject ID ' + subjId + ' not cached, fetching remote');
        this.http.get(
          this.settings.apiServer + '/api/user/' + this.authServ.token + '/classes/' + classId + '/subjects/' + subjId,
          {},
          this.httpHeader
        ).then((rx) => {
          const response = JSON.parse(rx.data);
          const subject = this.processSubjectData(response);
          this.subjCacheMap[subjId] = subject;
          resolve(subject);
        }, (err) => {
          reject(err);
        });
      }
    });
  }
}
