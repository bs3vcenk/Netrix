import { Injectable } from '@angular/core';
import { FirebaseX } from '@ionic-native/firebase-x/ngx';
import { Storage } from '@ionic/storage';

declare var admob;

@Injectable()
export class AdmobService {

  adPreference = null;

  constructor(
    private firebase: FirebaseX,
    private storage: Storage
  ) {
    /* Check if the user wants to see ads */
    /*this.storage.get('ad-preference').then(res => {
      if (res != null) {
        this.adPreference = res;
      } else {
        this.adPreference = true;
      }
    });*/
    // Ignore ad preference for now
    this.adPreference = true;
  }

  showBanner() {
    if (this.adPreference) {
      /* Show the ad banner */
      this.firebase.logMessage('AdmobService/showBanner(): Showing ad banner');
      admob.banner.show({
        id: {
          android: 'ca-app-pub-3536042070948443/8284474155',
          ios: 'ca-app-pub-3536042070948443/1411268336'
        },
        size: 0, // BANNER
      });
    } else {
      this.firebase.logMessage('AdmobService/showBanner(): Not showing ad because of preference');
    }
  }

  hideBanner() {
    /* Hide the ad banner, used by dev settings */
    this.firebase.logMessage('AdmobService/hideBanner(): Hiding ad banner');
    admob.banner.hide({
      id: {
        android: 'ca-app-pub-3536042070948443/8284474155',
        ios: 'ca-app-pub-3536042070948443/1411268336'
      }
    });
  }

  loadInterstitial() {
    this.firebase.logMessage('AdmobService/loadInterstitial(): Preparing interstitial ad');
    return admob.interstitial.load({
      id: 'ca-app-pub-3536042070948443/9659847570'
    });
  }

  async showInterstitial() {
    /* Show the interstitial ad */
    this.firebase.logMessage('AdmobService/showInterstitial(): Showing interstitial ad');
    await admob.interstitial.show();
  }
}
