import { Injectable } from '@angular/core';
import { ActivatedRouteSnapshot, CanActivate, Router, RouterStateSnapshot } from '@angular/router';
import { Observable, of } from 'rxjs';
import { map, catchError } from 'rxjs/operators';
import { UserService, UserProfile } from '../services/user.service';
import { AuthService } from '../services/auth.service';

@Injectable({
  providedIn: 'root'
})
export class KarenderiaGuard implements CanActivate {
  constructor(
    private userService: UserService,
    private authService: AuthService,
    private router: Router
  ) {}

  canActivate(route: ActivatedRouteSnapshot, state: RouterStateSnapshot): Observable<boolean> {
    // First check if we have basic auth
    const currentUser = this.authService.getCurrentUser();
    
    console.log('KarenderiaGuard: Checking access, currentUser:', currentUser);
    
    if (!currentUser) {
      console.log('KarenderiaGuard: No current user, redirecting to login');
      this.router.navigate(['/login']);
      return of(false);
    }

    if (currentUser.role === 'karenderia_owner') {
      const cachedProfile = this.userService.getCurrentUserProfile();
      const cachedStatus = this.resolveOwnerStatus(cachedProfile);

      if (cachedProfile && cachedStatus !== 'unknown') {
        return of(this.authorizeOwnerStatus(cachedStatus, state.url));
      }

      return this.userService.loadUserProfile().pipe(
        map(profile => {
          const status = this.resolveOwnerStatus(profile);
          return this.authorizeOwnerStatus(status, state.url);
        }),
        catchError(error => {
          console.error('KarenderiaGuard: Failed to verify owner status:', error);
          const fallbackStatus = this.resolveOwnerStatus(this.authService.getCurrentUser() as any);

          if (fallbackStatus === 'approved') {
            return of(this.authorizeOwnerStatus(fallbackStatus, state.url));
          }

          this.authService.logout();
          this.router.navigate(['/login']);
          return of(false);
        })
      );
    }

    if (currentUser.role === 'admin') {
      console.log('KarenderiaGuard: Admin attempted owner route, redirecting to admin dashboard');
      this.router.navigate(['/admin-dashboard']);
      return of(false);
    }

    if (currentUser.role === 'supplier') {
      console.log('KarenderiaGuard: Supplier attempted owner route, redirecting to inventory');
      this.router.navigate(['/inventory-management']);
      return of(false);
    }

    console.log('KarenderiaGuard: Non-owner attempted owner route, redirecting to home');
    this.router.navigate(['/home']);
    return of(false);
  }

  private authorizeOwnerStatus(status: 'approved' | 'pending' | 'rejected' | 'unknown', url: string): boolean {
    if (status === 'approved') {
      console.log('KarenderiaGuard: Approved owner, access granted');
      return true;
    }

    if (url.includes('/karenderia-settings')) {
      console.log(`KarenderiaGuard: Allowing ${status} owner to access settings`);
      return true;
    }

    console.log(`KarenderiaGuard: ${status} owner cannot access this page, redirecting to settings`);
    this.router.navigate(['/karenderia-settings']);
    return false;
  }

  private resolveOwnerStatus(profile: UserProfile | null | undefined): 'approved' | 'pending' | 'rejected' | 'unknown' {
    const applicationStatus = (profile?.applicationStatus || '').toLowerCase();
    if (applicationStatus === 'approved') {
      return 'approved';
    }
    if (applicationStatus === 'pending') {
      return 'pending';
    }
    if (applicationStatus === 'rejected') {
      return 'rejected';
    }

    return profile?.role === 'karenderia_owner' ? 'approved' : 'unknown';
  }
}
