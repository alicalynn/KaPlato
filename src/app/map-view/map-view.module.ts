import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { IonicModule } from '@ionic/angular';

import { MapViewPage, DirectionsModalContent } from './map-view.page';
import { ComponentsModule } from '../components/components.module';
import { RouterModule } from '@angular/router';

const routes = [
  {
    path: '',
    component: MapViewPage
  }
];

@NgModule({
  imports: [
    CommonModule,
    FormsModule,
    IonicModule,
    RouterModule.forChild(routes),
    ComponentsModule
  ],
  declarations: [MapViewPage, DirectionsModalContent]
})
export class MapViewPageModule {}