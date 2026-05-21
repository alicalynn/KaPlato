# QR Code Scanner Setup Guide

## Overview

Your Ionic app now includes a **QR Code Scanner** feature that allows users to scan the ngrok tunnel QR code and automatically configure their backend API URL.

## How It Works

1. **User opens Settings** → Goes to `/settings` page
2. **User scans QR code** → From the ngrok tunnel terminal
3. **URL is saved** → Automatically stored and used for all API calls
4. **App connects to backend** → All requests use the scanned URL

---

## Setup Steps

### 1. Install Dependencies (Already Done ✅)
```sh
npm install @ionic-native/qr-scanner@5.36.0 --legacy-peer-deps
```

### 2. Add Permission to `capacitor.config.json`
Make sure your `capacitor.config.json` includes camera permissions:

```json
{
  "plugins": {
    "Camera": {
      "permissions": ["camera"]
    }
  }
}
```

Or in `AndroidManifest.xml` (if using older method):
```xml
<uses-permission android:name="android.permission.CAMERA" />
```

### 3. Access Settings Page
Add a link to settings in your app navigation (e.g., in a menu or profile page):
```html
<ion-button routerLink="/settings">
  <ion-icon name="settings-outline"></ion-icon>
  Settings
</ion-button>
```

---

## User Workflow

### For Development/Testing:

1. **Start your Laravel backend** and ngrok tunnel:
   ```
   cd laravel-backend
   powershell -ExecutionPolicy Bypass -File .\start-with-qr.ps1
   ```

2. **QR code will appear** in your browser (or run `start-with-qr.bat`)

3. **Open your Ionic app** on Android (use `ionic capacitor run android`)

4. **Navigate to Settings** (/settings)

5. **Click "Scan QR Code"** button

6. **Point your phone camera** at the QR code on your screen

7. **URL is automatically saved** ✅

8. **All API requests now use the ngrok URL** automatically!

---

## Files Created/Modified

### New Files:
- `src/app/services/qr-scanner.service.ts` - Handles QR scanning & URL storage
- `src/app/services/api-config.service.ts` - Provides dynamic API URL
- `src/app/pages/settings/settings.page.ts` - UI for settings
- `src/app/pages/settings/settings.page.html` - Settings template
- `src/app/pages/settings/settings.page.scss` - Styling

### Modified Files:
- `src/app/app-routing.module.ts` - Added `/settings` route
- `src/app/services/user.service.ts` - Updated to use dynamic API URL

---

## Features

✅ **Scan QR Code** - Quick and easy URL configuration  
✅ **Manual URL Entry** - Fallback option for manual entry  
✅ **Persistent Storage** - URL saved in browser localStorage  
✅ **Automatic API Usage** - All services use the saved URL  
✅ **Copy to Clipboard** - Quick URL sharing  
✅ **Clear Settings** - Reset to default configuration  

---

## API Integration

All services that use `ApiConfigService` will automatically use the scanned URL:

```typescript
// In any service:
constructor(private apiConfigService: ApiConfigService) {}

// Get current API URL:
const url = this.apiConfigService.getApiUrl();

// Get as Observable (for reactive components):
this.apiConfigService.getApiUrl$().subscribe(url => {
  console.log('Backend URL:', url);
});

// Build an endpoint:
const endpoint = this.apiConfigService.getEndpoint('/user/profile');
```

---

## Updating Other Services

To update other services to use the dynamic API URL, follow the pattern in `user.service.ts`:

1. **Inject ApiConfigService**:
   ```typescript
   constructor(
     private http: HttpClient,
     private apiConfigService: ApiConfigService
   ) {}
   ```

2. **Add getter for apiUrl**:
   ```typescript
   private get apiUrl(): string {
     return this.apiConfigService.getApiUrl();
   }
   ```

3. **Use `this.apiUrl`** in API calls (no changes needed to existing code!)

---

## Troubleshooting

### "Camera Permission Denied"
- Make sure you granted camera permissions to the app
- On Android 13+, request permissions in-app using Capacitor/Ionic

### "QR Code Not Detected"
- Ensure good lighting
- Hold phone steady
- Make sure QR code is clearly visible
- QR code must contain a valid URL

### "URL Saved But Not Working"
- Check that the ngrok URL is still active (ngrok URLs expire after 2 hours on free plan)
- Restart ngrok to get a new URL and re-scan
- Check network connectivity

---

## Testing the Integration

### Test 1: Scan and Save URL
1. Scan QR code
2. Check Settings page shows the URL
3. Refresh the page - URL should still be there

### Test 2: API Requests Work
1. Scan QR code
2. Make any API request in your app (e.g., load profile)
3. Check Network tab in DevTools - request should go to the ngrok URL

### Test 3: Fallback to Default
1. Clear the saved URL
2. App should fall back to `environment.apiUrl`

---

## Next Steps

- Add a Settings button to your app's navigation/menu
- Test with real Android device
- Share the QR code with teammates for testing
- Deploy with confidence! 🚀

---

## Questions?

For detailed implementation questions, check:
- `QrScannerService` - QR scanning logic
- `ApiConfigService` - Dynamic URL management
- `SettingsPage` - UI implementation

Enjoy! 🎉
