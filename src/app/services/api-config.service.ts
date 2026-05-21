import { Injectable } from '@angular/core';
import { environment } from '../../environments/environment';
import { QrScannerService } from './qr-scanner.service';
import { Observable } from 'rxjs';
import { map, startWith } from 'rxjs/operators';

@Injectable({
  providedIn: 'root'
})
export class ApiConfigService {
  constructor(private qrScannerService: QrScannerService) {}

  /**
   * Get the current API URL (from QR scanner or environment default)
   */
  getApiUrl(): string {
    const scannedUrl = this.qrScannerService.getBackendUrl();
    const url = scannedUrl || environment.apiUrl;
    console.log('🌐 ApiConfigService.getApiUrl() -> scanned:', scannedUrl, 'final:', url);
    return url;
  }

  /**
   * Get the API URL as an Observable (reactive)
   * Useful for components that need to react to URL changes
   */
  getApiUrl$(): Observable<string> {
    return this.qrScannerService.backendUrl$.pipe(
      map(scannedUrl => scannedUrl || environment.apiUrl),
      startWith(this.getApiUrl())
    );
  }

  /**
   * Construct a full API endpoint URL
   */
  getEndpoint(path: string): string {
    const apiUrl = this.getApiUrl();
    // Remove trailing slash from apiUrl if present
    const cleanUrl = apiUrl.endsWith('/') ? apiUrl.slice(0, -1) : apiUrl;
    // Ensure path starts with /
    const cleanPath = path.startsWith('/') ? path : `/${path}`;
    return `${cleanUrl}${cleanPath}`;
  }

  /**
   * Check if a custom backend URL is configured
   */
  hasCustomBackendUrl(): boolean {
    return !!this.qrScannerService.getBackendUrl();
  }

  /**
   * Get the default environment API URL
   */
  getDefaultApiUrl(): string {
    return environment.apiUrl;
  }
}
