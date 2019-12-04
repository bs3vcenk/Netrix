import { Injectable } from '@angular/core';
import { SettingsService } from './settings.service';
import { AuthenticationService } from './authentication.service';
import { BehaviorSubject } from 'rxjs';
import { HTTP, HTTPResponse } from '@ionic-native/http/ngx';
import { Platform } from '@ionic/angular';
import { Storage } from '@ionic/storage';

export interface SubjectData {
  name: string;
  grades: any[];
  notes: any[];
  average: 0.00;
  professors: string;
  id: 0;
}

interface CachedObject {
  date: number;
  data: any;
}

@Injectable({
  providedIn: 'root'
})
export class ApiService {

  httpHeader = {
    'Content-Type': 'application/json',
    'User-Agent': 'Netrix'
  };

  usingCachedContent = false;

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
    private plt: Platform,
    private storage: Storage
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

  async clearCache() {
    /* Remove all key-value pairs that are part of the cache. */
    await this.storage.forEach((val, keyId) => {
      if (keyId.startsWith('cache:')) {
        console.log('ApiService/clearCache(): Deleting ' + keyId);
        this.storage.remove(keyId);
      }
    });
  }

  private async fetchFromCache(classId: number, token: string, dataType: 'subjects' | 'tests' | 'absences' | 'info') {
    /* Fetch an object from the cache. Will set `usingCachedContent` to `true` if called. */
    const accessId = 'cache:' + token + ':' + classId + ':' + dataType; // ex. 'cache:a1b2c3...:0:subjects'
    const result: CachedObject = await this.storage.get(accessId);
    if (result === null) {
      return null;
    }
    if (this.usingCachedContent === false) {
      this.usingCachedContent = true;
    }
    return result.data;
  }

  private async storeInCache(classId: number, token: string, dataType: 'subjects' | 'tests' | 'absences' | 'info', data: any) {
    /* Put an object into the cache. */
    const accessId = 'cache:' + token + ':' + classId + ':' + dataType; // ex. 'cache:a1b2c3...:0:subjects'
    const date = Date.now();
    const cObject: CachedObject = {
      date,
      data
    };
    try {
      await this.storage.set(accessId, cObject);
    } catch (e) {
      if (e.code === 22) {
        // TODO: Handle this
        console.warn('ApiService/storeInCache(): Failed to store data in cache, no space. Handling TBD.');
      } else {
        console.warn('ApiService/storeInCache(): Failed to store data in cache, some other error. Sending to handler.');
        throw e;
      }
    }
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
      console.warn('ApiService/getClasses(): Request failed, but not calling handleErr');
      console.log(error);
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
      console.warn('ApiService/saveFirebaseToken(): Request failed, but not calling handleErr');
      console.log(error);
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

  async getUserInfo(classId: number) {
    /* Get information about user */
    let response: HTTPResponse;
    let info;
    let fetchedFromCache = false;
    try {
      response = await this.http.get(
        this.settings.apiServer + '/api/user/' + this.authServ.token + '/classes/' + classId + '/info',
        {},
        this.httpHeader
      );
      info = JSON.parse(response.data);
    } catch (error) {
      const cachedResponse = await this.fetchFromCache(classId, this.authServ.token, 'info');
      if (cachedResponse !== null) {
        fetchedFromCache = true;
        info = cachedResponse;
      } else {
        console.warn('ApiService/getUserInfo(): No cached data');
        this.handleErr(error);
      }
      this.loadingFinishedInfo.next(true);
    }
    this.info = info;
    if (!fetchedFromCache) {
      this.storeInCache(classId, this.authServ.token, 'info', info);
    }
    this.loadingFinishedInfo.next(true);
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
      console.warn('ApiService/getNotifConfig(): Request failed, but not calling handleErr');
      console.log(error);
      /* Let preCacheData() know we're done */
      this.loadingFinishedNotif.next(true);
      // this.loadingFinishedNotif.complete();
    });
  }

  async getSubjects(classId: number) {
    /* Get a stripped list of all subjects (alldata=0), containing no grades or notes */
    let rx: HTTPResponse;
    let response;
    let fetchedFromCache = false;
    try {
      rx = await this.http.get(
        this.settings.apiServer + '/api/user/' + this.authServ.token + '/classes/' + classId + '/subjects',
        {},
        this.httpHeader
      );
      response = JSON.parse(rx.data);
    } catch (error) {
      const cachedResponse = await this.fetchFromCache(classId, this.authServ.token, 'subjects');
      if (cachedResponse !== null) {
        fetchedFromCache = true;
        response = cachedResponse;
      } else {
        console.warn('ApiService/getSubjects(): No cached data');
        this.handleErr(error);
        return;
      }
    }
    if (!fetchedFromCache) {
      this.storeInCache(classId, this.authServ.token, 'subjects', response);
    }
    const allsubs = response.subjects;
    // Iterate over professors list and join it into a comma-separated string
    allsubs.forEach((subj) => {
      const processed = this.processSubjectData(subj);
      this.subjCacheMap[processed.id] = processed;
      // subj.professors = subj.professors.join(', ');
    });
    // Set for display
    this.subjects = allsubs;
    this.fullAvg = response.class_avg;
    /* Let preCacheData() know we're done */
    this.loadingFinishedSubj.next(true);
  }

  async getTests(classId: number) {
    let rx: HTTPResponse;
    let response;
    let fetchedFromCache = false;
    try {
      rx = await this.http.get(
        this.settings.apiServer + '/api/user/' + this.authServ.token + '/classes/' + classId + '/tests',
        {},
        this.httpHeader
      );
      response = JSON.parse(rx.data);
    } catch (error) {
      const cachedResponse = await this.fetchFromCache(classId, this.authServ.token, 'tests');
      if (cachedResponse !== null) {
        fetchedFromCache = true;
        response = cachedResponse;
      } else {
        console.warn('ApiService/getTests(): No cached data');
        this.handleErr(error);
        return;
      }
    }
    this.tests = response.tests;
    /* Count the number of "current" tests, so that we know if we need to show the
     * "No tests" message or not */
    this.countTests();
    /* Sort tests by week */
    this.tests = this.groupTestsByWeek(this.tests);
    if (!fetchedFromCache) {
      this.storeInCache(classId, this.authServ.token, 'tests', response);
    }
    /* Let preCacheData() know we're done */
    this.loadingFinishedTests.next(true);
  }

  getTestsForSubject(subjectName: string) {
    // tslint:disable-next-line: prefer-const
    let matchingTests = [];
    for (const test of this.currentTests) {
      if (test.subject === subjectName) {
        matchingTests.push(test);
      }
    }
    return matchingTests;
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
    for (const test of obj) {
      /* Get the date of the test */
      const d = this.getMonday(test.date * 1000);
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
      objPeriod[currentIndex].items.push(test);
    }
    for (const group of objPeriod) {
      let currentTestCounter = 0;
      group.items.forEach((exam) => {
        if (exam.current) {
          currentTestCounter += 1;
        }
      });
      group.currentTests = currentTestCounter;
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

  async getAbsences(classId: number) {
    /* Get a list of absences, both an overview and a detailed list */
    let response: HTTPResponse;
    let absences;
    let fetchedFromCache = false;
    try {
      response = await this.http.get(
        this.settings.apiServer + '/api/user/' + this.authServ.token + '/classes/' + classId + '/absences',
        {},
        this.httpHeader
      );
      absences = JSON.parse(response.data);
    } catch (error) {
      const cachedResponse = await this.fetchFromCache(classId, this.authServ.token, 'absences');
      if (cachedResponse !== null) {
        fetchedFromCache = true;
        absences = cachedResponse;
      } else {
        console.warn('ApiService/getAbsences(): No cached data');
        this.handleErr(error);
        return;
      }
    }
    this.absences = absences;
    if (!fetchedFromCache) {
      this.storeInCache(classId, this.authServ.token, 'absences', absences);
    }
    /* Let preCacheData() know we're done */
    this.loadingFinishedAbsences.next(true);
  }

  private processSubjectData(subjObject): SubjectData {
    /* Turns a subjObject (dict/JSON containing information about a subject) into
     * a SubjectData object */
    let subjGrades = [];
    let subjAvg;
    let subjNotes = [];
    const subjName = subjObject.subject;
    const subjProfs = subjObject.professors;
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

  async getSubject(subjId: string, classId: number) {
    /* Check if we have the subject ID cached already */
    if (this.subjCacheMap[subjId]) {
      /* If we do, return the cached object */
      console.log('ApiService/getSubject(): Have subject ID ' + subjId + ' cached, returning that');
      return this.subjCacheMap[subjId];
    } else {
      /* If we don't, fetch the data from the server, process it, and store it
       * into the cache */
      console.log('ApiService/getSubject(): Subject ID ' + subjId + ' not cached, fetching remote');
      const rx = await this.http.get(
        this.settings.apiServer + '/api/user/' + this.authServ.token + '/classes/' + classId + '/subjects/' + subjId,
        {},
        this.httpHeader
      );
      const response = JSON.parse(rx.data);
      const subject = this.processSubjectData(response);
      this.subjCacheMap[subjId] = subject;
      return subject;
    }
  }
}
