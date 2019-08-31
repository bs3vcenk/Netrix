import { Component, OnInit } from '@angular/core';
import { ApiService } from '../services/api.service';

@Component({
  selector: 'app-classes',
  templateUrl: './classes.page.html',
  styleUrls: ['./classes.page.scss'],
})
export class ClassesPage implements OnInit {

  classes = null;
  currentClass = null;

  constructor(
    private apiSvc: ApiService
  ) {
    this.classes = this.apiSvc.classes;
    this.currentClass = this.apiSvc.classId.value;
  }

  ngOnInit() {
  }

}
