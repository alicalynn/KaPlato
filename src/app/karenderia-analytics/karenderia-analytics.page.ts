import { Component, OnInit } from '@angular/core';
import { AnalyticsService } from '../services/analytics.service';
import { ToastController } from '@ionic/angular';
import { SalesAnalytics } from '../models/menu.model';

@Component({
  selector: 'app-karenderia-analytics',
  templateUrl: './karenderia-analytics.page.html',
  styleUrls: ['./karenderia-analytics.page.scss'],
  standalone: false
})
export class KarenderiaAnalyticsPage implements OnInit {
  dailyAnalytics: SalesAnalytics | null = null;
  weeklyAnalytics: SalesAnalytics | null = null;
  monthlyAnalytics: SalesAnalytics | null = null;
  
  selectedPeriod: 'daily' | 'weekly' | 'monthly' = 'daily';
  currentSeason: string = '';
  seasonalTrends: any[] = [];
  seasonalRecommendations: string[] = [];
  
  // Chart data
  salesByTimeData: any[] = [];
  topItemsData: any[] = [];

  readonly emptyAnalytics: SalesAnalytics = {
    karenderiaId: '',
    period: 'daily',
    date: new Date(),
    totalSales: 0,
    totalOrders: 0,
    totalProfit: 0,
    averageOrderValue: 0,
    salesByTimeOfDay: [],
    topSellingItems: [],
    seasonalTrends: []
  };
  
  constructor(
    private analyticsService: AnalyticsService,
    private toastController: ToastController
  ) { }

  // Add missing method
  getRecommendationIcon(index: number): string {
    const icons = ['bulb', 'trending-up', 'flash', 'star', 'rocket'];
    return icons[index % icons.length];
  }

  async ngOnInit() {
    this.currentSeason = this.getCurrentSeason();
    this.seasonalRecommendations = this.analyticsService.getSeasonalRecommendations(this.currentSeason);
    
    await this.loadAllAnalytics();
    await this.loadSeasonalTrends();
  }

  async loadAllAnalytics() {
    const karenderiaId = 'karenderia-id'; // Replace with actual ID
    
    try {
      this.dailyAnalytics = await this.analyticsService.getSalesAnalytics(karenderiaId, 'daily');
      this.weeklyAnalytics = await this.analyticsService.getSalesAnalytics(karenderiaId, 'weekly');
      this.monthlyAnalytics = await this.analyticsService.getSalesAnalytics(karenderiaId, 'monthly');
      
      this.updateChartData();
    } catch (error) {
      console.error('Error loading analytics:', error);
      this.dailyAnalytics = null;
      this.weeklyAnalytics = null;
      this.monthlyAnalytics = null;
      this.updateChartData();
    }
  }

  async loadSeasonalTrends() {
    const karenderiaId = 'karenderia-id'; // Replace with actual ID
    
    try {
      this.seasonalTrends = await this.analyticsService.getPopularItemsBySeason(karenderiaId, this.currentSeason);
    } catch (error) {
      console.error('Error loading seasonal trends:', error);
    }
  }

  updateChartData() {
    const analytics = this.getSelectedAnalyticsOrEmpty();
    
    this.salesByTimeData = analytics.salesByTimeOfDay || [];
    this.topItemsData = (analytics.topSellingItems || []).slice(0, 5);
  }

  onPeriodChange() {
    this.updateChartData();
  }

  getSelectedAnalytics(): SalesAnalytics | null {
    switch (this.selectedPeriod) {
      case 'daily': return this.dailyAnalytics;
      case 'weekly': return this.weeklyAnalytics;
      case 'monthly': return this.monthlyAnalytics;
      default: return this.dailyAnalytics;
    }
  }

  getSelectedAnalyticsOrEmpty(): SalesAnalytics {
    return this.getSelectedAnalytics() ?? this.emptyAnalytics;
  }

  hasAnyAnalyticsData(): boolean {
    const a = this.getSelectedAnalytics();
    if (!a) return false;
    return (a.totalSales || 0) > 0 || (a.totalOrders || 0) > 0 || (a.totalProfit || 0) > 0;
  }

  getCurrentSeason(): string {
    const month = new Date().getMonth() + 1;
    if (month >= 12 || month <= 2) return month === 12 ? 'christmas' : 'dry';
    if (month >= 3 && month <= 5) return 'summer';
    return 'wet';
  }

  formatPhp(amount: number): string {
    return this.analyticsService.formatPhp(amount);
  }

  getProfitMarginPercentage(): number {
    const analytics = this.getSelectedAnalyticsOrEmpty();
    if (analytics.totalSales === 0) return 0;
    return (analytics.totalProfit / analytics.totalSales) * 100;
  }

  getSeasonIcon(season: string): string {
    const icons: { [key: string]: string } = {
      'summer': 'sunny',
      'wet': 'rainy',
      'dry': 'partly-sunny',
      'christmas': 'gift'
    };
    return icons[season] || 'calendar';
  }

  getTimeSlotIcon(timeSlot: string): string {
    const icons: { [key: string]: string } = {
      'breakfast': 'cafe',
      'lunch': 'restaurant',
      'merienda': 'ice-cream',
      'dinner': 'wine',
      'late-night': 'moon'
    };
    return icons[timeSlot] || 'time';
  }

  getTrendingIcon(item: any): string {
    if (item.trending === 'up') return 'trending-up';
    if (item.trending === 'down') return 'trending-down';
    return 'remove';
  }

  getTrendingColor(item: any): string {
    if (item.trending === 'up') return 'success';
    if (item.trending === 'down') return 'danger';
    return 'medium';
  }

  getMaxRevenue(): number {
    if (!this.salesByTimeData || this.salesByTimeData.length === 0) return 0;
    return Math.max(...this.salesByTimeData.map(slot => slot.revenue || 0));
  }
}
