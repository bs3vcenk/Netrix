import { NgModule } from '@angular/core';
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
    })
  ],
  providers: [
    StatusBar,
    SplashScreen,
    { provide: RouteReuseStrategy, useClass: IonicRouteStrategy },
		Device
  ],
  bootstrap: [AppComponent]
})
export class AppModule {}
