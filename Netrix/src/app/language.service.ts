import { TranslateService } from '@ngx-translate/core';
import { Injectable } from '@angular/core';
import { SettingsService } from './settings.service';

@Injectable({
  providedIn: 'root'
})
export class LanguageService {

  constructor(
    private translate: TranslateService,
    private settings: SettingsService
  ) { }

  setInitialLang() {
    const language = this.translate.getBrowserLang();
    this.translate.setDefaultLang(language);
    this.setLanguage(language);
  }

  setLanguage(lng) {
    this.translate.use(lng);
    this.settings.language = lng;
  }
}
