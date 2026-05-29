import { Component, OnDestroy, OnInit } from '@angular/core';
import { MenuService } from '../services/menu.service';
import { AnalyticsService } from '../services/analytics.service';
import { MenuItem, DetailedOrder, DetailedOrderItem } from '../models/menu.model';
import { AlertController, ToastController } from '@ionic/angular';
import { KarenderiaInfoService } from '../services/karenderia-info.service';
import { Subscription } from 'rxjs';
import { AuthService } from '../services/auth.service';

export interface OrderItem {
  menuItem: MenuItem;
  quantity: number;
  subtotal: number;
  notes?: string;
}

export interface PosOrder {
  id?: string;
  items: OrderItem[];
  total: number;
  paymentMethod: 'cash' | 'card' | 'gcash';
  customerName?: string;
  orderType: 'dine-in' | 'takeout';
  status: 'pending' | 'completed';
  createdAt: Date;
}

@Component({
  selector: 'app-karenderia-orders-pos',
  templateUrl: './karenderia-orders-pos.page.html',
  styleUrls: ['./karenderia-orders-pos.page.scss'],
  standalone: false
})
export class KarenderiaOrdersPosPage implements OnInit, OnDestroy {
    
  // Search term
  searchTerm = '';
  
  // Selected category
  selectedCategory = 'all';
  
  // Table number
  tableNumber = '';
  
  // Current order array for the new template
  currentOrder: any[] = [];
  
  // Categories
  categories = [
    { id: 'ulam', name: 'Ulam', icon: 'restaurant' },
    { id: 'sabaw', name: 'Sabaw', icon: 'wine' },
    { id: 'rice', name: 'Rice', icon: 'cafe' },
    { id: 'dessert', name: 'Dessert', icon: 'ice-cream' },
    { id: 'drinks', name: 'Drinks', icon: 'cafe' }
  ];
  
  menuItems: MenuItem[] = [];

  // Current order
  paymentMethod: 'cash' | 'card' | 'gcash' = 'cash';
  customerName = '';
  orderType: 'dine-in' | 'takeout' = 'dine-in';

  // Enhanced order properties
  currentDetailedOrder: Partial<DetailedOrder> = {
    customerName: '',
    customerPhone: '',
    orderType: 'dine-in',
    paymentMethod: 'cash',
    notes: ''
  };

  // Analytics data
  todaysAnalytics: any = null;
  seasonalTrends: any = null;
  private menuSubscription?: Subscription;

  constructor(
    private menuService: MenuService,
    private analyticsService: AnalyticsService,
    private alertController: AlertController,
    private toastController: ToastController,
    private karenderiaInfoService: KarenderiaInfoService,
    private authService: AuthService
  ) { }

  ngOnInit() {
    this.loadMenuItems();
    this.loadTodaysAnalytics();
    this.loadSeasonalTrends();
  }

  ngOnDestroy() {
    if (this.menuSubscription) {
      this.menuSubscription.unsubscribe();
    }
  }

  loadMenuItems() {
    if (this.menuSubscription) {
      this.menuSubscription.unsubscribe();
    }

    this.menuSubscription = this.menuService.menuItems$.subscribe(items => {
      if (items && items.length > 0) {
        this.menuItems = items.map((item: any) => ({
          ...item,
          category: this.mapToPosCategory(item.category),
          isAvailable: item.isAvailable !== false
        }));
      }
    });

    this.menuService.loadMenuItems().catch(error => {
      console.error('Error loading live menu items for POS:', error);
    });
  }

  private mapToPosCategory(category: string): string {
    const value = (category || '').toLowerCase();

    if (value.includes('main') || value.includes('ulam')) return 'Ulam';
    if (value.includes('sabaw') || value.includes('soup')) return 'Sabaw';
    if (value.includes('rice') || value.includes('kanin')) return 'Rice';
    if (value.includes('dessert') || value.includes('sweet')) return 'Dessert';
    if (value.includes('drink') || value.includes('beverage')) return 'Drinks';
    return 'Ulam';
  }

  selectCategory(categoryId: string) {
    this.selectedCategory = categoryId;
  }

  getFilteredMenuItems(): MenuItem[] {
    let filtered = this.menuItems;

    filtered = filtered.filter(item => item.isAvailable !== false);
    
    // Filter by category
    if (this.selectedCategory !== 'all') {
      filtered = filtered.filter(item => 
        item.category.toLowerCase() === this.selectedCategory.toLowerCase()
      );
    }
    
    // Filter by search term
    if (this.searchTerm) {
      filtered = filtered.filter(item =>
        item.name.toLowerCase().includes(this.searchTerm.toLowerCase()) ||
        item.description.toLowerCase().includes(this.searchTerm.toLowerCase())
      );
    }
    
    return filtered;
  }

  addToOrder(menuItem: MenuItem) {
    const existingItem = this.currentOrder.find(item => item.menuItem.id === menuItem.id);
    
    if (existingItem) {
      existingItem.quantity += 1;
      existingItem.subtotal = existingItem.quantity * menuItem.price;
    } else {
      this.currentOrder.push({
        menuItem,
        quantity: 1,
        subtotal: menuItem.price
      });
    }
  }

  removeFromOrder(itemOrIndex: any) {
    const index = typeof itemOrIndex === 'number'
      ? itemOrIndex
      : this.currentOrder.indexOf(itemOrIndex);

    if (index >= 0) {
      this.currentOrder.splice(index, 1);
    }
  }

  updateQuantity(index: number, newQuantity: number) {
    if (newQuantity <= 0) {
      this.removeFromOrder(index);
    } else {
      this.currentOrder[index].quantity = newQuantity;
      this.currentOrder[index].subtotal = newQuantity * this.currentOrder[index].menuItem.price;
    }
  }

  getOrderTotal(): number {
    return this.currentOrder.reduce((total, item) => total + item.subtotal, 0);
  }

  async loadTodaysAnalytics() {
    try {
      const currentKarenderia = this.karenderiaInfoService.getCurrentKarenderia();
      const karenderiaId = currentKarenderia?.id?.toString() || '1';
      this.todaysAnalytics = await this.analyticsService.getSalesAnalytics(karenderiaId, 'daily');
    } catch (error) {
      console.error('Error loading analytics:', error);
    }
  }

  async loadSeasonalTrends() {
    try {
      const currentKarenderia = this.karenderiaInfoService.getCurrentKarenderia();
      const karenderiaId = currentKarenderia?.id?.toString() || '1';
      const currentSeason = this.getCurrentSeason();
      this.seasonalTrends = await this.analyticsService.getPopularItemsBySeason(karenderiaId, currentSeason);
    } catch (error) {
      console.error('Error loading seasonal trends:', error);
    }
  }

  getCurrentSeason(): string {
    const month = new Date().getMonth() + 1;
    if (month >= 12 || month <= 2) return month === 12 ? 'christmas' : 'dry';
    if (month >= 3 && month <= 5) return 'summer';
    return 'wet';
  }

  getTimeOfDay(): 'breakfast' | 'lunch' | 'merienda' | 'dinner' | 'late-night' {
    const hour = new Date().getHours();
    if (hour >= 6 && hour < 10) return 'breakfast';
    if (hour >= 10 && hour < 14) return 'lunch';
    if (hour >= 14 && hour < 17) return 'merienda';
    if (hour >= 17 && hour < 22) return 'dinner';
    return 'late-night';
  }

  async processOrder() {
    if (this.currentOrder.length === 0) {
      const toast = await this.toastController.create({
        message: 'Please add items to the order',
        duration: 2000,
        color: 'warning'
      });
      await toast.present();
      return;
    }

    const confirmed = await this.confirmOrderBeforeSubmit();
    if (!confirmed) {
      return;
    }

    await this.submitConfirmedOrder();
  }

  private async confirmOrderBeforeSubmit(): Promise<boolean> {
    const itemLines = this.currentOrder
      .map(item => `• ${item.quantity}x ${item.menuItem.name} — ${this.formatPhp(item.subtotal)}`)
      .join('\n');

    const messageParts = [
      this.tableNumber ? `Table: ${this.tableNumber}` : '',
      `Payment: ${this.paymentMethod.toUpperCase()}`,
      '',
      'Items:',
      itemLines,
      '',
      `Total: ${this.formatPhp(this.getOrderTotal())}`,
      '',
      'Submit this purchase?',
    ].filter(part => part.length > 0);

    const alert = await this.alertController.create({
      header: 'Confirm Purchase',
      message: messageParts.join('\n'),
      buttons: [
        {
          text: 'Cancel',
          role: 'cancel',
        },
        {
          text: 'Confirm',
          role: 'confirm',
        },
      ],
    });

    await alert.present();
    const { role } = await alert.onDidDismiss();
    return role === 'confirm';
  }

  private async submitConfirmedOrder() {
    try {
      // Calculate totals and analytics
      const subtotal = this.getOrderTotal();
      const tax = 0; // Adjust based on local tax requirements
      const discount = 0; // Apply discounts if any
      const totalAmount = subtotal + tax - discount;

      // Create detailed order items with cost analysis
      const detailedItems: DetailedOrderItem[] = this.currentOrder.map(orderItem => {
        const ingredientCost = this.calculateIngredientCost(orderItem.menuItem);
        const profitMargin = orderItem.subtotal - (ingredientCost * orderItem.quantity);

        return {
          menuItemId: orderItem.menuItem.id,
          menuItemName: orderItem.menuItem.name,
          quantity: orderItem.quantity,
          unitPrice: orderItem.menuItem.price,
          subtotal: orderItem.subtotal,
          ingredientCost: ingredientCost * orderItem.quantity,
          profitMargin,
          preparationTime: orderItem.menuItem.preparationTime,
          specialInstructions: '', // Could be added from UI
          modifications: [] // Could be added from UI
        };
      });

      // Create detailed order
      const currentKarenderia = this.karenderiaInfoService.getCurrentKarenderia();
      const karenderiaId = currentKarenderia?.id?.toString() || '1';
      
      const detailedOrder: Omit<DetailedOrder, 'id' | 'orderNumber' | 'placedAt' | 'seasonalData'> = {
        karenderiaId,
        items: detailedItems,
        customerName: this.customerName,
        customerPhone: this.currentDetailedOrder.customerPhone,
        orderType: this.orderType,
        subtotal,
        tax,
        discount,
        totalAmount,
        paymentMethod: this.paymentMethod,
        orderStatus: 'pending',
        notes: this.currentDetailedOrder.notes,
        // For POS, orders are paid immediately, so mark as 'completed' instead of 'pending'
        // The backend will handle inventory deduction and sales analytics
      };
      
      // Convert camelCase to snake_case for backend API
      const orderPayload = {
        karenderiaId: karenderiaId,
        items: detailedItems,
        customerName: this.customerName || (this.tableNumber ? `Table ${this.tableNumber}` : ''),
        customerPhone: this.currentDetailedOrder.customerPhone || '',
        orderType: this.orderType,
        subtotal,
        tax,
        discount,
        totalAmount,
        paymentMethod: this.paymentMethod,
        orderStatus: 'completed',
        tableNumber: this.tableNumber || '',
        notes: this.currentDetailedOrder.notes,
        seasonalData: {
          season: this.getCurrentSeason(),
          month: new Date().getMonth() + 1,
          dayOfWeek: new Date().getDay(),
          timeOfDay: this.getTimeOfDay()
        }
      };

      // Save to database with analytics
      const orderId = await this.analyticsService.createDetailedOrder(orderPayload as any);

      // Show success message with business insights
      await this.showOrderSuccessWithInsights(orderId, orderPayload);

      // Clear current order
      this.clearOrder();
      this.tableNumber = '';
      
      // Reload analytics
      await this.loadTodaysAnalytics();
      await this.loadSeasonalTrends();

    } catch (error) {
      console.error('Error processing order:', error);
      const toast = await this.toastController.create({
        message: 'Failed to process order. Please try again.',
        duration: 3000,
        color: 'danger'
      });
      await toast.present();
    }
  }

  calculateIngredientCost(menuItem: MenuItem): number {
    return menuItem.ingredients.reduce((total, ingredient) => total + ingredient.cost, 0);
  }

  async showOrderSuccessWithInsights(orderId: string, order: any) {
    const messageParts = [
      'Your sale has been recorded.',
      this.tableNumber ? `Table: ${this.tableNumber}` : '',
      orderId ? `Reference: #${orderId}` : '',
      `Total paid: ${this.formatPhp(order.totalAmount)}`,
      'Stock and sales totals have been updated.',
    ].filter(part => part.length > 0);

    const alert = await this.alertController.create({
      header: 'Purchase Successful',
      message: messageParts.join('\n'),
      buttons: ['OK'],
    });

    await alert.present();
  }

  getOrderInsight(order: any): string {
    const currentSeason = this.getCurrentSeason();
    const insights = this.analyticsService.getSeasonalRecommendations(currentSeason);
    
    // Analyze the current order
    const mostExpensiveItem = order.items.reduce((prev: any, current: any) => 
      prev.unitPrice > current.unitPrice ? prev : current
    );

    return `During ${currentSeason} season, ${mostExpensiveItem.menuItemName} is performing well. ${insights[0]}`;
  }

  async showDetailedAnalytics() {
    const alert = await this.alertController.create({
      header: '📈 Today\'s Business Analytics',
      message: `
        <div style="text-align: left;">
          ${this.todaysAnalytics ? `
            <p><strong>Total Sales:</strong> ${this.formatPhp(this.todaysAnalytics.totalSales)}</p>
            <p><strong>Orders:</strong> ${this.todaysAnalytics.totalOrders}</p>
            <p><strong>Average Order:</strong> ${this.formatPhp(this.todaysAnalytics.averageOrderValue)}</p>
            <p><strong>Profit:</strong> ${this.formatPhp(this.todaysAnalytics.totalProfit)}</p>
            <br>
            <p><strong>🏆 Top Item Today:</strong></p>
            <p>${this.todaysAnalytics.topSellingItems[0]?.menuItemName || 'No data yet'}</p>
          ` : '<p>No analytics data available yet.</p>'}
        </div>
      `,
      buttons: ['Close']
    });

    await alert.present();
  }

  formatPhp(amount: number): string {
    return new Intl.NumberFormat('en-PH', {
      style: 'currency',
      currency: 'PHP',
      minimumFractionDigits: 2
    }).format(amount);
  }

  clearOrder() {
    this.currentOrder = [];
  }

  async showOrderHistory() {
    // Navigate to order history page
    console.log('Show order history');
  }

  setPaymentMethod(method: 'cash' | 'card' | 'gcash') {
    this.paymentMethod = method;
  }

  handleImageError(event: any) {
    event.target.src = 'assets/default-food.svg';
  }

  getSelectedCategoryName(): string {
    const category = this.categories.find(c => c.id === this.selectedCategory);
    return category ? category.name : '';
  }

  // Helper method to get appropriate image for menu items
  getItemImage(item: MenuItem): string {
    // If item already has an image, use it
    if (item.image && item.image !== 'assets/default-food.png') {
      return item.image;
    }

    // Map dish names to your new images
    const dishName = item.name?.toLowerCase() || '';
    
    if (dishName.includes('adobo') || dishName.includes('chicken adobo')) {
      return 'assets/images/filipino-adobo-chicken-rice.png';
    }
    if (dishName.includes('kare-kare') || dishName.includes('kare kare')) {
      return 'assets/images/filipino-kare-kare.png';
    }
    if (dishName.includes('lechon') || dishName.includes('kawali')) {
      return 'assets/images/filipino-lechon-kawali.png';
    }
    if (dishName.includes('sinigang') || dishName.includes('baboy')) {
      return 'assets/images/filipino-sinigang.png';
    }
    if (dishName.includes('halo-halo') || dishName.includes('dessert')) {
      return 'assets/images/halo-halo-dessert.png';
    }
    if (dishName.includes('garlic rice') || dishName.includes('fried rice')) {
      return 'assets/images/garlic-rice.png';
    }
    if (dishName.includes('rice') && !dishName.includes('fried')) {
      return 'assets/images/plain-white-rice.png';
    }
    if (dishName.includes('tea') || dishName.includes('iced')) {
      return 'assets/images/iced-tea.png';
    }
    
    // Default fallback
    return 'assets/images/placeholder-food.jpg';
  }

  // Add missing methods
  showSettings() {
    console.log('Show settings');
  }

  getCategoryItemCount(categoryId: string): number {
    return this.menuItems.filter(item => item.category === categoryId).length;
  }

  searchItems() {
    console.log('Search items');
  }

  // Additional helper methods
  getSubtotal() {
    return this.currentOrder.reduce((total, item) => total + item.subtotal, 0);
  }

  getTotal() {
    return this.getSubtotal();
  }

  increaseQuantity(item: any) {
    item.quantity++;
    item.subtotal = item.quantity * item.menuItem.price;
  }

  decreaseQuantity(item: any) {
    if (item.quantity > 1) {
      item.quantity--;
      item.subtotal = item.quantity * item.menuItem.price;
    } else {
      this.removeFromOrder(this.currentOrder.indexOf(item));
    }
  }

  /**
   * @deprecated Use processOrder() instead - this method is a legacy stub
   */
  processPayment() {
    this.processOrder();
  }

  logout() {
    this.authService.logoutAndRedirect();
  }

  // Dynamic karenderia display methods
  getKarenderiaDisplayName(): string {
    return this.karenderiaInfoService.getKarenderiaDisplayName();
  }

  getKarenderiaBrandInitials(): string {
    return this.karenderiaInfoService.getKarenderiaBrandInitials();
  }
}
