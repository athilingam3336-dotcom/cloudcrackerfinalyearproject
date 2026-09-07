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
    const { data: res } = await apiClient.get('/cart');
    const payload = res.data !== undefined ? res.data : res;
    if (Array.isArray(payload)) {
      const mappedList = payload.map((ci: any) => {
        const prod = ci.product || {};
        const effectivePrice = prod.discount_price != null ? prod.discount_price : (prod.price ?? ci.unit_price ?? ci.price ?? 0);
        const originalPrice = prod.discount_price != null ? prod.price : undefined;
        const mainImage = Array.isArray(prod.images) && prod.images.length > 0 ? prod.images[0] : (prod.image_url || prod.imageUrl);
        const stockVal = typeof prod.stock === 'number' ? prod.stock : (typeof prod.available_stock === 'number' ? prod.available_stock : 999);

        return {
          product: {
            id: String(prod.id || prod._id || ci.product_id || ci.id),
            title: prod.name || prod.title || 'Pyrotechnic Item',
            subtitle: prod.description || prod.subtitle || '',
            category: prod.category_id || prod.category || 'all',
            price: effectivePrice,
            originalPrice: originalPrice,
            badge: prod.is_bestseller ? 'Bestseller' : prod.is_featured ? 'Featured' : prod.is_flash_sale ? 'Flash Sale' : undefined,
            rating: prod.rating || prod.average_rating || 5.0,
            reviewCount: prod.reviews_count || prod.total_reviews || 0,
            imageUrl: mainImage,
            stock: stockVal,
          },
          quantity: ci.quantity || 1,
        };
      });

      // Deduplicate items by product.id and aggregate quantity
      const mergedMap = new Map<string, CartItem>();
      for (const item of mappedList) {
        const pId = item.product.id;
        if (mergedMap.has(pId)) {
          const existing = mergedMap.get(pId)!;
          const maxStock = typeof item.product.stock === 'number' ? item.product.stock : 999;
          existing.quantity = Math.min(maxStock, existing.quantity + item.quantity);
        } else {
          mergedMap.set(pId, item);
        }
      }
      return Array.from(mergedMap.values());
    }
    return [];
  }

  async addToCartApi(productId: string, quantity: number = 1): Promise<boolean> {
    if (ENV.ENABLE_MOCK_API) {
      return true;
    }
    await apiClient.post('/cart/add', {
      product_id: productId,
      quantity,
    });
    return true;
  }

  async syncCart(items: CartItem[]): Promise<{ success: boolean }> {
    if (ENV.ENABLE_MOCK_API) {
      return { success: true };
    }
    for (const item of items) {
      if (item.product && item.product.id) {
        await this.addToCartApi(item.product.id, item.quantity);
      }
    }
    return { success: true };
  }

  async updateQuantityApi(productId: string, quantity: number): Promise<boolean> {
    if (ENV.ENABLE_MOCK_API) {
      return true;
    }
    await apiClient.put(`/cart/${productId}`, {
      quantity,
    });
    return true;
  }

  async removeFromCartApi(productId: string): Promise<boolean> {
    if (ENV.ENABLE_MOCK_API) {
      return true;
    }
    try {
      await apiClient.delete(`/cart/${productId}`);
      return true;
    } catch (err: any) {
      console.warn(`[cartService] removeFromCartApi (${productId}):`, err?.message || err);
      return true;
    }
  }

  async clearCartApi(): Promise<{ success: boolean }> {
    if (ENV.ENABLE_MOCK_API) {
      return { success: true };
    }
    await apiClient.delete('/cart/clear');
    return { success: true };
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
