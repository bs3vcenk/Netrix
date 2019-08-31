import { Component, OnInit } from '@angular/core';
import { ApiService } from '../services/api.service';
import { NavController } from '@ionic/angular';

@Component({
  selector: 'app-classes',
  templateUrl: './classes.page.html',
  styleUrls: ['./classes.page.scss'],
})
export class ClassesPage implements OnInit {

  classes = null;
  currentClass = null;

  constructor(
    private apiSvc: ApiService,
    private navCtrl: NavController
  ) {
    this.classes = this.apiSvc.classes;
    this.currentClass = this.apiSvc.classId.value;
  }

  ngOnInit() {
  }

  switchClass(classId: number) {
    this.apiSvc.switchActiveClass(classId);
    this.navCtrl.navigateBack('/tabs/tabs/tab1');
  }
}
