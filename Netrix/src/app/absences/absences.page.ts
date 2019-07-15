import { Component, OnInit } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { SettingsService } from '../settings.service';
import { AuthenticationService } from '../authentication.service';
import { timeout } from 'rxjs/operators';
import { trigger, state, style, animate, transition } from "@angular/animations";

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

  absences = {"full":[{"date":null,"absences":[{"subject":null}]}]};

  constructor(
    private http: HttpClient,
    private settings: SettingsService,
    private authServ: AuthenticationService
  ) { }

  ngOnInit() {
  }

  ionViewDidEnter() {
    this.getAllAbsences();
  }

  getAllAbsences() {
    this.http.get<any>(this.settings.apiServer + '/api/user/' + this.authServ.token + '/classes/0/absences').pipe(timeout(this.settings.httpLimit)).subscribe((response) => {
      this.absences = response;
      console.log(this.absences);
    }, (error) => {
      console.log(error);
    });
  }

}
