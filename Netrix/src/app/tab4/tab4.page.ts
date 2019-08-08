import { Component, OnInit } from '@angular/core';
// import { TranslateService } from '@ngx-translate/core';
import { trigger, state, style, animate, transition } from '@angular/animations';
import { ApiService } from '../services/api.service';
import { FirebaseX } from '@ionic-native/firebase-x/ngx';

@Component({
  selector: 'app-tab4',
  templateUrl: 'tab4.page.html',
  styleUrls: ['tab4.page.scss'],
  animations: [
    trigger('fadeInOut', [
      state('void', style({ opacity: '0' })),
      state('*', style({ opacity: '1' })),
      transition('void <=> *', animate('150ms ease-in'))
    ])
  ]
})
export class Tab4Page implements OnInit {

  absences = {overview: {justified: 0, unjustified: 0, waiting: 0, sum: 1}};

  constructor(
    // private translate: TranslateService,
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
