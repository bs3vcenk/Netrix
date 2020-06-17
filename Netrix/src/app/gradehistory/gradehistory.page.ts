import { Component, OnInit } from '@angular/core';
import { ModalController } from '@ionic/angular';
import { ApiService } from '../services/api.service';

@Component({
  selector: 'app-gradehistory',
  templateUrl: './gradehistory.page.html',
  styleUrls: ['./gradehistory.page.scss'],
})
export class GradeHistoryPage implements OnInit {

  gradeHist = null;

  constructor(
    private modalController: ModalController,
    private apiSvc: ApiService
  ) { }

  ngOnInit() {
  }

  ionViewDidEnter() {
    this.initGradeHist();
  }

  async initGradeHist() {
    this.gradeHist = await this.apiSvc.getGradeHistory(this.apiSvc.classId.value);
    console.log(this.gradeHist);
  }

  convertToReadableDate(unixTimestamp: number): string {
    const date = new Date(unixTimestamp * 1000);
    const day = date.getDate();
    const month = date.getMonth() + 1;
    const year = date.getFullYear();
    return day + '.' + month + '.' + year + '.';
  }

  dismiss() {
    this.modalController.dismiss();
  }

}
