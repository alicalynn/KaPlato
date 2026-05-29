import { Component, OnInit, ViewChild, ElementRef, AfterViewInit } from '@angular/core';
import { LoadingController, ToastController, AlertController, ModalController } from '@ionic/angular';
import { Router } from '@angular/router';
import { KarenderiaService } from '../../services/karenderia.service';
import { NutritionAllergenService } from '../../services/nutrition-allergen.service';
import { InventoryManagementService } from '../../services/inventory-management.service';
import { AdvancedAnalyticsService } from '../../services/advanced-analytics.service';
import { POSService } from '../../services/pos.service';
import { KarenderiaReviewService } from '../../services/karenderia-review.service';
import { SupplyOrderMessagingService } from '../../services/supply-order-messaging.service';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { 
  IonHeader, 
  IonToolbar, 
  IonTitle, 
  IonButtons, 
  IonButton, 
  IonContent, 
  IonIcon, 
  IonCard, 
  IonCardHeader, 
  IonCardTitle, 
  IonCardContent, 
  IonChip, 
  IonLabel, 
  IonSpinner, 
  IonGrid,
  IonRow,
  IonCol,
  IonProgressBar,
  IonFab,
  IonFabButton,
  IonFabList,
  IonBadge
} from '@ionic/angular/standalone';
import { addIcons } from 'ionicons';
import { 
  refresh, 
  restaurant, 
  location, 
  call, 
  mail, 
  map, 
  time, 
  card, 
  cash, 
  create, 
  hourglassOutline, 
  checkmarkCircle, 
  closeCircle, 
  helpCircle,
  restaurantOutline,
  analytics,
  storefront,
  clipboardOutline,
  nutritionOutline,
  cubeOutline,
  add,
  barChart,
  trendingUp,
  warning,
  alertCircle,
  checkmark,
  business,
  people,
  calculator,
  pieChart
} from 'ionicons/icons';

declare var google: any;

// Add icons
addIcons({ 
  'refresh': refresh,
  'restaurant': restaurant,
  'location': location,
  'call': call,
  'mail': mail,
  'map': map,
  'time': time,
  'card': card,
  'cash': cash,
  'create': create,
  'hourglass-outline': hourglassOutline,
  'checkmark-circle': checkmarkCircle,
  'close-circle': closeCircle,
  'help-circle': helpCircle,
  'restaurant-outline': restaurantOutline,
  'analytics': analytics,
  'storefront': storefront,
  'clipboard-outline': clipboardOutline,
  'nutrition-outline': nutritionOutline,
  'cube-outline': cubeOutline,
  'add': add,
  'bar-chart': barChart,
  'trending-up': trendingUp,
  'warning': warning,
  'alert-circle': alertCircle,
  'checkmark': checkmark,
  'business': business,
  'people': people,
  'calculator': calculator,
  'pie-chart': pieChart
});

interface Karenderia {
  id: number;
  name: string;
  description: string;
  address: string;
  phone?: string;
  email?: string;
  latitude: number;
  longitude: number;
  opening_time?: string;
  closing_time?: string;
  operating_days?: string[];
  delivery_fee?: number;
  delivery_time_minutes?: number;
  accepts_cash: boolean;
  accepts_online_payment: boolean;
  status: 'pending' | 'active' | 'inactive';
  status_message: string;
  created_at: string;
  updated_at: string;
}

@Component({
  selector: 'app-karenderia-dashboard',
  templateUrl: './karenderia-dashboard.page.html',
  styleUrls: ['./karenderia-dashboard.page.scss'],
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    IonHeader,
    IonToolbar,
    IonTitle,
    IonButtons,
    IonButton,
    IonContent,
    IonIcon,
    IonCard,
    IonCardHeader,
    IonCardTitle,
    IonCardContent,
    IonChip,
    IonLabel,
    IonSpinner,
    IonGrid,
    IonRow,
    IonCol,
    IonProgressBar,
    IonFab,
    IonFabButton,
    IonFabList,
    IonBadge
  ]
})
export class KarenderiaDashboardPage implements OnInit, AfterViewInit {
  @ViewChild('mapContainer', { static: false }) mapContainer!: ElementRef;
  
  karenderia: Karenderia | null = null;
  isLoading = true;
  map: any;
  
  // Advanced Dashboard Data
  dashboardData = {
    todaysSales: 0,
    todaysOrders: 0,
    lowStockItems: 0,
    pendingOrders: 0,
    activeMenuItems: 0,
    allergenCompliantItems: 0,
    topSellingItem: '',
    salesTrend: 0
  };
  
  recentOrders: any[] = [];
  lowStockAlerts: any[] = [];
  salesAnalytics: any = null;
  nutritionInsights: any = null;
  isLoadingDashboard = true;
  
  // Reviews Data
  reviews: any[] = [];
  filteredReviews: any[] = [];
  isLoadingReviews = false;
  averageRating = 0;
  totalReviews = 0;
  approvedReviews = 0;
  pendingReviews = 0;
  selectedRatingFilter = '';
  reviewSortBy = 'newest';
  Math = Math;

  // Supplier Messages Data
  supplierMessages: any[] = [];
  unreadMessagesCount = 0;

  constructor(
    private loadingController: LoadingController,
    private toastController: ToastController,
    private alertController: AlertController,
    private modalController: ModalController,
    private router: Router,
    private karenderiaService: KarenderiaService,
    private nutritionAllergenService: NutritionAllergenService,
    private inventoryService: InventoryManagementService,
    private analyticsService: AdvancedAnalyticsService,
    private posService: POSService,
    private reviewService: KarenderiaReviewService,
    private messagingService: SupplyOrderMessagingService
  ) { }

  ngOnInit() {
    this.loadKarenderiaStatus();
    this.loadDashboardData();
    this.loadReviews();
    this.loadSupplierMessages();
  }

  ngAfterViewInit() {
    // Map will be loaded after karenderia data is available
  }

  async loadKarenderiaStatus() {
    this.isLoading = true;
    
    try {
      const response = await this.karenderiaService.getMyKarenderia().toPromise();
      
      if (response.success) {
        this.karenderia = response.data;
        
        // Load map after data is available
        setTimeout(() => {
          if (this.karenderia && this.mapContainer) {
            this.loadMap();
          }
        }, 100);
      } else {
        this.karenderia = null;
      }
    } catch (error: any) {
      console.error('Error loading karenderia status:', error);
      
      // If 404, means no karenderia application found
      if (error.status === 404) {
        this.karenderia = null;
      } else {
        this.showToast(error.message || 'Failed to load karenderia information', 'danger');
      }
    } finally {
      this.isLoading = false;
    }
  }

  async loadDashboardData() {
    this.isLoadingDashboard = true;
    
    try {
      // Load dashboard data using observables
      this.posService.getDailySalesSummary().then(dailySales => {
        if (dailySales) {
          this.dashboardData.todaysSales = dailySales.net_sales;
          this.dashboardData.todaysOrders = dailySales.total_orders;
        }
      }).catch(() => {
        // Handle error gracefully
        this.dashboardData.todaysSales = 1250.50; // Mock data
        this.dashboardData.todaysOrders = 8;
      });

      // Subscribe to inventory alerts
      this.inventoryService.inventoryAlerts$.subscribe((alerts: any[]) => {
        this.lowStockAlerts = alerts.filter((alert: any) => alert.type === 'low_stock').slice(0, 5);
        this.dashboardData.lowStockItems = this.lowStockAlerts.length;
      });

      // Subscribe to analytics data
      this.analyticsService.salesAnalytics$.subscribe(analytics => {
        if (analytics) {
          this.salesAnalytics = analytics;
          this.dashboardData.topSellingItem = 'Adobo Rice Bowl'; // Mock data
          this.dashboardData.salesTrend = analytics.total_sales > 0 ? 5.2 : 0;
        }
      });

      // Load recent orders
      this.recentOrders = await this.loadRecentOrders();
      this.dashboardData.pendingOrders = this.recentOrders.filter(order => order.status === 'pending').length;

      // Load nutrition insights
      this.nutritionInsights = await this.loadNutritionInsights();
      if (this.nutritionInsights) {
        this.dashboardData.allergenCompliantItems = this.nutritionInsights.allergenCompliantItems || 12;
        this.dashboardData.activeMenuItems = this.nutritionInsights.totalItems || 25;
      } else {
        // Mock data
        this.dashboardData.allergenCompliantItems = 12;
        this.dashboardData.activeMenuItems = 25;
      }

    } catch (error) {
      console.error('Error loading dashboard data:', error);
      // Set mock data on error
      this.dashboardData = {
        todaysSales: 1250.50,
        todaysOrders: 8,
        lowStockItems: 3,
        pendingOrders: 2,
        activeMenuItems: 25,
        allergenCompliantItems: 12,
        topSellingItem: 'Adobo Rice Bowl',
        salesTrend: 5.2
      };
    } finally {
      this.isLoadingDashboard = false;
    }
  }

  private async loadRecentOrders(): Promise<any[]> {
    try {
      // Mock data - replace with actual API call
      return [
        { id: 1, order_number: 'ORD-001', total: 350, status: 'pending', customer_name: 'Juan Cruz' },
        { id: 2, order_number: 'ORD-002', total: 450, status: 'preparing', customer_name: 'Maria Santos' },
        { id: 3, order_number: 'ORD-003', total: 275, status: 'completed', customer_name: 'Pedro Garcia' }
      ];
    } catch (error) {
      console.error('Error loading recent orders:', error);
      return [];
    }
  }

  private async loadNutritionInsights(): Promise<any> {
    try {
      // Mock nutrition insights data
      return {
        allergenCompliantItems: 12,
        totalItems: 25,
        averageCalories: 450,
        highProteinItems: 8,
        lowSodiumItems: 15,
        vegetarianOptions: 6
      };
    } catch (error) {
      console.error('Error loading nutrition insights:', error);
      return null;
    }
  }

  // Navigation Methods
  navigateToMenuManagement() {
    this.router.navigate(['/menu-management']);
  }

  navigateToPOS() {
    this.router.navigate(['/pos']);
  }

  navigateToInventory() {
    this.router.navigate(['/inventory-management']);
  }

  navigateToAnalytics() {
    this.router.navigate(['/analytics-dashboard']);
  }

  navigateToNutrition() {
    this.router.navigate(['/nutrition-allergen']);
  }

  // Quick Actions
  async addMenuItem() {
    // Navigate to add menu item
    this.router.navigate(['/menu-management'], { queryParams: { action: 'add' } });
  }

  async viewLowStock() {
    const alert = await this.alertController.create({
      header: 'Low Stock Items',
      message: this.lowStockAlerts.length > 0 
        ? this.lowStockAlerts.map(item => `${item.name}: ${item.current_stock} ${item.unit}`).join('\n')
        : 'No low stock items at the moment.',
      buttons: [
        {
          text: 'Manage Inventory',
          handler: () => {
            this.navigateToInventory();
          }
        },
        {
          text: 'OK',
          role: 'cancel'
        }
      ]
    });

    await alert.present();
  }

  async quickOrderStatusUpdate() {
    // Show pending orders for quick status update
    const alert = await this.alertController.create({
      header: 'Pending Orders',
      message: this.recentOrders.filter(order => order.status === 'pending').length > 0
        ? 'You have pending orders that need attention.'
        : 'No pending orders.',
      buttons: [
        {
          text: 'View POS',
          handler: () => {
            this.navigateToPOS();
          }
        },
        {
          text: 'OK',
          role: 'cancel'
        }
      ]
    });

    await alert.present();
  }

  // Analytics Quick Views
  getTrendIcon(trend: number): string {
    return trend >= 0 ? 'trending-up' : 'trending-down';
  }

  getTrendColor(trend: number): string {
    return trend >= 0 ? 'success' : 'danger';
  }

  formatCurrency(amount: number): string {
    return new Intl.NumberFormat('en-PH', {
      style: 'currency',
      currency: 'PHP'
    }).format(amount);
  }

  getStockLevelColor(stockLevel: number): string {
    if (stockLevel < 10) return 'danger';
    if (stockLevel < 20) return 'warning';
    return 'success';
  }

  loadMap() {
    if (!this.karenderia || !this.mapContainer) return;

    try {
      const location = {
        lat: this.karenderia.latitude,
        lng: this.karenderia.longitude
      };

      this.map = new google.maps.Map(this.mapContainer.nativeElement, {
        center: location,
        zoom: 16,
        mapTypeControl: false,
        streetViewControl: false,
        fullscreenControl: false,
        zoomControl: true
      });

      // Add marker for karenderia location
      new google.maps.Marker({
        position: location,
        map: this.map,
        title: this.karenderia.name,
        icon: {
          url: 'data:image/svg+xml;charset=UTF-8,%3Csvg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24"%3E%3Cpath fill="%23e74c3c" d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7zm0 9.5c-1.38 0-2.5-1.12-2.5-2.5s1.12-2.5 2.5-2.5 2.5 1.12 2.5 2.5-1.12 2.5-2.5 2.5z"/%3E%3C/svg%3E',
          scaledSize: new google.maps.Size(32, 32)
        }
      });

    } catch (error) {
      console.error('Error loading map:', error);
    }
  }

  async refreshStatus() {
    const loading = await this.loadingController.create({
      message: 'Refreshing status...',
      duration: 2000
    });
    await loading.present();
    
    await this.loadKarenderiaStatus();
    await loading.dismiss();
    
    this.showToast('Status refreshed', 'success');
  }

  getStatusClass(status: string): string {
    switch (status) {
      case 'pending': return 'status-pending';
      case 'active': return 'status-active';
      case 'inactive': return 'status-inactive';
      default: return 'status-unknown';
    }
  }

  getStatusIcon(status: string): string {
    switch (status) {
      case 'pending': return 'hourglass-outline';
      case 'active': return 'checkmark-circle';
      case 'inactive': return 'close-circle';
      default: return 'help-circle';
    }
  }

  getStatusText(status: string): string {
    switch (status) {
      case 'pending': return 'Under Review';
      case 'active': return 'Approved & Active';
      case 'inactive': return 'Rejected/Inactive';
      default: return 'Unknown Status';
    }
  }

  editKarenderia() {
    if (this.karenderia) {
      this.router.navigate(['/karenderia-registration'], {
        queryParams: { edit: true, id: this.karenderia.id }
      });
    }
  }

  async showToast(message: string, color: string = 'primary') {
    const toast = await this.toastController.create({
      message,
      duration: 3000,
      color,
      position: 'top'
    });
    await toast.present();
  }

  // Review Management Methods
  async loadReviews() {
    if (!this.karenderia) return;
    
    this.isLoadingReviews = true;
    try {
      const response: any = await this.reviewService.getReviews(this.karenderia.id).toPromise();
      
      if (response?.data) {
        this.reviews = response.data.reviews?.data || [];
        const stats = response.data.stats;
        
        this.averageRating = stats?.average || 0;
        this.totalReviews = stats?.total_reviews || 0;
        this.approvedReviews = stats?.approved_reviews || 0;
        this.pendingReviews = stats?.pending_reviews || 0;
        
        this.filterReviews();
      }
    } catch (error) {
      console.error('Error loading reviews:', error);
    } finally {
      this.isLoadingReviews = false;
    }
  }

  filterReviews() {
    let filtered = [...this.reviews];
    
    // Filter by rating
    if (this.selectedRatingFilter) {
      const rating = parseInt(this.selectedRatingFilter);
      filtered = filtered.filter(r => r.rating === rating);
    }
    
    // Sort
    switch (this.reviewSortBy) {
      case 'newest':
        filtered.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
        break;
      case 'oldest':
        filtered.sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime());
        break;
      case 'highest':
        filtered.sort((a, b) => b.rating - a.rating);
        break;
      case 'lowest':
        filtered.sort((a, b) => a.rating - b.rating);
        break;
    }
    
    this.filteredReviews = filtered;
  }

  async viewAllReviews() {
    // Navigate to reviews management page (if available) or open detailed modal
    this.router.navigate(['/karenderia-reviews-management']);
  }

  /**
   * Load recent supplier messages for the karenderia
   */
  async loadSupplierMessages() {
    try {
      // For now, initialize empty messages - will be populated when integrated with messaging service
      this.supplierMessages = [];
      this.unreadMessagesCount = 0;
      
      // TODO: Integrate with SupplyOrderMessagingService when available
      // const messages = await this.messagingService.getMessagesForKarenderia().toPromise();
      // if (messages?.data) {
      //   this.supplierMessages = messages.data.slice(0, 5);
      //   this.unreadMessagesCount = this.supplierMessages.filter(m => !m.read).length;
      // }
    } catch (error) {
      console.error('Error loading supplier messages:', error);
      this.supplierMessages = [];
      this.unreadMessagesCount = 0;
    }
  }

  /**
   * Reply to a supplier message
   */
  async replyToSupplier(message: any) {
    if (message.supply_order_id) {
      this.router.navigate(['/inventory-management'], {
        queryParams: {
          segment: 'owner-orders',
          openMessaging: message.supply_order_id
        }
      });
    }
  }

  /**
   * View all messages from suppliers
   */
  viewAllMessages() {
    this.router.navigate(['/inventory-management'], {
      queryParams: { segment: 'owner-orders' }
    });
  }
}
