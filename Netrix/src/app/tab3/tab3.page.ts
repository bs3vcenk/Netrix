import { Component, OnInit } from '@angular/core';
import { trigger, state, style, animate, transition } from '@angular/animations';
import { ApiService } from '../services/api.service';
import { FirebaseX } from '@ionic-native/firebase-x/ngx';

@Component({
  selector: 'app-tab3',
  templateUrl: 'tab3.page.html',
  styleUrls: ['tab3.page.scss'],
  animations: [
    trigger('fadeInOut', [
      state('void', style({ opacity: '0' })),
      state('*', style({ opacity: '1' })),
      transition('void <=> *', animate('150ms ease-in'))
    ])
  ]
})
export class Tab3Page implements OnInit {

  absences = {overview: {justified: 0, unjustified: 0, waiting: 0, sum: 1}};

  constructor(
    private apiSvc: ApiService,
    private firebase: FirebaseX
  ) {
    if (this.apiSvc.absences === null) {
      this.apiSvc.getAbsences();
    }
    this.absences = this.apiSvc.absences;
  }

  convertToReadableDate(unixTimestamp: number): string {
    const date = new Date(unixTimestamp * 1000);
    return date.toLocaleDateString();
  }

  ngOnInit() {
  }

  ionViewDidEnter() {
    try { this.firebase.setScreenName('Absences'); } catch (e) {}
  }
}
