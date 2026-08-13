import { create } from 'zustand';
import { ProductItem } from '@/constants/mockData';

export interface WishlistState {
  wishlistItems: ProductItem[];

  // Actions
  toggleWishlist: (product: ProductItem) => void;
  removeFromWishlist: (productId: string) => void;
  isInWishlist: (productId: string) => boolean;
  clearWishlist: () => void;
  resetWishlistStore: () => void;
}

export const useWishlistStore = create<WishlistState>((set, get) => ({
  // Initialize with empty array so ONLY user-liked items appear
  wishlistItems: [],

  toggleWishlist: (product) => {
    set((state) => {
      const exists = state.wishlistItems.some((item) => item.id === product.id);
      if (exists) {
        return {
          wishlistItems: state.wishlistItems.filter(
            (item) => item.id !== product.id
          ),
        };
      }
      return { wishlistItems: [...state.wishlistItems, product] };
    });
  },

  removeFromWishlist: (productId) => {
    set((state) => ({
      wishlistItems: state.wishlistItems.filter(
        (item) => item.id !== productId
      ),
    }));
  },

  isInWishlist: (productId) => {
    return get().wishlistItems.some((item) => item.id === productId);
  },

  clearWishlist: () => {
    set({ wishlistItems: [] });
  },

  resetWishlistStore: () => {
    set({ wishlistItems: [] });
  },
}));
