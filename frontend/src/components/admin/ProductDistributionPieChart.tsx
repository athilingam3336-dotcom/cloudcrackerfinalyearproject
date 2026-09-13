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
import { AdminProductItemUI, AdminCategoryItem } from '@/services/adminService';
import { UniversalSvgChart } from '@/components/common/UniversalSvgChart';

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
  const [zoomScale, setZoomScale] = useState(1);

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
        { id: 'empty1', label: 'No Products', count: 0, color: '#CBD5E1', categoryId: 'All', icon: 'help-outline', path: path1, pct: '0' },
        { id: 'empty2', label: 'No Products', count: 0, color: '#CBD5E1', categoryId: 'All', icon: 'help-outline', path: path2, pct: '0' },
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

  // Generate Bar SVG HTML for UniversalSvgChart
  const barSvgHtml = useMemo(() => {
    return `
      <svg width="860" height="250" viewBox="0 0 860 250" style="display:block;">
        <defs>
          ${barChartData.bars.map((bar) => `
            <linearGradient id="barGrad_${bar.id}" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stop-color="${bar.color}" stop-opacity="1" />
              <stop offset="100%" stop-color="${bar.color}" stop-opacity="0.65" />
            </linearGradient>
          `).join('')}
        </defs>
        ${[0, 0.5, 1].map((ratio) => {
          const yLine = barChartData.paddingTop + barChartData.chartH * (1 - ratio);
          const val = Math.round(barChartData.maxVal * ratio);
          return `
            <g>
              <line x1="${barChartData.paddingLeft}" y1="${yLine}" x2="${barChartData.paddingLeft + barChartData.chartW}" y2="${yLine}" stroke="#E2E8F0" stroke-dasharray="${ratio === 0 ? 'none' : '3 3'}" stroke-width="1" />
              <text x="${barChartData.paddingLeft - 8}" y="${yLine + 4}" text-anchor="end" font-size="11" fill="#94A3B8" font-family="sans-serif">${val}</text>
            </g>
          `;
        }).join('')}
        ${barChartData.bars.map((bar) => `
          <g>
            <rect x="${bar.x}" y="${bar.y}" width="${bar.barWidth}" height="${Math.max(4, bar.barH)}" rx="6" ry="6" fill="url(#barGrad_${bar.id})" opacity="0.9" />
            <text x="${bar.x + bar.barWidth / 2}" y="${Math.max(16, bar.y - 6)}" text-anchor="middle" font-size="11" font-weight="bold" fill="#475569" font-family="sans-serif">${bar.count}</text>
            <text x="${bar.x + bar.barWidth / 2}" y="${barChartData.paddingTop + barChartData.chartH + 18}" text-anchor="middle" font-size="12" font-weight="bold" fill="#475569" font-family="sans-serif">${bar.label}</text>
          </g>
        `).join('')}
      </svg>
    `;
  }, [barChartData]);

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

          {/* View Type Toggle */}
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
          <ScrollView 
            horizontal 
            showsHorizontalScrollIndicator={true}
            style={styles.chartContainer}
            contentContainerStyle={{ alignItems: 'center', justifyContent: 'center', minWidth: '100%' }}
          >
            {Platform.OS === 'web' ? (
              <svg width={860 * zoomScale} height={250 * zoomScale} viewBox="0 0 860 250" style={{ overflow: 'visible', maxWidth: 'none' }}>
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
                      <rect
                        x={bar.x}
                        y={bar.y}
                        width={bar.barWidth}
                        height={Math.max(4, bar.barH)}
                        rx="6"
                        ry="6"
                        fill={`url(#barGrad_${bar.id})`}
                        opacity={isHovered || isSelected ? 1 : 0.88}
                      />

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
              <UniversalSvgChart height={250} width={860} svgHtml={barSvgHtml} />
            )}
          </ScrollView>
        ) : (
          /* Center Donut SVG Pie Chart */
          <View style={styles.chartContainer}>
            <View style={{ width: 280, height: 280, position: 'relative', alignItems: 'center', justifyContent: 'center' }}>
              {Platform.OS === 'web' ? (
                <svg width={280 * zoomScale} height={280 * zoomScale} viewBox="0 0 280 280" style={{ overflow: 'visible' }}>
                  <g>
                    {mobilePieSlices.map((slice) => (
                      <path
                        key={`prod_web_path_${slice.id}`}
                        d={slice.path}
                        fill={slice.color}
                        stroke="#FFFFFF"
                        strokeWidth="2.5"
                        opacity="0.95"
                        style={{ cursor: 'pointer' }}
                        onClick={() => {
                          if (chartMode === 'category') {
                            onSelectCategory(slice.categoryId);
                          } else if (onSelectPromoFilter) {
                            onSelectPromoFilter(slice.label);
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
