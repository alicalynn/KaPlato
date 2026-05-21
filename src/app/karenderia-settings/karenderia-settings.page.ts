import { Component, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import { KarenderiaInfoService } from '../services/karenderia-info.service';
import { KarenderiaService } from '../services/karenderia.service';
import { LoadingController, ToastController, AlertController } from '@ionic/angular';
import { AuthService } from '../services/auth.service';
import { Subscription } from 'rxjs';

interface BusinessInfo {
  name: string;
  phone: string;
  email: string;
  cuisineType: string;
  description: string;
  address: string;
  logo?: string;
}

interface OperationsSettings {
  // Only operating hours-related settings for restaurant owners
  // Delivery and order management settings are handled by admin
}

interface NotificationSettings {
  newOrders: boolean;
  orderCancellations: boolean;
  paymentReceived: boolean;
  systemUpdates: boolean;
  promotionalEmails: boolean;
  emailNotifications: boolean;
  smsNotifications: boolean;
  pushNotifications: boolean;
}

interface AccountSettings {
  firstName: string;
  lastName: string;
}

interface PasswordChange {
  currentPassword: string;
  newPassword: string;
  confirmPassword: string;
}

interface LocationSettings {
  latitude: number;
  longitude: number;
  address: string;
}

interface OperatingDay {
  name: string;
  isOpen: boolean;
  openTime: string;
  closeTime: string;
}

@Component({
  selector: 'app-karenderia-settings',
  templateUrl: './karenderia-settings.page.html',
  styleUrls: ['./karenderia-settings.page.scss'],
  standalone: false,
})
export class KarenderiaSettingsPage implements OnInit {
  selectedTab: string = 'business';
  currentKarenderiaId: number | null = null;
  karenderiaStatus: 'approved' | 'pending' | 'rejected' | 'unknown' = 'unknown';
  rejectionReason = '';
  isSaving = false;
  private karenderiaSubscription?: Subscription;

  businessInfo: BusinessInfo = {
    name: 'Loading...',
    phone: '',
    email: '',
    cuisineType: 'filipino',
    description: '',
    address: ''
  };

  operationsSettings: OperationsSettings = {
    // Simplified operations settings - only operating hours
    // Delivery and order settings managed by admin
  };

  notificationSettings: NotificationSettings = {
    newOrders: true,
    orderCancellations: true,
    paymentReceived: true,
    systemUpdates: true,
    promotionalEmails: false,
    emailNotifications: true,
    smsNotifications: true,
    pushNotifications: true
  };

  accountSettings: AccountSettings = {
    firstName: '',
    lastName: ''
  };

  passwordChange: PasswordChange = {
    currentPassword: '',
    newPassword: '',
    confirmPassword: ''
  };

  locationSettings: LocationSettings = {
    latitude: 10.3157,
    longitude: 123.8854,
    address: ''
  };

  operatingHours: OperatingDay[] = [
    { name: 'Monday', isOpen: true, openTime: '08:00', closeTime: '20:00' },
    { name: 'Tuesday', isOpen: true, openTime: '08:00', closeTime: '20:00' },
    { name: 'Wednesday', isOpen: true, openTime: '08:00', closeTime: '20:00' },
    { name: 'Thursday', isOpen: true, openTime: '08:00', closeTime: '20:00' },
    { name: 'Friday', isOpen: true, openTime: '08:00', closeTime: '21:00' },
    { name: 'Saturday', isOpen: true, openTime: '09:00', closeTime: '21:00' },
    { name: 'Sunday', isOpen: false, openTime: '09:00', closeTime: '18:00' }
  ];

  isChangeLocationMode = false; // Flag to track if user wants to change location

  constructor(
    private router: Router,
    private karenderiaInfoService: KarenderiaInfoService,
    private karenderiaService: KarenderiaService,
    private authService: AuthService,
    private loadingController: LoadingController,
    private toastController: ToastController,
    private alertController: AlertController
  ) { }

  async ngOnInit() {
    this.subscribeToKarenderiaUpdates();
    await this.karenderiaInfoService.reloadKarenderiaData();
    await this.loadSettings();
  }

  ngOnDestroy() {
    this.karenderiaSubscription?.unsubscribe();
  }

  // Navigation methods
  navigateTo(page: string) {
    this.router.navigate([`/${page}`]);
  }

  logout() {
    console.log('Logging out...');
    this.authService.logoutAndRedirect();
  }

  selectTab(tab: string) {
    this.selectedTab = tab;
  }

  // Settings methods
  async loadSettings() {
    console.log('Loading settings...');

    try {
      const response = await this.karenderiaService.getCurrentUserKarenderia().toPromise();
      const karenderia = response?.data || response;

      if (karenderia) {
        this.currentKarenderiaId = karenderia.id ?? null;
        this.karenderiaStatus = this.normalizeKarenderiaStatus(karenderia.status);
        this.rejectionReason = karenderia.rejection_reason || '';
        this.businessInfo = {
          name: karenderia.business_name || karenderia.name || 'My Karenderia',
          phone: karenderia.phone || '',
          email: karenderia.business_email || karenderia.email || '',
          cuisineType: 'filipino',
          description: karenderia.description || '',
          address: karenderia.address || ''
        };

        const ownerName = this.getKarenderiaDisplayName();
        const [firstName = '', ...rest] = ownerName.split(' ');
        this.accountSettings = {
          firstName,
          lastName: rest.join(' ')
        };

        // Load location settings
        this.locationSettings = {
          latitude: karenderia.latitude || 10.3157,
          longitude: karenderia.longitude || 123.8854,
          address: karenderia.address || ''
        };
        this.karenderiaInfoService.updateKarenderiaData(karenderia);
        return;
      }

      this.applyCachedKarenderiaFallback();
    } catch (error) {
      console.error('Failed to load settings from backend:', error);
      this.applyCachedKarenderiaFallback();
    }
  }

  private subscribeToKarenderiaUpdates() {
    this.karenderiaSubscription = this.karenderiaInfoService.currentKarenderia$.subscribe(karenderia => {
      if (!karenderia) {
        return;
      }

      this.currentKarenderiaId = karenderia.id ? Number(karenderia.id) : this.currentKarenderiaId;
      this.karenderiaStatus = this.normalizeKarenderiaStatus(karenderia.status);
      this.rejectionReason = karenderia.rejection_reason || this.rejectionReason;
      this.businessInfo = {
        name: karenderia.business_name || karenderia.name || this.businessInfo.name,
        phone: karenderia.phone || this.businessInfo.phone,
        email: karenderia.business_email || karenderia.email || this.businessInfo.email,
        cuisineType: this.businessInfo.cuisineType,
        description: karenderia.description || this.businessInfo.description,
        address: karenderia.address || this.businessInfo.address
      };
      this.locationSettings = {
        latitude: karenderia.latitude || this.locationSettings.latitude,
        longitude: karenderia.longitude || this.locationSettings.longitude,
        address: karenderia.address || this.locationSettings.address
      };
    });
  }

  private applyCachedKarenderiaFallback() {
    const cachedKarenderia = this.karenderiaInfoService.getCurrentKarenderia();
    if (!cachedKarenderia) {
      return;
    }

    this.currentKarenderiaId = cachedKarenderia.id ? Number(cachedKarenderia.id) : this.currentKarenderiaId;
    this.karenderiaStatus = this.normalizeKarenderiaStatus(cachedKarenderia.status);
    this.rejectionReason = cachedKarenderia.rejection_reason || this.rejectionReason;
    this.businessInfo = {
      name: cachedKarenderia.business_name || cachedKarenderia.name || this.businessInfo.name,
      phone: cachedKarenderia.phone || this.businessInfo.phone,
      email: cachedKarenderia.business_email || cachedKarenderia.email || this.businessInfo.email,
      cuisineType: this.businessInfo.cuisineType,
      description: cachedKarenderia.description || this.businessInfo.description,
      address: cachedKarenderia.address || this.businessInfo.address
    };
    this.locationSettings = {
      latitude: cachedKarenderia.latitude || this.locationSettings.latitude,
      longitude: cachedKarenderia.longitude || this.locationSettings.longitude,
      address: cachedKarenderia.address || this.locationSettings.address
    };
  }

  async saveChanges() {
    if (this.isSaving) {
      return;
    }

    const loading = await this.loadingController.create({
      message: this.karenderiaStatus === 'rejected' ? 'Resubmitting application...' : 'Saving changes...'
    });

    await loading.present();
    this.isSaving = true;

    try {
      const operatingDays = this.operatingHours
        .filter(day => day.isOpen)
        .map(day => day.name.toLowerCase());

      const payload = {
        business_name: this.businessInfo.name,
        name: this.businessInfo.name,
        business_email: this.businessInfo.email,
        email: this.businessInfo.email,
        phone: this.businessInfo.phone,
        description: this.businessInfo.description,
        address: this.businessInfo.address,
        latitude: this.locationSettings.latitude,
        longitude: this.locationSettings.longitude,
        operating_days: operatingDays,
        status: this.karenderiaStatus === 'rejected' ? 'pending' : undefined
      };

      const response = await this.karenderiaService.updateCurrentUserKarenderia(payload).toPromise();
      if (response?.success && response?.data) {
        this.currentKarenderiaId = response.data.id ?? this.currentKarenderiaId;
        this.karenderiaStatus = this.normalizeKarenderiaStatus(response.data.status || this.karenderiaStatus || 'unknown');
        this.rejectionReason = response.data.rejection_reason || '';
        this.karenderiaInfoService.updateKarenderiaData(response.data);
        await this.showToast(
          this.karenderiaStatus === 'pending'
            ? 'Application resubmitted successfully. Waiting for review.'
            : 'Settings saved successfully.',
          'success'
        );
      } else {
        await this.showToast('Unable to save changes.', 'warning');
      }
    } catch (error) {
      console.error('Failed to save settings:', error);
      await this.showToast('Failed to save changes.', 'danger');
    } finally {
      this.isSaving = false;
      await loading.dismiss();
    }
  }

  private normalizeKarenderiaStatus(status: string | null | undefined): 'approved' | 'pending' | 'rejected' | 'unknown' {
    const normalized = (status || '').toLowerCase();

    if (normalized === 'inactive') {
      return 'rejected';
    }

    if (normalized === 'approved' || normalized === 'pending' || normalized === 'rejected') {
      return normalized;
    }

    return 'unknown';
  }

  uploadLogo() {
    // Implement logo upload functionality
    console.log('Uploading logo...');
  }

  changePassword() {
    if (this.passwordChange.newPassword !== this.passwordChange.confirmPassword) {
      console.error('Passwords do not match');
      return;
    }
    
    if (this.passwordChange.newPassword.length < 6) {
      console.error('Password must be at least 6 characters');
      return;
    }

    console.log('Changing password...');
    // Implement password change logic
    
    // Clear form
    this.passwordChange = {
      currentPassword: '',
      newPassword: '',
      confirmPassword: ''
    };
  }

  private showSuccessMessage() {
    // Implement success message display
    console.log('Settings saved successfully!');
  }

  getPrimaryActionLabel(): string {
    return this.karenderiaStatus === 'rejected' ? 'Resubmit Application' : 'Save Changes';
  }

  getStatusMessage(): string {
    if (this.karenderiaStatus === 'rejected') {
      return this.rejectionReason
        ? `Your application was rejected: ${this.rejectionReason}`
        : 'Your application was rejected. Update your details and resubmit for admin review.';
    }

    if (this.karenderiaStatus === 'pending') {
      return 'Your application is pending review. You can still update the details before approval.';
    }

    if (this.karenderiaStatus === 'approved') {
      return 'Your karenderia is approved and live.';
    }

    return 'Manage your karenderia details below.';
  }

  async showToast(message: string, color: string = 'primary') {
    const toast = await this.toastController.create({
      message,
      duration: 2500,
      position: 'bottom',
      color
    });
    await toast.present();
  }

  // Dynamic karenderia display methods
  getKarenderiaDisplayName(): string {
    return this.karenderiaInfoService.getKarenderiaDisplayName();
  }

  getKarenderiaBrandInitials(): string {
    return this.karenderiaInfoService.getKarenderiaBrandInitials();
  }

  // Location handling method
  async onMapLocationSelected(event: any) {
    if (event && event.lat !== undefined && event.lng !== undefined) {
      // If location is already set and user is NOT in change mode, just allow map exploration
      if (this.isLocationSet() && !this.isChangeLocationMode) {
        console.log('Location already set. Double-click is disabled. Use "Change Location" button to modify.');
        return; // Do nothing - allow map exploration
      }

      // If location is not set OR user is in change mode, show confirmation
      await this.showLocationConfirmation(event);
      this.isChangeLocationMode = false; // Reset the flag after attempting change
    }
  }

  private async showLocationConfirmation(event: any) {
    const alert = await this.alertController.create({
      header: 'Set Location',
      message: 'Do you want to set your location here?',
      buttons: [
        {
          text: 'No',
          role: 'cancel',
          handler: () => {
            console.log('Location selection cancelled');
            this.isChangeLocationMode = false;
          }
        },
        {
          text: 'Yes',
          handler: () => {
            this.locationSettings.latitude = event.lat;
            this.locationSettings.longitude = event.lng;
            console.log('Location updated:', event);
            this.showToast('Location set successfully!', 'success');
            this.isChangeLocationMode = false;
          }
        }
      ]
    });

    await alert.present();
  }

  // Initiate location change from button click
  async initiateLocationChange() {
    const alert = await this.alertController.create({
      header: 'Change Location',
      message: 'Please double-click on the map to set your new location.',
      buttons: [
        {
          text: 'Cancel',
          role: 'cancel',
          handler: () => {
            this.isChangeLocationMode = false;
            console.log('Location change cancelled');
          }
        },
        {
          text: 'Ready to Change',
          handler: () => {
            this.isChangeLocationMode = true;
            this.showToast('Now double-click on the map to set the new location', 'info');
          }
        }
      ]
    });

    await alert.present();
  }

  // Check if location has been set
  isLocationSet(): boolean {
    return this.locationSettings.latitude !== 0 && this.locationSettings.longitude !== 0 &&
           this.locationSettings.latitude !== 10.3157 && this.locationSettings.longitude !== 123.8854;
  }
}
