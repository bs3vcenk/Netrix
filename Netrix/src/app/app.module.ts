import { NgModule } from '@angular/core';
import { BrowserModule } from '@angular/platform-browser';
import { RouteReuseStrategy } from '@angular/router';
import { HttpClientModule } from '@angular/common/http';

import { IonicModule, IonicRouteStrategy } from '@ionic/angular';
import { SplashScreen } from '@ionic-native/splash-screen/ngx';
import { StatusBar } from '@ionic-native/status-bar/ngx';

import { AppRoutingModule } from './app-routing.module';
import { AppComponent } from './app.component';

/*
import { TranslateModule, TranslateLoader} from '@ngx-translate/core';
import { TranslateHttpLoader} from '@ngx-translate/http-loader';

import { IonicStorageModule } from '@ionic/storage';

export function createTranslateLoader(http: HttpClient) {
	return new TranslateHttpLoader(http, 'assets/i18n/', '.json')
}*/

@NgModule({
  declarations: [AppComponent],
  entryComponents: [],
  imports: [
  	BrowserModule,
  	IonicModule.forRoot({mode:'ios'}),
  	AppRoutingModule,
  	HttpClientModule
  ],
  providers: [
    StatusBar,
    SplashScreen,
    { provide: RouteReuseStrategy, useClass: IonicRouteStrategy }
  ],
  bootstrap: [AppComponent]
})
export class AppModule {}
