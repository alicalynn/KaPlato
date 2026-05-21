import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { IonicModule } from '@ionic/angular';
import { ReactiveFormsModule, FormsModule } from '@angular/forms';

import { KarenderiaReviewsComponent } from './karenderia-reviews.component';
import { LeaveReviewModalComponent } from './leave-review-modal/leave-review-modal.component';
import { ReportIssueModalComponent } from './report-issue-modal/report-issue-modal.component';

@NgModule({
  imports: [
    CommonModule,
    IonicModule,
    ReactiveFormsModule,
    FormsModule,
    KarenderiaReviewsComponent,
    LeaveReviewModalComponent,
    ReportIssueModalComponent
  ],
  exports: [KarenderiaReviewsComponent]
})
export class KarenderiaReviewsModule { }
