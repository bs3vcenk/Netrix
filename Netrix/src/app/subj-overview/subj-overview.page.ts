import { Component, OnInit } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { HttpClient } from '@angular/common/http';
import { AuthenticationService } from '../authentication.service';
import { AlertController, NavController, ToastController } from '@ionic/angular';
import { TranslateService } from '@ngx-translate/core';
import { trigger, state, style, animate, transition } from "@angular/animations";
import { timeout } from 'rxjs/operators';

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
  ],
})
export class SubjOverviewPage implements OnInit {

  subjId = null;
  subjName = null;
  subjProfs = null;
  subjAvg = null;

  gradeList = null;

  titleState = "transparent";
  gradeState = "transparent";

  constructor(private toastCtrl: ToastController, private translate: TranslateService, private activatedRoute: ActivatedRoute, private http: HttpClient, private authServ: AuthenticationService, public alertControl: AlertController, public navCtrl: NavController) { }

  ngOnInit() {

  }

  ionViewWillEnter() {
    console.log("subjOverview: Getting data for subject ID " + this.subjId)
  	this.getSubjectInfo();
  }

  async networkError(header, msg) {
    const alert = await this.alertControl.create({
      header: header,
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
    this.subjId = this.activatedRoute.snapshot.paramMap.get("subjid");
    this.http.get<any>(this.authServ.API_SERVER + '/api/user/' + this.authServ.token + '/classes/0/subjects/' + this.subjId).pipe(timeout(3000)).subscribe((response) => {
    	this.subjName = response.subject;
      console.log("subjOverview/getSubjectInfo(): Subject name: " + this.subjName)
    	this.subjProfs = response.professors.join(", ");
      this.titleState = "opaque";
      this.getSubjectGrades();
    }, (error) => {
      console.log("subjOverview/getSubjectInfo(): Failed to fetch data from server (" + error.error + ")")
      if (error.error) {
        if (error.error.error === "E_DATABASE_CONNECTION_FAILED") {
          this.networkError(this.translate.instant("generic.alert.database.header"), this.translate.instant("generic.alert.database.content"));
        } else if (error.error.error === "E_TOKEN_NONEXISTENT") {
          this.toastError(this.translate.instant("generic.alert.expiry"), null, 2500);
          this.authServ.logout();
        }
      } else {
        this.toastError(this.translate.instant("generic.alert.network"), [{text: 'Reload', handler: () => {this.getSubjectInfo()}}], null)
      }
    });
  }

  getSubjectGrades() {
    this.http.get<any>(this.authServ.API_SERVER + '/api/user/' + this.authServ.token + '/classes/0/subjects/' + this.subjId + '/grades').pipe(timeout(3000)).subscribe((response) => {
      this.subjAvg = response.average;
      this.gradeList = response.grades;
      this.gradeState = "opaque";
    }, (error) => {
      console.log("subjOverview/getSubjectGrades(): Failed to fetch data from server (" + error.error + ")")
      this.networkError(this.translate.instant("overview.alert.nogrades.header"), this.translate.instant("overview.alert.nogrades.content"))
    });
  }

}
