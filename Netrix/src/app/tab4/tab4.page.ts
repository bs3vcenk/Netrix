import { Component, OnInit, ViewChild, ElementRef } from '@angular/core';
import { Chart } from 'chart.js';
import { ApiService } from '../services/api.service';

@Component({
  selector: 'app-tab4',
  templateUrl: './tab4.page.html',
  styleUrls: ['./tab4.page.scss'],
})
export class Tab4Page implements OnInit {

  // Chart configuration
  @ViewChild('gradeHistoryGraph', {static: true}) gradeHistoryGraph: ElementRef;
  private gradehistChart: Chart;

  // Other data
  fullAverage: number;
  recentTests: Array<any>;

  constructor(
    private api: ApiService
  ) { }

  ngOnInit() {
    this.createGradeHistoryChart();
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
        labels: ['SIJ', 'VELJ', 'OZU', 'TRA', 'SVI', 'LIP', 'KOL'], // Placeholder labels for now
        datasets: [ // Only one dataset -- grade average over time
          {
            fill: true,
            data: [65, 59, 80, 81, 56, 55, 40],
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
          }]
        }
      }
    });
  }

}
