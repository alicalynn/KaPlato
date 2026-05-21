import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { IonicModule } from '@ionic/angular';
import { RouterModule } from '@angular/router';

import { KarenderiaDetailPage } from './karenderia-detail.page';
import { KarenderiaReviewsModule } from '../pages/karenderia-reviews/karenderia-reviews.module';

const routes = [
  {
    path: '',
    component: KarenderiaDetailPage
  }
];

@NgModule({
  imports: [
    CommonModule,
    FormsModule,
    IonicModule,
    RouterModule.forChild(routes),
    KarenderiaReviewsModule
  ],
  declarations: [KarenderiaDetailPage]
})
export class KarenderiaDetailPageModule {}
