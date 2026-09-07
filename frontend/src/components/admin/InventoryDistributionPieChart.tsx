import React, { useState, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Platform,
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

  // Calculate percentages, SVG Slice Paths, and Curved Text Paths (<textPath>)
  const { arcs, formattedSegments } = useMemo(() => {
    const cx = 120;
    const cy = 120;
    const R = 104;
    const r = 52;
    const R_text = 77; // Midpoint radius for curved text path

    let accumulatedDeg = -90; // Start at top center (-90deg)

    const formatted = segments.map((seg) => {
      const pctVal = (seg.count / Math.max(1, sliceTotal)) * 100;
      return {
        ...seg,
        pct: pctVal.toFixed(1),
      };
    });

    const validSegs = formatted.filter((s) => s.count > 0);

    const arcItems = validSegs.map((seg) => {
      const fraction = seg.count / Math.max(1, sliceTotal);
      const angleDeg = fraction * 360;

      const startDeg = accumulatedDeg;
      const endDeg = accumulatedDeg + angleDeg;
      accumulatedDeg = endDeg;

      const midDeg = startDeg + angleDeg / 2;

      // Outer donut slice path
      let pathD = '';
      if (angleDeg >= 359.9) {
        pathD = `
          M ${cx} ${cy - R}
          A ${R} ${R} 0 1 1 ${cx} ${cy + R}
          A ${R} ${R} 0 1 1 ${cx} ${cy - R}
          M ${cx} ${cy - r}
          A ${r} ${r} 0 1 0 ${cx} ${cy + r}
          A ${r} ${r} 0 1 0 ${cx} ${cy - r}
          Z
        `;
      } else {
        const startRad = (startDeg * Math.PI) / 180;
        const endRad = (endDeg * Math.PI) / 180;

        const x1 = cx + R * Math.cos(startRad);
        const y1 = cy + R * Math.sin(startRad);
        const x2 = cx + R * Math.cos(endRad);
        const y2 = cy + R * Math.sin(endRad);

        const x3 = cx + r * Math.cos(endRad);
        const y3 = cy + r * Math.sin(endRad);
        const x4 = cx + r * Math.cos(startRad);
        const y4 = cy + r * Math.sin(startRad);

        const largeArc = angleDeg > 180 ? 1 : 0;

        pathD = `M ${x1.toFixed(2)} ${y1.toFixed(2)} A ${R} ${R} 0 ${largeArc} 1 ${x2.toFixed(2)} ${y2.toFixed(2)} L ${x3.toFixed(2)} ${y3.toFixed(2)} A ${r} ${r} 0 ${largeArc} 0 ${x4.toFixed(2)} ${y4.toFixed(2)} Z`;
      }

      // Calculate 2 Concentric Curved Text Paths along arc (textPath)
      const normMid = ((midDeg % 360) + 360) % 360;
      // If segment is in lower half (between 20deg and 160deg), invert arc direction so text is right-side up
      const isLowerHalf = normMid > 20 && normMid < 160;

      const pStartRad = (isLowerHalf ? endDeg : startDeg) * (Math.PI / 180);
      const pEndRad = (isLowerHalf ? startDeg : endDeg) * (Math.PI / 180);
      const sweepFlag = isLowerHalf ? 0 : 1;
      const largeArcText = angleDeg > 180 ? 1 : 0;

      // Line 1: Category / Label Name (Top Line)
      // Line 2: Count & Percentage (Bottom Line)
      const R_name = isLowerHalf ? 67 : 85;
      const R_pct = isLowerHalf ? 85 : 67;

      const tx1_n = cx + R_name * Math.cos(pStartRad);
      const ty1_n = cy + R_name * Math.sin(pStartRad);
      const tx2_n = cx + R_name * Math.cos(pEndRad);
      const ty2_n = cy + R_name * Math.sin(pEndRad);
      const textArcD_Name = `M ${tx1_n.toFixed(2)} ${ty1_n.toFixed(2)} A ${R_name} ${R_name} 0 ${largeArcText} ${sweepFlag} ${tx2_n.toFixed(2)} ${ty2_n.toFixed(2)}`;

      const tx1_p = cx + R_pct * Math.cos(pStartRad);
      const ty1_p = cy + R_pct * Math.sin(pStartRad);
      const tx2_p = cx + R_pct * Math.cos(pEndRad);
      const ty2_p = cy + R_pct * Math.sin(pEndRad);
      const textArcD_Pct = `M ${tx1_p.toFixed(2)} ${ty1_p.toFixed(2)} A ${R_pct} ${R_pct} 0 ${largeArcText} ${sweepFlag} ${tx2_p.toFixed(2)} ${ty2_p.toFixed(2)}`;

      return {
        ...seg,
        pathD,
        textArcD_Name,
        textArcD_Pct,
        angleDeg,
      };
    });

    return {
      arcs: arcItems,
      formattedSegments: formatted,
    };
  }, [segments, sliceTotal]);

  const activeSegmentItem = useMemo(() => {
    if (hoveredSegment) {
      return formattedSegments.find((s) => s.id === hoveredSegment);
    }
    return null;
  }, [hoveredSegment, formattedSegments]);

  return (
    <View style={styles.card}>
      {/* Header with Mode Toggle Tabs + Pie/Bar toggle */}
      <View style={styles.headerRow}>
        <View style={styles.titleGroup}>
          <MaterialIcons name="inventory" size={20} color={Colors.primary} />
          <Text style={styles.cardTitle} numberOfLines={1}>Inventory Breakdown</Text>
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

      {/* Chart Area: Pie or Bar */}
      {viewType === 'pie' ? (
        <View style={styles.chartContainer}>
          {isWeb ? (
            <svg width="240" height="240" viewBox="0 0 240 240" style={{ overflow: 'visible' }}>
              <defs>
                {arcs.map((arc, index) => (
                  <React.Fragment key={`def_frag_${arc.id}_${index}`}>
                    <path id={`invTextPath_Name_${arc.id}_${index}`} d={arc.textArcD_Name} />
                    <path id={`invTextPath_Pct_${arc.id}_${index}`} d={arc.textArcD_Pct} />
                  </React.Fragment>
                ))}
              </defs>
              {arcs.map((arc) => {
                const isHovered = hoveredSegment === arc.id;
                const isSelected = chartMode === 'status' ? activeStatusFilter === arc.statusFilter : selectedCategory === arc.categoryId;
                return (
                  <path
                    key={`path_${arc.id}`}
                    d={arc.pathD}
                    fill={arc.color}
                    opacity={isHovered || isSelected ? 1 : 0.88}
                    style={{ cursor: 'pointer', transition: 'all 0.2s ease-in-out', transform: isHovered || isSelected ? 'scale(1.03)' : 'scale(1)', transformOrigin: '120px 120px', filter: isHovered ? 'drop-shadow(0px 4px 8px rgba(0,0,0,0.25))' : 'none' }}
                    onMouseEnter={() => setHoveredSegment(arc.id)}
                    onMouseLeave={() => setHoveredSegment(null)}
                    onClick={() => { if (chartMode === 'status') { onSelectStatusFilter(arc.statusFilter); } else { onSelectCategory(arc.categoryId); } }}
                  />
                );
              })}
              {arcs.map((arc, index) => {
                if (arc.angleDeg < 14) return null;
                return (
                  <g key={`text_group_${arc.id}_${index}`}>
                    <text style={{ fontSize: arc.angleDeg < 25 ? '10px' : '11px', fontWeight: 'bold', fill: '#FFFFFF', pointerEvents: 'none', letterSpacing: '0.4px' }}>
                      <textPath href={`#invTextPath_Name_${arc.id}_${index}`} startOffset="50%" textAnchor="middle">{arc.label}</textPath>
                    </text>
                    <text style={{ fontSize: arc.angleDeg < 25 ? '9px' : '10px', fontWeight: '600', fill: 'rgba(255, 255, 255, 0.95)', pointerEvents: 'none', letterSpacing: '0.2px' }}>
                      <textPath href={`#invTextPath_Pct_${arc.id}_${index}`} startOffset="50%" textAnchor="middle">{`${arc.count} (${arc.pct}%)`}</textPath>
                    </text>
                  </g>
                );
              })}
            </svg>
          ) : (
            <View style={styles.nativeFallbackDonut}>
              {arcs.map((arc) => (
                <View key={arc.id} style={[styles.nativeSegmentLine, { backgroundColor: arc.color, height: (arc.count / Math.max(1, sliceTotal)) * 140 }]} />
              ))}
            </View>
          )}
          {/* Donut Hole Center Summary Content */}
          <View style={styles.donutCenter}>
            <Text style={styles.donutCenterValue}>{activeSegmentItem ? activeSegmentItem.count : displayTotal}</Text>
            <Text style={styles.donutCenterLabel}>{activeSegmentItem ? activeSegmentItem.label : chartMode === 'status' ? 'Total Products' : 'Items'}</Text>
            {activeSegmentItem && (<Text style={styles.donutCenterPct}>{activeSegmentItem.pct}%</Text>)}
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

      {/* Interactive Legend List */}
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
                  {seg.count} products ({seg.pct}%)
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

      {/* Quick Summary Pill Footer */}
      <TouchableOpacity
        style={styles.allInventoryFooterBtn}
        onPress={() => {
          if (onToggleExpandList) {
            onToggleExpandList();
          } else {
            onSelectStatusFilter('All');
          }
        }}
        activeOpacity={0.8}
      >
        <Text style={styles.allInventoryFooterText}>
          {isListExpanded
            ? 'Hide Inventory'
            : `Show All Inventory (${displayTotal})`}
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
  viewToggleGroup: {
    flexDirection: 'row',
    borderRadius: BorderRadius.md,
    borderWidth: 1,
    borderColor: Colors.surfaceContainerHigh,
    overflow: 'hidden',
  },
  viewToggleBtn: {
    padding: 6,
    backgroundColor: Colors.surfaceContainerLow,
  },
  viewToggleBtnActive: { backgroundColor: Colors.primary },
  barChartContainer: {
    width: '100%',
    paddingHorizontal: Spacing.xs,
    gap: 10,
    marginVertical: Spacing.sm,
  },
  barRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  barLabel: {
    ...Typography.labelLg,
    fontSize: 11,
    color: Colors.onSurfaceVariant,
    width: 90,
    textAlign: 'right',
    fontFamily: 'Inter-Medium',
  },
  barTrack: {
    flex: 1,
    height: 22,
    borderRadius: BorderRadius.md,
    backgroundColor: Colors.surfaceContainerLow,
    overflow: 'hidden',
  },
  barFill: {
    height: '100%',
    borderRadius: BorderRadius.md,
  },
  barCount: {
    ...Typography.labelLg,
    fontSize: 12,
    fontFamily: 'Inter-Bold',
    width: 28,
    textAlign: 'left',
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
  modeTabs: {
    flexDirection: 'row',
    backgroundColor: Colors.surfaceContainerLow,
    borderRadius: BorderRadius.full,
    padding: 2,
    borderWidth: 1,
    borderColor: Colors.surfaceContainerHigh,
    flexShrink: 0,
  },
  modeTabBtn: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: BorderRadius.full,
  },
  modeTabBtnActive: {
    backgroundColor: Colors.primary,
  },
  modeTabText: {
    ...Typography.labelLg,
    fontSize: 10,
    color: Colors.onSurfaceVariant,
    fontFamily: 'Inter-Medium',
  },
  modeTabTextActive: {
    color: Colors.onPrimary,
    fontFamily: 'Inter-Bold',
  },
  chartContainer: {
    position: 'relative',
    alignItems: 'center',
    justifyContent: 'center',
    height: 240,
    marginVertical: Spacing.xs,
  },
  donutCenter: {
    position: 'absolute',
    alignItems: 'center',
    justifyContent: 'center',
    width: 90,
    height: 90,
    borderRadius: 45,
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
    fontSize: 9,
    color: Colors.onSurfaceVariant,
    textAlign: 'center',
  },
  donutCenterPct: {
    ...Typography.labelLg,
    fontSize: 10,
    fontFamily: 'Inter-Bold',
    color: Colors.primary,
    marginTop: 1,
  },
  nativeFallbackDonut: {
    width: 200,
    height: 200,
    borderRadius: 100,
    backgroundColor: Colors.surfaceContainerLow,
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
  },
  nativeSegmentLine: {
    width: 12,
    marginHorizontal: 2,
    borderRadius: 6,
  },
  legendContainer: {
    gap: 6,
    marginTop: Spacing.xs,
  },
  legendCard: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: Spacing.xs + 2,
    borderRadius: BorderRadius.lg,
    backgroundColor: Colors.surfaceContainerLow,
    borderWidth: 1,
    borderColor: Colors.surfaceContainerHigh,
    gap: Spacing.xs,
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
