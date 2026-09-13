import React, { useState, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Platform,
  ScrollView,
} from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { Colors } from '@/constants/colors';
import { Typography } from '@/constants/typography';
import { Spacing, BorderRadius } from '@/constants/spacing';
import {
  InventoryItemOverviewUI,
  InventorySummaryMetrics,
  AdminCategoryItem,
} from '@/services/adminService';
import { UniversalSvgChart } from '@/components/common/UniversalSvgChart';

export interface InventoryDistributionPieChartProps {
  metrics: InventorySummaryMetrics;
  items: InventoryItemOverviewUI[];
  categories: AdminCategoryItem[];
  activeStatusFilter: string;
  selectedCategory: string;
  onSelectStatusFilter: (filter: 'All' | 'In Stock' | 'Low Stock' | 'Out of Stock') => void;
  onSelectCategory: (categoryId: string) => void;
  isListExpanded?: boolean;
  onToggleExpandList?: () => void;
}

type ChartMode = 'status' | 'category';

const CATEGORY_COLORS = [
  '#0284C7', // Sky Blue
  '#7B1FA2', // Purple
  '#E11D48', // Rose
  '#D97706', // Amber
  '#059669', // Emerald
  '#4F46E5', // Indigo
  '#0891B2', // Cyan
  '#C026D3', // Fuchsia
  '#2563EB', // Blue
  '#D946EF', // Pink
];

export const InventoryDistributionPieChart: React.FC<InventoryDistributionPieChartProps> = ({
  metrics,
  items,
  categories,
  activeStatusFilter,
  selectedCategory,
  onSelectStatusFilter,
  onSelectCategory,
  isListExpanded = false,
  onToggleExpandList,
}) => {
  const [chartMode, setChartMode] = useState<ChartMode>('status');
  const [viewType, setViewType] = useState<'pie' | 'bar'>('pie');
  const [hoveredSegment, setHoveredSegment] = useState<string | null>(null);
  const isWeb = Platform.OS === 'web';

  // Calculate Breakdown segments dynamically based on live inventory list & metrics
  const segments = useMemo(() => {
    if (chartMode === 'status') {
      let inStockCount = 0;
      let lowStockCount = 0;
      let outOfStockCount = 0;

      if (metrics && (metrics.totalProducts || 0) > 0) {
        lowStockCount = metrics.lowStockCount || 0;
        outOfStockCount = metrics.outOfStockCount || 0;
        inStockCount = Math.max(
          0,
          (metrics.totalProducts || 0) - lowStockCount - outOfStockCount
        );
      } else if (items && items.length > 0) {
        items.forEach((item) => {
          const isOut = item.stockStatus === 'OUT_OF_STOCK' || item.stock <= 0;
          const isLow =
            item.stockStatus === 'LOW_STOCK' || (item.stock > 0 && item.stock <= item.minimumStock);
          if (isOut) {
            outOfStockCount++;
          } else if (isLow) {
            lowStockCount++;
          } else {
            inStockCount++;
          }
        });
      }

      return [
        {
          id: 'In Stock',
          label: 'In Stock',
          count: inStockCount,
          color: '#16A34A', // Emerald Green
          statusFilter: 'In Stock' as const,
          categoryId: 'All',
          icon: 'check-circle',
        },
        {
          id: 'Low Stock',
          label: 'Low Stock',
          count: lowStockCount,
          color: '#ED6C02', // Amber Orange
          statusFilter: 'Low Stock' as const,
          categoryId: 'All',
          icon: 'warning',
        },
        {
          id: 'Out of Stock',
          label: 'Out of Stock',
          count: outOfStockCount,
          color: '#DC2626', // Crimson Red
          statusFilter: 'Out of Stock' as const,
          categoryId: 'All',
          icon: 'error-outline',
        },
      ];
    } else {
      // By Category Breakdown
      const catCountMap: Record<string, { name: string; count: number }> = {};

      if (categories && categories.length > 0) {
        categories.forEach((cat) => {
          catCountMap[cat.id] = { name: cat.name, count: 0 };
        });
      }

      if (items && items.length > 0) {
        items.forEach((item) => {
          const catId = item.categoryId || 'uncategorized';
          if (!catCountMap[catId]) {
            catCountMap[catId] = {
              name: item.categoryName || 'General',
              count: 0,
            };
          }
          catCountMap[catId].count += 1;
        });
      }

      const categoryEntries = Object.entries(catCountMap)
        .filter(([_, data]) => data.count > 0)
        .slice(0, 8); // Top 8 active categories

      return categoryEntries.map(([catId, data], idx) => ({
        id: catId,
        label: data.name,
        count: data.count,
        color: CATEGORY_COLORS[idx % CATEGORY_COLORS.length],
        statusFilter: 'All' as const,
        categoryId: catId,
        icon: 'category',
      }));
    }
  }, [chartMode, items, metrics, categories]);

  const sliceTotal = useMemo(() => {
    return segments.reduce((sum, s) => sum + s.count, 0) || 1;
  }, [segments]);

  const displayTotal = useMemo(() => {
    return metrics.totalProducts || sliceTotal;
  }, [metrics.totalProducts, sliceTotal]);

  const formattedSegments = useMemo(() => {
    return segments.map((seg) => ({
      ...seg,
      pct: ((seg.count / Math.max(1, sliceTotal)) * 100).toFixed(1),
    }));
  }, [segments, sliceTotal]);

  // Clean Mobile Donut Slices (CX=140, CY=140, R_OUTER=105, R_INNER=56)
  const mobilePieSlices = useMemo(() => {
    const CX = 140;
    const CY = 140;
    const R_OUTER = 105;
    const R_INNER = 56;

    let startAngle = -Math.PI / 2;
    const validSegs = formattedSegments.filter((s) => s.count > 0);

    if (validSegs.length === 0) {
      const path1 =
        `M ${CX} ${CY - R_OUTER} ` +
        `A ${R_OUTER} ${R_OUTER} 0 0 1 ${CX} ${CY + R_OUTER} ` +
        `L ${CX} ${CY + R_INNER} ` +
        `A ${R_INNER} ${R_INNER} 0 0 0 ${CX} ${CY - R_INNER} Z`;
      const path2 =
        `M ${CX} ${CY + R_OUTER} ` +
        `A ${R_OUTER} ${R_OUTER} 0 0 1 ${CX} ${CY - R_OUTER} ` +
        `L ${CX} ${CY - R_INNER} ` +
        `A ${R_INNER} ${R_INNER} 0 0 0 ${CX} ${CY + R_INNER} Z`;
      return [
        { id: 'empty1', label: 'No Stock Items', count: 0, color: '#CBD5E1', statusFilter: 'All' as const, categoryId: 'All', icon: 'help-outline', path: path1, pct: '0' },
        { id: 'empty2', label: 'No Stock Items', count: 0, color: '#CBD5E1', statusFilter: 'All' as const, categoryId: 'All', icon: 'help-outline', path: path2, pct: '0' },
      ];
    }

    const resultSlices: Array<typeof validSegs[0] & { path: string }> = [];

    validSegs.forEach((seg) => {
      const frac = seg.count / Math.max(1, sliceTotal);
      const sweep = frac * 2 * Math.PI;

      if (sweep >= 2 * Math.PI - 0.01) {
        const midAngle = startAngle + Math.PI;

        const p1_out = { x: CX + R_OUTER * Math.cos(startAngle), y: CY + R_OUTER * Math.sin(startAngle) };
        const p2_out = { x: CX + R_OUTER * Math.cos(midAngle), y: CY + R_OUTER * Math.sin(midAngle) };
        const p1_in = { x: CX + R_INNER * Math.cos(startAngle), y: CY + R_INNER * Math.sin(startAngle) };
        const p2_in = { x: CX + R_INNER * Math.cos(midAngle), y: CY + R_INNER * Math.sin(midAngle) };

        const path1 =
          `M ${p1_out.x.toFixed(2)} ${p1_out.y.toFixed(2)} ` +
          `A ${R_OUTER} ${R_OUTER} 0 0 1 ${p2_out.x.toFixed(2)} ${p2_out.y.toFixed(2)} ` +
          `L ${p2_in.x.toFixed(2)} ${p2_in.y.toFixed(2)} ` +
          `A ${R_INNER} ${R_INNER} 0 0 0 ${p1_in.x.toFixed(2)} ${p1_in.y.toFixed(2)} Z`;

        const path2 =
          `M ${p2_out.x.toFixed(2)} ${p2_out.y.toFixed(2)} ` +
          `A ${R_OUTER} ${R_OUTER} 0 0 1 ${p1_out.x.toFixed(2)} ${p1_out.y.toFixed(2)} ` +
          `L ${p1_in.x.toFixed(2)} ${p1_in.y.toFixed(2)} ` +
          `A ${R_INNER} ${R_INNER} 0 0 0 ${p2_in.x.toFixed(2)} ${p2_in.y.toFixed(2)} Z`;

        resultSlices.push({ ...seg, path: path1 });
        resultSlices.push({ ...seg, id: `${seg.id}_h2`, path: path2 });
      } else {
        const endAngle = startAngle + sweep;
        const x1 = CX + R_OUTER * Math.cos(startAngle);
        const y1 = CY + R_OUTER * Math.sin(startAngle);
        const x2 = CX + R_OUTER * Math.cos(endAngle);
        const y2 = CY + R_OUTER * Math.sin(endAngle);

        const ix1 = CX + R_INNER * Math.cos(endAngle);
        const iy1 = CY + R_INNER * Math.sin(endAngle);
        const ix2 = CX + R_INNER * Math.cos(startAngle);
        const iy2 = CY + R_INNER * Math.sin(startAngle);

        const largeArc = sweep > Math.PI ? 1 : 0;

        const path =
          `M ${x1.toFixed(2)} ${y1.toFixed(2)} ` +
          `A ${R_OUTER} ${R_OUTER} 0 ${largeArc} 1 ${x2.toFixed(2)} ${y2.toFixed(2)} ` +
          `L ${ix1.toFixed(2)} ${iy1.toFixed(2)} ` +
          `A ${R_INNER} ${R_INNER} 0 ${largeArc} 0 ${ix2.toFixed(2)} ${iy2.toFixed(2)} Z`;

        resultSlices.push({ ...seg, path });
        startAngle = endAngle;
      }
    });

    return resultSlices;
  }, [formattedSegments, sliceTotal]);

  const activeSegmentItem = useMemo(() => {
    if (hoveredSegment) {
      return formattedSegments.find((s) => s.id === hoveredSegment);
    }
    return null;
  }, [hoveredSegment, formattedSegments]);

  // Generate Mobile Donut SVG HTML for UniversalSvgChart
  const mobileSvgHtml = useMemo(() => {
    return `
      <svg width="280" height="280" viewBox="0 0 280 280">
        <g>
          ${mobilePieSlices.map((slice) => `<path d="${slice.path}" fill="${slice.color}" stroke="#FFFFFF" stroke-width="2.5" opacity="0.95" />`).join('')}
        </g>
      </svg>
    `;
  }, [mobilePieSlices]);

  return (
    <View style={styles.card}>
      {/* Header with Mode Toggle Tabs + Pie/Bar Toggle */}
      <View style={styles.headerRow}>
        <View style={styles.titleGroup}>
          <MaterialIcons name="inventory" size={20} color={Colors.primary} />
          <Text style={styles.cardTitle}>Inventory Analytics</Text>
        </View>

        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
          <View style={styles.viewToggleGroup}>
            <TouchableOpacity
              style={[styles.viewToggleBtn, viewType === 'pie' && styles.viewToggleBtnActive]}
              onPress={() => setViewType('pie')}
              activeOpacity={0.8}
            >
              <MaterialIcons name="pie-chart" size={15} color={viewType === 'pie' ? '#fff' : Colors.onSurfaceVariant} />
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.viewToggleBtn, viewType === 'bar' && styles.viewToggleBtnActive]}
              onPress={() => setViewType('bar')}
              activeOpacity={0.8}
            >
              <MaterialIcons name="bar-chart" size={15} color={viewType === 'bar' ? '#fff' : Colors.onSurfaceVariant} />
            </TouchableOpacity>
          </View>

          <View style={styles.modeTabs}>
            <TouchableOpacity
              style={[styles.modeTabBtn, chartMode === 'status' && styles.modeTabBtnActive]}
              onPress={() => setChartMode('status')}
              activeOpacity={0.8}
            >
              <Text style={[styles.modeTabText, chartMode === 'status' && styles.modeTabTextActive]}>By Stock</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.modeTabBtn, chartMode === 'category' && styles.modeTabBtnActive]}
              onPress={() => setChartMode('category')}
              activeOpacity={0.8}
            >
              <Text style={[styles.modeTabText, chartMode === 'category' && styles.modeTabTextActive]}>By Category</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>

      {/* Side-by-side Chart & Legend Wrapper */}
      <View style={styles.chartAndLegendWrapper}>
        {/* Chart Area: Pie or Bar */}
        {viewType === 'pie' ? (
          <View style={styles.chartContainer}>
            <View style={{ width: 280, height: 280, position: 'relative', alignItems: 'center', justifyContent: 'center' }}>
              {isWeb ? (
                <svg width="280" height="280" viewBox="0 0 280 280" style={{ overflow: 'visible' }}>
                  <g>
                    {mobilePieSlices.map((slice) => (
                      <path
                        key={`inv_web_path_${slice.id}`}
                        d={slice.path}
                        fill={slice.color}
                        stroke="#FFFFFF"
                        strokeWidth="2.5"
                        opacity="0.95"
                        style={{ cursor: 'pointer' }}
                        onClick={() => {
                          if (chartMode === 'status') {
                            onSelectStatusFilter(slice.statusFilter);
                          } else {
                            onSelectCategory(slice.categoryId);
                          }
                        }}
                      />
                    ))}
                  </g>
                </svg>
              ) : (
                <UniversalSvgChart height={280} svgHtml={mobileSvgHtml} />
              )}
              {/* Donut Hole Center Summary Content */}
              <View style={styles.donutCenter}>
                <Text style={styles.donutCenterValue}>{activeSegmentItem ? activeSegmentItem.count : displayTotal}</Text>
                <Text style={styles.donutCenterLabel}>{activeSegmentItem ? activeSegmentItem.label : chartMode === 'status' ? 'Total Products' : 'Items'}</Text>
                {activeSegmentItem && (<Text style={styles.donutCenterPct}>{activeSegmentItem.pct}%</Text>)}
              </View>
            </View>
          </View>
        ) : (
          /* BAR CHART */
          <View style={styles.barChartContainer}>
            {formattedSegments.map((seg) => {
              const maxCount = Math.max(...formattedSegments.map((s) => s.count), 1);
              const barPct = (seg.count / maxCount) * 100;
              const isHovered = hoveredSegment === seg.id;
              return (
                <TouchableOpacity
                  key={seg.id}
                  activeOpacity={0.85}
                  onPress={() => { if (chartMode === 'status') { onSelectStatusFilter(seg.statusFilter); } else { onSelectCategory(seg.categoryId); } }}
                  style={styles.barRow}
                  {...(isWeb
                    ? {
                        onMouseEnter: () => setHoveredSegment(seg.id),
                        onMouseLeave: () => setHoveredSegment(null),
                      }
                    : {} ) as any}
                >
                  <Text style={styles.barLabel} numberOfLines={1}>{seg.label}</Text>
                  <View style={styles.barTrack}>
                    <View style={[styles.barFill, { width: `${Math.max(barPct, 4)}%` as any, backgroundColor: seg.color, opacity: isHovered ? 1 : 0.85 }]} />
                  </View>
                  <Text style={[styles.barCount, { color: seg.color }]}>{seg.count}</Text>
                </TouchableOpacity>
              );
            })}
          </View>
        )}

        {/* Interactive Legend Side List */}
        <View style={styles.legendContainer}>
          {formattedSegments.map((seg) => {
            const isSelected =
              chartMode === 'status'
                ? activeStatusFilter === seg.statusFilter
                : selectedCategory === seg.categoryId;
            const isHovered = hoveredSegment === seg.id;

            return (
              <TouchableOpacity
                key={seg.id}
                style={[
                  styles.legendCard,
                  { borderLeftColor: seg.color, borderLeftWidth: 4 },
                  (isSelected || isHovered) && styles.legendCardActive,
                ]}
                onPress={() => {
                  if (chartMode === 'status') {
                    onSelectStatusFilter(seg.statusFilter);
                  } else {
                    onSelectCategory(seg.categoryId);
                  }
                }}
                {...({
                  onMouseEnter: () => setHoveredSegment(seg.id),
                  onMouseLeave: () => setHoveredSegment(null),
                } as any)}
                activeOpacity={0.8}
              >
                <View style={[styles.colorBadgeCircle, { backgroundColor: seg.color }]}>
                  <MaterialIcons name={seg.icon as any} size={12} color="#FFF" />
                </View>

                <View style={styles.legendTextWrapper}>
                  <Text style={styles.legendTitle} numberOfLines={1}>
                    {seg.label}
                  </Text>
                  <Text style={styles.legendSubtitle}>
                    {seg.count} items ({seg.pct}%)
                  </Text>
                </View>

                <MaterialIcons
                  name="chevron-right"
                  size={16}
                  color={isSelected ? Colors.primary : Colors.outline}
                />
              </TouchableOpacity>
            );
          })}
        </View>
      </View>

      {/* Quick Summary Pill Footer */}
      <TouchableOpacity
        style={styles.allInventoryFooterBtn}
        onPress={() => {
          if (onToggleExpandList) {
            onToggleExpandList();
          } else {
            onSelectStatusFilter('All');
            onSelectCategory('All');
          }
        }}
        activeOpacity={0.8}
      >
        <Text style={styles.allInventoryFooterText}>
          {isListExpanded ? 'Hide Inventory Table' : `Show All Inventory (${displayTotal})`}
        </Text>
        <MaterialIcons
          name={isListExpanded ? 'keyboard-arrow-up' : 'keyboard-arrow-down'}
          size={18}
          color={Colors.primary}
        />
      </TouchableOpacity>
    </View>
  );
};

const styles = StyleSheet.create({
  allInventoryFooterBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 10,
    marginTop: 12,
    backgroundColor: Colors.primaryContainer + '33',
    borderRadius: BorderRadius.md,
    borderWidth: 1,
    borderColor: Colors.primaryContainer,
  },
  allInventoryFooterText: {
    ...Typography.labelLg,
    fontSize: 13,
    fontFamily: 'Inter-Bold',
    color: Colors.primary,
  },
  card: {
    backgroundColor: Colors.surfaceContainerLowest,
    borderRadius: BorderRadius.xl,
    padding: Spacing.md,
    borderWidth: 1,
    borderColor: Colors.surfaceContainerHigh,
    shadowColor: Colors.shadowColor,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 6,
    elevation: 2,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    flexWrap: 'wrap',
    gap: 6,
    marginBottom: Spacing.sm,
  },
  titleGroup: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.xs,
    flexShrink: 1,
  },
  cardTitle: {
    ...Typography.titleLg,
    fontSize: 14,
    fontFamily: 'Inter-Bold',
    color: Colors.onSurface,
  },
  viewToggleGroup: {
    flexDirection: 'row',
    backgroundColor: Colors.surfaceContainerLow,
    borderRadius: BorderRadius.full,
    padding: 2,
    borderWidth: 1,
    borderColor: Colors.surfaceContainerHigh,
  },
  viewToggleBtn: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: BorderRadius.full,
  },
  viewToggleBtnActive: {
    backgroundColor: Colors.primary,
  },
  modeTabs: {
    flexDirection: 'row',
    backgroundColor: Colors.surfaceContainerLow,
    borderRadius: BorderRadius.full,
    padding: 2,
    borderWidth: 1,
    borderColor: Colors.surfaceContainerHigh,
  },
  modeTabBtn: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: BorderRadius.full,
  },
  modeTabBtnActive: {
    backgroundColor: Colors.primary,
  },
  modeTabText: {
    ...Typography.labelLg,
    fontSize: 11,
    color: Colors.onSurfaceVariant,
    fontFamily: 'Inter-Medium',
  },
  modeTabTextActive: {
    color: Colors.onPrimary,
    fontFamily: 'Inter-Bold',
  },
  chartAndLegendWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: Spacing.md,
    flexWrap: 'wrap',
    marginTop: Spacing.xs,
  },
  chartContainer: {
    position: 'relative',
    height: 280,
    flex: 1,
    minWidth: 280,
    marginVertical: Spacing.xs,
  },
  donutCenter: {
    position: 'absolute',
    alignItems: 'center',
    justifyContent: 'center',
    width: 108,
    height: 108,
    borderRadius: 54,
    backgroundColor: Colors.surfaceContainerLowest,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
    pointerEvents: 'none',
  },
  donutCenterValue: {
    ...Typography.headlineLg,
    fontSize: 22,
    fontFamily: 'Inter-Bold',
    color: Colors.onSurface,
  },
  donutCenterLabel: {
    ...Typography.labelLg,
    fontSize: 10,
    color: Colors.onSurfaceVariant,
    textAlign: 'center',
  },
  donutCenterPct: {
    ...Typography.labelLg,
    fontSize: 11,
    fontFamily: 'Inter-Bold',
    color: Colors.primary,
    marginTop: 1,
  },
  barChartContainer: {
    flex: 1,
    minWidth: 280,
    gap: 10,
    paddingVertical: Spacing.xs,
  },
  barRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  barLabel: {
    ...Typography.bodyMd,
    fontSize: 11,
    width: 90,
    color: Colors.onSurface,
  },
  barTrack: {
    flex: 1,
    height: 12,
    backgroundColor: Colors.surfaceContainerLow,
    borderRadius: 6,
    overflow: 'hidden',
  },
  barFill: {
    height: '100%',
    borderRadius: 6,
  },
  barCount: {
    ...Typography.labelLg,
    fontSize: 11,
    width: 32,
    textAlign: 'right',
    fontFamily: 'Inter-Bold',
  },
  legendContainer: {
    flex: 1,
    minWidth: 280,
    gap: 8,
    marginTop: Spacing.xs,
  },
  legendCard: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: Spacing.sm,
    paddingVertical: Spacing.xs + 3,
    borderRadius: BorderRadius.md,
    backgroundColor: Colors.surfaceContainerLow,
    borderWidth: 1,
    borderColor: Colors.surfaceContainerHigh,
    borderLeftWidth: 4,
    gap: Spacing.xs,
    elevation: 1,
  },
  legendCardActive: {
    backgroundColor: Colors.primaryContainer,
    borderColor: Colors.primary,
  },
  colorBadgeCircle: {
    width: 24,
    height: 24,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  legendTextWrapper: {
    flex: 1,
  },
  legendTitle: {
    ...Typography.titleLg,
    fontSize: 12,
    fontFamily: 'Inter-Bold',
    color: Colors.onSurface,
  },
  legendSubtitle: {
    ...Typography.bodyMd,
    fontSize: 10,
    color: Colors.onSurfaceVariant,
  },
});

export default InventoryDistributionPieChart;
