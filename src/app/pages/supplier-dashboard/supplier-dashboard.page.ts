import { Component, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import { CommonModule } from '@angular/common';
import { IonicModule } from '@ionic/angular';
import { AuthService, User } from '../../services/auth.service';
import { InventoryService, SupplyOrder } from '../../services/inventory.service';

interface PendingOrderGroup {
  karenderiaId: number;
  karenderiaName: string;
  ordersCount: number;
  orders: SupplyOrder[];
}

@Component({
  selector: 'app-supplier-dashboard',
  standalone: true,
  imports: [CommonModule, IonicModule],
  template: `
    <ion-header [translucent]="true" class="modern-header">
      <ion-toolbar class="gradient-toolbar">
        <ion-buttons slot="start">
          <ion-back-button (click)="goBack()" defaultHref="/home"></ion-back-button>
        </ion-buttons>
        <ion-title>
          <div class="header-title">
            <ion-icon name="storefront" color="light"></ion-icon>
            <span>Supplier Portal</span>
          </div>
        </ion-title>
        <ion-buttons slot="end">
          <ion-button (click)="goToProfile()" fill="clear" class="profile-btn">
            <ion-avatar slot="icon-only" class="profile-avatar">
              <ion-icon name="person-circle" color="light"></ion-icon>
            </ion-avatar>
          </ion-button>
          <ion-button (click)="logout()" fill="clear" color="light" class="logout-btn">
            <ion-icon name="log-out-outline"></ion-icon>
          </ion-button>
        </ion-buttons>
      </ion-toolbar>
    </ion-header>

    <ion-content [fullscreen]="true" class="modern-dashboard">
      <div class="dashboard-content">
        <!-- Welcome Header -->
        <div class="welcome-header">
          <div class="welcome-content">
            <h1>Welcome, {{ currentUser?.name }}!</h1>
            <p>Manage your supplies and ingredient requests</p>
          </div>
        </div>

        <!-- Quick Actions -->
        <div class="actions-section">
          <h2 class="section-title">Quick Actions</h2>
          
          <div class="action-card" (click)="goToInventory()">
            <ion-icon name="package-outline" class="icon"></ion-icon>
            <div class="action-content">
              <h3>My Inventory</h3>
              <p>Manage your stock & availability</p>
            </div>
            <ion-icon name="chevron-forward"></ion-icon>
          </div>

          <div class="action-card" (click)="goToRequests()">
            <ion-icon name="list-outline" class="icon"></ion-icon>
            <div class="action-content">
              <h3>Ingredient Requests</h3>
              <p>Browse available requests</p>
            </div>
            <ion-icon name="chevron-forward"></ion-icon>
          </div>

          <div class="action-card" (click)="goToQuotes()">
            <ion-icon name="document-text-outline" class="icon"></ion-icon>
            <div class="action-content">
              <h3>My Quotes</h3>
              <p>Track your offers & status</p>
            </div>
            <ion-icon name="chevron-forward"></ion-icon>
          </div>

          <div class="action-card" (click)="goToMessages()">
            <ion-icon name="chatbubbles-outline" class="icon"></ion-icon>
            <div class="action-content">
              <h3>Messages</h3>
              <p>Communicate with buyers</p>
            </div>
            <ion-icon name="chevron-forward"></ion-icon>
          </div>
        </div>

        <!-- Info Section -->
        <div class="info-section">
          <ion-card>
            <ion-card-header>
              <ion-card-title>About Your Account</ion-card-title>
            </ion-card-header>
            <ion-card-content>
              <div class="info-row">
                <span class="label">Role:</span>
                <span class="value">Supplier</span>
              </div>
              <div class="info-row">
                <span class="label">Email:</span>
                <span class="value">{{ currentUser?.email }}</span>
              </div>
              <div class="info-row">
                <span class="label">Status:</span>
                <ion-badge color="success">Active</ion-badge>
              </div>
            </ion-card-content>
          </ion-card>
        </div>

        <!-- Pending Orders Section -->
        <div class="pending-orders-section">
          <h2 class="section-title">Pending Orders from Karenderias</h2>
          
          <div *ngIf="pendingOrderGroups.length === 0" class="empty-pending">
            <ion-icon name="checkmark-circle-outline"></ion-icon>
            <p>No pending orders at the moment</p>
          </div>

          <ion-card *ngFor="let group of pendingOrderGroups" class="pending-order-card">
            <ion-card-header>
              <ion-card-title>{{ group.karenderiaName }}</ion-card-title>
              <ion-card-subtitle>{{ group.ordersCount }} pending order(s)</ion-card-subtitle>
            </ion-card-header>
            <ion-card-content>
              <div *ngFor="let order of group.orders" class="order-item">
                <p><strong>Order #{{ order.id }}</strong> - {{ order.items?.length || 0 }} items</p>
                <p>Total: ₱{{ order.total_amount | number:'1.2-2' }}</p>
              </div>
              <div class="order-actions">
                <ion-button 
                  fill="outline" 
                  color="primary" 
                  (click)="messageKarenderia(group)">
                  <ion-icon name="chatbubbles-outline" slot="start"></ion-icon>
                  Message
                </ion-button>
                <ion-button 
                  fill="outline" 
                  color="success" 
                  (click)="goToOrders()">
                  <ion-icon name="checkmark-circle-outline" slot="start"></ion-icon>
                  View All Orders
                </ion-button>
              </div>
            </ion-card-content>
          </ion-card>
        </div>
      </div>
    </ion-content>
  `,
  styles: [`
    .modern-header {
      --background: transparent;
    }

    .gradient-toolbar {
      --background: linear-gradient(135deg, #166534 0%, #16a34a 55%, #86efac 140%);
      --padding-start: 0;
      --padding-end: 0;
      min-height: 60px;
    }

    .header-title {
      display: flex;
      align-items: center;
      gap: 10px;
      font-weight: 700;
      font-size: 1.1rem;
    }

    .profile-avatar {
      width: 32px;
      height: 32px;
    }

    .modern-dashboard {
      --background: linear-gradient(180deg, #f0fdf4 0%, #ffffff 65%, #ffffff 100%);
    }

    .dashboard-content {
      padding: 16px;
      max-width: 600px;
      margin: 0 auto;
    }

    .welcome-header {
      padding: 20px;
      background: linear-gradient(135deg, #166534 0%, #16a34a 55%, #34d399 120%);
      border-radius: 12px;
      color: white;
      margin-bottom: 24px;
    }

    .welcome-header h1 {
      font-size: 1.5rem;
      font-weight: 700;
      margin: 0 0 8px 0;
    }

    .welcome-header p {
      font-size: 0.9rem;
      opacity: 0.9;
      margin: 0;
    }

    .section-title {
      font-size: 1.1rem;
      font-weight: 700;
      color: #1f2937;
      margin-bottom: 16px;
      margin-top: 24px;
    }

    .actions-section {
      margin-bottom: 24px;
    }

    .action-card {
      display: flex;
      align-items: center;
      gap: 16px;
      padding: 16px;
      background: white;
      border-radius: 12px;
      border: 1px solid #e5e7eb;
      margin-bottom: 12px;
      cursor: pointer;
      transition: all 0.3s ease;
    }

    .action-card:hover {
      background: #f9fafb;
      border-color: #d1d5db;
      transform: translateX(4px);
      box-shadow: 0 4px 12px rgba(0, 0, 0, 0.08);
    }

    .action-card .icon {
      font-size: 24px;
      color: #16a34a;
      flex-shrink: 0;
    }

    .action-content {
      flex: 1;
    }

    .action-content h3 {
      font-size: 1rem;
      font-weight: 600;
      color: #1f2937;
      margin: 0 0 4px 0;
    }

    .action-content p {
      font-size: 0.85rem;
      color: #6b7280;
      margin: 0;
    }

    .info-section {
      margin-top: 24px;
    }

    ion-card {
      box-shadow: 0 2px 8px rgba(0, 0, 0, 0.08);
    }

    ion-card-header {
      padding: 16px;
      border-bottom: 1px solid #e5e7eb;
    }

    ion-card-title {
      font-weight: 700;
      font-size: 1rem;
    }

    ion-card-content {
      padding: 16px;
    }

    .info-row {
      display: flex;
      justify-content: space-between;
      align-items: center;
      padding: 12px 0;
      border-bottom: 1px solid #f3f4f6;
    }

    .info-row:last-child {
      border-bottom: none;
    }

    .label {
      font-weight: 600;
      color: #6b7280;
      font-size: 0.9rem;
    }

    .value {
      color: #1f2937;
      font-weight: 500;
    }

    ion-badge {
      --padding-start: 8px;
      --padding-end: 8px;
    }

    .pending-orders-section {
      margin-top: 24px;
    }

    .empty-pending {
      text-align: center;
      padding: 32px 16px;
      color: #9ca3af;
    }

    .empty-pending ion-icon {
      font-size: 48px;
      color: #d1d5db;
      display: block;
      margin-bottom: 12px;
    }

    .pending-order-card {
      margin-bottom: 12px;
      border-left: 4px solid #fbbf24;
    }

    .order-item {
      padding: 8px 0;
      border-bottom: 1px solid #f3f4f6;
    }

    .order-item:last-child {
      border-bottom: none;
    }

    .order-item p {
      margin: 4px 0;
      font-size: 0.9rem;
      color: #4b5563;
    }

    .order-actions {
      display: flex;
      gap: 8px;
      margin-top: 12px;
      flex-wrap: wrap;
    }

    .order-actions ion-button {
      flex: 1;
      min-width: 120px;
    }
  `]
})
export class SupplierDashboardPage implements OnInit {
  currentUser: User | null = null;
  pendingOrderGroups: PendingOrderGroup[] = [];

  constructor(
    private authService: AuthService,
    private router: Router,
    private inventoryService: InventoryService
  ) {}

  ngOnInit() {
    this.currentUser = this.authService.getCurrentUser();
    this.loadPendingOrders();
  }

  async loadPendingOrders() {
    try {
      const response = await this.inventoryService.getSupplierSupplyOrders().toPromise();
      const supplierOrders = response?.data || [];
      
      // Group orders by karenderia with 'pending' status
      const groupMap = new Map<number, PendingOrderGroup>();
      
      supplierOrders.forEach((order: SupplyOrder) => {
        if (order.status === 'pending') {
          const karenderiaId = order.karenderia_id;
          const karenderiaName = order.karenderia?.business_name || order.karenderia?.name || `Karenderia #${karenderiaId}`;
          
          if (!groupMap.has(karenderiaId)) {
            groupMap.set(karenderiaId, {
              karenderiaId,
              karenderiaName,
              ordersCount: 0,
              orders: []
            });
          }
          
          const group = groupMap.get(karenderiaId)!;
          group.ordersCount++;
          group.orders.push(order);
        }
      });
      
      this.pendingOrderGroups = Array.from(groupMap.values());
    } catch (error) {
      console.error('Error loading pending orders:', error);
      this.pendingOrderGroups = [];
    }
  }

  messageKarenderia(group: PendingOrderGroup) {
    // Navigate to the first pending order's messaging page
    if (group.orders.length > 0) {
      this.router.navigate(['/inventory-management'], {
        queryParams: {
          segment: 'supplier-orders',
          openMessaging: group.orders[0].id
        }
      });
    }
  }

  goToOrders() {
    this.router.navigate(['/inventory-management'], {
      queryParams: { segment: 'supplier-orders' }
    });
  }

  goBack() {
    this.router.navigate(['/home']);
  }

  goToInventory() {
    this.router.navigate(['/inventory-management']);
  }

  goToRequests() {
    this.router.navigate(['/api/ingredient-requests/supplier/available']); // or create a proper page
  }

  goToQuotes() {
    this.router.navigate(['/api/supplier-quotes/my-quotes']); // or create a proper page
  }

  goToMessages() {
    this.router.navigate(['/supplier-home'], { queryParams: { tab: 'messages' } });
  }

  goToProfile() {
    this.router.navigate(['/profile']);
  }

  async logout() {
    await this.authService.logoutWithConfirmation();
  }
}
