import { Injectable } from '@angular/core';
import { HTTP } from '@ionic-native/http/ngx';
import { SettingsService } from './settings.service';
import { AuthenticationService } from './authentication.service';

@Injectable({
  providedIn: 'root'
})
export class LogService {

  httpHeader = {
    'Content-Type': 'application/json',
    'User-Agent': 'Netrix'
  };

  constructor(
    private http: HTTP,
    private settings: SettingsService,
    private authServ: AuthenticationService
  ) {
    this.http.setDataSerializer('json');
  }

  log(msg: string) {
    this.http.post(
      this.settings.apiServer + '/api/user/' + this.authServ.token + '/log',
      {level: 'INFO', message: msg},
      this.httpHeader
    ).then((response) => {
    }, (error) => {
      console.error(error);
    });
  }
}
