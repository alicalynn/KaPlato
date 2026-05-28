import { Component, EventEmitter, Input, Output, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { IonicModule } from '@ionic/angular';
import { MealFilterOptions, MealFilterService } from '../../services/meal-filter.service';
import { UserService } from '../../services/user.service';

@Component({
  selector: 'app-meal-filter',
  templateUrl: './meal-filter.component.html',
  styleUrls: ['./meal-filter.component.scss'],
  standalone: true,
  imports: [CommonModule, FormsModule, IonicModule]
})
export class MealFilterComponent implements OnInit {
  @Input() currentFilters: MealFilterOptions = {};
  @Input() showDistanceFilter = false;
  @Output() filtersChanged = new EventEmitter<MealFilterOptions>();
  @Output() presetsApplied = new EventEmitter<string>();

  filters: MealFilterOptions = {};
  userAllergens: string[] = [];

  constructor(
    private mealFilterService: MealFilterService,
    private userService: UserService
  ) {}

  async ngOnInit() {
    this.filters = { ...this.currentFilters };
    await this.loadUserAllergens();
  }

  private async loadUserAllergens() {
    try {
      const userProfile = await this.userService.getCurrentUserProfile();
      this.userAllergens = userProfile?.allergens || [];
    } catch (error) {
      console.error('Error loading user allergens:', error);
      this.userAllergens = [];
    }
  }

  onFilterChange() {
    this.filtersChanged.emit(this.filters);
  }

  applyPreset(presetName: string) {
    const presets = this.mealFilterService.getFilterPresets();
    if (presets[presetName]) {
      this.filters = { ...presets[presetName] };
      this.presetsApplied.emit(presetName);
      this.onFilterChange();
    }
  }

  resetFilters() {
    this.filters = this.mealFilterService.getDefaultFilters();
    this.onFilterChange();
  }

  toggleAllergenSafe() {
    this.filters.allergenSafe = !this.filters.allergenSafe;
    this.onFilterChange();
  }
}
