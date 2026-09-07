/**
 * Axios Request & Response Interceptors
 * Attaches JWT Bearer token, handles genuine 401 Unauthorized token expirations, and handles network errors.
 */

import axios, { AxiosInstance, InternalAxiosRequestConfig, AxiosResponse, AxiosError } from 'axios';
import { tokenStorage } from '@/storage/tokenStorage';
import { ENV } from '@/config/env';

interface CustomAxiosRequestConfig extends InternalAxiosRequestConfig {
  _retry?: boolean;
}

let isRefreshing = false;
let failedQueue: any[] = [];

const processQueue = (error: any, token: string | null = null) => {
  failedQueue.forEach(prom => {
    if (error) {
      prom.reject(error);
    } else {
      prom.resolve(token);
    }
  });
  failedQueue = [];
};

export const setupInterceptors = (axiosInstance: AxiosInstance): void => {
  // 1. Request Interceptor
  axiosInstance.interceptors.request.use(
    async (config: CustomAxiosRequestConfig) => {
      let token = await tokenStorage.getAccessToken();
      if (!token) {
        try {
          const { useAuthStore } = require('@/store/authStore');
          token = useAuthStore.getState().token;
        } catch {}
      }
      if (token && config.headers) {
        config.headers.Authorization = `Bearer ${token}`;
      }
      return config;
    },
    (error: AxiosError) => {
      return Promise.reject(error);
    }
  );

  // 2. Response Interceptor
  axiosInstance.interceptors.response.use(
    (response: AxiosResponse) => response,
    async (error: AxiosError) => {
      const originalRequest = error.config as CustomAxiosRequestConfig;
      const status = error.response?.status;
      const requestUrl = originalRequest?.url || '';
      const hadAuthHeader = !!originalRequest?.headers?.Authorization;
      const isAuthEndpoint =
        requestUrl.includes('/auth/login') ||
        requestUrl.includes('/auth/register') ||
        requestUrl.includes('/auth/forgot-password') ||
        requestUrl.includes('/auth/refresh');

      // Handle 401 Unauthorized errors by refreshing the token
      if (status === 401 && hadAuthHeader && !isAuthEndpoint && !originalRequest._retry) {
        if (isRefreshing) {
          return new Promise(function (resolve, reject) {
            failedQueue.push({ resolve, reject });
          })
            .then(token => {
              if (originalRequest.headers) {
                originalRequest.headers.Authorization = 'Bearer ' + token;
              }
              return axiosInstance(originalRequest);
            })
            .catch(err => {
              return Promise.reject(err);
            });
        }

        originalRequest._retry = true;
        isRefreshing = true;

        const refreshToken = await tokenStorage.getRefreshToken();
        if (refreshToken) {
          try {
            const { data } = await axios.post(`${ENV.API_BASE_URL}/auth/refresh`, {
              refresh_token: refreshToken
            });

            const newAccessToken = data?.data?.access_token;
            const newRefreshToken = data?.data?.refresh_token;

            if (newAccessToken && newRefreshToken) {
              await tokenStorage.setAccessToken(newAccessToken);
              await tokenStorage.setRefreshToken(newRefreshToken);
              
              try {
                const { useAuthStore } = require('@/store/authStore');
                useAuthStore.setState({ token: newAccessToken });
              } catch {}

              if (originalRequest.headers) {
                originalRequest.headers.Authorization = `Bearer ${newAccessToken}`;
              }
              
              processQueue(null, newAccessToken);
              return axiosInstance(originalRequest);
            }
          } catch (refreshError) {
            processQueue(refreshError, null);
          } finally {
            isRefreshing = false;
          }
        }

        // If refresh fails or no refresh token, log out
        console.warn('401 Unauthorized with expired/invalid session token - Clearing auth state');
        await tokenStorage.clearTokens();
        try {
          const { useAuthStore } = require('@/store/authStore');
          useAuthStore.getState().logout();
        } catch {}
        return Promise.reject(error);
      }

      // Only trigger session cleanup if an existing authenticated session got rejected
      if (status === 401 && hadAuthHeader && !isAuthEndpoint) {
        console.warn('401 Unauthorized with expired/invalid session token - Clearing auth state');
        await tokenStorage.clearTokens();
        try {
          const { useAuthStore } = require('@/store/authStore');
          useAuthStore.getState().logout();
        } catch {}
      }

      // Safe Diagnostic Logging (excludes sensitive tokens/passwords)
      console.error('[API DEBUG] Network Error Details:');
      console.error(`- Base URL: ${originalRequest?.baseURL}`);
      console.error(`- Path: ${originalRequest?.url}`);
      console.error(`- Full URL: ${originalRequest?.baseURL}${originalRequest?.url}`);
      console.error(`- Method: ${originalRequest?.method?.toUpperCase()}`);
      console.error(`- Timeout Config: ${originalRequest?.timeout}ms`);
      console.error(`- Error Message: ${error.message}`);
      console.error(`- Error Code: ${error.code}`);
      console.error(`- HTTP Status: ${status || 'No Response (Network/CORS/Blocked)'}`);
      if (error.response?.data) {
        console.error(`- Response Data: ${JSON.stringify(error.response.data).substring(0, 200)}`);
      }

      const serverData = error.response?.data as any;
      const customMessage =
        serverData?.message ||
        serverData?.detail ||
        (typeof serverData === 'string' ? serverData : null) ||
        error.message ||
        'An unexpected API error occurred.';
      let finalMessage = typeof customMessage === 'string' ? customMessage : JSON.stringify(customMessage);

      const isTimeout =
        error.code === 'ECONNABORTED' ||
        (typeof error.message === 'string' && error.message.toLowerCase().includes('timeout'));

      // If it's a timeout or network error, format the message clearly
      if (isTimeout) {
        finalMessage = 'Connection timed out. The server was sleeping and is waking up. Please try again now.';
      } else if (finalMessage.includes('Network Error') || !status) {
        finalMessage = `Network Error (Attempted: ${originalRequest?.baseURL}${originalRequest?.url})`;
      }

      return Promise.reject({
        message: finalMessage,
        status: status || 500,
        response: error.response,
        originalError: error,
      });
    }
  );
};
