import { Injectable } from '@angular/core';
import { SettingsService } from './settings.service';
import { AuthenticationService } from './authentication.service';
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
    private plt: Platform
  ) {
    this.plt.ready().then(() => {
      /* Default to JSON as we'll be receiving only JSON from the API */
      this.http.setDataSerializer('json');
      /* Force 'legacy' mode; trust only system certs */
      this.http.setSSLCertMode('legacy');
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
        // this.getUserInfo(activeClassId);
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
      console.warn('ApiService/handleErr(): Server doesn\'t have our token stored, logging out');
    } else if (e.error === 'E_DATABASE_CONNECTION_FAILED' || (errorObj.status >= 500 && errorObj.status <= 599)) {
      /* Server-side issue */
      this.dbError.next(true);
      console.warn('ApiService/handleErr(): Server-side error');
    } else if (errorObj.status === -2) {
      /* Certificate not trusted, either MITM or public Wi-Fi login page */
      this.trustError.next(true);
      console.warn('ApiService/handleErr(): Certificate could not be verified');
    } else if (errorObj.status === -3 || errorObj.status === -4 || errorObj.status === -1) {
      /* Network error */
      this.networkError.next(true);
      console.warn('ApiService/handleErr(): Request failed');
    } else {
      /* Unknown error, probably a network error (e.g. no Internet access)
       *
       * Also could be something unhandled, so we throw the object so that Crashlytics
       * picks it up */
      this.networkError.next(true);
      console.warn('ApiService/handleErr(): Unknown error');
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
    /* Fetch server-side endpoint which tells the server to scrape the data
     * for the selected class ID */
    try {
      await this.http.post(
        this.settings.apiServer + '/api/user/' + this.authServ.token + '/fetchclass',
        {class_id: classId},
        this.httpHeader
      );
    } catch (e) {
      this.handleErr(e);
    }
  }

  getClasses() {
    /* Gets a list of classes */
    this.http.get(
      this.settings.apiServer + '/api/user/' + this.authServ.token + '/classes',
      {},
      this.httpHeader
    ).then((rx) => {
      const response = JSON.parse(rx.data);
      this.classes = response.classes;
    }, (error) => {
      this.handleErr(error);
    });
  }

  getMaintenanceMode() {
    /* Check if maintenance mode is in progress */
    this.http.get(
      'https://ocjene.skole.hr/',
      {},
      this.httpHeader
    ).then((rx) => {
      if (rx.data.includes('trenutno u nadogradnji')) {
        this.maintenanceError.next(true);
      }
    }, () => {
    });
  }

  saveFirebaseToken(firebaseToken: string) {
    /* Tell the server to store the device token with the user's
     * profile */
    this.http.post(
      this.settings.apiServer + '/api/user/' + this.authServ.token + '/firebase',
      {deviceToken: firebaseToken},
      this.httpHeader
    ).then(() => {},
    (error) => {
      this.handleErr(error);
    });
  }

  receiveNotifType(nType: string) {
    /* Delete a notification type from the ignore list, if it exists */
    if (this.ignoredNotifTypes.includes(nType)) {
      this.http.post(
        this.settings.apiServer + '/api/user/' + this.authServ.token + '/settings/notif.ignore.del',
        {parameter: nType},
        this.httpHeader
      ).then(() => {
        delete this.ignoredNotifTypes[this.ignoredNotifTypes.indexOf(nType)];
      }, (error) => {
        this.handleErr(error);
      });
    }
  }

  setNotifDisabled(nState: boolean) {
    /* Toggle master notification switch */
    this.http.post(
      this.settings.apiServer + '/api/user/' + this.authServ.token + '/settings/notif.disable',
      {parameter: nState},
      this.httpHeader
    ).then(() => {
    }, (error) => {
      this.handleErr(error);
    });
  }

  ignoreNotifType(nType: string) {
    /* Add a notification type to the ignore list, if it does not already exist */
    if (!this.ignoredNotifTypes.includes(nType)) {
      this.http.post(
        this.settings.apiServer + '/api/user/' + this.authServ.token + '/settings/notif.ignore.add',
        {parameter: nType},
        this.httpHeader
      ).then(() => {
        this.ignoredNotifTypes.push(nType);
      }, (error) => {
        this.handleErr(error);
      });
    }
  }

  getUserInfo(classId: number) {
    /* Get information about user */
    this.http.get(
      this.settings.apiServer + '/api/user/' + this.authServ.token + '/classes/' + classId + '/info',
      {},
      this.httpHeader
    ).then((response) => {
      this.info = JSON.parse(response.data);
      this.loadingFinishedInfo.next(true);
    }, (error) => {
      this.handleErr(error);
      this.loadingFinishedInfo.next(true);
    });
  }

  getNotifConfig() {
    /* Get list of disabled notification types, for display in the Notification management view */
    this.http.get(
      this.settings.apiServer + '/api/user/' + this.authServ.token + '/settings/notif.all',
      {},
      this.httpHeader
    ).then((response) => {
      this.ignoredNotifTypes = JSON.parse(response.data).value.ignore;
      /* Let preCacheData() know we're done */
      this.loadingFinishedNotif.next(true);
      // this.loadingFinishedNotif.complete();
    }, (error) => {
      this.handleErr(error);
      /* Let preCacheData() know we're done */
      this.loadingFinishedNotif.next(true);
      // this.loadingFinishedNotif.complete();
    });
  }

  getSubjects(classId: number) {
    /* Get a stripped list of all subjects (alldata=0), containing no grades or notes */
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
        subj.professors = subj.professors.join(', ');
      });
      // Set for display
      this.subjects = allsubs;
      this.fullAvg = response.class_avg;
      /* Let preCacheData() know we're done */
      this.loadingFinishedSubj.next(true);
      // this.loadingFinishedSubj.complete();
    },
    (error) => {
      this.handleErr(error);
      /* Let preCacheData() know we're done */
      this.loadingFinishedSubj.next(true);
      // this.loadingFinishedSubj.complete();
    });
  }

  getTests(classId: number) {
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
      /* Sort tests by week */
      this.tests = this.groupTestsByWeek(this.tests);
      /* Let preCacheData() know we're done */
      this.loadingFinishedTests.next(true);
      // this.loadingFinishedTests.complete();
    }, (error) => {
      this.handleErr(error);
      /* Let preCacheData() know we're done */
      this.loadingFinishedTests.next(true);
      // this.loadingFinishedTests.complete();
    });
  }

  getMonday(timestamp: number): Date {
    /* https://stackoverflow.com/a/4156516 */
    const d = new Date(timestamp);
    const day = d.getDay();
    const diff = d.getDate() - day + (day === 0 ? -6 : 1); // adjust when day is sunday
    return new Date(d.setDate(diff));
  }

  private groupTestsByWeek(obj) {
    const objPeriod = [];
    const oneDay = 24 * 60 * 60 * 1000; // hours * minutes * seconds * milliseconds
    const existingWeeks = [];
    /* Main loop */
    for (let i = 0; i < obj.length; i++) {
      /* Get the date of the test */
      const d = this.getMonday(obj[i].date * 1000);
      /* Get the week from that */
      const indx = Math.floor(d.getTime() / (oneDay * 7));
      /* Check if this week exists in objPeriod */
      if (!existingWeeks.includes(indx)) {
        /* If it does not, create it */
        existingWeeks.push(indx);
        /* Init empty object in objPeriod list */
        objPeriod.push({week: indx, items: []});
      }
      /* Map week to object index in objPeriod list */
      const currentIndex = existingWeeks.indexOf(indx);
      /* Push it to that object's items list */
      objPeriod[currentIndex].items.push(obj[i]);
    }
    for (let i = 0; i < objPeriod.length; i++) {
      let currentTestCounter = 0;
      objPeriod[i].items.forEach((exam) => {
        if (exam.current) {
          currentTestCounter += 1;
        }
      });
      objPeriod[i].currentTests = currentTestCounter;
    }
    return objPeriod;
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
    this.http.get(
      this.settings.apiServer + '/api/user/' + this.authServ.token + '/classes/' + classId + '/absences',
      {},
      this.httpHeader
    ).then((response) => {
      this.absences = JSON.parse(response.data);
      /* Let preCacheData() know we're done */
      this.loadingFinishedAbsences.next(true);
      // this.loadingFinishedAbsences.complete();
    }, (error) => {
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
