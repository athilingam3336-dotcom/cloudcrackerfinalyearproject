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
    const previousItems = get().wishlistItems;
    const exists = previousItems.some((item) => item.id === product.id);

    // Optimistic Update: Instantly reflect in UI (0ms wait time)
    const updatedItems = exists
      ? previousItems.filter((item) => item.id !== product.id)
      : [...previousItems, product];
    set({ wishlistItems: updatedItems });

    try {
      if (exists) {
        await wishlistService.removeFromWishlist(product.id);
      } else {
        await wishlistService.addToWishlist(product.id);
      }
      return !exists;
    } catch (error) {
      // Revert to original list if backend call fails
      set({ wishlistItems: previousItems });
      throw error;
    }
  },

  addToWishlist: async (product) => {
    if (!product?.id) {
      throw new Error('Invalid product ID.');
    }
    const previousItems = get().wishlistItems;
    if (previousItems.some((item) => item.id === product.id)) {
      return true;
    }

    // Optimistic Update
    set({ wishlistItems: [...previousItems, product] });
    try {
      await wishlistService.addToWishlist(product.id);
      return true;
    } catch (error) {
      set({ wishlistItems: previousItems });
      throw error;
    }
  },

  removeFromWishlist: async (productId) => {
    const previousItems = get().wishlistItems;
    // Optimistic Update
    set({ wishlistItems: previousItems.filter((item) => item.id !== productId) });
    try {
      await wishlistService.removeFromWishlist(productId);
      return true;
    } catch (error) {
      set({ wishlistItems: previousItems });
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
