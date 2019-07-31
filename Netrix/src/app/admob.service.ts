import { Injectable } from '@angular/core';
import { AdMobPro } from '@ionic-native/admob-pro/ngx';
import { Storage } from '@ionic/storage';
import { Platform } from '@ionic/angular';
import { LogService } from './log.service';

@Injectable()
export class AdmobService {

  admobid = {
    banner: 'ca-app-pub-3536042070948443/8284474155'
  };

  adPreference = null;

  constructor(
    private admob: AdMobPro,
    private storage: Storage,
    private platform: Platform,
    private log: LogService
  ) {
    this.storage.get('ad-preference').then(res => {
      if (res != null) {
        this.adPreference = res;
      } else {
        this.adPreference = true;
      }
    });
  }

  showBanner() {
    if (!this.platform.is('cordova')) { return; }
    if (this.adPreference) {
      this.log.log('AdmobService/showBanner(): Showing ad banner');
      this.admob.createBanner({
        adId: this.admobid.banner,
        isTesting: false,
        autoShow: true,
        adSize: 'BANNER',
        position: this.admob.AD_POSITION.BOTTOM_CENTER,
      });
    } else {
      this.log.log('AdmobService/showBanner(): Not showing ad because of preference');
    }
  }
}
