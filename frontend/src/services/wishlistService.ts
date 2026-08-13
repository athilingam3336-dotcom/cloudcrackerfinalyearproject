/**
 * Wishlist Service
 * API service for fetching and modifying user wishlist collections.
 * Uses apiClient for real backend calls; falls back to mock data when ENABLE_MOCK_API is true.
 */

import { ProductItem } from '@/constants/mockData';
import { apiClient } from '@/api/axios';
import { ENV } from '@/config/env';

export class WishlistService {
  async getWishlist(): Promise<ProductItem[]> {
    if (ENV.ENABLE_MOCK_API) {
      return [];
    }
    const { data } = await apiClient.get<ProductItem[]>('/wishlist');
    return data;
  }

  async addToWishlist(productId: string): Promise<{ success: boolean }> {
    if (ENV.ENABLE_MOCK_API) {
      return { success: true };
    }
    const { data } = await apiClient.post<{ success: boolean }>('/wishlist', {
      productId,
    });
    return data;
  }

  async removeFromWishlist(productId: string): Promise<{ success: boolean }> {
    if (ENV.ENABLE_MOCK_API) {
      return { success: true };
    }
    const { data } = await apiClient.delete<{ success: boolean }>(
      `/wishlist/${productId}`
    );
    return data;
  }
}

export const wishlistService = new WishlistService();
export default wishlistService;
