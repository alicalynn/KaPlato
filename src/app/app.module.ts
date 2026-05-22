import { NgModule } from '@angular/core';
import { BrowserModule } from '@angular/platform-browser';
import { RouteReuseStrategy } from '@angular/router';
import { provideHttpClient, withFetch, withInterceptors } from '@angular/common/http';

import { IonicModule, IonicRouteStrategy } from '@ionic/angular';

import { AppComponent } from './app.component';
import { AppRoutingModule } from './app-routing.module';
import { environment } from '../environments/environment';
import { QrScannerService } from './services/qr-scanner.service';
import { ApiConfigService } from './services/api-config.service';
import { QRScanner } from '@ionic-native/qr-scanner/ngx';
import { ngrokBypassInterceptor } from './interceptors/ngrok-bypass.interceptor';

@NgModule({
  declarations: [AppComponent],
  imports: [
    BrowserModule, 
    IonicModule.forRoot(), 
    AppRoutingModule
  ],
  providers: [
    { provide: RouteReuseStrategy, useClass: IonicRouteStrategy },
    provideHttpClient(withFetch(), withInterceptors([ngrokBypassInterceptor])),
    QrScannerService,
    ApiConfigService,
    QRScanner
  ],
  bootstrap: [AppComponent],
})
export class AppModule {}
