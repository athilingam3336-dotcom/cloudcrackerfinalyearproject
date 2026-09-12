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
import { AdminCouponItem, CouponSummaryMetrics } from '@/services/adminService';

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

  // Calculate percentages, SVG Slice Paths, and Curved Text Paths (<textPath>)
  const { arcs, formattedSegments } = useMemo(() => {
    const cx = 120;
    const cy = 120;
    const R = 104;
    const r = 52;
    const R_text = 77; // Midpoint radius for curved text path

    let accumulatedDeg = -90; // Start at top center (-90deg)

    const formatted = segments.map((seg) => {
      const pctVal = (seg.count / Math.max(1, total)) * 100;
      return {
        ...seg,
        pct: pctVal.toFixed(1),
      };
    });

    const validSegs = formatted.filter((s) => s.count > 0);

    const arcItems = validSegs.map((seg) => {
      const fraction = seg.count / Math.max(1, total);
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

      // Calculate Curved Text Path along arc (textPath)
      const normMid = ((midDeg % 360) + 360) % 360;
      // If segment is in lower half (between 20deg and 160deg), invert arc direction so text is right-side up
      const isLowerHalf = normMid > 20 && normMid < 160;

      const pStartRad = (isLowerHalf ? endDeg : startDeg) * (Math.PI / 180);
      const pEndRad = (isLowerHalf ? startDeg : endDeg) * (Math.PI / 180);

      const tx1 = cx + R_text * Math.cos(pStartRad);
      const ty1 = cy + R_text * Math.sin(pStartRad);
      const tx2 = cx + R_text * Math.cos(pEndRad);
      const ty2 = cy + R_text * Math.sin(pEndRad);

      const sweepFlag = isLowerHalf ? 0 : 1;
      const largeArcText = angleDeg > 180 ? 1 : 0;

      const textArcD = `M ${tx1.toFixed(2)} ${ty1.toFixed(2)} A ${R_text} ${R_text} 0 ${largeArcText} ${sweepFlag} ${tx2.toFixed(2)} ${ty2.toFixed(2)}`;

      return {
        ...seg,
        pathD,
        textArcD,
        angleDeg,
      };
    });

    return {
      arcs: arcItems,
      formattedSegments: formatted,
    };
  }, [segments, total]);

  const activeSegmentItem = useMemo(() => {
    if (hoveredSegment) {
      return formattedSegments.find((s) => s.id === hoveredSegment);
    }
    return null;
  }, [hoveredSegment, formattedSegments]);

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
            {isWeb ? (
              <View style={styles.webPieWrapper}>
                <svg width="240" height="240" viewBox="0 0 240 240" style={{ overflow: 'visible' }}>
                  <defs>
                    {arcs.map((arc) => (
                      <path key={`coupon-text-path-${arc.id}`} id={`coupon-text-path-${arc.id}`} d={arc.textArcD} />
                    ))}
                  </defs>
                  {arcs.map((arc) => {
                    const isHovered = hoveredSegment === arc.id;
                    const isFilterActive = activeFilter === arc.filter;
                    return (
                      <g key={arc.id} onClick={() => onSelectFilter(arc.filter)} onMouseEnter={() => setHoveredSegment(arc.id)} onMouseLeave={() => setHoveredSegment(null)} style={{ cursor: 'pointer', transition: 'all 0.2s ease' }}>
                        <path d={arc.pathD} fill={arc.color} stroke="#FFFFFF" strokeWidth={isHovered || isFilterActive ? '3' : '2'} opacity={isHovered ? 0.92 : 1} />
                        {arc.angleDeg > 18 && (
                          <text fill="#FFFFFF" fontSize="11.5" fontWeight="bold" fontFamily="Inter-Bold, sans-serif" style={{ pointerEvents: 'none' }}>
                            <textPath href={`#coupon-text-path-${arc.id}`} startOffset="50%" textAnchor="middle">
                              {arc.label} {arc.count} ({arc.pct}%)
                            </textPath>
                          </text>
                        )}
                      </g>
                    );
                  })}
                  <circle cx="120" cy="120" r="50" fill="#FFFFFF" style={{ filter: 'drop-shadow(0px 3px 8px rgba(0,0,0,0.12))' }} />
                  <text x="120" y="114" fill={Colors.onSurface} fontSize="22" fontWeight="bold" fontFamily="Inter-Bold, sans-serif" textAnchor="middle" dominantBaseline="middle">
                    {activeSegmentItem ? activeSegmentItem.count : total}
                  </text>
                  <text x="120" y="132" fill={Colors.onSurfaceVariant} fontSize="10" fontFamily="Inter-Medium, sans-serif" textAnchor="middle" dominantBaseline="middle">
                    {activeSegmentItem ? activeSegmentItem.label : 'Total Coupons'}
                  </text>
                </svg>
              </View>
            ) : (
              <View style={styles.nativeRingContainer}>
                <View style={styles.nativeRingOuter}>
                  <View style={styles.nativeRingInner}>
                    <Text style={styles.donutCountText}>{total}</Text>
                    <Text style={styles.donutLabelText}>Total Coupons</Text>
                  </View>
                </View>
              </View>
            )}
          </View>
        ) : (
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
                onPress={() => onSelectFilter(seg.filter)}
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
                    {seg.count} ({seg.pct}%)
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
        style={styles.allUsersFooterBtn}
        onPress={() => {
          if (onToggleExpandList) {
            onToggleExpandList();
          } else {
            onSelectFilter('All');
          }
        }}
        activeOpacity={0.8}
      >
        <Text style={styles.allUsersFooterText}>
          {isListExpanded
            ? 'Hide Coupons'
            : `Show All Coupon Codes (${total})`}
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
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.05,
    shadowRadius: 12,
    elevation: 3,
    width: '100%',
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
    marginBottom: 2,
  },
  titleGroup: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    flexShrink: 1,
  },
  cardTitle: {
    ...Typography.titleLg,
    fontSize: 14,
    fontFamily: 'Inter-Bold',
    color: Colors.onSurface,
  },
  cardSubtitle: {
    ...Typography.bodyMd,
    fontSize: 11.5,
    color: Colors.onSurfaceVariant,
    marginBottom: Spacing.xs,
  },
  modeTabs: {
    flexDirection: 'row',
    backgroundColor: Colors.surfaceContainerLow,
    borderRadius: BorderRadius.md,
    padding: 2,
    borderWidth: 1,
    borderColor: Colors.surfaceContainerHigh,
    flexShrink: 0,
  },
  modeTabBtn: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: BorderRadius.sm,
  },
  modeTabBtnActive: {
    backgroundColor: '#FFFFFF',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 1,
  },
  modeTabText: {
    ...Typography.labelLg,
    fontSize: 11,
    color: Colors.onSurfaceVariant,
  },
  modeTabTextActive: {
    color: Colors.primary,
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
    height: 240,
    flex: 1,
    minWidth: 280,
    marginVertical: Spacing.xs,
  },
  webPieWrapper: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  donutCountText: {
    ...Typography.headlineLg,
    fontSize: 22,
    fontFamily: 'Inter-Bold',
    color: Colors.onSurface,
    lineHeight: 24,
  },
  donutLabelText: {
    ...Typography.labelLg,
    fontSize: 10,
    color: Colors.onSurfaceVariant,
    marginTop: 2,
  },
  nativeRingContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    width: 160,
    height: 160,
  },
  nativeRingOuter: {
    width: 150,
    height: 150,
    borderRadius: 75,
    backgroundColor: Colors.primaryContainer,
    alignItems: 'center',
    justifyContent: 'center',
  },
  nativeRingInner: {
    width: 95,
    height: 95,
    borderRadius: 47.5,
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
  },
  legendContainer: {
    flex: 1,
    minWidth: 280,
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
  allUsersFooterBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
    marginTop: Spacing.sm,
    paddingVertical: 6,
    borderRadius: BorderRadius.md,
    backgroundColor: Colors.surfaceContainerLow,
    borderWidth: 1,
    borderColor: Colors.surfaceContainerHigh,
  },
  allUsersFooterText: {
    ...Typography.labelLg,
    fontSize: 11.5,
    fontFamily: 'Inter-Bold',
    color: Colors.primary,
  },
});

export default CouponDistributionPieChart;
