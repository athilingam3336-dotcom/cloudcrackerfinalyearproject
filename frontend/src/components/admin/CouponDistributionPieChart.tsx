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
import { AdminCouponItem, CouponSummaryMetrics } from '@/services/adminService';
import { UniversalSvgChart } from '@/components/common/UniversalSvgChart';

export interface CouponDistributionPieChartProps {
  metrics: CouponSummaryMetrics;
  coupons: AdminCouponItem[];
  activeFilter: string;
  onSelectFilter: (filter: 'All' | 'Active' | 'Inactive' | 'Expired' | 'Upcoming' | 'Usage Limit Reached') => void;
  isListExpanded?: boolean;
  onToggleExpandList?: () => void;
}

type ChartMode = 'status' | 'type';

export const CouponDistributionPieChart: React.FC<CouponDistributionPieChartProps> = ({
  metrics,
  coupons,
  activeFilter,
  onSelectFilter,
  isListExpanded = false,
  onToggleExpandList,
}) => {
  const [chartMode, setChartMode] = useState<ChartMode>('status');
  const [viewType, setViewType] = useState<'pie' | 'bar'>('pie');
  const [hoveredSegment, setHoveredSegment] = useState<string | null>(null);
  const isWeb = Platform.OS === 'web';

  // Total count
  const total = coupons.length || metrics.totalCoupons || 1;

  // Calculate Breakdown segments dynamically based on live coupons list & metrics
  const segments = useMemo(() => {
    if (chartMode === 'status') {
      let activeCount = 0;
      let inactiveCount = 0;
      let expiredCount = 0;

      if (coupons && coupons.length > 0) {
        coupons.forEach((c) => {
          if (c.couponStatus === 'ACTIVE' || c.isActive) {
            activeCount++;
          } else if (c.couponStatus === 'EXPIRED') {
            expiredCount++;
          } else {
            inactiveCount++;
          }
        });
      } else {
        activeCount = metrics.activeCoupons || 0;
        expiredCount = metrics.expiringSoonCount || 0;
        inactiveCount = Math.max(0, (metrics.totalCoupons || 0) - activeCount - expiredCount);
      }

      return [
        {
          id: 'Active',
          label: 'Active Codes',
          count: activeCount,
          color: '#16A34A', // Emerald Green
          filter: 'Active' as const,
          icon: 'verified',
        },
        {
          id: 'Inactive',
          label: 'Inactive',
          count: inactiveCount,
          color: '#D97706', // Amber Orange
          filter: 'Inactive' as const,
          icon: 'pause-circle',
        },
        {
          id: 'Expired',
          label: 'Expired',
          count: expiredCount,
          color: '#DC2626', // Crimson Red
          filter: 'Expired' as const,
          icon: 'hourglass-bottom',
        },
      ];
    } else {
      // By Discount Type (Percentage vs Fixed)
      let pctCount = 0;
      let fixedCount = 0;

      if (coupons && coupons.length > 0) {
        coupons.forEach((c) => {
          if (c.discountType === 'percentage') {
            pctCount++;
          } else {
            fixedCount++;
          }
        });
      }

      return [
        {
          id: 'Percentage',
          label: 'Percentage %',
          count: pctCount,
          color: '#0284C7', // Sky Blue
          filter: 'All' as const,
          icon: 'percent',
        },
        {
          id: 'Fixed',
          label: 'Fixed Amount ₹',
          count: fixedCount,
          color: '#7B1FA2', // Purple
          filter: 'All' as const,
          icon: 'payments',
        },
      ];
    }
  }, [chartMode, coupons, metrics]);

  const formattedSegments = useMemo(() => {
    return segments.map((seg) => ({
      ...seg,
      pct: ((seg.count / Math.max(1, total)) * 100).toFixed(1),
    }));
  }, [segments, total]);

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
        { id: 'empty1', label: 'No Coupons', count: 0, color: '#CBD5E1', filter: 'All' as const, icon: 'help-outline', path: path1, pct: '0' },
        { id: 'empty2', label: 'No Coupons', count: 0, color: '#CBD5E1', filter: 'All' as const, icon: 'help-outline', path: path2, pct: '0' },
      ];
    }

    const resultSlices: Array<typeof validSegs[0] & { path: string }> = [];

    validSegs.forEach((seg) => {
      const frac = seg.count / Math.max(1, total);
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
  }, [formattedSegments, total]);

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
          <MaterialIcons name="local-offer" size={20} color={Colors.primary} />
          <Text style={styles.cardTitle}>Coupon Analytics</Text>
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
              <Text style={[styles.modeTabText, chartMode === 'status' && styles.modeTabTextActive]}>By Status</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.modeTabBtn, chartMode === 'type' && styles.modeTabBtnActive]}
              onPress={() => setChartMode('type')}
              activeOpacity={0.8}
            >
              <Text style={[styles.modeTabText, chartMode === 'type' && styles.modeTabTextActive]}>By Type</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>

      {/* Subtitle */}
      <Text style={styles.cardSubtitle}>
        {chartMode === 'status'
          ? 'Live campaign status (Active, Inactive, Expired)'
          : 'Breakdown of Percentage % vs Fixed ₹ Discounts'}
      </Text>

      {/* Side-by-side Chart & Legend Wrapper */}
      <View style={styles.chartAndLegendWrapper}>
        {/* Chart Area: Pie or Bar */}
        {viewType === 'pie' ? (
          <View style={styles.chartContainer}>
            <View style={{ width: 280, height: 280, position: 'relative', alignItems: 'center', justifyContent: 'center' }}>
              {isWeb ? (
                <View style={styles.webPieWrapper}>
                  <svg width="280" height="280" viewBox="0 0 280 280" style={{ overflow: 'visible' }}>
                    <g>
                      {mobilePieSlices.map((slice) => (
                        <path
                          key={`coupon_web_path_${slice.id}`}
                          d={slice.path}
                          fill={slice.color}
                          stroke="#FFFFFF"
                          strokeWidth="2.5"
                          opacity="0.95"
                          style={{ cursor: 'pointer' }}
                          onClick={() => onSelectFilter(slice.filter)}
                        />
                      ))}
                    </g>
                  </svg>
                </View>
              ) : (
                <UniversalSvgChart height={280} svgHtml={mobileSvgHtml} />
              )}
              {/* Donut Center Summary */}
              <View style={styles.donutCenter}>
                <Text style={styles.donutCenterValue}>
                  {activeSegmentItem ? activeSegmentItem.count : total}
                </Text>
                <Text style={styles.donutCenterLabel}>
                  {activeSegmentItem ? activeSegmentItem.label : 'Total Coupons'}
                </Text>
                {activeSegmentItem && (
                  <Text style={styles.donutCenterPct}>{activeSegmentItem.pct}%</Text>
                )}
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
                  onPress={() => onSelectFilter(seg.filter)}
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

        {/* Breakdown Legend Side List */}
        <View style={styles.legendContainer}>
          {formattedSegments.map((seg) => {
            const isFilterActive = activeFilter === seg.filter;
            const isHovered = hoveredSegment === seg.id;

            return (
              <TouchableOpacity
                key={seg.id}
                style={[
                  styles.legendCard,
                  { borderLeftColor: seg.color, borderLeftWidth: 4 },
                  (isFilterActive || isHovered) && styles.legendCardActive,
                ]}
                onPress={() => onSelectFilter(activeFilter === seg.filter ? 'All' : seg.filter)}
                {...({
                  onMouseEnter: () => setHoveredSegment(seg.id),
                  onMouseLeave: () => setHoveredSegment(null),
                } as any)}
                activeOpacity={0.8}
              >
                <View style={[styles.colorBadgeCircle, { backgroundColor: seg.color }]}>
                  <MaterialIcons name={seg.icon as any} size={14} color="#FFF" />
                </View>

                <View style={styles.legendTextWrapper}>
                  <Text style={styles.legendTitle} numberOfLines={1}>
                    {seg.label}
                  </Text>
                  <Text style={styles.legendSubtitle}>
                    {seg.count} coupons ({seg.pct}%)
                  </Text>
                </View>

                <MaterialIcons
                  name="chevron-right"
                  size={16}
                  color={isFilterActive ? Colors.primary : Colors.outline}
                />
              </TouchableOpacity>
            );
          })}
        </View>
      </View>

      {/* Quick Summary Pill Footer */}
      <TouchableOpacity
        style={styles.allCouponsFooterBtn}
        onPress={() => {
          if (onToggleExpandList) {
            onToggleExpandList();
          } else {
            onSelectFilter('All');
          }
        }}
        activeOpacity={0.8}
      >
        <Text style={styles.allCouponsFooterText}>
          {isListExpanded ? 'Hide Coupons List' : `Show All Coupons (${total})`}
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
    marginBottom: Spacing.xs,
  },
  titleGroup: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.xs,
    flexShrink: 1,
  },
  cardTitle: {
    ...Typography.titleLg,
    fontSize: 16,
    fontFamily: 'Inter-Bold',
    color: Colors.onSurface,
  },
  cardSubtitle: {
    ...Typography.bodyMd,
    fontSize: 11,
    color: Colors.onSurfaceVariant,
    marginBottom: Spacing.xs,
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
  webPieWrapper: {
    width: 280,
    height: 280,
    alignItems: 'center',
    justifyContent: 'center',
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
    gap: 12,
    paddingVertical: Spacing.sm,
  },
  barRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  barLabel: {
    ...Typography.bodyMd,
    fontSize: 12,
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
    fontSize: 12,
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
    width: 26,
    height: 26,
    borderRadius: 13,
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
  allCouponsFooterBtn: {
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
  allCouponsFooterText: {
    ...Typography.labelLg,
    fontSize: 13,
    fontFamily: 'Inter-Bold',
    color: Colors.primary,
  },
});

export default CouponDistributionPieChart;
