import { Injectable } from "@angular/core";
import { AdMobPro } from '@ionic-native/admob-pro/ngx';
import { Platform } from '@ionic/angular';

@Injectable()
export class AdmobService {

  admobid = {
    banner: 'ca-app-pub-3536042070948443/8284474155'
  };
  constructor(
    private admob: AdMobPro,
    public platform: Platform
  ) { }

  showBanner() {
    this.admob.createBanner({
      adId: this.admobid.banner,
      isTesting: false,
      autoShow: true,
      adSize: 'BANNER',
      position: this.admob.AD_POSITION.BOTTOM_CENTER,
    });
  }
}
