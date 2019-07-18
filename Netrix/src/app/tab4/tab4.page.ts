import { Component, ViewChild, ElementRef } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { AuthenticationService } from '../authentication.service';
import { TranslateService } from '@ngx-translate/core';
import { ToastController } from '@ionic/angular';
import { trigger, state, style, animate, transition } from "@angular/animations";
import { timeout } from 'rxjs/operators';
import { SettingsService } from '../settings.service';
import { Chart, ChartConfiguration, ChartElementsOptions } from 'chart.js';

@Component({
  selector: 'app-tab4',
  templateUrl: 'tab4.page.html',
  styleUrls: ['tab4.page.scss'],
  animations: [
    trigger('fadeInOut', [
      state('void', style({ opacity: '0' })),
      state('*', style({ opacity: '1' })),
      transition('void <=> *', animate('150ms ease-in'))
    ])
  ]
})
export class Tab4Page {
  @ViewChild("absenceCanvas") absenceCanvas: ElementRef;

  absences = {"overview":{"justified":0,"unjustified":0,"waiting":0,"sum":1}};

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
    Chart.pluginService.register({
      beforeDraw: (_chart) => {
        let chart: any = _chart;
        //Get ctx from string
        let ctx = chart.chart.ctx;

        //Get options from the center object in options
        let elements: any = chart.config.options.elements;
        let centerConfig = elements.center;
        let fontStyle = centerConfig.fontStyle || 'Arial';
        let txt = centerConfig.text;
        let color = centerConfig.color || '#000';
        let sidePadding = centerConfig.sidePadding || 20;
        let sidePaddingCalculated = (sidePadding/100) * (chart.innerRadius * 2)
        //Start with a base font of 30px
        ctx.font = "30px " + fontStyle;

        //Get the width of the string and also the width of the element minus 10 to give it 5px side padding
        let stringWidth = ctx.measureText(txt).width;
        let elementWidth = (chart.innerRadius * 2) - sidePaddingCalculated;

        // Find out how much the font can grow in width.
        let widthRatio = elementWidth / stringWidth;
        let newFontSize = Math.floor(30 * widthRatio);
        let elementHeight = (chart.innerRadius * 2);

        // Pick a new font size so it will not be larger than the height of label.
        let fontSizeToUse = Math.min(newFontSize, elementHeight);

        //Set font settings to draw it correctly.
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        let centerX = ((chart.chartArea.left + chart.chartArea.right) / 2);
        let centerY = ((chart.chartArea.top + chart.chartArea.bottom) / 2);
        ctx.font = fontSizeToUse+"px " + fontStyle;
        ctx.fillStyle = color;

        //Draw text in center
        ctx.fillText(txt, centerX, centerY);
      }
    });
    this.absenceChart = new Chart(this.absenceCanvas.nativeElement, {
    type: "doughnut",
    data: {
      labels: [this.translate.instant("tab4.text.justified"), this.translate.instant("tab4.text.unjustified"), this.translate.instant("tab4.text.waiting")],
      datasets: [
        {
          label: "# of classes",
          data: [this.absences.overview.justified, this.absences.overview.unjustified, this.absences.overview.waiting],
          backgroundColor: ["#5C6BC0", "#F44336", "#FFCE56"]
        }
      ]
    },
    options: {
      responsive: true,
      aspectRatio: 1.2,
      elements: {
        center: {
          text: this.absences.overview.sum,
          color: '#5C6BC0', // Default is #000000
          fontStyle: 'San Francisco', // Default is Arial
          sidePadding: 20 // Defualt is 20 (as a percentage)
        }
      }
    } as ChartConfiguration
  });
  }

  collectStudentData() {
    this.http.get<any>(this.settings.apiServer + '/api/user/' + this.authServ.token + '/classes/0/absences').pipe(timeout(this.settings.httpLimit)).subscribe((response) => {
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
