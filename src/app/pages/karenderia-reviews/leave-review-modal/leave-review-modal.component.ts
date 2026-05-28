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
    });
  }

  ngOnInit() {}

  setRating(value: number) {
    this.selectedRating = value;
    this.form.patchValue({ rating: value });
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
    // Validate all required fields
    const errors: string[] = [];

    if (this.selectedRating === 0) {
      errors.push('Please select a main rating (1-5 stars)');
    }

    if (!this.form.value.comment || this.form.value.comment.trim() === '') {
      errors.push('Please write a comment or feedback');
    }

    if (errors.length > 0) {
      this.showToast(errors.join(' • '), 'warning');
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
        rating: formData.rating,
        comment: formData.comment,
        food_feedback: formData.food_feedback,
        tags: this.selectedTags.length > 0 ? this.selectedTags : null,
      };

      const response: any = await this.reviewService.createReview(this.karenderiaId, reviewData).toPromise();
      
      console.log('Review submitted successfully:', response);

      await loading.dismiss();
      this.showToast('Review submitted successfully! Thank you for your feedback.', 'success');
      
      // Close modal after brief delay to ensure user sees success message
      setTimeout(() => {
        this.modalController.dismiss({
          submitted: true
        });
      }, 500);

    } catch (error: any) {
      await loading.dismiss();
      console.error('Error submitting review:', error);
      
      // Handle validation errors from server
      let errorMessage = 'Failed to submit review';
      
      // Check if this is a validation error (422)
      if (error?.status === 422) {
        if (error?.error?.errors) {
          // Laravel validation errors
          const fieldErrors = error.error.errors;
          const errorMessages = Object.values(fieldErrors).flat() as string[];
          errorMessage = errorMessages.join('\n');
        } else if (error?.error?.error) {
          errorMessage = error.error.error;
        }
      } else if (error?.error?.error) {
        errorMessage = error.error.error;
      } else if (error?.error?.message) {
        errorMessage = error.error.message;
      } else if (error?.message) {
        errorMessage = error.message;
      }

      this.showToast(errorMessage, 'danger');
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
