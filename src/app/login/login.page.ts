import { Component, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import { NgForm } from '@angular/forms';
import { AuthService } from '../services/auth.service';
import { KarenderiaInfoService } from '../services/karenderia-info.service';
import { UserService } from '../services/user.service';
import { AlertController } from '@ionic/angular';

@Component({
  selector: 'app-login',
  templateUrl: './login.page.html',
  styleUrls: ['./login.page.scss'],
  standalone: false,
})
export class LoginPage implements OnInit {
  loginData = {
    emailOrUsername: '',
    password: ''
  };

  showPassword = false;
  isLoading = false;
  errorMessage = '';
  isLoginDisabled = false; // Added property to fix error

  constructor(
    private authService: AuthService,
    private router: Router,
    private karenderiaInfoService: KarenderiaInfoService,
    private userService: UserService,
    private alertController: AlertController
  ) {}

  async ngOnInit() {
    // Check if user is already logged in
    if (this.authService.isAuthenticated()) {
      const currentUser = this.authService.getCurrentUser();
      if (currentUser?.role === 'karenderia_owner') {
        try {
          const profile = await this.userService.loadUserProfile().toPromise();
          const status = (profile?.applicationStatus || '').toLowerCase();

          if (status === 'rejected' || status === 'pending') {
            this.router.navigate(['/karenderia-settings']);
            return;
          }
        } catch (error) {
          console.warn('Could not verify owner status before redirect:', error);
        }
      }

      this.redirectBasedOnRole(currentUser);
    }
  }

  private redirectBasedOnRole(user: any) {
    console.log('✅ Login: Redirecting user with role:', user?.role);
    
    switch (user?.role) {
      case 'admin':
        console.log('➡️ Going to admin dashboard');
        this.router.navigate(['/admin-dashboard']);
        break;
      case 'karenderia_owner':
        console.log('➡️ Going to karenderia dashboard');
        this.router.navigate(['/karenderia-dashboard']);
        break;
      case 'supplier':
        console.log('➡️ Going to supplier home');
        this.router.navigate(['/supplier-home']);
        break;
      case 'customer':
      default:
        console.log('➡️ Going to home');
        this.router.navigate(['/home']);
        break;
    }
  }

  async onLogin(form: NgForm) {
    if (form.valid) {
      this.isLoading = true;
      this.errorMessage = '';

      try {
        const credentials = { 
          email: this.loginData.emailOrUsername, 
          password: this.loginData.password 
        };
        const response = await this.authService.login(credentials).toPromise();
        
        console.log('🔑 Login successful, user role:', response?.user?.role);
        
        // If it's a karenderia owner, load their karenderia data
        if (response?.user?.role === 'karenderia_owner') {
          console.log('🏪 Karenderia owner logged in, loading karenderia data...');
          await this.karenderiaInfoService.reloadKarenderiaData();
        }
        
        // Add a small delay to ensure session storage and BehaviorSubject are fully updated
        await new Promise(resolve => setTimeout(resolve, 200));

        const profile = await this.userService.loadUserProfile().toPromise();
        const status = (profile?.applicationStatus || response?.karenderia?.status || '').toLowerCase();
        
        console.log('📊 User profile loaded, status:', status, 'role:', response?.user?.role);
        
        // Redirect based on user role
        if (response?.user?.role === 'karenderia_owner' && (status === 'pending' || status === 'rejected')) {
          console.log('⏳ Karenderia owner status is', status, '- redirecting to settings');
          await this.router.navigate(['/karenderia-settings']);
        } else if (response?.user) {
          console.log('✅ Redirecting user with role:', response.user.role);
          this.redirectBasedOnRole(response.user);
        } else {
          console.log('⚠️ No user in response, redirecting to home');
          this.router.navigate(['/home']);
        }
        
      } catch (error: any) {
        // Handle rejection status specifically
        if (error?.status === 403 && error?.error?.status === 'rejected') {
          // Store rejection info for the reapply page
          const rejectionInfo = {
            rejection_reason: error.error.application_details?.rejection_reason || 'Your application was rejected',
            business_name: error.error.application_details?.business_name || '',
            rejected_at: error.error.application_details?.rejected_at || '',
          };
          sessionStorage.setItem('ownerRejectionInfo', JSON.stringify(rejectionInfo));

          // Show alert with reapply option
          this.showRejectionAlert(error.error, this.loginData.emailOrUsername);
          return;
        }

        if (error?.error?.message) {
          this.errorMessage = error.error.message;
        } else if (error?.message) {
          this.errorMessage = error.message;
        } else {
          this.errorMessage = 'Login failed. Please check your credentials and try again.';
        }
        console.error('Login error:', error);
      } finally {
        this.isLoading = false;
      }
    }
  }

  togglePasswordVisibility() {
    this.showPassword = !this.showPassword;
  }

  goToRegister() {
    this.router.navigate(['/register']);
  }

  private async showRejectionAlert(errorResponse: any, email: string) {
    const alert = await this.alertController.create({
      header: '❌ Application Rejected',
      message: `Your Karenderia application has been rejected.\n\nReason: ${errorResponse.application_details?.rejection_reason || 'Not specified'}\n\nYou can reapply with updated or corrected business documents.`,
      buttons: [
        {
          text: 'Back',
          role: 'cancel'
        },
        {
          text: 'Reapply Now',
          handler: () => {
            this.router.navigate(['/owner-reapply'], { 
              queryParams: { email: email } 
            });
          }
        }
      ]
    });
    await alert.present();
  }
}
