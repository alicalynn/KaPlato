import { Injectable } from '@angular/core';

export interface MealPlanItemSnapshot {
  date: string;
  meal_type: 'breakfast' | 'lunch' | 'dinner';
  karenderia: any;
  menu_item: any;
  daily_menu_id: number;
  quantity: number;
  special_price?: number;
  notes?: string;
}

export interface MealPlanMealGroup {
  date: string;
  mealType: 'breakfast' | 'lunch' | 'dinner';
  items: MealPlanItemSnapshot[];
  totalPrice: number;
}

export interface SavedMealPlanSnapshot {
  id: string;
  createdAt: string;
  title: string;
  dateRangeLabel: string;
  items: MealPlanItemSnapshot[];
  meals: MealPlanMealGroup[];
  totalItems: number;
  totalQuantity: number;
  totalPrice: number;
}

@Injectable({
  providedIn: 'root'
})
export class MealPlanStorageService {
  private readonly storageKey = 'kaplato_saved_meal_plans';

  loadMealPlans(): SavedMealPlanSnapshot[] {
    try {
      const storedPlans = localStorage.getItem(this.storageKey);
      const plans = storedPlans ? JSON.parse(storedPlans) : [];

      if (!Array.isArray(plans)) {
        return [];
      }

      return plans
        .map((plan) => this.normalizePlan(plan))
        .filter((plan): plan is SavedMealPlanSnapshot => !!plan)
        .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
    } catch (error) {
      console.error('Error loading saved meal plans:', error);
      return [];
    }
  }

  saveMealPlan(items: MealPlanItemSnapshot[]): SavedMealPlanSnapshot {
    const normalizedItems = items
      .map((item) => this.normalizeItem(item))
      .filter((item): item is MealPlanItemSnapshot => !!item);

    const mealGroups = this.groupMealItems(normalizedItems);
    const dateRangeLabel = this.buildDateRangeLabel(normalizedItems);
    const savedPlan: SavedMealPlanSnapshot = {
      id: `meal_plan_${Date.now()}`,
      createdAt: new Date().toISOString(),
      title: `Meal Plan ${dateRangeLabel}`,
      dateRangeLabel,
      items: normalizedItems,
      meals: mealGroups,
      totalItems: normalizedItems.length,
      totalQuantity: normalizedItems.reduce((total, item) => total + (Number(item.quantity) || 0), 0),
      totalPrice: normalizedItems.reduce((total, item) => {
        const price = Number(item.special_price ?? item.menu_item?.price ?? 0);
        return total + (price * (Number(item.quantity) || 0));
      }, 0)
    };

    const savedPlans = this.loadMealPlans();
    const updatedPlans = [savedPlan, ...savedPlans];
    localStorage.setItem(this.storageKey, JSON.stringify(updatedPlans));

    return savedPlan;
  }

  removeMealPlan(id: string): void {
    const savedPlans = this.loadMealPlans().filter((plan) => plan.id !== id);
    localStorage.setItem(this.storageKey, JSON.stringify(savedPlans));
  }

  clearMealPlans(): void {
    localStorage.removeItem(this.storageKey);
  }

  private normalizePlan(plan: any): SavedMealPlanSnapshot | null {
    if (!plan) {
      return null;
    }

    const items = Array.isArray(plan.items)
      ? plan.items.map((item: any) => this.normalizeItem(item)).filter((item: MealPlanItemSnapshot | null): item is MealPlanItemSnapshot => !!item)
      : [];

    const meals = Array.isArray(plan.meals)
      ? plan.meals.map((meal: any) => ({
          date: meal.date || (items[0]?.date ?? new Date().toISOString().split('T')[0]),
          mealType: meal.mealType || meal.meal_type || 'breakfast',
          items: Array.isArray(meal.items)
            ? meal.items.map((item: any) => this.normalizeItem(item)).filter((item: MealPlanItemSnapshot | null): item is MealPlanItemSnapshot => !!item)
            : [],
          totalPrice: Number(meal.totalPrice || meal.total_price || 0)
        }))
      : this.groupMealItems(items);

    return {
      id: plan.id || `meal_plan_${Date.now()}`,
      createdAt: plan.createdAt || new Date().toISOString(),
      title: plan.title || 'Meal Plan',
      dateRangeLabel: plan.dateRangeLabel || this.buildDateRangeLabel(items),
      items,
      meals,
      totalItems: Number(plan.totalItems || items.length || 0),
      totalQuantity: Number(plan.totalQuantity || items.reduce((total: number, item: MealPlanItemSnapshot) => total + (Number(item.quantity) || 0), 0)),
      totalPrice: Number(plan.totalPrice || items.reduce((total: number, item: MealPlanItemSnapshot) => {
        const price = Number(item.special_price ?? item.menu_item?.price ?? 0);
        return total + (price * (Number(item.quantity) || 0));
      }, 0))
    };
  }

  private normalizeItem(item: any): MealPlanItemSnapshot | null {
    if (!item) {
      return null;
    }

    return {
      date: item.date || new Date().toISOString().split('T')[0],
      meal_type: item.meal_type || item.mealType || 'breakfast',
      karenderia: item.karenderia || {},
      menu_item: item.menu_item || item.menuItem || {},
      daily_menu_id: Number(item.daily_menu_id || item.dailyMenuId || 0),
      quantity: Number(item.quantity || 0),
      special_price: item.special_price !== undefined && item.special_price !== null ? Number(item.special_price) : undefined,
      notes: item.notes
    };
  }

  private groupMealItems(items: MealPlanItemSnapshot[]): MealPlanMealGroup[] {
    const groupedMeals = new Map<string, MealPlanMealGroup>();

    items.forEach((item) => {
      const key = `${item.date}_${item.meal_type}`;

      if (!groupedMeals.has(key)) {
        groupedMeals.set(key, {
          date: item.date,
          mealType: item.meal_type,
          items: [],
          totalPrice: 0
        });
      }

      const group = groupedMeals.get(key)!;
      group.items.push(item);
      const price = Number(item.special_price ?? item.menu_item?.price ?? 0);
      group.totalPrice += price * (Number(item.quantity) || 0);
    });

    return Array.from(groupedMeals.values());
  }

  private buildDateRangeLabel(items: MealPlanItemSnapshot[]): string {
    if (!items.length) {
      return 'Today';
    }

    const dates = [...new Set(items.map((item) => item.date))].sort();
    if (dates.length === 1) {
      return dates[0];
    }

    return `${dates[0]} to ${dates[dates.length - 1]}`;
  }
}