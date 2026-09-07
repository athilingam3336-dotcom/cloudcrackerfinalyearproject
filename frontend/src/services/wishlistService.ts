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
    const prod = item.product || item || {};
    const mainImage =
      prod.imageUrl ||
      prod.image_url ||
      (Array.isArray(prod.images) && prod.images.length > 0 ? prod.images[0] : undefined);
    const productId = prod.id || prod._id || item.product_id || item.id;

    return {
      id: String(productId),
      title: prod.name || prod.title || item.title || 'Pyrotechnic Item',
      subtitle: prod.description || prod.subtitle || item.subtitle || '',
      category: prod.category_id || prod.category || item.category || 'all',
      price: prod.discount_price ? prod.discount_price : prod.price || item.price || 0,
      originalPrice: prod.discount_price ? prod.price : item.originalPrice,
      badge: prod.is_bestseller
        ? 'Bestseller'
        : prod.is_featured
        ? 'Featured'
        : prod.is_flash_sale
        ? 'Flash Sale'
        : item.badge,
      rating: prod.rating || prod.average_rating || item.rating || 5.0,
      reviewCount: prod.reviews_count || prod.total_reviews || item.reviewCount || 0,
      imageUrl: mainImage || item.imageUrl,
    };
  }

  async getWishlist(): Promise<ProductItem[]> {
    if (ENV.ENABLE_MOCK_API) {
      return [];
    }
    const { data: res } = await apiClient.get('/wishlist');
    const payload = res.data !== undefined ? res.data : res;
    if (Array.isArray(payload)) {
      return payload.map((item: any) => this.mapWishlistItemToProduct(item));
    }
    return [];
  }

  async addToWishlist(productId: string): Promise<boolean> {
    if (ENV.ENABLE_MOCK_API) {
      return true;
    }
    await apiClient.post('/wishlist/add', {
      product_id: productId,
    });
    return true;
  }

  async removeFromWishlist(productId: string): Promise<boolean> {
    if (ENV.ENABLE_MOCK_API) {
      return true;
    }
    await apiClient.delete(`/wishlist/${productId}`);
    return true;
  }

  async clearWishlist(): Promise<boolean> {
    if (ENV.ENABLE_MOCK_API) {
      return true;
    }
    await apiClient.post('/wishlist/clear');
    return true;
  }
}

export const wishlistService = new WishlistService();
export default wishlistService;
