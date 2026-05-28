import { Component, Input, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule, ReactiveFormsModule, FormBuilder, FormGroup, Validators } from '@angular/forms';
import { IonicModule, ModalController, ToastController, LoadingController } from '@ionic/angular';
import { AdminService } from '../../../services/admin.service';

export interface ReportData {
  id: number;
  karenderia_id: number;
  reporter_id: number;
  report_type: string;
  description: string;
  evidence?: string;
  status: string;
  verified: boolean;
  similar_reports_count: number;
  created_at: string;
  karenderia?: {
    id: number;
    business_name: string;
    name?: string;
  };
  reporter?: {
    id: number;
    name: string;
    email: string;
  };
}

@Component({
  selector: 'app-report-investigation-modal',
  templateUrl: './report-investigation-modal.page.html',
  styleUrls: ['./report-investigation-modal.page.scss'],
  standalone: true,
  imports: [IonicModule, CommonModule, FormsModule, ReactiveFormsModule]
})
export class ReportInvestigationModalPage implements OnInit {
  @Input() report!: ReportData;

  form: FormGroup;
  isSubmitting = false;

  statusOptions = [
    { value: 'under_review', label: 'Under Review' },
    { value: 'acknowledged', label: 'Acknowledged' },
    { value: 'resolved', label: 'Resolved' },
    { value: 'rejected', label: 'Rejected' }
  ];

  actionOptions = [
    { value: 'none', label: 'No Action' },
    { value: 'warning', label: 'Issue Warning' },
    { value: 'suspension', label: 'Suspend Karenderia' },
    { value: 'permanent_closure', label: 'Permanent Closure' }
  ];

  reportTypeColors: { [key: string]: string } = {
    'permanent_closure': 'danger',
    'temporary_closure': 'warning',
    'allergy_issue': 'danger',
    'food_safety': 'danger',
    'health_violation': 'danger',
    'quality_issue': 'warning',
    'other': 'medium'
  };

  constructor(
    private fb: FormBuilder,
    private adminService: AdminService,
    private modalController: ModalController,
    private toastController: ToastController,
    private loadingController: LoadingController
  ) {
    this.form = this.fb.group({
      status: ['under_review', Validators.required],
      admin_response: ['', [Validators.required, Validators.minLength(10)]],
      verified: [false],
      action_taken: ['none', Validators.required]
    });
  }

  ngOnInit() {}

  getReportTypeColor(reportType: string): string {
    return this.reportTypeColors[reportType] || 'medium';
  }

  formatReportType(reportType: string): string {
    return reportType.split('_').join(' ').toUpperCase();
  }

  async submitInvestigation() {
    if (this.form.invalid) {
      this.showToast('Please fill in all required fields', 'warning');
      return;
    }

    this.isSubmitting = true;
    const loading = await this.loadingController.create({
      message: 'Submitting investigation...'
    });
    await loading.present();

    try {
      const investigationData = {
        status: this.form.value.status,
        admin_response: this.form.value.admin_response,
        verified: this.form.value.verified,
        action_taken: this.form.value.action_taken
      };

      await this.adminService.investigateReport(this.report.id, investigationData).toPromise();

      await loading.dismiss();
      this.showToast('Report updated successfully', 'success');
      await this.modalController.dismiss({ success: true });
    } catch (error: any) {
      await loading.dismiss();
      console.error('Error submitting investigation:', error);
      const errorMessage = error?.error?.error || 'Failed to submit investigation';
      this.showToast(errorMessage, 'danger');
    } finally {
      this.isSubmitting = false;
    }
  }

  closeModal() {
    this.modalController.dismiss({ success: false });
  }

  private showToast(message: string, color: string = 'primary') {
    this.toastController.create({
      message,
      duration: 2000,
      color
    }).then(toast => toast.present());
  }
}
