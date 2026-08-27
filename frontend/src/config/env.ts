/**
 * Environment Configuration
 * Centralized location for environment variables and API endpoints.
 */

export const ENV = {
  API_BASE_URL: process.env.EXPO_PUBLIC_API_URL || 'https://cloudcrackerfinalyearproject.onrender.com/api/v1',

  TIMEOUT: 60000, // 60 seconds (accommodates Render free tier cold starts)
  ENABLE_MOCK_API: process.env.EXPO_PUBLIC_ENABLE_MOCK === 'true' ? true : false,
  GOOGLE_CLIENT_ID: process.env.EXPO_PUBLIC_GOOGLE_CLIENT_ID || '440996806558-b3bfcqr7j19rkiefsaqk2lffshuoh0cm.apps.googleusercontent.com',
  APP_VERSION: '2.4.0',
  ENV_NAME: process.env.NODE_ENV || 'development',
};

export default ENV;
