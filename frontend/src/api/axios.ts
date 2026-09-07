/**
 * Axios Client Instance Setup
 * Configures base URL, timeout, headers, and attaches interceptors.
 */

import axios, { AxiosInstance } from 'axios';
import { ENV } from '@/config/env';
import { setupInterceptors } from './interceptors';

export const apiClient: AxiosInstance = axios.create({
  baseURL: ENV.API_BASE_URL,
  timeout: ENV.TIMEOUT,
  headers: {
    'Content-Type': 'application/json',
    Accept: 'application/json',
  },
});

// Configure interceptors
setupInterceptors(apiClient);

export default apiClient;
