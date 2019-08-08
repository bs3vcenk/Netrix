import { Component, OnInit } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { AuthenticationService } from '../services/authentication.service';
import { AlertController, NavController, ToastController } from '@ionic/angular';
import { TranslateService } from '@ngx-translate/core';
import { FirebaseX } from '@ionic-native/firebase-x/ngx';
import { ApiService } from '../services/api.service';

@Component({
  selector: 'app-subj-overview',
  templateUrl: './subj-overview.page.html',
  styleUrls: ['./subj-overview.page.scss']
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
  ) {}

  ngOnInit() {
    try { this.firebase.setScreenName('SubjOverview'); } catch (e) {}
    const subjId = this.activatedRoute.snapshot.paramMap.get('subjid');
    this.getSubjectInfo(subjId);
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
      if (thing.notes.length === 0 && thing.grades.length === 0) {
        this.alertError(
          this.translate.instant('overview.alert.nogrades.header'),
          this.translate.instant('overview.alert.nogrades.content')
        );
      }
    }, (err) => {
      this.apiSvc.handleErr(err);
    });
  }
}
