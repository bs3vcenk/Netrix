import { Component, OnInit } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { HttpClient } from '@angular/common/http';
import { AuthenticationService } from '../authentication.service';
import { AlertController, NavController, ToastController } from '@ionic/angular';
import { TranslateService } from '@ngx-translate/core';
import { trigger, state, style, animate, transition } from '@angular/animations';
import { timeout } from 'rxjs/operators';
import { SettingsService } from '../settings.service';
import { Firebase } from '@ionic-native/firebase/ngx';

@Component({
  selector: 'app-subj-overview',
  templateUrl: './subj-overview.page.html',
  styleUrls: ['./subj-overview.page.scss'],
  animations: [
    trigger('animChange', [
      state('opaque', style({ opacity: 1 })),
      state('transparent', style({ opacity: 0 })),
      transition('transparent => opaque', animate('500ms ease-out'))
    ])
  ]
})
export class SubjOverviewPage implements OnInit {

  subjId = null;
  subjName = null;
  subjProfs = null;
  subjAvg = null;

  gradeList = null;
  noteList = null;
  notesAvailable = false;
  gradesAvailable = false;

  gradeState = 'transparent';

  constructor(
    private toastCtrl: ToastController,
    private translate: TranslateService,
    private activatedRoute: ActivatedRoute,
    private http: HttpClient,
    private authServ: AuthenticationService,
    private alertControl: AlertController,
    private navCtrl: NavController,
    private settings: SettingsService,
    private firebase: Firebase
  ) {
    try { this.firebase.setScreenName('SubjOverview'); } catch (e) {}
  }

  ngOnInit() {

  }

  ionViewDidEnter() {
    this.subjId = this.activatedRoute.snapshot.paramMap.get('subjid');
    this.getSubjectInfo();
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

  async getSubjectInfo() {
    this.http.get<any>(this.settings.apiServer + '/api/user/' + this.authServ.token + '/classes/0/subjects/' + this.subjId)
    .pipe(timeout(this.settings.httpLimit))
    .subscribe((response) => {
      this.subjName = response.subject;
      console.log('subjOverview/getSubjectInfo(): Subject name: ' + this.subjName);
      this.subjProfs = response.professors.join(', ');
      if (response.grades) {
        this.subjAvg = response.average;
        this.gradeList = response.grades;
        this.gradesAvailable = true;
      }
      if (response.notes) {
        this.noteList = response.notes;
        this.notesAvailable = true;
      }
      if (this.gradesAvailable === false && this.notesAvailable === false) {
        this.networkError(
          this.translate.instant('overview.alert.nogrades.header'),
          this.translate.instant('overview.alert.nogrades.content')
        );
      } else {
        this.gradeState = 'opaque';
      }
    }, (error) => {
      console.log('subjOverview/getSubjectInfo(): Failed to fetch data from server (' + error.error + ')');
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
