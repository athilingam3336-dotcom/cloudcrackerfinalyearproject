import { Platform } from 'react-native';

const PROD_API_URL = 'https://cloudcrackerfinalyearproject.onrender.com/api/v1';

const getApiBaseUrl = (): string => {
  let envUrl = process.env.EXPO_PUBLIC_API_URL || PROD_API_URL;

  // On Web Platform in Browser
  if (Platform.OS === 'web' && typeof window !== 'undefined') {
    const host = window.location.hostname || 'localhost';
    if (envUrl.includes('localhost') || envUrl.includes('127.0.0.1')) {
      envUrl = envUrl.replace(/localhost|127\.0\.0\.1/g, host);
    }
  } else if (Platform.OS !== 'web') {
    // On Native Mobile App
    if (envUrl.includes('localhost') || envUrl.includes('127.0.0.1')) {
      envUrl = envUrl.replace(/localhost|127\.0\.0\.1/g, '10.82.144.11');
      console.log(`[API Config] Mobile auto-rewrote localhost to LAN IP: ${envUrl}`);
    }
  }

  return envUrl;
};

export const ENV = {
  API_BASE_URL: getApiBaseUrl(),

  TIMEOUT: 60000, // 60 seconds (accommodates Render free tier cold starts)
  ENABLE_MOCK_API: process.env.EXPO_PUBLIC_ENABLE_MOCK === 'true' ? true : false,
  GOOGLE_CLIENT_ID: process.env.EXPO_PUBLIC_GOOGLE_CLIENT_ID || '440996806558-k2ocedpa3p6ccv0m5a891c6fuqh65rqa.apps.googleusercontent.com',
  INSTAGRAM_CLIENT_ID: process.env.EXPO_PUBLIC_INSTAGRAM_CLIENT_ID || '2262885951230627',
  OPENAI_API_KEY: process.env.EXPO_PUBLIC_OPENAI_API_KEY || '',
  APP_VERSION: '2.4.0',
  ENV_NAME: process.env.NODE_ENV || 'development',
};

export default ENV;
