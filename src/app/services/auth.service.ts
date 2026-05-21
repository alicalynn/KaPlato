import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Router } from '@angular/router';
import { AlertController } from '@ionic/angular';
import { BehaviorSubject, Observable, of } from 'rxjs';
import { map, tap, catchError } from 'rxjs/operators';
import { environment } from '../../environments/environment';
import { ApiConfigService } from './api-config.service';

export interface User {
  id: string;
  email: string;
  name: string;
  displayName?: string;
  role: 'customer' | 'karenderia_owner' | 'admin' | 'supplier';
  verified?: boolean;
  applicationStatus?: string;
}

export interface AuthKarenderiaSummary {
  id: string | number;
  business_name: string;
  status: string;
  approved_at?: string | null;
  rejected_at?: string | null;
  rejection_reason?: string | null;
}

export interface LoginCredentials {
  email: string;
  password: string;
}

export interface RegisterData {
  name: string;
  email: string;
  password: string;
  password_confirmation: string;
  role?: 'customer' | 'karenderia_owner';
}

export interface AuthResponse {
  user: User;
  access_token: string;
  token_type: string;
  expires_in: number;
  karenderia?: AuthKarenderiaSummary;
}

export interface Allergen {
  id: string;
  name: string;
  category: string;
  notes?: string;
  addedAt?: Date;
  severity?: 'mild' | 'moderate' | 'severe';
}

export interface MealPlan {
  id: string;
  name: string;
  description: string;
  duration: number; // days
  caloriesPerDay: number;
  type: 'weight_loss' | 'muscle_gain' | 'maintenance' | 'custom';
  startDate?: Date;
  endDate?: Date;
  isActive?: boolean;
  meals?: any[];
}

@Injectable({
  providedIn: 'root'
})
export class AuthService {
  private currentUserSubject = new BehaviorSubject<User | null>(null);
  public currentUser$ = this.currentUserSubject.asObservable();

  constructor(
    private http: HttpClient, 
    private router: Router, 
    private alertController: AlertController,
    private apiConfigService: ApiConfigService
  ) {
    this.checkStoredAuth();
  }

  private get apiUrl(): string {
    return this.apiConfigService.getApiUrl();
  }

  private checkStoredAuth(): void {
    // Check if user was previously logged in and restore session on app startup
    const token = localStorage.getItem('auth_token');
    const userData = localStorage.getItem('user_data');

    if (token && userData) {
      try {
        const user = JSON.parse(userData);
        this.currentUserSubject.next(user);
        console.log('Session restored for user:', user.email);
      } catch (error) {
        console.error('Error restoring stored user data:', error);
        this.logout();
      }
    } else {
      console.log('No stored session found - user needs to login');
    }
  }

  login(credentials: LoginCredentials): Observable<AuthResponse> {
    console.log('🔐 Login attempt - using API URL:', this.apiUrl);
    return this.http.post<AuthResponse>(`${this.apiUrl}/auth/login`, credentials)
      .pipe(
        tap(response => {
          localStorage.setItem('auth_token', response.access_token);
          localStorage.setItem('user_data', JSON.stringify(response.user));
          this.currentUserSubject.next(response.user);
        }),
        catchError(error => {
          console.error('❌ Login error:', error);
          throw error;
        })
      );
  }

  register(userData: RegisterData): Observable<AuthResponse> {
    return this.http.post<AuthResponse>(`${this.apiUrl}/auth/register`, userData)
      .pipe(
        tap(response => {
          // For regular registration (customers/suppliers), store the token and auto-login
          if (response.access_token && response.user.role !== 'karenderia_owner') {
            localStorage.setItem('auth_token', response.access_token);
            localStorage.setItem('user_data', JSON.stringify(response.user));
            this.currentUserSubject.next(response.user);
          } else {
            // For pending registrations, clear auth and require explicit login
            this.logout();
          }
        }),
        catchError(error => {
          console.error('Registration error:', error);
          throw error;
        })
      );
  }

  registerKarenderiaOwner(registrationData: any): Observable<any> {
    return this.http.post<any>(`${this.apiUrl}/auth/register-karenderia-owner`, registrationData)
      .pipe(
        tap(response => {
          // DO NOT auto-login pending Karenderia Owner registrations
          // Users must wait for admin approval and then login explicitly
          // Clear any existing auth tokens to prevent auto-login
          this.logout();
        }),
        catchError(error => {
          console.error('Karenderia owner registration error:', error);
          throw error;
        })
      );
  }

  registerSupplier(registrationData: any): Observable<any> {
    return this.http.post<any>(`${this.apiUrl}/auth/register-supplier`, registrationData)
      .pipe(
        tap(response => {
          // DO NOT auto-login pending Supplier registrations
          // Users must wait for admin approval and then login explicitly
          // Clear any existing auth tokens to prevent auto-login
          this.logout();
        }),
        catchError(error => {
          console.error('Supplier registration error:', error);
          throw error;
        })
      );
  }

  logout(): void {
    const token = localStorage.getItem('auth_token');

    // Clear local storage immediately for instant logout feeling
    localStorage.removeItem('auth_token');
    localStorage.removeItem('user_data');
    this.currentUserSubject.next(null);

    // Optional: Notify server in background (don't wait for response)
    if (token) {
      this.http.post(`${this.apiUrl}/auth/logout`, {}, {
        headers: { Authorization: `Bearer ${token}` }
      }).subscribe({
        next: () => console.log('Server logout successful'),
        error: () => console.log('Server logout failed (already logged out locally)')
      });
    }
  }

  // Simple logout with navigation - use this in components
  async logoutAndRedirect(): Promise<void> {
    this.logout();
    await this.router.navigate(['/login'], { replaceUrl: true });
  }

  // Logout with simple confirmation
  async logoutWithConfirmation(): Promise<void> {
    const alert = await this.alertController.create({
      header: 'Logout',
      message: 'Are you sure you want to logout?',
      buttons: [
        {
          text: 'Cancel',
          role: 'cancel'
        },
        {
          text: 'Logout',
          role: 'confirm',
          handler: () => {
            this.logoutAndRedirect();
          }
        }
      ]
    });

    await alert.present();
  }

  isAuthenticated(): boolean {
    return !!localStorage.getItem('auth_token');
  }

  getCurrentUser(): User | null {
    // First try to get from the BehaviorSubject (should be in memory)
    const userFromSubject = this.currentUserSubject.value;
    
    if (userFromSubject) {
      return userFromSubject;
    }
    
    // Fallback: try to get from localStorage (in case BehaviorSubject is out of sync)
    const userData = localStorage.getItem('user_data');
    if (userData) {
      try {
        const user = JSON.parse(userData);
        // Update the BehaviorSubject to keep them in sync
        this.currentUserSubject.next(user);
        return user;
      } catch (error) {
        console.error('Error parsing stored user data:', error);
      }
    }
    
    return null;
  }

  getAuthToken(): string | null {
    return localStorage.getItem('auth_token');
  }

  private getAuthHeaders(): { [key: string]: string } {
    const token = this.getAuthToken();
    return token ? { Authorization: `Bearer ${token}` } : {};
  }

  // Reset password
  resetPassword(email: string): Observable<any> {
    return this.http.post(`${this.apiUrl}/auth/reset-password`, { email });
  }

  // Update password
  updatePassword(currentPassword: string, newPassword: string): Observable<any> {
    return this.http.post(`${this.apiUrl}/auth/change-password`, {
      current_password: currentPassword,
      new_password: newPassword,
      new_password_confirmation: newPassword
    }, {
      headers: this.getAuthHeaders()
    });
  }

  // Verify email
  verifyEmail(token: string): Observable<any> {
    return this.http.post(`${this.apiUrl}/auth/verify-email`, { token });
  }

  // Resend verification email
  resendVerificationEmail(): Observable<any> {
    return this.http.post(`${this.apiUrl}/auth/resend-verification`, {}, {
      headers: this.getAuthHeaders()
    });
  }
}
