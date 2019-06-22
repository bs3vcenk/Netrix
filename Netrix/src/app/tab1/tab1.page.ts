import { Component, NgZone } from '@angular/core';
import { ToastController, NavController } from '@ionic/angular';
import { HttpClient } from '@angular/common/http';
import { AuthenticationService } from '../authentication.service';
import { AlertController } from '@ionic/angular';

@Component({
  selector: 'app-tab1',
  templateUrl: 'tab1.page.html',
  styleUrls: ['tab1.page.scss']
})
export class Tab1Page {

  subjects: any;
  zone: any;

  constructor(private toastCtrl: ToastController, public navCtrl: NavController, private http: HttpClient, private authServ: AuthenticationService, public alertControl: AlertController) {

    this.zone = new NgZone({enableLongStackTrace: false});

    this.getSubjects();

  }

  async networkError(header, msg) {
    const alert = await this.alertControl.create({
      header: header,
      message: msg,
      buttons: ['OK']
    });

    await alert.present();
  }

  getSubjects() {
    this.http.get<any>(this.authServ.API_SERVER + '/api/user/' + this.authServ.token + '/classes/0/subjects').subscribe((response) => {
      let allsubs = response.subjects;
      allsubs.forEach((subj) => {
        let profs = subj.professors;
        subj.professors = profs.join(", ");
      })
      this.subjects = allsubs;
    },
    (error) => {
      if (error.error.error === "E_TOKEN_NONEXISTENT") { // lol
        this.networkError("Login expired", "Your login has expired. You will need to log in again.");
        this.authServ.logout();
      } else {
        this.networkError("Network error", "There was a network-related problem while trying to fetch data from the server.")
      }
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
