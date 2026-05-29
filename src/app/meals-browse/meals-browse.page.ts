import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { IonicModule, NavController, LoadingController, ToastController } from '@ionic/angular';
import { ActivatedRoute } from '@angular/router';
import { Subscription } from 'rxjs';
import { MealFilterComponent } from '../components/meal-filter/meal-filter.component';
import { MealFilterService, MealFilterOptions, FilterStats } from '../services/meal-filter.service';
import { KarenderiaService } from '../services/karenderia.service';
import { AllergenDetectionService } from '../services/allergen-detection.service';

@Component({
  selector: 'app-meals-browse',
  templateUrl: './meals-browse.page.html',
  styleUrls: ['./meals-browse.page.scss'],
  standalone: true,
  imports: [IonicModule, CommonModule, FormsModule, MealFilterComponent]
})
export class MealsBrowsePage implements OnInit, OnDestroy {
  allMeals: any[] = [];
  filteredMeals: any[] = [];
  isLoading = true;
  showFilters = false;
  currentFilters: MealFilterOptions = {};
  filterStats: FilterStats | null = null;
  activeAllergens: string[] = [];
  avoidRiskyDishes = false;

  constructor(
    private route: ActivatedRoute,
    private navController: NavController,
    private loadingController: LoadingController,
    private toastController: ToastController,
    private mealFilterService: MealFilterService,
    private karenderiaService: KarenderiaService,
    private allergenDetectionService: AllergenDetectionService
  ) {}

  async ngOnInit() {
    this.initializeAllergenDefaults();
    await this.loadMeals();
    this.checkQueryParams();
  }

  private initializeAllergenDefaults() {
    if (this.allergenDetectionService.hasConfiguredUserAllergens()) {
      const effectiveAllergens = this.allergenDetectionService.getEffectiveUserAllergens();
      this.activeAllergens = effectiveAllergens.map(allergen => allergen.name);
    } else {
      this.activeAllergens = [];
    }

    // Default: Don't filter - let users see all meals first
    // They can enable safety filter if they want
    this.avoidRiskyDishes = false;
    this.currentFilters.allergenSafe = false;
    this.currentFilters.specificAllergens = [];
  }

  async ionViewWillEnter() {
    // Refresh data every time the user enters this page
    await this.refreshMeals();
  }

  async refreshMeals() {
    // Force reload meals from all karenderias
    await this.loadMeals();
  }

  async doRefresh(event: any) {
    try {
      await this.refreshMeals();
      await this.showToast('Meals refreshed!');
    } catch (error) {
      console.error('Error refreshing meals:', error);
      await this.showToast('Failed to refresh meals');
    } finally {
      event.target.complete();
    }
  }

  private checkQueryParams() {
    this.route.queryParams.subscribe(params => {
      if (params['category']) {
        this.currentFilters.category = params['category'];
      }
      if (params['maxBudget']) {
        this.currentFilters.maxBudget = parseInt(params['maxBudget']);
      }
      if (params['allergenSafe']) {
        this.currentFilters.allergenSafe = params['allergenSafe'] === 'true';
      }
      this.applyFilters();
    });
  }

  async loadMeals() {
    this.isLoading = true;
    try {
      console.log('📱 Loading meals from all karenderias...');
      
      // Get all karenderias first
      const karenderias = await new Promise<any[]>((resolve, reject: any) => {
        this.karenderiaService.getAllKarenderias().subscribe({
          next: (data: any) => resolve(data || []),
          error: (err: any) => {
            console.error('❌ Error loading karenderias:', err);
            reject(err);
          }
        });
      });
      
      console.log('✅ Loaded', karenderias.length, 'karenderias');
      
      // Aggregate meals from all karenderias
      const allMealsFromKarenderias: any[] = [];
      
      for (const karenderia of karenderias) {
        try {
          const menuItems = await new Promise<any[]>((resolve, reject: any) => {
            this.karenderiaService.getMenuItemsForKarenderia(karenderia.id || karenderia.karenderiaId).subscribe({
              next: (items: any) => resolve(items || []),
              error: (err: any) => {
                console.warn(`⚠️ Error loading menu for karenderia ${karenderia.id}:`, err);
                resolve([]); // Continue with next karenderia on error
              }
            });
          });
          
          // Map menu items with karenderia info
          const mappedItems = menuItems.map((item: any) => ({
            id: item.id,
            name: item.name,
            description: item.description || 'Delicious dish',
            price: item.price,
            calories: item.nutritionalInfo?.calories || 0,
            protein: item.nutritionalInfo?.protein || 0,
            carbs: item.nutritionalInfo?.carbs || 0,
            fat: item.nutritionalInfo?.fat || 0,
            image: item.imageUrl || 'assets/images/food-placeholder.jpg',
            karenderia_name: karenderia.name || 'Unknown Karenderia',
            karenderia_id: karenderia.id || karenderia.karenderiaId || '',
            category: item.category || 'Main Dish',
            spicyLevel: 'Mild',
            isVegetarian: item.allergens?.length === 0 || false,
            isVegan: false,
            allergens: item.allergens || [],
            ingredients: item.ingredients?.map((ing: any) =>
              typeof ing === 'string' ? ing : ((ing as any).ingredientName || (ing as any).name || '')
            ) || [],
            average_rating: (item as any).average_rating || 0,
            total_reviews: (item as any).total_reviews || 0,
            available: item.isAvailable !== false
          }));
          
          allMealsFromKarenderias.push(...mappedItems);
          console.log(`✅ Loaded ${menuItems.length} meals from ${karenderia.name}`);
        } catch (error) {
          console.warn(`⚠️ Failed to load meals from ${karenderia.name}:`, error);
          // Continue loading other karenderias
        }
      }
      
      console.log('✅ Total meals loaded:', allMealsFromKarenderias.length);
      this.allMeals = allMealsFromKarenderias;
      this.filteredMeals = [...this.allMeals];
      this.updateFilterStats();
      
    } catch (error) {
      console.error('❌ Error loading meals:', error);
      this.allMeals = [];
      this.filteredMeals = [];
      this.updateFilterStats();
      await this.showToast('Failed to load meals from server');
    } finally {
      this.isLoading = false;
    }
  }

  ngOnDestroy() {
    // Cleanup if needed
  }

  private mapSpiciness(level: number | undefined): string {
    if (!level) return 'none';
    if (level <= 1) return 'none';
    if (level <= 2) return 'mild';
    if (level <= 4) return 'medium';
    return 'hot';
  }

  async onFiltersChanged(filters: MealFilterOptions) {
    this.currentFilters = filters;
    await this.applyFilters();
  }

  async toggleAvoidRiskyDishes(enabled: boolean) {
    this.avoidRiskyDishes = enabled;

    if (enabled) {
      this.currentFilters.allergenSafe = true;
      this.currentFilters.specificAllergens = [...this.activeAllergens];
    } else {
      this.currentFilters.allergenSafe = false;
      this.currentFilters.specificAllergens = [];
    }

    await this.applyFilters();
  }

  async applyFilters() {
    const loading = await this.loadingController.create({
      message: 'Applying filters...',
      duration: 500
    });
    await loading.present();

    try {
      this.filteredMeals = await this.mealFilterService.filterMeals(this.allMeals, this.currentFilters);
      this.updateFilterStats();
    } catch (error) {
      console.error('Error applying filters:', error);
      await this.showToast('Error applying filters');
    } finally {
      await loading.dismiss();
    }
  }

  onPresetApplied(presetName: string) {
    this.showToast(`Applied ${presetName} filter`);
  }

  toggleFilters() {
    this.showFilters = !this.showFilters;
  }

  async clearAllFilters() {
    this.currentFilters = this.mealFilterService.getDefaultFilters();
    await this.applyFilters();
    this.showToast('Filters cleared');
  }

  viewMealDetails(meal: any) {
    this.navController.navigateForward(['/meal-details', meal.id], {
      state: { menuItem: meal }
    });
  }

  goBack() {
    this.navController.back();
  }

  private updateFilterStats() {
    this.filterStats = this.mealFilterService.getFilterStats(this.allMeals, this.filteredMeals);
  }

  hasActiveAllergens(): boolean {
    return this.activeAllergens.length > 0;
  }

  hasConfiguredAllergens(): boolean {
    return this.allergenDetectionService.hasConfiguredUserAllergens();
  }

  private async showToast(message: string) {
    const toast = await this.toastController.create({
      message: message,
      duration: 2000,
      position: 'bottom'
    });
    await toast.present();
  }

  // Helper methods for template
  getSpicyIcon(level: string): string {
    switch (level) {
      case 'hot': return 'bonfire';
      case 'medium': return 'flame';
      case 'mild': return 'flame-outline';
      default: return 'leaf-outline';
    }
  }

  getSpicyColor(level: string): string {
    switch (level) {
      case 'hot': return 'danger';
      case 'medium': return 'warning';
      case 'mild': return 'primary';
      default: return 'success';
    }
  }

  trackByMealId(index: number, meal: any): string {
    return meal.id;
  }
}
