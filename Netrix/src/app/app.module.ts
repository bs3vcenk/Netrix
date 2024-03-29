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
import { FirebaseX } from '@ionic-native/firebase-x/ngx';
import { CrashlyticsErrorHandler } from './services/firebase.service';
import { AdMob } from '@ionic-native/admob-plus/ngx';
import { AdmobService } from './services/admob.service';
import { LocalNotifications } from '@ionic-native/local-notifications/ngx';
import { ClassesPageModule } from './classes/classes.module';
import { GradeHistoryPageModule } from './gradehistory/gradehistory.module';
import { SettingsPageModule } from './settings/settings.module';

export function createTranslateLoader(http: HttpClient) {
  return new TranslateHttpLoader(http, 'assets/i18n/', '.json');
}

@NgModule({
  declarations: [
    AppComponent
  ],
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
    HttpClientModule,
    ClassesPageModule,
    GradeHistoryPageModule,
    SettingsPageModule
  ],
  providers: [
    StatusBar,
    SplashScreen,
    { provide: RouteReuseStrategy, useClass: IonicRouteStrategy },
    Device,
    { provide: ErrorHandler, useClass: CrashlyticsErrorHandler },
    FirebaseX,
    AdmobService,
    LocalNotifications,
    AdMob
  ],
  bootstrap: [AppComponent]
})
export class AppModule {}
