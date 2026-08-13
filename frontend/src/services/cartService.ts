/**
 * Cart Service
 * API service for cart synchronization, coupons, and checkout calculations.
 * Uses apiClient for real backend calls; falls back to mock data when ENABLE_MOCK_API is true.
 */

import { CartItem } from '@/store/cartStore';
import { apiClient } from '@/api/axios';
import { ENV } from '@/config/env';

const VALID_COUPONS = ['VIP', 'FIREWORKS10', 'SPARK20'];

export class CartService {
  async fetchCart(): Promise<CartItem[]> {
    if (ENV.ENABLE_MOCK_API) {
      return [];
    }
    try {
      const { data: res } = await apiClient.get('/cart');
      const payload = res.data || res;
      if (Array.isArray(payload)) {
        return payload.map((ci: any) => ({
          product: {
            id: ci.product_id || ci.product?.id,
            title: ci.product?.name || ci.product?.title || 'Product',
            subtitle: ci.product?.description || '',
            category: ci.product?.category_id || 'all',
            price: ci.product?.discount_price || ci.product?.price || ci.price || 0,
            rating: ci.product?.rating || 5.0,
            reviewCount: ci.product?.reviews_count || 0,
            imageUrl: Array.isArray(ci.product?.images) ? ci.product.images[0] : undefined,
          },
          quantity: ci.quantity || 1,
        }));
      }
      return [];
    } catch {
      return [];
    }
  }

  async addToCartApi(productId: string, quantity: number = 1): Promise<boolean> {
    if (ENV.ENABLE_MOCK_API) {
      return true;
    }
    try {
      await apiClient.post('/cart/add', {
        product_id: productId,
        quantity,
      });
      return true;
    } catch (err) {
      console.warn('Backend cart sync note:', err);
      return false;
    }
  }

  async syncCart(items: CartItem[]): Promise<{ success: boolean }> {
    if (ENV.ENABLE_MOCK_API) {
      return { success: true };
    }
    try {
      for (const item of items) {
        if (item.product && item.product.id) {
          await this.addToCartApi(item.product.id, item.quantity);
        }
      }
      return { success: true };
    } catch {
      return { success: false };
    }
  }

  async clearCartApi(): Promise<{ success: boolean }> {
    if (ENV.ENABLE_MOCK_API) {
      return { success: true };
    }
    try {
      await apiClient.delete('/cart/clear');
      return { success: true };
    } catch {
      return { success: false };
    }
  }

  async validateCoupon(
    code: string,
    orderTotal: number = 100
  ): Promise<{ valid: boolean; discountAmount: number; message?: string }> {
    const clean = code.trim().toUpperCase();
    if (!clean) {
      return { valid: false, discountAmount: 0, message: 'Please enter a coupon code.' };
    }
    try {
      const { data: res } = await apiClient.post('/coupons/validate', {
        coupon_code: clean,
        order_total: orderTotal,
      });
      const payload = res?.data || res;
      return {
        valid: true,
        discountAmount: payload.discount_amount || 0,
        message: `Coupon "${clean}" applied successfully!`,
      };
    } catch (err: any) {
      const msg =
        err.response?.data?.message || err.message || 'Invalid or expired coupon code.';
      return { valid: false, discountAmount: 0, message: msg };
    }
  }
}

export const cartService = new CartService();
export default cartService;
