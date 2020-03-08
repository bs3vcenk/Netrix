import { Component, OnInit } from '@angular/core';
import { ModalController } from '@ionic/angular';

@Component({
  selector: 'app-gradehistory',
  templateUrl: './gradehistory.page.html',
  styleUrls: ['./gradehistory.page.scss'],
})
export class GradeHistoryPage implements OnInit {

  gradeHist = null;

  constructor(
    private modalController: ModalController
  ) { }

  ngOnInit() {
  }

  dismiss() {
    this.modalController.dismiss();
  }

}
