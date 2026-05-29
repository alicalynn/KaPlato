import { Component, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import { NgForm } from '@angular/forms';
import { AuthService } from '../services/auth.service';

@Component({
  selector: 'app-register',
  templateUrl: './register.page.html',
  styleUrls: ['./register.page.scss'],
  standalone: false,
})
export class RegisterPage implements OnInit {
  registerData = {
    accountType: 'customer' as 'customer' | 'supplier' | 'karenderia_owner',
    username: '',
    email: '',
    password: '',
    confirmPassword: '',
    phoneNumber: '',
    address: '',
    // Karenderia owner fields
    businessName: '',
    description: '',
    city: '',
    province: '',
    businessEmail: '',
    openingTime: '09:00',
    closingTime: '21:00',
    businessPermit: null as File | null,
    latitude: 10.3157,
    longitude: 123.8854
  };

  showPassword = false;
  showConfirmPassword = false;
  isLoading = false;
  errorMessage = '';
  successMessage = '';
  permitFileControl: any = null; // Track file input for form validation
  


  constructor(
    private authService: AuthService,
    private router: Router
  ) {}

  ngOnInit() {
    // Check if user is already logged in
    if (this.authService.isAuthenticated()) {
      this.router.navigate(['/home']);
    }
  }

  async onRegister(form: NgForm) {
    if (this.registerData.accountType === 'karenderia_owner') {
      // Validate karenderia owner specific fields
      if (!this.registerData.businessName || !this.registerData.description || 
          !this.registerData.city || !this.registerData.province || 
          !this.registerData.businessPermit) {
        this.errorMessage = 'Please fill in all required business fields, including the business permit.';
        return;
      }
    }

    if (form.valid && this.registerData.password === this.registerData.confirmPassword) {
      this.isLoading = true;
      this.errorMessage = '';
      this.successMessage = '';
      const submittedAccountType = this.registerData.accountType;

      try {
        if (this.registerData.accountType === 'karenderia_owner') {
          const formData = new FormData();
          formData.append('name', this.registerData.username);
          formData.append('email', this.registerData.email);
          formData.append('password', this.registerData.password);
          formData.append('password_confirmation', this.registerData.confirmPassword);
          formData.append('business_name', this.registerData.businessName);
          formData.append('description', this.registerData.description);
          formData.append('address', this.registerData.address);
          formData.append('city', this.registerData.city);
          formData.append('province', this.registerData.province);
          formData.append('phone', this.registerData.phoneNumber || '');
          formData.append('business_email', this.registerData.businessEmail || '');
          formData.append('opening_time', this.registerData.openingTime);
          formData.append('closing_time', this.registerData.closingTime);
          formData.append('latitude', this.registerData.latitude.toString());
          formData.append('longitude', this.registerData.longitude.toString());
          if (this.registerData.businessPermit) {
            formData.append('business_permit', this.registerData.businessPermit);
          }

          await this.authService.registerKarenderiaOwner(formData).toPromise();
          this.successMessage = 'Karenderia registration submitted! Your application is pending admin approval. Please wait for approval before logging in.';
        } else if (this.registerData.accountType === 'supplier') {
          const supplierData = {
            username: this.registerData.username,
            email: this.registerData.email,
            password: this.registerData.password,
            confirmPassword: this.registerData.confirmPassword,
            phoneNumber: this.registerData.phoneNumber || '',
            address: this.registerData.address || ''
          };

          await this.authService.registerSupplier(supplierData).toPromise();
          this.successMessage = 'Supplier registration submitted. Please wait for admin approval before logging in.';
        } else {
          const customerData = {
            name: this.registerData.username,
            email: this.registerData.email,
            password: this.registerData.password,
            password_confirmation: this.registerData.confirmPassword,
            role: 'customer' as 'customer'
          };

          await this.authService.register(customerData).toPromise();
          this.successMessage = 'Registration successful! Please log in with your credentials.';
        }
        
        // Clear form
        this.registerData = {
          accountType: 'customer',
          username: '',
          email: '',
          password: '',
          confirmPassword: '',
          phoneNumber: '',
          address: '',
          businessName: '',
          description: '',
          city: '',
          province: '',
          businessEmail: '',
          openingTime: '09:00',
          closingTime: '21:00',
          businessPermit: null,
          latitude: 10.3157,
          longitude: 123.8854
        };
        form.resetForm();
        
        // Auto-navigate to login after 2 seconds for karenderia owners and suppliers
        if (submittedAccountType === 'karenderia_owner' || submittedAccountType === 'supplier') {
          setTimeout(() => {
            this.router.navigate(['/login']);
          }, 2000);
        } else if (submittedAccountType === 'customer') {
          // For customers, navigate to home (already logged in) after 1 second
          setTimeout(() => {
            this.router.navigate(['/home']);
          }, 1000);
        }
        
      } catch (error: any) {
        console.error('Registration error:', error);
        // Display server error messages
        if (error.error && error.error.errors) {
          const errors = Object.values(error.error.errors).flat();
          this.errorMessage = errors.join(' ');
        } else if (error.error && error.error.message) {
          this.errorMessage = error.error.message;
        } else {
          this.errorMessage = error.message || 'Registration failed. Please try again.';
        }
      } finally {
        this.isLoading = false;
      }
    } else if (this.registerData.password !== this.registerData.confirmPassword) {
      this.errorMessage = 'Passwords do not match.';
    }
  }

  togglePasswordVisibility() {
    this.showPassword = !this.showPassword;
  }

  toggleConfirmPasswordVisibility() {
    this.showConfirmPassword = !this.showConfirmPassword;
  }

  goToLogin() {
    this.router.navigate(['/login']);
  }



  onBusinessPermitSelected(event: any) {
    const file = event.target.files[0];
    if (file) {
      // Validate file type (PDF, JPG, PNG, etc.)
      const validTypes = ['application/pdf', 'image/jpeg', 'image/png', 'image/jpg'];
      if (!validTypes.includes(file.type)) {
        this.errorMessage = 'Please upload a valid file format (PDF or image).';
        return;
      }

      // Validate file size (max 5MB)
      const maxSize = 5 * 1024 * 1024;
      if (file.size > maxSize) {
        this.errorMessage = 'File size must not exceed 5MB.';
        return;
      }

      this.registerData.businessPermit = file;
      this.errorMessage = '';
      console.log('Business permit selected:', file.name);
    }
  }
}
