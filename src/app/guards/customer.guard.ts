import { Injectable } from '@angular/core';
import { CanActivate, Router } from '@angular/router';
import { Observable } from 'rxjs';
import { map, take } from 'rxjs/operators';
import { AuthService } from '../services/auth.service';

@Injectable({
  providedIn: 'root'
})
export class CustomerGuard implements CanActivate {
  constructor(
    private authService: AuthService,
    private router: Router
  ) {}

  canActivate(): Observable<boolean> {
    return this.authService.currentUser$.pipe(
      take(1),
      map((user) => {
        console.log('🛡️ CustomerGuard: Checking user role:', user?.role);
        
        if (user && user.role === 'customer') {
          console.log('✅ CustomerGuard: Customer allowed');
          return true;
        } else if (user && user.role === 'karenderia_owner') {
          // Redirect karenderia owners to their dashboard
          console.log('🔄 CustomerGuard: Redirecting karenderia owner to dashboard');
          this.router.navigate(['/karenderia-dashboard']);
          return false;
        } else if (user && user.role === 'supplier') {
          // Redirect suppliers to their supplier home
          console.log('🔄 CustomerGuard: Redirecting supplier to supplier-home');
          this.router.navigate(['/supplier-home']);
          return false;
        } else if (user && user.role === 'admin') {
          // Redirect admins to their dashboard
          console.log('🔄 CustomerGuard: Redirecting admin to dashboard');
          this.router.navigate(['/admin-dashboard']);
          return false;
        } else {
          // No valid user, redirect to login
          console.log('❌ CustomerGuard: No valid user, redirecting to login');
          this.router.navigate(['/login']);
          return false;
        }
      })
    );
  }
}
