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
import { AdminProductItemUI, AdminCategoryItem } from '@/services/adminService';

export interface ProductDistributionPieChartProps {
  products: AdminProductItemUI[];
  categories: AdminCategoryItem[];
  totalProductsCount: number;
  selectedCategory: string;
  onSelectCategory: (categoryId: string) => void;
  onSelectPromoFilter?: (filterName: string) => void;
  isListExpanded?: boolean;
  onToggleExpandList?: () => void;
}

type ChartMode = 'category' | 'promo';

const PALETTE_COLORS = [
  '#0284C7', // Sky Blue
  '#7B1FA2', // Purple
  '#D97706', // Amber
  '#E11D48', // Rose
  '#059669', // Emerald
  '#4F46E5', // Indigo
  '#0891B2', // Cyan
  '#C026D3', // Fuchsia
  '#2563EB', // Blue
  '#16A34A', // Green
];

export const ProductDistributionPieChart: React.FC<ProductDistributionPieChartProps> = ({
  products,
  categories,
  totalProductsCount,
  selectedCategory,
  onSelectCategory,
  onSelectPromoFilter,
  isListExpanded = false,
  onToggleExpandList,
}) => {
  const [chartMode, setChartMode] = useState<ChartMode>('category');
  const [viewType, setViewType] = useState<'pie' | 'bar'>('pie');
  const [hoveredSegment, setHoveredSegment] = useState<string | null>(null);

  // Calculate breakdown segments dynamically
  const segments = useMemo(() => {
    if (chartMode === 'category') {
      const catMap: Record<string, { name: string; count: number }> = {};

      if (categories && categories.length > 0) {
        categories.forEach((c) => {
          catMap[c.id] = { name: c.name, count: 0 };
        });
      }

      if (products && products.length > 0) {
        products.forEach((p) => {
          const cId = p.categoryId || 'uncategorized';
          if (!catMap[cId]) {
            catMap[cId] = { name: p.category || 'General', count: 0 };
          }
          catMap[cId].count += 1;
        });
      }

      const activeEntries = Object.entries(catMap)
        .filter(([_, d]) => d.count > 0)
        .slice(0, 8); // Top 8 active categories

      return activeEntries.map(([cId, d], idx) => ({
        id: cId,
        label: d.name,
        count: d.count,
        color: PALETTE_COLORS[idx % PALETTE_COLORS.length],
        categoryId: cId,
        icon: 'category',
      }));
    } else {
      // By Promo Badges (Flash Sale, Featured, Bestsellers, Regular)
      let flashCount = 0;
      let featuredCount = 0;
      let bestsellerCount = 0;
      let regularCount = 0;

      if (products && products.length > 0) {
        products.forEach((p) => {
          if (p.isFlashSale) flashCount++;
          else if (p.isFeatured) featuredCount++;
          else if (p.isBestseller) bestsellerCount++;
          else regularCount++;
        });
      }

      return [
        {
          id: 'flash',
          label: 'Flash Sale',
          count: flashCount,
          color: '#E11D48', // Rose
          categoryId: 'All',
          icon: 'bolt',
        },
        {
          id: 'featured',
          label: 'Featured',
          count: featuredCount,
          color: '#D97706', // Amber
          categoryId: 'All',
          icon: 'star',
        },
        {
          id: 'bestseller',
          label: 'Bestseller',
          count: bestsellerCount,
          color: '#0284C7', // Sky Blue
          categoryId: 'All',
          icon: 'whatshot',
        },
        {
          id: 'regular',
          label: 'Standard',
          count: regularCount,
          color: '#059669', // Emerald
          categoryId: 'All',
          icon: 'storefront',
        },
      ];
    }
  }, [chartMode, products, categories]);

  const sliceTotal = useMemo(() => {
    return segments.reduce((sum, s) => sum + s.count, 0) || 1;
  }, [segments]);

  const displayTotal = useMemo(() => {
    return totalProductsCount || sliceTotal;
  }, [totalProductsCount, sliceTotal]);

  // Calculate percentages, SVG Slice Paths, and 2-Line Curved Text Paths (<textPath>)
  const { arcs, formattedSegments } = useMemo(() => {
    const cx = 140;
    const cy = 140;
    const R = 125;
    const r = 62;

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

      // Line 1: Category Name (Top Line)
      // Line 2: Count & Percentage (Bottom Line)
      const R_name = isLowerHalf ? 78 : 108;
      const R_pct = isLowerHalf ? 108 : 78;

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

  // Bar Chart positioning calculations
  const barChartData = useMemo(() => {
    const maxVal = Math.max(1, ...formattedSegments.map((s) => s.count));
    const width = 860;
    const height = 250;
    const paddingLeft = 40;
    const paddingRight = 20;
    const paddingTop = 28;
    const paddingBottom = 44;

    const chartW = width - paddingLeft - paddingRight;
    const chartH = height - paddingTop - paddingBottom;

    const count = formattedSegments.length;
    const barGap = 20;
    const totalGap = Math.max(0, count - 1) * barGap;
    const barWidth = Math.max(24, (chartW - totalGap) / Math.max(1, count));

    const bars = formattedSegments.map((seg, idx) => {
      const barH = (seg.count / maxVal) * chartH;
      const x = paddingLeft + idx * (barWidth + barGap);
      const y = paddingTop + (chartH - barH);

      return {
        ...seg,
        x,
        y,
        barWidth,
        barH,
      };
    });

    return { width, height, paddingTop, paddingLeft, chartW, chartH, maxVal, bars };
  }, [formattedSegments]);

  const activeSegmentItem = useMemo(() => {
    if (hoveredSegment) {
      return formattedSegments.find((s) => s.id === hoveredSegment);
    }
    return null;
  }, [hoveredSegment, formattedSegments]);

  return (
    <View style={styles.card}>
      {/* Header with Mode Toggle Tabs */}
      <View style={styles.headerRow}>
        <View style={styles.titleGroup}>
          <MaterialIcons
            name={viewType === 'pie' ? 'pie-chart' : 'bar-chart'}
            size={20}
            color={Colors.primary}
          />
          <Text style={styles.cardTitle} numberOfLines={1}>Catalog Breakdown</Text>
        </View>

        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
          {/* Mode Tabs (By Category / By Promo) */}
          <View style={styles.modeTabs}>
            <TouchableOpacity
              style={[styles.modeTabBtn, chartMode === 'category' && styles.modeTabBtnActive]}
              onPress={() => setChartMode('category')}
              activeOpacity={0.8}
            >
              <Text style={[styles.modeTabText, chartMode === 'category' && styles.modeTabTextActive]}>
                By Category
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.modeTabBtn, chartMode === 'promo' && styles.modeTabBtnActive]}
              onPress={() => setChartMode('promo')}
              activeOpacity={0.8}
            >
              <Text style={[styles.modeTabText, chartMode === 'promo' && styles.modeTabTextActive]}>
                By Promo
              </Text>
            </TouchableOpacity>
          </View>

          {/* View Type Toggle (Pie vs Bar) */}
          <View style={styles.modeTabs}>
            <TouchableOpacity
              style={[styles.modeTabBtn, viewType === 'pie' && styles.modeTabBtnActive]}
              onPress={() => setViewType('pie')}
              activeOpacity={0.8}
            >
              <MaterialIcons name="pie-chart" size={13} color={viewType === 'pie' ? '#FFF' : Colors.onSurfaceVariant} />
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.modeTabBtn, viewType === 'bar' && styles.modeTabBtnActive]}
              onPress={() => setViewType('bar')}
              activeOpacity={0.8}
            >
              <MaterialIcons name="bar-chart" size={13} color={viewType === 'bar' ? '#FFF' : Colors.onSurfaceVariant} />
            </TouchableOpacity>
          </View>
        </View>
      </View>

      {/* Side-by-side Chart & Legend Wrapper */}
      <View style={styles.chartAndLegendWrapper}>
        {/* Main Visual Chart View */}
        {viewType === 'bar' ? (
          <View style={styles.chartContainer}>
            {Platform.OS === 'web' ? (
              <svg width="100%" height="250" viewBox="0 0 860 250" style={{ overflow: 'visible', maxWidth: '100%' }}>
                <defs>
                  {barChartData.bars.map((bar) => (
                    <linearGradient
                      key={`grad_${bar.id}`}
                      id={`barGrad_${bar.id}`}
                      x1="0"
                      y1="0"
                      x2="0"
                      y2="1"
                    >
                      <stop offset="0%" stopColor={bar.color} stopOpacity="1" />
                      <stop offset="100%" stopColor={bar.color} stopOpacity="0.65" />
                    </linearGradient>
                  ))}
                </defs>

                {/* Grid Lines & Y Axis */}
                {[0, 0.5, 1].map((ratio) => {
                  const yLine = barChartData.paddingTop + barChartData.chartH * (1 - ratio);
                  const val = Math.round(barChartData.maxVal * ratio);
                  return (
                    <g key={`grid_${ratio}`}>
                      <line
                        x1={barChartData.paddingLeft}
                        y1={yLine}
                        x2={barChartData.paddingLeft + barChartData.chartW}
                        y2={yLine}
                        stroke="#E2E8F0"
                        strokeDasharray={ratio === 0 ? 'none' : '3 3'}
                        strokeWidth="1"
                      />
                      <text
                        x={barChartData.paddingLeft - 8}
                        y={yLine + 4}
                        textAnchor="end"
                        fontSize="11"
                        fill="#94A3B8"
                        fontFamily="Inter-Medium, sans-serif"
                      >
                        {val}
                      </text>
                    </g>
                  );
                })}

                {/* Bars */}
                {barChartData.bars.map((bar) => {
                  const isHovered = hoveredSegment === bar.id;
                  const isSelected =
                    chartMode === 'category'
                      ? selectedCategory === bar.categoryId
                      : false;

                  return (
                    <g
                      key={`bargroup_${bar.id}`}
                      style={{ cursor: 'pointer' }}
                      onMouseEnter={() => setHoveredSegment(bar.id)}
                      onMouseLeave={() => setHoveredSegment(null)}
                      onClick={() => {
                        if (chartMode === 'category') {
                          onSelectCategory(bar.categoryId);
                        } else if (onSelectPromoFilter) {
                          onSelectPromoFilter(bar.label);
                        }
                      }}
                    >
                      {/* Bar Rect */}
                      <rect
                        x={bar.x}
                        y={bar.y}
                        width={bar.barWidth}
                        height={Math.max(4, bar.barH)}
                        rx="6"
                        ry="6"
                        fill={`url(#barGrad_${bar.id})`}
                        opacity={isHovered || isSelected ? 1 : 0.88}
                        style={{
                          transition: 'all 0.2s ease-in-out',
                          transform: isHovered || isSelected ? 'scaleY(1.02)' : 'scaleY(1)',
                          transformOrigin: `${bar.x + bar.barWidth / 2}px ${barChartData.paddingTop + barChartData.chartH}px`,
                          filter: isHovered ? 'drop-shadow(0px 4px 8px rgba(0,0,0,0.2))' : 'none',
                        }}
                      />

                      {/* Top Count Text */}
                      <text
                        x={bar.x + bar.barWidth / 2}
                        y={Math.max(16, bar.y - 6)}
                        textAnchor="middle"
                        fontSize="11"
                        fontWeight="bold"
                        fill={isHovered ? Colors.primary : '#475569'}
                        fontFamily="Inter-Bold, sans-serif"
                      >
                        {bar.count}
                      </text>

                      {/* X-axis Label */}
                      <text
                        x={bar.x + bar.barWidth / 2}
                        y={barChartData.paddingTop + barChartData.chartH + 18}
                        textAnchor="middle"
                        fontSize="12"
                        fontWeight="bold"
                        fill={isHovered ? Colors.primary : '#475569'}
                        fontFamily="Inter-Bold, sans-serif"
                      >
                        {bar.label}
                      </text>
                    </g>
                  );
                })}
              </svg>
            ) : (
              <View style={styles.nativeFallbackDonut} />
            )}
          </View>
        ) : (
          /* Center Donut SVG Pie Chart */
          <View style={styles.chartContainer}>
            {Platform.OS === 'web' ? (
              <svg width="280" height="280" viewBox="0 0 280 280" style={{ overflow: 'visible' }}>
                <defs>
                  {arcs.map((arc, index) => (
                    <React.Fragment key={`def_prod_frag_${arc.id}_${index}`}>
                      <path id={`prodTextPath_Name_${arc.id}_${index}`} d={arc.textArcD_Name} />
                      <path id={`prodTextPath_Pct_${arc.id}_${index}`} d={arc.textArcD_Pct} />
                    </React.Fragment>
                  ))}
                </defs>

                {/* Render Donut Slices */}
                {arcs.map((arc) => {
                  const isHovered = hoveredSegment === arc.id;
                  const isSelected =
                    chartMode === 'category'
                      ? selectedCategory === arc.categoryId
                      : false;

                  return (
                    <path
                      key={`path_${arc.id}`}
                      d={arc.pathD}
                      fill={arc.color}
                      opacity={isHovered || isSelected ? 1 : 0.88}
                      style={{
                        cursor: 'pointer',
                        transition: 'all 0.2s ease-in-out',
                        transform: isHovered || isSelected ? 'scale(1.03)' : 'scale(1)',
                        transformOrigin: '140px 140px',
                        filter: isHovered ? 'drop-shadow(0px 4px 8px rgba(0,0,0,0.25))' : 'none',
                      }}
                      onMouseEnter={() => setHoveredSegment(arc.id)}
                      onMouseLeave={() => setHoveredSegment(null)}
                      onClick={() => {
                        if (chartMode === 'category') {
                          onSelectCategory(arc.categoryId);
                        } else if (onSelectPromoFilter) {
                          onSelectPromoFilter(arc.label);
                        }
                      }}
                    />
                  );
                })}

                {/* Render 2-Line Curved Text Labels inside slices using SVG <textPath> */}
                {arcs.map((arc, index) => {
                  if (arc.angleDeg < 14) return null; // Don't render text inside tiny slices to avoid overflow

                  return (
                    <g key={`prod_text_group_${arc.id}_${index}`}>
                      {/* Line 1: Category Name */}
                      <text
                        style={{
                          fontSize: arc.angleDeg < 25 ? '10px' : '11px',
                          fontWeight: 'bold',
                          fill: '#FFFFFF',
                          pointerEvents: 'none',
                          letterSpacing: '0.4px',
                        }}
                      >
                        <textPath
                          href={`#prodTextPath_Name_${arc.id}_${index}`}
                          startOffset="50%"
                          textAnchor="middle"
                        >
                          {arc.label}
                        </textPath>
                      </text>

                      {/* Line 2: Count & Percentage */}
                      <text
                        style={{
                          fontSize: arc.angleDeg < 25 ? '9px' : '10px',
                          fontWeight: '600',
                          fill: 'rgba(255, 255, 255, 0.95)',
                          pointerEvents: 'none',
                          letterSpacing: '0.2px',
                        }}
                      >
                        <textPath
                          href={`#prodTextPath_Pct_${arc.id}_${index}`}
                          startOffset="50%"
                          textAnchor="middle"
                        >
                          {`${arc.count} (${arc.pct}%)`}
                        </textPath>
                      </text>
                    </g>
                  );
                })}
              </svg>
            ) : (
              /* Fallback for non-web native views */
              <View style={styles.nativeFallbackDonut}>
                {arcs.map((arc) => (
                  <View
                    key={arc.id}
                    style={[
                      styles.nativeSegmentLine,
                      { backgroundColor: arc.color, height: (arc.count / Math.max(1, sliceTotal)) * 140 },
                    ]}
                  />
                ))}
              </View>
            )}

            {/* Donut Hole Center Summary Content */}
            <View style={styles.donutCenter}>
              <Text style={styles.donutCenterValue}>
                {activeSegmentItem ? activeSegmentItem.count : displayTotal}
              </Text>
              <Text style={styles.donutCenterLabel}>
                {activeSegmentItem ? activeSegmentItem.label : 'Products'}
              </Text>
              {activeSegmentItem && (
                <Text style={styles.donutCenterPct}>{activeSegmentItem.pct}%</Text>
              )}
            </View>
          </View>
        )}

        {/* Interactive Legend Side List */}
        <View style={styles.legendContainer}>
          {formattedSegments.map((seg) => {
            const isSelected =
              chartMode === 'category'
                ? selectedCategory === seg.categoryId
                : false;
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
                  if (chartMode === 'category') {
                    onSelectCategory(seg.categoryId);
                  } else if (onSelectPromoFilter) {
                    onSelectPromoFilter(seg.label);
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
        style={styles.allProductsFooterBtn}
        onPress={() => {
          if (onToggleExpandList) {
            onToggleExpandList();
          } else {
            onSelectCategory('All');
          }
        }}
        activeOpacity={0.8}
      >
        <Text style={styles.allProductsFooterText}>
          {isListExpanded
            ? 'Hide Products'
            : `Show All Products (${displayTotal})`}
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
  allProductsFooterBtn: {
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
  allProductsFooterText: {
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
    alignItems: 'center',
    justifyContent: 'center',
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
    fontSize: 24,
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

export default ProductDistributionPieChart;
