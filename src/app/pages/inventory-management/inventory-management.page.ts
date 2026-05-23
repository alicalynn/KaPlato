import { CommonModule } from '@angular/common';
import { Component, OnInit } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { IonicModule, AlertController, LoadingController, ToastController, ModalController } from '@ionic/angular';
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
  selectedSegment = 'inventory';
  filteredItems: InventoryItem[] = [];
  selectedCategory = 'all';

  marketplaceListings: SupplierListing[] = [];
  supplierListings: SupplierListing[] = [];
  ownerOrders: SupplyOrder[] = [];
  supplierOrders: SupplyOrder[] = [];
  cart: CartItem[] = [];
  marketplaceSearch = '';
  marketplaceCategory = '';
  marketplaceSukiOnly = false;
  sukiSuppliers: SukiSupplier[] = [];
  isSeedingSupplierSamples = false;
  showSupplyOrderForm = false;
  supplyNotes = '';
  supplyDeliveryDate = '';
  selectedSupplyPaymentMethod: 'cod' | 'paymaya' = 'cod';

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
    private messagingService: SupplyOrderMessagingService
  ) { }

  getBackRoute(): string {
    return this.userRole === 'supplier' ? '/home' : '/karenderia-dashboard';
  }

  ngOnInit() {
    this.checkAuthentication();

    if (this.userRole === 'karenderia_owner') {
      this.selectedSegment = 'inventory';
      this.loadInventory();
      this.loadMarketplaceListings();
      this.loadOwnerOrders();
      this.loadSukiSuppliers();
      return;
    }

    if (this.userRole === 'supplier') {
      this.selectedSegment = 'supplier-listings';
      this.loadSupplierListings();
      this.loadSupplierOrders();
      return;
    }

    this.showToast('This page is only available for karenderia owners and suppliers.', 'warning');
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
    this.selectedSegment = event.detail.value;

    if (this.selectedSegment === 'alerts') {
      this.loadAlerts();
    } else if (this.selectedSegment === 'marketplace') {
      this.loadMarketplaceListings();
    } else if (this.selectedSegment === 'owner-orders') {
      this.loadOwnerOrders();
    } else if (this.selectedSegment === 'supplier-listings') {
      this.loadSupplierListings();
    } else if (this.selectedSegment === 'supplier-orders') {
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
          this.marketplaceSearch || undefined,
          this.marketplaceCategory || undefined,
          this.marketplaceSukiOnly
        )
        .toPromise();
      this.marketplaceListings = response?.data || [];
    } catch (error: any) {
      console.error('Error loading marketplace listings:', error);
      this.showToast('Unable to load supplier marketplace listings', 'danger');
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
      this.ownerOrders = response?.data || [];
    } catch (error: any) {
      console.error('Error loading owner supply orders:', error);
      this.showToast('Unable to load your supply orders', 'danger');
    }
  }

  async loadSupplierListings() {
    if (this.userRole !== 'supplier') {
      return;
    }

    try {
      const response = await this.inventoryService.getSupplierListings().toPromise();
      this.supplierListings = response?.data || [];
    } catch (error: any) {
      console.error('Error loading supplier listings:', error);
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
      return;
    }

    try {
      const response = await this.inventoryService.getSupplierSupplyOrders().toPromise();
      this.supplierOrders = response?.data || [];
    } catch (error: any) {
      console.error('Error loading supplier orders:', error);
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
    this.openSupplyOrderForm();
  }

  async confirmSupplyOrder() {
    if (!this.cart.length) {
      this.showToast('Your supply cart is empty', 'warning');
      return;
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
        payment_method: this.selectedSupplyPaymentMethod,
        notes: this.supplyNotes || undefined,
        delivery_date: this.supplyDeliveryDate || undefined,
      }).toPromise();

      this.showToast('Supply order submitted successfully', 'success');
      this.clearCart();
      this.showSupplyOrderForm = false;
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
    // Ensure conversation exists for this order
    const conversation = this.messagingService.getConversationSync(order.id);
    if (!conversation) {
      // Initialize conversation if it doesn't exist
      const initMessage: any = {
        orderId: order.id,
        supplierId: order.supplier_id,
        karenderiaId: order.karenderia_id,
        senderId: 0,
        senderRole: 'supplier',
        content: 'Conversation started',
        timestamp: new Date(),
        isRead: true
      };
    }

    const modal = await this.modalController.create({
      component: SupplyOrderMessagingPage,
      componentProps: {
        orderId: order.id,
        supplierId: order.supplier_id,
        karenderiaId: order.karenderia_id,
        otherPartyName: order.karenderia?.business_name || order.karenderia?.name || 'Karenderia Owner'
      },
      cssClass: 'messaging-modal',
      breakpoints: [0, 0.5, 1],
      initialBreakpoint: 1
    });

    return await modal.present();
  }

  async messageSupplier(order: SupplyOrder) {
    // Ensure conversation exists for this order
    const conversation = this.messagingService.getConversationSync(order.id);
    if (!conversation) {
      // Initialize conversation if it doesn't exist
      const initMessage: any = {
        orderId: order.id,
        supplierId: order.supplier_id,
        karenderiaId: order.karenderia_id,
        senderId: 0,
        senderRole: 'karenderia_owner',
        content: 'Conversation started',
        timestamp: new Date(),
        isRead: true
      };
    }

    const modal = await this.modalController.create({
      component: SupplyOrderMessagingPage,
      componentProps: {
        orderId: order.id,
        supplierId: order.supplier_id,
        karenderiaId: order.karenderia_id,
        otherPartyName: order.supplier?.name || 'Supplier'
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
          handler: (data) => this.performAddSupplierListing(data)
        }
      ]
    });

    await alert.present();
  }

  async performAddSupplierListing(data: any) {
    if (!data.item_name || !data.category || !data.unit || !data.price_per_unit || !data.available_stock) {
      this.showToast('Please complete all required listing fields', 'danger');
      return;
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

      this.showToast('Supplier listing created', 'success');
      this.loadSupplierListings();
    } catch (error: any) {
      console.error('Error creating supplier listing:', error);
      this.showToast(error?.error?.error || 'Unable to create listing', 'danger');
    } finally {
      loading.dismiss();
    }
  }

  async editSupplierListing(listing: SupplierListing) {
    const alert = await this.alertController.create({
      header: 'Edit Supplier Listing',
      inputs: [
        { name: 'item_name', type: 'text', value: listing.item_name, placeholder: 'Item Name *' },
        { name: 'description', type: 'textarea', value: listing.description || '', placeholder: 'Description (optional)' },
        { name: 'category', type: 'text', value: listing.category, placeholder: 'Category *' },
        { name: 'unit', type: 'text', value: listing.unit, placeholder: 'Unit *' },
        { name: 'price_per_unit', type: 'number', value: String(listing.price_per_unit), placeholder: 'Price per unit *' },
        { name: 'available_stock', type: 'number', value: String(listing.available_stock), placeholder: 'Available stock *' },
        { name: 'minimum_order_quantity', type: 'number', value: String(listing.minimum_order_quantity), placeholder: 'Minimum order quantity' },
      ],
      buttons: [
        { text: 'Cancel', role: 'cancel' },
        {
          text: 'Save',
          handler: (data) => this.performEditSupplierListing(listing.id, data)
        }
      ]
    });

    await alert.present();
  }

  async performEditSupplierListing(listingId: number, data: any) {
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

      this.showToast('Listing updated', 'success');
      this.loadSupplierListings();
    } catch (error: any) {
      console.error('Error updating supplier listing:', error);
      this.showToast(error?.error?.error || 'Unable to update listing', 'danger');
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
    const alert = await this.alertController.create({
      header: `Restock ${item.item_name}`,
      message: `Current stock: ${item.current_stock} ${item.unit}`,
      inputs: [
        {
          name: 'quantity',
          type: 'number',
          placeholder: 'Quantity to add',
          attributes: { required: true, min: 0.001, step: 0.001 }
        },
        {
          name: 'unit_cost',
          type: 'number',
          placeholder: `Unit Cost (Current: ₱${item.unit_cost})`,
          value: (item.unit_cost?.toString() || '0'),
          attributes: { min: 0, step: 0.01 }
        }
      ],
      buttons: [
        {
          text: 'Cancel',
          role: 'cancel'
        },
        {
          text: 'Restock',
          handler: async (data) => {
            if (data.quantity && parseFloat(data.quantity) > 0) {
              await this.performRestock(item.id, parseFloat(data.quantity), parseFloat(data.unit_cost));
            }
          }
        }
      ]
    });

    await alert.present();
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
    const alert = await this.alertController.create({
      header: 'Edit Inventory Item',
      subHeader: `Update details for "${item.item_name}"`,
      inputs: [
        {
          name: 'item_name',
          type: 'text',
          placeholder: 'Item Name *',
          value: item.item_name,
          attributes: {
            required: true
          }
        },
        {
          name: 'description',
          type: 'textarea',
          placeholder: 'Description',
          value: item.description || ''
        },
        {
          name: 'category',
          type: 'text',
          placeholder: 'Category *',
          value: item.category,
          attributes: {
            required: true
          }
        },
        {
          name: 'unit',
          type: 'text',
          placeholder: 'Unit *',
          value: item.unit,
          attributes: {
            required: true
          }
        },
        {
          name: 'current_stock',
          type: 'number',
          placeholder: 'Current Stock *',
          value: (item.current_stock?.toString() || '0'),
          min: 0,
          attributes: {
            required: true
          }
        },
        {
          name: 'minimum_stock',
          type: 'number',
          placeholder: 'Minimum Stock Level *',
          value: (item.minimum_stock?.toString() || '0'),
          min: 0,
          attributes: {
            required: true
          }
        },
        {
          name: 'maximum_stock',
          type: 'number',
          placeholder: 'Maximum Stock Level',
          value: item.maximum_stock?.toString() || '',
          min: 0
        },
        {
          name: 'unit_cost',
          type: 'number',
          placeholder: 'Cost per Unit *',
          value: (item.unit_cost?.toString() || '0'),
          min: 0,
          attributes: {
            required: true,
            step: '0.01'
          }
        },
        {
          name: 'supplier',
          type: 'text',
          placeholder: 'Supplier',
          value: item.supplier || ''
        },
        {
          name: 'expiry_date',
          type: 'date',
          placeholder: 'Expiry Date',
          value: item.expiry_date ? item.expiry_date.split('T')[0] : ''
        },
        {
          name: 'notes',
          type: 'textarea',
          placeholder: 'Additional Notes',
          value: item.notes || ''
        }
      ],
      buttons: [
        {
          text: 'Cancel',
          role: 'cancel'
        },
        {
          text: 'Update Item',
          handler: (data) => {
            this.performEditItem(item.id, data);
          }
        }
      ]
    });

    await alert.present();
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
}
