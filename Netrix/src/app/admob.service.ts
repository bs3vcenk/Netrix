import { Injectable } from "@angular/core";
import { AdMobPro } from '@ionic-native/admob-pro/ngx';
import { SettingsService } from './settings.service';

@Injectable()
export class AdmobService {

  admobid = {
    banner: 'ca-app-pub-3536042070948443/8284474155'
  };
  constructor(
    private admob: AdMobPro,
    private settings: SettingsService
  ) { }

  showBanner() {
    if (this.settings.adPreference) {
      this.admob.createBanner({
        adId: this.admobid.banner,
        isTesting: false,
        autoShow: true,
        adSize: 'BANNER',
        position: this.admob.AD_POSITION.BOTTOM_CENTER,
      });
    } else {
      console.log("AdmobService/showBanner(): Not showing ad because of preference");
    }
  }
}
