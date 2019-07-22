import { Component, OnInit } from '@angular/core';
import { trigger, state, style, animate, transition } from '@angular/animations';
import { ApiService } from '../api.service';
import { Firebase } from '@ionic-native/firebase/ngx';

@Component({
  selector: 'app-absences',
  templateUrl: './absences.page.html',
  styleUrls: ['./absences.page.scss'],
  animations: [
    trigger('fadeInOut', [
      state('void', style({ opacity: '0' })),
      state('*', style({ opacity: '1' })),
      transition('void <=> *', animate('150ms ease-in'))
    ])
  ]
})
export class AbsencesPage implements OnInit {

  absences = {full: [{date: null, absences: [{subject: null}]}]};

  constructor(
    private apiSvc: ApiService,
    private firebase: Firebase
  ) {
    try { this.firebase.setScreenName('AbsencesDetailed'); } catch (e) {}
  }

  ngOnInit() {
    this.absences = this.apiSvc.absences;
  }

}
