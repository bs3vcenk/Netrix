import { Component, NgZone } from '@angular/core';
import { ToastController, NavController, AlertController, Platform } from '@ionic/angular';
import { HttpClient } from '@angular/common/http';
import { AuthenticationService } from '../authentication.service';
import { TranslateService } from '@ngx-translate/core';
import { timeout } from 'rxjs/operators';

@Component({
  selector: 'app-tab1',
  templateUrl: 'tab1.page.html',
  styleUrls: ['tab1.page.scss']
})
export class Tab1Page {

  subjects: any;
  zone: any;
  subjsLoaded = false;

  constructor(private translate: TranslateService, private toastCtrl: ToastController, private navCtrl: NavController, private http: HttpClient, private authServ: AuthenticationService, private alertControl: AlertController, private platform: Platform) {

    this.getSubjects();

  }

  ngOnInit() {
    this.platform.backButton.subscribe(() => {});
  }

  async networkError(header, msg) {
    const alert = await this.alertControl.create({
      header: header,
      message: msg,
      buttons: ['OK']
    });

    await alert.present();
  }

  toastError(msg, btns, dur) {
    this.toastCtrl.create({
      message: msg,
      buttons: btns,
      color: 'dark',
      duration: dur
    }).then((toast) => {
      toast.present();
    });
  }

  async getSubjects() {
    // GET the subject list endpoint on the API server
    this.http.get<any>(this.authServ.API_SERVER + '/api/user/' + this.authServ.token + '/classes/0/subjects').pipe(timeout(3000)).subscribe((response) => {
      let allsubs = response.subjects;
      this.subjsLoaded = true;
      // Iterate over professors list and join it into a comma-separated string
      allsubs.forEach((subj) => {
        let profs = subj.professors;
        subj.professors = profs.join(", ");
      })
      // Set for display
      this.subjects = allsubs;
    },
    (error) => {
      if (error.error.error === "E_TOKEN_NONEXISTENT") {
        // User is not authenticated (possibly token purged from server DB)
        this.toastError(this.translate.instant("generic.alert.expiry"), null, 2500);
        this.authServ.logout();
      } else if (error.error.error === "E_DATABASE_CONNECTION_FAILED") {
        // Server-side issue
        this.networkError(this.translate.instant("generic.alert.database.header"), this.translate.instant("generic.alert.database.content"));
      } else {
        // No network on client
        //this.networkError(this.translate.instant("generic.alert.network.header"), this.translate.instant("generic.alert.network.content"));
        this.toastError(this.translate.instant("generic.alert.network"), [{text: 'Reload', handler: () => {this.getSubjects()}}], null)
      }
    });
  }
}
