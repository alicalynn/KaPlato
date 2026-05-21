import { Component, Input, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule, ReactiveFormsModule, FormBuilder, FormGroup, Validators } from '@angular/forms';
import { IonicModule, ModalController, ToastController, LoadingController } from '@ionic/angular';
import { KarenderiaReviewService } from '../../../services/karenderia-review.service';

@Component({
  selector: 'app-report-issue-modal',
  templateUrl: './report-issue-modal.component.html',
  styleUrls: ['./report-issue-modal.component.scss'],
  standalone: true,
  imports: [IonicModule, CommonModule, FormsModule, ReactiveFormsModule]
})
export class ReportIssueModalComponent implements OnInit {
  @Input() karenderiaId: number = 0;
  @Input() karenderiaName: string = '';

  form: FormGroup;
  isSaving = false;
  attachedFiles: File[] = [];

  reportTypes = [
    { value: 'permanent_closure', label: 'Permanently Closed', icon: 'lock-closed' },
    { value: 'temporary_closure', label: 'Temporarily Closed', icon: 'lock-open' },
    { value: 'allergy_issue', label: 'Allergy/Dietary Mishap', icon: 'warning', critical: true },
    { value: 'food_safety', label: 'Food Safety Issue', icon: 'warning', critical: true },
    { value: 'health_violation', label: 'Health/Sanitation Violation', icon: 'warning', critical: true },
    { value: 'quality_issue', label: 'Quality Issue', icon: 'close-circle' },
    { value: 'other', label: 'Other', icon: 'help-circle' }
  ];

  constructor(
    private fb: FormBuilder,
    private modalController: ModalController,
    private reviewService: KarenderiaReviewService,
    private toastController: ToastController,
    private loadingController: LoadingController
  ) {
    this.form = this.fb.group({
      report_type: ['', Validators.required],
      description: ['', [Validators.required, Validators.minLength(10)]],
      evidence: ['', [Validators.maxLength(2000)]],
    });
  }

  ngOnInit() {}

  async selectFiles() {
    const input = document.createElement('input');
    input.type = 'file';
    input.multiple = true;
    input.accept = 'image/*,.pdf';

    input.onchange = (event: any) => {
      const files = event.target.files;
      if (files) {
        const maxFiles = 3;
        for (let i = 0; i < Math.min(files.length, maxFiles - this.attachedFiles.length); i++) {
          this.attachedFiles.push(files[i]);
        }

        if (this.attachedFiles.length >= maxFiles) {
          this.showToast(`Maximum ${maxFiles} files allowed`, 'warning');
        }
      }
    };

    input.click();
  }

  removeFile(index: number) {
    this.attachedFiles.splice(index, 1);
  }

  getReportTypeIcon(reportType: string | undefined): string {
    if (!reportType) return '';
    const type = this.reportTypes.find(t => t.value === reportType);
    return type?.icon || 'help-circle';
  }

  getReportTypeLabel(reportType: string | undefined): string {
    if (!reportType) return '';
    const type = this.reportTypes.find(t => t.value === reportType);
    return type?.label || '';
  }

  getReportTypeBadgeColor(reportType: string): string {
    const type = this.reportTypes.find(t => t.value === reportType);
    if (type?.critical) return 'danger';
    return 'warning';
  }

  async submitReport() {
    if (this.form.invalid) {
      this.showToast('Please fill in all required fields', 'warning');
      return;
    }

    this.isSaving = true;
    const loading = await this.loadingController.create({
      message: 'Submitting report...'
    });
    await loading.present();

    try {
      const formData = new FormData();
      formData.append('report_type', this.form.value.report_type);
      formData.append('description', this.form.value.description);
      if (this.form.value.evidence) {
        formData.append('evidence', this.form.value.evidence);
      }

      // Append files
      this.attachedFiles.forEach((file, index) => {
        formData.append(`attachments[${index}]`, file);
      });

      // Since FormData is involved, we need to make a direct HTTP call
      // The service will handle this appropriately
      await this.reviewService.reportIssue(this.karenderiaId, formData).toPromise();

      await loading.dismiss();
      this.showToast('Report submitted successfully. Our team will review it.', 'success');
      
      await this.modalController.dismiss({
        submitted: true
      });
    } catch (error: any) {
      await loading.dismiss();
      console.error('Error submitting report:', error);
      const errorMessage = error?.error?.error || 'Failed to submit report';
      this.showToast(errorMessage, 'danger');
    } finally {
      this.isSaving = false;
    }
  }

  closeModal() {
    this.modalController.dismiss({
      submitted: false
    });
  }

  private showToast(message: string, color: string = 'primary') {
    this.toastController.create({
      message,
      duration: 2000,
      color
    }).then(toast => toast.present());
  }

  getFileSize(file: File): string {
    const bytes = file.size;
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  }
}
