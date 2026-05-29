import { Component, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import { MenuService } from '../services/menu.service';
import { AuthService } from '../services/auth.service';
import { KarenderiaInfoService } from '../services/karenderia-info.service';
import { AnalyticsService, PosTransaction } from '../services/analytics.service';
import { MenuItem, Ingredient, DailySales } from '../models/menu.model';
import { InventoryService } from '../services/inventory.service';
import { firstValueFrom } from 'rxjs';

@Component({
  selector: 'app-karenderia-dashboard',
  templateUrl: './karenderia-dashboard.page.html',
  styleUrls: ['./karenderia-dashboard.page.scss'],
  standalone: false,
})
export class KarenderiaDashboardPage implements OnInit {
  todaysSales: DailySales | null = null;
  lowStockItems: Ingredient[] = [];
  lowStockAlerts: any[] = [];
  topMeals: Array<{ itemName: string; quantity: number; revenue: number }> = [];
  menuItemsCount = 0;
  averageRating = 0;
  isLoading = true;
  transactionHistory: PosTransaction[] = [];
  transactionFilter: 'today' | 'all' = 'today';
  selectedTransaction: PosTransaction | null = null;

  constructor(
    private router: Router,
    private menuService: MenuService,
    private authService: AuthService,
    private karenderiaInfoService: KarenderiaInfoService,
    private inventoryService: InventoryService,
    private analyticsService: AnalyticsService
  ) { }

  async ngOnInit() {
    await this.refreshDashboard();
  }

  async ionViewWillEnter() {
    await this.refreshDashboard(false);
  }

  private async refreshDashboard(showFullLoader = true) {
    if (showFullLoader) {
      this.isLoading = true;
    }

    try {
      await this.karenderiaInfoService.reloadKarenderiaData();
      await this.loadDashboardData();
    } catch (error) {
      console.error('Error loading dashboard data:', error);
    } finally {
      this.isLoading = false;
    }
  }

  async loadDashboardData() {
    try {
      await this.menuService.loadMenuItems();

      const salesPromise = this.menuService.getDailySales(new Date());
      const alertsPromise = firstValueFrom(this.inventoryService.getLowStockAlerts());
      const transactionsPromise = this.analyticsService.getRecentTransactions(50, this.transactionFilter);

      const [sales, alertsResponse, transactions] = await Promise.all([
        salesPromise,
        alertsPromise,
        transactionsPromise,
      ]);
      this.transactionHistory = transactions;
      this.todaysSales = sales;
      this.topMeals = (sales.popularItems || []).slice(0, 5).map(item => ({
        itemName: item.itemName,
        quantity: item.quantity,
        revenue: item.revenue
      }));

      const alerts = alertsResponse || {};
      this.lowStockAlerts = [
        ...(Array.isArray(alerts.low_stock) ? alerts.low_stock : []),
        ...(Array.isArray(alerts.out_of_stock) ? alerts.out_of_stock : [])
      ];

      const menuItems = await firstValueFrom(this.menuService.menuItems$);
      this.menuItemsCount = menuItems.length;
      this.lowStockItems = this.lowStockAlerts;
      this.averageRating = this.getAverageRating(menuItems);
    } catch (error) {
      console.error('Dashboard data loading error:', error);
      this.todaysSales = {
        date: new Date(),
        totalSales: 0,
        totalOrders: 0,
        popularItems: []
      };
      this.lowStockItems = [];
      this.lowStockAlerts = [];
      this.topMeals = [];
      this.menuItemsCount = 0;
      this.averageRating = 0;
      this.transactionHistory = [];
    }
  }

  async onTransactionFilterChange() {
    this.transactionHistory = await this.analyticsService.getRecentTransactions(50, this.transactionFilter);
  }

  selectTransaction(transaction: PosTransaction) {
    this.selectedTransaction = transaction;
  }

  clearSelectedTransaction() {
    this.selectedTransaction = null;
  }

  formatTransactionTime(date: Date): string {
    return new Intl.DateTimeFormat('en-PH', {
      month: 'short',
      day: 'numeric',
      hour: 'numeric',
      minute: '2-digit',
      hour12: true,
    }).format(new Date(date));
  }

  getPaymentLabel(method: string): string {
    const labels: Record<string, string> = {
      cash: 'Cash',
      card: 'Card',
      gcash: 'GCash',
      maya: 'Maya',
    };
    return labels[method] || method.toUpperCase();
  }

  private getAverageRating(menuItems: MenuItem[]): number {
    const rated = menuItems.filter((item: any) => Number(item?.average_rating || item?.averageRating || 0) > 0);
    if (!rated.length) {
      return 0;
    }

    const total = rated.reduce((sum, item: any) => sum + Number(item?.average_rating || item?.averageRating || 0), 0);
    return Number((total / rated.length).toFixed(1));
  }

  get completionRate(): number {
    if (!this.menuItemsCount) {
      return 0;
    }

    return Math.round(((this.menuItemsCount - this.lowStockAlerts.length) / this.menuItemsCount) * 100);
  }

  navigateToMenu() {
    this.router.navigate(['/karenderia-menu']);
  }

  navigateToDailyMenu() {
    this.router.navigate(['/daily-menu-management']);
  }

  navigateToPos() {
    this.router.navigate(['/karenderia-orders-pos']);
  }

  navigateToIngredients() {
    this.router.navigate(['/karenderia-ingredients']);
  }

  navigateToSettings() {
    this.router.navigate(['/karenderia-settings']);
  }

  navigateToAnalytics() {
    this.router.navigate(['/karenderia-analytics']);
  }

  navigateToInventory() {
    this.router.navigate(['/inventory-management']);
  }

  // Helper methods for dynamic karenderia display
  getKarenderiaDisplayName(): string {
    return this.karenderiaInfoService.getKarenderiaDisplayName();
  }

  getKarenderiaBrandInitials(): string {
    return this.karenderiaInfoService.getKarenderiaBrandInitials();
  }

  formatPhp(amount: number): string {
    return this.menuService.formatPhp(amount);
  }

  logout() {
    this.authService.logoutAndRedirect();
  }
}
