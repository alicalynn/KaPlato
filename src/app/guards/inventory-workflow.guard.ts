import { Injectable } from '@angular/core';
import { CanActivate, Router } from '@angular/router';
import { Observable, of } from 'rxjs';
import { catchError, map } from 'rxjs/operators';
import { AuthService } from '../services/auth.service';
import { UserService, UserProfile } from '../services/user.service';

@Injectable({
  providedIn: 'root'
})
export class InventoryWorkflowGuard implements CanActivate {
  constructor(
    private authService: AuthService,
    private userService: UserService,
    private router: Router
  ) {}

  canActivate(): Observable<boolean> {
    const user = this.authService.getCurrentUser();

    if (!user) {
      this.router.navigate(['/login']);
      return of(false);
    }

    if (user.role === 'supplier') {
      // Allow suppliers to access inventory management for their stock
      return of(true);
    }

    if (user.role === 'karenderia_owner') {
      const cachedProfile = this.userService.getCurrentUserProfile();
      const cachedStatus = this.resolveOwnerStatus(cachedProfile);

      if (cachedProfile && cachedStatus !== 'unknown') {
        if (cachedStatus === 'approved') {
          return of(true);
        }

        this.router.navigate(['/karenderia-settings']);
        return of(false);
      }

      return this.userService.loadUserProfile().pipe(
        map(profile => {
          const status = this.resolveOwnerStatus(profile);

          if (status === 'approved') {
            return true;
          }

          this.router.navigate(['/karenderia-settings']);
          return false;
        }),
        catchError(() => {
          const fallbackStatus = this.resolveOwnerStatus(this.authService.getCurrentUser() as any);

          if (fallbackStatus === 'approved') {
            return of(true);
          }

          this.router.navigate(['/karenderia-settings']);
          return of(false);
        })
      );
    }

    if (user.role === 'admin') {
      this.router.navigate(['/admin-dashboard']);
      return of(false);
    }

    this.router.navigate(['/home']);
    return of(false);
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
