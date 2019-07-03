import { Component } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { AuthenticationService } from '../authentication.service';
import { timeout } from 'rxjs/operators';

@Component({
  selector: 'app-tab2',
  templateUrl: 'tab2.page.html',
  styleUrls: ['tab2.page.scss']
})
export class Tab2Page {

  tests = null;
  showAllPreference = false;
  currentTests = 0;

  async countTests() {
    this.tests.forEach((test) => {
      if (test.current === true) {
        this.currentTests += 1;
      }
    });
  }

  constructor(private authServ: AuthenticationService, private http: HttpClient) {
    this.http.get<any>(this.authServ.API_SERVER + '/api/user/' + this.authServ.token + '/classes/0/tests').pipe(timeout(3000)).subscribe((response) => {
      this.tests = response.tests;
      this.countTests();
    }, (error) => {
      console.log(error);
    })
  }

  ionViewDidLoad() {
  }

}
