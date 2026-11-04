import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { authService, GoogleAuthPayload, InstagramAuthPayload } from '@/services/authService';
import { tokenStorage } from '@/storage/tokenStorage';

export interface UserProfile {
  id: string;
  name: string;
  email: string;
  role: 'user' | 'admin';
  membership: string;
  ordersCount: number;
  avatarUrl?: string;
  phone?: string;
  hasCompletedOnboarding?: boolean;
}

export interface AuthState {
  user: UserProfile | null;
  token: string | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  error: string | null;

  // Actions
  login: (email: string, password?: string) => Promise<boolean>;
  loginWithGoogle: (payload: GoogleAuthPayload) => Promise<boolean>;
  loginWithInstagram: (payload: InstagramAuthPayload) => Promise<boolean>;
  register: (
    name: string,
    email: string,
    password?: string,
    phone?: string,
    confirmPassword?: string
  ) => Promise<boolean>;
  resetPassword: (
    email: string,
    password?: string,
    confirmPassword?: string
  ) => Promise<boolean>;
  logout: () => void;
  updateProfile: (partialUser: Partial<UserProfile>) => void;
  completeOnboarding: () => Promise<void>;
  resetOnboarding: () => Promise<void>;
  resetAuth: () => void;
}

const customStorage = {
  getItem: async (name: string): Promise<string | null> => {
    try {
      const asyncVal = await AsyncStorage.getItem(name);
      if (asyncVal !== null) return asyncVal;
      if (typeof window !== 'undefined' && window.localStorage) {
        return window.localStorage.getItem(name);
      }
      return null;
    } catch {
      if (typeof window !== 'undefined' && window.localStorage) {
        return window.localStorage.getItem(name);
      }
      return null;
    }
  },
  setItem: async (name: string, value: string): Promise<void> => {
    try {
      await AsyncStorage.setItem(name, value);
      if (typeof window !== 'undefined' && window.localStorage) {
        window.localStorage.setItem(name, value);
      }
    } catch {
      if (typeof window !== 'undefined' && window.localStorage) {
        window.localStorage.setItem(name, value);
      }
    }
  },
  removeItem: async (name: string): Promise<void> => {
    try {
      await AsyncStorage.removeItem(name);
      if (typeof window !== 'undefined' && window.localStorage) {
        window.localStorage.removeItem(name);
      }
    } catch {
      if (typeof window !== 'undefined' && window.localStorage) {
        window.localStorage.removeItem(name);
      }
    }
  },
};

const normalizeUser = (user: any): UserProfile | null => {
  if (!user) return null;
  return {
    ...user,
    role: (typeof user.role === 'string' ? user.role.toLowerCase() : user.role) as 'user' | 'admin',
    hasCompletedOnboarding: Boolean(user.has_completed_onboarding ?? user.hasCompletedOnboarding),
  };
};

export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      user: null,
      token: null,
      isAuthenticated: false,
      isLoading: false,
      error: null,

      login: async (email, password) => {
        set({ isLoading: true, error: null });
        try {
          const response = await authService.login(email, password);
          await tokenStorage.setAccessToken(response.accessToken);
          await tokenStorage.setRefreshToken(response.refreshToken);
          set({
            user: normalizeUser(response.user),
            token: response.accessToken,
            isAuthenticated: true,
            isLoading: false,
            error: null,
          });
          // Rehydrate Cart & Wishlist from MongoDB Atlas for this authenticated user
          try {
            const { useCartStore } = require('@/store/cartStore');
            const { useWishlistStore } = require('@/store/wishlistStore');
            useCartStore.getState().fetchCart();
            useWishlistStore.getState().fetchWishlist();
          } catch {}
          return true;
        } catch (err: any) {
          set({
            isLoading: false,
            error: err.message || 'Login failed.',
          });
          return false;
        }
      },

      loginWithGoogle: async (payload) => {
        set({ isLoading: true, error: null });
        try {
          const response = await authService.loginWithGoogle(payload);
          await tokenStorage.setAccessToken(response.accessToken);
          await tokenStorage.setRefreshToken(response.refreshToken);
          set({
            user: normalizeUser(response.user),
            token: response.accessToken,
            isAuthenticated: true,
            isLoading: false,
            error: null,
          });
          // Rehydrate Cart & Wishlist from MongoDB Atlas for this authenticated user
          try {
            const { useCartStore } = require('@/store/cartStore');
            const { useWishlistStore } = require('@/store/wishlistStore');
            useCartStore.getState().fetchCart();
            useWishlistStore.getState().fetchWishlist();
          } catch {}
          return true;
        } catch (err: any) {
          set({
            isLoading: false,
            error: err.message || 'Google login failed.',
          });
          return false;
        }
      },

      loginWithInstagram: async (payload) => {
        set({ isLoading: true, error: null });
        try {
          const response = await authService.loginWithInstagram(payload);
          await tokenStorage.setAccessToken(response.accessToken);
          await tokenStorage.setRefreshToken(response.refreshToken);
          set({
            user: normalizeUser(response.user),
            token: response.accessToken,
            isAuthenticated: true,
            isLoading: false,
            error: null,
          });
          try {
            const { useCartStore } = require('@/store/cartStore');
            const { useWishlistStore } = require('@/store/wishlistStore');
            useCartStore.getState().fetchCart();
            useWishlistStore.getState().fetchWishlist();
          } catch {}
          return true;
        } catch (err: any) {
          set({
            isLoading: false,
            error: err.message || 'Instagram login failed.',
          });
          return false;
        }
      },

      register: async (name, email, password, phone, confirmPassword) => {
        set({ isLoading: true, error: null });
        try {
          const response = await authService.register(
            name,
            email,
            password,
            phone,
            confirmPassword
          );
          await tokenStorage.setAccessToken(response.accessToken);
          await tokenStorage.setRefreshToken(response.refreshToken);
          set({
            user: normalizeUser(response.user),
            token: response.accessToken,
            isAuthenticated: true,
            isLoading: false,
            error: null,
          });
          // Rehydrate Cart & Wishlist from MongoDB Atlas for this newly registered user
          try {
            const { useCartStore } = require('@/store/cartStore');
            const { useWishlistStore } = require('@/store/wishlistStore');
            useCartStore.getState().fetchCart();
            useWishlistStore.getState().fetchWishlist();
          } catch {}
          return true;
        } catch (err: any) {
          set({
            isLoading: false,
            error: err.message || 'Registration failed.',
          });
          return false;
        }
      },

      resetPassword: async (email, password, confirmPassword) => {
        set({ isLoading: true, error: null });
        try {
          const response = await authService.resetPassword(
            email,
            password,
            confirmPassword
          );
          await tokenStorage.setAccessToken(response.accessToken);
          await tokenStorage.setRefreshToken(response.refreshToken);
          set({
            user: response.user,
            token: response.accessToken,
            isAuthenticated: true,
            isLoading: false,
            error: null,
          });
          return true;
        } catch (err: any) {
          set({
            isLoading: false,
            error: err.message || 'Password reset failed.',
          });
          return false;
        }
      },

      logout: () => {
        tokenStorage.clearTokens();
        try {
          const { useCartStore } = require('@/store/cartStore');
          const { useWishlistStore } = require('@/store/wishlistStore');
          useCartStore.getState().resetCartStore();
          useWishlistStore.getState().resetWishlistStore();
        } catch {}
        set({
          user: null,
          token: null,
          isAuthenticated: false,
          error: null,
        });
      },

      updateProfile: (partialUser) => {
        set((state) => ({
          user: state.user ? { ...state.user, ...partialUser } : (partialUser as UserProfile),
          isAuthenticated: true,
        }));
      },

      completeOnboarding: async () => {
        set((state) => ({
          user: state.user ? { ...state.user, hasCompletedOnboarding: true } : null,
        }));
        try {
          await authService.completeOnboarding();
        } catch {}
      },

      resetOnboarding: async () => {
        set((state) => ({
          user: state.user ? { ...state.user, hasCompletedOnboarding: false } : null,
        }));
        try {
          await authService.resetOnboarding();
        } catch {}
      },

      resetAuth: () => {
        tokenStorage.clearTokens();
        set({
          user: null,
          token: null,
          isAuthenticated: false,
          isLoading: false,
          error: null,
        });
      },
    }),
    {
      name: '@cloudcrackers_auth_state',
      storage: createJSONStorage(() => customStorage),
      partialize: (state) => ({
        user: state.user,
        token: state.token,
        isAuthenticated: state.isAuthenticated,
      }),
    }
  )
);
