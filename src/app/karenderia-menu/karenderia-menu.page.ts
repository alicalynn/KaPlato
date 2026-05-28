import { Component, OnInit, OnDestroy } from '@angular/core';
import { Router } from '@angular/router';
import { MenuService } from '../services/menu.service';
import { SpoonacularService } from '../services/spoonacular.service';
import { KarenderiaInfoService } from '../services/karenderia-info.service';
import { AllergenDetectionService } from '../services/allergen-detection.service';
import { MenuItem, MenuIngredient } from '../models/menu.model';
import { AlertController, ToastController, ModalController } from '@ionic/angular';
import { Subscription } from 'rxjs';
import { AuthService } from '../services/auth.service';

@Component({
  selector: 'app-karenderia-menu',
  templateUrl: './karenderia-menu.page.html',
  styleUrls: ['./karenderia-menu-new.page.scss'],
  standalone: false,
})
export class KarenderiaMenuPage implements OnInit, OnDestroy {
  menuItems: MenuItem[] = [];
  filteredMenuItems: MenuItem[] = [];
  selectedCategory = 'all';
  isAddingItem = false;
  editingItemId: string | null = null; // Track which item is being edited
  mappingEditorForId: string | null = null;
  mappingDraft: MenuIngredient[] = [];
  
  private menuSubscription?: Subscription;
  
  // New menu item form
  newMenuItem = {
    name: '',
    description: '',
    price: 0,
    category: 'main',
    preparationTime: 15,
    isAvailable: true,
    selectedIngredients: [] as MenuIngredient[],
    customIngredients: [] as MenuIngredient[]
  };

  // Common ingredients for different dish types
  commonIngredients: { [key: string]: { name: string; quantity: number; unit: string; cost: number; }[] } = {
    'adobo': [
      { name: 'Pork', quantity: 500, unit: 'g', cost: 250 },
      { name: 'Soy Sauce', quantity: 100, unit: 'ml', cost: 15 },
      { name: 'Vinegar', quantity: 50, unit: 'ml', cost: 10 },
      { name: 'Garlic', quantity: 50, unit: 'g', cost: 8 },
      { name: 'Bay Leaves', quantity: 5, unit: 'pieces', cost: 3 },
      { name: 'Black Pepper', quantity: 5, unit: 'g', cost: 2 },
      { name: 'Onion', quantity: 100, unit: 'g', cost: 12 }
    ],
    'humba': [
      { name: 'Pork Belly', quantity: 600, unit: 'g', cost: 300 },
      { name: 'Soy Sauce', quantity: 80, unit: 'ml', cost: 12 },
      { name: 'Brown Sugar', quantity: 50, unit: 'g', cost: 8 },
      { name: 'Garlic', quantity: 40, unit: 'g', cost: 6 },
      { name: 'Onion', quantity: 80, unit: 'g', cost: 10 },
      { name: 'Bay Leaves', quantity: 3, unit: 'pieces', cost: 2 },
      { name: 'Black Beans', quantity: 50, unit: 'g', cost: 15 },
      { name: 'Pineapple', quantity: 100, unit: 'g', cost: 20 }
    ],
    'sisig': [
      { name: 'Pork Belly', quantity: 400, unit: 'g', cost: 200 },
      { name: 'Pork Liver', quantity: 100, unit: 'g', cost: 80 },
      { name: 'Onion', quantity: 100, unit: 'g', cost: 12 },
      { name: 'Chili', quantity: 30, unit: 'g', cost: 8 },
      { name: 'Calamansi', quantity: 50, unit: 'ml', cost: 10 },
      { name: 'Soy Sauce', quantity: 30, unit: 'ml', cost: 5 },
      { name: 'Mayonnaise', quantity: 50, unit: 'g', cost: 15 },
      { name: 'Egg', quantity: 1, unit: 'piece', cost: 12 }
    ],
    'pancit': [
      { name: 'Pancit Noodles', quantity: 200, unit: 'g', cost: 25 },
      { name: 'Pork', quantity: 200, unit: 'g', cost: 100 },
      { name: 'Chicken', quantity: 200, unit: 'g', cost: 80 },
      { name: 'Cabbage', quantity: 150, unit: 'g', cost: 15 },
      { name: 'Carrots', quantity: 100, unit: 'g', cost: 12 },
      { name: 'Soy Sauce', quantity: 60, unit: 'ml', cost: 9 },
      { name: 'Garlic', quantity: 30, unit: 'g', cost: 5 },
      { name: 'Onion', quantity: 80, unit: 'g', cost: 10 }
    ],
    'kare-kare': [
      { name: 'Oxtail', quantity: 500, unit: 'g', cost: 400 },
      { name: 'Peanut Butter', quantity: 100, unit: 'g', cost: 35 },
      { name: 'Eggplant', quantity: 200, unit: 'g', cost: 25 },
      { name: 'String Beans', quantity: 150, unit: 'g', cost: 20 },
      { name: 'Bok Choy', quantity: 200, unit: 'g', cost: 30 },
      { name: 'Shrimp Paste', quantity: 50, unit: 'g', cost: 15 },
      { name: 'Rice Flour', quantity: 50, unit: 'g', cost: 8 },
      { name: 'Onion', quantity: 100, unit: 'g', cost: 12 }
    ],
    'lechon-kawali': [
      { name: 'Pork Belly', quantity: 600, unit: 'g', cost: 300 },
      { name: 'Salt', quantity: 20, unit: 'g', cost: 2 },
      { name: 'Bay Leaves', quantity: 5, unit: 'pieces', cost: 3 },
      { name: 'Peppercorns', quantity: 10, unit: 'g', cost: 5 },
      { name: 'Cooking Oil', quantity: 500, unit: 'ml', cost: 60 }
    ],
    'beef-stew': [
      { name: 'Beef', quantity: 500, unit: 'g', cost: 350 },
      { name: 'Potatoes', quantity: 300, unit: 'g', cost: 30 },
      { name: 'Carrots', quantity: 200, unit: 'g', cost: 24 },
      { name: 'Tomato Sauce', quantity: 200, unit: 'ml', cost: 25 },
      { name: 'Onion', quantity: 150, unit: 'g', cost: 18 },
      { name: 'Garlic', quantity: 50, unit: 'g', cost: 8 },
      { name: 'Bell Pepper', quantity: 100, unit: 'g', cost: 15 }
    ],
    'fried-rice': [
      { name: 'Rice', quantity: 300, unit: 'g', cost: 20 },
      { name: 'Egg', quantity: 2, unit: 'pieces', cost: 24 },
      { name: 'Garlic', quantity: 30, unit: 'g', cost: 5 },
      { name: 'Soy Sauce', quantity: 40, unit: 'ml', cost: 6 },
      { name: 'Green Onions', quantity: 50, unit: 'g', cost: 8 },
      { name: 'Cooking Oil', quantity: 50, unit: 'ml', cost: 6 }
    ]
  };

  selectedDishType = '';
  showIngredientSelection = false;

  constructor(
    private router: Router,
    private menuService: MenuService,
    private spoonacularService: SpoonacularService,
    private alertController: AlertController,
    private toastController: ToastController,
    private modalController: ModalController,
    private karenderiaInfoService: KarenderiaInfoService,
    private allergenDetectionService: AllergenDetectionService,
    private authService: AuthService
  ) { }

  ngOnInit() {
    this.loadMenuItems();
  }

  ngOnDestroy() {
    // Clean up subscription to prevent memory leaks
    if (this.menuSubscription) {
      this.menuSubscription.unsubscribe();
    }
  }

  loadMenuItems() {
    // Subscribe to menu items from the service
    // The service automatically loads data in its constructor, so we just need to subscribe
    // Unsubscribe any existing subscription first to prevent duplicates
    if (this.menuSubscription) {
      this.menuSubscription.unsubscribe();
    }
    
    this.menuSubscription = this.menuService.menuItems$.subscribe(items => {
      console.log('Menu items received in component:', items);
      
      // Remove any potential duplicates based on ID and name
      const uniqueItems = items.filter((item, index, self) => {
        return index === self.findIndex(i => 
          (i.id && item.id && i.id === item.id) || 
          (i.name === item.name && !i.id && !item.id)
        );
      });
      
      console.log('Unique menu items after deduplication:', uniqueItems);
      this.menuItems = uniqueItems;
      this.filterByCategory();
    });
  }

  filterByCategory(category?: string) {
    if (category) {
      this.selectedCategory = category;
    }
    
    if (this.selectedCategory === 'all') {
      this.filteredMenuItems = this.menuItems;
    } else {
      this.filteredMenuItems = this.menuItems.filter(item => 
        item.category === this.selectedCategory
      );
    }
  }

  startAddingItem() {
    this.isAddingItem = true;
    this.resetNewItemForm();
  }

  cancelAddingItem() {
    this.isAddingItem = false;
    this.editingItemId = null; // Reset editing state
    this.resetNewItemForm();
  }

  resetNewItemForm() {
    this.newMenuItem = {
      name: '',
      description: '',
      price: 0,
      category: 'main',
      preparationTime: 15,
      isAvailable: true,
      selectedIngredients: [],
      customIngredients: []
    };
    this.selectedDishType = '';
    this.showIngredientSelection = false;
  }

  onDishTypeChange() {
    if (this.selectedDishType && this.commonIngredients[this.selectedDishType]) {
      this.showIngredientSelection = true;
      // Pre-select common ingredients
      this.newMenuItem.selectedIngredients = this.commonIngredients[this.selectedDishType].map((ing: any) => ({
        ingredientId: this.generateTempId(),
        ingredientName: ing.name,
        quantity: ing.quantity,
        unit: ing.unit,
        cost: ing.cost
      }));
    } else {
      this.showIngredientSelection = false;
      this.newMenuItem.selectedIngredients = [];
    }
  }

  toggleIngredient(ingredient: any, checked: boolean) {
    if (checked) {
      // Add ingredient if not already selected
      if (!this.newMenuItem.selectedIngredients.find(ing => ing.ingredientName === ingredient.name)) {
        this.newMenuItem.selectedIngredients.push({
          ingredientId: this.generateTempId(),
          ingredientName: ingredient.name,
          quantity: ingredient.quantity,
          unit: ingredient.unit,
          cost: ingredient.cost
        });
      }
    } else {
      // Remove ingredient
      this.newMenuItem.selectedIngredients = this.newMenuItem.selectedIngredients.filter(
        ing => ing.ingredientName !== ingredient.name
      );
    }
  }

  isIngredientSelected(ingredientName: string): boolean {
    return this.newMenuItem.selectedIngredients.some(ing => ing.ingredientName === ingredientName);
  }

  async addCustomIngredient() {
    const alert = await this.alertController.create({
      header: 'Add Custom Ingredient',
      inputs: [
        {
          name: 'name',
          type: 'text',
          placeholder: 'Ingredient name'
        },
        {
          name: 'quantity',
          type: 'number',
          placeholder: 'Quantity'
        },
        {
          name: 'unit',
          type: 'text',
          placeholder: 'Unit (g, ml, pieces, etc.)'
        },
        {
          name: 'cost',
          type: 'number',
          placeholder: 'Cost in PHP'
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
            if (data.name && data.quantity && data.unit && data.cost) {
              this.newMenuItem.selectedIngredients.push({
                ingredientId: this.generateTempId(),
                ingredientName: data.name,
                quantity: parseFloat(data.quantity),
                unit: data.unit,
                cost: parseFloat(data.cost)
              });
              return true;
            }
            return false;
          }
        }
      ]
    });

    await alert.present();
  }

  removeIngredient(index: number) {
    this.newMenuItem.selectedIngredients.splice(index, 1);
  }

  updateIngredientQuantity(index: number, quantity: number) {
    this.newMenuItem.selectedIngredients[index].quantity = quantity;
  }

  updateIngredientCost(index: number, cost: number) {
    this.newMenuItem.selectedIngredients[index].cost = cost;
  }

  getTotalCost(): number {
    return this.newMenuItem.selectedIngredients.reduce((total, ing) => total + (ing.cost || 0), 0);
  }

  getSuggestedPrice(): number {
    return Math.round(this.getTotalCost() * 2.5 * 100) / 100;
  }

  async applySuggestedPrice(): Promise<void> {
    const suggested = this.getSuggestedPrice();
    if (suggested > 0) {
      this.newMenuItem.price = suggested;
      const toast = await this.toastController.create({
        message: `Selling price set to ${this.formatPhp(suggested)}`,
        duration: 2000,
        color: 'success',
      });
      await toast.present();
    }
  }

  getMarginPercent(): number {
    const cost = this.getTotalCost();
    if (!cost || !this.newMenuItem.price) {
      return 0;
    }
    return Math.round(((this.newMenuItem.price - cost) / this.newMenuItem.price) * 100);
  }

  getDetectedAllergensPreview(): string[] {
    const ingredientNames = this.newMenuItem.selectedIngredients
      .map(ingredient => ingredient.ingredientName)
      .filter(Boolean);

    return this.allergenDetectionService.detectAllergensFromIngredients(ingredientNames);
  }

  async saveMenuItem() {
    if (!this.newMenuItem.name || !this.newMenuItem.description || this.newMenuItem.price <= 0) {
      const toast = await this.toastController.create({
        message: 'Please fill in all required fields',
        duration: 3000,
        color: 'danger'
      });
      await toast.present();
      return;
    }

    const menuItem: Partial<MenuItem> = {
      name: this.newMenuItem.name,
      description: this.newMenuItem.description,
      price: this.newMenuItem.price,
      category: this.newMenuItem.category,
      preparationTime: this.newMenuItem.preparationTime,
      ingredients: this.newMenuItem.selectedIngredients,
      isAvailable: this.newMenuItem.isAvailable,
      isPopular: false,
      allergens: this.getDetectedAllergensPreview(),
      updatedAt: new Date()
    };

    try {
      if (this.editingItemId) {
        // Update existing item
        await this.menuService.updateMenuItem(this.editingItemId, menuItem);
        
        const toast = await this.toastController.create({
          message: 'Menu item updated successfully!',
          duration: 3000,
          color: 'success'
        });
        await toast.present();
      } else {
        // Add new item
        menuItem.createdAt = new Date();
        await this.menuService.addMenuItem(menuItem);
        
        const toast = await this.toastController.create({
          message: 'Menu item added successfully!',
          duration: 3000,
          color: 'success'
        });
        await toast.present();
      }
      
      this.cancelAddingItem();
    } catch (error) {
      console.error('Error saving menu item:', error);
      const toast = await this.toastController.create({
        message: this.editingItemId ? 'Failed to update menu item' : 'Failed to add menu item',
        duration: 3000,
        color: 'danger'
      });
      await toast.present();
    }
  }

  private generateTempId(): string {
    return 'temp_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
  }

  async editMenuItem(item: MenuItem) {
    await this.openDirectEditForm(item);
  }

  async openDirectEditForm(item: MenuItem) {
    // Set the current item data to the form
    this.newMenuItem = {
      name: item.name,
      description: item.description,
      price: item.price,
      category: item.category || 'main',
      preparationTime: item.preparationTime || 15,
      isAvailable: item.isAvailable !== false,
      selectedIngredients: item.ingredients ? [...item.ingredients] : [],
      customIngredients: []
    };
    
    // Switch to editing mode
    this.isAddingItem = true;
    this.editingItemId = item.id; // Add this property to track what we're editing
    
    const toast = await this.toastController.create({
      message: 'Editing menu item. Update details and click Save.',
      duration: 4000,
      color: 'primary'
    });
    await toast.present();
  }

  async deleteMenuItem(item: MenuItem) {
    const alert = await this.alertController.create({
      header: 'Confirm Delete',
      message: `Are you sure you want to delete "${item.name}"?`,
      buttons: [
        {
          text: 'Cancel',
          role: 'cancel'
        },
        {
          text: 'Delete',
          handler: async () => {
            try {
              await this.menuService.deleteMenuItem(item.id);
              const toast = await this.toastController.create({
                message: 'Menu item deleted successfully',
                duration: 3000,
                color: 'success'
              });
              await toast.present();
            } catch (error) {
              console.error('Error deleting menu item:', error);
              const toast = await this.toastController.create({
                message: 'Failed to delete menu item',
                duration: 3000,
                color: 'danger'
              });
              await toast.present();
            }
          }
        }
      ]
    });

    await alert.present();
  }

  async toggleAvailability(item: MenuItem) {
    try {
      await this.menuService.updateMenuItem(item.id, { 
        isAvailable: !item.isAvailable,
        updatedAt: new Date()
      });
      
      const toast = await this.toastController.create({
        message: `${item.name} ${item.isAvailable ? 'Not available' : 'Available'} successfully`,
        duration: 2000,
        color: 'success'
      });
      await toast.present();
    } catch (error) {
      console.error('Error updating menu item:', error);
      const toast = await this.toastController.create({
        message: 'Failed to update menu item',
        duration: 3000,
        color: 'danger'
      });
      await toast.present();
    }
  }

  formatPhp(amount: number): string {
    return this.menuService.formatPhp(amount);
  }

  // Dashboard Statistics Methods
  getAvailableItemsCount(): number {
    return this.menuItems.filter(item => item.isAvailable).length;
  }

  getAveragePrice(): number {
    if (this.menuItems.length === 0) return 0;
    const total = this.menuItems.reduce((sum, item) => sum + item.price, 0);
    return total / this.menuItems.length;
  }

  getAverageTime(): string {
    if (this.menuItems.length === 0) return '0m';
    const total = this.menuItems.reduce((sum, item) => sum + (item.preparationTime || 0), 0);
    const average = Math.round(total / this.menuItems.length);
    return `${average}m`;
  }

  // Item Cost and Profit Calculations
  getItemCost(item: MenuItem): number {
    if (!item.ingredients || item.ingredients.length === 0) return 0;
    return item.ingredients.reduce((total, ing) => total + (ing.cost || 0), 0);
  }

  getItemProfit(item: MenuItem): number {
    return item.price - this.getItemCost(item);
  }

  openIngredientMapping(item: MenuItem) {
    if (this.mappingEditorForId === item.id) {
      this.mappingEditorForId = null;
      this.mappingDraft = [];
      return;
    }

    this.mappingEditorForId = item.id;
    this.mappingDraft = (item.ingredients || []).map((ingredient) => ({
      ingredientId: ingredient.ingredientId || this.generateTempId(),
      ingredientName: ingredient.ingredientName || '',
      quantity: Number(ingredient.quantity || 0),
      unit: ingredient.unit || 'pcs',
      cost: Number(ingredient.cost || 0),
    }));

    if (!this.mappingDraft.length) {
      this.addMappingIngredientRow();
    }
  }

  addMappingIngredientRow() {
    this.mappingDraft.push({
      ingredientId: this.generateTempId(),
      ingredientName: '',
      quantity: 1,
      unit: 'pcs',
      cost: 0,
    });
  }

  removeMappingIngredientRow(index: number) {
    this.mappingDraft.splice(index, 1);
  }

  async saveIngredientMapping(item: MenuItem) {
    const cleanedIngredients = this.mappingDraft
      .map((ingredient) => ({
        ingredientId: ingredient.ingredientId || this.generateTempId(),
        ingredientName: (ingredient.ingredientName || '').trim(),
        quantity: Number(ingredient.quantity || 0),
        unit: (ingredient.unit || 'pcs').trim(),
        cost: Number(ingredient.cost || 0),
      }))
      .filter((ingredient) => ingredient.ingredientName && ingredient.quantity > 0);

    if (!cleanedIngredients.length) {
      const toast = await this.toastController.create({
        message: 'Add at least one valid ingredient mapping before saving.',
        duration: 2500,
        color: 'warning',
      });
      await toast.present();
      return;
    }

    try {
      await this.menuService.updateMenuItem(item.id, {
        ingredients: cleanedIngredients,
        updatedAt: new Date(),
      });

      item.ingredients = cleanedIngredients;
      this.mappingEditorForId = null;
      this.mappingDraft = [];

      const toast = await this.toastController.create({
        message: `Ingredient mapping saved for ${item.name}.`,
        duration: 2200,
        color: 'success',
      });
      await toast.present();
    } catch (error) {
      console.error('Error saving ingredient mapping:', error);
      const toast = await this.toastController.create({
        message: 'Failed to save ingredient mapping.',
        duration: 2500,
        color: 'danger',
      });
      await toast.present();
    }
  }

  // Category Color Coding
  getCategoryColor(category: string): string {
    const colors: { [key: string]: string } = {
      'appetizers': 'success',
      'main': 'primary',
      'desserts': 'warning',
      'beverages': 'tertiary'
    };
    return colors[category] || 'medium';
  }

  getDishTypes(): string[] {
    return Object.keys(this.commonIngredients);
  }

  getDishTypeDisplay(dishType: string): string {
    return dishType.split('-').map(word => 
      word.charAt(0).toUpperCase() + word.slice(1)
    ).join(' ');
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

  // Navigation methods
  navigateToDashboard() {
    this.router.navigate(['/karenderia-dashboard']);
  }

  navigateToInventory() {
    this.router.navigate(['/inventory-management']);
  }

  navigateToDailyMenu() {
    this.router.navigate(['/daily-menu-management']);
  }

  navigateToPos() {
    this.router.navigate(['/karenderia-orders-pos']);
  }

  navigateToAnalytics() {
    this.router.navigate(['/karenderia-analytics']);
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
