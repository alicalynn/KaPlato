export const environment = {
  production: false,
  enableLogging: true,
  performance: {
    enableDebugMode: true,
    lazyLoadDelay: 100
  },
  apiUrl: 'http://localhost:8000/api', // Laravel API URL
  spoonacular: {
    apiKey: 'dd401666a6f944fabefcc73a78db06c7',
    baseUrl: 'https://api.spoonacular.com'
  }
};