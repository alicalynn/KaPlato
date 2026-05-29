// Environment configuration for different network setups
export const environment = {
  production: false,
  // Choose one of these based on your needs:
  
  // Option 1: Local machine only (default)
  apiUrl: 'http://localhost:8000/api',
  // apiUrl: 'https://bodacious-cascade-onshore.ngrok-free.dev/api',
  
  // Option 2: Local network (other devices on same WiFi)
  // apiUrl: 'http://172.20.10.9:8000/api',
  
  // Option 3: Public access via playit.gg (when tunnel is running)
  // apiUrl: 'https://your-tunnel-name.playit.gg/api',
  
  spoonacular: {
    apiKey: 'dd401666a6f944fabefcc73a78db06c7',
    baseUrl: 'https://api.spoonacular.com'
  }
};
