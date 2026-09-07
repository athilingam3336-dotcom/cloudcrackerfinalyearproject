import React, { useState, useEffect, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
  ScrollView,
  useWindowDimensions,
  Platform,
} from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { Colors } from '@/constants/colors';
import { Spacing, BorderRadius } from '@/constants/spacing';
import { formatCurrency } from '@/utils/currency';
import {
  BusinessAnalyticsData,
  AnalyticsSalesPoint,
  AnalyticsTopProduct,
  AnalyticsLocationPoint,
} from '@/services/adminService';

// ─── Brand tokens ────────────────────────────────────────────────────────────
const BRAND_RED    = '#D5342E';
const SUCCESS_GREEN = '#2E7D32';
const WARNING_AMBER = '#D97706';
const NEUTRAL_GRAY  = '#6B7280';

// ─── Tab definition ──────────────────────────────────────────────────────────
type TabId = 'sales' | 'orders' | 'products' | 'delivery' | 'inventory' | 'insights';

const TABS: { id: TabId; label: string; icon: string }[] = [
  { id: 'sales',     label: 'Sales',     icon: 'show-chart'       },
  { id: 'orders',    label: 'Orders',    icon: 'receipt-long'     },
  { id: 'products',  label: 'Products',  icon: 'inventory-2'      },
  { id: 'delivery',  label: 'Delivery',  icon: 'place'            },
  { id: 'inventory', label: 'Inventory', icon: 'inventory'        },
  { id: 'insights',  label: 'Insights',  icon: 'lightbulb-outline' },
];

// ─── Props ───────────────────────────────────────────────────────────────────
export interface BusinessAnalyticsSectionProps {
  analyticsData: BusinessAnalyticsData | null;
  isLoading: boolean;
  isError?: boolean;
  onRetry?: () => void;
  onNavigateToInventory?: (filter?: string) => void;
  // Quick action callbacks
  onOpenTodayReport?: () => void;
  onNavigateToUsers?: () => void;
  onNavigateToCoupons?: () => void;
  onNavigateToProducts?: () => void;
  onNavigateToCategories?: () => void;
  onNavigateToOrders?: () => void;
  onNavigateToAbout?: () => void;
}

// ─── Component ───────────────────────────────────────────────────────────────
export const BusinessAnalyticsSection: React.FC<BusinessAnalyticsSectionProps> = ({
  analyticsData,
  isLoading,
  isError = false,
  onRetry,
  onNavigateToInventory,
  onOpenTodayReport,
  onNavigateToUsers,
  onNavigateToCoupons,
  onNavigateToProducts,
  onNavigateToCategories,
  onNavigateToOrders,
  onNavigateToAbout,
}) => {
  const { width } = useWindowDimensions();
  const isDesktop = width >= 1024;
  const isTablet  = width >= 768 && width < 1024;

  // ── Active tab ─────────────────────────────────────────────────────────────
  const [activeTab, setActiveTab] = useState<TabId>('sales');

  // ── Products sort ──────────────────────────────────────────────────────────
  const [productSortBy, setProductSortBy] = useState<'revenue' | 'units'>('revenue');

  // ── Tooltip states ─────────────────────────────────────────────────────────
  const [activeSalesTooltip,    setActiveSalesTooltip]    = useState<AnalyticsSalesPoint | null>(null);
  const [activeProductTooltip,  setActiveProductTooltip]  = useState<AnalyticsTopProduct | null>(null);
  const [activeLocationTooltip, setActiveLocationTooltip] = useState<AnalyticsLocationPoint | null>(null);

  // ── Live "Updated Xs ago" timer ────────────────────────────────────────────
  const [secondsAgo, setSecondsAgo] = useState(0);
  useEffect(() => {
    setSecondsAgo(0);
    const t = setInterval(() => {
      if (analyticsData?.lastUpdated) {
        setSecondsAgo(Math.max(0, Math.floor((Date.now() - analyticsData.lastUpdated) / 1000)));
      } else {
        setSecondsAgo((p) => p + 1);
      }
    }, 1000);
    return () => clearInterval(t);
  }, [analyticsData?.lastUpdated]);

  // ── Clear tooltips on tab change ────────────────────────────────────────────
  useEffect(() => {
    setActiveSalesTooltip(null);
    setActiveProductTooltip(null);
    setActiveLocationTooltip(null);
  }, [activeTab]);

  // ── Memos ──────────────────────────────────────────────────────────────────
  const maxSalesRevenue = useMemo(() => {
    return 100;
  }, []);

  const maxLocationRevenue = useMemo(() => {
    if (!analyticsData?.locationSales?.length) return 100;
    return Math.max(...analyticsData.locationSales.map((l) => l.revenue), 100);
  }, [analyticsData?.locationSales]);

  const sortedTopProducts = useMemo(() => {
    if (!analyticsData?.topProducts) return [];
    const p = [...analyticsData.topProducts];
    return productSortBy === 'revenue'
      ? p.sort((a, b) => b.totalRevenue - a.totalRevenue)
      : p.sort((a, b) => b.totalSold - a.totalSold);
  }, [analyticsData?.topProducts, productSortBy]);

  const maxProductVal = useMemo(() => {
    if (!sortedTopProducts.length) return 1;
    return productSortBy === 'revenue'
      ? Math.max(...sortedTopProducts.map((p) => p.totalRevenue), 1)
      : Math.max(...sortedTopProducts.map((p) => p.totalSold), 1);
  }, [sortedTopProducts, productSortBy]);

  // Donut arc calculation (Orders tab)
  const donutArcs = useMemo(() => {
    const ob = analyticsData?.orderBreakdown ?? { totalOrders: 0, completedOrders: 0, pendingOrders: 0, cancelledOrders: 0 };
    const total = Math.max(1, ob.completedOrders + ob.pendingOrders + ob.cancelledOrders);
    const segments = [
      { id: 'completed', label: 'Completed', count: ob.completedOrders, color: SUCCESS_GREEN },
      { id: 'pending',   label: 'Pending',   count: ob.pendingOrders,   color: WARNING_AMBER },
      { id: 'cancelled', label: 'Cancelled', count: ob.cancelledOrders, color: BRAND_RED     },
    ];
    const cx = 100; const cy = 100; const R = 76; const r = 48;
    let acc = -90;
    const arcs = segments.map((seg) => {
      const pct   = seg.count / total;
      const angle = pct * 360;
      const s     = acc;
      const e     = acc + angle;
      acc += angle;
      const r1 = (s * Math.PI) / 180; const r2 = (e * Math.PI) / 180;
      const x1 = cx + R * Math.cos(r1); const y1 = cy + R * Math.sin(r1);
      const x2 = cx + R * Math.cos(r2); const y2 = cy + R * Math.sin(r2);
      const ix1 = cx + r * Math.cos(r1); const iy1 = cy + r * Math.sin(r1);
      const ix2 = cx + r * Math.cos(r2); const iy2 = cy + r * Math.sin(r2);
      const large = angle > 180 ? 1 : 0;
      const path  = seg.count > 0
        ? `M ${x1} ${y1} A ${R} ${R} 0 ${large} 1 ${x2} ${y2} L ${ix2} ${iy2} A ${r} ${r} 0 ${large} 0 ${ix1} ${iy1} Z`
        : '';
      return { ...seg, pctShare: Math.round(pct * 100), pathData: path };
    });
    return { arcs, total: ob.totalOrders || total };
  }, [analyticsData?.orderBreakdown]);

  // SVG sales line path moved to SalesTab

  // Shorthand data references
  const data           = analyticsData;
  const totalRevenue   = data?.totalRevenue   ?? 0;
  const totalOrders    = data?.totalOrders    ?? 0;
  const customerInfo   = data?.customerBreakdown   ?? { totalUsers: 0, newCustomers: 0, returningCustomers: 0 };
  const inventoryInfo  = data?.inventoryDistribution ?? { outOfStock: 0, lowStock: 0, goodStock: 0, totalProducts: 0, totalStockUnits: 0 };
  const orderBreakdown = data?.orderBreakdown  ?? { totalOrders: 0, completedOrders: 0, pendingOrders: 0, cancelledOrders: 0 };

  // ── Loading State ──────────────────────────────────────────────────────────
  if (isLoading && !analyticsData) {
    return (
      <View style={styles.wrapper}>
        <SectionHeader secondsAgo={secondsAgo} loading />
        <View style={styles.tabBar}>
          {TABS.map((t) => (
            <View key={t.id} style={[styles.tab, styles.tabSkeleton]} />
          ))}
        </View>
        <View style={styles.contentCard}>
          <ActivityIndicator size="large" color={BRAND_RED} style={{ marginVertical: 60 }} />
          <Text style={styles.loadingText}>Loading analytics data…</Text>
        </View>
      </View>
    );
  }

  // ── Error State ────────────────────────────────────────────────────────────
  if (isError && !analyticsData) {
    return (
      <View style={styles.wrapper}>
        <SectionHeader secondsAgo={secondsAgo} />
        <View style={styles.contentCard}>
          <MaterialIcons name="error-outline" size={40} color={BRAND_RED} />
          <Text style={styles.errorTitle}>Could not load analytics</Text>
          <Text style={styles.errorSub}>Check your connection and try again.</Text>
          {onRetry && (
            <TouchableOpacity style={styles.retryBtn} onPress={onRetry} activeOpacity={0.8}>
              <MaterialIcons name="refresh" size={16} color="#fff" />
              <Text style={styles.retryBtnText}>Retry</Text>
            </TouchableOpacity>
          )}
        </View>
      </View>
    );
  }

  // ── MAIN RENDER ────────────────────────────────────────────────────────────
  return (
    <View style={styles.wrapper}>
      {/* ── Section header ── */}
      <SectionHeader secondsAgo={secondsAgo} />

      {/* ── Tab bar (horizontally scrollable) ── */}
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.tabBarContent}
        style={styles.tabBarScroll}
      >
        {TABS.map((tab) => {
          const active = activeTab === tab.id;
          return (
            <TouchableOpacity
              key={tab.id}
              style={[styles.tab, active && styles.tabActive]}
              onPress={() => setActiveTab(tab.id)}
              activeOpacity={0.75}
            >
              <MaterialIcons
                name={tab.icon as any}
                size={15}
                color={active ? '#fff' : NEUTRAL_GRAY}
              />
              <Text style={[styles.tabLabel, active && styles.tabLabelActive]}>
                {tab.label}
              </Text>
            </TouchableOpacity>
          );
        })}
      </ScrollView>

      {/* ── Content card (single panel, tab-switched) ── */}
      <View style={styles.contentCard}>
        {activeTab === 'sales'     && (
          <SalesTab
            data={data}
            activeSalesTooltip={activeSalesTooltip}
            setActiveSalesTooltip={setActiveSalesTooltip}
            totalRevenue={totalRevenue}
            totalOrders={totalOrders}
          />
        )}
        {activeTab === 'orders'    && (
          <OrdersTab
            donutArcs={donutArcs}
            orderBreakdown={orderBreakdown}
          />
        )}
        {activeTab === 'products'  && (
          <ProductsTab
            sortedTopProducts={sortedTopProducts}
            maxProductVal={maxProductVal}
            productSortBy={productSortBy}
            setProductSortBy={setProductSortBy}
            activeProductTooltip={activeProductTooltip}
            setActiveProductTooltip={setActiveProductTooltip}
          />
        )}
        {activeTab === 'delivery'  && (
          <DeliveryTab
            data={data}
            maxLocationRevenue={maxLocationRevenue}
            activeLocationTooltip={activeLocationTooltip}
            setActiveLocationTooltip={setActiveLocationTooltip}
          />
        )}
        {activeTab === 'inventory' && (
          <InventoryTab
            inventoryInfo={inventoryInfo}
            onNavigateToInventory={onNavigateToInventory}
          />
        )}
        {activeTab === 'insights'  && (
          <InsightsTab
            totalRevenue={totalRevenue}
            totalOrders={totalOrders}
            customerInfo={customerInfo}
            inventoryInfo={inventoryInfo}
            orderBreakdown={orderBreakdown}
            topProducts={sortedTopProducts}
            locationSales={data?.locationSales ?? []}
          />
        )}
      </View>

      {/* ── Quick Management Actions ── */}
      <View style={styles.contentCard}>
        <View style={styles.cardHeaderRow}>
          <View>
            <Text style={styles.blockTitle}>Quick Management Actions</Text>
            <Text style={styles.blockSubtitle}>Navigate to management screens</Text>
          </View>
          <MaterialIcons name="apps" size={20} color={BRAND_RED} />
        </View>

        <View style={styles.quickActionsGrid}>
          <QuickAction
            icon="wb-sunny"
            label="Today's Report"
            iconBg="#FFE0B2"
            iconColor="#E65100"
            highlight
            onPress={onOpenTodayReport}
          />
          <QuickAction icon="receipt-long" label="Orders"     iconBg="#E3F2FD" iconColor="#1565C0" onPress={onNavigateToOrders} />
          <QuickAction icon="inventory-2"  label="Products"   iconBg="#F3E5F5" iconColor="#6A1B9A" onPress={onNavigateToProducts} />
          <QuickAction icon="inventory"    label="Inventory"  iconBg="#E8F5E9" iconColor={SUCCESS_GREEN} onPress={() => onNavigateToInventory?.()} />
          <QuickAction icon="people"       label="Customers"  iconBg="#FFF3E0" iconColor={WARNING_AMBER} onPress={onNavigateToUsers} />
          <QuickAction icon="local-offer"  label="Coupons"    iconBg="#FCE4EC" iconColor={BRAND_RED} onPress={onNavigateToCoupons} />
          <QuickAction icon="category"     label="Categories" iconBg="#E8EAF6" iconColor="#283593" onPress={onNavigateToCategories} />
          <QuickAction icon="info"         label="About Page" iconBg="#ECEFF1" iconColor="#37474F" onPress={onNavigateToAbout} />
        </View>
      </View>
    </View>
  );
};

// ─────────────────────────────────────────────────────────────────────────────
// Sub-components
// ─────────────────────────────────────────────────────────────────────────────

// Section header
const SectionHeader: React.FC<{ secondsAgo: number; loading?: boolean }> = ({ secondsAgo, loading }) => (
  <View style={styles.sectionHeaderRow}>
    <View>
      <Text style={styles.sectionTitle}>📊 Business Analytics</Text>
      <Text style={styles.sectionSubtitle}>Real-time business performance and decision insights</Text>
    </View>
    <View style={styles.liveBadge}>
      {loading ? (
        <ActivityIndicator size="small" color={BRAND_RED} />
      ) : (
        <View style={styles.liveDot} />
      )}
      <Text style={styles.liveBadgeText}>
        {loading ? 'Loading…' : `LIVE • ${secondsAgo === 0 ? 'just now' : `${secondsAgo}s ago`}`}
      </Text>
    </View>
  </View>
);

// Quick Action button
const QuickAction: React.FC<{
  icon: string; label: string; iconBg: string; iconColor: string;
  highlight?: boolean; onPress?: () => void;
}> = ({ icon, label, iconBg, iconColor, highlight, onPress }) => (
  <TouchableOpacity
    style={[styles.quickActionBtn, highlight && styles.quickActionBtnHighlight]}
    onPress={onPress}
    activeOpacity={0.8}
  >
    <View style={[styles.quickActionIcon, { backgroundColor: iconBg }]}>
      <MaterialIcons name={icon as any} size={22} color={iconColor} />
    </View>
    <Text style={[styles.quickActionLabel, highlight && { color: iconColor }]}>{label}</Text>
  </TouchableOpacity>
);

// Empty block state
const EmptyState: React.FC<{ icon: string; title: string; subtitle: string }> = ({ icon, title, subtitle }) => (
  <View style={styles.emptyState}>
    <MaterialIcons name={icon as any} size={36} color={NEUTRAL_GRAY} />
    <Text style={styles.emptyTitle}>{title}</Text>
    <Text style={styles.emptySubtitle}>{subtitle}</Text>
  </View>
);

// ── TAB 1: Sales ──────────────────────────────────────────────────────────────
const SalesTab: React.FC<{
  data: BusinessAnalyticsData | null;
  activeSalesTooltip: AnalyticsSalesPoint | null;
  setActiveSalesTooltip: (v: AnalyticsSalesPoint | null) => void;
  totalRevenue: number;
  totalOrders: number;
}> = ({ data, activeSalesTooltip, setActiveSalesTooltip, totalRevenue, totalOrders }) => {
  const { width } = useWindowDimensions();
  const isDesktop = width >= 1024;
  const avgOrderValue = totalOrders > 0 ? totalRevenue / totalOrders : 0;
  
  const [timeRange, setTimeRange] = useState<'daily'|'weekly'|'monthly'|'yearly'>('monthly');
  const [metric, setMetric] = useState<'revenue'|'profit'|'orders'>('revenue');
  const [comparison, setComparison] = useState<'current'|'previous'|'compare'>('current');

  const { currentTrend, previousTrend, currentTotal, previousTotal } = useMemo(() => {
    if (!data?.rawOrders?.length) {
       const trend = data?.salesTrend ?? [];
       const mappedTrend = trend.map(t => ({
          ...t,
          graphValue: metric === 'orders' ? t.ordersCount : t.revenue
       }));
       return { currentTrend: mappedTrend, previousTrend: [], currentTotal: totalRevenue, previousTotal: 0 };
    }
    
    const orders = data.rawOrders;
    const getVal = (o: any) => {
       if (metric === 'revenue') return o.total || o.totalAmount || 0;
       if (metric === 'profit') return 0; // Cost data unavailable in current backend
       return 1; // orders count
    };

    const map = new Map<string, { label: string; date: string; val: number; ordersCount: number }>();

    orders.forEach(o => {
      const d = new Date(o.created_at || o.date);
      if (isNaN(d.getTime())) return;
      
      let key = '';
      let label = '';
      
      if (timeRange === 'daily') {
         key = d.toISOString().slice(0, 10);
         label = d.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
      } else if (timeRange === 'weekly') {
         const firstDay = new Date(d);
         firstDay.setDate(d.getDate() - d.getDay());
         key = firstDay.toISOString().slice(0, 10);
         label = 'Week of ' + firstDay.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
      } else if (timeRange === 'monthly') {
         key = d.toISOString().slice(0, 7);
         label = d.toLocaleDateString(undefined, { month: 'short', year: 'numeric' });
      } else if (timeRange === 'yearly') {
         key = d.getFullYear().toString();
         label = key;
      }

      if (!map.has(key)) {
         map.set(key, { label, date: key, val: 0, ordersCount: 0 });
      }
      const entry = map.get(key)!;
      entry.val += getVal(o);
      entry.ordersCount += 1;
    });

    let allKeys = Array.from(map.keys()).sort();
    
    let limit = 12;
    if (timeRange === 'daily') limit = 14;
    if (timeRange === 'weekly') limit = 12;
    if (timeRange === 'yearly') limit = 5;
    
    // Ensure we have enough data points, fill with 0 if necessary for aesthetics
    if (allKeys.length === 0) {
        return { currentTrend: [], previousTrend: [], currentTotal: 0, previousTotal: 0 };
    }

    const currentKeys = allKeys.slice(-limit);
    const previousKeys = allKeys.slice(-limit * 2, -limit);

    const formatTrend = (keys: string[]) => keys.map(k => {
      const e = map.get(k)!;
      return {
        label: e.label,
        date: e.date,
        revenue: metric === 'revenue' ? e.val : 0,
        ordersCount: e.ordersCount,
        graphValue: e.val
      };
    });

    const currentTrend = formatTrend(currentKeys);
    const previousTrend = formatTrend(previousKeys);
    
    const currentTotal = currentTrend.reduce((sum, item) => sum + item.graphValue, 0);
    const previousTotal = previousTrend.reduce((sum, item) => sum + item.graphValue, 0);

    return { currentTrend, previousTrend, currentTotal, previousTotal };
  }, [data, timeRange, metric]);

  const displayTrend = comparison === 'previous' ? previousTrend : currentTrend;
  
  const maxSalesRevenue = useMemo(() => {
    let max = 10;
    currentTrend.forEach(t => max = Math.max(max, t.graphValue));
    if (comparison !== 'current') {
       previousTrend.forEach(t => max = Math.max(max, t.graphValue));
    }
    return max * 1.1; // Add 10% headroom
  }, [currentTrend, previousTrend, comparison]);

  const calcPath = (trend: any[]) => {
    if (!trend.length) return { path: '', areaPath: '', points: [] as any[], svgW: 520, svgH: 170, padL: 48, padT: 16, gW: 0, gH: 0 };
    const svgW = 520; const svgH = 170;
    const padL = 48; const padR = 16; const padT = 16; const padB = 28;
    const gW = svgW - padL - padR; const gH = svgH - padT - padB;
    const count = trend.length;
    const points = trend.map((pt, i) => ({
      x: padL + (count > 1 ? (i / (count - 1)) * gW : gW / 2),
      y: padT + gH - (pt.graphValue / maxSalesRevenue) * gH,
      pt,
    }));
    let d = `M ${points[0].x} ${points[0].y}`;
    for (let i = 1; i < points.length; i++) d += ` L ${points[i].x} ${points[i].y}`;
    const areaD = `${d} L ${points[points.length - 1].x} ${padT + gH} L ${points[0].x} ${padT + gH} Z`;
    return { path: d, areaPath: areaD, points, svgW, svgH, padL, padT, gW, gH };
  };

  const currentLineData = calcPath(displayTrend);
  const compareLineData = (comparison === 'compare') ? calcPath(previousTrend) : null;
  const cData = currentLineData;

  let percentDiff = 0;
  if (previousTotal > 0) {
     percentDiff = ((currentTotal - previousTotal) / previousTotal) * 100;
  }

  const SegmentedControl = ({ label, options, selected, onChange }: any) => (
    <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 12 }}>
      <Text style={{ fontSize: 13, color: '#64748B', width: 70, fontFamily: 'Inter-Medium' }}>{label}:</Text>
      <ScrollView horizontal showsHorizontalScrollIndicator={false}>
        <View style={{ flexDirection: 'row', backgroundColor: '#F1F5F9', borderRadius: 8, padding: 2 }}>
          {options.map((opt: any) => {
            const isActive = selected === opt.value;
            return (
              <TouchableOpacity
                key={opt.value}
                onPress={() => onChange(opt.value)}
                style={{
                  paddingVertical: 6,
                  paddingHorizontal: 12,
                  backgroundColor: isActive ? '#fff' : 'transparent',
                  borderRadius: 6,
                  shadowColor: isActive ? '#000' : 'transparent',
                  shadowOffset: { width: 0, height: 1 },
                  shadowOpacity: isActive ? 0.05 : 0,
                  shadowRadius: 2,
                }}
              >
                <Text style={{
                  fontSize: 12,
                  fontFamily: isActive ? 'Inter-SemiBold' : 'Inter-Medium',
                  color: isActive ? BRAND_RED : '#64748B'
                }}>
                  {opt.label}
                </Text>
              </TouchableOpacity>
            )
          })}
        </View>
      </ScrollView>
    </View>
  );

  return (
    <View style={styles.tabContent}>
      
      {/* Top Header Row */}
      <View style={{ flexDirection: isDesktop ? 'row' : 'column', justifyContent: 'space-between', alignItems: isDesktop ? 'center' : 'flex-start', marginBottom: 24, gap: 16 }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
          <View>
            <Text style={styles.tabContentTitle}>Sales Trend</Text>
            <Text style={styles.tabContentSubtitle}>Monthly revenue trajectory</Text>
          </View>
        </View>

        {/* KPI Pills */}
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 12 }}>
          <View style={[styles.kpiPill, { minWidth: 140, paddingVertical: 10, paddingHorizontal: 16 }]}>
            <Text style={styles.kpiPillLabel}>Total Revenue</Text>
            <Text style={[styles.kpiPillValue, { color: BRAND_RED }]}>{formatCurrency(totalRevenue)}</Text>
          </View>
          <View style={[styles.kpiPill, { minWidth: 120, paddingVertical: 10, paddingHorizontal: 16 }]}>
            <Text style={styles.kpiPillLabel}>Total Orders</Text>
            <Text style={[styles.kpiPillValue, { color: '#1565C0' }]}>{totalOrders}</Text>
          </View>
          <View style={[styles.kpiPill, { minWidth: 140, paddingVertical: 10, paddingHorizontal: 16 }]}>
            <Text style={styles.kpiPillLabel}>Avg Order Value</Text>
            <Text style={[styles.kpiPillValue, { color: SUCCESS_GREEN }]}>{formatCurrency(avgOrderValue)}</Text>
          </View>
        </View>
      </View>

      {/* Main Content Area */}
      <View style={{ flexDirection: isDesktop ? 'row' : 'column', gap: 24 }}>
        
        {/* Left Side (Controls) */}
        <View style={{ flex: isDesktop ? 1 : undefined, maxWidth: isDesktop ? 350 : '100%' }}>
          {/* Dynamic Controls */}
          <View style={{ backgroundColor: '#fff', borderRadius: 12, padding: 16, borderWidth: 1, borderColor: '#E2E8F0' }}>
            <SegmentedControl
               label="Time"
               options={[
                 { label: 'Daily', value: 'daily' },
                 { label: 'Weekly', value: 'weekly' },
                 { label: 'Monthly', value: 'monthly' },
                 { label: 'Yearly', value: 'yearly' },
               ]}
               selected={timeRange}
               onChange={setTimeRange}
            />
            <SegmentedControl
               label="Metric"
               options={[
                 { label: 'Revenue', value: 'revenue' },
                 { label: 'Profit', value: 'profit' },
                 { label: 'Orders', value: 'orders' },
               ]}
               selected={metric}
               onChange={setMetric}
            />
            <SegmentedControl
               label="Compare"
               options={[
                 { label: 'Current', value: 'current' },
                 { label: 'Previous', value: 'previous' },
                 { label: 'Compare', value: 'compare' },
               ]}
               selected={comparison}
               onChange={setComparison}
            />
          </View>
        </View>

        {/* Right Side (Chart) */}
        <View style={{ flex: isDesktop ? 3 : undefined, justifyContent: 'center' }}>
          {!displayTrend.length ? (
            <EmptyState icon="show-chart" title="No sales trend data yet" subtitle="Chart will appear once orders are placed." />
          ) : (
            <View style={[styles.lineChartWrapper, { padding: isDesktop ? 24 : 16, height: '100%', minHeight: 320, justifyContent: 'center' }]}>
              {Platform.OS === 'web' ? (
                // @ts-ignore – SVG is web-only
                <svg width="100%" height="240" viewBox={`0 0 ${cData.svgW} ${cData.svgH}`} style={{ overflow: 'visible' }}>
                  <defs>
                    <linearGradient id="salesGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor={BRAND_RED} stopOpacity="0.22" />
                      <stop offset="100%" stopColor={BRAND_RED} stopOpacity="0.0" />
                    </linearGradient>
                  </defs>
                  {/* Grid lines */}
                  {[0, 0.33, 0.66, 1].map((pct, i) => {
                    const y = cData.padT + cData.gH * (1 - pct);
                    let valLabel = '';
                    const val = maxSalesRevenue * pct;
                    if (metric === 'revenue' || metric === 'profit') {
                      valLabel = val > 1000 ? `₹${Math.round(val / 1000)}k` : `₹${Math.round(val)}`;
                    } else {
                      valLabel = Math.round(val).toString();
                    }
                    
                    return (
                      <g key={i}>
                        <line x1={cData.padL} y1={y} x2={cData.svgW - 16} y2={y}
                          stroke={i === 3 ? '#CBD5E1' : '#E2E8F0'} strokeWidth="1" strokeDasharray={i === 3 ? '' : '3 3'} />
                        <text x={cData.padL - 4} y={y + 4} textAnchor="end" fontSize="9" fill="#94A3B8">
                          {valLabel}
                        </text>
                      </g>
                    );
                  })}
                  {/* Compare Line */}
                  {compareLineData?.path && (
                    <path d={compareLineData.path} fill="none" stroke="#CBD5E1" strokeWidth="2" strokeDasharray="4 4" strokeLinecap="round" strokeLinejoin="round" />
                  )}
                  {/* Area */}
                  {cData.areaPath && <path d={cData.areaPath} fill="url(#salesGrad)" />}
                  {/* Line */}
                  {cData.path && (
                    <path d={cData.path} fill="none" stroke={BRAND_RED} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
                  )}
                  {/* Compare Points */}
                  {compareLineData?.points.map((p: any, idx: number) => (
                    <circle key={`cmp-${idx}`} cx={p.x} cy={p.y} r="3" fill="#CBD5E1" />
                  ))}
                  {/* Points + labels */}
                  {cData.points.map((p: any, idx: number) => (
                    <g key={idx}>
                      <circle
                        cx={p.x} cy={p.y} r="5"
                        fill={activeSalesTooltip?.date === p.pt.date ? BRAND_RED : '#fff'}
                        stroke={BRAND_RED} strokeWidth="2.5"
                        style={{ cursor: 'pointer' }}
                        onClick={() => setActiveSalesTooltip(activeSalesTooltip?.date === p.pt.date ? null : p.pt)}
                      />
                      <text x={p.x} y={cData.padT + cData.gH + 18} textAnchor="middle" fontSize="9" fill="#64748B">
                        {p.pt.label.split(' ')[0]}
                      </text>
                    </g>
                  ))}
                </svg>
              ) : (
                <View style={styles.emptyState}>
                  <MaterialIcons name="show-chart" size={28} color={NEUTRAL_GRAY} />
                  <Text style={styles.emptyTitle}>Chart visible on web</Text>
                </View>
              )}

              {/* Comparison indicator */}
              {comparison !== 'current' && previousTotal > 0 && (
                <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'center', marginTop: 12 }}>
                   <MaterialIcons 
                      name={percentDiff >= 0 ? "trending-up" : "trending-down"} 
                      size={16} 
                      color={percentDiff >= 0 ? SUCCESS_GREEN : BRAND_RED} 
                   />
                   <Text style={{
                      fontSize: 12,
                      fontFamily: 'Inter-Medium',
                      color: percentDiff >= 0 ? SUCCESS_GREEN : BRAND_RED,
                      marginLeft: 4
                   }}>
                      {Math.abs(percentDiff).toFixed(1)}% {percentDiff >= 0 ? '↑' : '↓'} vs Previous Period
                   </Text>
                </View>
              )}

              {/* Tooltip */}
              {activeSalesTooltip && (
                <View style={styles.tooltipBox}>
                  <Text style={styles.tooltipTitle}>{activeSalesTooltip.label}</Text>
                  <Text style={styles.tooltipText}>Value: <Text style={styles.tooltipBold}>{
                     metric === 'orders' ? (activeSalesTooltip as any).graphValue : formatCurrency((activeSalesTooltip as any).graphValue)
                  }</Text></Text>
                </View>
              )}
            </View>
          )}
        </View>
      </View>
    </View>
  );
};

// ── TAB 2: Orders ─────────────────────────────────────────────────────────────
const OrdersTab: React.FC<{
  donutArcs: { arcs: any[]; total: number };
  orderBreakdown: { totalOrders: number; completedOrders: number; pendingOrders: number; cancelledOrders: number };
}> = ({ donutArcs, orderBreakdown }) => (
  <View style={styles.tabContent}>
    <View style={styles.tabTitleRow}>
      <View>
        <Text style={styles.tabContentTitle}>Order Fulfillment Status</Text>
        <Text style={styles.tabContentSubtitle}>Distribution of order outcomes</Text>
      </View>
      <MaterialIcons name="pie-chart" size={22} color={BRAND_RED} />
    </View>

    {donutArcs.total === 0 ? (
      <EmptyState icon="pie-chart-outlined" title="No order data yet" subtitle="Fulfillment chart will appear once orders are placed." />
    ) : (
      <View style={styles.ordersLayout}>
        {/* Donut */}
        <View style={styles.donutContainer}>
          {Platform.OS === 'web' ? (
            // @ts-ignore
            <svg width="200" height="200" viewBox="0 0 200 200">
              {donutArcs.arcs.map((arc) =>
                arc.pathData ? (
                  <path key={arc.id} d={arc.pathData} fill={arc.color} stroke="#fff" strokeWidth="2" />
                ) : null
              )}
              <text x="100" y="96" textAnchor="middle" fontSize="22" fontWeight="bold" fill="#1E293B">{donutArcs.total}</text>
              <text x="100" y="114" textAnchor="middle" fontSize="11" fill="#64748B">Total Orders</text>
            </svg>
          ) : (
            <View style={styles.donutFallback}>
              <Text style={styles.donutFallbackNum}>{donutArcs.total}</Text>
              <Text style={styles.donutFallbackLabel}>Total Orders</Text>
            </View>
          )}
        </View>

        {/* Legend cards */}
        <View style={styles.donutLegend}>
          {donutArcs.arcs.map((arc) => (
            <View key={arc.id} style={[styles.legendCard, { borderLeftColor: arc.color }]}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                <View style={[styles.legendDot, { backgroundColor: arc.color }]} />
                <Text style={styles.legendLabel}>{arc.label}</Text>
              </View>
              <View>
                <Text style={[styles.legendCount, { color: arc.color }]}>{arc.count}</Text>
                <Text style={styles.legendPct}>{arc.pctShare}%</Text>
              </View>
            </View>
          ))}
          <View style={[styles.legendCard, { borderLeftColor: '#94A3B8' }]}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
              <View style={[styles.legendDot, { backgroundColor: '#94A3B8' }]} />
              <Text style={styles.legendLabel}>Completion Rate</Text>
            </View>
            <Text style={[styles.legendCount, { color: SUCCESS_GREEN }]}>
              {orderBreakdown.totalOrders > 0
                ? Math.round((orderBreakdown.completedOrders / orderBreakdown.totalOrders) * 100)
                : 0}%
            </Text>
          </View>
        </View>
      </View>
    )}
  </View>
);

// ── TAB 3: Products ───────────────────────────────────────────────────────────
const ProductsTab: React.FC<{
  sortedTopProducts: AnalyticsTopProduct[];
  maxProductVal: number;
  productSortBy: 'revenue' | 'units';
  setProductSortBy: (v: 'revenue' | 'units') => void;
  activeProductTooltip: AnalyticsTopProduct | null;
  setActiveProductTooltip: (v: AnalyticsTopProduct | null) => void;
}> = ({ sortedTopProducts, maxProductVal, productSortBy, setProductSortBy, activeProductTooltip, setActiveProductTooltip }) => (
  <View style={styles.tabContent}>
    <View style={styles.tabTitleRow}>
      <View>
        <Text style={styles.tabContentTitle}>Top Selling Products</Text>
        <Text style={styles.tabContentSubtitle}>Top 5 items by sales performance</Text>
      </View>
      <View style={styles.sortToggle}>
        {(['revenue', 'units'] as const).map((s) => (
          <TouchableOpacity
            key={s}
            style={[styles.sortBtn, productSortBy === s && styles.sortBtnActive]}
            onPress={() => setProductSortBy(s)}
          >
            <Text style={[styles.sortBtnText, productSortBy === s && styles.sortBtnTextActive]}>
              {s === 'revenue' ? 'Revenue' : 'Units'}
            </Text>
          </TouchableOpacity>
        ))}
      </View>
    </View>

    {sortedTopProducts.length === 0 ? (
      <EmptyState icon="inventory-2" title="No product sales yet" subtitle="Top sellers will appear after orders are placed." />
    ) : (
      <View style={styles.barList}>
        {sortedTopProducts.slice(0, 5).map((prod, idx) => {
          const val     = productSortBy === 'revenue' ? prod.totalRevenue : prod.totalSold;
          const fillPct = Math.min(100, Math.max(8, (val / maxProductVal) * 100));
          const active  = activeProductTooltip?.productId === prod.productId;
          return (
            <View key={prod.productId ?? idx} style={styles.barItem}>
              <View style={styles.barItemHeader}>
                <View style={styles.barTitleGroup}>
                  <View style={[styles.rankBadge, { backgroundColor: idx === 0 ? '#E65100' : BRAND_RED }]}>
                    <Text style={styles.rankText}>#{idx + 1}</Text>
                  </View>
                  <Text style={styles.barItemName} numberOfLines={1}>{prod.name}</Text>
                </View>
                <View style={{ alignItems: 'flex-end' }}>
                  <Text style={styles.barRevText}>{formatCurrency(prod.totalRevenue)}</Text>
                  <Text style={styles.barSoldText}>{prod.totalSold} sold</Text>
                </View>
              </View>
              <TouchableOpacity
                style={styles.barTrack}
                onPress={() => setActiveProductTooltip(active ? null : prod)}
                activeOpacity={0.8}
              >
                <View style={[styles.barFill, { width: `${fillPct}%` }]} />
              </TouchableOpacity>
              {active && (
                <View style={styles.tooltipBox}>
                  <Text style={styles.tooltipTitle}>{prod.name}</Text>
                  <Text style={styles.tooltipText}>Category: <Text style={styles.tooltipBold}>{prod.category}</Text></Text>
                  <Text style={styles.tooltipText}>Units sold: <Text style={styles.tooltipBold}>{prod.totalSold}</Text></Text>
                  <Text style={styles.tooltipText}>Revenue: <Text style={styles.tooltipBold}>{formatCurrency(prod.totalRevenue)}</Text></Text>
                </View>
              )}
            </View>
          );
        })}
      </View>
    )}
  </View>
);

// ── TAB 4: Delivery ───────────────────────────────────────────────────────────
const DeliveryTab: React.FC<{
  data: BusinessAnalyticsData | null;
  maxLocationRevenue: number;
  activeLocationTooltip: AnalyticsLocationPoint | null;
  setActiveLocationTooltip: (v: AnalyticsLocationPoint | null) => void;
}> = ({ data, maxLocationRevenue, activeLocationTooltip, setActiveLocationTooltip }) => (
  <View style={styles.tabContent}>
    <View style={styles.tabTitleRow}>
      <View>
        <Text style={styles.tabContentTitle}>Top Delivery Areas</Text>
        <Text style={styles.tabContentSubtitle}>Location-wise order distribution</Text>
      </View>
      <MaterialIcons name="place" size={22} color={BRAND_RED} />
    </View>

    {!data?.locationSales?.length ? (
      <EmptyState icon="place" title="No delivery area data" subtitle="Location metrics will appear when order addresses are available." />
    ) : (
      <View style={styles.barList}>
        {data.locationSales.map((loc, idx) => {
          const fillPct = Math.min(100, Math.max(8, (loc.revenue / maxLocationRevenue) * 100));
          const active  = activeLocationTooltip?.location === loc.location;
          return (
            <View key={loc.location ?? idx} style={styles.barItem}>
              <View style={styles.barItemHeader}>
                <View style={styles.barTitleGroup}>
                  <View style={[styles.rankBadge, { backgroundColor: BRAND_RED }]}>
                    <Text style={styles.rankText}>#{idx + 1}</Text>
                  </View>
                  <Text style={styles.barItemName} numberOfLines={1}>{loc.location}</Text>
                </View>
                <View style={{ alignItems: 'flex-end' }}>
                  <Text style={styles.barRevText}>{formatCurrency(loc.revenue)}</Text>
                  <Text style={styles.barSoldText}>{loc.ordersCount} orders</Text>
                </View>
              </View>
              <TouchableOpacity
                style={styles.barTrack}
                onPress={() => setActiveLocationTooltip(active ? null : loc)}
                activeOpacity={0.8}
              >
                <View style={[styles.barFill, { width: `${fillPct}%`, backgroundColor: '#1565C0' }]} />
              </TouchableOpacity>
              {active && (
                <View style={styles.tooltipBox}>
                  <Text style={styles.tooltipTitle}>{loc.location}</Text>
                  <Text style={styles.tooltipText}>Orders: <Text style={styles.tooltipBold}>{loc.ordersCount}</Text></Text>
                  <Text style={styles.tooltipText}>Revenue: <Text style={styles.tooltipBold}>{formatCurrency(loc.revenue)}</Text></Text>
                </View>
              )}
            </View>
          );
        })}
      </View>
    )}
  </View>
);

// ── TAB 5: Inventory ──────────────────────────────────────────────────────────
const InventoryTab: React.FC<{
  inventoryInfo: { outOfStock: number; lowStock: number; goodStock: number; totalProducts: number; totalStockUnits: number };
  onNavigateToInventory?: (filter?: string) => void;
}> = ({ inventoryInfo, onNavigateToInventory }) => {
  const total = Math.max(1, inventoryInfo.totalProducts);
  const segments = [
    { label: 'Healthy Stock',  count: inventoryInfo.goodStock,   color: SUCCESS_GREEN, bg: '#E8F5E9', border: '#A5D6A7', tag: 'HEALTHY',  filter: 'good_stock',   icon: 'check-circle',   hint: '>5 items' },
    { label: 'Low Stock',      count: inventoryInfo.lowStock,    color: '#E65100',     bg: '#FFF3E0', border: '#FFE0B2', tag: 'ALERT',    filter: 'low_stock',    icon: 'warning',        hint: '1-5 items' },
    { label: 'Out of Stock',   count: inventoryInfo.outOfStock,  color: BRAND_RED,     bg: '#FFEBEE', border: '#FFCDD2', tag: 'CRITICAL', filter: 'out_of_stock', icon: 'remove-circle',  hint: '0 items' },
  ];
  return (
    <View style={styles.tabContent}>
      <View style={styles.tabTitleRow}>
        <View>
          <Text style={styles.tabContentTitle}>Inventory Health Status</Text>
          <Text style={styles.tabContentSubtitle}>Real-time stock classification & alerts</Text>
        </View>
        <MaterialIcons name="inventory" size={22} color={BRAND_RED} />
      </View>

      {/* Summary pill */}
      <View style={styles.inventorySummaryRow}>
        <View style={styles.inventorySummaryPill}>
          <MaterialIcons name="inventory-2" size={16} color={BRAND_RED} />
          <Text style={styles.inventorySummaryText}>
            <Text style={{ fontFamily: 'Inter-Bold', color: BRAND_RED }}>{inventoryInfo.totalProducts}</Text> total products •{' '}
            <Text style={{ fontFamily: 'Inter-Bold', color: NEUTRAL_GRAY }}>{inventoryInfo.totalStockUnits}</Text> total units
          </Text>
        </View>
      </View>

      {/* Progress bar overview */}
      <View style={styles.inventoryProgressRow}>
        {segments.map((seg) => (
          <View
            key={seg.label}
            style={[styles.inventoryProgressSeg, { flex: Math.max(seg.count, 0.2), backgroundColor: seg.color }]}
          />
        ))}
      </View>

      {/* Health cards */}
      <View style={styles.healthGrid}>
        {segments.map((seg) => (
          <TouchableOpacity
            key={seg.label}
            style={[styles.healthCard, { backgroundColor: seg.bg, borderColor: seg.border }]}
            onPress={() => onNavigateToInventory?.(seg.filter)}
            activeOpacity={0.8}
          >
            <View style={styles.healthTop}>
              <MaterialIcons name={seg.icon as any} size={18} color={seg.color} />
              <Text style={[styles.healthTag, { color: seg.color }]}>{seg.tag}</Text>
            </View>
            <Text style={[styles.healthNumber, { color: seg.color }]}>{seg.count}</Text>
            <Text style={[styles.healthLabel, { color: seg.color }]}>{seg.label}</Text>
            <Text style={styles.healthHint}>{seg.hint}</Text>
            <Text style={styles.healthPct}>{Math.round((seg.count / total) * 100)}% of catalog</Text>
          </TouchableOpacity>
        ))}
      </View>
    </View>
  );
};

// ── TAB 6: Business Insights ──────────────────────────────────────────────────
const InsightsTab: React.FC<{
  totalRevenue: number;
  totalOrders: number;
  customerInfo: { totalUsers: number; newCustomers: number; returningCustomers: number };
  inventoryInfo: { outOfStock: number; lowStock: number; goodStock: number; totalProducts: number; totalStockUnits: number };
  orderBreakdown: { totalOrders: number; completedOrders: number; pendingOrders: number; cancelledOrders: number };
  topProducts: AnalyticsTopProduct[];
  locationSales: AnalyticsLocationPoint[];
}> = ({ totalRevenue, totalOrders, customerInfo, inventoryInfo, orderBreakdown, topProducts, locationSales }) => {
  const avgOrder      = totalOrders > 0 ? totalRevenue / totalOrders : 0;
  const completionPct = totalOrders > 0 ? Math.round((orderBreakdown.completedOrders / totalOrders) * 100) : 0;
  const retentionPct  = customerInfo.totalUsers > 0
    ? Math.round((customerInfo.returningCustomers / customerInfo.totalUsers) * 100) : 0;
  const topProduct    = topProducts[0];
  const topLocation   = locationSales[0];

  const insights: { emoji: string; heading: string; body: string; color: string }[] = [];

  // Sales insight
  if (totalRevenue > 0) {
    insights.push({
      emoji: '💡', heading: 'Sales Insight', color: '#1565C0',
      body: `Your store has generated a total revenue of ${formatCurrency(totalRevenue)} across ${totalOrders} order${totalOrders !== 1 ? 's' : ''}. The average order value is ${formatCurrency(avgOrder)}.`,
    });
  } else {
    insights.push({
      emoji: '💡', heading: 'Sales Insight', color: '#1565C0',
      body: 'No sales have been recorded yet. Once orders are placed, revenue insights will appear here.',
    });
  }

  // Product insight
  if (topProduct) {
    insights.push({
      emoji: '🏆', heading: 'Top Product', color: '#E65100',
      body: `"${topProduct.name}" is currently your best-selling product with ${topProduct.totalSold} units sold and ${formatCurrency(topProduct.totalRevenue)} in revenue.`,
    });
  }

  // Inventory insight
  if (inventoryInfo.totalProducts > 0) {
    const healthyPct = Math.round((inventoryInfo.goodStock / inventoryInfo.totalProducts) * 100);
    const msg = inventoryInfo.outOfStock > 0
      ? `⚠️ ${inventoryInfo.outOfStock} product${inventoryInfo.outOfStock > 1 ? 's are' : ' is'} out of stock and need immediate restocking.`
      : inventoryInfo.lowStock > 0
        ? `${inventoryInfo.lowStock} product${inventoryInfo.lowStock > 1 ? 's have' : ' has'} low stock — consider restocking soon.`
        : 'All products currently have healthy stock levels.';
    insights.push({
      emoji: '📦', heading: 'Inventory Insight', color: SUCCESS_GREEN,
      body: `${healthyPct}% of your catalog is in healthy stock. ${msg}`,
    });
  }

  // Orders insight
  if (totalOrders > 0) {
    insights.push({
      emoji: '📋', heading: 'Orders Insight', color: '#6A1B9A',
      body: `${completionPct}% of orders have been completed. ${orderBreakdown.pendingOrders} order${orderBreakdown.pendingOrders !== 1 ? 's are' : ' is'} still pending fulfillment.`,
    });
  }

  // Delivery insight
  if (topLocation) {
    insights.push({
      emoji: '📍', heading: 'Delivery Insight', color: '#00796B',
      body: `"${topLocation.location}" is your top delivery area with ${topLocation.ordersCount} order${topLocation.ordersCount !== 1 ? 's' : ''} and ${formatCurrency(topLocation.revenue)} in revenue.`,
    });
  }

  // Customer insight
  if (customerInfo.totalUsers > 0) {
    insights.push({
      emoji: '👥', heading: 'Customer Insight', color: WARNING_AMBER,
      body: `You have ${customerInfo.totalUsers} registered customer${customerInfo.totalUsers !== 1 ? 's' : ''}. ${retentionPct}% are returning customers, indicating ${retentionPct >= 40 ? 'good' : 'growing'} customer retention.`,
    });
  }

  // Action required
  if (inventoryInfo.outOfStock > 0 || inventoryInfo.lowStock > 0) {
    insights.push({
      emoji: '⚠️', heading: 'Action Required', color: BRAND_RED,
      body: `Restock ${inventoryInfo.outOfStock} out-of-stock and ${inventoryInfo.lowStock} low-stock product${inventoryInfo.lowStock !== 1 ? 's' : ''} before the next peak sales period to avoid revenue loss.`,
    });
  }

  return (
    <View style={styles.tabContent}>
      <View style={styles.tabTitleRow}>
        <View>
          <Text style={styles.tabContentTitle}>Business Insights</Text>
          <Text style={styles.tabContentSubtitle}>Data-backed takeaways from real store activity</Text>
        </View>
        <MaterialIcons name="lightbulb-outline" size={22} color={BRAND_RED} />
      </View>

      {insights.length === 0 ? (
        <EmptyState icon="lightbulb-outline" title="No insights yet" subtitle="Insights generate automatically when store data is available." />
      ) : (
        <View style={styles.insightsList}>
          {insights.map((ins, i) => (
            <View key={i} style={[styles.insightCard, { borderLeftColor: ins.color }]}>
              <View style={styles.insightHeadRow}>
                <Text style={styles.insightEmoji}>{ins.emoji}</Text>
                <Text style={[styles.insightHeading, { color: ins.color }]}>{ins.heading}</Text>
              </View>
              <Text style={styles.insightBody}>{ins.body}</Text>
            </View>
          ))}
        </View>
      )}
    </View>
  );
};

// ─────────────────────────────────────────────────────────────────────────────
// Styles
// ─────────────────────────────────────────────────────────────────────────────
const styles = StyleSheet.create({
  wrapper: {
    marginHorizontal: Spacing.marginMobile,
    marginBottom: Spacing.lg,
    gap: 12,
  },

  // ── Section header ──
  sectionHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  sectionTitle: {
    fontSize: 18,
    fontFamily: 'Inter-Bold',
    color: Colors.onSurface,
  },
  sectionSubtitle: {
    fontSize: 12,
    color: NEUTRAL_GRAY,
    marginTop: 1,
  },
  liveBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    backgroundColor: '#DCFCE7',
    borderColor: '#86EFAC',
    borderWidth: 1,
    paddingHorizontal: 9,
    paddingVertical: 4,
    borderRadius: BorderRadius.full,
  },
  liveDot: {
    width: 7,
    height: 7,
    borderRadius: 3.5,
    backgroundColor: '#16A34A',
  },
  liveBadgeText: {
    fontSize: 10,
    fontFamily: 'Inter-Bold',
    color: '#15803D',
  },

  // ── Tab bar ──
  tabBarScroll: {
    flexGrow: 0,
  },
  tabBarContent: {
    flexDirection: 'row',
    gap: 6,
    paddingHorizontal: 2,
    paddingVertical: 2,
  },
  tabBar: {
    flexDirection: 'row',
    gap: 6,
  },
  tab: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingHorizontal: 13,
    paddingVertical: 8,
    borderRadius: BorderRadius.full,
    backgroundColor: '#F1F5F9',
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  tabActive: {
    backgroundColor: BRAND_RED,
    borderColor: BRAND_RED,
  },
  tabSkeleton: {
    width: 80,
    opacity: 0.3,
  },
  tabLabel: {
    fontSize: 12,
    fontFamily: 'Inter-SemiBold',
    color: NEUTRAL_GRAY,
  },
  tabLabelActive: {
    color: '#fff',
  },

  // ── Content card ──
  contentCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: BorderRadius.default,
    padding: 16,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },

  // ── Tab content ──
  tabContent: {
    gap: 14,
  },
  tabTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 2,
  },
  tabContentTitle: {
    fontSize: 15,
    fontFamily: 'Inter-Bold',
    color: Colors.onSurface,
  },
  tabContentSubtitle: {
    fontSize: 11,
    color: NEUTRAL_GRAY,
    marginTop: 1,
  },

  // ── KPI row (sales tab) ──
  kpiRow: {
    flexDirection: 'row',
    gap: 8,
    flexWrap: 'wrap',
  },
  kpiPill: {
    flex: 1,
    minWidth: 100,
    backgroundColor: '#F8FAFC',
    borderRadius: BorderRadius.sm,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  kpiPillLabel: {
    fontSize: 10.5,
    color: NEUTRAL_GRAY,
    fontFamily: 'Inter-Medium',
  },
  kpiPillValue: {
    fontSize: 17,
    fontFamily: 'Inter-Bold',
    marginTop: 2,
  },

  // ── Line chart ──
  lineChartWrapper: {
    position: 'relative',
    width: '100%',
  },

  // ── Tooltip ──
  tooltipBox: {
    position: 'absolute',
    top: 8,
    right: 8,
    backgroundColor: '#1E293B',
    borderRadius: BorderRadius.sm,
    padding: 8,
    zIndex: 99,
    minWidth: 130,
  },
  tooltipTitle: { color: '#fff', fontSize: 11, fontFamily: 'Inter-Bold', marginBottom: 2 },
  tooltipText:  { color: '#CBD5E1', fontSize: 10 },
  tooltipBold:  { color: '#fff', fontFamily: 'Inter-Bold' },

  // ── Orders tab ──
  ordersLayout: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 16,
    flexWrap: 'wrap',
  },
  donutContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    minWidth: 200,
  },
  donutFallback: {
    width: 160,
    height: 160,
    borderRadius: 80,
    borderWidth: 24,
    borderColor: BRAND_RED,
    alignItems: 'center',
    justifyContent: 'center',
  },
  donutFallbackNum: { fontSize: 24, fontFamily: 'Inter-Bold', color: Colors.onSurface },
  donutFallbackLabel: { fontSize: 11, color: NEUTRAL_GRAY },
  donutLegend: {
    flex: 1,
    gap: 8,
    minWidth: 160,
  },
  legendCard: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#F8FAFC',
    borderRadius: BorderRadius.sm,
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderLeftWidth: 3,
    borderWidth: 1,
    borderColor: '#F1F5F9',
  },
  legendDot: {
    width: 9,
    height: 9,
    borderRadius: 4.5,
  },
  legendLabel: { fontSize: 12, fontFamily: 'Inter-Medium', color: Colors.onSurface },
  legendCount: { fontSize: 16, fontFamily: 'Inter-Bold', textAlign: 'right' },
  legendPct:   { fontSize: 10, color: NEUTRAL_GRAY, textAlign: 'right' },

  // ── Bar charts (products + delivery) ──
  sortToggle: {
    flexDirection: 'row',
    backgroundColor: '#F1F5F9',
    borderRadius: BorderRadius.sm,
    padding: 2,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  sortBtn: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: BorderRadius.sm,
  },
  sortBtnActive: { backgroundColor: BRAND_RED },
  sortBtnText:   { fontSize: 11, fontFamily: 'Inter-Medium', color: NEUTRAL_GRAY },
  sortBtnTextActive: { color: '#fff', fontFamily: 'Inter-Bold' },

  barList: { gap: 12 },
  barItem: { position: 'relative' },
  barItemHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 5,
  },
  barTitleGroup: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    flex: 1,
  },
  rankBadge: {
    width: 22,
    height: 22,
    borderRadius: 11,
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  rankText:    { color: '#fff', fontSize: 9.5, fontFamily: 'Inter-Bold' },
  barItemName: { fontSize: 12.5, fontFamily: 'Inter-Bold', color: Colors.onSurface, flex: 1 },
  barRevText:  { fontSize: 13, fontFamily: 'Inter-Bold', color: BRAND_RED },
  barSoldText: { fontSize: 10.5, color: NEUTRAL_GRAY },
  barTrack: {
    height: 9,
    width: '100%',
    backgroundColor: '#F1F5F9',
    borderRadius: BorderRadius.full,
    overflow: 'hidden',
  },
  barFill: {
    height: '100%',
    borderRadius: BorderRadius.full,
    backgroundColor: BRAND_RED,
  },

  // ── Inventory tab ──
  inventorySummaryRow: {
    alignItems: 'flex-start',
  },
  inventorySummaryPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#FFF0EF',
    borderRadius: BorderRadius.full,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderWidth: 1,
    borderColor: '#FFCDD2',
  },
  inventorySummaryText: {
    fontSize: 12,
    color: Colors.onSurface,
  },
  inventoryProgressRow: {
    flexDirection: 'row',
    height: 8,
    borderRadius: BorderRadius.full,
    overflow: 'hidden',
    gap: 2,
  },
  inventoryProgressSeg: {
    height: '100%',
    borderRadius: BorderRadius.full,
    minWidth: 4,
  },
  healthGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
  healthCard: {
    flex: 1,
    minWidth: 110,
    padding: 12,
    borderRadius: BorderRadius.default,
    borderWidth: 1,
  },
  healthTop: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 4,
  },
  healthTag:    { fontSize: 9, fontFamily: 'Inter-Bold', letterSpacing: 0.5 },
  healthNumber: { fontSize: 24, fontFamily: 'Inter-Bold', marginVertical: 2 },
  healthLabel:  { fontSize: 11.5, fontFamily: 'Inter-SemiBold' },
  healthHint:   { fontSize: 10, color: NEUTRAL_GRAY, marginTop: 1 },
  healthPct:    { fontSize: 10, color: NEUTRAL_GRAY },

  // ── Insights tab ──
  insightsList: { gap: 10 },
  insightCard: {
    backgroundColor: '#F8FAFC',
    borderRadius: BorderRadius.sm,
    padding: 12,
    borderWidth: 1,
    borderColor: '#F1F5F9',
    borderLeftWidth: 4,
  },
  insightHeadRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 4,
  },
  insightEmoji:   { fontSize: 16 },
  insightHeading: { fontSize: 13, fontFamily: 'Inter-Bold' },
  insightBody:    { fontSize: 12, color: Colors.onSurfaceVariant, lineHeight: 18 },

  // ── Empty / loading / error ──
  emptyState: {
    paddingVertical: 32,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
  },
  emptyTitle:    { fontSize: 13.5, fontFamily: 'Inter-Bold', color: Colors.onSurface, textAlign: 'center' },
  emptySubtitle: { fontSize: 11, color: NEUTRAL_GRAY, textAlign: 'center', maxWidth: 260 },

  loadingText: {
    fontSize: 13,
    color: NEUTRAL_GRAY,
    textAlign: 'center',
    marginTop: 8,
    marginBottom: 16,
  },
  errorTitle: { fontSize: 16, fontFamily: 'Inter-Bold', color: Colors.onSurface, marginTop: 8 },
  errorSub:   { fontSize: 12, color: NEUTRAL_GRAY, marginTop: 4 },
  retryBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: BRAND_RED,
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: BorderRadius.sm,
    marginTop: 12,
  },
  retryBtnText: { color: '#fff', fontSize: 13, fontFamily: 'Inter-Bold' },

  // ── Quick actions ──
  cardHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  blockTitle:    { fontSize: 15, fontFamily: 'Inter-Bold', color: Colors.onSurface },
  blockSubtitle: { fontSize: 11.5, color: NEUTRAL_GRAY, marginTop: 1 },
  quickActionsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
  quickActionBtn: {
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#F8FAFC',
    borderRadius: BorderRadius.default,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    paddingVertical: 14,
    paddingHorizontal: 10,
    minWidth: 90,
    flex: 1,
    gap: 6,
  },
  quickActionBtnHighlight: {
    borderColor: '#FFE0B2',
    backgroundColor: '#FFF8F0',
  },
  quickActionIcon: {
    width: 44,
    height: 44,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  quickActionLabel: {
    fontSize: 11.5,
    fontFamily: 'Inter-SemiBold',
    color: Colors.onSurface,
    textAlign: 'center',
  },
});
