import { Component, OnInit, OnDestroy } from '@angular/core';
import { AuthService, User } from '../services/auth.service';
import { UserService, UserProfile } from '../services/user.service';
import { KarenderiaService } from '../services/karenderia.service';
import { Subscription } from 'rxjs';
import { Router } from '@angular/router';
import { ToastController, LoadingController } from '@ionic/angular';

@Component({
  selector: 'app-home',
  templateUrl: 'home.page.html',
  styleUrls: ['home.page.scss'],
  standalone: false,
})
export class HomePage implements OnInit, OnDestroy {
  currentUser: User | null = null;
  userProfile: UserProfile | null = null;
  private userSubscription: Subscription | undefined;
  private profileSubscription: Subscription | undefined;
  isLoading = true;
  showMap = false;
  searchQuery = '';
  featuredKarenderias: any[] = [];
  selectedTab = 'favorites';

  constructor(
    private authService: AuthService,
    private userService: UserService,
    private karenderiaService: KarenderiaService,
    private router: Router,
    private toastController: ToastController,
    private loadingController: LoadingController
  ) {}

  ngOnInit() {
    // Subscribe to user changes
    this.userSubscription = this.authService.currentUser$.subscribe(user => {
      // Handle different auth states properly
      if (user !== undefined) {
        // User is either logged in (user object) or definitely not logged in (null)
        this.currentUser = user;
        this.isLoading = false;
        
        // Check user role and redirect accordingly
        if (user) {
          this.checkUserRoleAndRedirect();
        }
      }
      // Don't redirect here - let the auth guard handle routing
    });

    // Subscribe to user profile changes
    this.profileSubscription = this.userService.currentUserProfile$.subscribe(profile => {
      this.userProfile = profile;
    });

    // Load featured karenderias
    this.loadFeaturedKarenderias();
  }

  ngOnDestroy() {
    if (this.userSubscription) {
      this.userSubscription.unsubscribe();
    }
    if (this.profileSubscription) {
      this.profileSubscription.unsubscribe();
    }
  }

  async navigateToMap() {
    try {
      console.log('🗺️ Navigating to customer map view...');
      
      const success = await this.router.navigateByUrl('/customer-map');
      
    } catch (error) {
      console.error('❌ Error navigating to customer-map:', error);
      await this.showToast('Navigation error - please try again');
    }
  }

  toggleMap() {
    this.showMap = !this.showMap;
    
    // If showing the map, force it to refresh after a short delay
    if (this.showMap) {
      setTimeout(() => {
        // Use the new refresh function
        if ((window as any).refreshMapSize) {
          (window as any).refreshMapSize();
        }
      }, 300);
    }
  }

  searchKarenderia() {
    // Placeholder for search functionality
    console.log('Search functionality coming soon...');
  }

  // Dashboard Methods
  onSearchInput(event: any) {
    this.searchQuery = event.target.value;
    if (this.searchQuery.length > 2) {
      this.performSearch();
    }
  }

  async performSearch() {
    const toast = await this.toastController.create({
      message: `Searching for "${this.searchQuery}"...`,
      duration: 2000,
      position: 'bottom'
    });
    await toast.present();
  }

  searchNearby() {
    console.log('🔍 Searching for nearby karenderias...');
    this.showMap = true;
    // The map component will handle the actual search
  }

  async showFavorites() {
    const toast = await this.toastController.create({
      message: 'Favorites feature coming soon! ❤️',
      duration: 2000,
      position: 'bottom'
    });
    await toast.present();
  }

  async showRecommended() {
    const toast = await this.toastController.create({
      message: 'Popular karenderias feature coming soon! ⭐',
      duration: 2000,
      position: 'bottom'
    });
    await toast.present();
  }

  async showCategories() {
    const toast = await this.toastController.create({
      message: 'Categories view coming soon! 🍽️',
      duration: 2000,
      position: 'bottom'
    });
    await toast.present();
  }

  async viewAllFeatured() {
    const toast = await this.toastController.create({
      message: 'View all featured karenderias coming soon!',
      duration: 2000,
      position: 'bottom'
    });
    await toast.present();
  }

  async searchByCategory(category: string) {
    const toast = await this.toastController.create({
      message: `Searching for ${category} restaurants...`,
      duration: 2000,
      position: 'bottom'
    });
    await toast.present();
  }

  private loadFeaturedKarenderias() {
    this.karenderiaService.getAllKarenderias().subscribe({
      next: (karenderias) => {
        const mapped = (karenderias || []).map(k => ({
          id: k.id,
          name: k.name || 'Karenderia',
          address: k.address || 'No address',
          location: {
            latitude: k.location?.latitude || k.latitude || 10.3157,
            longitude: k.location?.longitude || k.longitude || 123.9349
          },
          rating: k.rating || k.average_rating || 0,
          priceRange: 'Budget',
          cuisine: Array.isArray((k as any).cuisine) ? (k as any).cuisine : ['Filipino'],
          isOpen: k.isOpen !== undefined ? k.isOpen : true,
          deliveryTime: `${k.delivery_time_minutes || 30} min`,
          deliveryFee: (k as any).delivery_fee || 25
        }));

        this.featuredKarenderias = mapped.slice(0, 6);
      },
      error: () => {
        this.featuredKarenderias = [];
      }
    });
  }

  async showToast(message: string) {
    const toast = await this.toastController.create({
      message: message,
      duration: 2000,
      position: 'bottom'
    });
    await toast.present();
  }


  async logout() {
    const loading = await this.loadingController.create({
      message: 'Logging out...',
      duration: 2000
    });
    await loading.present();

    try {
      // Call logout method (it returns void)
      this.authService.logout();
      console.log('Logout successful');
      loading.dismiss();
      this.router.navigate(['/login']);
    } catch (error: any) {
      console.error('Logout error:', error);
      loading.dismiss();
      // Even if logout fails on server, clear local data and redirect
      this.router.navigate(['/login']);
    }
  }

  goToApplicationPage() {
    this.router.navigate(['/karenderia-application']);
  }

  goToProfile() {
    this.router.navigate(['/profile']);
  }

  private checkUserRoleAndRedirect() {
    // First check the current user from auth service for immediate role check
    if (this.currentUser?.role === 'admin') {
      console.log('Admin user detected, redirecting to admin dashboard');
      this.router.navigate(['/admin-dashboard']);
      return;
    }

    // Then check the user profile for karenderia owners
    this.userService.currentUserProfile$.subscribe(profile => {
      if (profile) {
        if (profile.role === 'karenderia_owner') {
          // Redirect karenderia owners to their dashboard
          this.router.navigate(['/karenderia-dashboard']);
        }
        // Regular users stay on home page
      }
    });
  }

  openMealPlanner() {
    // Navigate to the meal planner page
    this.router.navigate(['/meal-planner']);
  }

  viewSuggestedKarenderias() {
    this.router.navigate(['/suggested-karenderias']);
  }

  openNutritionEngine() {
    this.router.navigate(['/nutrition-engine']);
  }

  openAllergenProfile() {
    this.router.navigate(['/allergen-profile']);
  }

  async viewKarenderiaMenu(karenderia: any) {
    console.log('🍽️ Viewing menu for karenderia:', karenderia.name);
    
    if (!karenderia.id) {
      console.error('❌ Karenderia ID is missing');
      await this.showToast('Unable to view menu - karenderia information incomplete');
      return;
    }

    try {
      // Navigate to karenderia detail page with the karenderia data
      await this.router.navigate(['/karenderia-detail', karenderia.id], {
        state: { karenderia: karenderia }
      });
      
      console.log('✅ Successfully navigated to karenderia detail page');
    } catch (error) {
      console.error('❌ Error navigating to karenderia detail:', error);
      await this.showToast('Unable to view menu at this time');
    }
  }

  async openFeedbackAndReport(karenderia: any) {
    console.log('📝 Opening feedback/report section for karenderia:', karenderia.name);

    if (!karenderia.id) {
      await this.showToast('Unable to open feedback and reports right now');
      return;
    }

    try {
      await this.router.navigate(['/karenderia-detail', karenderia.id], {
        state: { karenderia },
        fragment: 'feedback-reports'
      });
    } catch (error) {
      console.error('❌ Error navigating to feedback/report section:', error);
      await this.showToast('Unable to open feedback and reports at this time');
    }
  }

  async browseKarenderiaMenus() {
    console.log('🍽️ Browse Karenderia Menus clicked');
    
    try {
      // Navigate to dedicated karenderias browse page
      console.log('🏪 Navigating to karenderias browse page');
      
      const success = await this.router.navigateByUrl('/karenderias-browse');
      
      if (success) {
        console.log('✅ Successfully navigated to karenderias browse page');
        await this.showToast('Browse all available karenderias!');
      } else {
        console.error('❌ Failed to navigate to karenderias browse page');
        await this.showToast('Unable to load karenderias list at this time');
      }
    } catch (error) {
      console.error('❌ Error navigating to karenderias browse page:', error);
      await this.showToast('Unable to browse karenderias at this time');
    }
  }

  async browseMeals() {
    console.log('🍽️ Browse Meals clicked');
    
    try {
      console.log('🔍 Navigating to meals browse page');
      
      const success = await this.router.navigateByUrl('/meals-browse');
      
      if (success) {
        console.log('✅ Successfully navigated to meals browse page');
        await this.showToast('Filter meals by your preferences!');
      } else {
        console.error('❌ Failed to navigate to meals browse page');
        await this.showToast('Unable to load meals at this time');
      }
    } catch (error) {
      console.error('❌ Error navigating to meals browse page:', error);
      await this.showToast('Unable to browse meals at this time');
    }
  }

  async openNutritionDemo() {
    console.log('🍎 Nutrition Demo clicked');
    
    try {
      // Navigate to nutrition demo page
      console.log('📊 Navigating to nutrition demo page');
      
      const success = await this.router.navigateByUrl('/nutrition-demo');
      
      if (success) {
        console.log('✅ Successfully navigated to nutrition demo page');
        await this.showToast('Explore Filipino food nutrition data!');
      } else {
        console.error('❌ Failed to navigate to nutrition demo page');
        await this.showToast('Unable to load nutrition demo at this time');
      }
    } catch (error) {
      console.error('❌ Error navigating to nutrition demo page:', error);
      await this.showToast('Unable to access nutrition demo at this time');
    }
  }
}
