import { Component, OnInit, ViewChild, ElementRef } from '@angular/core';
import { Chart } from 'chart.js';

@Component({
  selector: 'app-tab4',
  templateUrl: './tab4.page.html',
  styleUrls: ['./tab4.page.scss'],
})
export class Tab4Page implements OnInit {

  @ViewChild('gradeHistoryGraph', {static: true}) gradeHistoryGraph: ElementRef;

  private gradehistChart: Chart;

  constructor() { }

  ngOnInit() {
    const gradientStroke = this.gradeHistoryGraph.nativeElement.getContext('2d').createLinearGradient(500, 0, 100, 0);
    gradientStroke.addColorStop(0, '#00d2ff');
    gradientStroke.addColorStop(1, '#3a47d5');
    this.gradehistChart = new Chart(this.gradeHistoryGraph.nativeElement, {
      type: 'line',
      data: {
        labels: ['SIJ', 'VELJ', 'OZU', 'TRA', 'SVI', 'LIP', 'KOL'],
        datasets: [
          {
            label: 'My First dataset',
            fill: true,
            data: [65, 59, 80, 81, 56, 55, 40],
            borderColor:               gradientStroke,
            pointBorderColor:          gradientStroke,
            pointBackgroundColor:      gradientStroke,
            pointHoverBackgroundColor: gradientStroke,
            pointHoverBorderColor:     gradientStroke,
            backgroundColor:           gradientStroke,
            pointRadius: 0
          }
        ]
      },
      options: {
        legend: {
          display: false,
        },
        tooltips: {
          enabled: false,
        },
        scales: {
          xAxes: [{
            gridLines: {
              display: false,
            }
          }],
          yAxes: [{
            display: false,
          }]
        }
      }
    });
  }

}
