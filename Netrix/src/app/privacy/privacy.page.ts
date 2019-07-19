import { Component, OnInit } from '@angular/core';
import showdown from 'showdown/dist/showdown.js';
import { HttpClient } from '@angular/common/http';
import { SettingsService } from '../settings.service';
import { timeout } from 'rxjs/operators';

@Component({
  selector: 'app-privacy',
  templateUrl: './privacy.page.html',
  styleUrls: ['./privacy.page.scss'],
})
export class PrivacyPage implements OnInit {

  html = null;

  constructor(
    private http: HttpClient,
    private settings: SettingsService
  ) { }

  ngOnInit() {
  }

  ionViewDidEnter() {
    this.render();
  }

  private render() {
    this.http.get<any>('https://netrix.io/privacy.md', {responseType: 'text' as 'json'})
    .pipe(timeout(this.settings.httpLimit))
    .subscribe((response) => {
      const converter = new showdown.Converter();
      this.html = converter.makeHtml(response);
    }, (error) => {
      this.html = '<h1>Network error</h1>';
    });
  }

}
