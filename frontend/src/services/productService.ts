/**
 * Product Service
 * Service methods for fetching products, search filtering, and category catalogs.
 * Uses apiClient for real backend calls; falls back to mock data when ENABLE_MOCK_API is true.
 */

import { MOCK_PRODUCTS, MOCK_CATEGORIES, ProductItem, CategoryItem } from '@/constants/mockData';
import { apiClient } from '@/api/axios';
import { ENV } from '@/config/env';

export class ProductService {
  private mapProductToUi(p: any): ProductItem {
    const mainImage = Array.isArray(p.images) && p.images.length > 0 ? p.images[0] : undefined;
    return {
      id: p.id || p._id,
      title: p.name || p.title || 'Pyrotechnic Item',
      subtitle: p.description || p.subtitle || '',
      category: p.category_id || p.category || 'all',
      price: p.discount_price ? p.discount_price : p.price || 0,
      originalPrice: p.discount_price ? p.price : undefined,
      badge: p.is_bestseller ? 'Bestseller' : p.is_featured ? 'Featured' : p.is_flash_sale ? 'Flash Sale' : undefined,
      rating: p.rating || p.average_rating || 5.0,
      reviewCount: p.reviews_count || p.total_reviews || 0,
      imageUrl: mainImage || p.imageUrl,
    };
  }

  private mapCategoryToUi(c: any): CategoryItem {
    return {
      id: c.id || c._id,
      name: c.name || 'Category',
      iconName: c.icon_name || c.iconName || 'auto-awesome',
      itemCount: c.item_count || c.itemCount || 0,
      description: c.description,
      imageUrl: c.image_url || c.imageUrl,
    };
  }

  async getProducts(category?: string, query?: string): Promise<ProductItem[]> {
    if (ENV.ENABLE_MOCK_API) {
      return MOCK_PRODUCTS.filter((p) => {
        const matchesCat =
          !category || category === 'all' || p.category.toLowerCase() === category.toLowerCase();
        const matchesQuery =
          !query || p.title.toLowerCase().includes(query.toLowerCase());
        return matchesCat && matchesQuery;
      });
    }
    const params: Record<string, any> = { limit: 50 };
    if (query) params.search = query;
    if (category && category !== 'all') {
      if (/^[0-9a-fA-F]{24}$/.test(category)) {
        params.category_id = category;
      }
    }

    try {
      const { data: res } = await apiClient.get('/products', { params });
      const payload = res.data !== undefined ? res.data : res;
      const items = Array.isArray(payload?.products)
        ? payload.products
        : Array.isArray(payload)
        ? payload
        : [];
      const mapped = items.map((p: any) => this.mapProductToUi(p));
      return mapped.length > 0 ? mapped : MOCK_PRODUCTS;
    } catch {
      return MOCK_PRODUCTS;
    }
  }

  async getProductById(id: string): Promise<ProductItem | null> {
    if (ENV.ENABLE_MOCK_API) {
      return MOCK_PRODUCTS.find((p) => p.id === id) || null;
    }
    try {
      const { data: res } = await apiClient.get(`/products/${id}`);
      const payload = res.data || res;
      return payload ? this.mapProductToUi(payload) : null;
    } catch {
      return null;
    }
  }

  async getCategories(): Promise<CategoryItem[]> {
    if (ENV.ENABLE_MOCK_API) {
      return MOCK_CATEGORIES;
    }
    try {
      const { data: res } = await apiClient.get('/categories');
      const payload = res.data !== undefined ? res.data : res;
      const items = Array.isArray(payload)
        ? payload
        : Array.isArray(payload?.categories)
        ? payload.categories
        : [];
      const mapped = items.map((c: any) => this.mapCategoryToUi(c));
      return mapped.length > 0 ? mapped : MOCK_CATEGORIES;
    } catch {
      return MOCK_CATEGORIES;
    }
  }
}

export const productService = new ProductService();
export default productService;
