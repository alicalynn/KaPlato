import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';
import { environment } from '../../environments/environment';

export interface SupplyOrderMessage {
  id: number;
  supply_order_id: number;
  from_user_id: number;
  to_user_id: number;
  message: string;
  is_read: boolean;
  read_at?: string | null;
  created_at: string;
  updated_at: string;
  fromUser?: {
    id: number;
    name: string;
    role: string;
  };
  toUser?: {
    id: number;
    name: string;
    role: string;
  };
}

@Injectable({
  providedIn: 'root'
})
export class SupplyOrderMessagingService {
  private apiUrl = `${environment.apiUrl}/supply`;

  constructor(private http: HttpClient) {}

  private getHeaders(): HttpHeaders {
    const token = localStorage.getItem('auth_token');
    return new HttpHeaders({
      'Content-Type': 'application/json',
      'Authorization': token ? `Bearer ${token}` : ''
    });
  }

  getMessages(orderId: number): Observable<SupplyOrderMessage[]> {
    return this.http.get<any>(`${this.apiUrl}/orders/${orderId}/messages`, {
      headers: this.getHeaders()
    }).pipe(map(response => response?.data || []));
  }

  sendMessage(orderId: number, message: string): Observable<SupplyOrderMessage> {
    return this.http.post<any>(`${this.apiUrl}/orders/${orderId}/messages`, {
      message: message.trim()
    }, {
      headers: this.getHeaders()
    }).pipe(map(response => response?.data));
  }

  clearMessages(orderId: number): Observable<any> {
    return this.http.delete(`${this.apiUrl}/orders/${orderId}/messages`, {
      headers: this.getHeaders()
    });
  }
}
