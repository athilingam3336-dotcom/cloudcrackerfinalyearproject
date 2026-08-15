/**
 * AuthProvider Context Component
 * Handles initial app load authentication checks, token retrieval, and auth context lifecycle.
 */

import React, { createContext, useContext, useEffect, useState } from 'react';
import { useAuthStore, UserProfile } from '@/store/authStore';
import { useCartStore } from '@/store/cartStore';
import { useWishlistStore } from '@/store/wishlistStore';
import { tokenStorage } from '@/storage/tokenStorage';
import { profileService } from '@/services/profileService';

interface AuthContextType {
  user: UserProfile | null;
  isAuthenticated: boolean;
  isLoading: boolean;
}

const AuthContext = createContext<AuthContextType>({
  user: null,
  isAuthenticated: false,
  isLoading: true,
});

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { user, isAuthenticated, updateProfile } = useAuthStore();
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const checkTokenOnLaunch = async () => {
      try {
        const storedToken = await tokenStorage.getAccessToken();
        if (storedToken) {
          // Rehydrate profile from MongoDB Atlas with existing valid token
          const profile = await profileService.getProfile();
          if (profile) {
            updateProfile(profile);
          }
          // Rehydrate user's persistent Cart & Wishlist from MongoDB Atlas
          await Promise.allSettled([
            useCartStore.getState().fetchCart(),
            useWishlistStore.getState().fetchWishlist(),
          ]);
        }
      } catch (e) {
        console.warn('Auth token initialization check note:', e);
      } finally {
        setIsLoading(false);
      }
    };
    checkTokenOnLaunch();
  }, [user, updateProfile]);

  return (
    <AuthContext.Provider value={{ user, isAuthenticated, isLoading }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuthContext = () => useContext(AuthContext);
export default AuthProvider;
