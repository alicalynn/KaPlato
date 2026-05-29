import { NgModule } from '@angular/core';
import { PreloadAllModules, RouterModule, Routes } from '@angular/router';
import { AuthGuard } from './guards/auth.guard';
import { KarenderiaGuard } from './guards/karenderia.guard';
import { CustomerGuard } from './guards/customer.guard';
import { AdminGuard } from './guards/admin.guard';
import { InventoryWorkflowGuard } from './guards/inventory-workflow.guard';
import { CustomPreloadingStrategy } from './services/custom-preloading.service';

const routes: Routes = [
  {
    path: 'home',
    loadChildren: () => import('./home/home.module').then( m => m.HomePageModule),
    canActivate: [AuthGuard, CustomerGuard]
  },
  {
    path: 'supplier-dashboard',
    loadComponent: () => import('./pages/inventory-management/inventory-management.page').then(m => m.InventoryManagementPage),
    canActivate: [AuthGuard]
  },
  {
    path: '',
    loadComponent: () => import('./components/role-redirect.component').then(m => m.RoleRedirectComponent),
    canActivate: [AuthGuard]
  },
  {
    path: 'role-redirect',
    loadComponent: () => import('./components/role-redirect.component').then(m => m.RoleRedirectComponent)
  },
  {
    path: 'login',
    loadChildren: () => import('./login/login.module').then( m => m.LoginPageModule)
  },
  {
    path: 'register',
    loadChildren: () => import('./register/register.module').then( m => m.RegisterPageModule)
  },
  {
    path: 'karenderia-application',
    loadChildren: () => import('./karenderia-application/karenderia-application.module').then( m => m.KarenderiaApplicationPageModule),
    canActivate: [AuthGuard, CustomerGuard]
  },
  {
    path: 'karenderia-registration',
    loadChildren: () => import('./pages/karenderia-registration/karenderia-registration.module').then( m => m.KarenderiaRegistrationPageModule)
  },
  {
    path: 'owner-reapply',
    loadChildren: () => import('./pages/karenderia-owner-registration/owner-reapply.module').then( m => m.OwnerReapplyPageModule)
  },
  {
    path: 'profile',
    loadChildren: () => import('./profile/profile.module').then( m => m.ProfilePageModule),
    canActivate: [AuthGuard]
  },
  {
    path: 'karenderia-dashboard',
    loadChildren: () => import('./karenderia-dashboard/karenderia-dashboard.module').then( m => m.KarenderiaDashboardPageModule),
    canActivate: [AuthGuard, KarenderiaGuard]
  },
  {
    path: 'karenderia-menu',
    loadChildren: () => import('./karenderia-menu/karenderia-menu.module').then( m => m.KarenderiaMenuPageModule),
    canActivate: [AuthGuard, KarenderiaGuard]
  },
  {
    path: 'karenderia-ingredients',
    loadChildren: () => import('./karenderia-ingredients/karenderia-ingredients.module').then( m => m.KarenderiaIngredientsPageModule),
    canActivate: [AuthGuard, KarenderiaGuard]
  },

  {
    path: 'karenderia-analytics',
    loadChildren: () => import('./karenderia-analytics/karenderia-analytics.module').then( m => m.KarenderiaAnalyticsPageModule),
    canActivate: [AuthGuard, KarenderiaGuard]
  },

  {
    path: 'karenderia-orders',
    redirectTo: 'karenderia-orders-pos',
    pathMatch: 'full'
  },

  {
    path: 'karenderia-orders-pos',
    loadChildren: () => import('./karenderia-orders-pos/karenderia-orders-pos.module').then( m => m.KarenderiaOrdersPosPageModule),
    canActivate: [AuthGuard, KarenderiaGuard]
  },

  {
    path: 'karenderia-settings',
    loadChildren: () => import('./karenderia-settings/karenderia-settings.module').then( m => m.KarenderiaSettingsPageModule),
    canActivate: [AuthGuard, KarenderiaGuard]
  },
  {
    path: 'meal-planner',
    loadChildren: () => import('./meal-planner/meal-planner.module').then(m => m.MealPlannerPageModule),
    canActivate: [AuthGuard, CustomerGuard]
  },
  {
    path: 'map-view',
    loadChildren: () => import('./map-view/map-view.module').then(m => m.MapViewPageModule),
    canActivate: [AuthGuard, CustomerGuard]
  },
  {
    path: 'customer-map',
    loadComponent: () => import('./customer-map/customer-map.page').then(m => m.CustomerMapPage),
    canActivate: [AuthGuard, CustomerGuard] // Only for customers
  },
  {
    path: 'karenderia-detail/:id',
    loadChildren: () => import('./karenderia-detail/karenderia-detail.page.module').then(m => m.KarenderiaDetailPageModule),
    canActivate: [AuthGuard, CustomerGuard]
  },
  {
    path: 'karenderias-browse',
    loadChildren: () => import('./karenderias-browse/karenderias-browse.module').then(m => m.KarenderiasBrowsePageModule),
    canActivate: [AuthGuard, CustomerGuard]
  },
  {
    path: 'admin-dashboard',
    loadChildren: () => import('./pages/admin-dashboard/admin-dashboard.module').then(m => m.AdminDashboardPageModule),
    canActivate: [AuthGuard, AdminGuard]
  },
  {
    path: 'admin-location-management',
    loadChildren: () => import('./pages/admin-location-management/admin-location-management.module').then(m => m.AdminLocationManagementPageModule),
    canActivate: [AuthGuard, AdminGuard]
  },
  {
    path: 'meal-details/:id',
    loadComponent: () => import('./meal-details/meal-details.page').then(m => m.MealDetailsPage),
    canActivate: [AuthGuard, CustomerGuard]
  },
  {
    path: 'favorites',
    loadComponent: () => import('./favorites/favorites.page').then(m => m.FavoritesPage),
    canActivate: [AuthGuard, CustomerGuard]
  },
  {
    path: 'meal-history',
    loadComponent: () => import('./meal-history/meal-history.page').then(m => m.MealHistoryPage),
    canActivate: [AuthGuard, CustomerGuard]
  },
  {
    path: 'allergen-profile',
    loadComponent: () => import('./pages/allergen-profile/allergen-profile.page').then(m => m.AllergenProfilePage),
    canActivate: [AuthGuard, CustomerGuard]
  },
  {
    path: 'nutrition-demo',
    loadComponent: () => import('./nutrition-demo/nutrition-demo.page').then(m => m.NutritionDemoPage),
    canActivate: [AuthGuard, CustomerGuard]
  },
  {
    path: 'meals-browse',
    loadComponent: () => import('./meals-browse/meals-browse.page').then(m => m.MealsBrowsePage),
    canActivate: [AuthGuard, CustomerGuard]
  },
  {
    path: 'daily-menu-management',
    loadChildren: () => import('./pages/daily-menu-management/daily-menu-management.module').then( m => m.DailyMenuManagementPageModule),
    canActivate: [AuthGuard, KarenderiaGuard]
  },
  {
    path: 'owner-messages',
    loadChildren: () => import('./pages/owner-messages/owner-messages.module').then( m => m.OwnerMessagesModule),
    canActivate: [AuthGuard, KarenderiaGuard]
  },
  {
    path: 'supply-order-messages',
    loadComponent: () => import('./pages/supply-order-messages-route/supply-order-messages-route.page').then(m => m.SupplyOrderMessagesRoutePage),
    canActivate: [AuthGuard]
  },
  {
    path: 'supplier-dashboard',
    loadComponent: () => import('./pages/supplier-dashboard/supplier-dashboard.page').then(m => m.SupplierDashboardPage),
    canActivate: [AuthGuard]
  },
  {
    path: 'inventory-management',
    loadComponent: () => import('./pages/inventory-management/inventory-management.page').then(m => m.InventoryManagementPage),
    canActivate: [AuthGuard, InventoryWorkflowGuard]
  },
  {
    path: 'supplier-home',
    loadComponent: () => import('./pages/supplier-home/supplier-home.page').then(m => m.SupplierHomePage),
    canActivate: [AuthGuard]
  },
  {
    path: 'supplier-request-detail/:id',
    loadComponent: () => import('./pages/supplier-request-detail/supplier-request-detail.page').then(m => m.SupplierRequestDetailPage),
    canActivate: [AuthGuard]
  },
  {
    path: 'settings',
    loadComponent: () => import('./pages/settings/settings.page').then(m => m.SettingsPage)
  }

];

@NgModule({
  imports: [
    RouterModule.forRoot(routes, { 
      preloadingStrategy: CustomPreloadingStrategy,
      enableTracing: false // Set to true only for debugging
    })
  ],
  exports: [RouterModule]
})
export class AppRoutingModule { }
