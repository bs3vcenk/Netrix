import { Injectable } from '@angular/core';
import { BehaviorSubject } from 'rxjs';
import { LocalApiService, Grade } from './api-local.service';
import { AuthenticationService } from './authentication.service';
import { Storage } from '@ionic/storage';

/*export interface SubjectData {
  name: string;
  grades: any[];
  notes: any[];
  average: 0.00;
  professors: string;
  id: 0;
}*/

export interface FullSubject {
  name: string;
  professors: string[];
  grades: Grade[];
  notes: [];
  average: number;
  _link: string;
  id: number;
}

export interface DisplayableExam {
  subject: string;
  exam: string;
  date: number;
  current: boolean;
}

@Injectable({
  providedIn: 'root'
})
export class ApiService {
  examFetchComplete = new BehaviorSubject(false);
  subjFetchComplete = new BehaviorSubject(false);
  absenceOverviewFetchComplete = new BehaviorSubject(false);
  absenceFullFetchComplete = new BehaviorSubject(false);

  perClassData = [];
  saveData = {data: [], last_load_time: 0};
  fullAvg = 0;

  constructor(
    private apiSvc: LocalApiService,
    private authSvc: AuthenticationService,
    private storage: Storage
  ) {}

  private fetchAndCompareData(oldData) {
    // TODO: Implement
  }

  private verifyData(dataObj) {
    const currentTime = (new Date()).getTime();
    if ((currentTime - dataObj.last_load_time) > 45 * 60 * 1000) { // 45 min
      console.log('ApiService/verifyData(): Saved data is older than 45 minutes, fetching...');
      this.fetchAndCompareData(dataObj);
    }
  }

  loadData() {
    this.storage.get('userData').then((resx) => {
      if (resx === null) {
        console.log('ApiService/loadData(): No stored data, fetching...');
      } else {
        this.verifyData(resx);
      }
    });
  }

  private async fetchData(classId: number) {
    this.apiSvc.login(this.authSvc.username, this.authSvc.password).then(() => {
      this.apiSvc.getClasses().then(classes => {
        classes.forEach(() => {
          this.perClassData.push({});
        });
        this.apiSvc.getSubjects(classes[classId]).then(subjects => {
          const subjectsTemp = subjects as FullSubject[];
          subjectsTemp.forEach((subject, i) => {
            subjectsTemp[i].id = i;
            this.apiSvc.getGrades(subject).then(grades => {
              subjectsTemp[i].grades = grades;
            });
            this.apiSvc.getAverage(subject).then(average => {
              subjectsTemp[i].average = average;
            });
          });
          this.perClassData[classId] = {subjects: subjectsTemp};
          this.subjFetchComplete.next(true);
        }); // getSubjects()
        this.apiSvc.getExams(classes[classId], true).then(exams => {
          const tempExams = exams as DisplayableExam[];
          const currentDate = Math.floor(Date.now() / 1000);
          tempExams.forEach((exam, i) => {
            tempExams[i].current = currentDate < exam.date;
          });
          this.perClassData[classId].exams = tempExams;
          this.examFetchComplete.next(true);
        }); // getExams()
        this.apiSvc.getAbsencesFull(classes[classId]).then(absences => {
          this.perClassData[classId].absences_full = absences;
          this.absenceFullFetchComplete.next(true);
        }); // getAbsencesFull()
        this.apiSvc.getAbsencesOverview(classes[classId]).then(absences => {
          this.perClassData[classId].absences_overview = absences;
          this.absenceOverviewFetchComplete.next(true);
        });
      }); // getClasses()
    }); // login()
  }
}
