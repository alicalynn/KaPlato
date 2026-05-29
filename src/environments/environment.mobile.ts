export const environment = {
  production: false,
  enableLogging: true,
  performance: {
    enableDebugMode: true,
    lazyLoadDelay: 100
  },
  // apiUrl: 'https://dreamily-detective-avoid.ngrok-free.dev/api', // Laravel API URL via ngrok tunnel for mobile access
  apiUrl: 'http://localhost:8000/api', // Local Laravel API URL for development
  spoonacular: {
    apiKey: 'dd401666a6f944fabefcc73a78db06c7',
    baseUrl: 'https://api.spoonacular.com'
  }
};