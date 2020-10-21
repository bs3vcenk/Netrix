import { Component, OnInit } from '@angular/core';
import { trigger, state, style, animate, transition } from '@angular/animations';
import { ApiService } from '../services/api.service';
import { AdmobService } from '../services/admob.service';
import { FirebaseX } from '@ionic-native/firebase-x/ngx';
import { ModalController, ActionSheetController, AlertController } from '@ionic/angular';
import { ClassesPage } from '../classes/classes.page';
import { GradeHistoryPage } from '../gradehistory/gradehistory.page';
import { TranslateService } from '@ngx-translate/core';
import { Router } from '@angular/router';
import { SettingsPage } from '../settings/settings.page';

@Component({
  selector: 'app-tab1',
  templateUrl: 'tab1.page.html',
  styleUrls: ['tab1.page.scss'],
  animations: [
    trigger('fadeInOut', [
      state('void', style({ opacity: '0' })),
      state('*', style({ opacity: '1' })),
      transition('void <=> *', animate('150ms ease-in'))
    ])
  ]
})
export class Tab1Page implements OnInit {

  subjects = null;
  fullAvg = null;
  tempSubjects: Array<any> = new Array(10);
  testsLen = null;
  remainingTests = null;
  usingCache = null;

  constructor(
    private apiSvc: ApiService,
    private admobSvc: AdmobService,
    private firebase: FirebaseX,
    private modalController: ModalController,
    private alertController: AlertController,
    private actionSheetControl: ActionSheetController,
    private translate: TranslateService,
    private router: Router
  ) {
    this.initInBg();
    this.calculateRemainingTests();
  }

  ngOnInit() {
    this.admobSvc.showBanner();
  }

  calculateRemainingTests() {
    const weekStart = this.apiSvc.getMonday(new Date().getTime());
    const weekID = Math.floor(weekStart.getTime() / (7 * 24 * 60 * 60 * 1000));
    this.apiSvc.loadingFinishedTests.subscribe((isLoaded) => {
      if (isLoaded) {
        this.testsLen = this.apiSvc.tests.length;
        if (this.testsLen > 0) {
          for (const testGroup of this.apiSvc.tests) {
            if (testGroup.week === weekID) {
              this.firebase.logMessage('Tab1Page/calculateRemainingTests(): Found matching test group for week ID ' + weekID);
              this.remainingTests = testGroup.tests;
            }
          }
        }
      } else {
        this.testsLen = null;
        this.remainingTests = null;
      }
    });
  }

  initInBg() {
    this.apiSvc.loadingFinishedSubj.subscribe((isLoaded) => {
      this.fullAvg = this.apiSvc.fullAvg;
      if (this.fullAvg > 0) {
        this.fullAvg = this.fullAvg.toFixed(2);
      }
      this.subjects = this.apiSvc.subjects;
      this.usingCache = this.apiSvc.usingCachedContent;
    });
  }

  async showClassSelectionScreen() {
    const modal = await this.modalController.create({
      component: ClassesPage
    });
    return await modal.present();
  }

  async showGradeHistoryScreen() {
    const modal = await this.modalController.create({
      component: GradeHistoryPage
    });
    return await modal.present();
  }

  async showSettingsScreen() {
    const modal = await this.modalController.create({
      component: SettingsPage
    });
    return await modal.present();
  }

  async showMoreOptions() {
    const actionSheet = await this.actionSheetControl.create({
      header: this.translate.instant('tab1.more.header'),
      buttons: [
        {
          text: this.translate.instant('tab1.more.settings'),
          handler: () => {
            this.showSettingsScreen();
          }
        },
        {
          text: this.translate.instant('tab1.more.classes'),
          handler: () => {
            this.showClassSelectionScreen();
          }
        },
        {
          text: this.translate.instant('tab1.more.close'),
          role: 'cancel'
        }
      ]
    });
    return await actionSheet.present();
  }
}
