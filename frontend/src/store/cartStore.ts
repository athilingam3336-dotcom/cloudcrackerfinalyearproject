import { create } from 'zustand';
import { MOCK_PRODUCTS, ProductItem } from '@/constants/mockData';
import { cartService } from '@/services/cartService';
import { ENV } from '@/config/env';

export interface ProductVariantOption {
  size?: string;
  color?: string;
  priceModifier?: number;
  imageUrl?: string;
}

export interface CartItem {
  product: ProductItem;
  quantity: number;
  selectedVariant?: ProductVariantOption;
}

export interface CartState {
  items: CartItem[];
  couponCode: string;
  discount: number;
  isLoading: boolean;

  // Actions
  fetchCart: () => Promise<void>;
  addToCart: (product: ProductItem, quantity?: number, selectedVariant?: ProductVariantOption) => Promise<boolean>;
  removeFromCart: (productId: string) => Promise<boolean>;
  updateQuantity: (productId: string, delta: number) => Promise<boolean>;
  applyCoupon: (code: string) => boolean;
  setAppliedCoupon: (code: string, discount: number) => void;
  clearCart: () => Promise<boolean>;
  resetCartStore: () => void;

  // Computed helper getters
  getSubtotal: () => number;
  getShippingFee: () => number;
  getTax: () => number;
  getGrandTotal: () => number;
  getItemCount: () => number;
}

export const useCartStore = create<CartState>((set, get) => ({
  items: [],
  couponCode: '',
  discount: 0,
  isLoading: false,

  fetchCart: async () => {
    set({ isLoading: true });
    try {
      const items = await cartService.fetchCart();
      set({ items: items || [], isLoading: false });
    } catch {
      set({ items: [], isLoading: false });
    }
  },

  addToCart: async (product, quantity = 1, selectedVariant) => {
    if (!product?.id) {
      throw new Error('Invalid product ID.');
    }
    set({ isLoading: true });
    try {
      // 1. Persist to MongoDB Atlas
      await cartService.addToCartApi(product.id, quantity);
      // 2. Fetch updated authoritative cart from MongoDB Atlas
      const atlasCart = await cartService.fetchCart();
      set({ items: atlasCart || [], isLoading: false });
      return true;
    } catch (error) {
      set({ isLoading: false });
      throw error;
    }
  },

  removeFromCart: async (productId) => {
    set({ isLoading: true });
    try {
      await cartService.removeFromCartApi(productId);
      const atlasCart = await cartService.fetchCart();
      set({ items: atlasCart || [], isLoading: false });
      return true;
    } catch (error) {
      set({ isLoading: false });
      throw error;
    }
  },

  updateQuantity: async (productId, delta) => {
    const currentItem = get().items.find((i) => i.product.id === productId);
    if (!currentItem) return false;

    const newQty = currentItem.quantity + delta;
    set({ isLoading: true });
    try {
      if (newQty <= 0) {
        await cartService.removeFromCartApi(productId);
      } else {
        await cartService.updateQuantityApi(productId, newQty);
      }
      const atlasCart = await cartService.fetchCart();
      set({ items: atlasCart || [], isLoading: false });
      return true;
    } catch (error) {
      set({ isLoading: false });
      throw error;
    }
  },

  applyCoupon: (code) => {
    const cleanCode = code.trim().toUpperCase();
    if (cleanCode === 'VIP' || cleanCode === 'FIREWORKS10' || cleanCode === 'SPARK20') {
      set({ couponCode: cleanCode, discount: 15.0 });
      return true;
    }
    return false;
  },

  setAppliedCoupon: (code, discount) => {
    set({ couponCode: code.trim().toUpperCase(), discount: Math.max(0, discount) });
  },

  clearCart: async () => {
    set({ isLoading: true });
    try {
      await cartService.clearCartApi();
      set({ items: [], couponCode: '', discount: 0, isLoading: false });
      return true;
    } catch (error) {
      set({ isLoading: false });
      throw error;
    }
  },

  resetCartStore: () => {
    set({
      items: [],
      couponCode: '',
      discount: 0,
      isLoading: false,
    });
  },

  getSubtotal: () => {
    return get().items.reduce(
      (acc, item) => acc + item.product.price * item.quantity,
      0
    );
  },

  getShippingFee: () => {
    const subtotal = get().getSubtotal();
    if (subtotal === 0 || subtotal > 200) return 0;
    return 15.0;
  },

  getTax: () => {
    return get().getSubtotal() * 0.07;
  },

  getGrandTotal: () => {
    const subtotal = get().getSubtotal();
    const shipping = get().getShippingFee();
    const tax = get().getTax();
    const discount = get().discount;
    return Math.max(0, subtotal + shipping + tax - discount);
  },

  getItemCount: () => {
    return get().items.reduce((acc, item) => acc + item.quantity, 0);
  },
}));

