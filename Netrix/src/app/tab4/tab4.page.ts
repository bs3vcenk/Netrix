import { Component } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { AuthenticationService } from '../authentication.service'
import { trigger, state, style, animate, transition } from "@angular/animations";
import { timeout } from 'rxjs/operators';

@Component({
  selector: 'app-tab4',
  templateUrl: 'tab4.page.html',
  styleUrls: ['tab4.page.scss'],
  animations: [
    trigger('animChange', [
      state('opaque', style({ opacity: 1 })),
      state('transparent', style({ opacity: 0 })),
      transition('transparent => opaque', animate('500ms ease-out'))
    ])
  ]
})
export class Tab4Page {

  student = {"name":null, "birthdate":null, "address":null};
  titleState = "transparent";

  constructor(private http: HttpClient, private authServ: AuthenticationService) {
    this.collectStudentData();
  }

  async collectStudentData() {
    this.http.get<any>(this.authServ.API_SERVER + '/api/user/' + this.authServ.token + '/info').pipe(timeout(3000)).subscribe((response) => {
      this.student = response;
      console.log("tab4/collectStudentData(): Got user info successfully");
      this.titleState = "opaque";
    }, (error) => {
      console.log(error);
    })
  }

}
