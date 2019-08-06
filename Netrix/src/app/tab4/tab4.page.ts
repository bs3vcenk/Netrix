import { Component, ViewChild, ElementRef, OnInit } from '@angular/core';
import { TranslateService } from '@ngx-translate/core';
import { trigger, state, style, animate, transition } from '@angular/animations';
import { Chart, ChartConfiguration } from 'chart.js/dist/Chart.js';
import { ApiService } from '../services/api.service';
import { FirebaseX } from '@ionic-native/firebase-x/ngx';

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
export class Tab4Page implements OnInit {
  @ViewChild('absenceCanvas') absenceCanvas: ElementRef;

  absences = {overview: {justified: 0, unjustified: 0, waiting: 0, sum: 1}};

  private absenceChart: Chart;

  constructor(
    private translate: TranslateService,
    private apiSvc: ApiService,
    private firebase: FirebaseX
  ) {
    if (this.apiSvc.absences === null) {
      this.apiSvc.getAbsences();
    }
    this.absences = this.apiSvc.absences;
  }

  ngOnInit() {
    this.initPlugins();
  }

  ionViewDidEnter() {
    try { this.firebase.setScreenName('Absences'); } catch (e) {}
    this.initGraph();
  }

  initPlugins() {
    Chart.pluginService.register({
      // tslint:disable-next-line: variable-name
      beforeDraw: (_chart) => {
        const chart: any = _chart;
        // Get ctx from string
        const ctx = chart.chart.ctx;

        // Get options from the center object in options
        const elements: any = chart.config.options.elements;
        const centerConfig = elements.center;
        const fontStyle = centerConfig.fontStyle || 'Arial';
        const txt = centerConfig.text;
        const color = centerConfig.color || '#000';
        const sidePadding = centerConfig.sidePadding || 20;
        const sidePaddingCalculated = (sidePadding / 100) * (chart.innerRadius * 2);
        // Start with a base font of 30px
        ctx.font = '30px ' + fontStyle;

        // Get the width of the string and also the width of the element minus 10 to give it 5px side padding
        const stringWidth = ctx.measureText(txt).width;
        const elementWidth = (chart.innerRadius * 2) - sidePaddingCalculated;

        // Find out how much the font can grow in width.
        const widthRatio = elementWidth / stringWidth;
        const newFontSize = Math.floor(30 * widthRatio);
        const elementHeight = (chart.innerRadius * 2);

        // Pick a new font size so it will not be larger than the height of label.
        const fontSizeToUse = Math.min(newFontSize, elementHeight);

        // Set font settings to draw it correctly.
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        const centerX = ((chart.chartArea.left + chart.chartArea.right) / 2);
        const centerY = ((chart.chartArea.top + chart.chartArea.bottom) / 2);
        ctx.font = fontSizeToUse + 'px ' + fontStyle;
        ctx.fillStyle = color;

        // Draw text in center
        ctx.fillText(txt, centerX, centerY);
      }
    });
  }

  initGraph() {
    this.absenceChart = new Chart(this.absenceCanvas.nativeElement, {
    type: 'doughnut',
    data: {
      labels: [
        this.translate.instant('tab4.text.justified'),
        this.translate.instant('tab4.text.unjustified'),
        this.translate.instant('tab4.text.waiting')
      ],
      datasets: [
        {
          label: '# of classes',
          data: [this.absences.overview.justified, this.absences.overview.unjustified, this.absences.overview.waiting],
          backgroundColor: ['#5C6BC0', '#F44336', '#FFCE56']
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
}
