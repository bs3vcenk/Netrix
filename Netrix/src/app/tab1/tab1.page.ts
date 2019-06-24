import { Component, NgZone } from '@angular/core';
import { ToastController, NavController, AlertController } from '@ionic/angular';
import { HttpClient } from '@angular/common/http';
import { AuthenticationService } from '../authentication.service';
import { TranslateService } from '@ngx-translate/core';

@Component({
  selector: 'app-tab1',
  templateUrl: 'tab1.page.html',
  styleUrls: ['tab1.page.scss']
})
export class Tab1Page {

  subjects: any;
  zone: any;

  constructor(private translate: TranslateService, private toastCtrl: ToastController, public navCtrl: NavController, private http: HttpClient, private authServ: AuthenticationService, public alertControl: AlertController) {

    //this.zone = new NgZone({enableLongStackTrace: false});

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
    // GET the subject list endpoint on the API server
    this.http.get<any>(this.authServ.API_SERVER + '/api/user/' + this.authServ.token + '/classes/0/subjects').subscribe((response) => {
      let allsubs = response.subjects;
      // Iterate over professors list and join it into a comma-separated string
      allsubs.forEach((subj) => {
        let profs = subj.professors;
        subj.professors = profs.join(", ");
      })
      // Set for display
      this.subjects = allsubs;
    },
    (error) => {
      if (error.error.error === "E_TOKEN_NONEXISTENT") { // lol
        this.networkError(this.translate.instant("tab1.alert.expiry.header"), this.translate.instant("tab1.alert.expiry.content"));
        this.authServ.logout();
      } else {
        this.networkError(this.translate.instant("tab1.alert.network.header"), this.translate.instant("tab1.alert.network.content"))
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
