import { create } from 'zustand';
import { MOCK_PRODUCTS, ProductItem } from '@/constants/mockData';
import { cartService } from '@/services/cartService';
import { ENV } from '@/config/env';
import { triggerPyrotechnicCartEffect } from '@/utils/pyrotechnicEffects';

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

    const availableStock = typeof product.stock === 'number' ? product.stock : 999;
    const previousItems = get().items;
    const existingIndex = previousItems.findIndex((i) => i.product.id === product.id);
    const currentQtyInCart = existingIndex >= 0 ? previousItems[existingIndex].quantity : 0;
    const totalRequested = currentQtyInCart + quantity;

    if (availableStock > 0 && totalRequested > availableStock) {
      const remainingAllowed = Math.max(0, availableStock - currentQtyInCart);
      if (remainingAllowed === 0) {
        throw new Error(`Cannot add more items. You already have the maximum available stock (${availableStock}) in your cart.`);
      } else {
        throw new Error(`Only ${availableStock} items available in stock. You already have ${currentQtyInCart} in your cart.`);
      }
    }

    let updatedItems: CartItem[];
    if (existingIndex >= 0) {
      updatedItems = previousItems.map((item, idx) =>
        idx === existingIndex ? { ...item, quantity: item.quantity + quantity } : item
      );
    } else {
      updatedItems = [...previousItems, { product, quantity, selectedVariant }];
    }

    // Optimistic Update: Immediately update cart items in memory (0ms)
    set({ items: updatedItems });

    // Trigger Pyrotechnic Action Animation & Audio Synthesizer Effect!
    try {
      triggerPyrotechnicCartEffect(
        (product as any).title || (product as any).name || 'Cracker Product',
        (product as any).category || ''
      );
    } catch {}

    try {
      await cartService.addToCartApi(product.id, quantity);
      return true;
    } catch (error) {
      set({ items: previousItems });
      throw error;
    }
  },

  removeFromCart: async (productId) => {
    const previousItems = get().items;
    // Permanently remove item from local cart state (0ms wait)
    const updatedItems = previousItems.filter((i) => i.product.id !== productId);
    set({ items: updatedItems });

    try {
      await cartService.removeFromCartApi(productId);
      return true;
    } catch (error) {
      console.warn('removeFromCart API sync warning:', error);
      return true;
    }
  },

  updateQuantity: async (productId, delta) => {
    const previousItems = get().items;
    const currentItem = previousItems.find((i) => i.product.id === productId);
    if (!currentItem) return false;

    const availableStock = typeof currentItem.product.stock === 'number' ? currentItem.product.stock : 999;
    const newQty = currentItem.quantity + delta;

    if (newQty <= 0) {
      return get().removeFromCart(productId);
    }

    if (delta > 0 && availableStock > 0 && newQty > availableStock) {
      throw new Error(`Cannot exceed available stock of ${availableStock} items.`);
    }

    const updatedItems = previousItems.map((i) =>
      i.product.id === productId ? { ...i, quantity: newQty } : i
    );
    set({ items: updatedItems });

    try {
      await cartService.updateQuantityApi(productId, newQty);
      return true;
    } catch (error) {
      console.warn('updateQuantity API sync warning:', error);
      return true;
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

