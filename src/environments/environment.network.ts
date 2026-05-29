// Environment configuration for different network setups
export const environment = {
  production: false,
  // Choose one of these based on your needs:
  
  // Option 1: Local machine only (default)
  apiUrl: 'http://localhost:8000/api',
  
  // Option 2: Local network (other devices on same WiFi)
  // apiUrl: 'http://192.168.1.x:8000/api', // Replace with your local IP
  
  // Option 3: If running on different machine on local network
  // apiUrl: 'http://192.168.1.100:8000/api',
  
  spoonacular: {
    apiKey: 'dd401666a6f944fabefcc73a78db06c7',
    baseUrl: 'https://api.spoonacular.com'
  }
};
