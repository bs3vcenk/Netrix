import { Component, OnInit } from '@angular/core';
import { NavController } from '@ionic/angular';
import { LanguageService } from '../../language.service';

@Component({
  selector: 'app-lang',
  templateUrl: './lang.page.html',
  styleUrls: ['./lang.page.scss'],
})
export class LangPage implements OnInit {

  languages = null;
  langSel = null;
  selectedLang = null;

  constructor(private translateManager: LanguageService, private navCtrl: NavController) { }

  ngOnInit() {
    this.languages = this.translateManager.getLanguages();
    this.selectedLang = this.translateManager.selected;
    console.log("settings/lang: Current language is " + this.selectedLang);
  }

  select(lng) {
    this.translateManager.setLanguage(lng);
    console.log("settings/lang/select(): Changed language to " + lng + ", navigating back to Settings.");
    this.navCtrl.navigateBack('/tabs/tabs/tab3');
  }

}
