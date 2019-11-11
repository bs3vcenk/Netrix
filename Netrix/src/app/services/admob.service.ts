import { Injectable } from '@angular/core';
import { Storage } from '@ionic/storage';

declare var admob;

@Injectable()
export class AdmobService {

  adPreference = null;

  constructor(
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
    this.adPreference = true; // TODO: Decide if this stays
  }

  showBanner() {
    if (this.adPreference) {
      /* Show the ad banner */
      console.log('AdmobService/showBanner(): Showing ad banner');
      admob.banner.show({
        id: 'ca-app-pub-3536042070948443/8284474155',
        size: 0, // BANNER
      });
    } else {
      console.log('AdmobService/showBanner(): Not showing ad because of preference');
    }
  }
}
