import { Component, OnInit } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { AlertController, NavController } from '@ionic/angular';
import { TranslateService } from '@ngx-translate/core';
import { FirebaseX } from '@ionic-native/firebase-x/ngx';
import { ApiService, SubjectData } from '../services/api.service';

@Component({
  selector: 'app-subj-overview',
  templateUrl: './subj-overview.page.html',
  styleUrls: ['./subj-overview.page.scss']
})
export class SubjOverviewPage implements OnInit {

  subject: SubjectData = {
    name: null,
    grades: [],
    notes: [],
    average: 0.00,
    professors: null,
    id: 0
  };
  tests = [];
  currentDate = Date.now();

  constructor(
    private translate: TranslateService,
    private activatedRoute: ActivatedRoute,
    private alertControl: AlertController,
    private navCtrl: NavController,
    private firebase: FirebaseX,
    private apiSvc: ApiService
  ) {}

  ngOnInit() {
    try { this.firebase.setScreenName('SubjOverview'); } catch (e) {}
    const subjId = this.activatedRoute.snapshot.paramMap.get('subjid');
    this.getSubjectInfo(subjId).then(() => {
      this.tests = this.apiSvc.getTestsForSubject(this.subject.name);
      if (this.subject.notes.length === 0 && this.subject.grades.length === 0 && this.tests.length === 0) {
        this.alertError(
          this.translate.instant('overview.alert.nogrades.header'),
          this.translate.instant('overview.alert.nogrades.content')
        );
      }
    });
  }

  calculateRemainingTime(toDate: number): string {
    const numberOfDays = Math.ceil(((toDate * 1000) - this.currentDate) / 1000 / 60 / 60 / 24);
    const months = Math.floor(numberOfDays / 30);
    let formattedString = '';
    if (months >= 1) {
      formattedString = months.toString() + 'm ' + (numberOfDays - (months * 30)).toString() + 'd';
    } else {
      if (numberOfDays === 0) {
        formattedString = this.translate.instant('tab2.today');
      } else {
        formattedString = numberOfDays + 'd';
      }
    }
    return formattedString;
  }

  async alertError(header, msg) {
    const alert = await this.alertControl.create({
      header,
      message: msg,
      buttons: [
        {
          text: 'OK',
          role: 'cancel',
          handler: () => {
            this.goBack();
          }
        }
      ]
    });

    await alert.present();
  }

  goBack() {
    this.navCtrl.navigateBack('/tabs/tabs/tab1');
  }

  convertToReadableDate(unixTimestamp: number): string {
    const date = new Date(unixTimestamp * 1000);
    const day = date.getDate();
    const month = date.getMonth() + 1;
    const year = date.getFullYear();
    return day + '.' + month + '.' + year + '.';
  }

  async getSubjectInfo(subjId: string) {
    const subject = await this.apiSvc.getSubject(subjId, this.apiSvc.classId.value)
    this.subject = subject;
  }
}
