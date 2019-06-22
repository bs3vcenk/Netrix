import { Component, NgZone } from '@angular/core';
import { ToastController, NavController } from '@ionic/angular';
import { HttpClient } from '@angular/common/http';
import { AuthenticationService } from '../authentication.service';

@Component({
  selector: 'app-tab1',
  templateUrl: 'tab1.page.html',
  styleUrls: ['tab1.page.scss']
})
export class Tab1Page {

  subjects: any;
  zone: any;

  constructor(private toastCtrl: ToastController, public navCtrl: NavController, private http: HttpClient, private authServ: AuthenticationService) {

    this.zone = new NgZone({enableLongStackTrace: false});

    this.getSubjects();    

  }

  getSubjects() {
    this.http.get<any>(this.authServ.API_SERVER + '/api/user/' + this.authServ.token + '/classes/0/subjects').subscribe((response) => {
      let allsubs = response.subjects;
      allsubs.forEach((subj) => {
        let profs = subj.professors;
        subj.professors = profs.join(", ");
      })
      this.subjects = allsubs;
    });
  }

  /*async switchToSubject(){
  	const animationsOptions = {
      animation: 'ios-transition',
      duration: 1000
    }

    //this.navCtrl.push(subjOverview, {}, animationsOptions);
  }*/
}
