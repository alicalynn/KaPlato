import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { IonicModule } from '@ionic/angular';
import { DailyMenuService, DailyMenuItem, MenuItem, CreateDailyMenuRequest } from '../../services/daily-menu.service';
import { AlertController, LoadingController, ToastController, ModalController } from '@ionic/angular';
import { OwnerShellComponent } from '../../components/owner-shell/owner-shell.component';

@Component({
  selector: 'app-daily-menu-management',
  templateUrl: './daily-menu-management.page.html',
  styleUrls: ['./daily-menu-management.page.scss'],
  standalone: true,
  imports: [CommonModule, FormsModule, IonicModule, OwnerShellComponent]
})
export class DailyMenuManagementPage implements OnInit {
  selectedDate: string = new Date().toISOString().split('T')[0]; // Today's date
  selectedMealType: 'breakfast' | 'lunch' | 'dinner' = 'breakfast';
  
  dailyMenuItems: DailyMenuItem[] = [];
  availableMenuItems: MenuItem[] = [];
  
  isLoading = false;
  minDate = new Date().toISOString();
  
  mealTypes = [
    { value: 'breakfast' as const, label: 'Breakfast', icon: 'sunny' },
    { value: 'lunch' as const, label: 'Lunch', icon: 'restaurant' },
    { value: 'dinner' as const, label: 'Dinner', icon: 'moon' }
  ];

  constructor(
    private dailyMenuService: DailyMenuService,
    private alertController: AlertController,
    private loadingController: LoadingController,
    private toastController: ToastController,
    private modalController: ModalController
  ) { }

  ngOnInit() {
    this.checkAuthentication();
    this.loadDailyMenu();
    this.loadAvailableMenuItems();
  }

  private checkAuthentication() {
    const token = localStorage.getItem('auth_token');
    console.log('Auth token exists:', !!token);
    console.log('Token length:', token?.length || 0);
    
    if (!token) {
      console.error('No authentication token found');
      this.showToast('Please log in to access daily menu management', 'danger');
    }
  }

  async loadDailyMenu() {
    this.isLoading = true;
    try {
      const response = await this.dailyMenuService.getDailyMenu(this.selectedDate, this.selectedMealType).toPromise();
      this.dailyMenuItems = response.data || [];
    } catch (error: any) {
      console.error('Error loading daily menu:', error);
      
      if (error.status === 401) {
        this.showToast('Authentication failed. Please log in again.', 'danger');
        // Optionally redirect to login
        // this.router.navigate(['/login']);
      } else if (error.status === 403) {
        this.showToast('Access denied. Karenderia owner account required.', 'danger');
      } else if (error.status === 0) {
        this.showToast('Unable to connect to server. Please check your internet connection.', 'danger');
      } else {
        this.showToast('Error loading daily menu. Please try again.', 'danger');
      }
    } finally {
      this.isLoading = false;
    }
  }

  async loadAvailableMenuItems() {
    try {
      const response = await this.dailyMenuService.getAvailableMenuItems().toPromise();
      this.availableMenuItems = response.data || [];
    } catch (error) {
      console.error('Error loading menu items:', error);
      this.showToast('Error loading menu items', 'danger');
    }
  }

  onDateChange() {
    this.loadDailyMenu();
  }

  onMealTypeChange() {
    this.loadDailyMenu();
  }

  async addMenuItem() {
    const alert = await this.alertController.create({
      header: 'Add Menu Item',
      subHeader: `${this.mealTypes.find(m => m.value === this.selectedMealType)?.label} - ${this.selectedDate}`,
      inputs: [
        {
          name: 'menuItemId',
          type: 'text',
          placeholder: 'Select Menu Item'
        },
        {
          name: 'quantity',
          type: 'number',
          placeholder: 'Quantity/Servings',
          min: 1
        },
        {
          name: 'specialPrice',
          type: 'number',
          placeholder: 'Special Price (optional)'
        },
        {
          name: 'notes',
          type: 'textarea',
          placeholder: 'Notes (optional)'
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
            this.addMenuItemToDailyMenu(data);
          }
        }
      ]
    });

    await alert.present();
  }

  async showMenuItemSelector() {
    if (!this.availableMenuItems.length) {
      this.showToast('No available menu items to add', 'warning');
      return;
    }

    const alert = await this.alertController.create({
      header: 'Select Menu Items',
      inputs: this.availableMenuItems.map(item => ({
        name: `menuItem_${item.id}`,
        type: 'checkbox',
        label: `${item.name} - ₱${item.price}`,
        value: item.id
      })),
      buttons: [
        {
          text: 'Cancel',
          role: 'cancel'
        },
        {
          text: 'Next',
          handler: (menuItemIds: number[]) => {
            if (Array.isArray(menuItemIds) && menuItemIds.length > 0) {
              this.showQuantityDialog(menuItemIds);
            } else {
              this.showToast('Please select at least one dish', 'warning');
              return false;
            }

            return true;
          }
        }
      ]
    });

    await alert.present();
  }

  async showQuantityDialog(menuItemIds: number[]) {
    const alert = await this.alertController.create({
      header: 'Set Quantity & Details',
      subHeader: `${menuItemIds.length} dish${menuItemIds.length > 1 ? 'es' : ''} selected`,
      inputs: [
        {
          name: 'quantity',
          type: 'number',
          placeholder: 'Number of servings',
          min: 1,
          value: 10
        },
        {
          name: 'specialPrice',
          type: 'number',
          placeholder: 'Special price (optional)'
        },
        {
          name: 'notes',
          type: 'textarea',
          placeholder: 'Special notes (optional)'
        }
      ],
      buttons: [
        {
          text: 'Cancel',
          role: 'cancel'
        },
        {
          text: 'Add to Daily Menu',
          handler: async (data) => {
            const quantity = parseInt(data.quantity, 10);

            if (!quantity || quantity < 1) {
              this.showToast('Quantity must be at least 1', 'warning');
              return false;
            }

            const specialPrice = this.parseOptionalNumber(data.specialPrice);
            const notes = this.parseOptionalText(data.notes);

            for (const menuItemId of menuItemIds) {
              await this.addMenuItemToDailyMenu({
                menuItemId,
                quantity,
                specialPrice,
                notes
              });
            }

            await this.loadDailyMenu();
            return true;
          }
        }
      ]
    });

    await alert.present();
  }

  async addMenuItemToDailyMenu(data: any) {
    const loading = await this.loadingController.create({
      message: 'Adding to daily menu...'
    });
    await loading.present();

    try {
      const specialPrice = this.parseOptionalNumber(data.specialPrice);
      const notes = this.parseOptionalText(data.notes);
      const request: CreateDailyMenuRequest = {
        menu_item_id: parseInt(data.menuItemId),
        date: this.selectedDate,
        meal_type: this.selectedMealType,
        quantity: parseInt(data.quantity),
        special_price: specialPrice,
        notes
      };

      const response = await this.dailyMenuService.addToDailyMenu(request).toPromise();
      await this.showToast(response?.message || 'Menu item added to daily menu successfully!', 'success');
    } catch (error: any) {
      console.error('Error adding menu item:', error);
      const message = error.error?.error || 'Error adding menu item to daily menu';
      this.showToast(message, 'danger');
    } finally {
      loading.dismiss();
    }
  }

  async updateQuantity(item: DailyMenuItem) {
    const alert = await this.alertController.create({
      header: 'Update Quantity',
      subHeader: item.menu_item?.name,
      inputs: [
        {
          name: 'quantity',
          type: 'number',
          label: 'New Quantity',
          placeholder: 'New quantity',
          value: item.original_quantity,
          min: 0
        }
      ],
      buttons: [
        {
          text: 'Cancel',
          role: 'cancel'
        },
        {
          text: 'Update',
          handler: (data) => {
            this.updateDailyMenuItem(item.id, {
              quantity: parseInt(data.quantity)
            });
          }
        }
      ]
    });

    await alert.present();
  }

  async toggleAvailability(item: DailyMenuItem) {
    try {
      await this.dailyMenuService.updateDailyMenuItem(item.id, {
        is_available: !item.is_available
      }).toPromise();
      
      item.is_available = !item.is_available;
      const status = item.is_available ? 'Available' : 'Not available';
      this.showToast(`Item ${status} successfully`, 'success');
    } catch (error) {
      console.error('Error updating availability:', error);
      this.showToast('Error updating availability', 'danger');
    }
  }

  async updateDailyMenuItem(id: number, data: any) {
    const loading = await this.loadingController.create({
      message: 'Updating...'
    });
    await loading.present();

    try {
      await this.dailyMenuService.updateDailyMenuItem(id, data).toPromise();
      await this.showToast('Updated successfully!', 'success');
      this.loadDailyMenu(); // Refresh the list
    } catch (error: any) {
      console.error('Error updating item:', error);
      const message = error.error?.error || 'Error updating item';
      this.showToast(message, 'danger');
    } finally {
      loading.dismiss();
    }
  }

  async removeItem(item: DailyMenuItem) {
    const alert = await this.alertController.create({
      header: 'Remove Item',
      message: `Remove "${item.menu_item?.name}" from ${this.selectedMealType}?`,
      buttons: [
        {
          text: 'Cancel',
          role: 'cancel'
        },
        {
          text: 'Remove',
          role: 'destructive',
          handler: () => {
            this.removeDailyMenuItem(item.id);
          }
        }
      ]
    });

    await alert.present();
  }

  async removeDailyMenuItem(id: number) {
    const loading = await this.loadingController.create({
      message: 'Removing...'
    });
    await loading.present();

    try {
      await this.dailyMenuService.removeFromDailyMenu(id).toPromise();
      await this.showToast('Item removed successfully!', 'success');
      this.loadDailyMenu(); // Refresh the list
    } catch (error) {
      console.error('Error removing item:', error);
      this.showToast('Error removing item', 'danger');
    } finally {
      loading.dismiss();
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

  private parseOptionalNumber(value: any): number | undefined {
    if (value === null || value === undefined || value === '') {
      return undefined;
    }
    const parsed = parseFloat(String(value).trim());
    return Number.isFinite(parsed) ? parsed : undefined;
  }

  private parseOptionalText(value: any): string | undefined {
    if (value === null || value === undefined) {
      return undefined;
    }
    const normalized = String(value).trim();
    return normalized.length > 0 ? normalized : undefined;
  }

  getPrice(item: DailyMenuItem): number {
    return item.special_price || item.menu_item?.price || 0;
  }

  hasSpecialPrice(item: DailyMenuItem): boolean {
    return item.special_price !== null && item.special_price !== undefined;
  }

  // Helper methods for template
  getCurrentMealTypeLabel(): string {
    return this.mealTypes.find(m => m.value === this.selectedMealType)?.label || '';
  }

  selectMealType(value: string): void {
    this.selectedMealType = value as 'breakfast' | 'lunch' | 'dinner';
    this.onMealTypeChange();
  }

  getAvailableItemsCount(): number {
    return this.dailyMenuItems.filter(item => item.is_available).length;
  }

  getTotalQuantity(): number {
    return this.dailyMenuItems.reduce((sum, item) => sum + item.quantity, 0);
  }

  // Date helper methods for simplified date picker
  getFormattedDate(dateStr?: string): string {
    const date = dateStr ? new Date(dateStr) : new Date(this.selectedDate);
    return date.toLocaleDateString('en-US', { 
      weekday: 'long', 
      year: 'numeric', 
      month: 'long', 
      day: 'numeric' 
    });
  }

  getTodayFormatted(): string {
    const today = new Date();
    return today.toLocaleDateString('en-US', { 
      weekday: 'short', 
      month: 'short', 
      day: 'numeric' 
    });
  }

  getTomorrowFormatted(): string {
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    return tomorrow.toLocaleDateString('en-US', { 
      weekday: 'short', 
      month: 'short', 
      day: 'numeric' 
    });
  }

  isToday(): boolean {
    const today = new Date().toISOString().split('T')[0];
    return this.selectedDate === today;
  }

  isTomorrow(): boolean {
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    const tomorrowStr = tomorrow.toISOString().split('T')[0];
    return this.selectedDate === tomorrowStr;
  }

  selectToday(): void {
    this.selectedDate = new Date().toISOString().split('T')[0];
    this.onDateChange();
  }

  selectTomorrow(): void {
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    this.selectedDate = tomorrow.toISOString().split('T')[0];
    this.onDateChange();
  }

  async openSimpleDatePicker(): Promise<void> {
    const today = new Date();
    const maxDate = new Date();
    maxDate.setMonth(maxDate.getMonth() + 3); // Allow 3 months ahead

    const alert = await this.alertController.create({
      header: 'Pick a Date',
      subHeader: 'Select a date for your daily menu',
      inputs: [
        {
          name: 'selectedDate',
          type: 'date',
          value: this.selectedDate,
          min: today.toISOString().split('T')[0],
          max: maxDate.toISOString().split('T')[0]
        }
      ],
      buttons: [
        {
          text: 'Cancel',
          role: 'cancel'
        },
        {
          text: 'Select Date',
          handler: (data) => {
            if (data.selectedDate) {
              this.selectedDate = data.selectedDate;
              this.onDateChange();
            }
          }
        }
      ]
    });

    await alert.present();
  }

  // Date navigation methods
  getDateLabel(): string {
    if (this.isToday()) {
      return 'Today';
    } else if (this.isTomorrow()) {
      return 'Tomorrow';
    } else if (this.isYesterday()) {
      return 'Yesterday';
    } else {
      return 'Selected Date';
    }
  }

  isYesterday(): boolean {
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    const yesterdayStr = yesterday.toISOString().split('T')[0];
    return this.selectedDate === yesterdayStr;
  }

  goToPreviousDay(): void {
    const currentDate = new Date(this.selectedDate);
    currentDate.setDate(currentDate.getDate() - 1);
    this.selectedDate = currentDate.toISOString().split('T')[0];
    this.onDateChange();
  }

  goToNextDay(): void {
    const currentDate = new Date(this.selectedDate);
    currentDate.setDate(currentDate.getDate() + 1);
    this.selectedDate = currentDate.toISOString().split('T')[0];
    this.onDateChange();
  }

  isPreviousDayDisabled(): boolean {
    const today = new Date();
    const yesterday = new Date();
    yesterday.setDate(today.getDate() - 1);
    const currentDate = new Date(this.selectedDate);
    return currentDate <= yesterday;
  }
}
