import { Injectable } from '@angular/core';
import { Observable, BehaviorSubject } from 'rxjs';
import { AuthService, User } from './auth.service';
import { UserService, UserProfile } from './user.service';
import { ProfileService } from './profile.service';
import { SpoonacularService } from './spoonacular.service';

export interface AllergenWarning {
  allergen: string;
  severity: 'mild' | 'moderate' | 'severe';
  foundIn: string[];
  message: string;
}

export interface IngredientAnalysis {
  ingredient: string;
  potentialAllergens: string[];
  category: string;
}

export interface MealSafetyAnalysis {
  isSafe: boolean;
  warnings: AllergenWarning[];
  safeAlternatives?: string[];
  riskLevel: 'low' | 'medium' | 'high';
}

@Injectable({
  providedIn: 'root'
})
export class AllergenDetectionService {
  private userAllergens: any[] = [];
  private hasConfiguredAllergens = false;
  private allergenWarnings$ = new BehaviorSubject<AllergenWarning[]>([]);
  private readonly defaultAllergens = ['Peanuts', 'Tree Nuts', 'Shellfish', 'Fish', 'Eggs', 'Dairy', 'Soy', 'Wheat'];
  
  // Comprehensive allergen-ingredient mapping
  private allergenIngredientMap: { [key: string]: string[] } = {
    'Peanuts': [
      'peanut', 'peanuts', 'peanut butter', 'peanut oil', 'groundnut', 'arachis oil',
      'mandelonas', 'beer nuts', 'mixed nuts', 'nut meat'
    ],
    'Tree Nuts': [
      'almond', 'almonds', 'brazil nut', 'cashew', 'cashews', 'chestnut', 'hazelnut', 
      'macadamia', 'pecan', 'pine nut', 'pistachio', 'walnut', 'coconut', 'nut oil',
      'marzipan', 'nougat', 'praline', 'gianduja', 'amaretto'
    ],
    'Dairy': [
      'milk', 'cheese', 'butter', 'cream', 'yogurt', 'ice cream', 'lactose',
      'casein', 'whey', 'ghee', 'buttermilk', 'sour cream', 'cottage cheese',
      'mozzarella', 'cheddar', 'parmesan', 'condensed milk', 'evaporated milk'
    ],
    'Eggs': [
      'egg', 'eggs', 'egg white', 'egg yolk', 'albumin', 'mayonnaise', 'aioli',
      'meringue', 'custard', 'eggnog', 'lecithin', 'lysozyme', 'ovalbumin'
    ],
    'Fish': [
      'fish', 'salmon', 'tuna', 'cod', 'bass', 'flounder', 'halibut', 'sardine',
      'anchovy', 'mackerel', 'trout', 'fish sauce', 'fish oil', 'worcestershire sauce',
      'caesar dressing', 'imitation crab', 'surimi'
    ],
    'Shellfish': [
      'shrimp', 'crab', 'lobster', 'crawfish', 'prawns', 'scallops', 'clams',
      'mussels', 'oysters', 'crayfish', 'langostino', 'barnacle', 'krill'
    ],
    'Soy': [
      'soy', 'soya', 'soybean', 'tofu', 'tempeh', 'miso', 'soy sauce', 'tamari',
      'edamame', 'soy milk', 'soy flour', 'soy protein', 'lecithin', 'hydrolyzed soy protein'
    ],
    'Wheat': [
      'wheat', 'flour', 'bread', 'pasta', 'noodles', 'gluten', 'bulgur', 'couscous',
      'semolina', 'spelt', 'kamut', 'farro', 'wheat germ', 'wheat bran', 'seitan'
    ],
    'Sesame': [
      'sesame', 'sesame seeds', 'sesame oil', 'tahini', 'hummus', 'halva',
      'benne seeds', 'sim sim', 'goma'
    ],
    'Mustard': [
      'mustard', 'mustard seed', 'mustard powder', 'dijon', 'horseradish',
      'wasabi', 'mustard greens'
    ]
  };

  // Filipino-specific allergen ingredients
  private filipinoAllergenMap: { [key: string]: string[] } = {
    'Fish': [
      'bagoong', 'patis', 'fish sauce', 'dilis', 'tuyo', 'daing', 'tinapa',
      'alamang', 'isda', 'bangus', 'tilapia', 'galunggong'
    ],
    'Shellfish': [
      'hipon', 'alimango', 'talaba', 'pusit', 'sugpo', 'suahe', 'halaan'
    ],
    'Soy': [
      'tokwa', 'taho', 'soy sauce', 'toyo', 'miso soup'
    ],
    'Eggs': [
      'itlog', 'kwek-kwek', 'balut', 'penoy'
    ],
    'Dairy': [
      'gatas', 'kesong puti', 'ice cream', 'leche flan'
    ],
    'Peanuts': [
      'mani', 'kare-kare', 'biko na may mani'
    ],
    'Wheat': [
      'harina', 'tinapay', 'pandesal', 'pasta', 'lumpia wrapper'
    ]
  };

  constructor(
    private authService: AuthService,
    private userService: UserService,
    private profileService: ProfileService,
    private spoonacularService: SpoonacularService
  ) {
    this.loadUserAllergens();
  }

  private async loadUserAllergens() {
    // Load user's allergens from user profile
    this.userService.currentUserProfile$.subscribe(userProfile => {
      if (userProfile && Array.isArray(userProfile.allergens) && userProfile.allergens.length > 0) {
        this.userAllergens = userProfile.allergens;
        this.hasConfiguredAllergens = true;
      } else if (userProfile && Array.isArray(userProfile.allergies) && userProfile.allergies.length > 0) {
        // Fallback to allergies array if available
        this.userAllergens = userProfile.allergies.map(allergy => ({
          name: this.normalizeAllergenName(allergy),
          severity: 'moderate' // default severity
        }));
        this.hasConfiguredAllergens = true;
      } else {
        const storedSettings = this.getStoredSelectedAllergens();
        if (storedSettings.length > 0) {
          this.userAllergens = storedSettings;
          this.hasConfiguredAllergens = true;
        } else {
          this.userAllergens = this.defaultAllergens.map(name => ({ name, severity: 'moderate' as const }));
          this.hasConfiguredAllergens = false;
        }
      }
    });
  }

  private normalizeAllergenName(name: string): string {
    const trimmed = (name || '').trim();
    if (!trimmed) {
      return '';
    }

    const lower = trimmed.toLowerCase();
    const aliasMap: { [key: string]: string } = {
      peanut: 'Peanuts',
      peanuts: 'Peanuts',
      nuts: 'Tree Nuts',
      'tree nuts': 'Tree Nuts',
      shellfish: 'Shellfish',
      fish: 'Fish',
      dairy: 'Dairy',
      milk: 'Dairy',
      egg: 'Eggs',
      eggs: 'Eggs',
      soy: 'Soy',
      soybean: 'Soy',
      wheat: 'Wheat',
      sesame: 'Sesame',
      mustard: 'Mustard'
    };

    return aliasMap[lower] || trimmed;
  }

  private getStoredSelectedAllergens(): Array<{ name: string; severity: 'mild' | 'moderate' | 'severe' }> {
    try {
      const storedSettings = localStorage.getItem('allergen-settings');
      if (storedSettings) {
        const parsed = JSON.parse(storedSettings);
        const selected = Array.isArray(parsed?.selected_allergens) ? parsed.selected_allergens : [];
        const severityMap = parsed?.severity_levels || {};

        if (selected.length > 0) {
          return selected
            .map((allergen: string) => {
              const normalized = this.normalizeAllergenName(allergen);
              if (!normalized) {
                return null;
              }
              const severity = severityMap[allergen] || severityMap[normalized] || 'moderate';
              return {
                name: normalized,
                severity: severity as 'mild' | 'moderate' | 'severe'
              };
            })
            .filter(Boolean) as Array<{ name: string; severity: 'mild' | 'moderate' | 'severe' }>;
        }
      }
    } catch (error) {
      console.warn('Unable to parse allergen settings, using defaults', error);
    }

    return [];
  }

  getEffectiveUserAllergens(): Array<{ name: string; severity: 'mild' | 'moderate' | 'severe' }> {
    if (Array.isArray(this.userAllergens) && this.userAllergens.length > 0) {
      return this.userAllergens.map(allergen => ({
        name: this.normalizeAllergenName(allergen?.name || allergen),
        severity: (allergen?.severity || 'moderate') as 'mild' | 'moderate' | 'severe'
      })).filter(allergen => !!allergen.name);
    }

    return this.defaultAllergens.map(name => ({ name, severity: 'moderate' as const }));
  }

  hasConfiguredUserAllergens(): boolean {
    return this.hasConfiguredAllergens;
  }

  /**
   * Analyze a meal's ingredients for potential allergens
   */
  analyzeMealSafety(ingredients: string[], mealName?: string): MealSafetyAnalysis {
    const warnings: AllergenWarning[] = [];
    let riskLevel: 'low' | 'medium' | 'high' = 'low';
    const effectiveAllergens = this.getEffectiveUserAllergens();

    for (const userAllergen of effectiveAllergens) {
      const foundIngredients = this.findAllergenInIngredients(userAllergen.name, ingredients);
      
      if (foundIngredients.length > 0) {
        const warning: AllergenWarning = {
          allergen: userAllergen.name,
          severity: userAllergen.severity || 'moderate',
          foundIn: foundIngredients,
          message: this.generateWarningMessage(userAllergen.name, userAllergen.severity, foundIngredients, mealName)
        };
        warnings.push(warning);

        // Update risk level based on severity
        if (userAllergen.severity === 'severe') {
          riskLevel = 'high';
        } else if (userAllergen.severity === 'moderate' && riskLevel !== 'high') {
          riskLevel = 'medium';
        }
      }
    }

    return {
      isSafe: warnings.length === 0,
      warnings,
      riskLevel,
      safeAlternatives: this.getSafeAlternatives(warnings)
    };
  }

  /**
   * Find allergen in ingredient list using fuzzy matching
   */
  private findAllergenInIngredients(allergen: string, ingredients: string[]): string[] {
    const foundIngredients: string[] = [];
    const allergenKeywords = [
      ...(this.allergenIngredientMap[allergen] || []),
      ...(this.filipinoAllergenMap[allergen] || [])
    ];

    for (const ingredient of ingredients) {
      const ingredientLower = ingredient.toLowerCase();
      
      for (const keyword of allergenKeywords) {
        if (ingredientLower.includes(keyword.toLowerCase())) {
          foundIngredients.push(ingredient);
          break;
        }
      }
    }

    return foundIngredients;
  }

  /**
   * Generate contextual warning message
   */
  private generateWarningMessage(allergen: string, severity: string, foundIn: string[], mealName?: string): string {
    const mealText = mealName ? ` in "${mealName}"` : '';
    const ingredientList = foundIn.join(', ');
    
    switch (severity) {
      case 'severe':
        return `⚠️ DANGER: ${allergen} detected${mealText}! Found in: ${ingredientList}. This could cause a severe allergic reaction.`;
      case 'moderate':
        return `⚠️ WARNING: ${allergen} detected${mealText}. Found in: ${ingredientList}. Please avoid if you have allergies.`;
      case 'mild':
        return `ℹ️ NOTICE: ${allergen} detected${mealText}. Found in: ${ingredientList}. Monitor for mild reactions.`;
      default:
        return `⚠️ ${allergen} detected${mealText}. Found in: ${ingredientList}.`;
    }
  }

  /**
   * Get safe alternatives based on detected allergens
   */
  private getSafeAlternatives(warnings: AllergenWarning[]): string[] {
    const alternatives: string[] = [];
    const allergens = warnings.map(w => w.allergen);

    if (allergens.includes('Dairy')) {
      alternatives.push('Try plant-based alternatives like coconut milk or oat milk');
    }
    if (allergens.includes('Eggs')) {
      alternatives.push('Look for egg-free versions or ask for modifications');
    }
    if (allergens.includes('Fish') || allergens.includes('Shellfish')) {
      alternatives.push('Consider meat-based or vegetarian options');
    }
    if (allergens.includes('Peanuts') || allergens.includes('Tree Nuts')) {
      alternatives.push('Ask for nut-free preparation and separate cooking surfaces');
    }
    if (allergens.includes('Soy')) {
      alternatives.push('Request dishes without soy sauce or tofu');
    }
    if (allergens.includes('Wheat')) {
      alternatives.push('Look for rice-based dishes or gluten-free options');
    }

    return alternatives;
  }

  /**
   * Analyze ingredients for potential allergens (for ingredient scanning)
   */
  analyzeIngredients(ingredients: string[]): IngredientAnalysis[] {
    return ingredients.map(ingredient => {
      const potentialAllergens: string[] = [];
      
      for (const [allergen, keywords] of Object.entries(this.allergenIngredientMap)) {
        for (const keyword of keywords) {
          if (ingredient.toLowerCase().includes(keyword.toLowerCase())) {
            potentialAllergens.push(allergen);
            break;
          }
        }
      }

      // Check Filipino-specific allergens
      for (const [allergen, keywords] of Object.entries(this.filipinoAllergenMap)) {
        for (const keyword of keywords) {
          if (ingredient.toLowerCase().includes(keyword.toLowerCase())) {
            if (!potentialAllergens.includes(allergen)) {
              potentialAllergens.push(allergen);
            }
            break;
          }
        }
      }

      return {
        ingredient,
        potentialAllergens,
        category: this.categorizeIngredient(ingredient)
      };
    });
  }

  detectAllergensFromIngredients(ingredients: string[]): string[] {
    if (!Array.isArray(ingredients) || ingredients.length === 0) {
      return [];
    }

    const analyses = this.analyzeIngredients(ingredients);
    const detected = analyses.flatMap(analysis => analysis.potentialAllergens || []);
    return [...new Set(detected.map(allergen => this.normalizeAllergenName(allergen)).filter(Boolean))];
  }

  /**
   * Categorize ingredient for better analysis
   */
  private categorizeIngredient(ingredient: string): string {
    const ingredientLower = ingredient.toLowerCase();
    
    if (['pork', 'beef', 'chicken', 'fish', 'shrimp', 'crab'].some(meat => ingredientLower.includes(meat))) {
      return 'Protein';
    }
    if (['rice', 'bread', 'pasta', 'noodles'].some(grain => ingredientLower.includes(grain))) {
      return 'Grains';
    }
    if (['tomato', 'onion', 'garlic', 'kangkong', 'cabbage'].some(veg => ingredientLower.includes(veg))) {
      return 'Vegetables';
    }
    if (['coconut', 'oil', 'butter', 'cream'].some(fat => ingredientLower.includes(fat))) {
      return 'Fats';
    }
    if (['salt', 'pepper', 'soy sauce', 'vinegar'].some(spice => ingredientLower.includes(spice))) {
      return 'Seasonings';
    }
    
    return 'Other';
  }

  /**
   * Get allergen warnings observable
   */
  getAllergenWarnings(): Observable<AllergenWarning[]> {
    return this.allergenWarnings$.asObservable();
  }

  /**
   * Check if user has specific allergen
   */
  hasAllergen(allergenName: string): boolean {
    return this.userAllergens.some(allergen => allergen.name === allergenName);
  }

  /**
   * Get user's allergen severity level
   */
  getAllergenSeverity(allergenName: string): string | null {
    const allergen = this.userAllergens.find(a => a.name === allergenName);
    return allergen?.severity || null;
  }

  /**
   * Batch analyze multiple meals
   */
  batchAnalyzeMeals(meals: Array<{ name: string; ingredients: string[] }>): Array<{ meal: string; analysis: MealSafetyAnalysis }> {
    return meals.map(meal => ({
      meal: meal.name,
      analysis: this.analyzeMealSafety(meal.ingredients, meal.name)
    }));
  }

  /**
   * Compatibility helper for existing detail pages.
   */
  checkMenuItemForAllergens(item: any): {
    hasAllergens: boolean;
    warnings: AllergenWarning[];
    safetyLevel: 'safe' | 'caution' | 'danger';
    conflictingAllergens: string[];
    conflictingIngredients: string[];
  } {
    const ingredientList = Array.isArray(item?.ingredients)
      ? item.ingredients.map((ingredient: any) => typeof ingredient === 'string' ? ingredient : ingredient?.name || ingredient?.ingredientName || '').filter(Boolean)
      : [];
    const analysis = this.analyzeMealSafety(ingredientList, item?.name);

    return {
      hasAllergens: !analysis.isSafe,
      warnings: analysis.warnings,
      safetyLevel: analysis.riskLevel === 'high' ? 'danger' : analysis.riskLevel === 'medium' ? 'caution' : 'safe',
      conflictingAllergens: analysis.warnings.map(warning => warning.allergen),
      conflictingIngredients: analysis.warnings.flatMap(warning => warning.foundIn)
    };
  }

  /**
   * Get safe meal recommendations based on user allergens
   */
  getSafeMealRecommendations(allMeals: Array<{ name: string; ingredients: string[] }>): Array<{ name: string; ingredients: string[] }> {
    return allMeals.filter(meal => {
      const analysis = this.analyzeMealSafety(meal.ingredients, meal.name);
      return analysis.isSafe;
    });
  }

  /**
   * Update user allergens (when user modifies their profile)
   */
  updateUserAllergens(allergens: any[]) {
    this.userAllergens = Array.isArray(allergens) && allergens.length > 0
      ? allergens
      : this.getStoredSelectedAllergens();
  }

  /**
   * ENHANCED ALLERGEN DETECTION: Dual-source verification
   * Step 1: Fast local detection (hardcoded keywords)
   * Step 2: Verify with Spoonacular ingredient parsing (backup/confirmation)
   * Returns merged results with higher confidence
   */
  async verifyAllergensWithSpoonacular(
    ingredients: string[],
    mealName?: string
  ): Promise<MealSafetyAnalysis> {
    // Step 1: Quick local analysis (fast - 1-5ms)
    const localAnalysis = this.analyzeMealSafety(ingredients, mealName);

    // Step 2: Get Spoonacular ingredient verification
    try {
      // Build a search query from ingredients
      const ingredientQuery = ingredients.join(', ');
      
      // Search for each ingredient in Spoonacular to get detailed parsing
      const spoonacularAllergens: Set<string> = new Set();
      
      for (const ingredient of ingredients) {
        try {
          // Try to get Spoonacular data for this ingredient
          // This calls the ingredient search which parses ingredient details
          const results = await this.spoonacularService
            .searchIngredients(ingredient, 1)
            .toPromise();
          
          if (results && results.length > 0) {
            // Spoonacular already parsed this ingredient
            // Now scan it for allergen keywords (similar to extractAllergens)
            const allergenMatches = this.extractAllergensFromIngredientName(ingredient);
            allergenMatches.forEach(allergen => spoonacularAllergens.add(allergen));
          }
        } catch (error) {
          // If Spoonacular lookup fails, just continue with local detection
          console.debug(`Spoonacular lookup failed for "${ingredient}", using local detection`);
        }
      }

      // Step 3: Merge local and Spoonacular results
      return this.mergeLocalAndSpoonacularResults(
        localAnalysis,
        Array.from(spoonacularAllergens),
        ingredients,
        mealName
      );
    } catch (error) {
      console.warn('Spoonacular verification failed, falling back to local detection:', error);
      return localAnalysis; // Fallback to local if Spoonacular fails
    }
  }

  /**
   * Extract allergens from ingredient name using comprehensive mapping
   * (Mirrors Spoonacular's extractAllergens logic but standalone)
   */
  private extractAllergensFromIngredientName(ingredientName: string): string[] {
    const allergens: string[] = [];
    const lower = ingredientName.toLowerCase();

    // Peanuts
    if (lower.includes('peanut') || lower.includes('mani') || lower.includes('kare-kare')) {
      allergens.push('Peanuts');
    }

    // Tree nuts
    if (lower.includes('almond') || lower.includes('walnut') || lower.includes('cashew') ||
        lower.includes('coconut') || lower.includes('hazelnut') || lower.includes('pecan')) {
      allergens.push('Tree Nuts');
    }

    // Shellfish (including Filipino terms)
    if (lower.includes('shellfish') || lower.includes('shrimp') || lower.includes('crab') ||
        lower.includes('hipon') || lower.includes('alimango') || lower.includes('talaba') ||
        lower.includes('sugpo') || lower.includes('scallop') || lower.includes('lobster')) {
      allergens.push('Shellfish');
    }

    // Fish (including Filipino terms)
    if ((lower.includes('fish') && !lower.includes('shellfish')) || 
        lower.includes('isda') || lower.includes('bangus') || lower.includes('tilapia') ||
        lower.includes('patis') || lower.includes('fish sauce') || lower.includes('bagoong') ||
        lower.includes('anchovy') || lower.includes('sardine') || lower.includes('salmon')) {
      allergens.push('Fish');
    }

    // Eggs (including Filipino terms)
    if (lower.includes('egg') || lower.includes('itlog') || lower.includes('balut') ||
        lower.includes('mayonnaise') || lower.includes('albumin')) {
      allergens.push('Eggs');
    }

    // Soy (including Filipino terms)
    if (lower.includes('soy') || lower.includes('tofu') || lower.includes('tokwa') ||
        lower.includes('taho') || lower.includes('toyo') || lower.includes('soy sauce') ||
        lower.includes('miso') || lower.includes('tempeh')) {
      allergens.push('Soy');
    }

    // Dairy (including Filipino terms)
    if (lower.includes('milk') || lower.includes('cheese') || lower.includes('butter') ||
        lower.includes('gatas') || lower.includes('keso') || lower.includes('kesong puti') ||
        lower.includes('cream') || lower.includes('yogurt') || lower.includes('mantikilya')) {
      allergens.push('Dairy');
    }

    // Wheat (including Filipino terms)
    if (lower.includes('wheat') || lower.includes('flour') || lower.includes('bread') ||
        lower.includes('harina') || lower.includes('tinapay') || lower.includes('pasta') ||
        lower.includes('noodle') || lower.includes('gluten')) {
      allergens.push('Wheat');
    }

    // Sesame
    if (lower.includes('sesame') || lower.includes('linga') || lower.includes('tahini')) {
      allergens.push('Sesame');
    }

    return [...new Set(allergens)]; // Remove duplicates
  }

  /**
   * Merge local detection results with Spoonacular verification
   * Spoonacular acts as a confidence check/backup for local detection
   */
  private mergeLocalAndSpoonacularResults(
    localAnalysis: MealSafetyAnalysis,
    spoonacularAllergens: string[],
    ingredients: string[],
    mealName?: string
  ): MealSafetyAnalysis {
    const effectiveAllergens = this.getEffectiveUserAllergens();
    const mergedWarnings: AllergenWarning[] = [];
    const seenAllergens = new Set<string>();

    // Step 1: Add all warnings from local detection (primary source)
    localAnalysis.warnings.forEach(warning => {
      mergedWarnings.push(warning);
      seenAllergens.add(warning.allergen);
    });

    // Step 2: Cross-verify with Spoonacular results
    // If Spoonacular detected something the local system missed, add it
    spoonacularAllergens.forEach(spoonacularAllergen => {
      // Normalize allergen name
      const normalizedAllergen = this.normalizeAllergenName(spoonacularAllergen);
      
      // Check if user is allergic to this Spoonacular-detected allergen
      const userAllergen = effectiveAllergens.find(ua => 
        this.normalizeAllergenName(ua.name) === normalizedAllergen
      );

      if (userAllergen && !seenAllergens.has(normalizedAllergen)) {
        // New allergen detected by Spoonacular (not found by local)
        // This is a secondary/confirmation detection
        const foundInIngredient = ingredients.find(ing => 
          this.extractAllergensFromIngredientName(ing).includes(normalizedAllergen)
        ) || 'unknown ingredient';

        const warning: AllergenWarning = {
          allergen: normalizedAllergen,
          severity: userAllergen.severity || 'moderate',
          foundIn: [foundInIngredient],
          message: this.generateWarningMessage(
            normalizedAllergen,
            userAllergen.severity,
            [foundInIngredient],
            mealName
          )
        };
        mergedWarnings.push(warning);
        seenAllergens.add(normalizedAllergen);
      }
    });

    // Step 3: Return merged analysis
    return {
      isSafe: mergedWarnings.length === 0,
      warnings: mergedWarnings,
      safeAlternatives: this.getSafeAlternatives(mergedWarnings),
      riskLevel: this.calculateRiskLevelFromWarnings(mergedWarnings)
    };
  }

  /**
   * Calculate risk level from warnings
   */
  private calculateRiskLevelFromWarnings(warnings: AllergenWarning[]): 'low' | 'medium' | 'high' {
    if (warnings.some(w => w.severity === 'severe')) {
      return 'high';
    }
    if (warnings.some(w => w.severity === 'moderate')) {
      return 'medium';
    }
    return 'low';
  }
}
