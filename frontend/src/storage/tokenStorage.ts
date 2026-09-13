/**
 * Secure Token Storage Utility
 * Manages JWT Access and Refresh Tokens with Web and Native persistence.
 */

import AsyncStorage from '@react-native-async-storage/async-storage';
import { STORAGE_KEYS } from '@/utils/constants';

class TokenStorage {
  private memoryStore: Map<string, string> = new Map();

  async setAccessToken(token: string): Promise<void> {
    try {
      this.memoryStore.set(STORAGE_KEYS.ACCESS_TOKEN, token);
      await AsyncStorage.setItem(STORAGE_KEYS.ACCESS_TOKEN, token);
      if (typeof window !== 'undefined' && window.localStorage) {
        window.localStorage.setItem(STORAGE_KEYS.ACCESS_TOKEN, token);
      }
    } catch (e) {
      console.warn('Error saving access token to storage:', e);
    }
  }

  async getAccessToken(): Promise<string | null> {
    try {
      if (this.memoryStore.has(STORAGE_KEYS.ACCESS_TOKEN)) {
        return this.memoryStore.get(STORAGE_KEYS.ACCESS_TOKEN) || null;
      }
      const asyncVal = await AsyncStorage.getItem(STORAGE_KEYS.ACCESS_TOKEN);
      if (asyncVal) {
        this.memoryStore.set(STORAGE_KEYS.ACCESS_TOKEN, asyncVal);
        return asyncVal;
      }
      if (typeof window !== 'undefined' && window.localStorage) {
        const val = window.localStorage.getItem(STORAGE_KEYS.ACCESS_TOKEN);
        if (val) this.memoryStore.set(STORAGE_KEYS.ACCESS_TOKEN, val);
        return val;
      }
      return null;
    } catch (e) {
      return null;
    }
  }

  async setRefreshToken(token: string): Promise<void> {
    try {
      this.memoryStore.set(STORAGE_KEYS.REFRESH_TOKEN, token);
      await AsyncStorage.setItem(STORAGE_KEYS.REFRESH_TOKEN, token);
      if (typeof window !== 'undefined' && window.localStorage) {
        window.localStorage.setItem(STORAGE_KEYS.REFRESH_TOKEN, token);
      }
    } catch (e) {
      console.warn('Error saving refresh token to storage:', e);
    }
  }

  async getRefreshToken(): Promise<string | null> {
    try {
      if (this.memoryStore.has(STORAGE_KEYS.REFRESH_TOKEN)) {
        return this.memoryStore.get(STORAGE_KEYS.REFRESH_TOKEN) || null;
      }
      const asyncVal = await AsyncStorage.getItem(STORAGE_KEYS.REFRESH_TOKEN);
      if (asyncVal) return asyncVal;
      if (typeof window !== 'undefined' && window.localStorage) {
        return window.localStorage.getItem(STORAGE_KEYS.REFRESH_TOKEN);
      }
      return null;
    } catch (e) {
      return null;
    }
  }

  async clearTokens(): Promise<void> {
    try {
      this.memoryStore.clear();
      await AsyncStorage.removeItem(STORAGE_KEYS.ACCESS_TOKEN);
      await AsyncStorage.removeItem(STORAGE_KEYS.REFRESH_TOKEN);
      if (typeof window !== 'undefined' && window.localStorage) {
        window.localStorage.removeItem(STORAGE_KEYS.ACCESS_TOKEN);
        window.localStorage.removeItem(STORAGE_KEYS.REFRESH_TOKEN);
      }
    } catch (e) {
      console.warn('Error clearing tokens:', e);
    }
  }
}

export const tokenStorage = new TokenStorage();
export default tokenStorage;
