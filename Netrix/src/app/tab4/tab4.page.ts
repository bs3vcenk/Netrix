import { Component, OnInit, ViewChild, ElementRef } from '@angular/core';
import { Chart } from 'chart.js';
import 'chartjs-plugin-datalabels';
import { ApiService } from '../services/api.service';

/* School year starts in September */
const SCHOOL_MONTH_ORDER = [9, 10, 11, 12, 1, 2, 3, 4, 5, 6, 7, 8];

@Component({
  selector: 'app-tab4',
  templateUrl: './tab4.page.html',
  styleUrls: ['./tab4.page.scss'],
})
export class Tab4Page implements OnInit {

  private averageHistoryData: Array<any>;
  private gradeHistoryData: Array<any>;

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
    Chart.defaults.global.defaultFontFamily = 'Inter';
    this.fetchData().then(() => {
      this.api.loadingFinishedSubj.subscribe(() => {
        this.formatGraphResponse();
        this.formatGradeCountResponse();
        this.setupAverage();
      });
      this.createGradeHistoryChart();
      this.createGradeAmountChart();
    });
  }

  private async fetchData() {
    this.averageHistoryData = await this.api.getGradeHistoryGraph(0);
    console.log('Tab4Page/fetchData(): averageHistoryData');
    this.gradeHistoryData = await this.api.getGradeHistory(0);
    console.log('Tab4Page/fetchData(): gradeHistoryData');
  }

  /* Format server graph response into separate labels and dataset arrays */
  private formatGraphResponse() {
    // Sorting from https://stackoverflow.com/a/16221350
    /* TODO: TEMP FIX */
    this.averageHistoryData.forEach((value, index) => {
      if (value.month === 0) {
        this.averageHistoryData[index].month = 12;
      }
    });
    const orderedList = this.averageHistoryData.sort((a, b) => {
      return SCHOOL_MONTH_ORDER.indexOf(a.month) - SCHOOL_MONTH_ORDER.indexOf(b.month);
    });
    orderedList.forEach((gObject) => {
      this.chartLabels.push(gObject.month.toString());
      this.chartDataset.push(gObject.average);
    });
  }

  private formatGradeCountResponse() {
    const dataDict = {};
    this.gradeHistoryData.forEach((gObject) => {
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
        },
        plugins: {
          datalabels: {
            borderRadius: 4,
            color: 'white',
            font: {
              weight: 700,
              family: 'Inter',
              size: 15
            },
          }
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
            borderColor: '#428cff',
            backgroundColor: '#428cff',
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
        },
        layout: {
          padding: {
            top: 20,
            left: 18,
            right: 18,
          }
        },
        plugins: {
          datalabels: {
            backgroundColor: gradientStroke,
            borderRadius: 2,
            color: 'white',
            font: {
              weight: 'bold',
              family: 'Inter'
            },
          }
        }
      }
    });
  }

}
