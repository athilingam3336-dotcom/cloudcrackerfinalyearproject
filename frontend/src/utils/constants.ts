/**
 * Application Constants
 * API Endpoints, Storage Keys, and HTTP Status Codes.
 */

export const STORAGE_KEYS = {
  ACCESS_TOKEN: '@cloudcrackers_access_token',
  REFRESH_TOKEN: '@cloudcrackers_refresh_token',
  USER_PROFILE: '@cloudcrackers_user_profile',
  THEME_PREFERENCE: '@cloudcrackers_theme',
};

export const API_ENDPOINTS = {
  // Auth
  LOGIN: '/auth/login',
  REGISTER: '/auth/register',
  FORGOT_PASSWORD: '/auth/forgot-password',
  REFRESH_TOKEN: '/auth/refresh',
  LOGOUT: '/auth/logout',

  // Catalog
  PRODUCTS: '/products',
  CATEGORIES: '/categories',

  // User Commerce
  CART: '/cart',
  WISHLIST: '/wishlist',
  ORDERS: '/orders',
  PROFILE: '/profile',
  NOTIFICATIONS: '/notifications',

  // Admin
  ADMIN_OVERVIEW: '/admin/overview',
  ADMIN_PRODUCTS: '/admin/products',
};

export const HTTP_STATUS = {
  OK: 200,
  CREATED: 201,
  BAD_REQUEST: 400,
  UNAUTHORIZED: 401,
  FORBIDDEN: 403,
  NOT_FOUND: 404,
  INTERNAL_SERVER_ERROR: 500,
};
