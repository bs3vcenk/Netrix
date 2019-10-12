import { Component, OnInit } from '@angular/core';
import { ApiService } from '../services/api.service';
import { FirebaseX } from '@ionic-native/firebase-x/ngx';

@Component({
  selector: 'app-tab3',
  templateUrl: 'tab3.page.html',
  styleUrls: ['tab3.page.scss']
})
export class Tab3Page implements OnInit {

  absences = {overview: {justified: 0, unjustified: 0, waiting: 0, sum: 1}};

  constructor(
    private apiSvc: ApiService,
    private firebase: FirebaseX,
  ) {
    this.apiSvc.loadingFinishedAbsences.subscribe((val) => {
      if (val) {
        this.absences = this.apiSvc.absences;
      }
    });
  }

  convertToReadableDate(unixTimestamp: number): string {
    const date = new Date(unixTimestamp * 1000);
    const day = date.getDay();
    const month = date.getMonth() + 1;
    const year = date.getFullYear();
    return day + '.' + month + '.' + year + '.';
  }

  ngOnInit() {
  }

  ionViewDidEnter() {
    try { this.firebase.setScreenName('Absences'); } catch (e) {}
  }
}
