import { Platform } from 'react-native';

const PROD_API_URL = 'https://cloudcrackerfinalyearproject.onrender.com/api/v1';

const getApiBaseUrl = (): string => {
  const envUrl = process.env.EXPO_PUBLIC_API_URL || PROD_API_URL;

  // On Native Mobile App (Expo Go on mobile phone via QR code)
  if (Platform.OS !== 'web') {
    // Mobile phone cannot reach laptop's 'localhost'. Automatically use production API so QR code works 100%!
    if (envUrl.includes('localhost') || envUrl.includes('127.0.0.1')) {
      return PROD_API_URL;
    }
  }

  return envUrl;
};

export const ENV = {
  API_BASE_URL: getApiBaseUrl(),

  TIMEOUT: 60000, // 60 seconds (accommodates Render free tier cold starts)
  ENABLE_MOCK_API: process.env.EXPO_PUBLIC_ENABLE_MOCK === 'true' ? true : false,
  GOOGLE_CLIENT_ID: process.env.EXPO_PUBLIC_GOOGLE_CLIENT_ID || '440996806558-b3bfcqr7j19rkiefsaqk2lffshuoh0cm.apps.googleusercontent.com',
  INSTAGRAM_CLIENT_ID: process.env.EXPO_PUBLIC_INSTAGRAM_CLIENT_ID || '2262885951230627',
  APP_VERSION: '2.4.0',
  ENV_NAME: process.env.NODE_ENV || 'development',
};

export default ENV;
