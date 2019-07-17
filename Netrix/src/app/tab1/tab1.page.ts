import { Component, NgZone } from '@angular/core';
import { ToastController, NavController, AlertController, Platform } from '@ionic/angular';
import { HttpClient } from '@angular/common/http';
import { AuthenticationService } from '../authentication.service';
import { TranslateService } from '@ngx-translate/core';
import { timeout } from 'rxjs/operators';
import { SettingsService } from '../settings.service';
import { trigger, state, style, animate, transition } from "@angular/animations";
import { AdmobService } from '../admob.service';

@Component({
  selector: 'app-tab1',
  templateUrl: 'tab1.page.html',
  styleUrls: ['tab1.page.scss'],
  animations: [
    trigger('fadeInOut', [
      state('void', style({ opacity: '0' })),
      state('*', style({ opacity: '1' })),
      transition('void <=> *', animate('150ms ease-in'))
    ])
  ]
})
export class Tab1Page {

  subjects: any;
  zone: any;
  subjsLoaded = false;
  noItemsLoaded = false;
  dbError = false;

  constructor(
    private translate: TranslateService,
    private toastCtrl: ToastController,
    private navCtrl: NavController,
    private http: HttpClient,
    private authServ: AuthenticationService,
    private alertControl: AlertController,
    private platform: Platform,
    private settings: SettingsService,
    private admobSvc: AdmobService
  ) {
    this.getSubjects();
  }

  ngOnInit() {
    this.admobSvc.showBanner();
    this.platform.backButton.subscribe(() => {});
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
    this.http.get<any>(this.settings.apiServer + '/api/user/' + this.authServ.token + '/classes/0/subjects').pipe(timeout(this.settings.httpLimit)).subscribe((response) => {
      let allsubs = response.subjects;
      this.subjsLoaded = true;
      // Iterate over professors list and join it into a comma-separated string
      allsubs.forEach((subj) => {
        let profs = subj.professors;
        let profsC = null;
        if (profs.length > 3) {
          console.log("tab1/getSubjects(): Hit professor limit");
          profsC = profs.slice(0, 3);
          profsC.push(this.translate.instant('tab1.text.other').replace("NUM_PROFS", profs.slice(3,profs.length).length));
        } else {
          profsC = profs;
        }
        subj.professors = profsC.join(", ");
      })
      // Set for display
      this.subjects = allsubs;
      this.noItemsLoaded = false;
      this.dbError = false;
    },
    (error) => {
      this.noItemsLoaded = true;
      if (error.error) {
        console.log(error)
        if (error.error.error === "E_TOKEN_NONEXISTENT") {
          // User is not authenticated (possibly token purged from server DB)
          this.toastError(this.translate.instant("generic.alert.expiry"), null, 2500);
          this.authServ.logout();
        } else if (error.error.error === "E_DATABASE_CONNECTION_FAILED") {
          // Server-side issue
          this.dbError = true;
          throw new Error('Database connection failed');
        } else if (error.status === 0) {
          // Server did not respond
          throw new Error('Server down');
        } else {
          // No network on client
          //this.networkError(this.translate.instant("generic.alert.network.header"), this.translate.instant("generic.alert.network.content"));
          throw new Error('Network error: ' + error);
        }
      } else {
        throw new Error("Network error: " + error);
      }
    });
  }
}
