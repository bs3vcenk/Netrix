import { Injectable } from '@angular/core';
import { BehaviorSubject } from 'rxjs';
import { LocalApiService, Grade, Exam, AbsencesOverview, AbsenceSort } from './api-local.service';
import { AuthenticationService } from './authentication.service';
import { Storage } from '@ionic/storage';

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

export interface StorageClass {
  year: string;
  name: string;
  master: string;
  class: string;
  id: number;
  _id: string;
  data: ClassData;
}

export interface ClassData {
  subjects: FullSubject[];
  exams: Exam[];
  absences: { overview: AbsencesOverview; full: AbsenceSort; };
  last_load_time: number;
}

@Injectable({
  providedIn: 'root'
})
export class ApiService {
  examFetchComplete = new BehaviorSubject(false);
  subjFetchComplete = new BehaviorSubject(false);
  absenceOverviewFetchComplete = new BehaviorSubject(false);
  absenceFullFetchComplete = new BehaviorSubject(false);

  perClassData: ClassData[] = [];
  fullAvg = 0;

  constructor(
    private apiSvc: LocalApiService,
    private authSvc: AuthenticationService,
    private storage: Storage
  ) {}

  private fetchAndCompareData(oldData: ClassData) {
    // TODO: Implement
  }

  private verifyData(dataObj: ClassData) {
    const currentTime = (new Date()).getTime();
    if ((currentTime - dataObj.last_load_time) > 45 * 60 * 1000) { // 45 min
      console.log('ApiService/verifyData(): Saved data is older than 45 minutes, fetching...');
      this.fetchAndCompareData(dataObj);
    }
  }

  private saveData(dataObj: ClassData) {
    this.storage.set('userData', dataObj);
  }

  loadData() {
    this.storage.get('userData').then((resx) => {
      if (resx === null) {
        console.log('ApiService/loadData(): No stored data, fetching...');
        this.fetchData(0).then((data) => {
          this.saveData(data);
        });
      } else {
        this.verifyData(resx);
      }
    });
  }

  private async fetchData(classId: number): Promise<ClassData> {
    await this.apiSvc.login(this.authSvc.username, this.authSvc.password);
    const classes = await this.apiSvc.getClasses();
    const subjects = await this.apiSvc.getSubjects(classes[classId]) as FullSubject[];
    subjects.forEach((subject, i) => {
      subjects[i].id = i;
      this.apiSvc.getGrades(subject).then(grades => {
        subjects[i].grades = grades;
      });
      this.apiSvc.getAverage(subject).then(average => {
        subjects[i].average = average;
      });
    });
    const exams = await this.apiSvc.getExams(classes[classId], true) as DisplayableExam[];
    const currentDate = Math.floor(Date.now() / 1000);
    exams.forEach((exam, i) => {
      exams[i].current = currentDate < exam.date;
    });
    const abFull = await this.apiSvc.getAbsencesFull(classes[classId]) as AbsenceSort;
    const abOverview = await this.apiSvc.getAbsencesOverview(classes[classId]) as AbsencesOverview;
    const data: ClassData = {
      subjects,
      exams,
      absences: {
        overview: abOverview,
        full: abFull
      },
      last_load_time: (new Date()).getTime()
    };
    return data;
  }
}
