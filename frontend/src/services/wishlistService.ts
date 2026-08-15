/**
 * Wishlist Service
 * API service for fetching and modifying user wishlist collections in MongoDB Atlas.
 * Uses apiClient for real backend calls; falls back to mock data when ENABLE_MOCK_API is true.
 */

import { ProductItem } from '@/constants/mockData';
import { apiClient } from '@/api/axios';
import { ENV } from '@/config/env';

export class WishlistService {
  private mapWishlistItemToProduct(item: any): ProductItem {
    const prod = item.product || item;
    const mainImage = Array.isArray(prod.images) && prod.images.length > 0 ? prod.images[0] : undefined;
    return {
      id: prod.id || prod._id || item.product_id || item.id,
      title: prod.name || prod.title || 'Pyrotechnic Item',
      subtitle: prod.description || prod.subtitle || '',
      category: prod.category_id || prod.category || 'all',
      price: prod.discount_price ? prod.discount_price : prod.price || 0,
      originalPrice: prod.discount_price ? prod.price : undefined,
      badge: prod.is_bestseller ? 'Bestseller' : prod.is_featured ? 'Featured' : prod.is_flash_sale ? 'Flash Sale' : undefined,
      rating: prod.rating || prod.average_rating || 5.0,
      reviewCount: prod.reviews_count || prod.total_reviews || 0,
      imageUrl: mainImage || prod.imageUrl || prod.image_url,
    };
  }

  async getWishlist(): Promise<ProductItem[]> {
    if (ENV.ENABLE_MOCK_API) {
      return [];
    }
    try {
      const { data: res } = await apiClient.get('/wishlist');
      const payload = res.data !== undefined ? res.data : res;
      if (Array.isArray(payload)) {
        return payload.map((item: any) => this.mapWishlistItemToProduct(item));
      }
      return [];
    } catch (err) {
      console.warn('Backend wishlist fetch note:', err);
      return [];
    }
  }

  async addToWishlist(productId: string): Promise<boolean> {
    if (ENV.ENABLE_MOCK_API) {
      return true;
    }
    try {
      await apiClient.post('/wishlist/add', {
        product_id: productId,
      });
      return true;
    } catch (err) {
      console.warn('Backend wishlist add note:', err);
      return false;
    }
  }

  async removeFromWishlist(productId: string): Promise<boolean> {
    if (ENV.ENABLE_MOCK_API) {
      return true;
    }
    try {
      await apiClient.delete(`/wishlist/${productId}`);
      return true;
    } catch (err) {
      console.warn('Backend wishlist remove note:', err);
      return false;
    }
  }

  async clearWishlist(): Promise<boolean> {
    if (ENV.ENABLE_MOCK_API) {
      return true;
    }
    try {
      await apiClient.post('/wishlist/clear');
      return true;
    } catch (err) {
      console.warn('Backend wishlist clear note:', err);
      return false;
    }
  }
}

export const wishlistService = new WishlistService();
export default wishlistService;
