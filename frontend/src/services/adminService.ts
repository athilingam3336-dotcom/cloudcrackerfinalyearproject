/**
 * Admin Service
 * API service for administrative metrics, revenue overview, inventory management, and order management.
 * Uses apiClient for real backend calls; falls back to mock data when ENABLE_MOCK_API is true.
 */

import { ProductItem } from '@/constants/mockData';
import { apiClient } from '@/api/axios';
import { ENV } from '@/config/env';
import { productService } from './productService';

export function normalizeAdminOrderStatus(rawStatus?: string): string {
  if (!rawStatus) return 'Pending';
  const s = String(rawStatus).trim().toLowerCase();
  if (s === 'delivered') return 'Delivered';
  if (s === 'shipped') return 'Shipped';
  if (s === 'in transit' || s === 'in_transit') return 'In Transit';
  if (s === 'processing') return 'Processing';
  if (s === 'packed') return 'Packed';
  if (s === 'confirmed') return 'Confirmed';
  if (s === 'cancelled' || s === 'canceled') return 'Cancelled';
  if (s === 'pending') return 'Pending';
  if (s === 'refunded') return 'Refunded';
  return rawStatus.charAt(0).toUpperCase() + rawStatus.slice(1);
}

export interface BestSellingProductSummary {
  name: string;
  units_sold: number;
  revenue: number;
}

export interface ProductSalesSummaryItem {
  product_id: string;
  product_name: string;
  total_sold: number;
  total_revenue: number;
  category: string;
}

export interface CategorySalesSummaryItem {
  category_id: string;
  category_name: string;
  total_sold: number;
  total_revenue: number;
  percentage: number;
}

export interface HourlySalesTrendItem {
  hour: string;
  hour_label: string;
  revenue: number;
  orders: number;
  units: number;
}

export interface SalesSummaryData {
  date: string;
  today_revenue: number;
  today_orders: number;
  total_units_sold: number;
  average_order_value: number;
  best_selling_product?: BestSellingProductSummary | null;
  products: ProductSalesSummaryItem[];
  categories: CategorySalesSummaryItem[];
  hourly_trend: HourlySalesTrendItem[];
  insights: string[];
}

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

export interface AnalyticsSalesPoint {
  label: string;
  date: string;
  revenue: number;
  ordersCount: number;
}

export interface AnalyticsOrderBreakdown {
  totalOrders: number;
  completedOrders: number;
  pendingOrders: number;
  cancelledOrders: number;
}

export interface AnalyticsTopProduct {
  productId: string;
  name: string;
  category: string;
  totalSold: number;
  totalRevenue: number;
}

export interface AnalyticsInventoryDistribution {
  outOfStock: number;
  lowStock: number;
  goodStock: number;
  totalProducts: number;
  totalStockUnits: number;
}

export interface AnalyticsLocationPoint {
  location: string;
  revenue: number;
  ordersCount: number;
}

export interface AnalyticsCustomerBreakdown {
  totalUsers: number;
  newCustomers: number;
  returningCustomers: number;
}

export interface AnalyticsSeasonalPoint {
  month: string;
  monthIndex: number; // 1-12
  year: number;
  revenue: number;
  ordersCount: number;
  isDiwaliPeriod: boolean;
}

export interface BusinessAnalyticsData {
  totalRevenue: number;
  totalOrders: number;
  hasOrderData: boolean;
  salesTrend: AnalyticsSalesPoint[];
  isCostAvailable: boolean;
  revenueTotal: number;
  orderBreakdown: AnalyticsOrderBreakdown;
  topProducts: AnalyticsTopProduct[];
  inventoryDistribution: AnalyticsInventoryDistribution;
  locationSales: AnalyticsLocationPoint[];
  customerBreakdown: AnalyticsCustomerBreakdown;
  seasonalTrends: AnalyticsSeasonalPoint[];
  lastUpdated: number;
  rawOrders?: any[];
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
  transactionReference?: string | null;
  upiUri?: string | null;
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
  transactionReference?: string | null;
  upiUri?: string | null;
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
  flash_sale_hours?: number;
  is_recommended?: boolean;
  time_of_day?: 'morning' | 'night' | 'both' | string;
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
  flash_sale_hours?: number;
  is_recommended?: boolean;
  is_active?: boolean;
  time_of_day?: 'morning' | 'night' | 'both' | string;
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
  flashSaleHours?: number;
  isRecommended: boolean;
  isActive: boolean;
  timeOfDay?: 'morning' | 'night' | 'both';
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

export interface TodayReportOrderItem {
  id: string;
  order_number: string;
  customer_name: string;
  total: number;
  order_status: string;
  payment_status: string;
  items_summary: string;
  created_at: string;
}

export interface TodayReportStockItem {
  id: string;
  name: string;
  category_name: string;
  price: number;
  sold_today: number;
  stock_left: number;
  status: 'In Stock' | 'Low Stock' | 'Out of Stock' | string;
}

export interface TodayReportData {
  date: string;
  today_revenue: number;
  today_orders: number;
  today_items_sold: number;
  remaining_stock: number;
  download_count: number;
  day_closed: boolean;
  today_orders_list: TodayReportOrderItem[];
  stock_inventory_list?: TodayReportStockItem[];
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
  private analyticsCache: { data: BusinessAnalyticsData; timestamp: number } | null = null;

  /**
   * Generates realistic demo/fake analytics data for Sivakasi crackers business.
   * Used as fallback when no real order/product data is available from backend,
   * so that pie charts, bar charts and line charts render immediately.
   */
  private generateDemoAnalyticsData(): BusinessAnalyticsData {
    const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    const now = new Date();
    const currentMonth = now.getMonth();
    const currentYear = now.getFullYear();

    // Generate 12 months of sales trend data with realistic Diwali season spikes
    const salesTrend: AnalyticsSalesPoint[] = [];
    const demoRevenueByMonth = [
      12500, 9800, 8200, 7500, 11000, 14200, 16800, 19500, 28000, 52000, 45000, 18000
    ];
    const demoOrdersByMonth = [
      45, 38, 32, 28, 42, 55, 65, 78, 110, 195, 168, 72
    ];

    for (let i = 11; i >= 0; i--) {
      const mIdx = (currentMonth - i + 12) % 12;
      const yr = currentMonth - i < 0 ? currentYear - 1 : currentYear;
      const monthKey = `${yr}-${String(mIdx + 1).padStart(2, '0')}`;
      salesTrend.push({
        label: `${monthNames[mIdx]} ${yr}`,
        date: monthKey,
        revenue: demoRevenueByMonth[mIdx],
        ordersCount: demoOrdersByMonth[mIdx],
      });
    }

    const totalRevenue = salesTrend.reduce((s, t) => s + t.revenue, 0);
    const totalOrders = salesTrend.reduce((s, t) => s + t.ordersCount, 0);

    // Order breakdown
    const completedOrders = Math.round(totalOrders * 0.72);
    const pendingOrders = Math.round(totalOrders * 0.18);
    const cancelledOrders = totalOrders - completedOrders - pendingOrders;

    // Top selling products (Sivakasi crackers themed)
    const topProducts: AnalyticsTopProduct[] = [
      { productId: 'demo-1', name: 'Deluxe Diwali Gift Box',       category: 'Gift Packs',      totalSold: 285, totalRevenue: 142500 },
      { productId: 'demo-2', name: 'Sky Shot Supreme (25 pcs)',    category: 'Aerial Fireworks', totalSold: 210, totalRevenue: 84000  },
      { productId: 'demo-3', name: 'Flower Pot Mega Combo',        category: 'Ground Spinners',  totalSold: 175, totalRevenue: 52500  },
      { productId: 'demo-4', name: 'Lakshmi Crackers 1000 Wala',   category: 'Sound Crackers',   totalSold: 320, totalRevenue: 48000  },
      { productId: 'demo-5', name: 'Sparklers Gold Premium (50pc)', category: 'Sparklers',        totalSold: 450, totalRevenue: 36000  },
    ];

    // Inventory distribution
    const inventoryDistribution: AnalyticsInventoryDistribution = {
      outOfStock: 3,
      lowStock: 8,
      goodStock: 42,
      totalProducts: 53,
      totalStockUnits: 4850,
    };

    // Location-wise sales (South Indian cities focus)
    const locationSales: AnalyticsLocationPoint[] = [
      { location: 'Sivakasi',     revenue: 85000,  ordersCount: 180 },
      { location: 'Chennai',      revenue: 62000,  ordersCount: 145 },
      { location: 'Madurai',      revenue: 38000,  ordersCount: 92  },
      { location: 'Coimbatore',   revenue: 31000,  ordersCount: 78  },
      { location: 'Trichy',       revenue: 22000,  ordersCount: 55  },
      { location: 'Salem',        revenue: 18500,  ordersCount: 42  },
      { location: 'Tirunelveli',  revenue: 15000,  ordersCount: 35  },
      { location: 'Bangalore',    revenue: 28000,  ordersCount: 65  },
    ];

    // Customer breakdown
    const customerBreakdown: AnalyticsCustomerBreakdown = {
      totalUsers: 312,
      newCustomers: 198,
      returningCustomers: 114,
    };

    // Seasonal trends
    const seasonalTrends: AnalyticsSeasonalPoint[] = salesTrend.map((st) => {
      const parts = st.date.split('-');
      const y = parseInt(parts[0], 10);
      const mIdx = parseInt(parts[1], 10);
      return {
        month: st.label,
        monthIndex: mIdx,
        year: y,
        revenue: st.revenue,
        ordersCount: st.ordersCount,
        isDiwaliPeriod: mIdx === 10 || mIdx === 11,
      };
    });

    return {
      totalRevenue,
      totalOrders,
      hasOrderData: true,
      salesTrend,
      isCostAvailable: false,
      revenueTotal: totalRevenue,
      orderBreakdown: {
        totalOrders,
        completedOrders,
        pendingOrders,
        cancelledOrders,
      },
      topProducts,
      inventoryDistribution,
      locationSales,
      customerBreakdown,
      seasonalTrends,
      lastUpdated: Date.now(),
      rawOrders: [],
    };
  }

  async getBusinessAnalyticsData(forceRefresh: boolean = false): Promise<BusinessAnalyticsData> {
    const now = Date.now();
    if (!forceRefresh && this.analyticsCache && now - this.analyticsCache.timestamp < 60_000) {
      return this.analyticsCache.data;
    }

    if (!forceRefresh && typeof window !== 'undefined' && window.localStorage) {
      try {
        const stored = window.localStorage.getItem('cc_cache_business_analytics');
        if (stored) {
          const parsed = JSON.parse(stored);
          if (parsed && parsed.data) {
            this.analyticsCache = parsed;
            if (now - parsed.timestamp >= 30_000) {
              this.getBusinessAnalyticsData(true).catch(() => {});
            }
            return parsed.data;
          }
        }
      } catch {}
    }

    try {
      const [dashRes, ordersRes, productsRes, usersRes] = await Promise.allSettled([
        apiClient.get('/admin/dashboard'),
        apiClient.get('/admin/orders', { params: { page: 1, limit: 100 } }),
        apiClient.get('/products', { params: { page: 1, limit: 100 } }),
        apiClient.get('/admin/users', { params: { page: 1, limit: 100 } }),
      ]);

      const dashData = dashRes.status === 'fulfilled' ? (dashRes.value.data?.data || dashRes.value.data) : {};
      const ordersData = ordersRes.status === 'fulfilled' ? (ordersRes.value.data?.data || ordersRes.value.data) : {};
      const productsData = productsRes.status === 'fulfilled' ? (productsRes.value.data?.data || productsRes.value.data) : {};
      const usersData = usersRes.status === 'fulfilled' ? (usersRes.value.data?.data || usersRes.value.data) : {};

      const rawOrders: any[] = Array.isArray(ordersData?.orders)
        ? ordersData.orders
        : Array.isArray(ordersData)
        ? ordersData
        : (dashData?.recent_orders || []);

      const rawProducts: any[] = Array.isArray(productsData?.products)
        ? productsData.products
        : Array.isArray(productsData)
        ? productsData
        : [];

      const rawUsers: any[] = Array.isArray(usersData?.users) ? usersData.users : [];

      const counters = dashData?.counters || {};
      const revenueInfo = dashData?.revenue || {};

      const totalRevenue = typeof revenueInfo.total_revenue === 'number'
        ? revenueInfo.total_revenue
        : rawOrders.reduce((sum, o) => sum + (o.total || o.totalAmount || 0), 0);

      const totalOrdersCount = typeof counters.total_orders === 'number'
        ? counters.total_orders
        : rawOrders.length;

      const hasOrderData = totalOrdersCount > 0 || rawOrders.length > 0;

      // 1. Sales Trend
      const monthlyTrendsRaw = dashData?.monthly_trends || [];
      let salesTrend: AnalyticsSalesPoint[] = [];

      if (Array.isArray(monthlyTrendsRaw) && monthlyTrendsRaw.length > 0) {
        const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
        salesTrend = monthlyTrendsRaw.map((m: any) => {
          const monthStr = m.month || '2025-01';
          const [y, mNum] = monthStr.split('-');
          const label = mNum ? `${monthNames[parseInt(mNum, 10) - 1] || mNum} ${y}` : monthStr;
          return {
            label,
            date: monthStr,
            revenue: typeof m.revenue === 'number' ? m.revenue : 0,
            ordersCount: typeof m.orders_count === 'number' ? m.orders_count : 0,
          };
        });
      } else if (rawOrders.length > 0) {
        const mapByMonth: Record<string, { revenue: number; count: number }> = {};
        for (const o of rawOrders) {
          const dateVal = o.created_at || o.date;
          const monthKey = dateVal ? new Date(dateVal).toISOString().slice(0, 7) : 'Recent';
          if (!mapByMonth[monthKey]) mapByMonth[monthKey] = { revenue: 0, count: 0 };
          mapByMonth[monthKey].revenue += (o.total || o.totalAmount || 0);
          mapByMonth[monthKey].count += 1;
        }

        const sortedKeys = Object.keys(mapByMonth).sort();
        const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
        salesTrend = sortedKeys.map((mk) => {
          const parts = mk.split('-');
          const label = parts.length === 2 ? `${monthNames[parseInt(parts[1], 10) - 1] || parts[1]} ${parts[0]}` : mk;
          return {
            label,
            date: mk,
            revenue: Math.round(mapByMonth[mk].revenue * 100) / 100,
            ordersCount: mapByMonth[mk].count,
          };
        });
      }

      // 3. Orders Breakdown
      let completedOrders = typeof counters.completed_orders === 'number' ? counters.completed_orders : 0;
      let pendingOrders = typeof counters.pending_orders === 'number' ? counters.pending_orders : 0;
      let cancelledOrders = typeof counters.cancelled_orders === 'number' ? counters.cancelled_orders : 0;

      if (completedOrders === 0 && pendingOrders === 0 && cancelledOrders === 0 && rawOrders.length > 0) {
        for (const o of rawOrders) {
          const st = (o.order_status || o.orderStatus || '').toLowerCase();
          if (st === 'delivered') completedOrders++;
          else if (st === 'cancelled' || st === 'canceled') cancelledOrders++;
          else pendingOrders++;
        }
      }

      const orderBreakdown: AnalyticsOrderBreakdown = {
        totalOrders: totalOrdersCount || (completedOrders + pendingOrders + cancelledOrders),
        completedOrders,
        pendingOrders,
        cancelledOrders,
      };

      // 4. Products (Top 5)
      let topProducts: AnalyticsTopProduct[] = [];
      const dashTopProds = dashData?.top_selling_products || [];
      if (Array.isArray(dashTopProds) && dashTopProds.length > 0) {
        topProducts = dashTopProds.slice(0, 5).map((p: any) => ({
          productId: String(p.product_id || p.id || ''),
          name: p.name || 'Product',
          category: p.category || 'Pyrotechnics',
          totalSold: p.quantity_sold || p.total_quantity || 0,
          totalRevenue: p.revenue_generated || p.total_revenue || 0,
        }));
      } else if (rawProducts.length > 0) {
        topProducts = rawProducts.slice(0, 5).map((p: any) => ({
          productId: String(p.id || p._id || ''),
          name: p.name || p.title || 'Product',
          category: p.category_name || p.category || 'General',
          totalSold: p.sold_count || 0,
          totalRevenue: Math.round((p.price || 0) * (p.sold_count || 0) * 100) / 100,
        }));
      }

      // 5. Inventory Distribution
      let outOfStock = 0;
      let lowStock = 0;
      let goodStock = 0;
      let totalStockUnits = 0;

      if (rawProducts.length > 0) {
        for (const p of rawProducts) {
          const stk = typeof p.stock === 'number' ? p.stock : 0;
          totalStockUnits += stk;
          if (stk === 0) outOfStock++;
          else if (stk <= 5) lowStock++;
          else goodStock++;
        }
      } else {
        outOfStock = dashData?.stock_alerts?.out_of_stock_count || 0;
        lowStock = dashData?.stock_alerts?.low_stock_count || 0;
        goodStock = Math.max(0, (counters.total_products || 0) - outOfStock - lowStock);
        totalStockUnits = counters.total_stock_units || 0;
      }

      const inventoryDistribution: AnalyticsInventoryDistribution = {
        outOfStock,
        lowStock,
        goodStock,
        totalProducts: rawProducts.length || counters.total_products || 0,
        totalStockUnits,
      };

      // 6. Location Sales
      const locMap: Record<string, { revenue: number; ordersCount: number }> = {};
      for (const o of rawOrders) {
        const addr = typeof o.shipping_address === 'string'
          ? o.shipping_address
          : o.shipping_address?.city || o.shipping_address?.full_name || '';

        if (addr && addr.trim()) {
          const parts = addr.split(',').map((s: string) => s.trim());
          let city = parts.length > 1 ? parts[parts.length - 2] : parts[0];
          city = city.replace(/\d+/g, '').replace(/\([^)]*\)/g, '').trim();
          if (city.length > 2) {
            if (!locMap[city]) locMap[city] = { revenue: 0, ordersCount: 0 };
            locMap[city].revenue += (o.total || o.totalAmount || 0);
            locMap[city].ordersCount += 1;
          }
        }
      }

      const locationSales: AnalyticsLocationPoint[] = Object.entries(locMap)
        .map(([loc, data]) => ({
          location: loc,
          revenue: Math.round(data.revenue * 100) / 100,
          ordersCount: data.ordersCount,
        }))
        .sort((a, b) => b.revenue - a.revenue)
        .slice(0, 8);

      // 7. Customers Breakdown
      const totalUsersCount = counters.total_users || rawUsers.length || 0;
      let newCustomers = 0;
      let returningCustomers = 0;

      if (rawUsers.length > 0) {
        for (const u of rawUsers) {
          const cnt = typeof u.order_count === 'number' ? u.order_count : (u.orderCount || 0);
          if (cnt > 1) returningCustomers++;
          else newCustomers++;
        }
      } else {
        newCustomers = Math.round(totalUsersCount * 0.7);
        returningCustomers = Math.max(0, totalUsersCount - newCustomers);
      }

      const customerBreakdown: AnalyticsCustomerBreakdown = {
        totalUsers: totalUsersCount,
        newCustomers,
        returningCustomers,
      };

      // 8. Seasonal Trends
      const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
      const seasonalTrends: AnalyticsSeasonalPoint[] = salesTrend.map((st) => {
        const parts = st.date.split('-');
        const y = parts[0] ? parseInt(parts[0], 10) : new Date().getFullYear();
        const mIdx = parts[1] ? parseInt(parts[1], 10) : new Date().getMonth() + 1;
        const isDiwaliPeriod = mIdx === 10 || mIdx === 11;
        const monthLabel = mIdx >= 1 && mIdx <= 12 ? `${monthNames[mIdx - 1]} ${y}` : st.label;

        return {
          month: monthLabel,
          monthIndex: mIdx,
          year: y,
          revenue: st.revenue,
          ordersCount: st.ordersCount,
          isDiwaliPeriod,
        };
      });

      // If no real data exists at all, use demo data so charts render immediately
      const hasAnyRealData = hasOrderData || rawProducts.length > 0 || totalRevenue > 0;

      if (!hasAnyRealData) {
        const demoData = this.generateDemoAnalyticsData();
        const demoCacheEntry = { data: demoData, timestamp: Date.now() };
        this.analyticsCache = demoCacheEntry;
        if (typeof window !== 'undefined' && window.localStorage) {
          try {
            window.localStorage.setItem('cc_cache_business_analytics', JSON.stringify(demoCacheEntry));
          } catch {}
        }
        return demoData;
      }

      const analyticsData: BusinessAnalyticsData = {
        totalRevenue: Math.round(totalRevenue * 100) / 100,
        totalOrders: totalOrdersCount,
        hasOrderData,
        salesTrend,
        isCostAvailable: false,
        revenueTotal: Math.round(totalRevenue * 100) / 100,
        orderBreakdown,
        topProducts,
        inventoryDistribution,
        locationSales,
        customerBreakdown,
        seasonalTrends,
        lastUpdated: Date.now(),
        rawOrders,
      };

      const cacheEntry = { data: analyticsData, timestamp: Date.now() };
      this.analyticsCache = cacheEntry;
      if (typeof window !== 'undefined' && window.localStorage) {
        try {
          window.localStorage.setItem('cc_cache_business_analytics', JSON.stringify(cacheEntry));
        } catch {}
      }

      return analyticsData;
    } catch (err) {
      console.warn('Failed to load business analytics data:', err);
      // On error, return cached data if available, otherwise use demo data
      // so charts always render fast instead of showing empty states
      return this.analyticsCache?.data || this.generateDemoAnalyticsData();
    }
  }

  async getMetrics(forceRefresh: boolean = false): Promise<AdminMetrics> {
    return this.getOverviewMetrics(forceRefresh);
  }

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
          status: normalizeAdminOrderStatus(o.order_status || o.orderStatus || o.status),
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
    const params: Record<string, any> = { page, limit, _t: Date.now() };
    if (categoryId === 'flash_sale' || categoryId === 'flashsale') {
      params.is_flash_sale = true;
    } else if (categoryId === 'featured') {
      params.is_featured = true;
    } else if (categoryId === 'bestseller') {
      params.is_bestseller = true;
    } else if (categoryId && categoryId !== 'All' && categoryId !== 'all') {
      params.category_id = categoryId;
    }

    const { data: res } = await apiClient.get('/products', {
      params,
      headers: {
        'Cache-Control': 'no-cache, no-store, must-revalidate',
        Pragma: 'no-cache',
      },
    });
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
      formData.append('flash_sale_hours', String(product.flash_sale_hours || 4));
      formData.append('is_recommended', String(Boolean(product.is_recommended)));
      formData.append('time_of_day', product.time_of_day || 'both');

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
      productService.clearCache();
      return this.mapBackendProductToUI(payload);
    }

    const { data: res } = await apiClient.post('/products', product);
    const payload = res?.data || res;
    productService.clearCache();
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
      if (updates.flash_sale_hours !== undefined) {
        formData.append('flash_sale_hours', String(updates.flash_sale_hours));
      }
      if (updates.is_recommended !== undefined) {
        formData.append('is_recommended', String(Boolean(updates.is_recommended)));
      }
      if (updates.is_active !== undefined) {
        formData.append('is_active', String(Boolean(updates.is_active)));
      }
      if (updates.time_of_day !== undefined) {
        formData.append('time_of_day', updates.time_of_day);
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
      productService.clearCache();
      return this.mapBackendProductToUI(payload);
    }

    const { data: res } = await apiClient.put(`/products/${id}`, updates);
    const payload = res?.data || res;
    productService.clearCache();
    return this.mapBackendProductToUI(payload);
  }

  async deleteAdminProduct(id: string): Promise<boolean> {
    const { data: res } = await apiClient.delete(`/products/${id}`);
    productService.clearCache();
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

  /**
   * Verify UPI payment with UTR.
   */
  async verifyUpiPayment(orderId: string, utr: string): Promise<any> {
    try {
      const { data: res } = await apiClient.post(`/payment/admin/upi/verify/order/${orderId}`, {
        transaction_reference: utr,
      });
      return res;
    } catch (error) {
      console.error('Verify UPI Payment Error:', error);
      throw error;
    }
  }

  /**
   * Reject pending UPI payment.
   */
  async rejectUpiPayment(orderId: string): Promise<any> {
    try {
      const { data: res } = await apiClient.post(`/payment/admin/upi/reject/order/${orderId}`);
      return res;
    } catch (error) {
      console.error('Reject UPI Payment Error:', error);
      throw error;
    }
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

  async deleteAllCancelledAdminOrders(): Promise<{ deletedCount: number }> {
    try {
      const { data: res } = await apiClient.delete('/admin/orders/cancelled/all');
      const payload = res.data || res;
      return { deletedCount: payload.deleted_count || 0 };
    } catch (error: any) {
      console.error('Failed to clear admin cancelled orders:', error);
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
    const rawRole = (u.role || '').toString().trim().toUpperCase();
    return {
      id: u.id || u._id || '',
      fullName: u.full_name || u.fullName || 'Customer',
      email: u.email || '',
      phone: u.phone || '',
      role: rawRole === 'ADMIN' ? 'ADMIN' : 'CUSTOMER',
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
      flashSaleHours: p.flash_sale_hours !== undefined ? p.flash_sale_hours : (p.flashSaleHours !== undefined ? p.flashSaleHours : 4),
      isRecommended: Boolean(p.is_recommended || p.isRecommended),
      isActive: p.is_active !== undefined ? Boolean(p.is_active) : (p.status !== 'deleted'),
      timeOfDay: (p.time_of_day || p.timeOfDay || 'both') as any,
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
      orderStatus: normalizeAdminOrderStatus(item.order_status || item.orderStatus) as AdminOrderItem['orderStatus'],
      paymentStatus: item.payment_status || item.paymentStatus || 'Pending',
      paymentMethod: item.payment_method || item.paymentMethod || 'Credit Card',
      shippingAddress: typeof item.shipping_address === 'string' ? item.shipping_address : (item.shipping_address?.full_name ? `${item.shipping_address.full_name}, ${item.shipping_address.street || ''}` : ''),
      transactionReference: item.transaction_reference || item.transactionReference || null,
      upiUri: item.upi_uri || item.upiUri || null,
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
      orderStatus: normalizeAdminOrderStatus(ord.order_status || ord.orderStatus),
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
      transactionReference: ord.transaction_reference || ord.transactionReference || null,
      upiUri: ord.upi_uri || ord.upiUri || null,
      paymentCompletedAt: ord.payment_completed_at || ord.paymentCompletedAt || null,
      items: mappedItems,
    };
  }

  async getTodayReport(): Promise<TodayReportData> {
    const { data: res } = await apiClient.get('/admin/reports/today');
    return res?.data || res;
  }

  async recordTodayReportDownload(): Promise<TodayReportData> {
    const { data: res } = await apiClient.post('/admin/reports/today/download');
    return res?.data || res;
  }

  async emailTodayReportToAdmins(): Promise<{ message: string; admin_emails_notified: string[] }> {
    const { data: res } = await apiClient.post('/admin/reports/today/email');
    return {
      message: res?.message || 'Report dispatched successfully',
      admin_emails_notified: res?.data?.admin_emails_notified || [],
    };
  }

  async sendTodayReportEmail(): Promise<{ message: string; admin_emails_notified: string[] }> {
    return this.emailTodayReportToAdmins();
  }

  async getSalesSummary(): Promise<SalesSummaryData> {
    try {
      const { data: res } = await apiClient.get('/admin/sales-summary');
      if (res?.data || res?.today_revenue !== undefined) {
        return res?.data || res;
      }
    } catch (err) {
      console.warn('Backend /admin/sales-summary endpoint not available, falling back to /admin/reports/today:', err);
    }

    // Fallback: Compute sales summary from existing /admin/reports/today API
    try {
      const report = await this.getTodayReport();
      if (report) {
        const todayRevenue = report.today_revenue || 0;
        const todayOrders = report.today_orders || 0;
        const totalUnitsSold = report.today_items_sold || 0;
        const avgOrderVal = todayOrders > 0 ? Math.round((todayRevenue / todayOrders) * 100) / 100 : 0;

        const stockItems = report.stock_inventory_list || [];
        const soldItems = stockItems.filter((item) => item.sold_today > 0);

        const products: ProductSalesSummaryItem[] = soldItems
          .map((item) => ({
            product_id: item.id,
            product_name: item.name,
            total_sold: item.sold_today,
            total_revenue: Math.round(item.sold_today * item.price * 100) / 100,
            category: item.category_name || 'Fireworks',
          }))
          .sort((a, b) => b.total_sold - a.total_sold);

        const bestSeller = products.length > 0 ? {
          name: products[0].product_name,
          units_sold: products[0].total_sold,
          revenue: products[0].total_revenue,
        } : null;

        // Aggregate category stats
        const catMap: Record<string, { name: string; total_sold: number; total_revenue: number }> = {};
        for (const p of products) {
          const cName = p.category || 'General Crackers';
          if (!catMap[cName]) {
            catMap[cName] = { name: cName, total_sold: 0, total_revenue: 0 };
          }
          catMap[cName].total_sold += p.total_sold;
          catMap[cName].total_revenue += p.total_revenue;
        }

        const categories: CategorySalesSummaryItem[] = Object.values(catMap)
          .map((c, idx) => ({
            category_id: `cat-${idx}`,
            category_name: c.name,
            total_sold: c.total_sold,
            total_revenue: Math.round(c.total_revenue * 100) / 100,
            percentage: totalUnitsSold > 0 ? Math.round((c.total_sold / totalUnitsSold) * 1000) / 10 : 0,
          }))
          .sort((a, b) => b.total_sold - a.total_sold);

        const hourlyTrend: HourlySalesTrendItem[] = [];
        const currentHour = new Date().getHours();
        for (let h = 0; h <= currentHour; h++) {
          const hour12 = h % 12 === 0 ? 12 : h % 12;
          const ampm = h < 12 ? 'AM' : 'PM';
          hourlyTrend.push({
            hour: `${h.toString().padStart(2, '0')}:00`,
            hour_label: `${hour12} ${ampm}`,
            revenue: h === currentHour ? todayRevenue : 0,
            orders: h === currentHour ? todayOrders : 0,
            units: h === currentHour ? totalUnitsSold : 0,
          });
        }

        const insights: string[] = [];
        if (todayOrders > 0) {
          if (bestSeller) {
            insights.push(`🔥 ${bestSeller.name} is today's best-selling cracker with ${bestSeller.units_sold} units sold.`);
          }
          if (categories.length > 0) {
            insights.push(`📦 ${categories[0].category_name} generated the highest category volume today (${categories[0].percentage}% share).`);
          }
          insights.push(`💰 Today's revenue is ₹${todayRevenue.toLocaleString()} across ${todayOrders} orders.`);
        } else {
          insights.push('No sales recorded yet today. Real-time sales analytics will automatically populate once orders arrive.');
        }

        return {
          date: report.date || new Date().toISOString().split('T')[0],
          today_revenue: todayRevenue,
          today_orders: todayOrders,
          total_units_sold: totalUnitsSold,
          average_order_value: avgOrderVal,
          best_selling_product: bestSeller,
          products,
          categories,
          hourly_trend: hourlyTrend,
          insights,
        };
      }
    } catch (fallbackErr) {
      console.warn('Fallback /admin/reports/today also failed:', fallbackErr);
    }

    return {
      date: new Date().toISOString().split('T')[0],
      today_revenue: 0,
      today_orders: 0,
      total_units_sold: 0,
      average_order_value: 0,
      best_selling_product: null,
      products: [],
      categories: [],
      hourly_trend: [],
      insights: [
        'No sales recorded yet today. Real-time sales analytics will automatically populate once orders arrive.'
      ],
    };
  }
}

export const adminService = new AdminService();
export default adminService;

