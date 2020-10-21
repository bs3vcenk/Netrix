import { Component } from '@angular/core';
import { trigger, state, style, animate, transition } from '@angular/animations';
import { ApiService } from '../services/api.service';
import { TranslateService } from '@ngx-translate/core';

@Component({
  selector: 'app-tab2',
  templateUrl: 'tab2.page.html',
  styleUrls: ['tab2.page.scss'],
  animations: [
    trigger('fadeInOut', [
      state('void', style({ opacity: '0' })),
      state('*', style({ opacity: '1' })),
      transition('void <=> *', animate('150ms ease-in'))
    ])
  ]
})
export class Tab2Page {

  tests = null;
  showAllPreference = false;
  oneWeek = 7 * 24 * 60 * 60 * 1000; // ms
  oneDay = 24 * 60 * 60 * 1000; // ms
  currentDate = Date.now();

  dayShorthand = this.translate.instant('shorthand.day');
  weekShorthand = this.translate.instant('shorthand.week');
  monthShorthand = this.translate.instant('shorthand.month');

  constructor(
    private apiSvc: ApiService,
    private translate: TranslateService
  ) {
    this.apiSvc.loadingFinishedTests.subscribe((val) => {
      if (val) {
        this.initInBg();
      }
    });
  }

  initInBg() {
    this.tests = this.apiSvc.tests;
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
