import { Component, OnInit } from '@angular/core';
import showdown from 'showdown/dist/showdown.js';
import { HTTP } from '@ionic-native/http/ngx';
import { trigger, state, style, animate, transition } from '@angular/animations';

@Component({
  selector: 'app-privacy',
  templateUrl: './privacy.page.html',
  styleUrls: ['./privacy.page.scss'],
  animations: [
    trigger('fadeInOut', [
      state('void', style({ opacity: '0' })),
      state('*', style({ opacity: '1' })),
      transition('void <=> *', animate('150ms ease-in'))
    ])
  ]
})
export class PrivacyPage implements OnInit {

  html = null;

  constructor(
    private http: HTTP
  ) {}

  ngOnInit() {
  }

  ionViewDidEnter() {
    this.render();
  }

  private render() {
    this.http.get('https://netrix.io/privacy.md', {}, {'User-Agent': 'Netrix'})
    .then((response) => {
      const converter = new showdown.Converter();
      this.html = converter.makeHtml(response.data);
    }, (error) => {
      this.html = '<h1>Greška</h1><h2>Server je odgovorio s ' + error.status + '<h2>';
    });
  }

}
