import { TranslateService } from '@ngx-translate/core';
import { Injectable } from '@angular/core';
import { SettingsService } from './settings.service';
import { Storage } from '@ionic/storage';

@Injectable({
  providedIn: 'root'
})
export class LanguageService {

  constructor(
    private translate: TranslateService,
    private settings: SettingsService
  ) { }

  setInitialLang() {
    /* Get device language */
    const language = this.translate.getBrowserLang();
    /* Set the default language to HR */
    this.translate.setDefaultLang('hr');
    /* Set the app language to the device lang, if available */
    this.setLanguage(language);
  }

  private setLanguage(lng) {
    /* Sets a language if available */
    this.translate.use(lng);
    this.settings.language = lng;
  }
}
