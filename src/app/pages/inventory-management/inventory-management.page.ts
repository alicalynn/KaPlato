import { CommonModule } from '@angular/common';
import { Component, OnInit } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { IonicModule, AlertController, LoadingController, ToastController, ModalController } from '@ionic/angular';
import { ActivatedRoute } from '@angular/router';
import {
  InventoryService,
  InventoryItem,
  InventoryStats,
  CreateInventoryData,
  CreateSupplierListingData,
  SupplierListing,
  SupplyOrder,
  SukiSupplier,
} from '../../services/inventory.service';
import { AuthService } from '../../services/auth.service';
import { SupplyOrderMessagingService } from '../../services/supply-order-messaging.service';
import { SupplyOrderMessagingPage } from '../supply-order-messaging/supply-order-messaging.page';
import { SupplyOrderPaymentModalPage } from '../supply-order-payment-modal/supply-order-payment-modal.page';
import { OwnerShellComponent } from '../../components/owner-shell/owner-shell.component';

interface CartItem {
  listing: SupplierListing;
  quantity: number;
}

interface SupplierUiPage {
  page: string;
  purpose: string;
  status: 'Complete' | 'In Progress' | 'Incomplete';
}

@Component({
  selector: 'app-inventory-management',
  templateUrl: './inventory-management.page.html',
  styleUrls: ['./inventory-management.page.scss'],
  standalone: true,
  imports: [CommonModule, FormsModule, IonicModule, OwnerShellComponent]
})
export class InventoryManagementPage implements OnInit {
  userRole: 'customer' | 'karenderia_owner' | 'admin' | 'supplier' = 'customer';

  inventoryItems: InventoryItem[] = [];
  stats: InventoryStats = {
    total_items: 0,
    total_value: 0,
    low_stock_count: 0,
    out_of_stock_count: 0,
    categories: []
  };
  isLoading = false;
  selectedSegment: 'inventory' | 'alerts' | 'marketplace' | 'owner-orders' | 'supplier-listings' | 'supplier-orders' = 'inventory';
  filteredItems: InventoryItem[] = [];
  selectedCategory = 'all';

  marketplaceListings: SupplierListing[] = [];
  visibleMarketplaceListings: SupplierListing[] = [];
  supplierListings: SupplierListing[] = [];
  ownerOrders: SupplyOrder[] = [];
  supplierOrders: SupplyOrder[] = [];
  cart: CartItem[] = [];
  marketplaceSearch = '';
  private marketplaceSearchDebounceTimer: ReturnType<typeof setTimeout> | null = null;
  marketplaceCategory = '';
  marketplaceSukiOnly = false;
  sukiSuppliers: SukiSupplier[] = [];
  isSeedingSupplierSamples = false;
  showSupplyOrderForm = false;
  supplyNotes = '';
  supplyDeliveryDate = '';
  supplyMinDate = '';
  selectedSupplyPaymentMethod: 'cod' | 'paymaya_sandbox' | 'paypal_sandbox' = 'cod';
  
  // Order review/summary state
  pendingPaymentData: any = null;
  showOrderReview = false;

  // Message notification tracking
  unreadMessageCountMap = new Map<number, number>();
  isEditInventoryModalOpen = false;
  editingInventoryItemId: number | null = null;
  isRestockModalOpen = false;
  restockItemId: number | null = null;
  restockItemName = '';
  restockUnit = '';
  restockCurrentStock = 0;
  restockForm = {
    quantity: null as number | null,
    unit_cost: null as number | null,
  };
  editInventoryForm = {
    item_name: '',
    description: '',
    category: '',
    unit: '',
    current_stock: 0,
    minimum_stock: 0,
    maximum_stock: null as number | null,
    unit_cost: 0,
    supplier: '',
    expiry_date: '',
    notes: '',
  };

  supplierUiPages: SupplierUiPage[] = [
    { page: 'Supplier Listings', purpose: 'Manage inventory listings, pricing, and stock', status: 'In Progress' },
    { page: 'Incoming Orders', purpose: 'Receive and fulfill owner orders', status: 'In Progress' },
    { page: 'Promo Tags', purpose: 'Highlight discounts and bundle deals', status: 'Incomplete' },
    { page: 'Suki Clients', purpose: 'Mark and manage trusted regular buyers', status: 'Incomplete' },
  ];

  supplierSampleCatalog: CreateSupplierListingData[] = [
    { item_name: 'Fresh Chicken Breast', description: 'Daily-cut chicken breast for adobo, tinola, and fried meals.', category: 'Meat', unit: 'kg', price_per_unit: 190, available_stock: 80, minimum_order_quantity: 2 },
    { item_name: 'Pork Kasim', description: 'Good for menudo, sinigang, and pork stew dishes.', category: 'Meat', unit: 'kg', price_per_unit: 210, available_stock: 70, minimum_order_quantity: 2 },
    { item_name: 'Whole Tilapia', description: 'Fresh tilapia sourced from local fish growers.', category: 'Seafood', unit: 'kg', price_per_unit: 165, available_stock: 90, minimum_order_quantity: 3 },
    { item_name: 'Cooking Oil', description: 'All-purpose vegetable cooking oil.', category: 'Pantry', unit: 'liter', price_per_unit: 78, available_stock: 200, minimum_order_quantity: 5 },
    { item_name: 'Soy Sauce', description: 'Local soy sauce for marinade and seasoning.', category: 'Pantry', unit: 'liter', price_per_unit: 62, available_stock: 150, minimum_order_quantity: 3 },
    { item_name: 'Garlic', description: 'Fresh garlic bulbs for aromatics and sauces.', category: 'Produce', unit: 'kg', price_per_unit: 120, available_stock: 60, minimum_order_quantity: 1 },
    { item_name: 'White Onion', description: 'Medium white onions for sauté and soup bases.', category: 'Produce', unit: 'kg', price_per_unit: 95, available_stock: 70, minimum_order_quantity: 1 },
    { item_name: 'Tomato', description: 'Ripe tomatoes for stews and daily menus.', category: 'Produce', unit: 'kg', price_per_unit: 85, available_stock: 90, minimum_order_quantity: 1 },
    { item_name: 'Calamansi', description: 'Fresh calamansi for dipping sauces and marinades.', category: 'Produce', unit: 'kg', price_per_unit: 110, available_stock: 45, minimum_order_quantity: 1 },
    { item_name: 'Jasmine Rice', description: 'Premium rice ideal for all-day karenderia service.', category: 'Grains', unit: 'sack', price_per_unit: 1820, available_stock: 35, minimum_order_quantity: 1 },
    { item_name: 'Brown Sugar', description: 'For sauces, marinades, and sweet dishes.', category: 'Pantry', unit: 'kg', price_per_unit: 74, available_stock: 80, minimum_order_quantity: 2 },
    { item_name: 'Disposable Meal Box (25 pcs)', description: 'Takeout meal boxes bundled in packs of 25.', category: 'Packaging', unit: 'pack', price_per_unit: 95, available_stock: 120, minimum_order_quantity: 2 },
  ];

  constructor(
    private inventoryService: InventoryService,
    private authService: AuthService,
    private alertController: AlertController,
    private loadingController: LoadingController,
    private toastController: ToastController,
    private modalController: ModalController,
    private messagingService: SupplyOrderMessagingService,
    private route: ActivatedRoute
  ) { }

  getBackRoute(): string {
    return this.userRole === 'supplier' ? '/home' : '/karenderia-dashboard';
  }

  ngOnInit() {
    this.checkAuthentication();
    this.supplyMinDate = this.formatDateAsYYYYMMDD(new Date());
    console.log('[InventoryPage] ngOnInit - userRole:', this.userRole);

    if (this.userRole === 'karenderia_owner') {
      this.selectedSegment = 'inventory';
      this.loadInventory();
      this.loadMarketplaceListings();
      this.loadOwnerOrders();
      this.loadSukiSuppliers();
      return;
    }

    if (this.userRole === 'supplier') {
      const requestedSegment = this.route.snapshot.queryParamMap.get('segment');
      const validSupplierSegments: Array<typeof this.selectedSegment> = ['supplier-listings', 'supplier-orders'];
      this.selectedSegment = (requestedSegment && validSupplierSegments.includes(requestedSegment as any))
        ? (requestedSegment as any)
        : 'supplier-listings';
      console.log('[InventoryPage] Supplier mode - selectedSegment:', this.selectedSegment);
      this.loadSupplierListings();
      this.loadSupplierOrders();
      return;
    }

    console.log('[InventoryPage] Invalid role:', this.userRole);
    this.showToast('This page is only available for karenderia owners and suppliers.', 'warning');
  }

  private formatDateAsYYYYMMDD(d: Date): string {
    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  }

  async ionViewWillEnter() {
    this.checkAuthentication();

    if (this.userRole === 'karenderia_owner') {
      this.loadInventory();
      this.loadMarketplaceListings();
      this.loadOwnerOrders();
      this.loadSukiSuppliers();
      return;
    }

    if (this.userRole === 'supplier') {
      this.loadSupplierListings();
      this.loadSupplierOrders();
    }
  }

  private checkAuthentication() {
    const token = localStorage.getItem('auth_token');
    this.userRole = (this.authService.getCurrentUser()?.role as any) || 'customer';
    
    if (!token) {
      this.showToast('Please log in to access inventory management', 'danger');
    }
  }

  async loadInventory() {
    this.isLoading = true;
    try {
      const response = await this.inventoryService.getInventory().toPromise();
      this.inventoryItems = response.data || [];
      this.stats = response.stats || this.stats;
      this.applyFilter();
      
      if (this.inventoryItems.length === 0) {
        this.showToast('No inventory items found. Start by adding some ingredients!', 'warning');
      }
    } catch (error: any) {
      console.error('Error loading inventory:', error);
      
      if (error.status === 401) {
        this.showToast('Authentication failed. Please log in again.', 'danger');
      } else if (error.status === 403) {
        this.showToast('Access denied. You need a karenderia account to manage inventory.', 'danger');
      } else if (error.status === 0) {
        this.showToast('Unable to connect to server. Please check your internet connection.', 'danger');
      } else {
        this.showToast('Error loading inventory. Please try again.', 'danger');
      }
    } finally {
      this.isLoading = false;
    }
  }

  onSegmentChanged(event: any) {
    const newSegment = event.detail.value;
    console.log('[onSegmentChanged] Changing from', this.selectedSegment, 'to', newSegment);
    this.selectedSegment = newSegment;

    if (this.selectedSegment === 'alerts') {
      this.loadAlerts();
    } else if (this.selectedSegment === 'marketplace') {
      this.loadMarketplaceListings();
    } else if (this.selectedSegment === 'owner-orders') {
      this.loadOwnerOrders();
    } else if (this.selectedSegment === 'supplier-listings') {
      console.log('[onSegmentChanged] Loading supplier listings');
      this.loadSupplierListings();
    } else if (this.selectedSegment === 'supplier-orders') {
      console.log('[onSegmentChanged] Loading supplier orders');
      this.loadSupplierOrders();
    }
  }

  async loadAlerts() {
    try {
      await this.inventoryService.getLowStockAlerts().toPromise();
    } catch (error: any) {
      console.error('Error loading alerts:', error);
      this.showToast('Error loading stock alerts', 'danger');
    }
  }

  async loadMarketplaceListings() {
    if (this.userRole !== 'karenderia_owner') {
      return;
    }

    try {
      const response = await this.inventoryService
        .getMarketplaceListings(
          undefined,
          this.marketplaceCategory || undefined,
          this.marketplaceSukiOnly
        )
        .toPromise();
      this.marketplaceListings = response?.data || [];
      this.applyMarketplaceFilters();
    } catch (error: any) {
      console.error('Error loading marketplace listings:', error);
      this.showToast('Unable to load supplier marketplace listings', 'danger');
      this.visibleMarketplaceListings = [];
    }
  }

  async loadSukiSuppliers() {
    if (this.userRole !== 'karenderia_owner') {
      return;
    }

    try {
      const response = await this.inventoryService.getSukiSuppliers().toPromise();
      this.sukiSuppliers = response?.data || [];
    } catch (error: any) {
      console.error('Error loading suki suppliers:', error);
      this.sukiSuppliers = [];
    }
  }

  toggleMarketplaceSukiOnly(enabled: boolean) {
    this.marketplaceSukiOnly = enabled;
    this.loadMarketplaceListings();
  }

  onMarketplaceSearchChange() {
    if (this.marketplaceSearchDebounceTimer) {
      clearTimeout(this.marketplaceSearchDebounceTimer);
    }

    this.marketplaceSearchDebounceTimer = setTimeout(() => {
      this.applyMarketplaceFilters();
      this.marketplaceSearchDebounceTimer = null;
    }, 200);
  }

  private applyMarketplaceFilters() {
    const query = this.marketplaceSearch.trim().toLowerCase();
    if (!query) {
      this.visibleMarketplaceListings = [...this.marketplaceListings];
      return;
    }

    this.visibleMarketplaceListings = this.marketplaceListings.filter((listing) => {
      const supplierName = listing.supplier?.name?.toLowerCase() || '';
      const supplierEmail = listing.supplier?.email?.toLowerCase() || '';
      const category = listing.category?.toLowerCase() || '';
      const description = listing.description?.toLowerCase() || '';
      const itemName = listing.item_name?.toLowerCase() || '';

      return (
        itemName.includes(query) ||
        category.includes(query) ||
        description.includes(query) ||
        supplierName.includes(query) ||
        supplierEmail.includes(query)
      );
    });
  }

  isSupplierSuki(listing: SupplierListing): boolean {
    return !!listing.is_suki;
  }

  async toggleSukiSupplier(listing: SupplierListing) {
    if (this.userRole !== 'karenderia_owner') {
      return;
    }

    const loading = await this.loadingController.create({
      message: listing.is_suki ? 'Removing from Suki list...' : 'Adding to Suki list...'
    });
    await loading.present();

    try {
      if (listing.is_suki) {
        await this.inventoryService.unmarkSukiSupplier(listing.supplier_id).toPromise();
        this.showToast(`${listing.supplier?.name || 'Supplier'} removed from Suki suppliers`, 'medium');
      } else {
        await this.inventoryService.markSukiSupplier(listing.supplier_id).toPromise();
        this.showToast(`${listing.supplier?.name || 'Supplier'} added to Suki suppliers`, 'success');
      }

      await this.loadSukiSuppliers();
      await this.loadMarketplaceListings();
    } catch (error: any) {
      console.error('Error updating suki supplier:', error);
      this.showToast(error?.error?.error || 'Unable to update Suki supplier', 'danger');
    } finally {
      loading.dismiss();
    }
  }

  async loadOwnerOrders() {
    if (this.userRole !== 'karenderia_owner') {
      return;
    }

    try {
      const response = await this.inventoryService.getOwnerSupplyOrders().toPromise();
      this.ownerOrders = (response?.data || []).sort((a: SupplyOrder, b: SupplyOrder) => {
        // Sort by most recent first
        const dateA = new Date(a.created_at).getTime();
        const dateB = new Date(b.created_at).getTime();
        return dateB - dateA;
      });

      // Load unread message counts for each order
      for (const order of this.ownerOrders) {
        try {
          const messages = await this.messagingService.getMessages(order.id).toPromise();
          const unreadCount = (messages || []).filter(msg => !msg.is_read).length;
          if (unreadCount > 0) {
            this.unreadMessageCountMap.set(order.id, unreadCount);
          } else {
            this.unreadMessageCountMap.delete(order.id);
          }
        } catch (msgError) {
          console.error(`Error loading messages for order ${order.id}:`, msgError);
        }
      }
    } catch (error: any) {
      console.error('Error loading owner supply orders:', error);
      this.showToast('Unable to load your supply orders', 'danger');
    }
  }

  async loadSupplierListings() {
    if (this.userRole !== 'supplier') {
      console.log('[loadSupplierListings] Skipped - not a supplier');
      return;
    }

    try {
      console.log('[loadSupplierListings] Loading...');
      const response = await this.inventoryService.getSupplierListings().toPromise();
      this.supplierListings = response?.data || [];
      console.log('[loadSupplierListings] Loaded:', this.supplierListings.length, 'listings');
    } catch (error: any) {
      console.error('[loadSupplierListings] Error:', error);
      this.showToast('Unable to load your supplier listings', 'danger');
    }
  }

  async seedSupplierSampleCatalog() {
    if (this.userRole !== 'supplier' || this.isSeedingSupplierSamples) {
      return;
    }

    this.isSeedingSupplierSamples = true;
    const loading = await this.loadingController.create({
      message: 'Adding sample supplier products...'
    });
    await loading.present();

    let createdCount = 0;
    let skippedCount = 0;
    let failedCount = 0;

    try {
      const existingNames = new Set(
        this.supplierListings.map((listing) => listing.item_name.trim().toLowerCase())
      );

      for (const item of this.supplierSampleCatalog) {
        const normalizedName = item.item_name.trim().toLowerCase();
        if (existingNames.has(normalizedName)) {
          skippedCount += 1;
          continue;
        }

        try {
          await this.inventoryService.createSupplierListing(item).toPromise();
          createdCount += 1;
          existingNames.add(normalizedName);
        } catch (createError) {
          console.error(`Failed to create sample listing: ${item.item_name}`, createError);
          failedCount += 1;
        }
      }

      await this.loadSupplierListings();

      const summary = `Sample catalog result: ${createdCount} created, ${skippedCount} already existed, ${failedCount} failed.`;
      this.showToast(summary, failedCount > 0 ? 'warning' : 'success');
    } catch (error) {
      console.error('Error seeding sample supplier catalog:', error);
      this.showToast('Failed to add sample supplier products', 'danger');
    } finally {
      this.isSeedingSupplierSamples = false;
      loading.dismiss();
    }
  }

  async loadSupplierOrders() {
    if (this.userRole !== 'supplier') {
      console.log('[loadSupplierOrders] Skipped - not a supplier');
      return;
    }

    try {
      console.log('[loadSupplierOrders] Loading...');
      const response = await this.inventoryService.getSupplierSupplyOrders().toPromise();
      this.supplierOrders = (response?.data || []).sort((a: SupplyOrder, b: SupplyOrder) => {
        // Sort by most recent first
        const dateA = new Date(a.created_at).getTime();
        const dateB = new Date(b.created_at).getTime();
        return dateB - dateA;
      });
      console.log('[loadSupplierOrders] Loaded:', this.supplierOrders.length, 'orders');

      // Load unread message counts for each order
      for (const order of this.supplierOrders) {
        try {
          const messages = await this.messagingService.getMessages(order.id).toPromise();
          const unreadCount = (messages || []).filter(msg => !msg.is_read).length;
          if (unreadCount > 0) {
            this.unreadMessageCountMap.set(order.id, unreadCount);
          } else {
            this.unreadMessageCountMap.delete(order.id);
          }
        } catch (msgError) {
          console.error(`Error loading messages for order ${order.id}:`, msgError);
        }
      }
    } catch (error: any) {
      console.error('[loadSupplierOrders] Error:', error);
      this.showToast('Unable to load supplier orders', 'danger');
    }
  }

  onCategoryChanged(event: any) {
    this.selectedCategory = event.detail.value;
    this.applyFilter();
  }

  applyFilter() {
    if (this.selectedCategory === 'all') {
      this.filteredItems = this.inventoryItems;
    } else {
      this.filteredItems = this.inventoryItems.filter(item => 
        item.category.toLowerCase() === this.selectedCategory.toLowerCase()
      );
    }
  }

  getStatusColor(status: string): string {
    switch (status) {
      case 'available': return 'success';
      case 'low_stock': return 'warning';
      case 'out_of_stock': return 'danger';
      case 'expired': return 'dark';
      default: return 'medium';
    }
  }

  getStatusIcon(status: string): string {
    switch (status) {
      case 'available': return 'checkmark-circle';
      case 'low_stock': return 'warning';
      case 'out_of_stock': return 'close-circle';
      case 'expired': return 'time';
      default: return 'help-circle';
    }
  }

  getOrderStatusColor(status: string): string {
    switch (status) {
      case 'pending': return 'warning';
      case 'confirmed': return 'primary';
      case 'delivering': return 'warning';
      case 'delivered': return 'success';
      case 'cancelled': return 'danger';
      default: return 'medium';
    }
  }

  getPaymentMethodLabel(paymentMethod?: string): string {
    switch (paymentMethod) {
      case 'paymaya_sandbox':
        return 'PayMaya (Sandbox)';
      case 'paypal_sandbox':
        return 'PayPal (Sandbox)';
      case 'cod':
      default:
        return 'Cash on Delivery (COD)';
    }
  }

  getSupplierListingStockColor(listing: SupplierListing): string {
    if (listing.available_stock <= 0) {
      return 'danger';
    }

    if (listing.available_stock <= listing.minimum_order_quantity) {
      return 'warning';
    }

    return 'success';
  }

  formatOrderItems(order: SupplyOrder): string {
    return (order.items || [])
      .map(item => `${item.supplier_item?.item_name || 'Item'} x ${item.quantity}`)
      .join(', ');
  }

  addToCart(listing: SupplierListing) {
    if (listing.available_stock <= 0) {
      this.showToast('This listing is out of stock', 'warning');
      return;
    }

    const existingSupplierId = this.cart[0]?.listing.supplier_id;
    if (existingSupplierId && existingSupplierId !== listing.supplier_id) {
      this.showToast('Cart supports one supplier per order. Clear cart first.', 'warning');
      return;
    }

    const existing = this.cart.find(entry => entry.listing.id === listing.id);
    if (existing) {
      if (existing.quantity + 1 > listing.available_stock) {
        this.showToast('Quantity exceeds supplier stock', 'warning');
        return;
      }
      existing.quantity += 1;
    } else {
      this.cart.push({
        listing,
        quantity: Math.max(1, Number(listing.minimum_order_quantity || 1)),
      });
    }

    this.showToast('Added to supply cart', 'success');
  }

  increaseCartQuantity(item: CartItem) {
    if (item.quantity + 1 > item.listing.available_stock) {
      this.showToast('Quantity exceeds supplier stock', 'warning');
      return;
    }
    item.quantity += 1;
  }

  decreaseCartQuantity(item: CartItem) {
    const minQuantity = Number(item.listing.minimum_order_quantity || 1);
    if (item.quantity - 1 < minQuantity) {
      this.showToast(`Minimum order is ${minQuantity} ${item.listing.unit}`, 'warning');
      return;
    }
    item.quantity -= 1;
  }

  removeFromCart(listingId: number) {
    this.cart = this.cart.filter(item => item.listing.id !== listingId);
  }

  clearCart() {
    this.cart = [];
  }

  openSupplyOrderForm() {
    if (!this.cart.length) {
      this.showToast('Your supply cart is empty', 'warning');
      return;
    }

    this.showSupplyOrderForm = true;
  }

  closeSupplyOrderForm() {
    this.showSupplyOrderForm = false;
  }

  getCartTotal(): number {
    return this.cart.reduce((sum, item) => sum + (item.quantity * Number(item.listing.price_per_unit)), 0);
  }

  async submitSupplyOrder() {
    await this.confirmSupplyOrder();
  }

  async confirmSupplyOrder() {
    if (!this.cart.length) {
      this.showToast('Your supply cart is empty', 'warning');
      return;
    }

    // Get supplier name for payment modal
    const supplierName = this.cart[0].listing.supplier?.name || 'Supplier';
    const totalAmount = this.cart.reduce((sum, item) => sum + (item.listing.price_per_unit * item.quantity), 0);

    // Show payment modal
    const paymentModal = await this.modalController.create({
      component: SupplyOrderPaymentModalPage,
      componentProps: {
        totalAmount,
        supplierName
      },
      cssClass: 'payment-modal',
      backdropDismiss: false
    });

    await paymentModal.present();
    const { data: paymentData } = await paymentModal.onDidDismiss();

    // If user cancelled, don't proceed
    if (!paymentData) {
      this.showToast('Order cancelled', 'warning');
      return;
    }

    // Store payment data and show order review
    this.pendingPaymentData = paymentData;
    this.showOrderReview = true;
  }

  cancelOrderReview() {
    this.showOrderReview = false;
    this.pendingPaymentData = null;
  }

  async submitOrderFromReview() {
    if (!this.cart.length) {
      this.showToast('Your supply cart is empty', 'warning');
      return;
    }

    if (this.supplyDeliveryDate) {
      const selected = new Date(this.supplyDeliveryDate);
      const min = new Date(this.supplyMinDate || this.formatDateAsYYYYMMDD(new Date()));
      selected.setHours(0,0,0,0);
      min.setHours(0,0,0,0);
      if (selected < min) {
        this.showToast('Delivery date cannot be in the past. Please choose today or later.', 'warning');
        return;
      }
    }
    const loading = await this.loadingController.create({
      message: 'Submitting order...'
    });
    await loading.present();

    try {
      await this.inventoryService.createSupplyOrder({
        items: this.cart.map(item => ({
          supplier_inventory_item_id: item.listing.id,
          quantity: item.quantity,
        })),
        payment_method: this.pendingPaymentData.method,
        notes: this.supplyNotes || undefined,
        delivery_date: this.supplyDeliveryDate || undefined,
      }).toPromise();

      this.showToast('Supply order submitted successfully', 'success');
      this.clearCart();
      this.showOrderReview = false;
      this.pendingPaymentData = null;
      this.supplyNotes = '';
      this.supplyDeliveryDate = '';
      this.selectedSupplyPaymentMethod = 'cod';
      this.loadOwnerOrders();
      this.loadMarketplaceListings();
    } catch (error: any) {
      console.error('Error submitting supply order:', error);
      this.showToast(error?.error?.error || 'Failed to submit order', 'danger');
    } finally {
      loading.dismiss();
    }
  }

  async cancelOwnerOrder(order: SupplyOrder) {
    if (order.status === 'cancelled' || order.status === 'delivered') {
      this.showToast('This order can no longer be cancelled', 'warning');
      return;
    }

    const loading = await this.loadingController.create({
      message: 'Cancelling order...'
    });
    await loading.present();

    try {
      await this.inventoryService.updateSupplyOrderStatus(order.id, 'cancelled').toPromise();
      this.showToast('Order cancelled', 'success');
      this.loadOwnerOrders();
      this.loadMarketplaceListings();
    } catch (error: any) {
      console.error('Error cancelling order:', error);
      this.showToast(error?.error?.error || 'Unable to cancel order', 'danger');
    } finally {
      loading.dismiss();
    }
  }

  async markOwnerOrderAsDelivered(order: SupplyOrder) {
    if (order.status !== 'delivering') {
      this.showToast('Order must be in delivering status', 'warning');
      return;
    }

    const alert = await this.alertController.create({
      header: 'Confirm Delivery',
      message: 'Have you received this order? The supplier will be notified.',
      buttons: [
        { text: 'Cancel', role: 'cancel' },
        {
          text: 'Confirm Delivery',
          handler: async () => {
            const loading = await this.loadingController.create({
              message: 'Confirming delivery...'
            });
            await loading.present();

            try {
              await this.inventoryService.updateSupplyOrderStatus(order.id, 'delivered').toPromise();
              this.showToast('Delivery confirmed! Supplier notified.', 'success');
              this.loadOwnerOrders();
              this.loadMarketplaceListings();
            } catch (error: any) {
              console.error('Error confirming delivery:', error);
              this.showToast(error?.error?.error || 'Failed to confirm delivery', 'danger');
            } finally {
              loading.dismiss();
            }
          }
        }
      ]
    });

    await alert.present();
  }

  async updateSupplierOrderStatus(order: SupplyOrder, status: 'confirmed' | 'delivering' | 'delivered' | 'cancelled') {
    const loading = await this.loadingController.create({
      message: 'Updating order status...'
    });
    await loading.present();

    try {
      await this.inventoryService.updateSupplyOrderStatus(order.id, status).toPromise();
      this.showToast('Order status updated', 'success');
      this.loadSupplierOrders();
    } catch (error: any) {
      console.error('Error updating supplier order status:', error);
      this.showToast(error?.error?.error || 'Failed to update order status', 'danger');
    } finally {
      loading.dismiss();
    }
  }

  async messageOrderOwner(order: SupplyOrder) {
    const modal = await this.modalController.create({
      component: SupplyOrderMessagingPage,
      componentProps: {
        orderId: order.id,
        supplierId: order.supplier_id,
        karenderiaId: order.karenderia_id,
        otherPartyName: order.karenderia?.business_name || order.karenderia?.name || 'Karenderia Owner',
        onDismiss: () => this.refreshUnreadCount(order.id)
      },
      cssClass: 'messaging-modal',
      breakpoints: [0, 0.5, 1],
      initialBreakpoint: 1
    });

    return await modal.present();
  }

  async messageSupplier(order: SupplyOrder) {
    const modal = await this.modalController.create({
      component: SupplyOrderMessagingPage,
      componentProps: {
        orderId: order.id,
        supplierId: order.supplier_id,
        karenderiaId: order.karenderia_id,
        otherPartyName: order.supplier?.name || 'Supplier',
        onDismiss: () => this.refreshUnreadCount(order.id)
      },
      cssClass: 'messaging-modal',
      breakpoints: [0, 0.5, 1],
      initialBreakpoint: 1
    });

    return await modal.present();
  }

  async addSupplierListing() {
    if (this.userRole !== 'supplier') {
      return;
    }

    const alert = await this.alertController.create({
      header: 'New Supplier Listing',
      inputs: [
        { name: 'item_name', type: 'text', placeholder: 'Item Name *' },
        { name: 'description', type: 'textarea', placeholder: 'Description (optional)' },
        { name: 'category', type: 'text', placeholder: 'Category *' },
        { name: 'unit', type: 'text', placeholder: 'Unit (kg, pcs, liters) *' },
        { name: 'price_per_unit', type: 'number', placeholder: 'Price per unit *' },
        { name: 'available_stock', type: 'number', placeholder: 'Available stock *' },
        { name: 'minimum_order_quantity', type: 'number', placeholder: 'Minimum order quantity (default: 1)' },
      ],
      buttons: [
        { text: 'Cancel', role: 'cancel' },
        {
          text: 'Create',
          handler: async (data) => {
            const success = await this.performAddSupplierListing(data);
            return success;
          }
        }
      ]
    });

    await alert.present();
  }

  async performAddSupplierListing(data: any): Promise<boolean> {
    if (!data.item_name || !data.category || !data.unit || !data.price_per_unit || !data.available_stock) {
      this.showToast('Please complete all required listing fields', 'danger');
      return false;
    }

    const loading = await this.loadingController.create({
      message: 'Creating listing...'
    });
    await loading.present();

    try {
      await this.inventoryService.createSupplierListing({
        item_name: data.item_name.trim(),
        description: data.description ? data.description.trim() : undefined,
        category: data.category.trim(),
        unit: data.unit.trim(),
        price_per_unit: Number(data.price_per_unit),
        available_stock: Number(data.available_stock),
        minimum_order_quantity: data.minimum_order_quantity ? Number(data.minimum_order_quantity) : 1,
      }).toPromise();

      this.showToast('Supplier listing created successfully!', 'success');
      await this.loadSupplierListings();
      // Auto-switch to supplier-listings tab to show newly created item
      this.selectedSegment = 'supplier-listings';
      return true;
    } catch (error: any) {
      console.error('Error creating supplier listing:', error);
      this.showToast(error?.error?.error || 'Unable to create listing', 'danger');
      return false;
    } finally {
      loading.dismiss();
    }
  }

  async editSupplierListing(listing: SupplierListing) {
    const alert = await this.alertController.create({
      header: 'Edit Supplier Listing',
      inputs: [
        { name: 'item_name', type: 'text', label: 'Item Name *', value: listing.item_name, placeholder: 'Item Name *' },
        { name: 'description', type: 'textarea', label: 'Description (optional)', value: listing.description || '', placeholder: 'Description (optional)' },
        { name: 'category', type: 'text', label: 'Category *', value: listing.category, placeholder: 'Category *' },
        { name: 'unit', type: 'text', label: 'Unit *', value: listing.unit, placeholder: 'Unit *' },
        { name: 'price_per_unit', type: 'number', label: 'Price per Unit *', value: String(listing.price_per_unit), placeholder: 'Price per unit *' },
        { name: 'available_stock', type: 'number', label: 'Available Stock *', value: String(listing.available_stock), placeholder: 'Available stock *' },
        { name: 'minimum_order_quantity', type: 'number', label: 'Minimum Order Quantity', value: String(listing.minimum_order_quantity), placeholder: 'Minimum order quantity' },
      ],
      buttons: [
        { text: 'Cancel', role: 'cancel' },
        {
          text: 'Save',
          handler: async (data) => {
            const success = await this.performEditSupplierListing(listing.id, data);
            return success;
          }
        }
      ]
    });

    await alert.present();
  }

  async performEditSupplierListing(listingId: number, data: any): Promise<boolean> {
    const loading = await this.loadingController.create({
      message: 'Updating listing...'
    });
    await loading.present();

    try {
      await this.inventoryService.updateSupplierListing(listingId, {
        item_name: data.item_name?.trim(),
        description: data.description ? data.description.trim() : undefined,
        category: data.category?.trim(),
        unit: data.unit?.trim(),
        price_per_unit: data.price_per_unit ? Number(data.price_per_unit) : undefined,
        available_stock: data.available_stock ? Number(data.available_stock) : undefined,
        minimum_order_quantity: data.minimum_order_quantity ? Number(data.minimum_order_quantity) : undefined,
      }).toPromise();

      this.showToast('Listing updated successfully!', 'success');
      await this.loadSupplierListings();
      return true;
    } catch (error: any) {
      console.error('Error updating supplier listing:', error);
      this.showToast(error?.error?.error || 'Unable to update listing', 'danger');
      return false;
    } finally {
      loading.dismiss();
    }
  }

  async addInventoryItem() {
    const alert = await this.alertController.create({
      header: 'Add Inventory Item',
      inputs: [
        {
          name: 'item_name',
          type: 'text',
          placeholder: 'Item Name (e.g., Chicken Breast)',
          attributes: { required: true }
        },
        {
          name: 'category',
          type: 'text',
          placeholder: 'Category (e.g., Protein)',
          attributes: { required: true }
        },
        {
          name: 'unit',
          type: 'text',
          placeholder: 'Unit (e.g., kg, pieces)',
          attributes: { required: true }
        },
        {
          name: 'current_stock',
          type: 'number',
          placeholder: 'Current Stock',
          attributes: { required: true, min: 0, step: 0.001 }
        },
        {
          name: 'minimum_stock',
          type: 'number',
          placeholder: 'Minimum Stock Alert',
          attributes: { required: true, min: 0, step: 0.001 }
        },
        {
          name: 'unit_cost',
          type: 'number',
          placeholder: 'Cost per Unit (₱)',
          attributes: { required: true, min: 0, step: 0.01 }
        },
        {
          name: 'supplier',
          type: 'text',
          placeholder: 'Supplier (optional)'
        }
      ],
      buttons: [
        {
          text: 'Cancel',
          role: 'cancel'
        },
        {
          text: 'Add',
          handler: (data) => {
            this.createInventoryItem(data);
          }
        }
      ]
    });

    await alert.present();
  }

  async createInventoryItem(data: any) {
    const loading = await this.loadingController.create({
      message: 'Adding inventory item...'
    });
    await loading.present();

    try {
      const inventoryData: CreateInventoryData = {
        item_name: data.item_name,
        category: data.category,
        unit: data.unit,
        current_stock: parseFloat(data.current_stock),
        minimum_stock: parseFloat(data.minimum_stock),
        unit_cost: parseFloat(data.unit_cost),
        supplier: data.supplier || undefined
      };

      await this.inventoryService.createInventoryItem(inventoryData).toPromise();
      this.showToast('Inventory item added successfully!', 'success');
      this.loadInventory();
    } catch (error: any) {
      console.error('Error creating inventory item:', error);
      this.showToast('Failed to add inventory item. Please try again.', 'danger');
    } finally {
      loading.dismiss();
    }
  }

  async restockItem(item: InventoryItem) {
    this.restockItemId = item.id;
    this.restockItemName = item.item_name;
    this.restockUnit = item.unit;
    this.restockCurrentStock = Number(item.current_stock || 0);
    this.restockForm = {
      quantity: null,
      unit_cost: Number(item.unit_cost || 0),
    };
    this.isRestockModalOpen = true;
  }

  closeRestockModal() {
    this.isRestockModalOpen = false;
    this.restockItemId = null;
  }

  async submitRestockModal() {
    if (!this.restockItemId) {
      return;
    }
    const quantity = Number(this.restockForm.quantity);
    const unitCost = Number(this.restockForm.unit_cost);
    if (!quantity || quantity <= 0) {
      this.showToast('Please enter a valid quantity to add', 'warning');
      return;
    }

    await this.performRestock(this.restockItemId, quantity, unitCost);
    this.closeRestockModal();
  }

  async performRestock(itemId: number, quantity: number, unitCost: number) {
    const loading = await this.loadingController.create({
      message: 'Restocking item...'
    });
    await loading.present();

    try {
      await this.inventoryService.restockItem(itemId, quantity, unitCost).toPromise();
      this.showToast('Item restocked successfully!', 'success');
      this.loadInventory();
    } catch (error: any) {
      console.error('Error restocking item:', error);
      this.showToast('Failed to restock item. Please try again.', 'danger');
    } finally {
      loading.dismiss();
    }
  }

  async deleteItem(item: InventoryItem) {
    const alert = await this.alertController.create({
      header: 'Delete Inventory Item',
      message: `Are you sure you want to delete "${item.item_name}"? This action cannot be undone.`,
      buttons: [
        {
          text: 'Cancel',
          role: 'cancel'
        },
        {
          text: 'Delete',
          role: 'destructive',
          handler: async () => {
            await this.performDelete(item.id);
          }
        }
      ]
    });

    await alert.present();
  }

  async performDelete(itemId: number) {
    const loading = await this.loadingController.create({
      message: 'Deleting item...'
    });
    await loading.present();

    try {
      await this.inventoryService.deleteInventoryItem(itemId).toPromise();
      this.showToast('Item deleted successfully!', 'success');
      this.loadInventory();
    } catch (error: any) {
      console.error('Error deleting item:', error);
      if (error.status === 400) {
        this.showToast('Cannot delete item that is linked to daily menu items.', 'warning');
      } else {
        this.showToast('Failed to delete item. Please try again.', 'danger');
      }
    } finally {
      loading.dismiss();
    }
  }

  async addNewItem() {
    if (this.userRole === 'supplier') {
      this.addSupplierListing();
      return;
    }

    const alert = await this.alertController.create({
      header: 'Add New Inventory Item',
      inputs: [
        {
          name: 'item_name',
          type: 'text',
          placeholder: 'Item Name *',
          attributes: {
            required: true
          }
        },
        {
          name: 'description',
          type: 'textarea',
          placeholder: 'Description (optional)'
        },
        {
          name: 'category',
          type: 'text',
          placeholder: 'Category *',
          value: 'Food',
          attributes: {
            required: true
          }
        },
        {
          name: 'unit',
          type: 'text',
          placeholder: 'Unit (kg, pcs, liters, etc.) *',
          attributes: {
            required: true
          }
        },
        {
          name: 'current_stock',
          type: 'number',
          placeholder: 'Current Stock *',
          min: 0,
          attributes: {
            required: true
          }
        },
        {
          name: 'minimum_stock',
          type: 'number',
          placeholder: 'Minimum Stock Level *',
          min: 0,
          attributes: {
            required: true
          }
        },
        {
          name: 'maximum_stock',
          type: 'number',
          placeholder: 'Maximum Stock Level (optional)',
          min: 0
        },
        {
          name: 'unit_cost',
          type: 'number',
          placeholder: 'Cost per Unit *',
          min: 0,
          attributes: {
            required: true,
            step: '0.01'
          }
        },
        {
          name: 'supplier',
          type: 'text',
          placeholder: 'Supplier (optional)'
        },
        {
          name: 'expiry_date',
          type: 'date',
          placeholder: 'Expiry Date (optional)'
        },
        {
          name: 'notes',
          type: 'textarea',
          placeholder: 'Additional Notes (optional)'
        }
      ],
      buttons: [
        {
          text: 'Cancel',
          role: 'cancel'
        },
        {
          text: 'Add Item',
          handler: (data) => {
            this.performAddItem(data);
          }
        }
      ]
    });

    await alert.present();
  }

  async performAddItem(data: any) {
    // Validate required fields
    if (!data.item_name || !data.category || !data.unit || 
        data.current_stock === undefined || data.minimum_stock === undefined || 
        data.unit_cost === undefined) {
      this.showToast('Please fill in all required fields', 'danger');
      return;
    }

    const loading = await this.loadingController.create({
      message: 'Adding new item...'
    });
    await loading.present();

    try {
      const newItem = {
        item_name: data.item_name.trim(),
        description: data.description ? data.description.trim() : undefined,
        category: data.category.trim(),
        unit: data.unit.trim(),
        current_stock: parseFloat(data.current_stock),
        minimum_stock: parseFloat(data.minimum_stock),
        maximum_stock: data.maximum_stock ? parseFloat(data.maximum_stock) : undefined,
        unit_cost: parseFloat(data.unit_cost),
        supplier: data.supplier ? data.supplier.trim() : undefined,
        expiry_date: data.expiry_date || undefined,
        notes: data.notes ? data.notes.trim() : undefined
      };

      await this.inventoryService.createInventoryItem(newItem).toPromise();
      this.showToast('Inventory item added successfully!', 'success');
      this.loadInventory();
    } catch (error: any) {
      console.error('Error adding inventory item:', error);
      if (error.status === 400) {
        this.showToast('Invalid data. Please check your inputs.', 'danger');
      } else {
        this.showToast('Failed to add inventory item. Please try again.', 'danger');
      }
    } finally {
      loading.dismiss();
    }
  }

  async editItem(item: InventoryItem) {
    this.editingInventoryItemId = item.id;
    this.editInventoryForm = {
      item_name: item.item_name || '',
      description: item.description || '',
      category: item.category || '',
      unit: item.unit || '',
      current_stock: Number(item.current_stock || 0),
      minimum_stock: Number(item.minimum_stock || 0),
      maximum_stock: item.maximum_stock !== null && item.maximum_stock !== undefined ? Number(item.maximum_stock) : null,
      unit_cost: Number(item.unit_cost || 0),
      supplier: item.supplier || '',
      expiry_date: item.expiry_date ? item.expiry_date.split('T')[0] : '',
      notes: item.notes || '',
    };
    this.isEditInventoryModalOpen = true;
  }

  closeEditInventoryModal() {
    this.isEditInventoryModalOpen = false;
    this.editingInventoryItemId = null;
  }

  async submitEditInventoryModal() {
    if (!this.editingInventoryItemId) {
      return;
    }

    const data = {
      ...this.editInventoryForm,
      maximum_stock: this.editInventoryForm.maximum_stock ?? undefined,
    };

    await this.performEditItem(this.editingInventoryItemId, data);
    this.closeEditInventoryModal();
  }

  async performEditItem(itemId: number, data: any) {
    // Validate required fields
    if (!data.item_name || !data.category || !data.unit || 
        data.current_stock === undefined || data.minimum_stock === undefined || 
        data.unit_cost === undefined) {
      this.showToast('Please fill in all required fields', 'danger');
      return;
    }

    const loading = await this.loadingController.create({
      message: 'Updating item...'
    });
    await loading.present();

    try {
      const updateData = {
        item_name: data.item_name.trim(),
        description: data.description ? data.description.trim() : undefined,
        category: data.category.trim(),
        unit: data.unit.trim(),
        current_stock: parseFloat(data.current_stock),
        minimum_stock: parseFloat(data.minimum_stock),
        maximum_stock: data.maximum_stock ? parseFloat(data.maximum_stock) : undefined,
        unit_cost: parseFloat(data.unit_cost),
        supplier: data.supplier ? data.supplier.trim() : undefined,
        expiry_date: data.expiry_date || undefined,
        notes: data.notes ? data.notes.trim() : undefined
      };

      await this.inventoryService.updateInventoryItem(itemId, updateData).toPromise();
      this.showToast('Inventory item updated successfully!', 'success');
      this.loadInventory();
    } catch (error: any) {
      console.error('Error updating inventory item:', error);
      if (error.status === 400) {
        this.showToast('Invalid data. Please check your inputs.', 'danger');
      } else {
        this.showToast('Failed to update inventory item. Please try again.', 'danger');
      }
    } finally {
      loading.dismiss();
    }
  }

  async viewItemDetails(item: InventoryItem) {
    try {
      console.log('View item details called for:', item);
      
      // Convert values to numbers safely
      const unitCost = parseFloat(item.unit_cost?.toString() || '0') || 0;
      const totalValue = parseFloat(item.total_value?.toString() || '0') || 0;
      const currentStock = parseFloat(item.current_stock?.toString() || '0') || 0;
      const minStock = parseFloat(item.minimum_stock?.toString() || '0') || 0;
      const maxStock = item.maximum_stock ? parseFloat(item.maximum_stock.toString()) : null;
      
      const alert = await this.alertController.create({
        header: item.item_name || 'Item Details',
        subHeader: `Category: ${item.category || 'Unknown'}`,
        message: `
          <div class="item-details">
            <p><strong>Description:</strong> ${item.description || 'No description'}</p>
            <p><strong>Current Stock:</strong> ${currentStock} ${item.unit || 'units'}</p>
            <p><strong>Stock Level:</strong> Min: ${minStock}, Max: ${maxStock || 'N/A'}</p>
            <p><strong>Unit Cost:</strong> ₱${unitCost.toFixed(2)}</p>
            <p><strong>Total Value:</strong> ₱${totalValue.toFixed(2)}</p>
            <p><strong>Status:</strong> ${item.status ? item.status.replace('_', ' ').toUpperCase() : 'Unknown'}</p>
            ${item.supplier ? `<p><strong>Supplier:</strong> ${item.supplier}</p>` : ''}
            ${item.expiry_date ? `<p><strong>Expires:</strong> ${new Date(item.expiry_date).toLocaleDateString()}</p>` : ''}
            ${item.notes ? `<p><strong>Notes:</strong> ${item.notes}</p>` : ''}
            ${item.updated_at ? `<p><strong>Last Updated:</strong> ${new Date(item.updated_at).toLocaleDateString()}</p>` : ''}
          </div>
        `,
        buttons: [
          {
            text: 'Edit',
            handler: () => {
              this.editItem(item);
            }
          },
          {
            text: 'Restock',
            handler: () => {
              this.restockItem(item);
            }
          },
          {
            text: 'Close'
          }
        ]
      });

      console.log('Alert created, presenting...');
      await alert.present();
      console.log('Alert presented successfully');
      
    } catch (error) {
      console.error('Error in viewItemDetails:', error);
      this.showToast('Error displaying item details', 'danger');
    }
  }

  async showToast(message: string, color: string) {
    const toast = await this.toastController.create({
      message,
      duration: 3000,
      color,
      position: 'bottom'
    });
    await toast.present();
  }

  async logout() {
    await this.authService.logoutWithConfirmation();
  }

  // Enhanced Supplier Dashboard Methods

  /**
   * Calculate total value of all supplier listings
   */
  getSupplierTotalValue(): number {
    return this.supplierListings.reduce((total, listing) => {
      return total + (listing.price_per_unit * listing.available_stock);
    }, 0);
  }

  /**
   * Filter supplier orders by status (for stat item clicks)
   */
  filterSupplierOrdersByStatus(status: string) {
    // This is mainly for interactivity; filtering could be expanded
    // to actually show filtered results if needed
    const filteredCount = this.supplierOrders.filter(o => o.status === status).length;
    if (filteredCount === 0) {
      this.showToast(`No ${status} orders`, 'information');
    }
  }

  /**
   * Get count of supplier orders by status
   */
  getSupplierOrderCountByStatus(status: string): number {
    return this.supplierOrders.filter(o => o.status === status).length;
  }

  /**
   * Get unread message count for an order
   */
  getUnreadMessageCount(orderId: number): number {
    // Return count from unread map (will be updated when messages are loaded)
    return this.unreadMessageCountMap.get(orderId) || 0;
  }

  /**
   * Mark order messages as read
   */
  markOrderMessagesAsRead(orderId: number) {
    this.unreadMessageCountMap.delete(orderId);
  }

  /**
   * Refresh unread message count for an order (called when messaging modal closes)
   */
  async refreshUnreadCount(orderId: number) {
    try {
      const messages = await this.messagingService.getMessages(orderId).toPromise();
      const unreadCount = (messages || []).filter(msg => !msg.is_read).length;
      if (unreadCount > 0) {
        this.unreadMessageCountMap.set(orderId, unreadCount);
      } else {
        this.unreadMessageCountMap.delete(orderId);
      }
    } catch (error) {
      console.error(`Error refreshing message count for order ${orderId}:`, error);
    }
  }
}
