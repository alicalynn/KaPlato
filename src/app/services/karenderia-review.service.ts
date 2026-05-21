import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../environments/environment';

export interface KarenderiaReview {
  id: number;
  karenderia_id: number;
  reviewer_id: number;
  reviewer_type: string;
  rating: number;
  comment?: string;
  karenderia_status: 'open' | 'closed_temporary' | 'closed_permanent' | 'unknown';
  status: 'approved' | 'pending' | 'rejected';
  food_feedback?: string;
  food_quality_rating?: number;
  delivery_experience_rating?: number;
  tags?: string[];
  reviewed_at?: string;
  reviewer?: {
    id: number;
    name: string;
    email: string;
  };
  created_at: string;
  updated_at: string;
}

export interface KarenderiaReport {
  id: number;
  karenderia_id: number;
  reporter_id: number;
  report_type: string;
  description: string;
  evidence?: string;
  attachments?: string[];
  status: 'new' | 'under_review' | 'acknowledged' | 'resolved' | 'rejected';
  verified: boolean;
  similar_reports_count: number;
  created_at: string;
}

export interface RatingStats {
  average: number;
  total_reviews: number;
  distribution: { [key: number]: number };
  status_breakdown: { [key: string]: number };
}

@Injectable({
  providedIn: 'root'
})
export class KarenderiaReviewService {
  private baseUrl = `${environment.apiUrl}/karenderia-reviews`;

  constructor(private http: HttpClient) {}

  private getAuthHeaders(): any {
    const token = localStorage.getItem('auth_token');
    return new HttpHeaders({
      'Authorization': token ? `Bearer ${token}` : '',
      'Content-Type': 'application/json'
    });
  }

  /**
   * Get reviews for a karenderia (public endpoint)
   */
  getReviews(karenderiaId: number): Observable<any> {
    return this.http.get(`${this.baseUrl}/${karenderiaId}`);
  }

  /**
   * Create a review (authenticated)
   */
  createReview(karenderiaId: number, data: any): Observable<any> {
    return this.http.post(
      `${this.baseUrl}/${karenderiaId}`,
      data,
      { headers: this.getAuthHeaders() }
    );
  }

  /**
   * Report a karenderia issue (authenticated)
   */
  reportIssue(karenderiaId: number, data: any): Observable<any> {
    const headers: any = {};
    const token = localStorage.getItem('auth_token');
    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }

    // If data is FormData, don't set Content-Type (let browser set it with boundary)
    const httpHeaders = data instanceof FormData 
      ? new HttpHeaders(headers)
      : new HttpHeaders({ ...headers, 'Content-Type': 'application/json' });

    return this.http.post(
      `${this.baseUrl}/${karenderiaId}/report`,
      data,
      { headers: httpHeaders }
    );
  }
}
