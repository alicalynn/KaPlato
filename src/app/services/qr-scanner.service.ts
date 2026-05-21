import { Injectable } from '@angular/core';
import { QRScanner, QRScannerStatus } from '@ionic-native/qr-scanner/ngx';
import { BehaviorSubject, Observable } from 'rxjs';

@Injectable({
  providedIn: 'root'
})
export class QrScannerService {
  private backendUrlSubject = new BehaviorSubject<string>(this.getStoredUrl());
  public backendUrl$ = this.backendUrlSubject.asObservable();

  constructor(private qrScanner: QRScanner) {
    this.loadStoredUrl();
  }

  /**
   * Start QR code scanning
   */
  startScanning(): Observable<string> {
    return new Observable(observer => {
      this.qrScanner.prepare().then((status: QRScannerStatus) => {
        if (status.authorized) {
          // Start scanning
          this.qrScanner.show();

          const subscription = this.qrScanner.scan().subscribe(
            (text: string) => {
              console.log('QR Code Scanned:', text);
              
              // Extract URL from QR code
              const url = this.extractUrl(text);
              
              if (url) {
                // Store the URL
                this.setBackendUrl(url);
                observer.next(url);
                observer.complete();
                
                // Stop scanning
                this.qrScanner.hide();
                subscription.unsubscribe();
              } else {
                observer.error('Invalid QR code - must contain a URL');
              }
            },
            (error: any) => {
              console.error('QR Scanner Error:', error);
              observer.error(error);
              this.qrScanner.hide();
            }
          );
        } else if (status.denied) {
          console.error('QR Scanner permission denied');
          observer.error('Camera permission denied');
        } else {
          console.error('QR Scanner not available');
          observer.error('QR Scanner not available');
        }
      }).catch((error: any) => {
        console.error('QR Scanner preparation error:', error);
        observer.error(error);
      });
    });
  }

  /**
   * Stop scanning
   */
  stopScanning(): void {
    this.qrScanner.hide();
    this.qrScanner.destroy();
  }

  /**
   * Extract URL from QR code text
   */
  private extractUrl(text: string): string | null {
    try {
      // If it's already a URL, return it
      if (text.startsWith('http://') || text.startsWith('https://')) {
        return text;
      }
      
      // If it contains ngrok.io, construct the full URL
      if (text.includes('ngrok')) {
        const match = text.match(/(https?:\/\/[^\s]+ngrok[^\s]*)/);
        if (match) {
          return match[1];
        }
      }
      
      return null;
    } catch (error) {
      console.error('Error extracting URL:', error);
      return null;
    }
  }

  /**
   * Get stored backend URL
   */
  getBackendUrl(): string {
    return this.getStoredUrl();
  }

  /**
   * Set backend URL
   */
  setBackendUrl(url: string): void {
    localStorage.setItem('backendUrl', url);
    this.backendUrlSubject.next(url);
  }

  /**
   * Get stored URL from localStorage
   */
  private getStoredUrl(): string {
    return localStorage.getItem('backendUrl') || '';
  }

  /**
   * Load stored URL from localStorage
   */
  private loadStoredUrl(): void {
    const storedUrl = this.getStoredUrl();
    if (storedUrl) {
      this.backendUrlSubject.next(storedUrl);
    }
  }

  /**
   * Clear stored URL
   */
  clearBackendUrl(): void {
    localStorage.removeItem('backendUrl');
    this.backendUrlSubject.next('');
  }
}
