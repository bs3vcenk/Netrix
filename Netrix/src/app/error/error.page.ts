import { Component, OnInit } from '@angular/core';
import { ApiService } from '../services/api.service';

@Component({
  selector: 'app-error',
  templateUrl: './error.page.html',
  styleUrls: ['./error.page.scss'],
})
export class ErrorPage implements OnInit {

  dbError = false;
  networkError = false;
  trustError = false;
  maintenanceError = false;

  constructor(
    private apiSvc: ApiService
  ) {
    this.dbError = this.apiSvc.dbError.value;
    this.networkError = this.apiSvc.networkError.value;
    this.trustError = this.apiSvc.trustError.value;
    this.maintenanceError = this.apiSvc.maintenanceError.value;
  }

  ngOnInit() {
  }

}
