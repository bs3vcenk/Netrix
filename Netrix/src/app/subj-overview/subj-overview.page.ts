import { Component, OnInit } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { AlertController, NavController } from '@ionic/angular';
import { TranslateService } from '@ngx-translate/core';
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

  dayShorthand = this.translate.instant('shorthand.day');
  weekShorthand = this.translate.instant('shorthand.week');
  monthShorthand = this.translate.instant('shorthand.month');

  constructor(
    private translate: TranslateService,
    private activatedRoute: ActivatedRoute,
    private alertControl: AlertController,
    private navCtrl: NavController,
    private apiSvc: ApiService
  ) {}

  ngOnInit() {
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
    /* `toDate` is expected to be a standard UNIX timestamp in seconds, but JS deals
     * with milliseconds, so we multiply it by 1000. We then subtract the current date from
     * `toDate` to get the number of milliseconds until the date. Finally, that is converted
     * to days. */
    const numberOfDays = Math.ceil(((toDate * 1000) - this.currentDate) / 1000 / 60 / 60 / 24);
    /* Convert the days to weeks, then round up to the lowest value (floor) since we'll be
     * showing the exact number of days until the date next to the month. */
    const weeks = Math.floor(numberOfDays / 7);
    let formattedString = ''; // We'll update and return this variable
    if (weeks >= 1) { // If there is at least a week until the date, include it in the string and return just that
      formattedString = weeks.toString() + this.weekShorthand;
      const leftoverDays = numberOfDays - (weeks * 7);
      if (leftoverDays >= 1) { // If there are not enough days to fill the week, show them too
        formattedString += ' ' + leftoverDays.toString() + this.dayShorthand;
      }
    } else { // If there isn't at least a week left, we can handle 2 cases
      if (numberOfDays === 0) { // The date is today; in that case return the translated string for 'today'
        formattedString = this.translate.instant('tab2.today');
      } else { // There are some days left, but less than a month; just return the number of days
        formattedString = numberOfDays.toString() + this.dayShorthand;
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
    const subject = await this.apiSvc.getSubject(subjId, this.apiSvc.classId.value);
    this.subject = subject;
  }
}
