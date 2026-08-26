/**
 * Admin Service
 * API service for administrative metrics, revenue overview, inventory management, and order management.
 * Uses apiClient for real backend calls; falls back to mock data when ENABLE_MOCK_API is true.
 */

import { ProductItem } from '@/constants/mockData';
import { apiClient } from '@/api/axios';
import { ENV } from '@/config/env';

export interface DashboardRecentOrder {
  id: string;
  orderNumber: string;
  customerName: string;
  customerEmail: string;
  itemName: string;
  amount: number;
  status: string;
  paymentStatus: string;
  createdAt: string;
}

export interface AdminMetrics {
  totalRevenue: number;
  newOrders: number;
  productsInStock: number;
  totalUsers: number;
  revenueGrowth?: string;
  ordersGrowth?: string;
  usersGrowth?: string;
  recentOrders?: DashboardRecentOrder[];
}

export interface UserOrderItemUI {
  id: string;
  productId: string;
  productName: string;
  productImage?: string | null;
  category?: string;
  quantity: number;
  unitPrice: number;
  price: number;
  subtotal: number;
  total: number;
}

export interface CustomerOrderDetailUI {
  id: string;
  orderNumber: string;
  userId?: string;
  date: string;
  createdAt?: string;
  orderStatus: 'Pending' | 'Confirmed' | 'Packed' | 'Shipped' | 'Delivered' | 'Cancelled' | string;
  paymentStatus: 'Pending' | 'Paid' | 'Refunded' | 'Failed' | string;
  paymentMethod: string;
  subtotal: number;
  discount: number;
  shipping: number;
  tax: number;
  total: number;
  couponCode?: string | null;
  couponDiscount?: number;
  shippingAddress: string;
  itemCount: number;
  razorpayOrderId?: string | null;
  razorpayPaymentId?: string | null;
  paymentCompletedAt?: string | null;
  items: UserOrderItemUI[];
}

export interface AdminOrderItem {
  id: string;
  orderNumber: string;
  customerName: string;
  customerEmail: string;
  date: string;
  totalAmount: number;
  subtotal?: number;
  discount?: number;
  shipping?: number;
  tax?: number;
  itemCount: number;
  orderStatus: 'Pending' | 'Confirmed' | 'Packed' | 'Shipped' | 'Delivered' | 'Cancelled';
  paymentStatus: 'Pending' | 'Paid' | 'Refunded' | 'Failed';
  paymentMethod: string;
  shippingAddress?: string;
  razorpayOrderId?: string | null;
  razorpayPaymentId?: string | null;
  items?: Array<{
    id: string;
    product_id: string;
    product_name?: string;
    product_image?: string | null;
    quantity: number;
    price: number;
    unit_price?: number;
    subtotal?: number;
    category?: string;
    product?: {
      id: string;
      name: string;
      images?: string[];
      category?: string;
      price?: number;
    };
  }>;
}

export interface AdminOrdersResponse {
  orders: AdminOrderItem[];
  total: number;
  page: number;
  totalPages: number;
}

export interface AdminCategoryItem {
  id: string;
  name: string;
  description?: string;
  imageUrl?: string;
  isActive?: boolean;
}

export interface SelectedProductImageInput {
  uri: string;
  name: string;
  type: string;
  size?: number;
  file?: any;
  base64?: string | null;
}

export interface AdminProductCreateInput {
  name: string;
  description: string;
  price: number;
  discount_price?: number | null;
  category_id: string;
  stock: number;
  image?: SelectedProductImageInput | null;
  image_url?: string | null;
  images?: string[];
  is_featured?: boolean;
  is_bestseller?: boolean;
  is_flash_sale?: boolean;
  is_recommended?: boolean;
}

export interface AdminProductUpdateInput {
  name?: string;
  description?: string;
  price?: number;
  discount_price?: number | null;
  category_id?: string;
  stock?: number;
  image?: SelectedProductImageInput | null;
  image_url?: string | null;
  images?: string[];
  is_featured?: boolean;
  is_bestseller?: boolean;
  is_flash_sale?: boolean;
  is_recommended?: boolean;
  is_active?: boolean;
}

export interface AdminProductItemUI {
  id: string;
  title: string;
  name: string;
  description: string;
  category: string;
  categoryId: string;
  price: number;
  originalPrice?: number;
  discountPrice?: number | null;
  stock: number;
  images: string[];
  imageUrl?: string;
  isFeatured: boolean;
  isBestseller: boolean;
  isFlashSale: boolean;
  isRecommended: boolean;
  isActive: boolean;
  rating: number;
  reviewsCount: number;
  createdAt: string;
}

export interface AdminProductsResponse {
  products: AdminProductItemUI[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

export interface AdminCategoryCreateInput {
  name: string;
  description: string;
  image_url: string;
}

export interface AdminCategoryUpdateInput {
  name?: string;
  description?: string;
  image_url?: string;
  is_active?: boolean;
}

export interface InventorySummaryMetrics {
  totalProducts: number;
  totalStockUnits: number;
  lowStockCount: number;
  outOfStockCount: number;
}

export interface InventoryItemOverviewUI {
  productId: string;
  name: string;
  categoryId: string;
  categoryName: string;
  price: number;
  stock: number;
  minimumStock: number;
  maximumStock: number;
  stockStatus: 'IN_STOCK' | 'LOW_STOCK' | 'OUT_OF_STOCK';
  images: string[];
  lastUpdated: string;
}

export interface InventoryHistoryItemUI {
  transactionType: 'IN' | 'OUT' | 'ADJUST';
  quantity: number;
  oldStock: number;
  newStock: number;
  remarks?: string;
  createdBy: string;
  createdAt: string;
}

export interface InventoryOverviewResponseUI {
  metrics: InventorySummaryMetrics;
  items: InventoryItemOverviewUI[];
  pagination: {
    total: number;
    page: number;
    limit: number;
    pages: number;
  };
}

export interface InventoryDetailsUI {
  id: string;
  productId: string;
  currentStock: number;
  minimumStock: number;
  maximumStock: number;
  lastUpdated: string;
  history: InventoryHistoryItemUI[];
}

export interface AdminCouponItem {
  id: string;
  couponCode: string;
  description: string;
  discountType: 'percentage' | 'fixed';
  percentage?: number;
  fixedAmount?: number;
  minimumOrder: number;
  maximumDiscount?: number;
  startDate?: string;
  expiryDate: string;
  usageLimit: number;
  usedCount: number;
  isActive: boolean;
  couponStatus: 'ACTIVE' | 'INACTIVE' | 'EXPIRED' | 'UPCOMING' | 'USAGE_LIMIT_REACHED';
  createdAt: string;
  updatedAt: string;
}

export interface AdminCouponCreateInput {
  coupon_code: string;
  description?: string;
  discount_type: 'percentage' | 'fixed';
  percentage?: number;
  fixed_amount?: number;
  minimum_order?: number;
  maximum_discount?: number;
  start_date?: string;
  expiry_date: string;
  usage_limit: number;
  is_active?: boolean;
}

export interface AdminCouponUpdateInput {
  coupon_code?: string;
  description?: string;
  discount_type?: 'percentage' | 'fixed';
  percentage?: number;
  fixed_amount?: number;
  minimum_order?: number;
  maximum_discount?: number;
  start_date?: string;
  expiry_date?: string;
  usage_limit?: number;
  is_active?: boolean;
}

export interface CouponSummaryMetrics {
  totalCoupons: number;
  activeCoupons: number;
  expiringSoonCount: number;
  totalRedemptions: number;
}

export interface CouponOverviewResponseUI {
  metrics: CouponSummaryMetrics;
  items: AdminCouponItem[];
  pagination: {
    total: number;
    page: number;
    limit: number;
    pages: number;
  };
}

export interface AdminUserItem {
  id: string;
  fullName: string;
  email: string;
  phone: string;
  role: 'ADMIN' | 'CUSTOMER';
  isVerified: boolean;
  isActive: boolean;
  status: string;
  createdAt: string;
  updatedAt: string;
  orderCount: number;
  totalSpent: number;
}

export interface UserSummaryMetrics {
  totalUsers: number;
  activeUsers: number;
  inactiveUsers: number;
  blockedUsers: number;
  customerCount: number;
  adminCount: number;
}

export interface AdminUserListResponseUI {
  users: AdminUserItem[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
  metrics: UserSummaryMetrics;
}

export interface AdminUserDetail {
  id: string;
  fullName: string;
  email: string;
  phone: string;
  role: string;
  isVerified: boolean;
  isActive: boolean;
  status: string;
  createdAt: string;
  updatedAt: string;
  orderSummary: {
    total_orders?: number;
    total_spent?: number;
    pending_orders?: number;
    completed_orders?: number;
  };
  recentOrders: CustomerOrderDetailUI[];
}

export interface UserOrdersResponseUI {
  orders: CustomerOrderDetailUI[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
  orderSummary: {
    total_orders?: number;
    total_spent?: number;
    pending_orders?: number;
    completed_orders?: number;
  };
}

export class AdminService {
  private overviewCache: { data: AdminMetrics; timestamp: number } | null = null;

  async getOverviewMetrics(forceRefresh: boolean = false): Promise<AdminMetrics> {
    if (ENV.ENABLE_MOCK_API) {
      return {
        totalRevenue: 0.0,
        newOrders: 0,
        productsInStock: 0,
        totalUsers: 0,
        revenueGrowth: '+0.0%',
        ordersGrowth: '+0.0%',
        usersGrowth: '+0.0%',
        recentOrders: [],
      };
    }

    const now = Date.now();
    // 1. Check in-memory cache (valid for 60s)
    if (!forceRefresh && this.overviewCache && now - this.overviewCache.timestamp < 60_000) {
      return this.overviewCache.data;
    }

    // 2. Check localStorage persistent cache for instant UI display
    if (!forceRefresh && typeof window !== 'undefined' && window.localStorage) {
      try {
        const stored = window.localStorage.getItem('cc_cache_admin_overview');
        if (stored) {
          const parsed = JSON.parse(stored);
          if (parsed && parsed.data) {
            this.overviewCache = parsed;
            // Background revalidate if older than 30s
            if (now - parsed.timestamp >= 30_000) {
              this.getOverviewMetrics(true).catch(() => {});
            }
            return parsed.data;
          }
        }
      } catch {}
    }

    try {
      const { data: response } = await apiClient.get('/admin/dashboard');
      const payload = response?.data || response;
      const counters = payload?.counters || {};
      const revenue = payload?.revenue || {};
      const growth = payload?.growth || {};
      const recentOrdersRaw = payload?.recent_orders || [];

      const recentOrders: DashboardRecentOrder[] = recentOrdersRaw.map((o: any) => {
        const firstItem = o.items && o.items.length > 0 ? o.items[0] : null;
        const itemName =
          firstItem?.product?.name ||
          firstItem?.product_name ||
          (o.items && o.items.length > 1 ? `${o.items.length} items` : 'Pyrotechnic Item');

        const customerName =
          o.customer_name ||
          (o.shipping_address ? o.shipping_address.split(',')[0].split('(')[0].trim() : 'Customer');

        return {
          id: o.id || o._id || `ord_${Date.now()}`,
          orderNumber: o.order_number || o.orderNumber || '#ORD-0000',
          customerName,
          customerEmail: o.customer_email || o.user_id || 'customer@example.com',
          itemName,
          amount: typeof o.total === 'number' ? o.total : (o.totalAmount || 0),
          status: (o.order_status || o.orderStatus || 'Pending').toUpperCase(),
          paymentStatus: o.payment_status || o.paymentStatus || 'Pending',
          createdAt: o.created_at || new Date().toISOString(),
        };
      });

      const metrics: AdminMetrics = {
        totalRevenue: typeof revenue.total_revenue === 'number' ? revenue.total_revenue : 0,
        newOrders: typeof counters.total_orders === 'number' ? counters.total_orders : (revenue.today_orders || counters.pending_orders || 0),
        productsInStock: typeof counters.total_products === 'number' ? counters.total_products : 0,
        totalUsers: typeof counters.total_users === 'number' ? counters.total_users : 0,
        revenueGrowth: growth.revenue_growth || '+0.0%',
        ordersGrowth: growth.orders_growth || '+0.0%',
        usersGrowth: growth.users_growth || '+0.0%',
        recentOrders,
      };

      const cacheEntry = { data: metrics, timestamp: Date.now() };
      this.overviewCache = cacheEntry;
      if (typeof window !== 'undefined' && window.localStorage) {
        try {
          window.localStorage.setItem('cc_cache_admin_overview', JSON.stringify(cacheEntry));
        } catch {}
      }

      return metrics;
    } catch (err) {
      console.warn('Failed to load admin overview metrics from Atlas:', err);
      return this.overviewCache?.data || {
        totalRevenue: 0.0,
        newOrders: 0,
        productsInStock: 0,
        totalUsers: 0,
        revenueGrowth: '+0.0%',
        ordersGrowth: '+0.0%',
        usersGrowth: '+0.0%',
        recentOrders: [],
      };
    }
  }

  async getAdminProducts(
    page = 1,
    limit = 10,
    search = '',
    categoryId = ''
  ): Promise<AdminProductsResponse> {
    const params: Record<string, any> = { page, limit };
    if (search.trim()) params.search = search.trim();
    if (categoryId && categoryId !== 'All' && categoryId !== 'all') {
      params.category_id = categoryId;
    }

    const { data: res } = await apiClient.get('/products', { params });
    const payload = res?.data || res;
    const items = Array.isArray(payload?.products)
      ? payload.products
      : Array.isArray(payload)
      ? payload
      : [];

    const total = payload?.pagination?.total || payload?.total || items.length;
    const totalPages = payload?.pagination?.pages || payload?.total_pages || Math.max(1, Math.ceil(total / limit));

    return {
      products: items.map(this.mapBackendProductToUI),
      total,
      page: payload?.pagination?.page || page,
      limit: payload?.pagination?.limit || limit,
      totalPages,
    };
  }

  async getCategories(includeInactive = true): Promise<AdminCategoryItem[]> {
    const params = includeInactive ? { include_inactive: true } : {};
    const { data: res } = await apiClient.get('/categories', { params });
    const payload = res?.data || res;
    const items = Array.isArray(payload)
      ? payload
      : Array.isArray(payload?.categories)
      ? payload.categories
      : [];

    return items.map((c: any) => ({
      id: c.id || c._id,
      name: c.name || 'Category',
      description: c.description || '',
      imageUrl: c.image_url || c.imageUrl,
      isActive: c.is_active !== undefined ? Boolean(c.is_active) : true,
    }));
  }

  async createCategory(
    category: AdminCategoryCreateInput
  ): Promise<AdminCategoryItem> {
    const { data: res } = await apiClient.post('/categories', category);
    const payload = res?.data || res;
    return {
      id: payload.id || payload._id,
      name: payload.name || 'Category',
      description: payload.description || '',
      imageUrl: payload.image_url || payload.imageUrl,
      isActive: payload.is_active !== undefined ? Boolean(payload.is_active) : true,
    };
  }

  async updateCategory(
    id: string,
    updates: AdminCategoryUpdateInput
  ): Promise<AdminCategoryItem> {
    const { data: res } = await apiClient.put(`/categories/${id}`, updates);
    const payload = res?.data || res;
    return {
      id: payload.id || payload._id,
      name: payload.name || 'Category',
      description: payload.description || '',
      imageUrl: payload.image_url || payload.imageUrl,
      isActive: payload.is_active !== undefined ? Boolean(payload.is_active) : true,
    };
  }

  async deleteCategory(id: string): Promise<boolean> {
    const { data: res } = await apiClient.delete(`/categories/${id}`);
    return res?.success !== undefined ? res.success : true;
  }

  async createProduct(
    product: AdminProductCreateInput
  ): Promise<AdminProductItemUI> {
    if (product.image && (product.image.file || product.image.uri)) {
      const formData = new FormData();
      formData.append('name', product.name);
      formData.append('description', product.description);
      formData.append('price', String(product.price));
      if (product.discount_price != null) {
        formData.append('discount_price', String(product.discount_price));
      }
      formData.append('category_id', product.category_id);
      formData.append('stock', String(product.stock));
      formData.append('is_featured', String(Boolean(product.is_featured)));
      formData.append('is_bestseller', String(Boolean(product.is_bestseller)));
      formData.append('is_flash_sale', String(Boolean(product.is_flash_sale)));
      formData.append('is_recommended', String(Boolean(product.is_recommended)));

      if (product.image.file) {
        formData.append('image', product.image.file);
      } else {
        formData.append('image', {
          uri: product.image.uri,
          name: product.image.name || 'product.jpg',
          type: product.image.type || 'image/jpeg',
        } as any);
      }

      const { data: res } = await apiClient.post('/products', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      const payload = res?.data || res;
      return this.mapBackendProductToUI(payload);
    }

    const { data: res } = await apiClient.post('/products', product);
    const payload = res?.data || res;
    return this.mapBackendProductToUI(payload);
  }

  async updateAdminProduct(
    id: string,
    updates: AdminProductUpdateInput
  ): Promise<AdminProductItemUI> {
    if (updates.image && (updates.image.file || updates.image.uri)) {
      const formData = new FormData();
      if (updates.name !== undefined) formData.append('name', updates.name);
      if (updates.description !== undefined) formData.append('description', updates.description);
      if (updates.price !== undefined) formData.append('price', String(updates.price));
      if (updates.discount_price !== undefined) {
        formData.append(
          'discount_price',
          updates.discount_price != null ? String(updates.discount_price) : ''
        );
      }
      if (updates.category_id !== undefined) formData.append('category_id', updates.category_id);
      if (updates.stock !== undefined) formData.append('stock', String(updates.stock));
      if (updates.is_featured !== undefined) {
        formData.append('is_featured', String(Boolean(updates.is_featured)));
      }
      if (updates.is_bestseller !== undefined) {
        formData.append('is_bestseller', String(Boolean(updates.is_bestseller)));
      }
      if (updates.is_flash_sale !== undefined) {
        formData.append('is_flash_sale', String(Boolean(updates.is_flash_sale)));
      }
      if (updates.is_recommended !== undefined) {
        formData.append('is_recommended', String(Boolean(updates.is_recommended)));
      }
      if (updates.is_active !== undefined) {
        formData.append('is_active', String(Boolean(updates.is_active)));
      }

      if (updates.image.file) {
        formData.append('image', updates.image.file);
      } else {
        formData.append('image', {
          uri: updates.image.uri,
          name: updates.image.name || 'product.jpg',
          type: updates.image.type || 'image/jpeg',
        } as any);
      }

      const { data: res } = await apiClient.put(`/products/${id}`, formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      const payload = res?.data || res;
      return this.mapBackendProductToUI(payload);
    }

    const { data: res } = await apiClient.put(`/products/${id}`, updates);
    const payload = res?.data || res;
    return this.mapBackendProductToUI(payload);
  }

  async deleteAdminProduct(id: string): Promise<boolean> {
    const { data: res } = await apiClient.delete(`/products/${id}`);
    return res?.success !== undefined ? res.success : true;
  }

  async adjustInventory(
    productId: string,
    transactionType: 'IN' | 'OUT' | 'ADJUST',
    quantity: number,
    remarks?: string
  ): Promise<any> {
    const { data: res } = await apiClient.post('/inventory/adjust', {
      product_id: productId,
      transaction_type: transactionType,
      quantity,
      remarks: remarks || `Admin inventory adjustment (${transactionType})`,
    });
    return res?.data || res;
  }

  async getInventoryOverview(params: {
    search?: string;
    statusFilter?: string;
    categoryId?: string;
    page?: number;
    limit?: number;
  }): Promise<InventoryOverviewResponseUI> {
    const queryParams: Record<string, any> = {
      page: params.page || 1,
      limit: params.limit || 10,
    };
    if (params.search && params.search.trim()) queryParams.search = params.search.trim();
    if (params.statusFilter && params.statusFilter !== 'all' && params.statusFilter !== 'All') {
      queryParams.status_filter = params.statusFilter.toLowerCase().replace(' ', '_');
    }
    if (params.categoryId && params.categoryId !== 'all' && params.categoryId !== 'All') {
      queryParams.category_id = params.categoryId;
    }

    const { data: res } = await apiClient.get('/inventory/overview', { params: queryParams });
    const payload = res?.data || res;
    const metricsRaw = payload?.metrics || {};
    const itemsRaw = Array.isArray(payload?.items) ? payload.items : [];
    const pagRaw = payload?.pagination || {};

    return {
      metrics: {
        totalProducts: metricsRaw.total_products || 0,
        totalStockUnits: metricsRaw.total_stock_units || 0,
        lowStockCount: metricsRaw.low_stock_count || 0,
        outOfStockCount: metricsRaw.out_of_stock_count || 0,
      },
      items: itemsRaw.map((it: any) => ({
        productId: it.product_id || it.productId,
        name: it.name || 'Product',
        categoryId: it.category_id || it.categoryId || '',
        categoryName: it.category_name || it.categoryName || 'Aerial Shells',
        price: typeof it.price === 'number' ? it.price : 0,
        stock: typeof it.stock === 'number' ? it.stock : 0,
        minimumStock: it.minimum_stock || 5,
        maximumStock: it.maximum_stock || 1000,
        stockStatus: it.stock_status || (it.stock === 0 ? 'OUT_OF_STOCK' : it.stock <= 5 ? 'LOW_STOCK' : 'IN_STOCK'),
        images: Array.isArray(it.images) ? it.images : [],
        lastUpdated: it.last_updated || new Date().toISOString(),
      })),
      pagination: {
        total: pagRaw.total || itemsRaw.length,
        page: pagRaw.page || params.page || 1,
        limit: pagRaw.limit || params.limit || 10,
        pages: pagRaw.pages || Math.max(1, Math.ceil((pagRaw.total || itemsRaw.length) / (pagRaw.limit || 10))),
      },
    };
  }

  async getInventory(productId: string): Promise<InventoryDetailsUI> {
    const { data: res } = await apiClient.get(`/inventory/${productId}`);
    const payload = res?.data || res;
    return {
      id: payload.id || payload._id,
      productId: payload.product_id || payload.productId,
      currentStock: typeof payload.current_stock === 'number' ? payload.current_stock : 0,
      minimumStock: payload.minimum_stock || 5,
      maximumStock: payload.maximum_stock || 1000,
      lastUpdated: payload.last_updated || new Date().toISOString(),
      history: Array.isArray(payload.history)
        ? payload.history.map((h: any) => ({
            transactionType: h.transaction_type,
            quantity: h.quantity,
            oldStock: h.old_stock,
            newStock: h.new_stock,
            remarks: h.remarks || '',
            createdBy: h.created_by || 'Admin',
            createdAt: h.created_at || new Date().toISOString(),
          }))
        : [],
    };
  }

  async getInventoryHistory(productId: string): Promise<InventoryHistoryItemUI[]> {
    const { data: res } = await apiClient.get(`/inventory/history/${productId}`);
    const payload = res?.data || res;
    const historyList = Array.isArray(payload) ? payload : [];
    return historyList.map((h: any) => ({
      transactionType: h.transaction_type,
      quantity: h.quantity,
      oldStock: h.old_stock,
      newStock: h.new_stock,
      remarks: h.remarks || '',
      createdBy: h.created_by || 'Admin',
      createdAt: h.created_at || new Date().toISOString(),
    }));
  }

  async getLowStockProducts(): Promise<any[]> {
    const { data: res } = await apiClient.get('/inventory/low-stock');
    return res?.data || res;
  }

  async getOutOfStockProducts(): Promise<any[]> {
    const { data: res } = await apiClient.get('/inventory/out-of-stock');
    return res?.data || res;
  }

  async getAdminCoupons(params?: {
    search?: string;
    statusFilter?: string;
    page?: number;
    limit?: number;
  }): Promise<CouponOverviewResponseUI> {
    const queryParams: Record<string, any> = {
      page: params?.page || 1,
      limit: params?.limit || 10,
    };
    if (params?.search && params.search.trim()) queryParams.search = params.search.trim();
    if (params?.statusFilter && params.statusFilter !== 'All' && params.statusFilter !== 'all') {
      queryParams.status_filter = params.statusFilter.toLowerCase().replace(/ /g, '_');
    }

    const { data: res } = await apiClient.get('/coupons', { params: queryParams });
    const payload = res?.data || res;
    const metricsRaw = payload?.metrics || {};
    const itemsRaw = Array.isArray(payload?.items) ? payload.items : [];
    const pagRaw = payload?.pagination || {};

    return {
      metrics: {
        totalCoupons: metricsRaw.total_coupons || 0,
        activeCoupons: metricsRaw.active_coupons || 0,
        expiringSoonCount: metricsRaw.expiring_soon_count || 0,
        totalRedemptions: metricsRaw.total_redemptions || 0,
      },
      items: itemsRaw.map(this.mapBackendCouponToUI),
      pagination: {
        total: pagRaw.total || itemsRaw.length,
        page: pagRaw.page || params?.page || 1,
        limit: pagRaw.limit || params?.limit || 10,
        pages: pagRaw.pages || Math.max(1, Math.ceil((pagRaw.total || itemsRaw.length) / (pagRaw.limit || 10))),
      },
    };
  }

  async createCoupon(input: AdminCouponCreateInput): Promise<AdminCouponItem> {
    const { data: res } = await apiClient.post('/coupons', input);
    return this.mapBackendCouponToUI(res?.data || res);
  }

  async updateCoupon(id: string, updates: AdminCouponUpdateInput): Promise<AdminCouponItem> {
    const { data: res } = await apiClient.put(`/coupons/${id}`, updates);
    return this.mapBackendCouponToUI(res?.data || res);
  }

  async updateCouponStatus(id: string, isActive: boolean): Promise<AdminCouponItem> {
    const { data: res } = await apiClient.patch(`/coupons/${id}/status`, { is_active: isActive });
    return this.mapBackendCouponToUI(res?.data || res);
  }

  async deleteCoupon(id: string): Promise<boolean> {
    const { data: res } = await apiClient.delete(`/coupons/${id}`);
    return res?.success !== undefined ? res.success : true;
  }

  async getCoupon(id: string): Promise<AdminCouponItem> {
    const { data: res } = await apiClient.get(`/coupons/${id}`);
    return this.mapBackendCouponToUI(res?.data || res);
  }

  private mapBackendCouponToUI(c: any): AdminCouponItem {
    return {
      id: c.id || c._id || '',
      couponCode: c.coupon_code || c.couponCode || '',
      description: c.description || '',
      discountType: c.discount_type || c.discountType || 'percentage',
      percentage: typeof c.percentage === 'number' ? c.percentage : undefined,
      fixedAmount: typeof c.fixed_amount === 'number' ? c.fixed_amount : typeof c.fixedAmount === 'number' ? c.fixedAmount : undefined,
      minimumOrder: typeof c.minimum_order === 'number' ? c.minimum_order : (c.minimumOrder || 0),
      maximumDiscount: typeof c.maximum_discount === 'number' ? c.maximum_discount : c.maximumDiscount,
      startDate: c.start_date || c.startDate,
      expiryDate: c.expiry_date || c.expiryDate || new Date().toISOString(),
      usageLimit: typeof c.usage_limit === 'number' ? c.usage_limit : (c.usageLimit || 1),
      usedCount: typeof c.used_count === 'number' ? c.used_count : (c.usedCount || 0),
      isActive: c.is_active !== undefined ? Boolean(c.is_active) : (c.status !== 'deleted'),
      couponStatus: c.coupon_status || (c.is_active ? 'ACTIVE' : 'INACTIVE'),
      createdAt: c.created_at || c.createdAt || new Date().toISOString(),
      updatedAt: c.updated_at || c.updatedAt || new Date().toISOString(),
    };
  }

  async getAdminOrders(
    page = 1,
    limit = 10,
    search = '',
    orderStatus = 'All',
    paymentStatus = 'All'
  ): Promise<AdminOrdersResponse> {
    const params: Record<string, any> = { page, limit };
    if (search.trim()) params.search = search.trim();
    if (orderStatus !== 'All') params.order_status = orderStatus;
    if (paymentStatus !== 'All') params.payment_status = paymentStatus;

    const response = await apiClient.get('/admin/orders', { params });
    const payload = response.data?.data || response.data;
    if (payload && payload.orders) {
      return {
        orders: payload.orders.map(this.mapBackendAdminOrder),
        total: payload.total || payload.orders.length,
        page: payload.page || page,
        totalPages: payload.total_pages || Math.max(1, Math.ceil((payload.total || payload.orders.length) / limit)),
      };
    }
    if (Array.isArray(payload)) {
      return {
        orders: payload.map(this.mapBackendAdminOrder),
        total: response.data?.total || payload.length,
        page: response.data?.page || 1,
        totalPages: response.data?.total_pages || 1,
      };
    }
    return {
      orders: [],
      total: 0,
      page: 1,
      totalPages: 1,
    };
  }

  async updateOrderStatus(
    orderId: string,
    newStatus: AdminOrderItem['orderStatus']
  ): Promise<AdminOrderItem> {
    const { data } = await apiClient.put(`/admin/orders/${orderId}/status`, {
      order_status: newStatus,
    });
    return this.mapBackendAdminOrder(data.data || data);
  }

  async updatePaymentStatus(
    orderId: string,
    newStatus: AdminOrderItem['paymentStatus']
  ): Promise<AdminOrderItem> {
    const { data } = await apiClient.put(`/admin/orders/${orderId}/payment-status`, {
      payment_status: newStatus,
    });
    return this.mapBackendAdminOrder(data.data || data);
  }

  async deleteAdminOrder(orderId: string): Promise<void> {
    try {
      await apiClient.delete(`/orders/${orderId}`);
    } catch (error) {
      console.error('Failed to delete admin order', error);
      throw error;
    }
  }

  // ==========================================
  // USER MANAGEMENT APIS
  // ==========================================

  async getAdminUsers(params?: {
    page?: number;
    limit?: number;
    search?: string;
    role?: string;
    account_status?: string;
    sort_by?: string;
    sort_order?: string;
  }): Promise<AdminUserListResponseUI> {
    const { data: res } = await apiClient.get('/admin/users', { params });
    const payload = res.data || res;
    return {
      users: (payload.users || []).map((u: any) => this.mapBackendUserToUI(u)),
      total: payload.total || 0,
      page: payload.page || 1,
      limit: payload.limit || 10,
      totalPages: payload.total_pages || 1,
      metrics: {
        totalUsers: payload.metrics?.total_users || 0,
        activeUsers: payload.metrics?.active_users || 0,
        inactiveUsers: payload.metrics?.inactive_users || 0,
        blockedUsers: payload.metrics?.blocked_users || 0,
        customerCount: payload.metrics?.customer_count || 0,
        adminCount: payload.metrics?.admin_count || 0,
      },
    };
  }

  async getAdminUser(userId: string): Promise<AdminUserDetail> {
    const { data: res } = await apiClient.get(`/admin/users/${userId}`);
    const payload = res.data || res;
    return {
      id: payload.id || userId,
      fullName: payload.full_name || 'Customer',
      email: payload.email || '',
      phone: payload.phone || '',
      role: payload.role || 'CUSTOMER',
      isVerified: Boolean(payload.is_verified),
      isActive: Boolean(payload.is_active),
      status: payload.status || 'active',
      createdAt: payload.created_at || new Date().toISOString(),
      updatedAt: payload.updated_at || new Date().toISOString(),
      orderSummary: payload.order_summary || {},
      recentOrders: Array.isArray(payload.recent_orders)
        ? payload.recent_orders.map((o: any) => this.mapBackendCustomerOrder(o))
        : [],
    };
  }

  async updateUserStatus(
    userId: string,
    status: string,
    isActive?: boolean
  ): Promise<AdminUserDetail> {
    const { data: res } = await apiClient.patch(`/admin/users/${userId}/status`, {
      status,
      is_active: isActive,
    });
    const payload = res.data || res;
    return {
      id: payload.id || userId,
      fullName: payload.full_name || 'Customer',
      email: payload.email || '',
      phone: payload.phone || '',
      role: payload.role || 'CUSTOMER',
      isVerified: Boolean(payload.is_verified),
      isActive: Boolean(payload.is_active),
      status: payload.status || status,
      createdAt: payload.created_at || new Date().toISOString(),
      updatedAt: payload.updated_at || new Date().toISOString(),
      orderSummary: payload.order_summary || {},
      recentOrders: Array.isArray(payload.recent_orders)
        ? payload.recent_orders.map((o: any) => this.mapBackendCustomerOrder(o))
        : [],
    };
  }

  async updateUserRole(
    userId: string,
    role: 'CUSTOMER' | 'ADMIN'
  ): Promise<AdminUserDetail> {
    const { data: res } = await apiClient.patch(`/admin/users/${userId}/role`, {
      role,
    });
    const payload = res.data || res;
    return {
      id: payload.id || userId,
      fullName: payload.full_name || 'Customer',
      email: payload.email || '',
      phone: payload.phone || '',
      role: payload.role || role,
      isVerified: Boolean(payload.is_verified),
      isActive: Boolean(payload.is_active),
      status: payload.status || 'active',
      createdAt: payload.created_at || new Date().toISOString(),
      updatedAt: payload.updated_at || new Date().toISOString(),
      orderSummary: payload.order_summary || {},
      recentOrders: Array.isArray(payload.recent_orders)
        ? payload.recent_orders.map((o: any) => this.mapBackendCustomerOrder(o))
        : [],
    };
  }

  async getUserOrders(
    userId: string,
    page: number = 1,
    limit: number = 10
  ): Promise<UserOrdersResponseUI> {
    const { data: res } = await apiClient.get(`/admin/users/${userId}/orders`, {
      params: { page, limit },
    });
    const payload = res.data || res;
    const rawOrders = Array.isArray(payload.orders) ? payload.orders : [];
    return {
      orders: rawOrders.map((o: any) => this.mapBackendCustomerOrder(o)),
      total: payload.total || 0,
      page: payload.page || 1,
      limit: payload.limit || 10,
      totalPages: payload.total_pages || 1,
      orderSummary: payload.order_summary || {},
    };
  }

  async deactivateUser(userId: string): Promise<AdminUserDetail> {
    const { data: res } = await apiClient.delete(`/admin/users/${userId}`);
    const payload = res.data || res;
    return {
      id: payload.id || userId,
      fullName: payload.full_name || 'Customer',
      email: payload.email || '',
      phone: payload.phone || '',
      role: payload.role || 'CUSTOMER',
      isVerified: Boolean(payload.is_verified),
      isActive: false,
      status: 'inactive',
      createdAt: payload.created_at || new Date().toISOString(),
      updatedAt: payload.updated_at || new Date().toISOString(),
      orderSummary: payload.order_summary || {},
      recentOrders: Array.isArray(payload.recent_orders)
        ? payload.recent_orders.map((o: any) => this.mapBackendCustomerOrder(o))
        : [],
    };
  }

  private mapBackendUserToUI(u: any): AdminUserItem {
    return {
      id: u.id || u._id || '',
      fullName: u.full_name || u.fullName || 'Customer',
      email: u.email || '',
      phone: u.phone || '',
      role: u.role === 'ADMIN' ? 'ADMIN' : 'CUSTOMER',
      isVerified: Boolean(u.is_verified),
      isActive: Boolean(u.is_active),
      status: u.status || 'active',
      createdAt: u.created_at || new Date().toISOString(),
      updatedAt: u.updated_at || new Date().toISOString(),
      orderCount: typeof u.order_count === 'number' ? u.order_count : 0,
      totalSpent: typeof u.total_spent === 'number' ? u.total_spent : 0.0,
    };
  }

  private mapBackendProductToUI(p: any): AdminProductItemUI {
    const mainImage = Array.isArray(p.images) && p.images.length > 0 ? p.images[0] : (p.image_url || p.imageUrl || '');
    return {
      id: p.id || p._id || '',
      title: p.name || p.title || 'Product',
      name: p.name || p.title || 'Product',
      description: p.description || '',
      category: p.category_name || p.category || 'Aerial Shells',
      categoryId: p.category_id || p.categoryId || '',
      price: typeof p.price === 'number' ? p.price : 0,
      originalPrice: p.discount_price ? p.price : undefined,
      discountPrice: p.discount_price !== undefined ? p.discount_price : null,
      stock: typeof p.stock === 'number' ? p.stock : 0,
      images: Array.isArray(p.images) ? p.images : mainImage ? [mainImage] : [],
      imageUrl: mainImage,
      isFeatured: Boolean(p.is_featured || p.isFeatured),
      isBestseller: Boolean(p.is_bestseller || p.isBestseller),
      isFlashSale: Boolean(p.is_flash_sale || p.isFlashSale),
      isRecommended: Boolean(p.is_recommended || p.isRecommended),
      isActive: p.is_active !== undefined ? Boolean(p.is_active) : (p.status !== 'deleted'),
      rating: p.rating || p.average_rating || 5.0,
      reviewsCount: p.reviews_count || p.total_reviews || 0,
      createdAt: p.created_at || new Date().toISOString(),
    };
  }

  private mapBackendAdminOrder(item: any): AdminOrderItem {
    const dateVal = item.created_at || item.date;
    const formattedDate = dateVal
      ? new Date(dateVal).toISOString().split('T')[0]
      : new Date().toISOString().split('T')[0];

    const rawItems = Array.isArray(item.items) ? item.items : [];
    const mappedItems = rawItems.map((it: any) => ({
      id: it.id || it._id || '',
      product_id: it.product_id || it.productId || '',
      product_name: it.product_name || it.productName || it.name || it.product?.name || 'Cracker Item',
      product_image: it.product_image || it.productImage || it.image || (it.product?.images && it.product.images[0]) || null,
      quantity: typeof it.quantity === 'number' ? it.quantity : 1,
      price: typeof it.price === 'number' ? it.price : (it.unit_price || 0),
      unit_price: typeof it.unit_price === 'number' ? it.unit_price : (it.price || 0),
      subtotal: typeof it.subtotal === 'number' ? it.subtotal : ((it.quantity || 1) * (it.price || 0)),
      category: it.category || it.product?.category || '',
      product: it.product || (it.product_name ? { id: it.product_id, name: it.product_name, category: it.category, images: it.product_image ? [it.product_image] : [] } : undefined),
    }));

    return {
      id: item.id || item._id || 'ord_meta',
      orderNumber: item.order_number || item.orderNumber || '#ORD-0000',
      customerName: item.customer_name || item.customerName || (item.shipping_address ? (typeof item.shipping_address === 'string' ? item.shipping_address.split(',')[0] : item.shipping_address.full_name) : 'Customer'),
      customerEmail: item.customer_email || item.customerEmail || item.user_id || 'customer@example.com',
      date: formattedDate,
      totalAmount: typeof item.total === 'number' ? item.total : (item.totalAmount || 0.0),
      subtotal: typeof item.subtotal === 'number' ? item.subtotal : (item.total || 0.0),
      discount: typeof item.discount === 'number' ? item.discount : 0,
      shipping: typeof item.shipping === 'number' ? item.shipping : 0,
      tax: typeof item.tax === 'number' ? item.tax : 0,
      itemCount: typeof item.item_count === 'number' ? item.item_count : (mappedItems.length || 1),
      orderStatus: item.order_status || item.orderStatus || 'Pending',
      paymentStatus: item.payment_status || item.paymentStatus || 'Pending',
      paymentMethod: item.payment_method || item.paymentMethod || 'Credit Card',
      shippingAddress: typeof item.shipping_address === 'string' ? item.shipping_address : (item.shipping_address?.full_name ? `${item.shipping_address.full_name}, ${item.shipping_address.street || ''}` : ''),
      razorpayOrderId: item.razorpay_order_id || item.razorpayOrderId || null,
      razorpayPaymentId: item.payment_status === 'Pending' ? null : (item.razorpay_payment_id || item.razorpayPaymentId || null),
      items: mappedItems,
    };
  }

  private mapBackendCustomerOrder(ord: any): CustomerOrderDetailUI {
    const rawItems = Array.isArray(ord.items) ? ord.items : [];
    const mappedItems: UserOrderItemUI[] = rawItems.map((it: any) => ({
      id: it.id || it._id || '',
      productId: it.product_id || it.productId || '',
      productName: it.product_name || it.productName || it.name || it.product?.name || 'Cracker Item',
      productImage: it.product_image || it.productImage || it.image || (it.product?.images && it.product.images[0]) || null,
      category: it.category || it.product?.category || '',
      quantity: typeof it.quantity === 'number' ? it.quantity : 1,
      unitPrice: typeof it.unit_price === 'number' ? it.unit_price : (it.price || 0),
      price: typeof it.price === 'number' ? it.price : (it.unit_price || 0),
      subtotal: typeof it.subtotal === 'number' ? it.subtotal : ((it.quantity || 1) * (it.price || 0)),
      total: typeof it.total === 'number' ? it.total : ((it.quantity || 1) * (it.price || 0)),
    }));

    return {
      id: ord.id || ord._id || '',
      orderNumber: ord.order_number || ord.orderNumber || '#ORD-0000',
      userId: ord.user_id || ord.userId,
      date: ord.date || (ord.created_at ? new Date(ord.created_at).toLocaleDateString() : 'Recent'),
      createdAt: ord.created_at || ord.createdAt,
      orderStatus: ord.order_status || ord.orderStatus || 'Pending',
      paymentStatus: ord.payment_status || ord.paymentStatus || 'Pending',
      paymentMethod: ord.payment_method || ord.paymentMethod || 'Card',
      subtotal: typeof ord.subtotal === 'number' ? ord.subtotal : (ord.total || 0),
      discount: typeof ord.discount === 'number' ? ord.discount : 0,
      shipping: typeof ord.shipping === 'number' ? ord.shipping : 0,
      tax: typeof ord.tax === 'number' ? ord.tax : 0,
      total: typeof ord.total === 'number' ? ord.total : (ord.totalAmount || 0),
      couponCode: ord.coupon_code || ord.couponCode || null,
      couponDiscount: typeof ord.coupon_discount === 'number' ? ord.coupon_discount : 0,
      shippingAddress: typeof ord.shipping_address === 'string' ? ord.shipping_address : (ord.shipping_address?.full_name ? `${ord.shipping_address.full_name}, ${ord.shipping_address.street || ''}` : ''),
      itemCount: typeof ord.item_count === 'number' ? ord.item_count : mappedItems.length,
      razorpayOrderId: ord.razorpay_order_id || ord.razorpayOrderId || null,
      razorpayPaymentId: ord.payment_status === 'Pending' ? null : (ord.razorpay_payment_id || ord.razorpayPaymentId || null),
      paymentCompletedAt: ord.payment_completed_at || ord.paymentCompletedAt || null,
      items: mappedItems,
    };
  }
}

export const adminService = new AdminService();
export default adminService;

