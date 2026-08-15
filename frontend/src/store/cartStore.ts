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
  addToCart: (product: ProductItem, quantity?: number, selectedVariant?: ProductVariantOption) => void;
  removeFromCart: (productId: string) => void;
  updateQuantity: (productId: string, delta: number) => void;
  applyCoupon: (code: string) => boolean;
  setAppliedCoupon: (code: string, discount: number) => void;
  clearCart: () => void;
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
      set({ isLoading: false });
    }
  },

  addToCart: async (product, quantity = 1, selectedVariant) => {
    // 1. Optimistic local update
    set((state) => {
      const existingIndex = state.items.findIndex(
        (i) =>
          i.product.id === product.id &&
          JSON.stringify(i.selectedVariant || {}) === JSON.stringify(selectedVariant || {})
      );
      if (existingIndex >= 0) {
        const updated = [...state.items];
        updated[existingIndex].quantity += quantity;
        return { items: updated };
      }
      const effectivePrice = product.price + (selectedVariant?.priceModifier || 0);
      const productWithPrice = {
        ...product,
        price: effectivePrice,
        imageUrl: selectedVariant?.imageUrl || product.imageUrl,
      };
      return { items: [...state.items, { product: productWithPrice, quantity, selectedVariant }] };
    });

    // 2. Persist to MongoDB Atlas and re-sync
    if (!ENV.ENABLE_MOCK_API && product?.id) {
      await cartService.addToCartApi(product.id, quantity);
      const atlasCart = await cartService.fetchCart();
      if (atlasCart && atlasCart.length > 0) {
        set({ items: atlasCart });
      }
    }
  },

  removeFromCart: async (productId) => {
    set((state) => ({
      items: state.items.filter((i) => i.product.id !== productId),
    }));
    await cartService.removeFromCartApi(productId);
    const atlasCart = await cartService.fetchCart();
    set({ items: atlasCart || [] });
  },

  updateQuantity: async (productId, delta) => {
    const currentItem = get().items.find((i) => i.product.id === productId);
    if (!currentItem) return;

    const newQty = currentItem.quantity + delta;
    if (newQty <= 0) {
      set((state) => ({
        items: state.items.filter((i) => i.product.id !== productId),
      }));
      await cartService.removeFromCartApi(productId);
      const atlasCart = await cartService.fetchCart();
      set({ items: atlasCart || [] });
    } else {
      set((state) => ({
        items: state.items.map((i) =>
          i.product.id === productId ? { ...i, quantity: newQty } : i
        ),
      }));
      await cartService.updateQuantityApi(productId, newQty);
      const atlasCart = await cartService.fetchCart();
      if (atlasCart && atlasCart.length > 0) {
        set({ items: atlasCart });
      }
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
    set({ items: [], couponCode: '', discount: 0 });
    await cartService.clearCartApi();
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

