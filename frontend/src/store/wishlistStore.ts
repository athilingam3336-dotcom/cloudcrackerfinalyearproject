import { create } from 'zustand';
import { ProductItem } from '@/constants/mockData';
import { wishlistService } from '@/services/wishlistService';

export interface WishlistState {
  wishlistItems: ProductItem[];
  isLoading: boolean;

  // Actions
  fetchWishlist: () => Promise<void>;
  toggleWishlist: (product: ProductItem) => Promise<boolean>;
  addToWishlist: (product: ProductItem) => Promise<boolean>;
  removeFromWishlist: (productId: string) => Promise<boolean>;
  isInWishlist: (productId: string) => boolean;
  clearWishlist: () => Promise<void>;
  resetWishlistStore: () => void;
}

export const useWishlistStore = create<WishlistState>((set, get) => ({
  wishlistItems: [],
  isLoading: false,

  fetchWishlist: async () => {
    set({ isLoading: true });
    try {
      const items = await wishlistService.getWishlist();
      set({ wishlistItems: items || [], isLoading: false });
    } catch {
      set({ wishlistItems: [], isLoading: false });
    }
  },

  toggleWishlist: async (product) => {
    if (!product?.id) {
      throw new Error('Invalid product ID.');
    }
    const exists = get().wishlistItems.some((item) => item.id === product.id);
    set({ isLoading: true });
    try {
      if (exists) {
        await wishlistService.removeFromWishlist(product.id);
      } else {
        await wishlistService.addToWishlist(product.id);
      }
      const updated = await wishlistService.getWishlist();
      set({ wishlistItems: updated || [], isLoading: false });
      return !exists;
    } catch (error) {
      set({ isLoading: false });
      throw error;
    }
  },

  addToWishlist: async (product) => {
    if (!product?.id) {
      throw new Error('Invalid product ID.');
    }
    set({ isLoading: true });
    try {
      await wishlistService.addToWishlist(product.id);
      const updated = await wishlistService.getWishlist();
      set({ wishlistItems: updated || [], isLoading: false });
      return true;
    } catch (error) {
      set({ isLoading: false });
      throw error;
    }
  },

  removeFromWishlist: async (productId) => {
    set({ isLoading: true });
    try {
      await wishlistService.removeFromWishlist(productId);
      const updated = await wishlistService.getWishlist();
      set({ wishlistItems: updated || [], isLoading: false });
      return true;
    } catch (error) {
      set({ isLoading: false });
      throw error;
    }
  },

  isInWishlist: (productId) => {
    return get().wishlistItems.some((item) => item.id === productId);
  },

  clearWishlist: async () => {
    set({ isLoading: true });
    try {
      await wishlistService.clearWishlist();
      set({ wishlistItems: [], isLoading: false });
    } catch (error) {
      set({ isLoading: false });
      throw error;
    }
  },

  resetWishlistStore: () => {
    set({ wishlistItems: [], isLoading: false });
  },
}));
