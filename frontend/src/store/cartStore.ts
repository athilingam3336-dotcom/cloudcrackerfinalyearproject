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

  // Actions
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

const initialCartItems: CartItem[] = ENV.ENABLE_MOCK_API
  ? [
      { product: MOCK_PRODUCTS[0], quantity: 1 },
      { product: MOCK_PRODUCTS[1], quantity: 2 },
    ]
  : [];

export const useCartStore = create<CartState>((set, get) => ({
  items: initialCartItems,
  couponCode: '',
  discount: 0,

  addToCart: (product, quantity = 1, selectedVariant) => {
    if (!ENV.ENABLE_MOCK_API && product?.id) {
      cartService.addToCartApi(product.id, quantity);
    }
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
      // Apply variant price modifier to product copy if variant present
      const effectivePrice = product.price + (selectedVariant?.priceModifier || 0);
      const productWithPrice = {
        ...product,
        price: effectivePrice,
        imageUrl: selectedVariant?.imageUrl || product.imageUrl,
      };
      return { items: [...state.items, { product: productWithPrice, quantity, selectedVariant }] };
    });
  },

  removeFromCart: (productId) => {
    set((state) => ({
      items: state.items.filter((i) => i.product.id !== productId),
    }));
  },

  updateQuantity: (productId, delta) => {
    set((state) => ({
      items: state.items
        .map((i) => {
          if (i.product.id === productId) {
            const newQty = Math.max(1, i.quantity + delta);
            return { ...i, quantity: newQty };
          }
          return i;
        })
        .filter((i) => i.quantity > 0),
    }));
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

  clearCart: () => {
    set({ items: [], couponCode: '', discount: 0 });
  },

  resetCartStore: () => {
    set({
      items: initialCartItems,
      couponCode: '',
      discount: 0,
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

