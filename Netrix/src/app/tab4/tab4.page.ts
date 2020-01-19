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
    '[{"average":3.87,"month":0},{"average":3.87,"month":1},{"average":3.8,"month":2},{"average":3.8,"month":3},{"average":3.73,"month":4},{"average":3.87,"month":5},{"average":4.0,"month":6},{"average":4.2,"month":9},{"average":3.6,"month":10},{"average":3.87,"month":11}]'
  );

  // Chart configuration
  @ViewChild('gradeHistoryGraph', {static: true}) gradeHistoryGraph: ElementRef;
  private gradehistChart: Chart;
  // -- Chart data
  chartLabels: Array<string> = [];
  chartDataset: Array<number> = [];

  // Other data
  fullAverage: number;
  recentTests: Array<any>;

  constructor(
    private api: ApiService
  ) { }

  ngOnInit() {
    this.createGradeHistoryChart();
    this.api.loadingFinishedSubj.subscribe(() => {
      this.formatGraphResponse();
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

  /* Show current grade average in UI */
  private setupAverage() {
    this.fullAverage = this.api.fullAvg;
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
            display: true, // Disable entire y axis for now
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
