import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { IonicModule, ToastController, AlertController, LoadingController } from '@ionic/angular';
import { QrScannerService } from '../../services/qr-scanner.service';

@Component({
  selector: 'app-settings',
  templateUrl: './settings.page.html',
  styleUrls: ['./settings.page.scss'],
  standalone: true,
  imports: [IonicModule, CommonModule, FormsModule]
})
export class SettingsPage implements OnInit {
  backendUrl: string = '';
  isScanning: boolean = false;
  showUrlForm: boolean = false;
  manualUrl: string = '';

  constructor(
    private qrScannerService: QrScannerService,
    private toastController: ToastController,
    private alertController: AlertController,
    private loadingController: LoadingController
  ) {}

  ngOnInit() {
    this.loadBackendUrl();
  }

  /**
   * Load current backend URL
   */
  loadBackendUrl(): void {
    this.backendUrl = this.qrScannerService.getBackendUrl();
  }

  /**
   * Start QR code scanning
   */
  async startQrScanning(): Promise<void> {
    const loading = await this.loadingController.create({
      message: 'Preparing camera...'
    });
    await loading.present();

    this.isScanning = true;

    this.qrScannerService.startScanning().subscribe(
      (url: string) => {
        loading.dismiss();
        this.backendUrl = url;
        this.isScanning = false;
        this.showSuccessToast(`Backend URL updated: ${url}`);
      },
      (error: any) => {
        loading.dismiss();
        this.isScanning = false;
        this.showErrorToast(`Scanning failed: ${error}`);
      }
    );
  }

  /**
   * Stop QR code scanning
   */
  stopQrScanning(): void {
    this.qrScannerService.stopScanning();
    this.isScanning = false;
  }

  /**
   * Save manually entered URL
   */
  async saveManualUrl(): Promise<void> {
    if (!this.manualUrl.trim()) {
      this.showErrorToast('Please enter a valid URL');
      return;
    }

    if (!this.isValidUrl(this.manualUrl)) {
      this.showErrorToast('Invalid URL format');
      return;
    }

    this.qrScannerService.setBackendUrl(this.manualUrl);
    this.backendUrl = this.manualUrl;
    this.manualUrl = '';
    this.showUrlForm = false;
    this.showSuccessToast('Backend URL saved successfully');
  }

  /**
   * Validate URL format
   */
  private isValidUrl(url: string): boolean {
    try {
      new URL(url);
      return true;
    } catch {
      return false;
    }
  }

  /**
   * Clear saved URL
   */
  async clearBackendUrl(): Promise<void> {
    const alert = await this.alertController.create({
      header: 'Clear Backend URL',
      message: 'Are you sure you want to clear the saved backend URL?',
      buttons: [
        {
          text: 'Cancel',
          role: 'cancel'
        },
        {
          text: 'Clear',
          role: 'destructive',
          handler: () => {
            this.qrScannerService.clearBackendUrl();
            this.backendUrl = '';
            this.showSuccessToast('Backend URL cleared');
          }
        }
      ]
    });
    await alert.present();
  }

  /**
   * Copy URL to clipboard
   */
  async copyToClipboard(): Promise<void> {
    if (!this.backendUrl) {
      this.showErrorToast('No URL to copy');
      return;
    }

    try {
      await navigator.clipboard.writeText(this.backendUrl);
      this.showSuccessToast('URL copied to clipboard');
    } catch (error) {
      this.showErrorToast('Failed to copy URL');
    }
  }

  /**
   * Show success toast
   */
  private async showSuccessToast(message: string): Promise<void> {
    const toast = await this.toastController.create({
      message,
      duration: 3000,
      color: 'success',
      position: 'bottom'
    });
    await toast.present();
  }

  /**
   * Show error toast
   */
  private async showErrorToast(message: string): Promise<void> {
    const toast = await this.toastController.create({
      message,
      duration: 3000,
      color: 'danger',
      position: 'bottom'
    });
    await toast.present();
  }
}
