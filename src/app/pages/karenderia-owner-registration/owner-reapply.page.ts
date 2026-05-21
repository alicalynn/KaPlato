import { Component, OnInit } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { AuthService } from '../../services/auth.service';
import { ToastController, AlertController } from '@ionic/angular';

@Component({
  selector: 'app-owner-reapply',
  templateUrl: './owner-reapply.page.html',
  styleUrls: ['./owner-reapply.page.scss'],
  standalone: false,
})
export class OwnerReapplyPage implements OnInit {
  email: string = '';
  businessPermitFile: File | null = null;
  isLoading = false;
  rejectionReason: string = '';
  businessName: string = '';
  rejectionDate: string = '';

  constructor(
    private authService: AuthService,
    private route: ActivatedRoute,
    private router: Router,
    private toastController: ToastController,
    private alertController: AlertController
  ) {}

  ngOnInit() {
    this.route.queryParams.subscribe(params => {
      this.email = params['email'] || '';
    });

    // Try to get rejection details from stored session data
    const rejectionInfo = sessionStorage.getItem('ownerRejectionInfo');
    if (rejectionInfo) {
      const data = JSON.parse(rejectionInfo);
      this.rejectionReason = data.rejection_reason || '';
      this.businessName = data.business_name || '';
      this.rejectionDate = data.rejected_at || '';
    }
  }

  onFileSelected(event: any) {
    const file = event.target.files?.[0];
    if (file) {
      const validTypes = ['application/pdf', 'image/jpeg', 'image/png', 'image/jpg'];
      if (!validTypes.includes(file.type)) {
        this.showToast('Please upload a PDF, JPG, or PNG file', 'error');
        return;
      }

      const maxSize = 5 * 1024 * 1024; // 5MB
      if (file.size > maxSize) {
        this.showToast('File size must be less than 5MB', 'error');
        return;
      }

      this.businessPermitFile = file;
    }
  }

  async onReapply() {
    if (!this.businessPermitFile) {
      this.showToast('Please select a business permit file', 'error');
      return;
    }

    if (!this.email) {
      this.showToast('Email is required', 'error');
      return;
    }

    this.isLoading = true;

    try {
      const response = await this.authService.reapplyAsOwner(
        this.email,
        this.businessPermitFile
      ).toPromise();

      if (response?.success) {
        // Clear stored rejection info
        sessionStorage.removeItem('ownerRejectionInfo');

        await this.showAlert(
          'Application Submitted',
          'Your reapplication has been submitted successfully! Our admin team will review your updated business permit. You will receive an email when a decision is made.'
        );

        this.router.navigate(['/login']);
      }
    } catch (error: any) {
      const message = error?.error?.message || 'Failed to submit reapplication. Please try again.';
      this.showToast(message, 'error');
      console.error('Reapplication error:', error);
    } finally {
      this.isLoading = false;
    }
  }

  private async showToast(message: string, color: string = 'success') {
    const toast = await this.toastController.create({
      message,
      duration: 3000,
      position: 'bottom',
      color,
      buttons: [
        {
          text: 'Close',
          role: 'cancel',
        },
      ],
    });
    await toast.present();
  }

  private async showAlert(title: string, message: string) {
    const alert = await this.alertController.create({
      header: title,
      message,
      buttons: ['OK'],
    });
    await alert.present();
  }

  goBack() {
    this.router.navigate(['/login']);
  }
}
