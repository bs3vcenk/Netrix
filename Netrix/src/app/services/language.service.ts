import { TranslateService } from '@ngx-translate/core';
import { Injectable } from '@angular/core';
import { SettingsService } from './settings.service';
import { Storage } from '@ionic/storage';

@Injectable({
  providedIn: 'root'
})
export class LanguageService {

  forceCroatianPreference = null;

  constructor(
    private translate: TranslateService,
    private settings: SettingsService,
    private storage: Storage
  ) {
    this.storage.get('force-croatian-preference').then((pref) => {
      if (pref != null) {
        this.forceCroatianPreference = pref;
      } else {
        this.forceCroatianPreference = false;
      }
      this.settings.forceCroatianPreference = this.forceCroatianPreference;
    });
  }

  setInitialLang() {
    let language;
    if (this.forceCroatianPreference) {
      language = 'hr';
    } else {
      /* Get device language */
      language = this.translate.getBrowserLang();
    }
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
