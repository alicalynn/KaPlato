export const environment = {
  production: true,
  apiUrl: 'https://bodacious-cascade-onshore.ngrok-free.dev/api', // ngrok tunnel for mobile testing
  spoonacular: {
    apiKey: '', // API key must be set via backend endpoint - never expose in frontend
    baseUrl: 'https://api.spoonacular.com'
  }
};
