import { NgModule, ErrorHandler } from '@angular/core';
import { BrowserModule } from '@angular/platform-browser';
import { RouteReuseStrategy } from '@angular/router';
import { HttpClientModule, HttpClient } from '@angular/common/http';

import { IonicModule, IonicRouteStrategy } from '@ionic/angular';
import { SplashScreen } from '@ionic-native/splash-screen/ngx';
import { StatusBar } from '@ionic-native/status-bar/ngx';

import { AppRoutingModule } from './app-routing.module';
import { AppComponent } from './app.component';

import { IonicStorageModule } from '@ionic/storage';

import { TranslateModule, TranslateLoader} from '@ngx-translate/core';
import { TranslateHttpLoader } from '@ngx-translate/http-loader';

import { BrowserAnimationsModule } from '@angular/platform-browser/animations';
import { Device } from '@ionic-native/device/ngx';

import { AngularFireModule } from '@angular/fire';
import { AngularFirestoreModule } from '@angular/fire/firestore';
import { Firebase } from '@ionic-native/firebase/ngx';

import * as Sentry from 'sentry-cordova';
import { SentryErrorHandler } from './sentryerrorhandler.service'

Sentry.init({ dsn: 'https://a90cfc8a6dc749fb831a5050996bb8c7@sentry.io/1494605', release: 'netrix@1.6.1' })

var firebaseConfig = {
    apiKey: "AIzaSyDL7WpxGbkahzg6KJqqyxgQO0h-bez0MyY",
    authDomain: "netrix-2e6bf.firebaseapp.com",
    databaseURL: "https://netrix-2e6bf.firebaseio.com",
    projectId: "netrix-2e6bf",
    storageBucket: "netrix-2e6bf.appspot.com",
    messagingSenderId: "431714020563",
    appId: "1:431714020563:web:46d51f3a4163d676"
  };


export function createTranslateLoader(http: HttpClient) {
	return new TranslateHttpLoader(http, 'assets/i18n/', '.json')
}

@NgModule({
  declarations: [AppComponent],
  entryComponents: [],
  imports: [
  	BrowserModule,
  	IonicModule.forRoot({mode:'ios'}),
  	AppRoutingModule,
  	HttpClientModule,
    IonicStorageModule.forRoot(),
		BrowserAnimationsModule,
    TranslateModule.forRoot({
      loader: {
        provide: TranslateLoader,
        useFactory: (createTranslateLoader),
        deps: [HttpClient]
      }
    }),
		AngularFireModule.initializeApp(firebaseConfig),
    AngularFirestoreModule
  ],
  providers: [
    StatusBar,
    SplashScreen,
    { provide: RouteReuseStrategy, useClass: IonicRouteStrategy },
		Device,
		{ provide: ErrorHandler, useClass: SentryErrorHandler },
		Firebase
  ],
  bootstrap: [AppComponent]
})
export class AppModule {}
