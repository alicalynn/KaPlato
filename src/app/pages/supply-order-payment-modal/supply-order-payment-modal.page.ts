import { CommonModule } from '@angular/common';
import { Component, Input } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { IonicModule, ModalController, ToastController, LoadingController } from '@ionic/angular';

export interface PaymentData {
  method: 'cod' | 'paymaya_sandbox' | 'paypal_sandbox' | 'gcash' | 'bank_transfer';
  paymentDetails?: {
    cardholderName?: string;
    cardNumber?: string;
    expiryDate?: string;
    cvv?: string;
    referenceNumber?: string;
  };
}

@Component({
  selector: 'app-supply-order-payment-modal',
  templateUrl: './supply-order-payment-modal.page.html',
  styleUrls: ['./supply-order-payment-modal.page.scss'],
  standalone: true,
  imports: [CommonModule, FormsModule, IonicModule]
})
export class SupplyOrderPaymentModalPage {
  @Input() totalAmount: number = 0;
  @Input() supplierName: string = 'Supplier';

  selectedMethod: 'cod' | 'paymaya_sandbox' | 'paypal_sandbox' | 'gcash' | 'bank_transfer' = 'cod';
  
  // PayMaya form
  paymentForm = {
    cardholderName: '',
    cardNumber: '',
    expiryDate: '',
    cvv: ''
  };

  isProcessing = false;

  constructor(
    private modalController: ModalController,
    private toastController: ToastController,
    private loadingController: LoadingController
  ) {}

  selectPaymentMethod(method: 'cod' | 'paymaya_sandbox' | 'paypal_sandbox' | 'gcash' | 'bank_transfer') {
    this.selectedMethod = method;
  }

  formatCardNumber(value: string): string {
    // Remove non-digits
    const clean = value.replace(/\D/g, '');
    // Add spaces every 4 digits
    return clean.replace(/(\d{4})(?=\d)/g, '$1 ');
  }

  onCardNumberChange(event: any) {
    const value = event.target.value;
    this.paymentForm.cardNumber = this.formatCardNumber(value);
  }

  formatExpiryDate(value: string): string {
    const clean = value.replace(/\D/g, '');
    if (clean.length >= 2) {
      return clean.substring(0, 2) + '/' + clean.substring(2, 4);
    }
    return clean;
  }

  onExpiryDateChange(event: any) {
    const value = event.target.value;
    this.paymentForm.expiryDate = this.formatExpiryDate(value);
  }

  onCvvChange(event: any) {
    const value = event.target.value;
    // Only allow digits
    this.paymentForm.cvv = value.replace(/\D/g, '').substring(0, 4);
  }

  validatePaymentForm(): boolean {
    if (this.selectedMethod === 'paymaya_sandbox') {
      if (!this.paymentForm.cardholderName.trim()) {
        this.showToast('Please enter cardholder name', 'danger');
        return false;
      }
      if (!this.paymentForm.cardNumber || this.paymentForm.cardNumber.replace(/\s/g, '').length !== 16) {
        this.showToast('Please enter a valid 16-digit card number', 'danger');
        return false;
      }
      if (!this.paymentForm.expiryDate || this.paymentForm.expiryDate.length !== 5) {
        this.showToast('Please enter expiry date as MM/YY', 'danger');
        return false;
      }
      if (!this.paymentForm.cvv || this.paymentForm.cvv.length !== 3) {
        this.showToast('Please enter a valid 3-digit CVV', 'danger');
        return false;
      }
    }
    return true;
  }

  async confirmPayment() {
    if (!this.validatePaymentForm()) {
      return;
    }

    const loading = await this.loadingController.create({
      message: 'Processing payment...'
    });
    await loading.present();

    try {
      this.isProcessing = true;
      
      // Simulate payment processing delay
      await new Promise(resolve => setTimeout(resolve, 1500));

      const paymentData: PaymentData = {
        method: this.selectedMethod,
        paymentDetails: this.selectedMethod === 'paymaya_sandbox' ? { ...this.paymentForm } : undefined
      };

      await loading.dismiss();
      await this.showToast('Payment successful!', 'success');
      
      await this.modalController.dismiss(paymentData);
    } catch (error: any) {
      await loading.dismiss();
      await this.showToast(error?.message || 'Payment failed', 'danger');
    } finally {
      this.isProcessing = false;
    }
  }

  dismiss() {
    this.modalController.dismiss();
  }

  private async showToast(message: string, color: string = 'primary') {
    const toast = await this.toastController.create({
      message,
      duration: 3000,
      color,
      position: 'bottom'
    });
    await toast.present();
  }
}
