import { Component, OnInit, Input } from '@angular/core';
import { CommonModule, DatePipe } from '@angular/common';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';
import { IonicModule, AlertController, ModalController, ToastController, LoadingController } from '@ionic/angular';
import { KarenderiaReviewService, RatingStats, KarenderiaReview } from '../../services/karenderia-review.service';
import { LeaveReviewModalComponent } from './leave-review-modal/leave-review-modal.component';
import { ReportIssueModalComponent } from './report-issue-modal/report-issue-modal.component';

@Component({
  selector: 'app-karenderia-reviews',
  templateUrl: './karenderia-reviews.component.html',
  styleUrls: ['./karenderia-reviews.component.scss'],
  standalone: true,
  imports: [IonicModule, CommonModule, FormsModule, ReactiveFormsModule, DatePipe, LeaveReviewModalComponent]
})
export class KarenderiaReviewsComponent implements OnInit {
  @Input() karenderiaId: number = 0;
  @Input() karenderiaName: string = '';

  reviews: KarenderiaReview[] = [];
  stats: RatingStats | null = null;
  isLoading = true;
  currentPage = 1;
  totalPages = 1;
  isAuthenticated = false;
  userRole: string | null = null;
  Math = Math; // Expose Math to template

  constructor(
    private reviewService: KarenderiaReviewService,
    private modalController: ModalController,
    private alertController: AlertController,
    private toastController: ToastController,
    private loadingController: LoadingController
  ) {}

  ngOnInit() {
    this.checkAuthentication();
    this.loadReviews();
  }

  private checkAuthentication() {
    const token = localStorage.getItem('auth_token');
    this.isAuthenticated = !!token;
    const userRole = localStorage.getItem('user_role');
    this.userRole = userRole;
  }

  loadReviews(page = 1) {
    this.isLoading = true;
    this.reviewService.getReviews(this.karenderiaId).subscribe({
      next: (response: any) => {
        if (response.data) {
          this.stats = response.data.stats;
          this.reviews = response.data.reviews.data || [];
          this.currentPage = page;
          this.totalPages = response.data.reviews.last_page || 1;
        }
        this.isLoading = false;
      },
      error: (error: any) => {
        console.error('Error loading reviews:', error);
        this.showToast('Failed to load reviews', 'danger');
        this.isLoading = false;
      }
    });
  }

  getAverageRating(): string {
    return this.stats?.average.toFixed(1) || '0.0';
  }

  getStarArray(count: number): number[] {
    return Array(count).fill(0).map((_, i) => i + 1);
  }

  getStarPercentage(rating: number): string {
    if (!this.stats || this.stats.total_reviews === 0) return '0%';
    const count = this.stats.distribution[rating] || 0;
    const percentage = (count / this.stats.total_reviews) * 100;
    return percentage.toFixed(0) + '%';
  }

  getStarCount(rating: number): number {
    return this.stats?.distribution[rating] || 0;
  }

  getStatusBadgeColor(status: string): string {
    switch (status) {
      case 'open': return 'success';
      case 'closed_temporary': return 'warning';
      case 'closed_permanent': return 'danger';
      default: return 'medium';
    }
  }

  getStatusLabel(status: string): string {
    switch (status) {
      case 'open': return 'Open';
      case 'closed_temporary': return 'Temporarily Closed';
      case 'closed_permanent': return 'Permanently Closed';
      default: return 'Unknown';
    }
  }

  async openLeaveReviewModal() {
    if (!this.isAuthenticated) {
      this.showToast('Please log in to leave a review', 'warning');
      return;
    }

    const modal = await this.modalController.create({
      component: LeaveReviewModalComponent,
      componentProps: {
        karenderiaId: this.karenderiaId,
        karenderiaName: this.karenderiaName
      },
      cssClass: 'review-modal',
      breakpoints: [0, 1],
      initialBreakpoint: 1,
      handle: false
    });

    await modal.present();

    const { data } = await modal.onDidDismiss();
    if (data && data.submitted) {
      this.showToast('Thank you! Your review is pending approval.', 'success');
      this.loadReviews();
    }
  }

  async openReportIssueModal() {
    if (!this.isAuthenticated) {
      this.showToast('Please log in to report an issue', 'warning');
      return;
    }

    const modal = await this.modalController.create({
      component: ReportIssueModalComponent,
      componentProps: {
        karenderiaId: this.karenderiaId,
        karenderiaName: this.karenderiaName
      },
      cssClass: 'report-modal',
      breakpoints: [0, 1],
      initialBreakpoint: 1,
      handle: false
    });

    await modal.present();

    const { data } = await modal.onDidDismiss();
    if (data && data.submitted) {
      this.showToast('Thank you for reporting. Our team will review it.', 'success');
    }
  }

  private showToast(message: string, color: string = 'primary') {
    this.toastController.create({
      message,
      duration: 2000,
      color
    }).then(toast => toast.present());
  }

  nextPage() {
    if (this.currentPage < this.totalPages) {
      this.loadReviews(this.currentPage + 1);
    }
  }

  previousPage() {
    if (this.currentPage > 1) {
      this.loadReviews(this.currentPage - 1);
    }
  }
}
