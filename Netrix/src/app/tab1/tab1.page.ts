import { Component } from '@angular/core';
import { ToastController } from '@ionic/angular';

@Component({
  selector: 'app-tab1',
  templateUrl: 'tab1.page.html',
  styleUrls: ['tab1.page.scss']
})
export class Tab1Page {

  constructor(private toastCtrl: ToastController) {}

  async switchToSubject(){
  	const toast = await this.toastCtrl.create({
  		message: "Switching to subject",
  		duration: 2000
  	})
  	toast.present();
  }
}
