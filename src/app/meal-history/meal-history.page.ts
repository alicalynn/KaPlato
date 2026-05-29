import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { IonicModule, NavController, AlertController, ModalController, ToastController } from '@ionic/angular';
import { Subscription } from 'rxjs';
import { FavoritesService, MealHistory } from '../services/favorites.service';
import { MealPlanStorageService, SavedMealPlanSnapshot } from '../services/meal-plan-storage.service';

@Component({
  selector: 'app-meal-history',
  templateUrl: './meal-history.page.html',
  styleUrls: ['./meal-history.page.scss'],
  standalone: true,
  imports: [IonicModule, CommonModule, FormsModule]
})
export class MealHistoryPage implements OnInit, OnDestroy {
  history: MealHistory[] = [];
  filteredHistory: MealHistory[] = [];
  frequentlyOrdered: MealHistory[] = [];
  recentOrders: MealHistory[] = [];
  savedMealPlans: SavedMealPlanSnapshot[] = [];
  
  searchQuery = '';
  selectedFilter = 'all';
  loading = true;
  showReviewModal = false;
  selectedHistoryItem: MealHistory | null = null;
  
  userRating = 0;
  userReview = '';

  filterOptions = [
    { value: 'all', label: 'All Orders' },
    { value: 'last-week', label: 'Last Week' },
    { value: 'last-month', label: 'Last Month' },
    { value: 'last-3-months', label: 'Last 3 Months' },
    { value: 'reviewed', label: 'Reviewed' },
    { value: 'not-reviewed', label: 'Not Reviewed' }
  ];

  private subscriptions: Subscription[] = [];

  constructor(
    private favoritesService: FavoritesService,
    private mealPlanStorageService: MealPlanStorageService,
    private navController: NavController,
    private alertController: AlertController,
    private modalController: ModalController,
    private toastController: ToastController
  ) {}

  ngOnInit() {
    this.subscriptions.push(
      this.favoritesService.history$.subscribe(history => {
        this.history = history;
        this.applyFilters();
        this.updateDashboardData();
        this.loading = false;
      })
    );

    this.loadSavedMealPlans();
  }

  ngOnDestroy() {
    this.subscriptions.forEach(sub => sub.unsubscribe());
  }

  async ionViewWillEnter() {
    this.loading = true;
    await this.favoritesService.loadHistory();
    this.loadSavedMealPlans();
  }

  loadSavedMealPlans() {
    this.savedMealPlans = this.mealPlanStorageService.loadMealPlans();
  }

  goToMealPlanner() {
    this.navController.navigateForward(['/meal-planner']);
  }

  removeSavedMealPlan(planId: string) {
    this.mealPlanStorageService.removeMealPlan(planId);
    this.loadSavedMealPlans();
  }

  openSavedMealPlan() {
    this.goToMealPlanner();
  }

  onSearchChange() {
    this.applyFilters();
  }

  onFilterChange() {
    this.applyFilters();
  }

  applyFilters() {
    let filtered = this.history;

    // Apply search filter
    if (this.searchQuery.trim()) {
      filtered = this.favoritesService.searchHistory(this.searchQuery.trim());
    }

    // Apply date and review filters
    const now = new Date();
    switch (this.selectedFilter) {
      case 'last-week':
        const lastWeek = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
        filtered = filtered.filter(item => new Date(item.orderedAt) >= lastWeek);
        break;
      case 'last-month':
        const lastMonth = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
        filtered = filtered.filter(item => new Date(item.orderedAt) >= lastMonth);
        break;
      case 'last-3-months':
        const last3Months = new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000);
        filtered = filtered.filter(item => new Date(item.orderedAt) >= last3Months);
        break;
      case 'reviewed':
        filtered = filtered.filter(item => item.rating && item.rating > 0);
        break;
      case 'not-reviewed':
        filtered = filtered.filter(item => !item.rating || item.rating === 0);
        break;
    }

    // Sort by date (most recent first)
    filtered = filtered.sort((a, b) => 
      new Date(b.orderedAt).getTime() - new Date(a.orderedAt).getTime()
    );

    this.filteredHistory = filtered;
  }

  updateDashboardData() {
    this.frequentlyOrdered = this.favoritesService.getFrequentlyOrdered();
    this.recentOrders = this.favoritesService.getRecentOrders(5);
  }

  async openReviewModal(historyItem: MealHistory) {
    this.selectedHistoryItem = historyItem;
    this.userRating = historyItem.rating || 0;
    this.userReview = historyItem.review || '';
    this.showReviewModal = true;
  }

  closeReviewModal() {
    this.showReviewModal = false;
    this.selectedHistoryItem = null;
    this.userRating = 0;
    this.userReview = '';
  }

  async submitReview() {
    if (!this.selectedHistoryItem || this.userRating === 0) {
      await this.showErrorToast('Please provide a rating');
      return;
    }

    try {
      await this.favoritesService.addReview(
        this.selectedHistoryItem.id, 
        this.userRating, 
        this.userReview
      );
      
      await this.showToast('Review submitted successfully');
      this.closeReviewModal();
      
    } catch (error) {
      console.error('Error submitting review:', error);
      await this.showErrorToast('Failed to submit review');
    }
  }

  setUserRating(rating: number) {
    this.userRating = rating;
  }

  async reorderItem(historyItem: MealHistory) {
    const alert = await this.alertController.create({
      header: 'Reorder Item',
      message: `Add "${historyItem.menuItemName}" to your cart?`,
      buttons: [
        {
          text: 'Cancel',
          role: 'cancel'
        },
        {
          text: 'Add to Cart',
          handler: async () => {
            try {
              // Assuming you have a cart service
              // await this.cartService.addToCart({
              //   menuItemId: historyItem.menuItemId,
              //   karenderiaId: historyItem.karenderiaId,
              //   quantity: historyItem.quantity
              // });
              
              await this.showToast(`Added ${historyItem.menuItemName} to cart`);
            } catch (error) {
              console.error('Error adding to cart:', error);
              await this.showErrorToast('Failed to add to cart');
            }
          }
        }
      ]
    });

    await alert.present();
  }

  async addToFavorites(historyItem: MealHistory) {
    try {
      await this.favoritesService.addToFavorites(
        historyItem.menuItemId, 
        historyItem.karenderiaId
      );
      await this.showToast('Added to favorites');
    } catch (error) {
      console.error('Error adding to favorites:', error);
      await this.showErrorToast('Failed to add to favorites');
    }
  }

  goToMealDetails(historyItem: MealHistory) {
    this.navController.navigateForward(['/meal-details', historyItem.menuItemId]);
  }

  goToKarenderia(historyItem: MealHistory) {
    this.navController.navigateForward(['/karenderia', historyItem.karenderiaId]);
  }

  getRatingStars(rating: number): string[] {
    const stars = [];
    const fullStars = Math.floor(rating);
    const hasHalfStar = rating % 1 >= 0.5;

    for (let i = 0; i < 5; i++) {
      if (i < fullStars) {
        stars.push('star');
      } else if (i === fullStars && hasHalfStar) {
        stars.push('star-half');
      } else {
        stars.push('star-outline');
      }
    }
    return stars;
  }

  getTimeAgo(date: Date): string {
    const now = new Date();
    const diffInMs = now.getTime() - new Date(date).getTime();
    const diffInDays = Math.floor(diffInMs / (1000 * 60 * 60 * 24));

    if (diffInDays === 0) {
      return 'Today';
    } else if (diffInDays === 1) {
      return '1 day ago';
    } else if (diffInDays < 7) {
      return `${diffInDays} days ago`;
    } else if (diffInDays < 30) {
      const weeks = Math.floor(diffInDays / 7);
      return `${weeks} week${weeks > 1 ? 's' : ''} ago`;
    } else {
      const months = Math.floor(diffInDays / 30);
      return `${months} month${months > 1 ? 's' : ''} ago`;
    }
  }

  getTotalSpent(): number {
    return this.history.reduce((total, item) => total + (item.menuItemPrice * item.quantity), 0);
  }

  getTotalOrders(): number {
    return this.history.length;
  }

  getAverageOrderValue(): number {
    const total = this.getTotalSpent();
    const count = this.getTotalOrders();
    return count > 0 ? total / count : 0;
  }

  getMostOrderedKarenderia(): string {
    const karenderiaCount = new Map<string, number>();
    
    this.history.forEach(item => {
      const count = karenderiaCount.get(item.karenderiaName) || 0;
      karenderiaCount.set(item.karenderiaName, count + 1);
    });

    let mostOrdered = '';
    let maxCount = 0;
    
    karenderiaCount.forEach((count, name) => {
      if (count > maxCount) {
        maxCount = count;
        mostOrdered = name;
      }
    });

    return mostOrdered;
  }

  trackByHistoryId(index: number, item: MealHistory): string {
    return item.id;
  }

  trackByMealPlanId(index: number, item: SavedMealPlanSnapshot): string {
    return item.id;
  }

  formatMealPlanSummary(plan: SavedMealPlanSnapshot): string {
    return `${plan.totalItems} item${plan.totalItems === 1 ? '' : 's'} · ${plan.meals.length} meal group${plan.meals.length === 1 ? '' : 's'}`;
  }

  private async showToast(message: string) {
    const toast = await this.toastController.create({
      message,
      duration: 2000,
      position: 'bottom'
    });
    await toast.present();
  }

  private async showErrorToast(message: string) {
    const toast = await this.toastController.create({
      message,
      duration: 3000,
      position: 'bottom',
      color: 'danger'
    });
    await toast.present();
  }
}
