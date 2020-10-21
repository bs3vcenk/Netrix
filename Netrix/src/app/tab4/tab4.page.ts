import { Component, OnInit, ViewChild, ElementRef } from '@angular/core';
import { Chart } from 'chart.js';
import 'chartjs-plugin-datalabels';
import { ApiService } from '../services/api.service';
import { TranslateService } from '@ngx-translate/core';

/* School year starts in September */
const SCHOOL_MONTH_ORDER = [9, 10, 11, 12, 1, 2, 3, 4, 5, 6, 7, 8];

@Component({
  selector: 'app-tab4',
  templateUrl: './tab4.page.html',
  styleUrls: ['./tab4.page.scss'],
})
export class Tab4Page implements OnInit {

  /* -- Exam variables -- */
  tests = null;
  oneWeek = 7 * 24 * 60 * 60 * 1000; // ms
  oneDay = 24 * 60 * 60 * 1000; // ms
  currentDate = Date.now();

  dayShorthand = this.translate.instant('shorthand.day');
  weekShorthand = this.translate.instant('shorthand.week');
  monthShorthand = this.translate.instant('shorthand.month');

  /* -- Graph variables -- */
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
    private api: ApiService,
    private translate: TranslateService
  ) { }

  ngOnInit() {
    Chart.defaults.global.defaultFontFamily = 'Inter';
    this.fetchData().then(() => {
      this.api.loadingFinishedSubj.subscribe(() => {
        this.formatGraphResponse();
        this.formatGradeCountResponse();
        this.setupAverage();
      });
      this.api.loadingFinishedTests.subscribe((val) => {
        if (val) {
          this.initTests();
        }
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

  /* -- Functions for exams -- */

  initTests() {
    this.tests = this.api.tests;
  }

  convertToReadableDate(unixTimestamp: number): string {
    const date = new Date(unixTimestamp * 1000);
    const day = date.getDate();
    const month = date.getMonth() + 1;
    const year = date.getFullYear();
    return day + '.' + month + '.' + year + '.';
  }

  convertToReadableWeekSpan(startingWeekTimestamp: number): string {
    const startUNIXStamp = this.getMonday(startingWeekTimestamp * this.oneWeek).getTime();
    const startWeek = new Date(startUNIXStamp + this.oneWeek);
    const startWeekMonth = startWeek.getMonth() + 1; // Months start from 0 in JS
    const startWeekDay = startWeek.getDate();
    const endWeek = new Date(startWeek.getTime() + (this.oneWeek - this.oneDay));
    const endWeekMonth = endWeek.getMonth() + 1;
    const endWeekDay = endWeek.getDate();
    return startWeekDay + '.' + startWeekMonth + '. - ' + endWeekDay + '.' + endWeekMonth + '.';
  }

  getMonday(timestamp: number): Date {
    /* From https://stackoverflow.com/a/4156516 */
    const d = new Date(timestamp);
    const day = d.getDay();
    const diff = d.getDate() - day + (day === 0 ? -6 : 1); // adjust when day is sunday
    return new Date(d.setDate(diff));
  }

  calculateRemainingTime(toDate: number): string {
    /* `toDate` is expected to be a standard UNIX timestamp in seconds, but JS deals
     * with milliseconds, so we multiply it by 1000. We then subtract the current date from
     * `toDate` to get the number of milliseconds until the date. Finally, that is converted
     * to days. */
    const numberOfDays = Math.ceil(((toDate * 1000) - this.currentDate) / 1000 / 60 / 60 / 24);
    /* Convert the days to weeks, then round up to the lowest value (floor) since we'll be
     * showing the exact number of days until the date next to the month. */
    const weeks = Math.floor(numberOfDays / 7);
    let formattedString = ''; // We'll update and return this variable
    if (weeks >= 1) { // If there is at least a week until the date, include it in the string and return just that
      formattedString = weeks.toString() + this.weekShorthand;
      const leftoverDays = numberOfDays - (weeks * 7);
      if (leftoverDays >= 1) { // If there are not enough days to fill the week, show them too
        formattedString += ' ' + leftoverDays.toString() + this.dayShorthand;
      }
    } else { // If there isn't at least a week left, we can handle 2 cases
      if (numberOfDays === 0) { // The date is today; in that case return the translated string for 'today'
        formattedString = this.translate.instant('tab2.today');
      } else { // There are some days left, but less than a month; just return the number of days
        formattedString = numberOfDays.toString() + this.dayShorthand;
      }
    }
    return formattedString;
  }

}
