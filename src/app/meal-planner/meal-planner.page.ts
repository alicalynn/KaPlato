import { CommonModule } from '@angular/common';
import { Component, OnInit } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { HttpClient, HttpClientModule } from '@angular/common/http';
import { IonicModule, AlertController, LoadingController, ToastController } from '@ionic/angular';
import { Router } from '@angular/router';
import { DailyMenuService } from '../services/daily-menu.service';
import { MealPlanStorageService, MealPlanItemSnapshot } from '../services/meal-plan-storage.service';

interface KarenderiaMenuItem {
  id: number;
  menu_item: any;
  quantity: number;
  special_price?: number;
  notes?: string;
}

interface AvailableKarenderia {
  karenderia: any;
  menu_items: KarenderiaMenuItem[];
}

@Component({
  selector: 'app-meal-planner',
  templateUrl: './meal-planner.page.html',
  styleUrls: ['./meal-planner.page.scss'],
  standalone: true,
  imports: [CommonModule, FormsModule, IonicModule, HttpClientModule]
})
export class MealPlannerPage implements OnInit {
  selectedDate: string = new Date().toISOString().split('T')[0];
  selectedMealType: 'breakfast' | 'lunch' | 'dinner' = 'breakfast';
  
  availableKarenderias: AvailableKarenderia[] = [];
  selectedItems: { [key: string]: any } = {}; // Store selected items for each meal
  
  isLoading = false;
  minDate = new Date().toISOString();
  
  mealTypes = [
    { value: 'breakfast' as const, label: 'Breakfast', icon: 'sunny', color: '#FFB74D' },
    { value: 'lunch' as const, label: 'Lunch', icon: 'restaurant', color: '#4CAF50' },
    { value: 'dinner' as const, label: 'Dinner', icon: 'moon', color: '#673AB7' }
  ];

  constructor(
    private dailyMenuService: DailyMenuService,
    private alertController: AlertController,
    private loadingController: LoadingController,
    private toastController: ToastController,
    private router: Router,
    private mealPlanStorageService: MealPlanStorageService
  ) {}

  ngOnInit() {
    this.checkAuthentication();
    this.loadAvailableKarenderias();
  }

  private checkAuthentication() {
    const token = localStorage.getItem('auth_token');
    console.log('Auth token exists:', !!token);
    console.log('Token length:', token?.length || 0);
    
    if (!token) {
      console.error('No authentication token found');
      this.showToast('Please log in to access meal planning', 'danger');
    }
  }

  async loadAvailableKarenderias() {
    this.isLoading = true;
    try {
      const response = await this.dailyMenuService.getAvailableForCustomers(
        this.selectedDate, 
        this.selectedMealType
      ).toPromise();
      
      this.availableKarenderias = response.data || [];
      
      if (this.availableKarenderias.length === 0) {
        this.showToast('No karenderias available for this meal type and date', 'warning');
      }
    } catch (error: any) {
      console.error('Error loading available karenderias:', error);
      
      if (error.status === 401) {
        this.showToast('Authentication failed. Please log in again.', 'danger');
      } else if (error.status === 0) {
        this.showToast('Unable to connect to server. Please check your internet connection.', 'danger');
      } else {
        this.showToast('Error loading available options. Please try again.', 'danger');
      }
    } finally {
      this.isLoading = false;
    }
  }

  onDateChange() {
    this.loadAvailableKarenderias();
  }

  onMealTypeChange() {
    this.loadAvailableKarenderias();
  }

  selectMenuItem(karenderia: AvailableKarenderia, menuItem: KarenderiaMenuItem) {
    const key = `${this.selectedMealType}_${this.selectedDate}`;
    this.selectedItems[key] = {
      date: this.selectedDate,
      meal_type: this.selectedMealType,
      karenderia: karenderia.karenderia,
      menu_item: menuItem.menu_item,
      daily_menu_id: menuItem.id,
      quantity: 1, // Default quantity
      special_price: menuItem.special_price,
      notes: menuItem.notes
    };
    
    this.showToast(`${menuItem.menu_item.name} selected for ${this.selectedMealType}`, 'success');
  }

  async addToMealPlan(karenderia: AvailableKarenderia, menuItem: KarenderiaMenuItem) {
    const alert = await this.alertController.create({
      header: 'Add to Meal Plan',
      subHeader: `${menuItem.menu_item.name} from ${karenderia.karenderia.name}`,
      message: `Price: ₱${menuItem.special_price || menuItem.menu_item.price}`,
      inputs: [
        {
          name: 'quantity',
          type: 'number',
          placeholder: 'How many servings?',
          value: 1,
          min: 1,
          max: menuItem.quantity
        }
      ],
      buttons: [
        {
          text: 'Cancel',
          role: 'cancel'
        },
        {
          text: 'Add to Plan',
          handler: (data) => {
            if (data.quantity && data.quantity > 0) {
              this.addItemToMealPlan(karenderia, menuItem, parseInt(data.quantity));
            }
          }
        }
      ]
    });

    await alert.present();
  }

  addItemToMealPlan(karenderia: AvailableKarenderia, menuItem: KarenderiaMenuItem, quantity: number) {
    const key = `${this.selectedMealType}_${this.selectedDate}`;
    
    if (!this.selectedItems[key]) {
      this.selectedItems[key] = [];
    }
    
    if (Array.isArray(this.selectedItems[key])) {
      this.selectedItems[key].push({
        date: this.selectedDate,
        meal_type: this.selectedMealType,
        karenderia: karenderia.karenderia,
        menu_item: menuItem.menu_item,
        daily_menu_id: menuItem.id,
        quantity: quantity,
        special_price: menuItem.special_price,
        notes: menuItem.notes
      });
    } else {
      this.selectedItems[key] = [{
        date: this.selectedDate,
        meal_type: this.selectedMealType,
        karenderia: karenderia.karenderia,
        menu_item: menuItem.menu_item,
        daily_menu_id: menuItem.id,
        quantity: quantity,
        special_price: menuItem.special_price,
        notes: menuItem.notes
      }];
    }
    
    this.showToast(`${quantity}x ${menuItem.menu_item.name} added to your meal plan`, 'success');
  }

  getSelectedItemsForCurrentMeal() {
    const key = `${this.selectedMealType}_${this.selectedDate}`;
    const items = this.selectedItems[key];
    return Array.isArray(items) ? items : (items ? [items] : []);
  }

  removeFromMealPlan(index: number) {
    const key = `${this.selectedMealType}_${this.selectedDate}`;
    const items = this.selectedItems[key];
    
    if (Array.isArray(items)) {
      items.splice(index, 1);
      if (items.length === 0) {
        delete this.selectedItems[key];
      }
    } else {
      delete this.selectedItems[key];
    }
    
    this.showToast('Item removed from meal plan', 'success');
  }

  getTotalPrice(): number {
    const items = this.getSelectedItemsForCurrentMeal();
    return items.reduce((total, item) => {
      const price = item.special_price || item.menu_item.price;
      return total + (price * item.quantity);
    }, 0);
  }

  async saveMealPlan() {
    const allSelectedItems = this.getAllSelectedItems();
    
    if (allSelectedItems.length === 0) {
      this.showToast('Please select at least one meal item', 'warning');
      return;
    }

    const loading = await this.loadingController.create({
      message: 'Saving your meal plan...'
    });
    await loading.present();

    try {
      const savedPlan = this.mealPlanStorageService.saveMealPlan(allSelectedItems);
      await new Promise(resolve => setTimeout(resolve, 1000)); // Simulate API call
      
      await loading.dismiss();
      
      const alert = await this.alertController.create({
        header: 'Meal Plan Saved!',
        message: `Your meal plan with ${savedPlan.totalItems} items has been saved successfully.`,
        buttons: [
          {
            text: 'OK',
            role: 'cancel'
          }
        ]
      });
      
      await alert.present();
      console.log('Saved meal plan snapshot:', savedPlan);

      // Automatically navigate to the full meal plan view so user sees saved plan
      this.router.navigate(['/meal-history']);
      
    } catch (error) {
      await loading.dismiss();
      console.error('Error saving meal plan:', error);
      this.showToast('Error saving meal plan', 'danger');
    }
  }

  async showToast(message: string, color: string) {
    const toast = await this.toastController.create({
      message,
      duration: 3000,
      color,
      position: 'top'
    });
    toast.present();
  }

  getPrice(menuItem: KarenderiaMenuItem): number {
    return menuItem.special_price || menuItem.menu_item?.price || 0;
  }

  hasSpecialPrice(menuItem: KarenderiaMenuItem): boolean {
    return menuItem.special_price !== null && menuItem.special_price !== undefined;
  }

  // Helper methods for template
  getCurrentMealTypeLabel(): string {
    return this.mealTypes.find(m => m.value === this.selectedMealType)?.label || '';
  }

  selectMealType(value: string): void {
    this.selectedMealType = value as 'breakfast' | 'lunch' | 'dinner';
    this.onMealTypeChange();
  }

  hasSelectedItems(): boolean {
    return Object.keys(this.selectedItems).length > 0;
  }

  private getAllSelectedItems(): MealPlanItemSnapshot[] {
    return Object.values(this.selectedItems).flatMap((value) => {
      if (Array.isArray(value)) {
        return value;
      }

      return value ? [value] : [];
    }).map((item: any) => ({
      date: item.date,
      meal_type: item.meal_type,
      karenderia: item.karenderia,
      menu_item: item.menu_item,
      daily_menu_id: item.daily_menu_id,
      quantity: Number(item.quantity || 0),
      special_price: item.special_price,
      notes: item.notes
    }));
  }
}
