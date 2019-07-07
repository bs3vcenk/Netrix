import { Platform } from '@ionic/angular';
import { TranslateService } from '@ngx-translate/core';
import { Injectable } from '@angular/core';
import { Storage } from '@ionic/storage';
import { SettingsService } from './settings.service'

const LNG_KEY = 'SELECTED_LANGUAGE';

@Injectable({
  providedIn: 'root'
})
export class LanguageService {
  selected = '';

  constructor(
    private translate: TranslateService,
    private storage: Storage,
    private plt: Platform,
    private settings: SettingsService
  ) { }

  setInitialLang() {
    let language = this.translate.getBrowserLang();
    this.translate.setDefaultLang(language);

    this.storage.get(LNG_KEY).then(val => {
      if (val) {
        this.setLanguage(val);
        this.settings.language = val;
      } else {
        this.settings.language = language;
      }
    });
  }

  getLanguages() {
    return [
      { text: 'English', value: 'en' },
      { text: 'Deutsch', value: 'de' },
      { text: 'Hrvatski', value: 'hr' },
    ];
  }

  setLanguage(lng) {
    this.translate.use(lng);
    this.settings.language = lng;
    this.storage.set(LNG_KEY, lng);
  }
}
