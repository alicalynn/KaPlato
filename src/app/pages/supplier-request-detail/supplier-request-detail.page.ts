import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { IonicModule, AlertController, ToastController } from '@ionic/angular';
import { ActivatedRoute, Router, RouterModule } from '@angular/router';
import { Location } from '@angular/common';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { environment } from '../../../environments/environment';
import { AuthService } from '../../services/auth.service';
import { addIcons } from 'ionicons';
import { 
  checkmarkOutline, 
  closeOutline, 
  checkmarkDoneOutline,
  arrowBackOutline,
  timeOutline,
  checkmarkCircleOutline,
  chatbubblesOutline
} from 'ionicons/icons';

interface SupplierQuote {
  id: number;
  supplier_id: number;
  ingredient_request_id: number;
  price_per_unit: number;
  available_quantity: number;
  unit: string;
  total_price: number;
  delivery_date: string;
  delivery_method: string;
  notes: string;
  status: 'pending' | 'accepted' | 'rejected';
  created_at: string;
}

interface IngredientRequest {
  id: number;
  title: string;
  description: string;
  ingredient_type: string;
  needed_quantity: number;
  unit: string;
  budget: number;
  needed_by_date: string;
  status: string;
  karenderia: {
    id: number;
    business_name: string;
    owner_id: number;
  };
  acceptedSupplier?: {
    id: number;
    name: string;
  };
  quotes?: SupplierQuote[];
}

@Component({
  selector: 'app-supplier-request-detail',
  templateUrl: './supplier-request-detail.page.html',
  styleUrls: ['./supplier-request-detail.page.scss'],
  standalone: true,
  imports: [CommonModule, FormsModule, IonicModule, RouterModule]
})
export class SupplierRequestDetailPage implements OnInit {
  requestId!: number;
  currentUserId = 0;
  ingredientRequest: IngredientRequest | null = null;
  myQuote: SupplierQuote | undefined;
  
  isLoadingRequest = true;
  ownerName = '';
  ownerId = 0;

  // Computed properties
  isBothPartiesAccepted = false;
  hasMyQuote = false;

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private location: Location,
    private http: HttpClient,
    private authService: AuthService,
    private alertController: AlertController,
    private toastController: ToastController
  ) {
    addIcons({
      'checkmark-outline': checkmarkOutline,
      'close-outline': closeOutline,
      'chatbubbles-outline': chatbubblesOutline,
      'checkmark-done-outline': checkmarkDoneOutline,
      'arrow-back-outline': arrowBackOutline,
      'time-outline': timeOutline,
      'checkmark-circle-outline': checkmarkCircleOutline
    });
  }

  ngOnInit() {
    const userId = this.authService.getCurrentUser()?.id;
    this.currentUserId = userId ? Number(userId) : 0;

    this.route.params.subscribe(params => {
      this.requestId = params['id'];
      if (this.requestId) {
        this.loadRequestDetail();
      }
    });
  }

  loadRequestDetail() {
    const token = localStorage.getItem('auth_token');
    const headers = new HttpHeaders({
      'Authorization': token ? `Bearer ${token}` : '',
      'Content-Type': 'application/json'
    });

    this.http.get<any>(`${environment.apiUrl}/ingredient-requests/${this.requestId}`, { headers })
      .subscribe({
        next: (response) => {
          this.ingredientRequest = response.data;
          
          // Extract owner info
          if (this.ingredientRequest?.karenderia) {
            this.ownerId = this.ingredientRequest.karenderia.owner_id;
            // Find owner name from karenderia owner - may need to load separately
            this.ownerName = this.ingredientRequest.karenderia.business_name;
          }

          // Check if I have a quote and get my quote status
          if (this.ingredientRequest?.quotes) {
            this.myQuote = this.ingredientRequest.quotes.find(
              (q: SupplierQuote) => q.supplier_id === this.currentUserId
            );
            this.hasMyQuote = !!this.myQuote;
          }

          // Check if both parties accepted
          this.checkAcceptanceStatus();

          this.isLoadingRequest = false;
        },
        error: (error) => {
          console.error('Error loading request:', error);
          this.isLoadingRequest = false;
          this.showToast('Failed to load request details');
        }
      });
  }

  openInMessages() {
    if (!this.ownerId || !this.requestId) {
      this.showToast('Owner contact is not available yet');
      return;
    }
    this.router.navigate(['/supplier-home'], {
      queryParams: {
        tab: 'messages',
        requestId: this.requestId,
        userId: this.ownerId
      }
    });
  }

  // Note: acceptQuoteResponse() method removed. Owner is responsible for accepting quotes, not the supplier.
  // Supplier submits quote (pending) -> Waits for owner -> Owner accepts (accepted) -> Supplier delivers

  cancelQuote() {
    this.alertController.create({
      header: 'Cancel Quote',
      message: 'Are you sure you want to cancel this quote?',
      buttons: [
        {
          text: 'Cancel',
          role: 'cancel'
        },
        {
          text: 'Yes, Cancel Quote',
          role: 'destructive',
          handler: () => {
            this.doCancel();
          }
        }
      ]
    }).then(alert => alert.present());
  }

  private doCancel() {
    if (!this.myQuote?.id) return;

    const token = localStorage.getItem('auth_token');
    const headers = new HttpHeaders({
      'Authorization': token ? `Bearer ${token}` : '',
      'Content-Type': 'application/json'
    });

    this.http.patch<any>(
      `${environment.apiUrl}/supplier-quotes/${this.myQuote.id}/cancel`,
      {},
      { headers }
    ).subscribe({
      next: () => {
        this.showToast('Quote cancelled');
        this.location.back();
      },
      error: (error) => {
        console.error('Error cancelling:', error);
        this.showToast('Failed to cancel quote');
      }
    });
  }

  markAsDelivered() {
    if (!this.isBothPartiesAccepted) {
      this.showToast('Both parties must accept before marking as delivered');
      return;
    }

    this.alertController.create({
      header: 'Mark as Delivered',
      message: 'Confirm that this order has been delivered?',
      buttons: [
        {
          text: 'Cancel',
          role: 'cancel'
        },
        {
          text: 'Mark Delivered',
          handler: () => {
            this.doMarkDelivered();
          }
        }
      ]
    }).then(alert => alert.present());
  }

  private doMarkDelivered() {
    const token = localStorage.getItem('auth_token');
    const headers = new HttpHeaders({
      'Authorization': token ? `Bearer ${token}` : '',
      'Content-Type': 'application/json'
    });

    this.http.patch<any>(
      `${environment.apiUrl}/ingredient-requests/${this.requestId}/mark-delivered`,
      {},
      { headers }
    ).subscribe({
      next: () => {
        this.showToast('Order marked as delivered!');
        this.loadRequestDetail();
      },
      error: (error) => {
        console.error('Error marking delivered:', error);
        this.showToast('Failed to mark as delivered');
      }
    });
  }

  private checkAcceptanceStatus() {
    if (!this.ingredientRequest || !this.myQuote) {
      this.isBothPartiesAccepted = false;
      return;
    }

    // Both parties accepted if:
    // - Request status is 'accepted'
    // - My quote status is 'accepted'
    // - My quote is the accepted one
    this.isBothPartiesAccepted = 
      this.ingredientRequest.status === 'accepted' &&
      this.myQuote.status === 'accepted' &&
      this.ingredientRequest.acceptedSupplier?.id === this.currentUserId;
  }

  private async showToast(message: string) {
    const toast = await this.toastController.create({
      message,
      duration: 2000,
      position: 'bottom'
    });
    await toast.present();
  }

  goBack() {
    this.location.back();
  }
}
