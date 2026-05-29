import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, Router } from '@angular/router';
import { Location } from '@angular/common';
import { IonicModule } from '@ionic/angular';
import { SupplyOrderMessagingPage } from '../supply-order-messaging/supply-order-messaging.page';

@Component({
  selector: 'app-supply-order-messages-route',
  standalone: true,
  imports: [CommonModule, IonicModule, SupplyOrderMessagingPage],
  template: `
    <ion-header>
      <ion-toolbar color="success">
        <ion-buttons slot="start">
          <ion-button (click)="goBack()">
            <ion-icon name="arrow-back"></ion-icon>
          </ion-button>
        </ion-buttons>
        <ion-title>Order Messages #{{ orderId }}</ion-title>
      </ion-toolbar>
    </ion-header>
    <ion-content class="supply-order-messages-route-content">
      <app-supply-order-messaging
        [orderId]="orderId"
        [supplierId]="supplierId"
        [karenderiaId]="karenderiaId"
        [otherPartyName]="otherPartyName"
        [embeddedMode]="true">
      </app-supply-order-messaging>
    </ion-content>
  `,
  styles: [`
    .supply-order-messages-route-content {
      --background: #f8fafc;
    }
    app-supply-order-messaging {
      display: block;
      height: 100%;
    }
  `]
})
export class SupplyOrderMessagesRoutePage implements OnInit {
  orderId = 0;
  supplierId = 0;
  karenderiaId = 0;
  otherPartyName = 'Other Party';

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private location: Location
  ) {}

  ngOnInit() {
    this.route.queryParams.subscribe(params => {
      this.orderId = Number(params['orderId'] || 0);
      this.supplierId = Number(params['supplierId'] || 0);
      this.karenderiaId = Number(params['karenderiaId'] || 0);
      this.otherPartyName = params['otherPartyName'] || 'Other Party';
    });
  }

  goBack() {
    if (window.history.length > 1) {
      this.location.back();
      return;
    }
    this.router.navigate(['/owner-messages'], { queryParams: { tab: 'orders' } });
  }
}
