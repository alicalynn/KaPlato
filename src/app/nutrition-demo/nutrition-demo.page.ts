import { Component, OnInit, CUSTOM_ELEMENTS_SCHEMA } from '@angular/core';
import { IonicModule } from '@ionic/angular';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { EnhancedNutritionService, MenuItemNutrition } from '../services/enhanced-nutrition.service';
import { FavoritesService, FavoriteItem } from '../services/favorites.service';
import { KarenderiaService, MenuItem } from '../services/karenderia.service';
import { Subscription } from 'rxjs';

@Component({
  selector: 'app-nutrition-demo',
  templateUrl: './nutrition-demo.page.html',
  styleUrls: ['./nutrition-demo.page.scss'],
  standalone: true,
  imports: [IonicModule, CommonModule, FormsModule],
  schemas: [CUSTOM_ELEMENTS_SCHEMA]
})
export class NutritionDemoPage implements OnInit {

  selectedDemo = 'favorites';
  searchResults: MenuItemNutrition[] = [];
  filipinoDishes: string[] = [];
  sampleNutrition: MenuItemNutrition | null = null;
  loading = false;
  loadingFavorites = false;

  favoriteDishes: FavoriteItem[] = [];
  filteredFavoriteDishes: FavoriteItem[] = [];
  favoriteNutritionMap: Record<string, MenuItemNutrition | null> = {};
  rosaTestDishes: MenuItem[] = [];
  rosaNutritionMap: Record<string, MenuItemNutrition | null> = {};
  favoriteSearchQuery = '';
  dishSearchQuery = '';
  statusMessage = '';

  private favoritesSubscription?: Subscription;

  demoOptions = [
    { value: 'favorites', label: 'Favorite Dishes' },
    { value: 'search', label: 'Search Dish' },
    { value: 'api', label: 'Data Sources' }
  ];

  constructor(
    private nutritionService: EnhancedNutritionService,
    private favoritesService: FavoritesService,
    private karenderiaService: KarenderiaService
  ) {}

  async ngOnInit() {
    this.filipinoDishes = this.nutritionService.getAllFilipinoDishes();
    this.favoritesSubscription = this.favoritesService.favorites$.subscribe(favorites => {
      this.favoriteDishes = favorites;
      this.applyFavoritesFilter();
      this.loadNutritionForFavorites(favorites);
    });

    this.loadingFavorites = true;
    await this.favoritesService.loadFavorites();
    await this.loadRosaTestDishes();
    this.loadingFavorites = false;

    await this.demonstrateNutritionLookup();
  }

  ngOnDestroy() {
    this.favoritesSubscription?.unsubscribe();
  }

  async demonstrateNutritionLookup() {
    this.loading = true;
    try {
      // Demo: Get nutrition for a popular Filipino dish
      const nutrition = await this.nutritionService.getMenuItemNutrition('adobo', undefined, {
        allowEstimatedFallback: false
      });
      this.sampleNutrition = nutrition;
    } catch (error) {
      console.error('Error demonstrating nutrition lookup:', error);
    } finally {
      this.loading = false;
    }
  }

  async searchDishByName(dishName: string) {
    const searchTerm = dishName.trim();
    if (!searchTerm) {
      this.searchResults = [];
      this.statusMessage = 'Enter a dish name to search nutrition facts.';
      return;
    }

    this.loading = true;
    this.statusMessage = '';
    try {
      const nutrition = await this.nutritionService.getMenuItemNutrition(searchTerm, undefined, {
        allowEstimatedFallback: false
      });

      if (nutrition) {
        this.searchResults = [nutrition];
      } else {
        this.searchResults = [];
        this.statusMessage = 'No factual nutrition record found for that dish yet.';
      }
    } catch (error) {
      console.error('Error searching dish:', error);
      this.searchResults = [];
      this.statusMessage = 'Unable to search right now. Please try again.';
    } finally {
      this.loading = false;
    }
  }

  async searchHealthyOptions() {
    this.loading = true;
    try {
      const healthyDishes = this.nutritionService.searchFilipinoDishes({
        maxCalories: 300,
        dietaryTags: ['healthy']
      });
      
      this.searchResults = [];
      for (const dish of healthyDishes) {
        const nutrition = await this.nutritionService.getMenuItemNutrition(dish, undefined, {
          allowEstimatedFallback: false
        });
        if (nutrition) {
          this.searchResults.push(nutrition);
        }
      }
    } catch (error) {
      console.error('Error searching healthy options:', error);
    } finally {
      this.loading = false;
    }
  }

  async searchVegetarianOptions() {
    this.loading = true;
    try {
      const vegetarianDishes = this.nutritionService.searchFilipinoDishes({
        dietaryTags: ['vegetarian']
      });
      
      this.searchResults = [];
      for (const dish of vegetarianDishes) {
        const nutrition = await this.nutritionService.getMenuItemNutrition(dish, undefined, {
          allowEstimatedFallback: false
        });
        if (nutrition) {
          this.searchResults.push(nutrition);
        }
      }
    } catch (error) {
      console.error('Error searching vegetarian options:', error);
    } finally {
      this.loading = false;
    }
  }

  getCalorieColor(calories: number): string {
    if (calories < 200) return 'success';
    if (calories < 400) return 'warning';
    return 'danger';
  }

  getSpiceLevelIcon(level: string): string {
    switch (level) {
      case 'mild': return 'leaf';
      case 'medium': return 'flame';
      case 'spicy': return 'flame';
      case 'very_spicy': return 'flame';
      default: return 'help';
    }
  }

  onFavoriteSearchChange() {
    this.applyFavoritesFilter();
  }

  private applyFavoritesFilter() {
    const query = this.favoriteSearchQuery.trim().toLowerCase();
    if (!query) {
      this.filteredFavoriteDishes = [...this.favoriteDishes];
      return;
    }

    this.filteredFavoriteDishes = this.favoriteDishes.filter(favorite =>
      favorite.menuItemName.toLowerCase().includes(query) ||
      favorite.karenderiaName.toLowerCase().includes(query)
    );
  }

  private async loadNutritionForFavorites(favorites: FavoriteItem[]) {
    const pendingFavorites = favorites.filter(favorite => this.favoriteNutritionMap[favorite.menuItemId] === undefined);
    if (!pendingFavorites.length) {
      return;
    }

    await Promise.all(pendingFavorites.map(async favorite => {
      const nutrition = await this.nutritionService.getMenuItemNutrition(favorite.menuItemName, undefined, {
        allowEstimatedFallback: false
      });
      this.favoriteNutritionMap[favorite.menuItemId] = nutrition;
    }));
  }

  private async loadRosaTestDishes() {
    try {
      const dishes = await this.karenderiaService.getMenuItemsForKarenderia('1').toPromise();
      this.rosaTestDishes = [...(dishes || [])].sort((a, b) => {
        const aId = Number(a.id || 0);
        const bId = Number(b.id || 0);
        return bId - aId;
      });

      await Promise.all(this.rosaTestDishes.map(async dish => {
        if (!dish.id) {
          return;
        }

        const ingredientNames = (dish.ingredients || []).map((ingredient: any) => {
          if (typeof ingredient === 'string') {
            return ingredient;
          }

          return ingredient?.ingredientName || ingredient?.name || ingredient?.ingredient || '';
        }).filter(Boolean);

        const nutrition = await this.nutritionService.getMenuItemNutrition(dish.name, ingredientNames, {
          allowEstimatedFallback: false
        });
        this.rosaNutritionMap[dish.id] = nutrition;
      }));
    } catch (error) {
      console.error('Error loading Rosa test dishes:', error);
      this.rosaTestDishes = [];
    }
  }

  getIngredientNames(dish: MenuItem): string[] {
    return (dish.ingredients || []).map((ingredient: any) => {
      if (typeof ingredient === 'string') {
        return ingredient;
      }

      return ingredient?.ingredientName || ingredient?.name || ingredient?.ingredient || '';
    }).filter(Boolean);
  }

  getFavoriteNutrition(favorite: FavoriteItem): MenuItemNutrition | null {
    return this.favoriteNutritionMap[favorite.menuItemId] ?? null;
  }

  getRosaNutrition(dish: MenuItem): MenuItemNutrition | null {
    if (!dish.id) {
      return null;
    }

    return this.rosaNutritionMap[dish.id] ?? null;
  }

  getSourceLabel(nutrition: MenuItemNutrition | null): string {
    if (!nutrition?.dataSource) {
      return 'No source';
    }

    switch (nutrition.dataSource) {
      case 'spoonacular':
        return 'Spoonacular API';
      case 'filipino-db':
        return 'Filipino Database';
      case 'ingredient-db':
        return 'Ingredient Analysis';
      case 'estimated':
        return 'Estimated';
      default:
        return 'Unknown';
    }
  }

  getSourceColor(nutrition: MenuItemNutrition | null): string {
    if (!nutrition?.dataSource) {
      return 'medium';
    }

    return nutrition.dataSource === 'spoonacular' ? 'primary' :
      nutrition.dataSource === 'filipino-db' ? 'success' :
      nutrition.dataSource === 'ingredient-db' ? 'tertiary' :
      'warning';
  }
}
