import { Injectable } from '@angular/core';
import { BehaviorSubject, Observable } from 'rxjs';
import { KarenderiaService } from './karenderia.service';
import { Karenderia } from '../models/menu.model';
import { AuthService } from './auth.service';
import { UserService } from './user.service';

@Injectable({
  providedIn: 'root'
})
export class KarenderiaInfoService {
  private currentKarenderiaSubject = new BehaviorSubject<Karenderia | null>(null);
  public currentKarenderia$ = this.currentKarenderiaSubject.asObservable();

  constructor(
    private karenderiaService: KarenderiaService,
    private authService: AuthService,
    private userService: UserService
  ) {
    // Load data immediately if user is already logged in
    const token = localStorage.getItem('auth_token');
    if (token) {
      console.log('🔄 User already logged in, loading karenderia data...');
      this.loadKarenderiaData();
    }
  }

  async loadKarenderiaData() {
    try {
      console.log('🔍 KarenderiaInfoService: Attempting to load karenderia data from backend...');
      
      // Check if user is logged in
      const token = localStorage.getItem('auth_token');
      if (!token) {
        console.warn('🚫 No auth token found, user not logged in');
        this.currentKarenderiaSubject.next(null);
        return;
      }
      
      console.log('✅ Auth token found, making API call...');
      
      // Try to get real data from backend
      const karenderiaData = await this.karenderiaService.getCurrentUserKarenderia().toPromise();
      console.log('📡 API Response:', karenderiaData);
      
      if (karenderiaData && karenderiaData.success && karenderiaData.data) {
        console.log('✅ Successfully loaded karenderia data:', karenderiaData.data.name);
        this.currentKarenderiaSubject.next(karenderiaData.data);
        return;
      } else {
        console.warn('⚠️ API returned unsuccessful response:', karenderiaData);
      }
    } catch (error) {
      console.error('❌ Error loading karenderia from backend:', error);
    }

    this.currentKarenderiaSubject.next(null);
  }

  getCurrentKarenderia(): Karenderia | null {
    return this.currentKarenderiaSubject.value;
  }

  getKarenderiaDisplayName(): string {
    const karenderia = this.getCurrentKarenderia();
    if (!karenderia) {
      const profile = this.userService.getCurrentUserProfile();
      const currentUser = this.authService.getCurrentUser();

      if (profile?.displayName) {
        return profile.displayName;
      }

      if (currentUser?.name) {
        return currentUser.name;
      }

      if (currentUser?.role === 'karenderia_owner') {
        return 'Pending approval';
      }

      return 'KaPlato Kitchen';
    }
    return karenderia.business_name || karenderia.name || 'Your Karenderia';
  }

  getKarenderiaBrandInitials(): string {
    const name = this.getKarenderiaDisplayName();
    if (name === 'Pending approval') return 'PA';
    if (name === 'KaPlato Kitchen') return 'KP';
    
    const words = name.split(' ').filter(word => word.length > 0);
    if (words.length === 0) return 'YK';
    if (words.length === 1) return words[0].substring(0, 2).toUpperCase();
    return (words[0].charAt(0) + words[1].charAt(0)).toUpperCase();
  }

  // Method to update karenderia data (for settings page, etc.)
  updateKarenderiaData(karenderia: Karenderia) {
    this.currentKarenderiaSubject.next(karenderia);
  }

  // Method to reload karenderia data (call after login)
  async reloadKarenderiaData() {
    await this.loadKarenderiaData();
  }
}
