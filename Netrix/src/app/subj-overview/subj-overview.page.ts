import { Component, OnInit } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { AuthenticationService } from '../authentication.service';
import { AlertController, NavController, ToastController } from '@ionic/angular';
import { TranslateService } from '@ngx-translate/core';
import { trigger, state, style, animate, transition } from '@angular/animations';
import { FirebaseX } from '@ionic-native/firebase-x/ngx';
import { ApiService } from '../api.service';

@Component({
  selector: 'app-subj-overview',
  templateUrl: './subj-overview.page.html',
  styleUrls: ['./subj-overview.page.scss'],
  animations: [
    trigger('fadeInOut', [
      state('void', style({ opacity: '0' })),
      state('*', style({ opacity: '1' })),
      transition('void <=> *', animate('150ms ease-in'))
    ])
  ]
})
export class SubjOverviewPage implements OnInit {

  subjName = null;
  subjProfs = null;
  subjAvg = null;

  gradeList = [];
  noteList = [];

  constructor(
    private toastCtrl: ToastController,
    private translate: TranslateService,
    private activatedRoute: ActivatedRoute,
    private authServ: AuthenticationService,
    private alertControl: AlertController,
    private navCtrl: NavController,
    private firebase: FirebaseX,
    private apiSvc: ApiService
  ) {
    try { this.firebase.setScreenName('SubjOverview'); } catch (e) {}
  }

  ngOnInit() {
    const subjId = this.activatedRoute.snapshot.paramMap.get('subjid');
    this.getSubjectInfo(subjId);
  }

  async networkError(header, msg) {
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

  toastError(msg, btns, dur) {
    this.toastCtrl.create({
      message: msg,
      buttons: btns,
      color: 'dark',
      duration: dur
    }).then((toast) => {
      toast.present();
    });
  }

  goBack() {
    this.navCtrl.navigateBack('/tabs/tabs/tab1');
  }

  async getSubjectInfo(subjId: string) {
    this.apiSvc.getSubject(subjId).then((thing) => {
      this.subjAvg = thing.average;
      this.subjName = thing.name;
      this.noteList = thing.notes;
      this.gradeList = thing.grades;
      this.subjProfs = thing.professors;
    }, (error) => {
      if (error.error.error === 'E_DATABASE_CONNECTION_FAILED') {
        this.toastError(this.translate.instant('generic.alert.database'), null, 2500);
        this.goBack();
      } else if (error.error.error === 'E_TOKEN_NONEXISTENT') {
        this.toastError(this.translate.instant('generic.alert.expiry'), null, 2500);
        this.authServ.logout();
      } else if (!error.error.error) {
        this.toastError(this.translate.instant('generic.alert.network'), null, 2500);
        this.goBack();
      }
    });
  }
}
