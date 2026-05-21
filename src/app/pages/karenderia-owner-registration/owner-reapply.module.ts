import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { IonicModule } from '@ionic/angular';
import { OwnerReapplyPage } from './owner-reapply.page';
import { OwnerReapplyRoutingModule } from './owner-reapply-routing.module';

@NgModule({
  imports: [
    CommonModule,
    IonicModule,
    OwnerReapplyRoutingModule
  ],
  declarations: [OwnerReapplyPage]
})
export class OwnerReapplyPageModule { }
