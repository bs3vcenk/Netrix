import { Component, OnInit, ViewChild, ElementRef } from '@angular/core';
import { Chart } from 'chart.js';
import { ApiService } from '../services/api.service';

/* School year starts in September */
const SCHOOL_MONTH_ORDER = [9, 10, 11, 12, 1, 2, 3, 4, 5, 6, 7, 8];

@Component({
  selector: 'app-tab4',
  templateUrl: './tab4.page.html',
  styleUrls: ['./tab4.page.scss'],
})
export class Tab4Page implements OnInit {

  // This will be used as a reference to how the data will look like when fetched from
  // the server.
  exampleGraphResponse: Array<any> = JSON.parse(
    '[{"average":3.87,"month":1},{"average":3.8,"month":2},{"average":3.8,"month":3},{"average":3.73,"month":4},{"average":3.87,"month":5},{"average":4.0,"month":6},{"average":4.2,"month":9},{"average":3.6,"month":10},{"average":3.87,"month":11}]'
  );
  exampleGradeHistoryResponse: Array<any> = JSON.parse(
    '[{"date":1560376800,"grade":4,"note":"Klima  - manje greske","subject_id":7},{"date":1560376800,"grade":5,"note":"Povezivanje gradiva","subject_id":7},{"date":1560290400,"grade":1,"note":"voc/ nema rje\u010dnik","subject_id":3},{"date":1560290400,"grade":5,"note":"U\u010denik ponekad sudjeluje prilikom obrade postavljaju\u0107i proaktivna pitanja. Ima razvijeno matemati\u010dko i logi\u010dko razmi\u0161ljanje ali zbog manjka samostalnog rada ostvaruje rezultate ispod svojih mogu\u0107nosti. Uz sistemati\u010dni i kontinuirani samostalni rad, sl. nastavne godine bi mogao bez problema ostvariti puno bolji uspjeh.","subject_id":8},{"date":1560204000,"grade":5,"note":"Zu Hause","subject_id":2},{"date":1560204000,"grade":4,"note":"Servi dominique/ odre\u0111uje strukt re\u010d,pogre\u0161ke u nekim tvorb.","subject_id":3},{"date":1560204000,"grade":4,"note":"komparac pridjeva,acrior dolor, habeo 2- pregled glag oblika/ usvojio gram kateg,pogre\u0161ke u nekim slu\u017eb.","subject_id":3},{"date":1560204000,"grade":5,"note":"Koncerti 2. polugodi\u0161te","subject_id":4},{"date":1560117600,"grade":5,"note":"Objektsatz","subject_id":2},{"date":1559858400,"grade":5,"note":"Osvrt","subject_id":5},{"date":1559772000,"grade":5,"note":"Projektni zadatak Ban Josip Jela\u010di\u0107  HTML, CSS, Trello - timski rad i kreativno rje\u0161avanje problema","subject_id":12},{"date":1559599200,"grade":3,"note":"Klima - povrsno","subject_id":7},{"date":1559599200,"grade":4,"note":"Povezivanje gradiva","subject_id":7},{"date":1559512800,"grade":5,"note":"- prosudbene vje\u0161tine","subject_id":14},{"date":1559512800,"grade":5,"note":"- eti\u010dki kriteriji \u010dovjekova pona\u0161anja","subject_id":14},{"date":1559253600,"grade":5,"note":"Vje\u017eba redovito","subject_id":13},{"date":1559080800,"grade":5,"note":"Karta","subject_id":7}]'
  );

  // Chart configuration
  @ViewChild('gradeHistoryGraph', {static: true}) gradeHistoryGraph: ElementRef;
  @ViewChild('gradeAmountGraph', {static: true}) gradeAmountGraph: ElementRef;
  private gradehistChart: Chart;
  private gradeamntChart: Chart;
  // -- Chart data
  chartLabels: Array<string> = [];
  chartDataset: Array<number> = [];
  gradeAmountLabels: Array<string> = [];
  gradeAmountDataset: Array<number> = [];

  // Other data
  fullAverage: number;
  recentTests: Array<any>;

  constructor(
    private api: ApiService
  ) { }

  ngOnInit() {
    this.createGradeHistoryChart();
    this.createGradeAmountChart();
    this.api.loadingFinishedSubj.subscribe(() => {
      this.formatGraphResponse();
      this.formatGradeCountResponse();
      this.setupAverage();
    });
  }

  /* Format server graph response into separate labels and dataset arrays */
  private formatGraphResponse() {
    // Sorting from https://stackoverflow.com/a/16221350
    const orderedList = this.exampleGraphResponse.sort((a, b) => {
      return SCHOOL_MONTH_ORDER.indexOf(a.month) - SCHOOL_MONTH_ORDER.indexOf(b.month);
    });
    orderedList.forEach((gObject) => {
      this.chartLabels.push(gObject.month.toString());
      this.chartDataset.push(gObject.average);
    });
  }

  private formatGradeCountResponse() {
    const dataDict = {};
    this.exampleGradeHistoryResponse.forEach((gObject) => {
      if (!dataDict[gObject.grade.toString()]) {
        dataDict[gObject.grade.toString()] = 1;
      } else {
        dataDict[gObject.grade.toString()] += 1;
      }
    });
    let dictKeys: string[] = Object.keys(dataDict);
    dictKeys = dictKeys.sort().reverse();
    for (const index in dictKeys) {
      if (index) {
        const key = dictKeys[index];
        this.gradeAmountLabels.push(key);
        this.gradeAmountDataset.push(dataDict[key]);
      }
    }
  }

  /* Show current grade average in UI */
  private setupAverage() {
    this.fullAverage = this.api.fullAvg;
  }

  private createGradeAmountChart() {
    const gradientStroke = this.gradeAmountGraph.nativeElement.getContext('2d').createLinearGradient(500, 0, 100, 0);
    gradientStroke.addColorStop(0, '#00d2ff');
    gradientStroke.addColorStop(1, '#3a47d5');
    this.gradeamntChart = new Chart(this.gradeAmountGraph.nativeElement, {
      type: 'horizontalBar',
      data: {
        labels: this.gradeAmountLabels,
        datasets: [{
            backgroundColor: gradientStroke,
            borderColor: gradientStroke,
            data: this.gradeAmountDataset
        }],
      },
      options: {
        legend: {
          display: false,
        },
        tooltips: {
          enabled: false
        },
        scales: {
          xAxes: [{
            gridLines: {
              display: false,
            },
            display: false,
          }],
          yAxes: [{
            gridLines: {
              display: false,
            }
          }]
        }
      }
    });
  }

  private createGradeHistoryChart() {
    // Create blue gradient (from https://blog.vanila.io/chart-js-tutorial-how-to-make-gradient-line-chart-af145e5c92f9)
    const gradientStroke = this.gradeHistoryGraph.nativeElement.getContext('2d').createLinearGradient(500, 0, 100, 0);
    gradientStroke.addColorStop(0, '#00d2ff');
    gradientStroke.addColorStop(1, '#3a47d5');
    // Initialize the grade history chart
    this.gradehistChart = new Chart(this.gradeHistoryGraph.nativeElement, {
      type: 'line', // We want this to be a line chart
      data: {
        labels: this.chartLabels,
        datasets: [ // Only one dataset -- grade average over time
          {
            fill: true,
            data: this.chartDataset,
            borderColor: gradientStroke,
            pointBorderColor: gradientStroke,
            pointBackgroundColor: gradientStroke,
            pointHoverBackgroundColor: gradientStroke,
            pointHoverBorderColor: gradientStroke,
            backgroundColor: gradientStroke,
            pointRadius: 0
          }
        ]
      },
      options: {
        legend: {
          display: false, // Disable the legend
        },
        tooltips: {
          enabled: false, // Disable tooltips on tap
        },
        scales: {
          xAxes: [{
            gridLines: {
              display: false, // Disable grid lines
            }
          }],
          yAxes: [{
            display: false, // Disable entire y axis for now
            gridLines: {
              display: false, // Disable grid lines
            },
            ticks: {
              suggestedMin: 3,
              maxTicksLimit: 6
            },
          }]
        }
      }
    });
  }

}
