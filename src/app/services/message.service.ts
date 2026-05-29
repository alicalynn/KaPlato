import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Observable, BehaviorSubject } from 'rxjs';
import { map } from 'rxjs/operators';
import { environment } from '../../environments/environment';

/** Laravel paginate() wraps rows in { data: { data: [...] } } — always return a plain array. */
export function extractConversationList(response: any): Conversation[] {
  if (!response) {
    return [];
  }
  const payload = response.data !== undefined ? response.data : response;
  if (Array.isArray(payload)) {
    return payload;
  }
  if (payload && Array.isArray(payload.data)) {
    return payload.data;
  }
  return [];
}

export function extractMessageList(response: any): Message[] {
  if (!response) {
    return [];
  }
  const payload = response.data !== undefined ? response.data : response;
  if (Array.isArray(payload)) {
    return payload;
  }
  if (payload && Array.isArray(payload.data)) {
    return payload.data;
  }
  return [];
}

export interface Message {
  id: number;
  from_user_id: number;
  to_user_id: number;
  ingredient_request_id: number;
  message: string;
  type: 'text' | 'call_request' | 'system';
  call_phone_number?: string;
  call_status?: 'pending' | 'completed' | 'missed';
  is_read: boolean;
  read_at?: string;
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

export interface Conversation {
  id: number;
  ingredient_request_id: number;
  from_user_id: number;
  to_user_id: number;
  message: string;
  created_at: string;
  ingredientRequest?: {
    id: number;
    title: string;
    karenderia_id: number;
  };
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
export class MessageService {
  private apiUrl = environment.apiUrl;
  private unreadCountSubject = new BehaviorSubject<number>(0);
  public unreadCount$ = this.unreadCountSubject.asObservable();

  constructor(private http: HttpClient) {}

  private getHeaders(): HttpHeaders {
    const token = localStorage.getItem('auth_token');
    return new HttpHeaders({
      'Content-Type': 'application/json',
      'Authorization': token ? `Bearer ${token}` : ''
    });
  }

  /**
   * Send a message or call request
   */
  sendMessage(data: {
    to_user_id: number;
    ingredient_request_id: number;
    message: string;
    type?: 'text' | 'call_request' | 'system';
    call_phone_number?: string;
  }): Observable<any> {
    return this.http.post(`${this.apiUrl}/messages`, data, {
      headers: this.getHeaders()
    });
  }

  /**
   * Send a call request
   */
  requestCall(data: {
    to_user_id: number;
    ingredient_request_id: number;
    call_phone_number: string;
  }): Observable<any> {
    return this.http.post(`${this.apiUrl}/messages/call-request`, data, {
      headers: this.getHeaders()
    });
  }

  /**
   * Get conversation for a specific request with a user
   */
  getConversation(ingredientRequestId: number, withUserId: number): Observable<any> {
    return this.http.get(`${this.apiUrl}/messages/ingredient-requests/${ingredientRequestId}`, {
      headers: this.getHeaders(),
      params: { with: withUserId.toString() }
    });
  }

  /**
   * Get all conversations
   */
  getConversations(page: number = 1): Observable<Conversation[]> {
    return this.http.get(`${this.apiUrl}/messages/conversations`, {
      headers: this.getHeaders(),
      params: { page: page.toString() }
    }).pipe(map(response => extractConversationList(response)));
  }

  /**
   * Get unread message count
   */
  getUnreadCount(): Observable<any> {
    return this.http.get(`${this.apiUrl}/messages/unread`, {
      headers: this.getHeaders()
    });
  }

  /**
   * Update unread count in subject
   */
  updateUnreadCount(count: number) {
    this.unreadCountSubject.next(count);
  }

  /**
   * Refresh unread count from server
   */
  refreshUnreadCount(): Observable<any> {
    return new Observable(observer => {
      this.getUnreadCount().subscribe({
        next: (data) => {
          this.updateUnreadCount(data?.unread_count || 0);
          observer.next(data);
          observer.complete();
        },
        error: (err) => observer.error(err)
      });
    });
  }
}
