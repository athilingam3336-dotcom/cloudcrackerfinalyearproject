import { create } from 'zustand';
import { ProductItem } from '@/constants/mockData';
import { wishlistService } from '@/services/wishlistService';

export interface WishlistState {
  wishlistItems: ProductItem[];
  isLoading: boolean;

  // Actions
  fetchWishlist: () => Promise<void>;
  toggleWishlist: (product: ProductItem) => void;
  removeFromWishlist: (productId: string) => void;
  isInWishlist: (productId: string) => boolean;
  clearWishlist: () => void;
  resetWishlistStore: () => void;
}

export const useWishlistStore = create<WishlistState>((set, get) => ({
  // Initialize with empty array so ONLY user-liked items appear
  wishlistItems: [],
  isLoading: false,

  fetchWishlist: async () => {
    set({ isLoading: true });
    try {
      const items = await wishlistService.getWishlist();
      set({ wishlistItems: items || [], isLoading: false });
    } catch {
      set({ isLoading: false });
    }
  },

  toggleWishlist: (product) => {
    const exists = get().wishlistItems.some((item) => item.id === product.id);
    if (exists) {
      set((state) => ({
        wishlistItems: state.wishlistItems.filter((item) => item.id !== product.id),
      }));
      wishlistService.removeFromWishlist(product.id);
    } else {
      set((state) => ({
        wishlistItems: [...state.wishlistItems, product],
      }));
      wishlistService.addToWishlist(product.id);
    }
  },

  removeFromWishlist: (productId) => {
    set((state) => ({
      wishlistItems: state.wishlistItems.filter((item) => item.id !== productId),
    }));
    wishlistService.removeFromWishlist(productId);
  },

  isInWishlist: (productId) => {
    return get().wishlistItems.some((item) => item.id === productId);
  },

  clearWishlist: () => {
    set({ wishlistItems: [] });
    wishlistService.clearWishlist();
  },

  resetWishlistStore: () => {
    set({ wishlistItems: [], isLoading: false });
  },
}));
