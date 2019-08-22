import { Injectable } from '@angular/core';
import { SettingsService } from './settings.service';
import { AuthenticationService } from './authentication.service';
import { TranslateService } from '@ngx-translate/core';
import { FirebaseX } from '@ionic-native/firebase-x/ngx';
import { BehaviorSubject } from 'rxjs';
import { HTTP } from '@ionic-native/http/ngx';
import { Platform } from '@ionic/angular';
import { LocalApiService, Grade } from './api-local.service';

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

@Injectable({
  providedIn: 'root'
})
export class ApiService {
  fetchComplete = new BehaviorSubject(false);

  perClassData = [];
  fullAvg = 0;

  constructor(
    private apiSvc: LocalApiService
  ) {}

  preCacheData(classId: number) {
    this.apiSvc.login('bruno.sevcenko', '').then(() => {
      this.apiSvc.getClasses().then(classes => {
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
          this.fetchComplete.next(true);
        });
      });
    });
  }
}
