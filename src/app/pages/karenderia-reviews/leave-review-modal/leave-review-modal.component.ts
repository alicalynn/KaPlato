import { Component, Input, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule, ReactiveFormsModule, FormBuilder, FormGroup, Validators } from '@angular/forms';
import { IonicModule, ModalController, ToastController, LoadingController } from '@ionic/angular';
import { KarenderiaReviewService } from '../../../services/karenderia-review.service';

@Component({
  selector: 'app-leave-review-modal',
  templateUrl: './leave-review-modal.component.html',
  styleUrls: ['./leave-review-modal.component.scss'],
  standalone: true,
  imports: [IonicModule, CommonModule, FormsModule, ReactiveFormsModule]
})
export class LeaveReviewModalComponent implements OnInit {
  @Input() karenderiaId: number = 0;
  @Input() karenderiaName: string = '';

  form: FormGroup;
  selectedRating = 0;
  selectedFoodQuality = 0;
  selectedDelivery = 0;
  isSaving = false;

  tagSuggestions = [
    'Good food quality', 'Poor service', 'Great variety', 'Hygiene concerns',
    'Quick delivery', 'Slow service', 'Fair pricing', 'Expensive',
    'Friendly staff', 'Rude staff', 'Clean place', 'Dirty place'
  ];

  selectedTags: string[] = [];

  constructor(
    private fb: FormBuilder,
    private modalController: ModalController,
    private reviewService: KarenderiaReviewService,
    private toastController: ToastController,
    private loadingController: LoadingController
  ) {
    this.form = this.fb.group({
      rating: [0, Validators.required],
      comment: ['', [Validators.maxLength(2000)]],
      food_feedback: ['', [Validators.maxLength(1000)]],
      food_quality_rating: [0],
      delivery_experience_rating: [0],
    });
  }

  ngOnInit() {}

  setRating(value: number) {
    this.selectedRating = value;
    this.form.patchValue({ rating: value });
  }

  setFoodQuality(value: number) {
    this.selectedFoodQuality = value;
    this.form.patchValue({ food_quality_rating: value });
  }

  setDelivery(value: number) {
    this.selectedDelivery = value;
    this.form.patchValue({ delivery_experience_rating: value });
  }

  toggleTag(tag: string) {
    const index = this.selectedTags.indexOf(tag);
    if (index >= 0) {
      this.selectedTags.splice(index, 1);
    } else if (this.selectedTags.length < 5) {
      this.selectedTags.push(tag);
    } else {
      this.showToast('Maximum 5 tags allowed', 'warning');
    }
  }

  isTagSelected(tag: string): boolean {
    return this.selectedTags.includes(tag);
  }

  getStarArray(count: number): number[] {
    return Array(count).fill(0).map((_, i) => i + 1);
  }

  async submitReview() {
    if (this.selectedRating === 0) {
      this.showToast('Please select a rating', 'warning');
      return;
    }

    this.isSaving = true;
    const loading = await this.loadingController.create({
      message: 'Submitting review...'
    });
    await loading.present();

    try {
      const formData = this.form.getRawValue();
      const reviewData = {
        ...formData,
        tags: this.selectedTags.length > 0 ? this.selectedTags : null,
        food_quality_rating: this.selectedFoodQuality || null,
        delivery_experience_rating: this.selectedDelivery || null,
      };

      await this.reviewService.createReview(this.karenderiaId, reviewData).toPromise();

      await loading.dismiss();
      this.showToast('Review submitted successfully!', 'success');
      
      await this.modalController.dismiss({
        submitted: true
      });
    } catch (error: any) {
      await loading.dismiss();
      console.error('Error submitting review:', error);
      const errorMessage = error?.error?.error || 'Failed to submit review';
      this.showToast(errorMessage, 'danger');
    } finally {
      this.isSaving = false;
    }
  }

  closeModal() {
    this.modalController.dismiss({
      submitted: false
    });
  }

  private showToast(message: string, color: string = 'primary') {
    this.toastController.create({
      message,
      duration: 2000,
      color
    }).then(toast => toast.present());
  }
}
