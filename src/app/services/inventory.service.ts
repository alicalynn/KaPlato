import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../environments/environment';

export interface InventoryItem {
  id: number;
  karenderia_id: number;
  item_name: string;
  description?: string;
  category: string;
  unit: string;
  current_stock: number;
  minimum_stock: number;
  maximum_stock?: number;
  unit_cost: number;
  total_value: number;
  supplier?: string;
  last_restocked?: string;
  expiry_date?: string;
  status: 'available' | 'low_stock' | 'out_of_stock' | 'expired';
  notes?: string;
  created_at: string;
  updated_at: string;
}

export interface InventoryStats {
  total_items: number;
  total_value: number;
  low_stock_count: number;
  out_of_stock_count: number;
  categories: string[];
}

export interface CreateInventoryData {
  item_name: string;
  description?: string;
  category: string;
  unit: string;
  current_stock: number;
  minimum_stock: number;
  maximum_stock?: number;
  unit_cost: number;
  supplier?: string;
  expiry_date?: string;
  notes?: string;
}

export interface SupplierListing {
  id: number;
  supplier_id: number;
  item_name: string;
  description?: string;
  category: string;
  unit: string;
  price_per_unit: number;
  available_stock: number;
  minimum_order_quantity: number;
  is_active: boolean;
  supplier?: {
    id: number;
    name: string;
    email: string;
  };
  is_suki?: boolean;
  created_at: string;
  updated_at: string;
}

export interface SukiSupplier {
  id: number;
  name: string;
  email: string;
  listing_count: number;
}

export interface CreateSupplierListingData {
  item_name: string;
  description?: string;
  category: string;
  unit: string;
  price_per_unit: number;
  available_stock: number;
  minimum_order_quantity?: number;
  is_active?: boolean;
}

export interface SupplyOrderItem {
  id: number;
  supply_order_id: number;
  supplier_inventory_item_id: number;
  quantity: number;
  unit_price: number;
  line_total: number;
  supplier_item?: {
    id: number;
    item_name: string;
    unit: string;
  };
}

export interface SupplyOrder {
  id: number;
  karenderia_id: number;
  supplier_id: number;
  status: 'pending' | 'confirmed' | 'delivering' | 'delivered' | 'cancelled';
  payment_status?: 'pending' | 'confirmed' | 'failed';
  payment_method?: 'cod' | 'paymaya_sandbox' | 'paypal_sandbox';
  total_amount: number;
  notes?: string;
  delivery_date?: string;
  items: SupplyOrderItem[];
  supplier?: {
    id: number;
    name: string;
    email: string;
  };
  karenderia?: {
    id: number;
    business_name?: string;
    name?: string;
  };
  created_at: string;
  updated_at: string;
}

export interface CreateSupplyOrderData {
  items: Array<{
    supplier_inventory_item_id: number;
    quantity: number;
  }>;
  payment_method?: 'cod' | 'paymaya_sandbox' | 'paypal_sandbox';
  notes?: string;
  delivery_date?: string;
}

@Injectable({
  providedIn: 'root'
})
export class InventoryService {
  private baseUrl = `${environment.apiUrl}/inventory`;
  private supplyBaseUrl = `${environment.apiUrl}/supply`;

  constructor(private http: HttpClient) { }

  private getAuthHeaders(): HttpHeaders {
    const token = localStorage.getItem('auth_token');
    return new HttpHeaders({
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json'
    });
  }

  /**
   * Get all inventory items with stats
   */
  getInventory(): Observable<any> {
    return this.http.get(this.baseUrl, { headers: this.getAuthHeaders() });
  }

  /**
   * Get low stock alerts
   */
  getLowStockAlerts(): Observable<any> {
    return this.http.get(`${this.baseUrl}/alerts`, { headers: this.getAuthHeaders() });
  }

  /**
   * Create new inventory item
   */
  createInventoryItem(data: CreateInventoryData): Observable<any> {
    return this.http.post(this.baseUrl, data, { headers: this.getAuthHeaders() });
  }

  /**
   * Update inventory item
   */
  updateInventoryItem(id: number, data: Partial<CreateInventoryData>): Observable<any> {
    return this.http.put(`${this.baseUrl}/${id}`, data, { headers: this.getAuthHeaders() });
  }

  /**
   * Restock inventory item
   */
  restockItem(id: number, quantity: number, unitCost?: number): Observable<any> {
    const data: any = { quantity };
    if (unitCost !== undefined) {
      data.unit_cost = unitCost;
    }
    return this.http.post(`${this.baseUrl}/${id}/restock`, data, { headers: this.getAuthHeaders() });
  }

  /**
   * Delete inventory item
   */
  deleteInventoryItem(id: number): Observable<any> {
    return this.http.delete(`${this.baseUrl}/${id}`, { headers: this.getAuthHeaders() });
  }

  /**
   * Get supplier marketplace listings (for karenderia owners)
   */
  getMarketplaceListings(search?: string, category?: string, sukiOnly?: boolean): Observable<any> {
    const params = new URLSearchParams();
    if (search) {
      params.set('search', search);
    }
    if (category) {
      params.set('category', category);
    }
    if (sukiOnly) {
      params.set('suki_only', '1');
    }

    const query = params.toString();
    const url = query
      ? `${this.supplyBaseUrl}/marketplace?${query}`
      : `${this.supplyBaseUrl}/marketplace`;

    return this.http.get(url, { headers: this.getAuthHeaders() });
  }

  /**
   * Get supplier's own listings
   */
  getSupplierListings(): Observable<any> {
    return this.http.get(`${this.supplyBaseUrl}/supplier/listings`, { headers: this.getAuthHeaders() });
  }

  /**
   * Create supplier listing
   */
  createSupplierListing(data: CreateSupplierListingData): Observable<any> {
    return this.http.post(`${this.supplyBaseUrl}/supplier/listings`, data, { headers: this.getAuthHeaders() });
  }

  /**
   * Update supplier listing
   */
  updateSupplierListing(id: number, data: Partial<CreateSupplierListingData>): Observable<any> {
    return this.http.put(`${this.supplyBaseUrl}/supplier/listings/${id}`, data, { headers: this.getAuthHeaders() });
  }

  /**
   * Place supply order as karenderia owner
   */
  createSupplyOrder(data: CreateSupplyOrderData): Observable<any> {
    return this.http.post(`${this.supplyBaseUrl}/orders`, data, { headers: this.getAuthHeaders() });
  }

  /**
   * Get karenderia owner supply orders
   */
  getOwnerSupplyOrders(): Observable<any> {
    return this.http.get(`${this.supplyBaseUrl}/orders/owner`, { headers: this.getAuthHeaders() });
  }

  /**
   * Get supplier supply orders
   */
  getSupplierSupplyOrders(): Observable<any> {
    return this.http.get(`${this.supplyBaseUrl}/orders/supplier`, { headers: this.getAuthHeaders() });
  }

  /**
   * Update supply order status
   */
  updateSupplyOrderStatus(orderId: number, status: 'pending' | 'confirmed' | 'delivering' | 'delivered' | 'cancelled'): Observable<any> {
    return this.http.patch(`${this.supplyBaseUrl}/orders/${orderId}/status`, { status }, { headers: this.getAuthHeaders() });
  }

  getSukiSuppliers(): Observable<any> {
    return this.http.get(`${this.supplyBaseUrl}/suki-suppliers`, { headers: this.getAuthHeaders() });
  }

  markSukiSupplier(supplierId: number): Observable<any> {
    return this.http.post(`${this.supplyBaseUrl}/suki-suppliers/${supplierId}`, {}, { headers: this.getAuthHeaders() });
  }

  unmarkSukiSupplier(supplierId: number): Observable<any> {
    return this.http.delete(`${this.supplyBaseUrl}/suki-suppliers/${supplierId}`, { headers: this.getAuthHeaders() });
  }
}
