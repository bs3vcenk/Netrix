import { Injectable } from '@angular/core';
import { AdMobFree, AdMobFreeBannerConfig } from '@ionic-native/admob-free/ngx';
import { Storage } from '@ionic/storage';

@Injectable()
export class AdmobService {

  admobid = {
    banner: 'ca-app-pub-3536042070948443/8284474155'
  };

  adPreference = null;

  constructor(
    private admob: AdMobFree,
    private storage: Storage
  ) {
    /* Check if the user wants to see ads */
    this.storage.get('ad-preference').then(res => {
      if (res != null) {
        this.adPreference = res;
      } else {
        this.adPreference = true;
      }
    });
  }

  showBanner() {
    if (this.adPreference) {
      /* Show the ad banner */
      console.log('AdmobService/showBanner(): Showing ad banner');
      const bannerConfig: AdMobFreeBannerConfig = {
        id: 'ca-app-pub-3536042070948443/8284474155',
        autoShow: true,
        size: 'BANNER'
      };
      this.admob.banner.config(bannerConfig);
      this.admob.banner.prepare().then(() => {
        console.log('AdmobService/showBanner(): Banner is displayed');
      }, (err) => {
        console.log('AdmobService/showBanner(): Failed to show banner, throwing to Crashlytics');
        throw err;
      });
    } else {
      console.log('AdmobService/showBanner(): Not showing ad because of preference');
    }
  }
}
