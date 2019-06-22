import { Component, OnInit } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { HttpClient } from '@angular/common/http';
import { AuthenticationService } from '../authentication.service';
import { AlertController } from '@ionic/angular';

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

  constructor(private activatedRoute: ActivatedRoute, private http: HttpClient, private authServ: AuthenticationService, public alertControl: AlertController) { }

  ngOnInit() {
  	this.subjId = this.activatedRoute.snapshot.paramMap.get("subjid")
    console.log("subjOverview: Getting data for subjId " + this.subjId)
  	this.getSubjectInfo();
    this.getSubjectGrades();
  }

  async networkError() {
    const alert = await this.alertControl.create({
      header: 'Network error',
      message: 'There was an error while trying to fetch subject info.',
      buttons: ['OK']
    });

    await alert.present();
  }

  getSubjectInfo() {
    this.http.get<any>(this.authServ.API_SERVER + '/api/user/' + this.authServ.token + '/classes/0/subjects/' + this.subjId).subscribe((response) => {
    	this.subjName = response.subject;
      console.log("subjOverview/getSubjectInfo(): Subject name: " + this.subjName)
    	this.subjProfs = response.professors.join(", ");
    }, (error) => {
      this.networkError()
    });
  }

  getSubjectGrades() {
    this.http.get<any>(this.authServ.API_SERVER + '/api/user/' + this.authServ.token + '/classes/0/subjects/' + this.subjId + '/grades').subscribe((response) => {
      this.subjAvg = response.average;
      this.gradeList = response.grades;
    });
  }

}
