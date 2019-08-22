import { NgModule, ErrorHandler } from '@angular/core';
import { BrowserModule } from '@angular/platform-browser';
import { RouteReuseStrategy } from '@angular/router';
import { HttpClient, HttpClientModule } from '@angular/common/http';
import { IonicModule, IonicRouteStrategy } from '@ionic/angular';
import { SplashScreen } from '@ionic-native/splash-screen/ngx';
import { StatusBar } from '@ionic-native/status-bar/ngx';
import { AppRoutingModule } from './app-routing.module';
import { AppComponent } from './app.component';
import { IonicStorageModule } from '@ionic/storage';
import { TranslateModule, TranslateLoader } from '@ngx-translate/core';
import { TranslateHttpLoader } from '@ngx-translate/http-loader';
import { BrowserAnimationsModule } from '@angular/platform-browser/animations';
import { Device } from '@ionic-native/device/ngx';
import { AngularFireModule } from '@angular/fire';
import { AngularFirestoreModule } from '@angular/fire/firestore';
import { FirebaseX } from '@ionic-native/firebase-x/ngx';
import { CrashlyticsErrorHandler } from './services/firebase.service';
import { AdMob } from '@ionic-native/admob-plus/ngx';
import { AdmobService } from './services/admob.service';
import { CountUpModule } from 'countup.js-angular2';
import { HTTP } from '@ionic-native/http/ngx';
import { LocalNotifications } from '@ionic-native/local-notifications/ngx';
import { ApiService } from './services/api.service';
import { LocalApiService } from './services/api-local.service';

const firebaseConfig = {
    apiKey: 'AIzaSyDL7WpxGbkahzg6KJqqyxgQO0h-bez0MyY',
    authDomain: 'netrix-2e6bf.firebaseapp.com',
    databaseURL: 'https://netrix-2e6bf.firebaseio.com',
    projectId: 'netrix-2e6bf',
    storageBucket: 'netrix-2e6bf.appspot.com',
    messagingSenderId: '431714020563',
    appId: '1:431714020563:web:46d51f3a4163d676'
  };


export function createTranslateLoader(http: HttpClient) {
  return new TranslateHttpLoader(http, 'assets/i18n/', '.json');
}

@NgModule({
  declarations: [AppComponent],
  entryComponents: [],
  imports: [
    BrowserModule,
    IonicModule.forRoot({
      mode: 'ios',
      experimentalTransitionShadow: true,
    }),
    AppRoutingModule,
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
    AngularFirestoreModule,
    CountUpModule,
    HttpClientModule
  ],
  providers: [
    StatusBar,
    SplashScreen,
    { provide: RouteReuseStrategy, useClass: IonicRouteStrategy },
    Device,
    { provide: ErrorHandler, useClass: CrashlyticsErrorHandler },
    FirebaseX,
    AdmobService,
    HTTP,
    LocalNotifications,
    AdMob,
    ApiService,
    LocalApiService
  ],
  bootstrap: [AppComponent]
})
export class AppModule {}
