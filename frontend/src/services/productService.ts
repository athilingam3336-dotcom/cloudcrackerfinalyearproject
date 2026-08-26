/**
 * Product Service
 * Service methods for fetching products, search filtering, and category catalogs.
 * Uses apiClient for real backend calls; falls back to mock data when ENABLE_MOCK_API is true.
 */

import { MOCK_PRODUCTS, MOCK_CATEGORIES, ProductItem, CategoryItem } from '@/constants/mockData';
import { apiClient } from '@/api/axios';
import { ENV } from '@/config/env';

export class ProductService {
  private categoriesCache: { data: CategoryItem[]; timestamp: number } | null = null;
  private pendingCategoriesRequest: Promise<CategoryItem[]> | null = null;
  private categoriesTtlMs = 300_000; // 5 minutes cache for category catalog

  private productsCache = new Map<string, { data: ProductItem[]; timestamp: number }>();
  private pendingProductsRequests = new Map<string, Promise<ProductItem[]>>();
  private productsTtlMs = 180_000; // 3 minutes cache for product query results

  private getLocalStorageItem(key: string): any {
    try {
      if (typeof window !== 'undefined' && window.localStorage) {
        const item = window.localStorage.getItem(`cc_cache_${key}`);
        return item ? JSON.parse(item) : null;
      }
    } catch {
      return null;
    }
    return null;
  }

  private setLocalStorageItem(key: string, val: any): void {
    try {
      if (typeof window !== 'undefined' && window.localStorage) {
        window.localStorage.setItem(`cc_cache_${key}`, JSON.stringify(val));
      }
    } catch {}
  }

  /**
   * Clears in-memory and persistent caches. Call when admin updates products/categories or manual refresh occurs.
   */
  public clearCache(): void {
    this.categoriesCache = null;
    this.productsCache.clear();
    try {
      if (typeof window !== 'undefined' && window.localStorage) {
        Object.keys(window.localStorage)
          .filter((k) => k.startsWith('cc_cache_'))
          .forEach((k) => window.localStorage.removeItem(k));
      }
    } catch {}
  }

  private mapProductToUi(p: any): ProductItem {
    const mainImage =
      p.image_url ||
      p.imageUrl ||
      (Array.isArray(p.images) && p.images.length > 0 ? p.images[0] : undefined);
    const stockVal = typeof p.stock === 'number' ? p.stock : 100;
    const isOutOfStock = stockVal <= 0 || p.status === 'out_of_stock';
    return {
      id: p.id || p._id,
      title: p.name || p.title || 'Pyrotechnic Item',
      subtitle: p.description || p.subtitle || '',
      category: p.category_id || p.category || 'all',
      price: p.discount_price ? p.discount_price : p.price || 0,
      originalPrice: p.discount_price ? p.price : undefined,
      stock: stockVal,
      badge: isOutOfStock
        ? 'Out of Stock'
        : p.is_bestseller
        ? 'Bestseller'
        : p.is_featured
        ? 'Featured'
        : p.is_flash_sale
        ? 'Flash Sale'
        : undefined,
      rating: p.rating || p.average_rating || 5.0,
      reviewCount: p.reviews_count || p.total_reviews || 0,
      imageUrl: mainImage,
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

  /**
   * Fetches products with configurable category, search query, limit, page, and caching.
   * Backward compatible with getProducts(category, query).
   */
  async getProducts(
    category?: string,
    query?: string,
    limit: number = 50,
    page: number = 1,
    forceRefresh: boolean = false
  ): Promise<ProductItem[]> {
    if (ENV.ENABLE_MOCK_API) {
      return MOCK_PRODUCTS.filter((p) => {
        const matchesCat =
          !category || category === 'all' || p.category.toLowerCase() === category.toLowerCase();
        const matchesQuery =
          !query || p.title.toLowerCase().includes(query.toLowerCase());
        return matchesCat && matchesQuery;
      }).slice((page - 1) * limit, page * limit);
    }

    const cacheKey = `${category || 'all'}:${query || ''}:${limit}:${page}`;
    const now = Date.now();

    // 1. Check memory cache
    if (!forceRefresh && this.productsCache.has(cacheKey)) {
      const cached = this.productsCache.get(cacheKey)!;
      if (now - cached.timestamp < this.productsTtlMs) {
        return cached.data;
      }
    }

    // 2. Check persistent localStorage cache for instant zero-wait startup
    if (!forceRefresh && !this.productsCache.has(cacheKey)) {
      const persisted = this.getLocalStorageItem(cacheKey);
      if (persisted && Array.isArray(persisted.data) && persisted.data.length > 0) {
        this.productsCache.set(cacheKey, persisted);
        if (now - persisted.timestamp < this.productsTtlMs * 3) {
          // Trigger background refresh silently if stale
          if (now - persisted.timestamp >= this.productsTtlMs) {
            this.getProducts(category, query, limit, page, true).catch(() => {});
          }
          return persisted.data;
        }
      }
    }

    // 3. Deduplicate simultaneous identical requests
    if (this.pendingProductsRequests.has(cacheKey)) {
      return this.pendingProductsRequests.get(cacheKey)!;
    }

    const fetchPromise = (async () => {
      const params: Record<string, any> = { limit, page };
      if (query && query.trim()) params.search = query.trim();
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
        const finalResult = mapped.length > 0 ? mapped : MOCK_PRODUCTS;

        // Cache successful response in memory & local storage
        const cacheEntry = { data: finalResult, timestamp: Date.now() };
        this.productsCache.set(cacheKey, cacheEntry);
        this.setLocalStorageItem(cacheKey, cacheEntry);
        return finalResult;
      } catch {
        const fallback = this.getLocalStorageItem(cacheKey)?.data || MOCK_PRODUCTS;
        return fallback;
      } finally {
        this.pendingProductsRequests.delete(cacheKey);
      }
    })();

    this.pendingProductsRequests.set(cacheKey, fetchPromise);
    return fetchPromise;
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

  /**
   * Fetches categories with in-memory caching, local storage persistence, and deduplication.
   */
  async getCategories(forceRefresh: boolean = false): Promise<CategoryItem[]> {
    if (ENV.ENABLE_MOCK_API) {
      return MOCK_CATEGORIES;
    }

    const now = Date.now();
    if (!forceRefresh && this.categoriesCache && now - this.categoriesCache.timestamp < this.categoriesTtlMs) {
      return this.categoriesCache.data;
    }

    if (!forceRefresh && !this.categoriesCache) {
      const persisted = this.getLocalStorageItem('categories_catalog');
      if (persisted && Array.isArray(persisted.data) && persisted.data.length > 0) {
        this.categoriesCache = persisted;
        if (now - persisted.timestamp < this.categoriesTtlMs * 3) {
          if (now - persisted.timestamp >= this.categoriesTtlMs) {
            this.getCategories(true).catch(() => {});
          }
          return persisted.data;
        }
      }
    }

    if (this.pendingCategoriesRequest) {
      return this.pendingCategoriesRequest;
    }

    this.pendingCategoriesRequest = (async () => {
      try {
        const { data: res } = await apiClient.get('/categories');
        const payload = res.data !== undefined ? res.data : res;
        const items = Array.isArray(payload)
          ? payload
          : Array.isArray(payload?.categories)
          ? payload.categories
          : [];
        const mapped = items.map((c: any) => this.mapCategoryToUi(c));
        const finalCategories = mapped.length > 0 ? mapped : MOCK_CATEGORIES;
        const cacheEntry = { data: finalCategories, timestamp: Date.now() };
        this.categoriesCache = cacheEntry;
        this.setLocalStorageItem('categories_catalog', cacheEntry);
        return finalCategories;
      } catch {
        const fallback = this.getLocalStorageItem('categories_catalog')?.data || MOCK_CATEGORIES;
        return fallback;
      } finally {
        this.pendingCategoriesRequest = null;
      }
    })();

    return this.pendingCategoriesRequest;
  }
}

export const productService = new ProductService();
export default productService;
