import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
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

const customStorage = {
  getItem: async (name: string): Promise<string | null> => {
    try {
      if (typeof window !== 'undefined' && window.localStorage) {
        return window.localStorage.getItem(name);
      }
      return null;
    } catch {
      return null;
    }
  },
  setItem: async (name: string, value: string): Promise<void> => {
    try {
      if (typeof window !== 'undefined' && window.localStorage) {
        window.localStorage.setItem(name, value);
      }
    } catch {}
  },
  removeItem: async (name: string): Promise<void> => {
    try {
      if (typeof window !== 'undefined' && window.localStorage) {
        window.localStorage.removeItem(name);
      }
    } catch {}
  },
};

export const useWishlistStore = create<WishlistState>()(
  persist(
    (set, get) => ({
      wishlistItems: [],
      isLoading: false,

      fetchWishlist: async () => {
        set({ isLoading: true });
        try {
          const items = await wishlistService.getWishlist();
          if (Array.isArray(items) && items.length > 0) {
            set({ wishlistItems: items, isLoading: false });
          } else {
            set({ isLoading: false });
          }
        } catch {
          set({ isLoading: false });
        }
      },

      toggleWishlist: async (product) => {
        if (!product?.id) {
          throw new Error('Invalid product ID.');
        }
        const targetId = String(product.id);
        const previousItems = get().wishlistItems;
        const exists = previousItems.some((item) => String(item.id) === targetId);

        // Optimistic Update: Instantly update state
        const updatedItems = exists
          ? previousItems.filter((item) => String(item.id) !== targetId)
          : [...previousItems, { ...product, id: targetId }];
        set({ wishlistItems: updatedItems });

        try {
          if (exists) {
            await wishlistService.removeFromWishlist(targetId);
          } else {
            await wishlistService.addToWishlist(targetId);
          }
        } catch (error) {
          console.warn('Backend wishlist sync note:', error);
          // Retain local update so product stays in user's wishlist!
        }
        return !exists;
      },

      addToWishlist: async (product) => {
        if (!product?.id) {
          throw new Error('Invalid product ID.');
        }
        const targetId = String(product.id);
        const previousItems = get().wishlistItems;
        if (previousItems.some((item) => String(item.id) === targetId)) {
          return true;
        }

        set({ wishlistItems: [...previousItems, { ...product, id: targetId }] });
        try {
          await wishlistService.addToWishlist(targetId);
        } catch (error) {
          console.warn('Backend wishlist sync note:', error);
        }
        return true;
      },

      removeFromWishlist: async (productId) => {
        const targetId = String(productId);
        const previousItems = get().wishlistItems;
        set({ wishlistItems: previousItems.filter((item) => String(item.id) !== targetId) });
        try {
          await wishlistService.removeFromWishlist(targetId);
        } catch (error) {
          console.warn('Backend wishlist sync note:', error);
        }
        return true;
      },

      isInWishlist: (productId) => {
        const targetId = String(productId);
        return get().wishlistItems.some((item) => String(item.id) === targetId);
      },

      clearWishlist: async () => {
        set({ isLoading: true });
        try {
          await wishlistService.clearWishlist();
        } catch (error) {
          console.warn('Clear wishlist note:', error);
        } finally {
          set({ wishlistItems: [], isLoading: false });
        }
      },

      resetWishlistStore: () => {
        set({ wishlistItems: [], isLoading: false });
      },
    }),
    {
      name: 'cloudcrackers_wishlist_storage',
      storage: createJSONStorage(() => customStorage),
    }
  )
);
