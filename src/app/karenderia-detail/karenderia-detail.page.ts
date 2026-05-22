import { Component, OnInit } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { LoadingController, ToastController, AlertController, NavController } from '@ionic/angular';
import { KarenderiaService } from '../services/karenderia.service';
import { AllergenDetectionService, AllergenWarning } from '../services/allergen-detection.service';
import { UserService } from '../services/user.service';
import { Location } from '@angular/common';
import { timeout, catchError } from 'rxjs/operators';
import { of } from 'rxjs';
import { ViewportScroller } from '@angular/common';

@Component({
  selector: 'app-karenderia-detail',
  templateUrl: './karenderia-detail.page.html',
  styleUrls: ['./karenderia-detail.page.scss'],
  standalone: false,
})
export class KarenderiaDetailPage implements OnInit {
  karenderia: any = null;
  karenderiaId: string = '';
  menuItems: any[] = [];
  isLoading = true;
  selectedCategory = 'all';
  filteredMenuItems: any[] = [];
  categories: string[] = ['all'];
  cart: any[] = [];
  cartTotal = 0;
  
  // Allergen tracking properties
  userAllergens: any[] = [];
  menuItemAllergenInfo: { [itemId: string]: any } = {};
  
  // Allergen filtering options
  activeAllergens: string[] = [];
  avoidAllergenItems = true;
  allergenFilterMode: 'show-all' | 'avoid-allergens' = 'avoid-allergens';
  private scrollToFeedbackSection = false;

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private karenderiaService: KarenderiaService,
    private allergenService: AllergenDetectionService,
    private userService: UserService,
    private loadingController: LoadingController,
    private toastController: ToastController,
    private alertController: AlertController,
    private navController: NavController,
    private location: Location,
    private viewportScroller: ViewportScroller
  ) {}

  ngOnInit() {
    this.karenderiaId = this.route.snapshot.paramMap.get('id') || '';
    console.log('🏪 Loading karenderia details for ID:', this.karenderiaId);

    this.scrollToFeedbackSection = this.route.snapshot.fragment === 'feedback-reports';
    
    // Load user allergens first
    this.loadUserAllergens();
    
    // Check if karenderia data was passed via router state
    const navigation = this.router.getCurrentNavigation();
    if (navigation?.extras?.state?.['karenderia']) {
      this.karenderia = navigation.extras.state['karenderia'];
      console.log('✅ Received karenderia data from navigation state:', this.karenderia);
    }
    
    if (this.karenderiaId) {
      this.loadKarenderiaDetails();
      this.loadMenuItems();
    } else {
      console.error('❌ No karenderia ID provided');
      this.goBack();
    }
  }

  async loadKarenderiaDetails() {
    // If we already have karenderia data from navigation state, skip backend loading
    if (this.karenderia) {
      console.log('✅ Using karenderia data from navigation state');
      return;
    }

    try {
      const loading = await this.loadingController.create({
        message: 'Loading karenderia details...',
        duration: 3000
      });
      await loading.present();

      // Try to load from backend first
      this.karenderiaService.getKarenderiaById(this.karenderiaId).subscribe({
        next: (karenderia) => {
          if (karenderia) {
            this.karenderia = karenderia;
            console.log('✅ Loaded karenderia from backend:', karenderia);
          } else {
            this.karenderia = null;
            this.showToast('Karenderia not found').then();
          }
          loading.dismiss();
        },
        error: (error) => {
          console.error('❌ Error loading karenderia from backend:', error);
          this.karenderia = null;
          this.showToast('Failed to load karenderia details').then();
          loading.dismiss();
        }
      });
    } catch (error) {
      console.error('❌ Error in loadKarenderiaDetails:', error);
      this.karenderia = null;
    }
  }

  async loadMenuItems() {
    console.log('🔍 loadMenuItems called - karenderia:', this.karenderia);
    console.log('🔍 karenderia ID:', this.karenderia?.id);
    
    if (!this.karenderia?.id) {
      console.log('⚠️ No karenderia ID available, no menu to display');
      this.menuItems = [];
      this.filteredMenuItems = [];
      this.isLoading = false;
      return;
    }

    try {
      console.log('🍽️ Loading menu items for karenderia:', this.karenderia.id);
      
      // Try to load from backend API with timeout
      this.karenderiaService.getMenuItemsForKarenderia(this.karenderia.id)
        .pipe(
          timeout(5000), // 5 second timeout
          catchError(error => {
            console.error('❌ Error or timeout loading menu items:', error);
            return of([]); // Return empty array on error/timeout
          })
        )
        .subscribe({
          next: (menuItems) => {
            console.log('🔍 Received menu items:', menuItems);
            if (menuItems && menuItems.length > 0) {
              console.log('✅ Loaded', menuItems.length, 'menu items from backend');
              // Transform to our component's MenuItem interface
              this.menuItems = menuItems.map(item => ({
                id: item.id || Math.random().toString(),
                name: item.name,
                description: item.description || 'Delicious Filipino dish',
                price: item.price,
                category: this.mapToLocalCategory(item.category),
                image: item.imageUrl || 'assets/images/food-placeholder.jpg',
                available: item.isAvailable,
                spicyLevel: 'Mild', // Default value
                ingredients: item.ingredients || [], // Add ingredients for allergen checking
                allergens: item.allergens || [] // Add allergens for allergen checking
              }));
              
              // Check menu items for allergens after loading
              this.checkMenuItemsForAllergens();
              this.filterMenuItems();
            } else {
              console.log('⚠️ No menu items found - displaying empty menu');
              this.menuItems = [];
              this.filteredMenuItems = [];
              this.categories = ['all'];
            }
            this.isLoading = false;
            this.scrollToRequestedSection();
          },
          error: (error) => {
            console.error('❌ Final error handler - displaying empty menu:', error);
            this.menuItems = [];
            this.filteredMenuItems = [];
            this.categories = ['all'];
            this.isLoading = false;
            this.scrollToRequestedSection();
          }
        });
        
    } catch (error) {
      console.error('❌ Error in loadMenuItems:', error);
      this.menuItems = [];
      this.filteredMenuItems = [];
      this.categories = ['all'];
      this.isLoading = false;
      this.scrollToRequestedSection();
    }
  }

  private scrollToRequestedSection() {
    if (!this.scrollToFeedbackSection || this.isLoading || !this.karenderia) {
      return;
    }

    setTimeout(() => {
      this.viewportScroller.scrollToAnchor('feedback-reports-section');
    }, 300);
  }

  // Helper method to map service categories to component categories
  private mapToLocalCategory(serviceCategory: string): string {
    const categoryMap: { [key: string]: string } = {
      'Main Dish': 'Main Course',
      'Appetizer': 'Appetizers', 
      'Dessert': 'Desserts',
      'Beverage': 'Beverages',
      'Side Dish': 'Sides'
    };
    return categoryMap[serviceCategory] || 'Main Course';
  }

  setCategory(category: string) {
    this.selectedCategory = category;
    this.filterMenuItems();
  }

  filterMenuItems() {
    let filtered = this.menuItems;
    
    // Apply category filter
    if (this.selectedCategory === 'all') {
      filtered = [...this.menuItems];
    } else {
      filtered = this.menuItems.filter(item => item.category === this.selectedCategory);
    }
    
    // Apply allergen filter if enabled
    if (this.allergenFilterMode === 'avoid-allergens' && this.activeAllergens.length > 0) {
      filtered = filtered.filter(item => {
        const allergenInfo = this.menuItemAllergenInfo[item.id];
        // Show only items that are safe (no allergens detected)
        return !allergenInfo || !allergenInfo.hasAllergens;
      });
    }
    
    this.filteredMenuItems = filtered;
    console.log(`🔍 Filtered menu items for category "${this.selectedCategory}" and allergen mode "${this.allergenFilterMode}":`, this.filteredMenuItems.length);
  }

  async viewMealDetails(menuItem: any) {
    console.log('🍽️ Viewing meal details for:', menuItem.name);
    
    try {
      // Navigate to meal details page with menu item data
      await this.router.navigate(['/meal-details', menuItem.id], {
        state: { 
          menuItem: menuItem,
          karenderia: this.karenderia 
        }
      });
      
      console.log('✅ Successfully navigated to meal details page');
    } catch (error) {
      console.error('❌ Error navigating to meal details:', error);
      const toast = await this.toastController.create({
        message: 'Unable to view meal details at this time',
        duration: 2000,
        color: 'danger'
      });
      await toast.present();
    }
  }

  async addToCart(menuItem: any) {
    if (!menuItem.available) {
      const toast = await this.toastController.create({
        message: 'This item is currently unavailable',
        duration: 2000,
        color: 'warning'
      });
      await toast.present();
      return;
    }

    // Check for allergen warnings before adding to cart
    const allergenInfo = this.getMenuItemAllergenInfo(menuItem);
    
    if (allergenInfo.hasAllergens && allergenInfo.safetyLevel === 'danger') {
      // Show warning for severe allergens
      const alert = await this.alertController.create({
        header: '⚠️ SEVERE ALLERGEN WARNING',
        subHeader: `${menuItem.name} contains allergens that may cause severe reactions`,
        message: `
          <div style="text-align: left;">
            <p><strong>Detected Allergens:</strong></p>
            <p style="font-size: 14px;">${allergenInfo.warnings.map((w: AllergenWarning) => w.message).join('<br>')}</p>
            <p style="color: red; font-weight: bold;">Are you sure you want to add this item?</p>
          </div>
        `,
        buttons: [
          {
            text: 'Cancel',
            role: 'cancel'
          },
          {
            text: 'Add Anyway',
            handler: () => {
              this.proceedToAddToCart(menuItem);
            }
          }
        ]
      });

      await alert.present();
      return;
    } else if (allergenInfo.hasAllergens) {
      // Show mild warning for moderate allergens
      const toast = await this.toastController.create({
        message: `⚠️ ${menuItem.name} contains allergens you're sensitive to`,
        duration: 3000,
        color: 'warning',
        buttons: [
          {
            text: 'Details',
            handler: () => {
              this.showAllergenWarning(menuItem);
            }
          }
        ]
      });
      await toast.present();
    }

    // Proceed to add to cart
    this.proceedToAddToCart(menuItem);
  }

  private async proceedToAddToCart(menuItem: any) {
    // Check if item already in cart
    const existingItem = this.cart.find(item => item.id === menuItem.id);
    
    if (existingItem) {
      existingItem.quantity += 1;
    } else {
      this.cart.push({
        ...menuItem,
        quantity: 1
      });
    }

    this.calculateCartTotal();

    const toast = await this.toastController.create({
      message: `${menuItem.name} added to cart!`,
      duration: 1500,
      color: 'success'
    });
    await toast.present();

    console.log('🛒 Updated cart:', this.cart);
  }

  async removeFromCart(menuItem: any) {
    const existingItem = this.cart.find(item => item.id === menuItem.id);
    
    if (existingItem) {
      if (existingItem.quantity > 1) {
        existingItem.quantity -= 1;
      } else {
        this.cart = this.cart.filter(item => item.id !== menuItem.id);
      }
      
      this.calculateCartTotal();

      const toast = await this.toastController.create({
        message: `${menuItem.name} removed from cart`,
        duration: 1500,
        color: 'medium'
      });
      await toast.present();
    }
  }

  getItemQuantityInCart(menuItem: any): number {
    const cartItem = this.cart.find(item => item.id === menuItem.id);
    return cartItem ? cartItem.quantity : 0;
  }

  calculateCartTotal() {
    this.cartTotal = this.cart.reduce((total, item) => total + (item.price * item.quantity), 0);
  }

  async viewCart() {
    if (this.cart.length === 0) {
      const toast = await this.toastController.create({
        message: 'Your cart is empty',
        duration: 2000,
        color: 'warning'
      });
      await toast.present();
      return;
    }

    // Navigate to cart/checkout page (you can implement this)
    const alert = await this.alertController.create({
      header: 'Cart Summary',
      message: `You have ${this.cart.length} items in your cart. Total: ₱${this.cartTotal}`,
      buttons: [
        {
          text: 'Continue Shopping',
          role: 'cancel'
        },
        {
          text: 'Checkout',
          handler: () => {
            console.log('🛒 Proceeding to checkout...', this.cart);
            // Implement checkout navigation here
          }
        }
      ]
    });

    await alert.present();
  }

  async callKarenderia() {
    if (this.karenderia?.contactNumber) {
      window.open(`tel:${this.karenderia.contactNumber}`);
    } else {
      const toast = await this.toastController.create({
        message: 'Contact number not available',
        duration: 2000,
        color: 'warning'
      });
      await toast.present();
    }
  }

  goBack() {
    this.location.back();
  }

  // ========== ALLERGEN WARNING METHODS ==========

  /**
   * Load user's allergen profile and update allergen detection service
   */
  private loadUserAllergens() {
    this.userService.currentUserProfile$.subscribe(userProfile => {
      if (userProfile && Array.isArray(userProfile.allergens) && userProfile.allergens.length > 0) {
        this.userAllergens = userProfile.allergens;
        console.log('👤 User allergens loaded:', this.userAllergens);
        
        // Set active allergens for filtering
        this.activeAllergens = this.userAllergens.map(a => a.name || a);
        
        // Update the allergen service with user's allergens
        this.allergenService.updateUserAllergens(this.userAllergens);
        
        // Re-check menu items for allergens if they're already loaded
        this.checkMenuItemsForAllergens();
        this.filterMenuItems();
      } else {
        // No allergies selected - load empty array instead of defaults
        this.userAllergens = [];
        this.activeAllergens = [];
        this.allergenService.updateUserAllergens([]);
        this.checkMenuItemsForAllergens();
        this.filterMenuItems();
      }
    });
  }

  /**
   * Check all menu items against user's allergen profile
   */
  private checkMenuItemsForAllergens() {
    if (!this.menuItems || this.menuItems.length === 0) return;
    
    this.menuItems.forEach(item => {
      const allergenInfo = this.allergenService.checkMenuItemForAllergens(item);
      this.menuItemAllergenInfo[item.id] = allergenInfo;
      
      if (allergenInfo.hasAllergens) {
        console.log(`⚠️ Allergen warning for "${item.name}":`, allergenInfo);
      }
    });
  }

  /**
   * Get allergen information for a specific menu item
   */
  getMenuItemAllergenInfo(item: any): any {
    return this.menuItemAllergenInfo[item.id] || {
      hasAllergens: false,
      warnings: [],
      safetyLevel: 'safe',
      conflictingIngredients: []
    };
  }

  /**
   * Show detailed allergen warning for a menu item
   */
  async showAllergenWarning(item: any) {
    const allergenInfo = this.getMenuItemAllergenInfo(item);
    
    if (!allergenInfo.hasAllergens) {
      const toast = await this.toastController.create({
        message: '✅ This item appears safe for your allergen profile',
        duration: 2000,
        color: 'success'
      });
      await toast.present();
      return;
    }

    // Get user's specific allergies that are present in this item
    const userAllergenNames = this.userAllergens.map(a => a.name.toLowerCase());
    const conflictingUserAllergies = allergenInfo.conflictingAllergens.filter((allergen: string) => 
      userAllergenNames.includes(allergen.toLowerCase())
    );

    const warningMessages = allergenInfo.warnings.map((warning: AllergenWarning) => 
      `• ${warning.message}\n  Found in: ${warning.foundIn.join(', ')}`
    ).join('\n\n');

    const userAllergyWarning = conflictingUserAllergies.length > 0 
      ? `\n<p><strong>⚠️ Your Allergies Detected:</strong> ${conflictingUserAllergies.join(', ')}</p>` 
      : '';

    const alert = await this.alertController.create({
      header: '⚠️ Allergen Warning',
      subHeader: `${item.name} contains allergens that may affect you`,
      message: `
        <div style="text-align: left;">
          ${userAllergyWarning}
          <p><strong>Allergen Details:</strong></p>
          <p style="font-size: 14px; white-space: pre-line;">${warningMessages}</p>
          <p><strong>Safety Level:</strong> 
            <ion-chip color="${allergenInfo.safetyLevel === 'danger' ? 'danger' : allergenInfo.safetyLevel === 'caution' ? 'warning' : 'success'}">
              ${allergenInfo.safetyLevel.toUpperCase()}
            </ion-chip>
          </p>
        </div>
      `,
      buttons: [
        {
          text: 'I Understand',
          role: 'cancel'
        },
        {
          text: 'Add Anyway',
          handler: () => {
            this.addToCart(item);
          }
        }
      ]
    });

    await alert.present();
  }

  /**
   * Get the appropriate color for allergen warning badges
   */
  getAllergenBadgeColor(safetyLevel: string): string {
    switch (safetyLevel) {
      case 'danger': return 'danger';
      case 'caution': return 'warning';
      case 'safe': return 'success';
      default: return 'medium';
    }
  }

  /**
   * Get the appropriate icon for allergen warnings
   */
  getAllergenIcon(safetyLevel: string): string {
    switch (safetyLevel) {
      case 'danger': return 'warning';
      case 'caution': return 'alert-circle';
      case 'safe': return 'checkmark-circle';
      default: return 'help-circle';
    }
  }

  /**
   * Toggle allergen filter mode between 'show-all' and 'avoid-allergens'
   */
  toggleAllergenFilter() {
    if (this.allergenFilterMode === 'show-all') {
      this.allergenFilterMode = 'avoid-allergens';
      this.avoidAllergenItems = true;
    } else {
      this.allergenFilterMode = 'show-all';
      this.avoidAllergenItems = false;
    }
    this.filterMenuItems();
  }

  /**
   * Set allergen filter mode explicitly
   */
  setAllergenFilterMode(mode: 'show-all' | 'avoid-allergens') {
    this.allergenFilterMode = mode;
    this.avoidAllergenItems = mode === 'avoid-allergens';
    this.filterMenuItems();
  }

  /**
   * Check if user has active allergens
   */
  hasActiveAllergens(): boolean {
    return this.activeAllergens && this.activeAllergens.length > 0;
  }

  /**
   * Get count of items filtered out due to allergens
   */
  getAllergenFilteredCount(): number {
    if (this.allergenFilterMode !== 'avoid-allergens' || !this.hasActiveAllergens()) {
      return 0;
    }
    return this.menuItems.filter(item => {
      const allergenInfo = this.menuItemAllergenInfo[item.id];
      return allergenInfo && allergenInfo.hasAllergens;
    }).length;
  }

  private async showToast(message: string, color: 'success' | 'warning' | 'danger' | 'medium' = 'warning') {
    const toast = await this.toastController.create({
      message,
      duration: 2200,
      color,
      position: 'bottom'
    });
    await toast.present();
  }
}
