import { Component, NgZone } from '@angular/core';
import { ToastController, NavController } from '@ionic/angular';
import { HttpClient } from '@angular/common/http';

@Component({
  selector: 'app-tab1',
  templateUrl: 'tab1.page.html',
  styleUrls: ['tab1.page.scss']
})
export class Tab1Page {

  subjects: any;
  zone: any;

  constructor(private toastCtrl: ToastController, public navCtrl: NavController, private http: HttpClient) {

    this.zone = new NgZone({enableLongStackTrace: false});

    this.getSubjects();    

  }

  getSubjects() {
    this.http.get<any>('http://192.168.43.96:5000/api/user/6a596325837132fc8cef406789b01d86/classes/0/subjects').subscribe((response) => {
      let allsubs = response.subjects;
      allsubs.forEach((subj) => {
        let profs = subj.professors;
        subj.professors = profs.join(", ");
        console.log(subj.professors);
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
