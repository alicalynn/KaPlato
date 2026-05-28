import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { IonicModule } from '@ionic/angular';
import { Router } from '@angular/router';
import { HttpClient } from '@angular/common/http';
import { AuthService } from '../../services/auth.service';
import { environment } from '../../../environments/environment';
import { InventoryService, SupplyOrder } from '../../services/inventory.service';

interface InventoryItem {
  id: string;
  product_name: string;
  quantity: number;
  unit: string;
  cost_per_unit: number;
  reorder_level?: number;
  supplier_id?: string;
}

// Note: supplier side uses supply orders (placed from karenderia marketplace),
// not ingredient request bids. Keep this file focused on supply orders + messages.

interface Message {
  id: string;
  from_user_id: string;
  to_user_id: string;
  message: string;
  is_read: boolean;
  created_at: string;
  fromUser?: {
    name: string;
  };
}

@Component({
  selector: 'app-supplier-home',
  standalone: true,
  imports: [CommonModule, FormsModule, IonicModule],
  template: `
    <ion-header [translucent]="true" class="supplier-header">
      <ion-toolbar class="supplier-toolbar">
        <ion-buttons slot="start">
          <ion-menu-button></ion-menu-button>
        </ion-buttons>
        <ion-title>
          <ion-text>
            <strong>Supplier Dashboard</strong>
          </ion-text>
        </ion-title>
        <ion-buttons slot="end">
          <ion-button (click)="logout()" fill="clear" class="supplier-icon-btn" aria-label="Logout">
            <ion-icon name="log-out" slot="start"></ion-icon>
          </ion-button>
        </ion-buttons>
      </ion-toolbar>
    </ion-header>

    <ion-content [fullscreen]="true" class="supplier-content">
      <!-- Welcome Section -->
      <div class="welcome-section">
        <div class="welcome-card">
          <h1>Welcome, {{ currentUser?.name }}!</h1>
          <p>Manage your business efficiently</p>
        </div>
      </div>

      <!-- Tab Selector -->
      <ion-segment [(ngModel)]="activeTab" (ionChange)="onTabChange($event)" class="tab-segment">
        <ion-segment-button value="inventory" layout="icon-bottom">
          <ion-icon name="cube"></ion-icon>
          <ion-label>Inventory</ion-label>
        </ion-segment-button>
        <ion-segment-button value="orders" layout="icon-bottom">
          <ion-icon name="receipt-outline"></ion-icon>
          <ion-label>Orders</ion-label>
        </ion-segment-button>
        <ion-segment-button value="messages" layout="icon-bottom">
          <ion-icon name="chatbubbles"></ion-icon>
          <ion-label>Messages</ion-label>
        </ion-segment-button>
      </ion-segment>

      <!-- INVENTORY TAB -->
      <div *ngIf="activeTab === 'inventory'" class="tab-content">
        <!-- Low Stock Alerts -->
        <ion-card class="section-card" *ngIf="lowStockItems.length > 0">
          <ion-card-header>
            <ion-card-title>
              <ion-icon name="warning" color="warning"></ion-icon>
              Low Stock Alerts
            </ion-card-title>
          </ion-card-header>
          <ion-card-content>
            <div class="low-stock-list">
              <div *ngFor="let item of lowStockItems" class="low-stock-item alert">
                <div class="alert-icon">
                  <ion-icon name="alert-circle" color="warning"></ion-icon>
                </div>
                <div class="alert-content">
                  <h5>{{ item.product_name }}</h5>
                  <p>Only {{ item.quantity }} {{ item.unit }} left</p>
                </div>
                <ion-button 
                  size="small" 
                  fill="outline"
                  (click)="reorderItem(item)"
                >
                  Reorder
                </ion-button>
              </div>
            </div>
          </ion-card-content>
        </ion-card>

        <!-- All Inventory Items -->
        <ion-card class="section-card">
          <ion-card-header>
            <ion-card-title>
              <ion-icon name="cube" color="primary"></ion-icon>
              My Inventory ({{ inventoryItems.length }} items)
            </ion-card-title>
          </ion-card-header>
          <ion-card-content>
            <div *ngIf="inventoryLoading" class="loading">
              <ion-spinner></ion-spinner>
              <p>Loading inventory...</p>
            </div>
            <div *ngIf="!inventoryLoading && inventoryItems.length === 0" class="empty-state">
              <ion-icon name="cube-outline"></ion-icon>
              <p>No inventory items yet</p>
              <ion-button expand="block" (click)="goToInventory()">
                <ion-icon name="add" slot="start"></ion-icon>
                Add Items
              </ion-button>
            </div>
            <div *ngIf="!inventoryLoading && inventoryItems.length > 0">
              <div class="inventory-list">
                <div *ngFor="let item of inventoryItems" class="inventory-item">
                  <div class="item-header">
                    <h4>{{ item.product_name }}</h4>
                    <span class="quantity">{{ item.quantity }} {{ item.unit }}</span>
                  </div>
                  <div class="item-details">
                    <p class="price">₱{{ (item.cost_per_unit || 0).toFixed(2) }} per {{ item.unit }}</p>
                    <p class="total" *ngIf="item.cost_per_unit">Total Value: ₱{{ (item.quantity * item.cost_per_unit).toFixed(2) }}</p>
                  </div>
                  <div class="item-actions">
                    <ion-button size="small" fill="clear" (click)="editItem(item)">
                      <ion-icon name="pencil" slot="start"></ion-icon>
                      Edit
                    </ion-button>
                  </div>
                </div>
              </div>
              <ion-button expand="block" (click)="goToInventory()" style="margin-top: 15px;">
                <ion-icon name="add" slot="start"></ion-icon>
                Add More Items
              </ion-button>
            </div>
          </ion-card-content>
        </ion-card>
      </div>

      <!-- ORDERS TAB -->
      <div *ngIf="activeTab === 'orders'" class="tab-content">
        <ion-card class="section-card">
          <ion-card-header>
            <ion-card-title>
              <ion-icon name="receipt-outline" color="success"></ion-icon>
              Incoming Orders ({{ supplierOrders.length }})
            </ion-card-title>
          </ion-card-header>
          <ion-card-content>
            <div *ngIf="ordersLoading" class="loading">
              <ion-spinner></ion-spinner>
              <p>Loading orders...</p>
            </div>
            <div *ngIf="!ordersLoading && supplierOrders.length === 0" class="empty-state">
              <ion-icon name="receipt-outline"></ion-icon>
              <p>No incoming orders yet</p>
              <p class="empty-hint">Orders placed by karenderias will appear here.</p>
            </div>
            <div *ngIf="!ordersLoading && supplierOrders.length > 0">
              <div class="requests-list">
                <ion-card 
                  *ngFor="let order of supplierOrders" 
                  class="request-card"
                  (click)="openInInventoryManagement($event)"
                >
                  <ion-card-content>
                    <div class="request-header">
                      <h5>{{ order.karenderia?.business_name || order.karenderia?.name || 'Karenderia' }}</h5>
                      <span class="request-status" [ngClass]="order.status">
                        {{ order.status | titlecase }}
                      </span>
                    </div>
                    <div class="request-details">
                      <div class="detail-row">
                        <span class="label">Order #:</span>
                        <span class="value">#{{ order.id }}</span>
                      </div>
                      <div class="detail-row">
                        <span class="label">Items:</span>
                        <span class="value">{{ order.items.length || 0 }}</span>
                      </div>
                      <div class="detail-row">
                        <span class="label">Total:</span>
                        <span class="value budget">₱{{ (order.total_amount || 0).toFixed(2) }}</span>
                      </div>
                      <div class="detail-row">
                        <span class="label">Placed:</span>
                        <span class="value">{{ order.created_at | date:'MMM dd, yyyy' }}</span>
                      </div>
                    </div>
                    <div class="request-actions">
                      <ion-button 
                        expand="block" 
                        size="small"
                        (click)="openInInventoryManagement($event)"
                      >
                        <ion-icon name="open-outline" slot="start"></ion-icon>
                        Open Orders
                      </ion-button>
                      <ion-button 
                        expand="block" 
                        fill="outline"
                        size="small"
                        (click)="openInInventoryManagement($event)"
                      >
                        <ion-icon name="settings-outline" slot="start"></ion-icon>
                        Manage
                      </ion-button>
                    </div>
                  </ion-card-content>
                </ion-card>
              </div>
            </div>
          </ion-card-content>
        </ion-card>
      </div>

      <!-- MESSAGES TAB -->
      <div *ngIf="activeTab === 'messages'" class="tab-content">
        <ion-card class="section-card">
          <ion-card-header>
            <ion-card-title>
              <ion-icon name="chatbubbles" color="tertiary"></ion-icon>
              Messages ({{ recentMessages.length }})
            </ion-card-title>
          </ion-card-header>
          <ion-card-content>
            <div *ngIf="messagesLoading" class="loading">
              <ion-spinner></ion-spinner>
              <p>Loading messages...</p>
            </div>
            <div *ngIf="!messagesLoading && recentMessages.length === 0" class="empty-state">
              <ion-icon name="chatbubbles-outline"></ion-icon>
              <p>No messages yet</p>
              <p class="empty-hint">Start bidding on requests to connect with karenderias</p>
            </div>
            <div *ngIf="!messagesLoading && recentMessages.length > 0">
              <div class="messages-list">
                <div 
                  *ngFor="let msg of recentMessages" 
                  class="message-item"
                  [ngClass]="{ 'unread': !msg.is_read }"
                  (click)="viewConversation(msg)"
                >
                  <div class="message-avatar">
                    <ion-icon name="person-circle"></ion-icon>
                  </div>
                  <div class="message-content">
                    <h5>{{ msg.fromUser?.name || 'Owner' }}</h5>
                    <p class="message-preview">{{ msg.message | slice:0:50 }}...</p>
                    <span class="message-date">{{ msg.created_at | date:'short' }}</span>
                  </div>
                  <div *ngIf="!msg.is_read" class="unread-badge"></div>
                </div>
              </div>
            </div>
          </ion-card-content>
        </ion-card>
      </div>

      <!-- Bottom Padding -->
      <div style="height: 30px;"></div>
    </ion-content>
  `,
  styles: [`
    :host {
      --supplier-green-50: #f0fdf4;
      --supplier-green-100: #dcfce7;
      --supplier-green-600: #16a34a;
      --supplier-green-700: #15803d;
      --supplier-green-800: #166534;
      --supplier-surface: rgba(255, 255, 255, 0.96);
      --supplier-border: rgba(15, 23, 42, 0.10);
      --supplier-text: #0f172a;
      --supplier-muted: #64748b;
    }

    .supplier-header {
      --background: transparent;
    }

    .supplier-toolbar {
      --background: linear-gradient(135deg, var(--supplier-green-700) 0%, #22c55e 55%, #86efac 140%);
      --color: white;
      min-height: 60px;
      box-shadow: 0 4px 20px rgba(22, 163, 74, 0.25);
    }

    .supplier-icon-btn {
      --color: white;
      --background: rgba(255, 255, 255, 0.12);
      --border-radius: 10px;
      backdrop-filter: blur(10px);
    }

    ion-content.supplier-content {
      --padding-start: 0;
      --padding-end: 0;
      --padding-top: 0;
      --padding-bottom: 0;
      --background: linear-gradient(180deg, var(--supplier-green-50) 0%, #ffffff 60%, #ffffff 100%);
    }

    .welcome-section {
      padding: 20px;
      background: linear-gradient(135deg, var(--supplier-green-800) 0%, var(--supplier-green-600) 55%, #34d399 120%);
      color: #ffffff;
      padding-bottom: 18px;
    }

    .welcome-card {
      text-align: center;
    }

    .welcome-card h1 {
      font-size: 1.8rem;
      margin: 10px 0 5px;
      font-weight: 800;
      letter-spacing: -0.02em;
    }

    .welcome-card p {
      opacity: 0.9;
      margin: 0;
      font-weight: 500;
    }

    .stats-container {
      display: flex;
      justify-content: space-around;
      padding: 15px;
      margin: 15px;
      border-radius: 12px;
      background: var(--supplier-surface);
      box-shadow: 0 10px 24px rgba(15, 23, 42, 0.08);
      border: 1px solid var(--supplier-border);
    }

    .stat-item {
      text-align: center;
      flex: 1;
    }

    .stat-value {
      font-size: 2rem;
      font-weight: 700;
      color: var(--supplier-green-700);
    }

    .stat-label {
      font-size: 0.8rem;
      color: var(--supplier-muted);
      margin-top: 5px;
      font-weight: 600;
    }

    .tab-segment {
      margin: 15px;
      margin-top: -12px;
      border-radius: 12px;
      background: var(--supplier-surface);
      padding: 8px;
      box-shadow: 0 10px 24px rgba(15, 23, 42, 0.08);
      border: 1px solid var(--supplier-border);

      --background: transparent;
      --indicator-color: transparent;
      --border-radius: 12px;
    }

    .tab-segment ion-segment-button {
      --border-radius: 10px;
      --color: var(--supplier-muted);
      --color-checked: white;
      --background-checked: linear-gradient(135deg, var(--supplier-green-700), #22c55e);
      --indicator-color: transparent;
      font-weight: 800;
      letter-spacing: -0.01em;
    }

    .tab-segment ion-segment-button ion-icon {
      color: inherit;
    }

    .tab-content {
      animation: fadeIn 0.3s ease-in;
    }

    @keyframes fadeIn {
      from {
        opacity: 0;
      }
      to {
        opacity: 1;
      }
    }

    .section-card {
      margin: 15px;
      border-radius: 12px;
      overflow: hidden;
      box-shadow: 0 10px 24px rgba(15, 23, 42, 0.08);
      border: 1px solid var(--supplier-border);
    }

    ion-card-header {
      background: linear-gradient(135deg, rgba(22, 163, 74, 0.10) 0%, rgba(134, 239, 172, 0.18) 100%);
      padding: 15px;
      ion-card-title {
        display: flex;
        align-items: center;
        gap: 10px;
        font-weight: 600;
        color: var(--supplier-text);
        ion-icon {
          font-size: 1.3rem;
        }
      }
    }

    ion-card-content {
      padding: 15px;
    }

    .loading {
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      padding: 30px;
      color: #888;

      ion-spinner {
        margin-bottom: 10px;
      }
    }

    .empty-state {
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      padding: 30px;
      color: var(--supplier-muted);
      text-align: center;

      ion-icon {
        font-size: 3rem;
        color: rgba(22, 163, 74, 0.25);
        margin-bottom: 10px;
      }

      .empty-hint {
        font-size: 0.85rem;
        color: #94a3b8;
        margin-top: 5px;
      }
    }

    .inventory-list {
      display: flex;
      flex-direction: column;
      gap: 10px;
    }

    .inventory-item {
      padding: 12px;
      border: 1px solid #e0e0e0;
      border-radius: 8px;
      background: #fafafa;

      .item-header {
        display: flex;
        justify-content: space-between;
        align-items: center;
        margin-bottom: 8px;

        h4 {
          margin: 0;
          font-size: 0.95rem;
          color: #333;
        }

        .quantity {
          background: linear-gradient(135deg, var(--supplier-green-700), #22c55e);
          color: white;
          padding: 4px 8px;
          border-radius: 4px;
          font-size: 0.75rem;
          font-weight: 600;
        }
      }

      .item-footer {
        .price {
          margin: 0;
          font-size: 0.85rem;
          color: #666;
        }
      }

      .item-details {
        margin-bottom: 8px;

        .price {
          margin: 0 0 4px;
          font-size: 0.85rem;
          color: #666;
        }

        .total {
          margin: 0;
          font-size: 0.85rem;
          color: #28a745;
          font-weight: 600;
        }
      }

      .item-actions {
        display: flex;
        gap: 8px;

        ion-button {
          flex: 1;
          margin: 0;
        }
      }
    }

    .low-stock-list {
      display: flex;
      flex-direction: column;
      gap: 12px;
    }

    .low-stock-item {
      display: flex;
      align-items: center;
      gap: 12px;
      padding: 12px;
      border-radius: 8px;
      background: #fff3cd;
      border: 1px solid #ffc107;

      .alert-icon {
        flex-shrink: 0;
        ion-icon {
          font-size: 1.5rem;
        }
      }

      .alert-content {
        flex: 1;

        h5 {
          margin: 0 0 4px;
          font-size: 0.95rem;
          color: #333;
        }

        p {
          margin: 0;
          font-size: 0.85rem;
          color: #666;
        }
      }
    }

    .requests-list {
      display: flex;
      flex-direction: column;
      gap: 12px;
    }

    .request-card {
      cursor: pointer;
      transition: all 0.3s ease;
      border-left: 4px solid var(--supplier-green-700);

      &:hover {
        transform: translateY(-2px);
        box-shadow: 0 14px 30px rgba(22, 163, 74, 0.18);
      }

      ion-card-content {
        padding: 12px;
      }

      .request-header {
        display: flex;
        justify-content: space-between;
        align-items: flex-start;
        margin-bottom: 12px;

        h5 {
          margin: 0;
          font-size: 0.95rem;
          color: #333;
          flex: 1;
        }

        .request-status {
          padding: 4px 8px;
          border-radius: 4px;
          font-size: 0.7rem;
          font-weight: 600;
          white-space: nowrap;
          margin-left: 8px;

          &.open {
            background: #d4edda;
            color: #155724;
          }

          &.accepted {
            background: #cce5ff;
            color: #004085;
          }

          &.completed {
            background: #e8e8e8;
            color: #555;
          }
        }
      }

      .request-details {
        margin-bottom: 12px;
      }

      .detail-row {
        display: flex;
        justify-content: space-between;
        margin-bottom: 6px;
        font-size: 0.85rem;

        .label {
          color: #888;
          font-weight: 500;
        }

        .value {
          color: #333;
          font-weight: 500;

          &.budget {
            color: #28a745;
            font-weight: 600;
          }
        }
      }

      .request-actions {
        display: flex;
        gap: 8px;

        ion-button {
          flex: 1;
          margin: 0;
          --padding-start: 8px;
          --padding-end: 8px;
        }
      }
    }

    .messages-list {
      display: flex;
      flex-direction: column;
      gap: 0;
    }

    .message-item {
      display: flex;
      align-items: center;
      gap: 12px;
      padding: 12px;
      border-bottom: 1px solid #e0e0e0;
      cursor: pointer;
      transition: background 0.2s ease;

      &:hover {
        background: #f9f9f9;
      }

      &.unread {
        background: rgba(22, 163, 74, 0.08);
        font-weight: 600;
      }

      &:last-child {
        border-bottom: none;
      }

      .message-avatar {
        flex-shrink: 0;
        ion-icon {
          font-size: 2rem;
          color: var(--supplier-green-700);
        }
      }

      .message-content {
        flex: 1;
        min-width: 0;

        h5 {
          margin: 0 0 4px;
          font-size: 0.95rem;
          color: #333;
        }

        .message-preview {
          margin: 0 0 4px;
          font-size: 0.85rem;
          color: #888;
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
        }

        .message-date {
          font-size: 0.75rem;
          color: #bbb;
        }
      }

      .unread-badge {
        width: 8px;
        height: 8px;
        border-radius: 50%;
        background: var(--supplier-green-700);
        flex-shrink: 0;
      }
    }

    ion-button {
      --border-radius: 8px;
      text-transform: none;
      font-weight: 600;
    }
  `]
})
export class SupplierHomePage implements OnInit {
  currentUser: any;
  activeTab: string = 'inventory';
  
  // Inventory
  inventoryItems: InventoryItem[] = [];
  inventoryLoading = false;
  lowStockItems: InventoryItem[] = [];

  // Orders (supply orders placed by karenderias)
  supplierOrders: SupplyOrder[] = [];
  ordersLoading = false;

  // Messages
  recentMessages: Message[] = [];
  messagesLoading = false;
  unreadMessages = 0;

  private apiUrl = environment.apiUrl;

  constructor(
    private http: HttpClient,
    private router: Router,
    private authService: AuthService,
    private inventoryService: InventoryService
  ) {
    this.currentUser = this.authService.getCurrentUser();
  }

  ngOnInit() {
    // Check if user is authenticated
    if (!this.authService.isAuthenticated()) {
      console.log('User not authenticated, redirecting to login');
      this.router.navigate(['/login']);
      return;
    }
    this.loadDashboardData();
  }

  onTabChange(event: any) {
    this.activeTab = event.detail.value;
    console.log('Tab changed to:', this.activeTab);
  }

  loadDashboardData() {
    this.loadInventory();
    this.loadSupplierOrders();
    this.loadRecentMessages();
  }

  loadInventory() {
    this.inventoryLoading = true;
    this.http.get<any[]>(`${this.apiUrl}/inventory`, {
      headers: { Authorization: `Bearer ${this.authService.getAuthToken()}` }
    }).subscribe({
      next: (items) => {
        this.inventoryItems = items || [];
        this.lowStockItems = this.inventoryItems.filter(item => 
          item.reorder_level && item.quantity <= item.reorder_level
        );
        this.inventoryLoading = false;
      },
      error: (err) => {
        console.error('Error loading inventory:', err);
        this.inventoryLoading = false;
      }
    });
  }

  loadSupplierOrders() {
    this.ordersLoading = true;
    this.inventoryService.getSupplierSupplyOrders().subscribe({
      next: (response: any) => {
        // API shape across the app typically returns { data: [...] }
        this.supplierOrders = response?.data || response || [];
        this.ordersLoading = false;
      },
      error: (err) => {
        console.error('Error loading supplier orders:', err);
        this.supplierOrders = [];
        this.ordersLoading = false;
      }
    });
  }

  loadRecentMessages() {
    this.messagesLoading = true;
    this.http.get<any>(`${this.apiUrl}/messages/conversations`, {
      headers: { Authorization: `Bearer ${this.authService.getAuthToken()}` }
    }).subscribe({
      next: (data) => {
        this.recentMessages = (data?.messages || []).slice(0, 5);
        this.messagesLoading = false;
        this.getUnreadCount();
      },
      error: (err) => {
        console.error('Error loading messages:', err);
        this.messagesLoading = false;
      }
    });
  }

  getUnreadCount() {
    this.http.get<any>(`${this.apiUrl}/messages/unread`, {
      headers: { Authorization: `Bearer ${this.authService.getAuthToken()}` }
    }).subscribe({
      next: (data) => {
        this.unreadMessages = data?.count || 0;
      },
      error: (err) => console.error('Error getting unread count:', err)
    });
  }

  goToInventory() {
    this.router.navigate(['/inventory-management']);
  }

  reorderItem(item: InventoryItem) {
    // TODO: Implement reorder functionality
    console.log('Reorder item:', item);
  }

  editItem(item: InventoryItem) {
    this.router.navigate(['/inventory-management'], { queryParams: { itemId: item.id } });
  }

  openInInventoryManagement(event?: any) {
    if (event?.stopPropagation) {
      event.stopPropagation();
    }
    // Inventory Management already has a supplier orders segment; we deep-link to it.
    this.router.navigate(['/inventory-management'], { queryParams: { segment: 'supplier-orders' } });
  }

  viewConversation(message: Message) {
    this.router.navigate(['/messages'], { 
      queryParams: { userId: message.from_user_id } 
    });
  }

  goToMessages() {
    this.router.navigate(['/messages']);
  }

  async logout() {
    await this.authService.logoutWithConfirmation();
  }
}
