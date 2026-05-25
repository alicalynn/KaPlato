// This file can be replaced during build by using the `fileReplacements` array.
// `ng build` replaces `environment.ts` with `environment.prod.ts`.
// The list of file replacements can be found in `angular.json`.

export const environment = {
  production: false,
  enableLogging: true,
  performance: {
    enableDebugMode: false,
    lazyLoadDelay: 100
  },
  // apiUrl: 'http://localhost:8000/api', // Change to your backend URL - stored in .env for flexibility
  // apiUrl: 'http://localhost:8000/api',
  apiUrl: 'https://bodacious-cascade-onshore.ngrok-free.dev/api',
  spoonacular: {
    apiKey: '', // API key must be set via backend endpoint - never expose in frontend
    baseUrl: 'https://api.spoonacular.com'
  }
};

/*
 * For easier debugging in development mode, you can import the following file
 * to ignore zone related error stack frames such as `zone.run`, `zoneDelegate.invokeTask`.
 *
 * This import should be commented out in production mode because it will have a negative impact
 * on performance if an error is thrown.
 */
// import 'zone.js/plugins/zone-error';  // Included with Angular CLI.
