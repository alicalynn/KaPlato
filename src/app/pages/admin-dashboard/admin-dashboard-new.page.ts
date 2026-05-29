import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { 
  IonContent, IonHeader, IonTitle, IonToolbar, IonButtons, IonButton,
  IonIcon, IonCard, IonCardContent, IonChip, IonSegment, IonSegmentButton,
  IonLabel, IonBadge, AlertController, ToastController, ModalController
} from '@ionic/angular/standalone';
import { addIcons } from 'ionicons';
import { 
  logOutOutline, shieldCheckmark, analyticsOutline, documentTextOutline,
  restaurantOutline, cashOutline, bagHandleOutline, flashOutline,
  documentText, map, restaurant, barChart, timeOutline, chevronForward,
  checkmarkCircleOutline, locationOutline, eye, checkmark, pulseOutline,
  serverOutline, cloudOutline, storefrontOutline, peopleOutline,
  businessOutline, refreshOutline, callOutline, calendarOutline,
  mailOutline, banOutline, swapHorizontalOutline,
  checkmarkOutline, mapOutline, people, business, warningOutline,
  alertCircleOutline, pricetagOutline
} from 'ionicons/icons';

import { AuthService, User } from '../../services/auth.service';
import { AdminService } from '../../services/admin.service';
import { ReportInvestigationModalPage } from './report-investigation-modal/report-investigation-modal.page';

@Component({
  selector: 'app-admin-dashboard',
  templateUrl: './admin-dashboard.page.html',
  styleUrls: ['./admin-dashboard.page.scss'],
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    IonContent, IonHeader, IonTitle, IonToolbar, IonButtons, IonButton,
    IonIcon, IonCard, IonCardContent, IonChip, IonSegment, IonSegmentButton,
    IonLabel, IonBadge,
    ReportInvestigationModalPage
  ]
})
export class AdminDashboardPage implements OnInit, OnDestroy {
  currentUser: User | null = null;
  currentDate = new Date();
  currentTime = '';
  
  selectedTab = 'overview';
  dashboardStats: any = {};
  recentApplications: any[] = [];
  customers: any[] = [];
  karenderiaOwners: any[] = [];
  reports: any[] = [];
  
  private timeInterval: any;

  constructor(
    private authService: AuthService,
    private adminService: AdminService,
    private router: Router,
    private alertCtrl: AlertController,
    private toastCtrl: ToastController,
    private modalController: ModalController
  ) {
    addIcons({
      logOutOutline,
      shieldCheckmark,
      analyticsOutline,
      documentTextOutline,
      restaurantOutline,
      cashOutline,
      bagHandleOutline,
      flashOutline,
      documentText,
      map,
      restaurant,
      barChart,
      timeOutline,
      chevronForward,
      checkmarkCircleOutline,
      locationOutline,
      eye,
      checkmark,
      pulseOutline,
      serverOutline,
      cloudOutline,
      storefrontOutline,
      peopleOutline,
      businessOutline,
      refreshOutline,
      callOutline,
      calendarOutline,
      mailOutline,
      banOutline,
      swapHorizontalOutline,
      checkmarkOutline,
      mapOutline,
      people,
      business,
      warningOutline,
      alertCircleOutline,
      pricetagOutline
    });
  }

  ngOnInit() {
    this.currentUser = this.authService.getCurrentUser();
    this.updateTime();
    this.timeInterval = setInterval(() => this.updateTime(), 1000);
    
    this.loadDashboardData();
    this.loadRecentApplications();
  }

  ngOnDestroy() {
    if (this.timeInterval) {
      clearInterval(this.timeInterval);
    }
  }

  private updateTime() {
    const now = new Date();
    this.currentTime = now.toLocaleTimeString();
  }

  onTabChange(event: any) {
    this.selectedTab = event.detail.value;
    
    // Load data based on selected tab
    switch (this.selectedTab) {
      case 'customers':
        this.loadCustomers();
        break;
      case 'owners':
        this.loadKarenderiaOwners();
        break;
      case 'karenderias':
        this.loadRecentApplications();
        break;
      case 'reports':
        this.loadReports();
        break;
    }
  }

  loadDashboardData() {
    this.adminService.getDashboardStats().subscribe({
      next: (response) => {
        this.dashboardStats = response.data;
      },
      error: (error) => {
        console.error('Error loading dashboard stats:', error);
        this.showToast('Error loading dashboard data', 'danger');
      }
    });
  }

  loadRecentApplications() {
    this.adminService.getAllKarenderias().subscribe({
      next: (karenderias) => {
        this.recentApplications = karenderias || [];
      },
      error: (error) => {
        console.error('Error loading applications:', error);
        this.showToast('Error loading applications', 'danger');
      }
    });
  }

  loadCustomers() {
    this.adminService.getCustomers().subscribe({
      next: (response) => {
        this.customers = response.data || [];
      },
      error: (error) => {
        console.error('Error loading customers:', error);
        this.showToast('Error loading customers', 'danger');
      }
    });
  }

  loadKarenderiaOwners() {
    this.adminService.getKarenderiaOwners().subscribe({
      next: (response) => {
        this.karenderiaOwners = response.data || [];
      },
      error: (error) => {
        console.error('Error loading karenderia owners:', error);
        this.showToast('Error loading owners', 'danger');
      }
    });
  }

  loadReports() {
    this.adminService.getReports().subscribe({
      next: (response) => {
        this.reports = response.data?.data || response.data || [];
      },
      error: (error) => {
        console.error('Error loading reports:', error);
        this.showToast('Error loading reports', 'danger');
      }
    });
  }

  async investigateReport(report: any) {
    const modal = await this.modalController.create({
      component: ReportInvestigationModalPage,
      componentProps: {
        report: report
      },
      cssClass: 'investigation-modal',
      backdropDismiss: false
    });

    await modal.present();
    const { data } = await modal.onDidDismiss();

    if (data?.success) {
      this.loadReports();
      this.loadDashboardData();
    }
  }

  async quickApprove(karenderiaId: number, currentStatus: string = 'pending') {
    const alert = await this.alertCtrl.create({
      header: 'Approve Application',
      message: currentStatus === 'rejected'
        ? 'Approve this previously rejected karenderia application?'
        : 'Are you sure you want to approve this karenderia application?',
      buttons: [
        {
          text: 'Cancel',
          role: 'cancel'
        },
        {
          text: 'Approve',
          handler: () => {
            this.adminService.updateKarenderiaStatus(karenderiaId, 'approved').subscribe({
              next: () => {
                this.showToast('Application approved successfully', 'success');
                this.loadRecentApplications();
                this.loadDashboardData();
              },
              error: (error) => {
                console.error('Error approving application:', error);
                this.showToast('Error approving application', 'danger');
              }
            });
          }
        }
      ]
    });
    await alert.present();
  }

  async reopenKarenderiaApplication(karenderiaId: number) {
    const alert = await this.alertCtrl.create({
      header: 'Reopen Application',
      message: 'Move this rejected application back to pending review?',
      buttons: [
        {
          text: 'Cancel',
          role: 'cancel'
        },
        {
          text: 'Reopen',
          handler: () => {
            this.adminService.updateKarenderiaStatus(karenderiaId, 'pending').subscribe({
              next: () => {
                this.showToast('Application reopened for review', 'success');
                this.loadRecentApplications();
                this.loadDashboardData();
              },
              error: (error) => {
                console.error('Error reopening application:', error);
                this.showToast('Error reopening application', 'danger');
              }
            });
          }
        }
      ]
    });

    await alert.present();
  }

  async toggleUserStatus(userId: number, userType: string) {
    const alert = await this.alertCtrl.create({
      header: 'Toggle User Status',
      message: 'Are you sure you want to change this user\'s status?',
      buttons: [
        {
          text: 'Cancel',
          role: 'cancel'
        },
        {
          text: 'Confirm',
          handler: () => {
            this.adminService.toggleUserStatus(userId).subscribe({
              next: (response) => {
                this.showToast(response.message, 'success');
                if (userType === 'customer') {
                  this.loadCustomers();
                } else {
                  this.loadKarenderiaOwners();
                }
              },
              error: (error) => {
                console.error('Error toggling user status:', error);
                this.showToast('Error updating user status', 'danger');
              }
            });
          }
        }
      ]
    });
    await alert.present();
  }


  isUserDisabled(user: any): boolean {
    return !!user?.disabled_at || user?.status === 'disabled';
  }

  async approveUserAccount(userId: number, userType: string) {
    const alert = await this.alertCtrl.create({
      header: 'Approve User',
      message: 'Approve this account and clear any previous rejection state?',
      buttons: [
        {
          text: 'Cancel',
          role: 'cancel'
        },
        {
          text: 'Approve',
          handler: () => {
            this.adminService.approveUserAccount(userId).subscribe({
              next: (response) => {
                this.showToast(response.message, 'success');
                if (userType === 'customer') {
                  this.loadCustomers();
                } else {
                  this.loadKarenderiaOwners();
                }
              },
              error: (error) => {
                console.error('Error approving user account:', error);
                this.showToast('Error approving user account', 'danger');
              }
            });
          }
        }
      ]
    });

    await alert.present();
  }

  approveKarenderia(karenderia: any) {
    this.quickApprove(karenderia.id);
  }

  getOwnerStatusColor(owner: any): string {
    if (!owner.karenderia) return 'medium';
    
    switch (owner.karenderia.status) {
      case 'approved':
        return 'success';
      case 'pending':
        return 'warning';
      case 'rejected':
        return 'danger';
      default:
        return 'medium';
    }
  }

  getOwnerStatusText(owner: any): string {
    if (!owner.karenderia) return 'No Application';
    
    return owner.karenderia.status.charAt(0).toUpperCase() + owner.karenderia.status.slice(1);
  }

  async showToast(message: string, color: string = 'primary') {
    const toast = await this.toastCtrl.create({
      message,
      duration: 3000,
      color,
      position: 'top'
    });
    await toast.present();
  }

  logout() {
    this.authService.logoutAndRedirect();
  }
}
