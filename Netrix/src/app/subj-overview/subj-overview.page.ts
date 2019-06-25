import { Component, OnInit } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { HttpClient } from '@angular/common/http';
import { AuthenticationService } from '../authentication.service';
import { AlertController, NavController } from '@ionic/angular';
import { TranslateService } from '@ngx-translate/core';

@Component({
  selector: 'app-subj-overview',
  templateUrl: './subj-overview.page.html',
  styleUrls: ['./subj-overview.page.scss'],
})
export class SubjOverviewPage implements OnInit {

  subjId = null;
  subjName = null;
  subjProfs = null;
  subjAvg = null;
  gradeList = null;

  constructor(private translate: TranslateService, private activatedRoute: ActivatedRoute, private http: HttpClient, private authServ: AuthenticationService, public alertControl: AlertController, public navCtrl: NavController) { }

  ngOnInit() {
  	this.subjId = this.activatedRoute.snapshot.paramMap.get("subjid")
    console.log("subjOverview: Getting data for subject ID " + this.subjId)
  	this.getSubjectInfo();
    this.getSubjectGrades();
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

  goBack() {
    this.navCtrl.navigateBack('/tabs/tabs/tab1');
  }

  getSubjectInfo() {
    this.http.get<any>(this.authServ.API_SERVER + '/api/user/' + this.authServ.token + '/classes/0/subjects/' + this.subjId).subscribe((response) => {
    	this.subjName = response.subject;
      console.log("subjOverview/getSubjectInfo(): Subject name: " + this.subjName)
    	this.subjProfs = response.professors.join(", ");
    }, (error) => {
      console.log("subjOverview/getSubjectInfo(): Failed to fetch data from server (" + error.error + ")")
      this.networkError(this.translate.instant("overview.alert.network.header"), this.translate.instant("overview.alert.network.content"))
    });
  }

  getSubjectGrades() {
    this.http.get<any>(this.authServ.API_SERVER + '/api/user/' + this.authServ.token + '/classes/0/subjects/' + this.subjId + '/grades').subscribe((response) => {
      this.subjAvg = response.average;
      this.gradeList = response.grades;
    }, (error) => {
      console.log("subjOverview/getSubjectGrades(): Failed to fetch data from server " + error.error + ")")
      this.networkError(this.translate.instant("overview.alert.nogrades.header"), this.translate.instant("overview.alert.nogrades.content"))
    });
  }

}
