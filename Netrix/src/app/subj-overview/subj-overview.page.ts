import { Component, OnInit } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { HttpClient } from '@angular/common/http';

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

  constructor(private activatedRoute: ActivatedRoute, private http: HttpClient) { }

  ngOnInit() {
  	this.subjId = this.activatedRoute.snapshot.paramMap.get("subjid")
  	this.getSubjectInfo();
    this.getSubjectGrades();
  }

  getSubjectInfo() {
    this.http.get<any>('http://192.168.43.96:5000/api/user/6a596325837132fc8cef406789b01d86/classes/0/subjects/' + this.subjId).subscribe((response) => {
    	this.subjName = response.subject;
    	this.subjProfs = response.professors.join(", ");
    });
  }

  getSubjectGrades() {
    this.http.get<any>('http://192.168.43.96:5000/api/user/6a596325837132fc8cef406789b01d86/classes/0/subjects/' + this.subjId + '/grades').subscribe((response) => {
      this.subjAvg = response.average;
      this.gradeList = response.grades;
    });
  }

}
