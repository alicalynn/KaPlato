import { Component, OnInit } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { IonicModule, ToastController } from '@ionic/angular';

@Component({
  selector: 'app-admin',
  templateUrl: './admin.page.html',
  styleUrls: ['./admin.page.scss'],
  standalone: true,
  imports: [CommonModule, FormsModule, IonicModule]
})
export class AdminPage implements OnInit {

  salesData: any[] = [];
  menuItems: any[] = [];
  karenderias: any[] = [];
  loading = false;
  totalSales = 0;
  totalProfit = 0;
  selectedTab = 'inventory';

  constructor(private http: HttpClient, private toastController: ToastController) { }

  ngOnInit() {
    this.loadDashboardData();
  }

  async loadDashboardData() {
    this.loading = true;
    try {
      await Promise.all([
        this.loadInventory(),
        this.loadKarenderias(),
        this.loadSalesData()
      ]);
    } catch (error) {
      console.error('Error loading dashboard data:', error);
    } finally {
      this.loading = false;
    }
  }

  async loadInventory() {
    try {
      const token = localStorage.getItem('auth_token');
      if (!token) {
        console.log('No auth token found');
        return;
      }

      const headers = new HttpHeaders({
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      });

      // Load all menu items across all karenderias
      const response = await this.http.get<any>('http://localhost:8000/api/admin/menu-items', { headers }).toPromise();
      
      if (response && response.data) {
        this.menuItems = response.data;
      }
    } catch (error) {
      console.error('Error loading inventory:', error);
    }
  }

  async loadKarenderias() {
    try {
      const token = localStorage.getItem('auth_token');
      if (!token) return;

      const headers = new HttpHeaders({
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      });

      const response = await this.http.get<any>('http://localhost:8000/api/admin/karenderias', { headers }).toPromise();
      
      if (response && response.success && response.data) {
        this.karenderias = response.data;
        console.log('Loaded karenderias:', this.karenderias);
      } else {
        console.log('No karenderias data found in response');
      }
    } catch (error) {
      console.error('Error loading karenderias:', error);
    }
  }

  async loadSalesData() {
    try {
      const token = localStorage.getItem('auth_token');
      if (!token) return;

      const headers = new HttpHeaders({
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      });

      // Try to get sales analytics from the admin controller
      const response = await this.http.get<any>('http://localhost:8000/api/admin/sales-analytics', { headers }).toPromise();
      
      if (response && response.data) {
        this.salesData = response.data.recent_orders || [];
        this.totalSales = response.data.total_sales || 0;
        this.totalProfit = response.data.total_profit || 0;
      }
    } catch (error) {
      console.error('Error loading sales data:', error);
    }
  }

  formatDate(dateString: string): string {
    return new Date(dateString).toLocaleDateString() + ' ' + new Date(dateString).toLocaleTimeString();
  }

  formatCurrency(amount: number): string {
    return '₱' + amount.toFixed(2);
  }

  getAvailabilityStatus(isAvailable: boolean): string {
    return isAvailable ? 'Available' : 'Out of Stock';
  }

  getAvailabilityColor(isAvailable: boolean): string {
    return isAvailable ? 'success' : 'danger';
  }

  getKarenderiaName(karenderiaId: number): string {
    const karenderia = this.karenderias.find(k => k.id === karenderiaId);
    return karenderia ? karenderia.name : 'Unknown Karenderia';
  }

  getStatusColor(status: string): string {
    switch (status) {
      case 'active': return 'success';
      case 'pending': return 'warning';
      case 'inactive': return 'danger';
      default: return 'medium';
    }
  }

  async approveKarenderia(karenderia: any) {
    try {
      this.loading = true;
      const token = localStorage.getItem('auth_token');
      if (!token) {
        console.log('No auth token found');
        return;
      }

      const headers = new HttpHeaders({
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      });

      const body = { status: 'active', notes: 'Approved by admin' };
      
      await this.http.put<any>(`http://localhost:8000/api/admin/karenderias/${karenderia.id}/status`, body, { headers }).toPromise();
      
      // Update the local status
      karenderia.status = 'active';
      console.log(`Karenderia ${karenderia.name} approved successfully`);
      
      // Show success message
      const toast = await this.toastController.create({
        message: `${karenderia.name} has been approved successfully!`,
        duration: 3000,
        color: 'success',
        position: 'top'
      });
      await toast.present();
      
      // Optionally reload the list
      await this.loadKarenderias();
      
    } catch (error) {
      console.error('Error approving karenderia:', error);
    } finally {
      this.loading = false;
    }
  }

  async rejectKarenderia(karenderia: any) {
    try {
      this.loading = true;
      const token = localStorage.getItem('auth_token');
      if (!token) {
        console.log('No auth token found');
        return;
      }

      const headers = new HttpHeaders({
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      });

      const body = { status: 'rejected', notes: 'Rejected by admin' };
      
      await this.http.put<any>(`http://localhost:8000/api/admin/karenderias/${karenderia.id}/status`, body, { headers }).toPromise();
      
      // Update the local status
      karenderia.status = 'rejected';
      console.log(`Karenderia ${karenderia.name} rejected successfully`);
      
      // Show success message
      const toast = await this.toastController.create({
        message: `${karenderia.name} has been rejected.`,
        duration: 3000,
        color: 'warning',
        position: 'top'
      });
      await toast.present();
      
      // Optionally reload the list
      await this.loadKarenderias();
      
    } catch (error) {
      console.error('Error rejecting karenderia:', error);
    } finally {
      this.loading = false;
    }
  }
}
