import { Component } from '@angular/core';
import { ToastController, NavController } from '@ionic/angular';

@Component({
  selector: 'app-tab1',
  templateUrl: 'tab1.page.html',
  styleUrls: ['tab1.page.scss']
})
export class Tab1Page {

  subjects: any;

  constructor(private toastCtrl: ToastController, public navCtrl: NavController) {

  	this.subjects = [
  		'Hrvatski jezik',
  		'Engleski jezik',
  		'Govno'
  	]

  }

  /*async switchToSubject(){
  	const animationsOptions = {
      animation: 'ios-transition',
      duration: 1000
    }

    //this.navCtrl.push(subjOverview, {}, animationsOptions);
  }*/
}
