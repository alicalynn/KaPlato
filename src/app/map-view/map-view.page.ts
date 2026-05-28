import { Component, OnInit, AfterViewInit, ViewChild, ElementRef  } from '@angular/core';
import { Router, ActivatedRoute } from '@angular/router';
import { ToastController, LoadingController, AlertController, ModalController } from '@ionic/angular';
import { KarenderiaService } from '../services/karenderia.service';
import { GestureController } from '@ionic/angular';
import { Location } from '@angular/common';

@Component({
  selector: 'app-map-view',
  templateUrl: './map-view.page.html',
  styleUrls: ['./map-view.page.scss'],
  standalone: false,
})
export class MapViewPage implements OnInit, AfterViewInit {
  @ViewChild('listWrapper', { read: ElementRef }) listWrapper!: ElementRef;

  searchQuery = '';
  selectedFilter = 'all';
  showList = false; // Start with list hidden for better mobile UX
  karenderias: any[] = [];
  filteredKarenderias: any[] = [];
  userLocation: any = null;
  
  // Location picker mode
  isLocationPickerMode: boolean = false;
  returnTo: string = '';
  selectedLocation: { lat: number, lng: number } | null = null;
  
  // Map properties
  currentLat = 10.3157; // Default to Cebu City coordinates
  currentLng = 123.8854;
  mapZoom = 13;

  constructor(
    private router: Router,
    private route: ActivatedRoute,
    private toastController: ToastController,
    private loadingController: LoadingController,
    private alertController: AlertController,
    private modalController: ModalController,
    private karenderiaService: KarenderiaService,
    private gestureCtrl: GestureController,
    private location: Location
  ) {}

  ngOnInit() {
    console.log('🗺️ Map view initializing...');
    console.log('🗺️ Current URL:', this.router.url);
    
    // Check if we're in location picker mode
    this.route.queryParams.subscribe(params => {
      this.isLocationPickerMode = params['mode'] === 'location-picker';
      this.returnTo = params['returnTo'] || 'home';
      
      if (this.isLocationPickerMode) {
        console.log('📍 Location picker mode activated - no auto location detection');
        this.showList = false; // Hide karenderias list in picker mode
        // Don't load karenderias or get location in picker mode
        return;
      }
    });
    
    // Ensure we stay on the map-view route
    if (this.router.url.split('?')[0] !== '/map-view') {
      console.log('⚠️ URL mismatch detected, ensuring we stay on map-view');
      this.router.navigateByUrl('/map-view', { replaceUrl: true });
    }
    
    // Only get location and load karenderias if NOT in picker mode
    if (!this.isLocationPickerMode) {
      this.getCurrentLocation();
    }
    // DON'T call addSwipeGesture() here - moved to ngAfterViewInit()
  }

  ngAfterViewInit() {
    // Only access DOM elements after the view is initialized
    console.log('🗺️ View initialized, setting up gestures...');
    this.addSwipeGesture();
    
    // Debug info after a short delay to ensure data is loaded
    setTimeout(() => {
      console.log('🔍 DEBUG INFO:');
      console.log('📊 Total karenderias:', this.karenderias.length);
      console.log('📋 Filtered karenderias:', this.filteredKarenderias.length);
      console.log('🔤 Search query:', this.searchQuery);
      console.log('🏷️ Selected filter:', this.selectedFilter);
      console.log('👀 Show list:', this.showList);
    }, 1000);
  }

  goBack() {
    console.log('🔙 Going back to home page...');
    // Try to go back in history first
    if (window.history.length > 1) {
      this.location.back();
    } else {
      // If no history, navigate directly to home
      this.router.navigate(['/home']);
    }
  }

  toggleListView() {
    console.log('🔄 Toggling list view. Current state:', this.showList);
    this.showList = !this.showList;
    console.log('🔄 New state:', this.showList);
    console.log('📋 Filtered karenderias count:', this.filteredKarenderias.length);
  }

  addSwipeGesture() {
    const gesture = this.gestureCtrl.create({
      el: this.listWrapper.nativeElement,
      gestureName: 'swipe',
      onMove: (ev) => {
        if (ev.deltaY > 50) {
          this.showList = false; // Close the list on downward swipe
        }
      },
    });
    gesture.enable();
  }

  async loadKarenderias() {
    console.log('🔍 Loading karenderias for map view...');
    this.loadFromBackend();
  }

  loadFromBackend() {
    console.log('🌐 Loading from backend...');
    this.karenderiaService.getAllKarenderias().subscribe({
      next: (response) => {
        console.log('🌐 Backend response:', response);
        if (response && response.length > 0) {
          this.karenderias = response.map(k => ({
            id: k.id,
            name: k.name,
            cuisine: k.cuisine?.join(', ') || 'Filipino',
            address: k.address,
            rating: k.rating || k.average_rating || 4.5,
            isOpen: true, // Default to open
            deliveryTime: `30 min`,
            distance: 300,
            latitude: k.location?.latitude || 10.3157,
            longitude: k.location?.longitude || 123.8854
          }));
          this.filteredKarenderias = [...this.karenderias];
          console.log('✅ Loaded from backend:', this.karenderias.length, 'karenderias');
        } else {
          console.log('⚠️ No backend data found');
          this.karenderias = [];
          this.filteredKarenderias = [];
        }
        this.applyFilter();
      },
      error: (error) => {
        console.error('❌ Backend error:', error);
        this.karenderias = [];
        this.filteredKarenderias = [];
        this.applyFilter();
      }
    });
  }

  onSearchChange() {
    this.applyFilter();
  }

  setFilter(filter: string) {
    this.selectedFilter = filter;
    this.applyFilter();
  }

  applyFilter() {
    console.log('🔍 Applying filters...');
    console.log('📊 Total karenderias:', this.karenderias.length);
    console.log('🔤 Search query:', this.searchQuery);
    console.log('🏷️ Selected filter:', this.selectedFilter);
    
    let filtered = [...this.karenderias];

    // Apply search filter
    if (this.searchQuery.trim()) {
      const query = this.searchQuery.toLowerCase();
      filtered = filtered.filter(k => 
        k.name.toLowerCase().includes(query) ||
        k.cuisine.toLowerCase().includes(query) ||
        k.address.toLowerCase().includes(query)
      );
      console.log('🔍 After search filter:', filtered.length);
    }

    // Apply category filter
    switch (this.selectedFilter) {
      case 'open':
        filtered = filtered.filter(k => k.isOpen);
        console.log('🏪 After "open" filter:', filtered.length);
        break;
      case 'nearby':
        filtered = filtered.filter(k => k.distance && k.distance < 500);
        console.log('📍 After "nearby" filter:', filtered.length);
        break;
      case 'rating':
        filtered = filtered.filter(k => k.rating >= 4.5);
        console.log('⭐ After "rating" filter:', filtered.length);
        break;
      case 'all':
      default:
        console.log('📋 No category filter applied');
        break;
    }

    this.filteredKarenderias = filtered;
    console.log('✅ Final filtered karenderias:', this.filteredKarenderias.length);
    console.log('📋 Filtered list:', this.filteredKarenderias);
  }

  selectKarenderia(karenderia: any) {
    // Navigate to karenderia detail page with menu
    console.log('Selected karenderia:', karenderia);
    console.log('🏪 Navigating to karenderia detail page...');
    
    // Use the karenderia ID or create one if it doesn't exist
    const karenderiaId = karenderia.id || karenderia.name.toLowerCase().replace(/[^a-z0-9]/g, '-');
    
    this.router.navigate(['/karenderia-detail', karenderiaId], {
      state: { karenderia: karenderia }
    });
  }

  async centerOnUserLocation() {
    const loading = await this.loadingController.create({
      message: 'Getting your location...',
      duration: 2000
    });
    await loading.present();

    this.getCurrentLocation();
    await loading.dismiss();
  }

  getCurrentLocation() {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          this.userLocation = {
            latitude: position.coords.latitude,
            longitude: position.coords.longitude
          };
        },
        (error) => {
          console.error('Error getting location:', error);
          this.showToast('Unable to get your location');
        }
      );
    } else {
      this.showToast('Geolocation is not supported');
    }
  }

  refreshLocation() {
    this.getCurrentLocation();
    this.loadKarenderias();
    this.showToast('Location refreshed');
  }

  async showToast(message: string) {
    const toast = await this.toastController.create({
      message,
      duration: 2000,
      position: 'bottom'
    });
    toast.present();
  }

  // Location picker methods
  async onMapDoubleClick(event: any) {
    if (!this.isLocationPickerMode) {
      return; // Only handle double-click in location picker mode
    }

    console.log('📍 Double-click event received:', event);

    // Get coordinates from the map click event
    // EventEmitter sends data directly, not wrapped in detail
    if (event && event.lat && event.lng) {
      this.selectedLocation = {
        lat: event.lat,
        lng: event.lng
      };

      console.log('📍 Selected location:', this.selectedLocation);

      // Show confirmation dialog
      const alert = await this.alertController.create({
        header: 'Set Business Location',
        message: `Do you want to apply this location to your karenderia?<br><br><strong>Coordinates:</strong><br>Latitude: ${this.selectedLocation.lat.toFixed(6)}<br>Longitude: ${this.selectedLocation.lng.toFixed(6)}`,
        buttons: [
          {
            text: 'Cancel',
            role: 'cancel',
            cssClass: 'secondary'
          },
          {
            text: 'Apply Location',
            role: 'confirm',
            cssClass: 'primary',
            handler: () => {
              this.confirmLocation();
            }
          }
        ]
      });

      await alert.present();
    } else {
      console.error('❌ Invalid event data:', event);
    }
  }

  confirmLocation() {
    if (this.selectedLocation) {
      // Navigate back with location data
      this.router.navigate([`/${this.returnTo}`], {
        queryParams: {
          selectedLat: this.selectedLocation.lat,
          selectedLng: this.selectedLocation.lng
        }
      });
    }
  }

  cancelLocationPicking() {
    // Navigate back without location data
    this.router.navigate([`/${this.returnTo}`]);
  }

  clearRoutes() {
    // This method should be available on the map component
    // In a real implementation, you would access the map component via ViewChild
    console.log('Clearing routes...');
    
    // If you have a ViewChild reference to the map component, you can call:
    // this.mapComponent.clearRoute();
    
    // For now, just show a toast
    this.showToast('Routes cleared');
  }

  // Get directions for a karenderia - Opens a modal
  async getDirections(karenderia: any) {
    console.log('📍 Opening directions modal for:', karenderia.name);
    
    const modal = await this.modalController.create({
      component: DirectionsModalContent,
      componentProps: {
        karenderia: karenderia,
        userLocation: this.userLocation
      },
      cssClass: 'directions-modal',
      breakpoints: [0, 0.5, 1],
      initialBreakpoint: 0.5
    });

    await modal.present();
  }
}

// Directions Modal Content Component
@Component({
  selector: 'app-directions-modal',
  standalone: false,
  template: `
    <ion-header>
      <ion-toolbar>
        <ion-title>{{ karenderia?.name }}</ion-title>
        <ion-buttons slot="end">
          <ion-button (click)="closeModal()">
            <ion-icon name="close-outline"></ion-icon>
          </ion-button>
        </ion-buttons>
      </ion-toolbar>
    </ion-header>

    <ion-content>
      <ion-list>
        <!-- Karenderia Info -->
        <ion-item>
          <ion-label position="stacked">
            <strong>Address</strong>
          </ion-label>
          <ion-text>
            <p>{{ karenderia?.address }}</p>
          </ion-text>
        </ion-item>

        <!-- Distance Info -->
        <ion-item *ngIf="karenderia?.distance">
          <ion-label position="stacked">
            <strong>Distance</strong>
          </ion-label>
          <ion-text>
            <p>{{ karenderia?.distance }}m away</p>
          </ion-text>
        </ion-item>

        <!-- Estimated Time -->
        <ion-item *ngIf="karenderia?.deliveryTime">
          <ion-label position="stacked">
            <strong>Estimated Travel Time</strong>
          </ion-label>
          <ion-text>
            <p>{{ karenderia?.deliveryTime }}</p>
          </ion-text>
        </ion-item>

        <!-- Coordinates -->
        <ion-item>
          <ion-label position="stacked">
            <strong>Coordinates</strong>
          </ion-label>
          <ion-text>
            <p>Lat: {{ karenderia?.latitude?.toFixed(6) }}</p>
            <p>Lng: {{ karenderia?.longitude?.toFixed(6) }}</p>
          </ion-text>
        </ion-item>
      </ion-list>

      <!-- Action Buttons -->
      <div class="directions-actions">
        <ion-button 
          expand="block" 
          fill="solid" 
          color="primary"
          (click)="openGoogleMaps()">
          <ion-icon name="navigate-outline" slot="start"></ion-icon>
          Open in Google Maps
        </ion-button>

        <ion-button 
          expand="block" 
          fill="outline" 
          color="primary"
          (click)="callKarenderia()">
          <ion-icon name="call-outline" slot="start"></ion-icon>
          Call Karenderia
        </ion-button>
      </div>

      <div class="info-box">
        <ion-icon name="information-circle"></ion-icon>
        <p>Tap "Open in Google Maps" to see turn-by-turn directions from your location.</p>
      </div>
    </ion-content>
  `,
  styles: [`
    .directions-actions {
      padding: 16px;
      display: flex;
      flex-direction: column;
      gap: 12px;
    }

    .info-box {
      display: flex;
      align-items: center;
      gap: 12px;
      padding: 16px;
      background: rgba(66, 165, 245, 0.1);
      border-radius: 8px;
      margin: 16px;
      border-left: 4px solid #42a5f5;

      ion-icon {
        font-size: 24px;
        color: #42a5f5;
        flex-shrink: 0;
      }

      p {
        margin: 0;
        font-size: 14px;
        color: #1e293b;
      }
    }

    ion-list {
      background: transparent;
    }

    ion-item {
      --padding-start: 16px;
      --padding-end: 16px;
      margin-bottom: 8px;
    }

    ion-text {
      p {
        margin: 4px 0;
        font-size: 14px;
      }
    }
  `]
})
export class DirectionsModalContent {
  karenderia: any;
  userLocation: any;

  constructor(
    private modalController: ModalController,
    private toastController: ToastController
  ) {}

  closeModal() {
    this.modalController.dismiss();
  }

  openGoogleMaps() {
    if (this.karenderia?.latitude && this.karenderia?.longitude) {
      // Google Maps URL with destination coordinates
      const url = `https://www.google.com/maps/dir/?api=1&destination=${this.karenderia.latitude},${this.karenderia.longitude}`;
      window.open(url, '_blank');
      console.log('📍 Opening Google Maps with directions to:', this.karenderia.name);
    } else {
      this.showToast('Location information not available');
    }
  }

  callKarenderia() {
    // Placeholder for call functionality
    this.showToast('Call feature coming soon!');
  }

  async showToast(message: string) {
    const toast = await this.toastController.create({
      message,
      duration: 2000,
      position: 'bottom'
    });
    await toast.present();
  }
}