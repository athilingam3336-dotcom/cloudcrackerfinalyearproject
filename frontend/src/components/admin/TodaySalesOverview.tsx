import React, { useState, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
  useWindowDimensions,
} from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { Colors } from '@/constants/colors';
import { Typography } from '@/constants/typography';
import { Spacing, BorderRadius } from '@/constants/spacing';
import { formatCurrency } from '@/utils/currency';
import {
  SalesSummaryData,
  ProductSalesSummaryItem,
  CategorySalesSummaryItem,
  HourlySalesTrendItem,
} from '@/services/adminService';

const BRAND_CHART_COLORS = [
  '#C62828', // Crimson Red (Primary)
  '#EF6C00', // Amber Orange
  '#D97706', // Warm Gold
  '#2E7D32', // Emerald Green
  '#6A1B9A', // Royal Purple
  '#00838F', // Ocean Teal
  '#1565C0', // Cobalt Blue
  '#D81B60', // Hot Pink
];

import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { RootStackParamList } from '@/navigation/types';

export interface TodaySalesOverviewProps {
  summaryData: SalesSummaryData | null;
  isLoading: boolean;
  onRetry?: () => void;
}

export const TodaySalesOverview: React.FC<TodaySalesOverviewProps> = ({
  summaryData,
  isLoading,
  onRetry,
}) => {
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const { width } = useWindowDimensions();
  const isDesktop = width >= 1024;
  const isTablet = width >= 768 && width < 1024;

  const [activeProductTooltip, setActiveProductTooltip] = useState<ProductSalesSummaryItem | null>(null);
  const [activeCategoryTooltip, setActiveCategoryTooltip] = useState<CategorySalesSummaryItem | null>(null);
  const [activeTrendTooltip, setActiveTrendTooltip] = useState<HourlySalesTrendItem | null>(null);

  // Filter top 5 products sorted by units sold
  const topProducts = useMemo(() => {
    if (!summaryData?.products) return [];
    return [...summaryData.products]
      .sort((a, b) => b.total_sold - a.total_sold)
      .slice(0, 5);
  }, [summaryData?.products]);

  // Determine peak sales hour
  const peakSalesHour = useMemo(() => {
    if (!summaryData?.hourly_trend || summaryData.hourly_trend.length === 0) return null;
    let maxItem: HourlySalesTrendItem | null = null;
    for (const item of summaryData.hourly_trend) {
      if (!maxItem || item.revenue > maxItem.revenue) {
        if (item.revenue > 0) {
          maxItem = item;
        }
      }
    }
    return maxItem;
  }, [summaryData?.hourly_trend]);

  // Group smaller categories into "Others" if > 6
  const processedCategories = useMemo(() => {
    if (!summaryData?.categories) return [];
    const cats = [...summaryData.categories].sort((a, b) => b.total_sold - a.total_sold);
    if (cats.length <= 6) return cats;

    const mainCats = cats.slice(0, 5);
    const otherCats = cats.slice(5);
    const otherUnits = otherCats.reduce((acc, c) => acc + c.total_sold, 0);
    const otherRev = otherCats.reduce((acc, c) => acc + c.total_revenue, 0);
    const otherPct = otherCats.reduce((acc, c) => acc + c.percentage, 0);

    return [
      ...mainCats,
      {
        category_id: 'others',
        category_name: 'Others',
        total_sold: otherUnits,
        total_revenue: otherRev,
        percentage: Math.round(otherPct * 10) / 10,
      },
    ];
  }, [summaryData?.categories]);

  if (isLoading) {
    return (
      <View style={styles.container}>
        <View style={styles.skeletonSectionHeader} />
        <View style={[styles.chartsRow, (isDesktop || isTablet) && styles.chartsRowDesktop]}>
          <View style={[styles.skeletonCard, styles.chartCardHalf]}>
            <ActivityIndicator size="small" color={Colors.primary} />
            <Text style={styles.loadingText}>Fetching live sales analytics...</Text>
          </View>
          <View style={[styles.skeletonCard, styles.chartCardHalf]}>
            <ActivityIndicator size="small" color={Colors.primary} />
            <Text style={styles.loadingText}>Calculating category distribution...</Text>
          </View>
        </View>
      </View>
    );
  }

  if (!summaryData) {
    return (
      <View style={styles.errorCard}>
        <MaterialIcons name="error-outline" size={32} color={Colors.error} />
        <Text style={styles.errorTitle}>Unable to load sales analytics</Text>
        <Text style={styles.errorSubtitle}>
          Could not fetch real-time sales summary data. Check server connection and retry.
        </Text>
        {onRetry && (
          <TouchableOpacity style={styles.retryBtn} onPress={onRetry} activeOpacity={0.8}>
            <Text style={styles.retryBtnText}>Retry Analytics</Text>
          </TouchableOpacity>
        )}
      </View>
    );
  }

  const {
    today_revenue = 0,
    today_orders = 0,
    total_units_sold = 0,
    best_selling_product,
    hourly_trend = [],
    insights = [],
  } = summaryData;

  const maxProductSold = Math.max(...topProducts.map((p) => p.total_sold), 1);
  const maxTrendRevenue = Math.max(...hourly_trend.map((t) => t.revenue), 1);

  return (
    <View style={styles.container}>
      {/* Section Header */}
      <View style={styles.sectionHeader}>
        <View style={styles.headerTitleRow}>
          <Text style={styles.sectionTitle}>Today's Sales Overview</Text>
          <View style={styles.liveBadge}>
            <View style={styles.liveDot} />
            <Text style={styles.liveBadgeText}>REAL-TIME</Text>
          </View>
        </View>
        <Text style={styles.sectionSubtitle}>Real-time sales performance for today</Text>
      </View>

      {/* KPI Cards (Preserved 4 Compact KPI Cards) */}
      <View style={[styles.kpiGrid, isDesktop && styles.kpiGridDesktop]}>
        <TouchableOpacity
          style={styles.kpiCard}
          onPress={() => navigation.navigate('OrderManagement')}
          activeOpacity={0.8}
        >
          <View style={styles.kpiHeader}>
            <View style={[styles.kpiIconBox, { backgroundColor: '#FFEBEE' }]}>
              <MaterialIcons name="payments" size={20} color={Colors.primary} />
            </View>
            <Text style={styles.kpiTag}>REVENUE</Text>
          </View>
          <Text style={styles.kpiValue}>{formatCurrency(today_revenue)}</Text>
          <Text style={styles.kpiLabel}>Today's Total Sales</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.kpiCard}
          onPress={() => navigation.navigate('OrderManagement')}
          activeOpacity={0.8}
        >
          <View style={styles.kpiHeader}>
            <View style={[styles.kpiIconBox, { backgroundColor: '#FFF3E0' }]}>
              <MaterialIcons name="receipt-long" size={20} color="#E65100" />
            </View>
            <Text style={[styles.kpiTag, { color: '#E65100' }]}>ORDERS</Text>
          </View>
          <Text style={styles.kpiValue}>{today_orders} {today_orders === 1 ? 'Order' : 'Orders'}</Text>
          <Text style={styles.kpiLabel}>Processed Today</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.kpiCard}
          onPress={() => navigation.navigate('InventoryManagement')}
          activeOpacity={0.8}
        >
          <View style={styles.kpiHeader}>
            <View style={[styles.kpiIconBox, { backgroundColor: '#E8F5E9' }]}>
              <MaterialIcons name="local-fire-department" size={20} color="#2E7D32" />
            </View>
            <Text style={[styles.kpiTag, { color: '#2E7D32' }]}>VOLUME</Text>
          </View>
          <Text style={styles.kpiValue}>{total_units_sold} {total_units_sold === 1 ? 'Item' : 'Items'}</Text>
          <Text style={styles.kpiLabel}>Units Sold Today</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.kpiCard}
          onPress={() => navigation.navigate('ProductManagement')}
          activeOpacity={0.8}
        >
          <View style={styles.kpiHeader}>
            <View style={[styles.kpiIconBox, { backgroundColor: '#EDE7F6' }]}>
              <MaterialIcons name="emoji-events" size={20} color="#6A1B9A" />
            </View>
            <Text style={[styles.kpiTag, { color: '#6A1B9A' }]}>TOP SELLER</Text>
          </View>
          <Text style={styles.kpiValue} numberOfLines={1}>
            {best_selling_product ? best_selling_product.name : 'None Yet'}
          </Text>
          <Text style={styles.kpiLabel}>
            {best_selling_product ? `${best_selling_product.units_sold} units sold` : 'No orders recorded today'}
          </Text>
        </TouchableOpacity>
      </View>

      {/* Main Visual Analytics Grid */}
      <View style={[styles.chartsRow, (isDesktop || isTablet) && styles.chartsRowDesktop]}>
        {/* CARD 1 — TOP SELLING CRACKERS BAR CHART */}
        <View style={[styles.chartCard, (isDesktop || isTablet) && styles.chartCardHalf]}>
          <View style={styles.cardHeader}>
            <View>
              <Text style={styles.cardTitle}>Top Selling Crackers</Text>
              <Text style={styles.cardSubtitle}>Best-performing products by units sold</Text>
            </View>
            <MaterialIcons name="bar-chart" size={22} color={Colors.primary} />
          </View>

          {topProducts.length === 0 ? (
            <View style={styles.emptyChartState}>
              <MaterialIcons name="shopping-bag" size={42} color={Colors.tertiary} />
              <Text style={styles.emptyChartTitle}>No sales recorded yet</Text>
              <Text style={styles.emptyChartSubtitle}>
                Once today's orders are placed, top-selling crackers will rank here automatically.
              </Text>
            </View>
          ) : (
            <View style={styles.barsContainer}>
              {topProducts.map((item, idx) => {
                const fillPct = Math.min(100, Math.max(12, (item.total_sold / maxProductSold) * 100));
                const isSelected = activeProductTooltip?.product_id === item.product_id;
                const barColor = BRAND_CHART_COLORS[idx % BRAND_CHART_COLORS.length];

                return (
                  <View key={item.product_id || idx} style={styles.barItemRow}>
                    <View style={styles.barMetaHeader}>
                      <View style={styles.barTitleGroup}>
                        <View style={[styles.rankBadge, { backgroundColor: barColor }]}>
                          <Text style={styles.rankBadgeText}>#{idx + 1}</Text>
                        </View>
                        <Text style={styles.barProductName} numberOfLines={1}>
                          {item.product_name}
                        </Text>
                      </View>
                      <View style={styles.barValueBadges}>
                        <Text style={styles.barBadgeCount}>{item.total_sold} sold</Text>
                        <Text style={styles.barBadgeRevenue}>{formatCurrency(item.total_revenue)}</Text>
                      </View>
                    </View>

                    <TouchableOpacity
                      style={styles.barTrack}
                      activeOpacity={0.85}
                      onPress={() => setActiveProductTooltip(isSelected ? null : item)}
                    >
                      <View style={[styles.barFill, { width: `${fillPct}%`, backgroundColor: barColor }]} />
                    </TouchableOpacity>

                    {/* Tooltip Overlay */}
                    {isSelected && (
                      <View style={styles.tooltipBox}>
                        <Text style={styles.tooltipTitle}>{item.product_name}</Text>
                        <Text style={styles.tooltipText}>Units Sold: <Text style={styles.tooltipBold}>{item.total_sold}</Text></Text>
                        <Text style={styles.tooltipText}>Category: <Text style={styles.tooltipBold}>{item.category}</Text></Text>
                        <Text style={styles.tooltipText}>Revenue: <Text style={styles.tooltipBold}>{formatCurrency(item.total_revenue)}</Text></Text>
                      </View>
                    )}
                  </View>
                );
              })}
            </View>
          )}
        </View>

        {/* CARD 2 — SALES BY CATEGORY DONUT CHART */}
        <View style={[styles.chartCard, (isDesktop || isTablet) && styles.chartCardHalf]}>
          <View style={styles.cardHeader}>
            <View>
              <Text style={styles.cardTitle}>Sales by Category</Text>
              <Text style={styles.cardSubtitle}>Share of today's sales</Text>
            </View>
            <MaterialIcons name="pie-chart" size={22} color={Colors.primary} />
          </View>

          {processedCategories.length === 0 ? (
            <View style={styles.emptyChartState}>
              <MaterialIcons name="category" size={42} color={Colors.tertiary} />
              <Text style={styles.emptyChartTitle}>No category data yet</Text>
              <Text style={styles.emptyChartSubtitle}>
                Category shares will render automatically as soon as sales are recorded today.
              </Text>
            </View>
          ) : (
            <View style={styles.donutSection}>
              {/* Category Stacked Donut Progress Ring */}
              <View style={styles.donutBarTrack}>
                {processedCategories.map((cat, idx) => {
                  const color = BRAND_CHART_COLORS[idx % BRAND_CHART_COLORS.length];
                  return (
                    <View
                      key={cat.category_id || idx}
                      style={{
                        width: `${Math.max(4, cat.percentage)}%`,
                        height: 18,
                        backgroundColor: color,
                      }}
                    />
                  );
                })}
              </View>

              {/* Legend List */}
              <View style={styles.legendList}>
                {processedCategories.map((cat, idx) => {
                  const color = BRAND_CHART_COLORS[idx % BRAND_CHART_COLORS.length];
                  const isSelected = activeCategoryTooltip?.category_name === cat.category_name;

                  return (
                    <TouchableOpacity
                      key={cat.category_id || idx}
                      style={[styles.legendItem, isSelected && styles.legendItemSelected]}
                      activeOpacity={0.85}
                      onPress={() => setActiveCategoryTooltip(isSelected ? null : cat)}
                    >
                      <View style={styles.legendLeft}>
                        <View style={[styles.legendSwatch, { backgroundColor: color }]} />
                        <Text style={styles.legendName} numberOfLines={1}>
                          {cat.category_name}
                        </Text>
                      </View>
                      <View style={styles.legendRight}>
                        <Text style={styles.legendUnits}>{cat.total_sold} sold</Text>
                        <View style={[styles.pctBadge, { backgroundColor: `${color}15` }]}>
                          <Text style={[styles.legendPct, { color }]}>{cat.percentage}%</Text>
                        </View>
                      </View>

                      {/* Tooltip Overlay */}
                      {isSelected && (
                        <View style={styles.tooltipBox}>
                          <Text style={styles.tooltipTitle}>{cat.category_name}</Text>
                          <Text style={styles.tooltipText}>Units Sold: <Text style={styles.tooltipBold}>{cat.total_sold}</Text></Text>
                          <Text style={styles.tooltipText}>Sales Share: <Text style={styles.tooltipBold}>{cat.percentage}%</Text></Text>
                          <Text style={styles.tooltipText}>Revenue: <Text style={styles.tooltipBold}>{formatCurrency(cat.total_revenue)}</Text></Text>
                        </View>
                      )}
                    </TouchableOpacity>
                  );
                })}
              </View>
            </View>
          )}
        </View>
      </View>

      {/* CARD 3 — TODAY'S SALES TREND (HOURLY LINE / VELOCITY CHART) */}
      {hourly_trend.length > 0 && (
        <View style={styles.chartCardFull}>
          <View style={styles.cardHeader}>
            <View>
              <Text style={styles.cardTitle}>Today's Sales Trend</Text>
              <Text style={styles.cardSubtitle}>Hourly revenue performance</Text>
            </View>
            {peakSalesHour && (
              <View style={styles.peakHourPill}>
                <MaterialIcons name="trending-up" size={14} color="#C62828" />
                <Text style={styles.peakHourText}>
                  Peak Sales: {peakSalesHour.hour_label} — {formatCurrency(peakSalesHour.revenue)}
                </Text>
              </View>
            )}
          </View>

          <View style={styles.trendGraphRow}>
            {hourly_trend.map((point, idx) => {
              const heightPct = Math.min(100, Math.max(8, (point.revenue / maxTrendRevenue) * 100));
              const isSelected = activeTrendTooltip?.hour === point.hour;
              const isPeak = peakSalesHour?.hour === point.hour && point.revenue > 0;

              return (
                <TouchableOpacity
                  key={point.hour || idx}
                  style={styles.trendColumn}
                  activeOpacity={0.8}
                  onPress={() => setActiveTrendTooltip(isSelected ? null : point)}
                >
                  {isSelected && (
                    <View style={styles.trendTooltipBox}>
                      <Text style={styles.trendTooltipHour}>{point.hour_label}</Text>
                      <Text style={styles.trendTooltipRev}>{formatCurrency(point.revenue)}</Text>
                      <Text style={styles.trendTooltipOrders}>{point.orders} {point.orders === 1 ? 'order' : 'orders'}</Text>
                    </View>
                  )}

                  <View style={styles.trendBarTrack}>
                    <View
                      style={[
                        styles.trendBarFill,
                        {
                          height: `${heightPct}%`,
                          backgroundColor: isPeak ? Colors.primary : point.revenue > 0 ? '#EF6C00' : Colors.surfaceContainerHigh,
                        },
                      ]}
                    />
                  </View>
                  <Text style={styles.trendHourLabel} numberOfLines={1}>
                    {point.hour_label.split(' ')[0]}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>
        </View>
      )}

      {/* TODAY AT A GLANCE (Dynamic Data-Backed Insights) */}
      <View style={styles.insightsCard}>
        <View style={styles.insightsHeader}>
          <View style={styles.insightsIconBox}>
            <MaterialIcons name="auto-awesome" size={20} color={Colors.primary} />
          </View>
          <View>
            <Text style={styles.insightsTitle}>Today at a Glance</Text>
            <Text style={styles.insightsSubtitle}>Data-backed takeaways from today's transactions</Text>
          </View>
        </View>

        <View style={styles.insightsList}>
          {insights.map((insight, idx) => (
            <View key={idx} style={styles.insightRow}>
              <View style={styles.insightBullet} />
              <Text style={styles.insightText}>{insight}</Text>
            </View>
          ))}
        </View>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    marginVertical: Spacing.md,
  },
  skeletonSectionHeader: {
    height: 32,
    width: 220,
    backgroundColor: Colors.surfaceContainerLow,
    borderRadius: BorderRadius.md,
    marginBottom: Spacing.md,
  },
  skeletonCard: {
    height: 220,
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.xs,
    backgroundColor: Colors.surfaceContainerLowest,
    borderRadius: BorderRadius.xl,
    borderWidth: 1,
    borderColor: Colors.surfaceContainerHigh,
  },
  loadingText: {
    ...Typography.bodyMd,
    fontSize: 13,
    color: Colors.onSurfaceVariant,
    fontFamily: 'Inter-Medium',
  },
  errorCard: {
    backgroundColor: Colors.surfaceContainerLowest,
    borderRadius: BorderRadius.xl,
    padding: Spacing.lg,
    alignItems: 'center',
    marginVertical: Spacing.md,
    borderWidth: 1,
    borderColor: Colors.surfaceContainerHigh,
  },
  errorTitle: {
    ...Typography.titleLg,
    fontSize: 16,
    fontFamily: 'Inter-Bold',
    color: Colors.error,
    marginTop: Spacing.xs,
  },
  errorSubtitle: {
    ...Typography.bodyMd,
    fontSize: 12,
    color: Colors.onSurfaceVariant,
    textAlign: 'center',
    marginTop: 4,
    marginBottom: Spacing.md,
  },
  retryBtn: {
    backgroundColor: Colors.primary,
    paddingHorizontal: Spacing.md,
    paddingVertical: 8,
    borderRadius: BorderRadius.lg,
  },
  retryBtnText: {
    ...Typography.labelLg,
    color: '#ffffff',
    fontFamily: 'Inter-Bold',
  },
  sectionHeader: {
    marginBottom: Spacing.md,
  },
  headerTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.xs,
  },
  sectionTitle: {
    ...Typography.headlineLg,
    fontSize: 20,
    fontFamily: 'Inter-Bold',
    color: Colors.onSurface,
  },
  liveBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFEBEE',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: BorderRadius.full,
    gap: 4,
  },
  liveDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: Colors.primary,
  },
  liveBadgeText: {
    ...Typography.labelLg,
    fontSize: 9,
    fontFamily: 'Inter-Bold',
    color: Colors.primary,
    letterSpacing: 0.5,
  },
  sectionSubtitle: {
    ...Typography.bodyMd,
    fontSize: 13,
    color: Colors.onSurfaceVariant,
    marginTop: 2,
  },
  kpiGrid: {
    flexDirection: 'column',
    gap: Spacing.sm,
    marginBottom: Spacing.md,
  },
  kpiGridDesktop: {
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  kpiCard: {
    flex: 1,
    minWidth: 200,
    backgroundColor: Colors.surfaceContainerLowest,
    borderRadius: BorderRadius.xl,
    padding: Spacing.md,
    borderWidth: 1,
    borderColor: Colors.surfaceContainerHigh,
    shadowColor: Colors.shadowColor,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 6,
    elevation: 2,
  },
  kpiHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: Spacing.xs,
  },
  kpiIconBox: {
    width: 36,
    height: 36,
    borderRadius: BorderRadius.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  kpiTag: {
    ...Typography.labelLg,
    fontSize: 9,
    fontFamily: 'Inter-Bold',
    color: Colors.primary,
    letterSpacing: 0.8,
  },
  kpiValue: {
    ...Typography.headlineLg,
    fontSize: 22,
    fontFamily: 'Inter-Bold',
    color: Colors.onSurface,
    marginTop: 2,
  },
  kpiLabel: {
    ...Typography.bodyMd,
    fontSize: 12,
    color: Colors.onSurfaceVariant,
    marginTop: 2,
  },
  chartsRow: {
    flexDirection: 'column',
    gap: Spacing.md,
    marginBottom: Spacing.md,
  },
  chartsRowDesktop: {
    flexDirection: 'row',
  },
  chartCard: {
    backgroundColor: Colors.surfaceContainerLowest,
    borderRadius: 18,
    padding: Spacing.md,
    borderWidth: 1,
    borderColor: Colors.surfaceContainerHigh,
    shadowColor: Colors.shadowColor,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 6,
    elevation: 2,
  },
  chartCardHalf: {
    flex: 1,
  },
  chartCardFull: {
    backgroundColor: Colors.surfaceContainerLowest,
    borderRadius: 18,
    padding: Spacing.md,
    marginBottom: Spacing.md,
    borderWidth: 1,
    borderColor: Colors.surfaceContainerHigh,
    shadowColor: Colors.shadowColor,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 6,
    elevation: 2,
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: Spacing.md,
    paddingBottom: Spacing.xs,
    borderBottomWidth: 1,
    borderBottomColor: Colors.surfaceContainerHigh,
  },
  cardTitle: {
    ...Typography.titleLg,
    fontSize: 16,
    fontFamily: 'Inter-Bold',
    color: Colors.onSurface,
  },
  cardSubtitle: {
    ...Typography.bodyMd,
    fontSize: 12,
    color: Colors.onSurfaceVariant,
    marginTop: 2,
  },
  peakHourPill: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFEBEE',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: BorderRadius.full,
    gap: 4,
  },
  peakHourText: {
    ...Typography.labelLg,
    fontSize: 11,
    fontFamily: 'Inter-Bold',
    color: '#C62828',
  },
  emptyChartState: {
    paddingVertical: Spacing.xl,
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyChartTitle: {
    ...Typography.titleLg,
    fontSize: 15,
    fontFamily: 'Inter-Bold',
    color: Colors.onSurface,
    marginTop: Spacing.xs,
  },
  emptyChartSubtitle: {
    ...Typography.bodyMd,
    fontSize: 12,
    color: Colors.onSurfaceVariant,
    textAlign: 'center',
    marginTop: 4,
    paddingHorizontal: Spacing.md,
  },
  barsContainer: {
    gap: Spacing.sm,
  },
  barItemRow: {
    position: 'relative',
    marginBottom: 4,
  },
  barMetaHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 4,
  },
  barTitleGroup: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    flex: 1,
    marginRight: Spacing.xs,
  },
  rankBadge: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  rankBadgeText: {
    color: '#FFFFFF',
    fontSize: 10,
    fontFamily: 'Inter-Bold',
  },
  barProductName: {
    ...Typography.titleLg,
    fontSize: 13,
    fontFamily: 'Inter-SemiBold',
    color: Colors.onSurface,
    flex: 1,
  },
  barValueBadges: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.xs,
  },
  barBadgeCount: {
    ...Typography.labelLg,
    fontSize: 11,
    fontFamily: 'Inter-Bold',
    color: Colors.primary,
  },
  barBadgeRevenue: {
    ...Typography.bodyMd,
    fontSize: 11,
    color: Colors.onSurfaceVariant,
  },
  barTrack: {
    height: 12,
    backgroundColor: Colors.surfaceContainerHigh,
    borderRadius: BorderRadius.full,
    overflow: 'hidden',
  },
  barFill: {
    height: '100%',
    borderRadius: BorderRadius.full,
  },
  donutSection: {
    gap: Spacing.md,
  },
  donutBarTrack: {
    flexDirection: 'row',
    height: 18,
    borderRadius: BorderRadius.full,
    overflow: 'hidden',
    backgroundColor: Colors.surfaceContainerHigh,
  },
  legendList: {
    gap: Spacing.xs,
  },
  legendItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 6,
    paddingHorizontal: Spacing.xs,
    borderRadius: BorderRadius.md,
    position: 'relative',
  },
  legendItemSelected: {
    backgroundColor: Colors.surfaceContainerLow,
  },
  legendLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.xs,
    flex: 1,
  },
  legendSwatch: {
    width: 10,
    height: 10,
    borderRadius: 5,
  },
  legendName: {
    ...Typography.bodyMd,
    fontSize: 13,
    fontFamily: 'Inter-Medium',
    color: Colors.onSurface,
    flex: 1,
  },
  legendRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.xs + 2,
  },
  legendUnits: {
    ...Typography.bodyMd,
    fontSize: 12,
    color: Colors.onSurfaceVariant,
  },
  pctBadge: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: BorderRadius.sm,
  },
  legendPct: {
    ...Typography.titleLg,
    fontSize: 12,
    fontFamily: 'Inter-Bold',
  },
  tooltipBox: {
    position: 'absolute',
    top: -60,
    right: 10,
    backgroundColor: '#1E293B',
    borderRadius: BorderRadius.md,
    padding: Spacing.xs,
    zIndex: 100,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 8,
    minWidth: 140,
  },
  tooltipTitle: {
    ...Typography.labelLg,
    fontSize: 11,
    fontFamily: 'Inter-Bold',
    color: '#ffffff',
    marginBottom: 2,
  },
  tooltipText: {
    ...Typography.bodyMd,
    fontSize: 10,
    color: '#94A3B8',
  },
  tooltipBold: {
    color: '#ffffff',
    fontFamily: 'Inter-Bold',
  },
  trendGraphRow: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    justifyContent: 'space-between',
    height: 140,
    paddingTop: Spacing.md,
    paddingBottom: Spacing.xs,
  },
  trendColumn: {
    flex: 1,
    alignItems: 'center',
    height: '100%',
    justifyContent: 'flex-end',
    position: 'relative',
  },
  trendBarTrack: {
    width: 12,
    height: 100,
    backgroundColor: Colors.surfaceContainerHigh,
    borderRadius: BorderRadius.full,
    justifyContent: 'flex-end',
    overflow: 'hidden',
  },
  trendBarFill: {
    width: '100%',
    borderRadius: BorderRadius.full,
  },
  trendHourLabel: {
    ...Typography.labelLg,
    fontSize: 9,
    color: Colors.onSurfaceVariant,
    marginTop: 4,
  },
  trendTooltipBox: {
    position: 'absolute',
    top: -50,
    backgroundColor: '#1E293B',
    borderRadius: BorderRadius.md,
    padding: 6,
    zIndex: 100,
    alignItems: 'center',
    minWidth: 90,
  },
  trendTooltipHour: {
    fontSize: 10,
    fontFamily: 'Inter-Bold',
    color: '#ffffff',
  },
  trendTooltipRev: {
    fontSize: 11,
    fontFamily: 'Inter-Bold',
    color: '#4ADE80',
  },
  trendTooltipOrders: {
    fontSize: 9,
    color: '#94A3B8',
  },
  insightsCard: {
    backgroundColor: Colors.surfaceContainerLowest,
    borderRadius: 18,
    padding: Spacing.md,
    borderWidth: 1,
    borderColor: Colors.surfaceContainerHigh,
    shadowColor: Colors.shadowColor,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 6,
    elevation: 2,
  },
  insightsHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.xs,
    marginBottom: Spacing.sm,
    paddingBottom: Spacing.xs,
    borderBottomWidth: 1,
    borderBottomColor: Colors.surfaceContainerHigh,
  },
  insightsIconBox: {
    width: 32,
    height: 32,
    borderRadius: BorderRadius.md,
    backgroundColor: '#FFEBEE',
    alignItems: 'center',
    justifyContent: 'center',
  },
  insightsTitle: {
    ...Typography.titleLg,
    fontSize: 15,
    fontFamily: 'Inter-Bold',
    color: Colors.onSurface,
  },
  insightsSubtitle: {
    ...Typography.bodyMd,
    fontSize: 11,
    color: Colors.onSurfaceVariant,
  },
  insightsList: {
    gap: Spacing.xs,
  },
  insightRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: Spacing.xs,
  },
  insightBullet: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: Colors.primary,
    marginTop: 6,
  },
  insightText: {
    ...Typography.bodyLg,
    fontSize: 13,
    fontFamily: 'Inter-Medium',
    color: Colors.onSurface,
    flex: 1,
    lineHeight: 18,
  },
});

export default TodaySalesOverview;
