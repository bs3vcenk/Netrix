import { Component, ViewChild, ElementRef } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { AuthenticationService } from '../authentication.service'
import { TranslateService } from '@ngx-translate/core';
import { ToastController } from '@ionic/angular';
import { trigger, state, style, animate, transition } from "@angular/animations";
import { timeout } from 'rxjs/operators';
import { SettingsService } from '../settings.service';
import { Chart } from 'chart.js';

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
  @ViewChild("absenceCanvas") absenceCanvas: ElementRef;

  absences = null;

  private absenceChart: Chart;

  constructor(
    private translate: TranslateService,
    private toastCtrl: ToastController,
    private http: HttpClient,
    private authServ: AuthenticationService,
    private settings: SettingsService
  ) {
    this.collectStudentData();
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

  initGraph() {
    this.absenceChart = new Chart(this.absenceCanvas.nativeElement, {
    type: "doughnut",
    data: {
      labels: ["Justified", "Unjustified", "Waiting"],
      datasets: [
        {
          label: "# of classes",
          data: [this.absences.overview.justified, this.absences.overview.unjustified, this.absences.overview.waiting],
          backgroundColor: ["#FF6384", "#36A2EB", "#FFCE56"]
          //hoverBackgroundColor: ["#FF6384", "#36A2EB", "#FFCE56", "#FF6384", "#36A2EB", "#FFCE56"]
        }
      ]
    }
    });
  }

  collectStudentData() {
    this.http.get<any>(this.settings.apiServer + '/api/user/' + this.authServ.token + '/classes/0/absences').pipe(timeout(3000)).subscribe((response) => {
      this.absences = response;
      this.initGraph();
    }, (error) => {
      if (error.error.error === "E_TOKEN_NONEXISTENT") {
        // User is not authenticated (possibly token purged from server DB)
        this.toastError(this.translate.instant("generic.alert.expiry"), null, 2500);
        this.authServ.logout();
      } else if (error.error.error === "E_DATABASE_CONNECTION_FAILED") {
        // Server-side issue
        this.toastError(this.translate.instant("generic.alert.database"), null, 2500);
        throw new Error('Database connection failed');
      } else {
        // No network on client
        //this.networkError(this.translate.instant("generic.alert.network.header"), this.translate.instant("generic.alert.network.content"));
        this.toastError(this.translate.instant("generic.alert.network"), [{text: 'Reload', handler: () => {this.collectStudentData()}}], null)
        throw new Error('Network error');
      }
    })
  }

}
