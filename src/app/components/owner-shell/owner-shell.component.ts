import { CommonModule } from '@angular/common';
import { Component, Input, OnInit, OnDestroy } from '@angular/core';
import { Router, RouterModule } from '@angular/router';
import { AlertController, IonicModule, ToastController } from '@ionic/angular';
import { AuthService } from '../../services/auth.service';
import { KarenderiaInfoService } from '../../services/karenderia-info.service';
import { UserService, UserProfile } from '../../services/user.service';
import { MessageService } from '../../services/message.service';
import { Subscription } from 'rxjs';

export type OwnerNavKey =
  | 'dashboard'
  | 'menu'
  | 'daily-menu'
  | 'pos'
  | 'inventory'
  | 'analytics'
  | 'messages'
  | 'profile';

@Component({
  selector: 'app-owner-shell',
  templateUrl: './owner-shell.component.html',
  styleUrls: ['./owner-shell.component.scss'],
  standalone: true,
  imports: [CommonModule, RouterModule, IonicModule],
})
export class OwnerShellComponent implements OnDestroy {
  @Input() activePage: OwnerNavKey = 'dashboard';
  @Input() sectionLabel = 'Owner Panel';
  ownerStatus: 'approved' | 'pending' | 'rejected' | 'unknown' = 'unknown';
  unreadMessageCount = 0;
  private unreadSubscription?: Subscription;

  constructor(
    private router: Router,
    private authService: AuthService,
    private alertController: AlertController,
    private toastController: ToastController,
    private karenderiaInfoService: KarenderiaInfoService,
    private userService: UserService,
    private messageService: MessageService
  ) {}

  async ngOnInit(): Promise<void> {
    await this.refreshOwnerStatus();
    this.subscribeToUnreadMessages();
  }

  ngOnDestroy(): void {
    if (this.unreadSubscription) {
      this.unreadSubscription.unsubscribe();
    }
  }

  private subscribeToUnreadMessages(): void {
    this.unreadSubscription = this.messageService.unreadCount$.subscribe(count => {
      this.unreadMessageCount = count;
    });
    
    // Initial load
    this.messageService.refreshUnreadCount().subscribe();
  }

  isActive(page: OwnerNavKey): boolean {
    return this.activePage === page;
  }

  getKarenderiaDisplayName(): string {
    return this.karenderiaInfoService.getKarenderiaDisplayName();
  }

  getKarenderiaBrandInitials(): string {
    return this.karenderiaInfoService.getKarenderiaBrandInitials();
  }

  async goTo(page: OwnerNavKey, event?: Event): Promise<void> {
    event?.preventDefault();

    if (page === 'profile') {
      await this.router.navigate(['/karenderia-settings']);
      return;
    }

    if (await this.canAccessOwnerPage()) {
      const routeMap: Record<Exclude<OwnerNavKey, 'profile'>, string> = {
        dashboard: '/karenderia-dashboard',
        menu: '/karenderia-menu',
        'daily-menu': '/daily-menu-management',
        pos: '/karenderia-orders-pos',
        inventory: '/inventory-management',
        analytics: '/karenderia-analytics',
        messages: '/owner-messages',
      };

      await this.router.navigate([routeMap[page as Exclude<OwnerNavKey, 'profile'>]]);
      return;
    }

    await this.showAccessBlockedModal();
  }

  private async refreshOwnerStatus(): Promise<void> {
    try {
      const profile = await this.userService.loadUserProfile().toPromise();
      this.ownerStatus = this.resolveOwnerStatus(profile);
    } catch {
      const currentUser = this.authService.getCurrentUser();

      if (currentUser?.role === 'karenderia_owner') {
        const applicationStatus = (currentUser.applicationStatus || '').toLowerCase();

        if (applicationStatus === 'pending' || applicationStatus === 'rejected') {
          this.ownerStatus = applicationStatus;
          return;
        }

        this.ownerStatus = 'approved';
        return;
      }

      this.ownerStatus = 'unknown';
    }
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

  private async canAccessOwnerPage(): Promise<boolean> {
    if (this.ownerStatus === 'unknown') {
      await this.refreshOwnerStatus();
    }

    return this.ownerStatus === 'approved';
  }

  private async showAccessBlockedModal(): Promise<void> {
    const karenderia = this.karenderiaInfoService.getCurrentKarenderia();
    const rejectionReason = karenderia?.rejection_reason?.trim();
    const rejectedAt = this.formatDate(karenderia?.rejected_at);

    const header = this.ownerStatus === 'rejected'
      ? 'Access Restricted'
      : this.ownerStatus === 'pending'
        ? 'Application Pending'
        : 'No Access';

    const message = this.ownerStatus === 'rejected'
      ? `${karenderia?.business_name || karenderia?.name || 'Your karenderia'} was rejected${rejectedAt ? ` on ${rejectedAt}` : ''}${rejectionReason ? ` because ${rejectionReason}` : ''}. These tabs are locked until you resubmit from Profile.`
      : this.ownerStatus === 'pending'
        ? `${karenderia?.business_name || karenderia?.name || 'Your karenderia'} is still pending review. You can update details in Profile, but the other tabs are locked until approval.`
        : 'We could not verify access for this account right now. Please go to Profile or contact support.';

    const alert = await this.alertController.create({
      header,
      message,
      buttons: [
        {
          text: 'Go to Profile',
          handler: () => this.router.navigate(['/karenderia-settings'])
        },
        {
          text: 'OK',
          role: 'cancel'
        }
      ]
    });

    await alert.present();
  }

  private formatDate(value: Date | string | null | undefined): string | null {
    if (!value) {
      return null;
    }

    const date = value instanceof Date ? value : new Date(value);
    if (Number.isNaN(date.getTime())) {
      return null;
    }

    return new Intl.DateTimeFormat('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric'
    }).format(date);
  }

  async logout(): Promise<void> {
    try {
      await this.authService.logoutAndRedirect();
    } catch (error) {
      console.warn('Logout API call failed, clearing local session anyway.', error);
    } finally {
      const toast = await this.toastController.create({
        message: 'Logged out successfully.',
        duration: 1800,
        color: 'medium',
      });
      await toast.present();
    }
  }
}
