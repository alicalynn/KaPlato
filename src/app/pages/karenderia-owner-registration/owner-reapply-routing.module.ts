import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { OwnerReapplyPage } from './owner-reapply.page';

const routes: Routes = [
  {
    path: '',
    component: OwnerReapplyPage
  }
];

@NgModule({
  imports: [RouterModule.forChild(routes)],
  exports: [RouterModule]
})
export class OwnerReapplyRoutingModule { }
