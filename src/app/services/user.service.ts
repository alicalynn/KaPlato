import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { BehaviorSubject, Observable, of } from 'rxjs';
import { map, tap, catchError, switchMap, timeout } from 'rxjs/operators';
import { environment } from '../../environments/environment';
import { AuthService } from './auth.service';
import { ApiConfigService } from './api-config.service';

export interface UserProfile {
  uid: string;
  email: string;
  displayName: string;
  username?: string;
  phoneNumber?: string;
  address?: string;
  applicationStatus?: string;
  role?: 'customer' | 'karenderia_owner' | 'admin' | 'supplier';
  photoURL?: string;
  age?: number;
  height?: number; // in cm
  weight?: number; // in kg
  activityLevel?: 'sedentary' | 'lightly_active' | 'moderately_active' | 'very_active' | 'extremely_active';
  fitnessGoal?: 'lose_weight' | 'maintain_weight' | 'gain_weight' | 'build_muscle';
  allergies?: string[];
  allergens?: any[]; // Add this for the profile page
  mealPlans?: any[]; // Add this for the profile page
  dietaryRestrictions?: string[];
  dietaryPreferences?: string[];
  cuisinePreferences?: string[];
  healthInfo?: {
    weight?: number;
    height?: number;
    activityLevel?: string;
    age?: number;
  };
  nutritionGoals?: {
    dailyCalories?: number;
    protein?: number;
    carbohydrates?: number;
    fat?: number;
  };
  preferredMealTimes?: {
    breakfast?: string;
    lunch?: string;
    dinner?: string;
    snacks?: string[];
  };
  location?: {
    latitude: number;
    longitude: number;
    address?: string;
  };
  preferences?: {
    maxCookingTime?: number; // in minutes
    skillLevel?: 'beginner' | 'intermediate' | 'advanced';
    budget?: 'low' | 'medium' | 'high';
    servingSize?: number;
  };
  createdAt?: any;
  updatedAt?: any;
}

@Injectable({
  providedIn: 'root'
})
export class UserService {
  private currentUserProfileSubject = new BehaviorSubject<UserProfile | null>(null);
  public currentUserProfile$ = this.currentUserProfileSubject.asObservable();

  constructor(
    private http: HttpClient,
    private authService: AuthService,
    private apiConfigService: ApiConfigService
  ) {
    // Load user profile when auth state changes, but don't block the app
    this.authService.currentUser$.subscribe(user => {
      if (user) {
        // Load profile in background with timeout
        this.loadUserProfile().pipe(
          timeout(5000), // 5 second timeout
          catchError(error => {
            console.warn('User profile loading failed, using auth service data:', error);
            // Fallback to auth service user data
            const fallbackProfile: UserProfile = {
              uid: user.id,
              email: user.email,
              displayName: user.name || user.displayName || 'User',
              role: user.role
            };
            this.currentUserProfileSubject.next(fallbackProfile);
            return of(fallbackProfile);
          })
        ).subscribe();
      } else {
        this.currentUserProfileSubject.next(null);
      }
    });
  }

  private getAuthHeaders(): { [key: string]: string } {
    const token = this.authService.getAuthToken();
    return token ? { Authorization: `Bearer ${token}` } : {};
  }

  private get apiUrl(): string {
    return this.apiConfigService.getApiUrl();
  }

  loadUserProfile(): Observable<UserProfile> {
    const user = this.authService.getCurrentUser();
    if (!user) {
      return of(null as any);
    }

    return this.http.get<UserProfile>(`${this.apiUrl}/user/profile`, {
      headers: this.getAuthHeaders()
    }).pipe(
      map(response => {
        // The backend now returns the profile directly, not nested in a 'user' property
        return response;
      }),
      tap(profile => {
        if (profile) {
          this.currentUserProfileSubject.next(profile);
        }
      }),
      catchError(error => {
        console.error('Error loading user profile:', error);
        return of(null as any);
      })
    );
  }

  updateUserProfile(profile: Partial<UserProfile>): Observable<UserProfile> {
    return this.http.put<UserProfile>(`${this.apiUrl}/user/profile`, profile, {
      headers: this.getAuthHeaders()
    }).pipe(
      map(response => {
        // Handle both old format (nested in user) and new format (direct response)
        return response;
      }),
      tap(updatedProfile => {
        if (updatedProfile) {
          this.currentUserProfileSubject.next(updatedProfile);
        }
      }),
      catchError(error => {
        console.error('Error updating user profile:', error);
        throw error;
      })
    );
  }

  createUserProfile(profile: Omit<UserProfile, 'uid' | 'createdAt' | 'updatedAt'>): Observable<UserProfile> {
    return this.http.post<UserProfile>(`${this.apiUrl}/user/profile`, profile, {
      headers: this.getAuthHeaders()
    }).pipe(
      map(response => {
        // Handle both old format (nested in user) and new format (direct response)
        return response;
      }),
      tap(newProfile => {
        if (newProfile) {
          this.currentUserProfileSubject.next(newProfile);
        }
      }),
      catchError(error => {
        console.error('Error creating user profile:', error);
        throw error;
      })
    );
  }

  getCurrentUserProfile(): UserProfile | null {
    return this.currentUserProfileSubject.value;
  }

  uploadProfilePhoto(file: File): Observable<string> {
    const formData = new FormData();
    formData.append('photo', file);

    return this.http.post<{ photoURL: string }>(`${this.apiUrl}/user/upload-photo`, formData, {
      headers: this.getAuthHeaders()
    }).pipe(
      map(response => response.photoURL),
      tap(photoURL => {
        const currentProfile = this.getCurrentUserProfile();
        if (currentProfile) {
          this.currentUserProfileSubject.next({
            ...currentProfile,
            photoURL: photoURL
          });
        }
      }),
      catchError(error => {
        console.error('Error uploading profile photo:', error);
        throw error;
      })
    );
  }

  deleteAccount(): Observable<any> {
    return this.http.delete(`${this.apiUrl}/user/account`, {
      headers: this.getAuthHeaders()
    }).pipe(
      tap(() => {
        this.currentUserProfileSubject.next(null);
        this.authService.logout();
      }),
      catchError(error => {
        console.error('Error deleting account:', error);
        throw error;
      })
    );
  }

  // Nutritional calculations
  calculateBMR(profile: UserProfile): number {
    if (!profile.age || !profile.height || !profile.weight) {
      return 0;
    }

    // Using Mifflin-St Jeor Equation (assuming male, adjust for gender if available)
    return 10 * profile.weight + 6.25 * profile.height - 5 * profile.age + 5;
  }

  calculateTDEE(profile: UserProfile): number {
    const bmr = this.calculateBMR(profile);
    const activityMultipliers = {
      sedentary: 1.2,
      lightly_active: 1.375,
      moderately_active: 1.55,
      very_active: 1.725,
      extremely_active: 1.9
    };

    return bmr * (activityMultipliers[profile.activityLevel || 'sedentary'] || 1.2);
  }

  calculateCalorieGoal(profile: UserProfile): number {
    const tdee = this.calculateTDEE(profile);
    
    switch (profile.fitnessGoal) {
      case 'lose_weight':
        return Math.round(tdee - 500); // 500 calorie deficit
      case 'gain_weight':
        return Math.round(tdee + 500); // 500 calorie surplus
      case 'build_muscle':
        return Math.round(tdee + 300); // 300 calorie surplus
      case 'maintain_weight':
      default:
        return Math.round(tdee);
    }
  }

  // Get user's nutritional preferences
  getNutritionalPreferences(): Observable<any> {
    return this.http.get(`${this.apiUrl}/user/nutritional-preferences`, {
      headers: this.getAuthHeaders()
    });
  }

  // Update nutritional preferences
  updateNutritionalPreferences(preferences: any): Observable<any> {
    return this.http.put(`${this.apiUrl}/user/nutritional-preferences`, preferences, {
      headers: this.getAuthHeaders()
    });
  }
}
