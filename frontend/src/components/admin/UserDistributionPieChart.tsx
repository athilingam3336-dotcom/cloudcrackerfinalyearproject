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
import { UserSummaryMetrics } from '@/services/adminService';

export interface UserDistributionPieChartProps {
  metrics: UserSummaryMetrics;
  activeFilter: string;
  onSelectFilter: (filter: 'All' | 'Customers' | 'Admins' | 'Active' | 'Inactive' | 'Blocked') => void;
  isListExpanded?: boolean;
  onToggleExpandList?: () => void;
}

type ChartMode = 'role' | 'status';

export const UserDistributionPieChart: React.FC<UserDistributionPieChartProps> = ({
  metrics,
  activeFilter,
  onSelectFilter,
  isListExpanded = false,
  onToggleExpandList,
}) => {
  const [chartMode, setChartMode] = useState<ChartMode>('role');
  const [viewType, setViewType] = useState<'pie' | 'bar'>('pie');
  const [hoveredSegment, setHoveredSegment] = useState<string | null>(null);
  const isWeb = Platform.OS === 'web';

  const total = metrics.totalUsers || 1;

  // Prepare segments based on active tab mode (By Role or By Status)
  const segments = useMemo(() => {
    if (chartMode === 'role') {
      return [
        {
          id: 'Customers',
          label: 'Customers',
          count: metrics.customerCount,
          color: '#0284C7', // Sky Blue
          filter: 'Customers' as const,
          icon: 'person',
        },
        {
          id: 'Admins',
          label: 'Admins',
          count: metrics.adminCount,
          color: '#D97706', // Amber Gold
          filter: 'Admins' as const,
          icon: 'admin-panel-settings',
        },
      ];
    } else {
      return [
        {
          id: 'Active',
          label: 'Active Users',
          count: metrics.activeUsers,
          color: '#16A34A', // Emerald Green
          filter: 'Active' as const,
          icon: 'check-circle',
        },
        {
          id: 'Inactive',
          label: 'Inactive',
          count: metrics.inactiveUsers,
          color: '#6B7280', // Cool Gray
          filter: 'Inactive' as const,
          icon: 'pause-circle',
        },
        {
          id: 'Blocked',
          label: 'Blocked',
          count: metrics.blockedUsers,
          color: '#DC2626', // Crimson Red
          filter: 'Blocked' as const,
          icon: 'block',
        },
      ];
    }
  }, [chartMode, metrics]);

  // Calculate percentages, SVG Slice Paths, and Curved Text Paths (<textPath>)
  const { arcs, formattedSegments } = useMemo(() => {
    const cx = 150;
    const cy = 150;
    const R = 132;
    const r = 66;
    const R_text = 99; // Midpoint radius for curved text path

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
          <MaterialIcons name="people" size={22} color={Colors.primary} />
          <Text style={styles.cardTitle}>User Analytics</Text>
        </View>

        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
          {/* Pie / Bar toggle */}
          <View style={styles.viewToggleGroup}>
            <TouchableOpacity
              style={[styles.viewToggleBtn, viewType === 'pie' && styles.viewToggleBtnActive]}
              onPress={() => setViewType('pie')}
              activeOpacity={0.8}
            >
              <MaterialIcons name="pie-chart" size={18} color={viewType === 'pie' ? '#fff' : Colors.onSurfaceVariant} />
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.viewToggleBtn, viewType === 'bar' && styles.viewToggleBtnActive]}
              onPress={() => setViewType('bar')}
              activeOpacity={0.8}
            >
              <MaterialIcons name="bar-chart" size={18} color={viewType === 'bar' ? '#fff' : Colors.onSurfaceVariant} />
            </TouchableOpacity>
          </View>

          <View style={styles.modeTabs}>
            <TouchableOpacity
              style={[styles.modeTabBtn, chartMode === 'role' && styles.modeTabBtnActive]}
              onPress={() => setChartMode('role')}
              activeOpacity={0.8}
            >
              <Text style={[styles.modeTabText, chartMode === 'role' && styles.modeTabTextActive]}>By Role</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.modeTabBtn, chartMode === 'status' && styles.modeTabBtnActive]}
              onPress={() => setChartMode('status')}
              activeOpacity={0.8}
            >
              <Text style={[styles.modeTabText, chartMode === 'status' && styles.modeTabTextActive]}>By Status</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>

      {/* Subtitle */}
      <Text style={styles.cardSubtitle}>
        {chartMode === 'role'
          ? 'Distribution of Customers vs Admin accounts'
          : 'Live status breakdown (Active, Inactive, Blocked)'}
      </Text>

      {/* Chart Area: Pie or Bar */}
      {viewType === 'pie' ? (
        <View style={styles.chartContainer}>
          {isWeb ? (
            <View style={styles.webPieWrapper}>
              <svg width="300" height="300" viewBox="0 0 300 300" style={{ overflow: 'visible' }}>
                <defs>
                  {arcs.map((arc) => (
                    <path key={`text-path-${arc.id}`} id={`text-path-${arc.id}`} d={arc.textArcD} />
                  ))}
                </defs>
                {arcs.map((arc) => {
                  const isHovered = hoveredSegment === arc.id;
                  const isFilterActive = activeFilter === arc.filter;
                  return (
                    <g
                      key={arc.id}
                      onClick={() => onSelectFilter(arc.filter)}
                      onMouseEnter={() => setHoveredSegment(arc.id)}
                      onMouseLeave={() => setHoveredSegment(null)}
                      style={{ cursor: 'pointer', transition: 'all 0.2s ease' }}
                    >
                      <path d={arc.pathD} fill={arc.color} stroke="#FFFFFF" strokeWidth={isHovered || isFilterActive ? '3' : '2'} opacity={isHovered ? 0.92 : 1} />
                      {arc.angleDeg > 18 && (
                        <text fill="#FFFFFF" fontSize="12.5" fontWeight="bold" fontFamily="Inter-Bold, sans-serif" style={{ pointerEvents: 'none' }}>
                          <textPath href={`#text-path-${arc.id}`} startOffset="50%" textAnchor="middle">
                            {arc.label} {arc.count} ({arc.pct}%)
                          </textPath>
                        </text>
                      )}
                    </g>
                  );
                })}
                <circle cx="150" cy="150" r="64" fill="#FFFFFF" style={{ filter: 'drop-shadow(0px 3px 8px rgba(0,0,0,0.12))' }} />
                <text x="150" y="143" fill={Colors.onSurface} fontSize="28" fontWeight="bold" fontFamily="Inter-Bold, sans-serif" textAnchor="middle" dominantBaseline="middle">
                  {activeSegmentItem ? activeSegmentItem.count : metrics.totalUsers}
                </text>
                <text x="150" y="165" fill={Colors.onSurfaceVariant} fontSize="11" fontFamily="Inter-Medium, sans-serif" textAnchor="middle" dominantBaseline="middle">
                  {activeSegmentItem ? activeSegmentItem.label : 'Total Users'}
                </text>
              </svg>
            </View>
          ) : (
            <View style={styles.nativeRingContainer}>
              <View style={styles.nativeRingOuter}>
                <View style={styles.nativeRingInner}>
                  <Text style={styles.donutCountText}>{metrics.totalUsers}</Text>
                  <Text style={styles.donutLabelText}>Total Users</Text>
                </View>
              </View>
            </View>
          )}
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

      {/* Breakdown Legend List */}
      <View style={styles.legendContainer}>
        {formattedSegments.map((seg) => {
          const isFilterActive = activeFilter === seg.filter;
          return (
            <TouchableOpacity
              key={seg.id}
              style={[
                styles.legendItem,
                isFilterActive && styles.legendItemActive,
              ]}
              onPress={() => onSelectFilter(seg.filter)}
              onPressIn={() => setHoveredSegment(seg.id)}
              onPressOut={() => setHoveredSegment(null)}
              activeOpacity={0.8}
            >
              <View style={styles.legendLeft}>
                <View style={[styles.colorDot, { backgroundColor: seg.color }]} />
                <MaterialIcons name={seg.icon as any} size={16} color={seg.color} />
                <Text style={styles.legendLabel}>{seg.label}</Text>
              </View>

              <View style={styles.legendRight}>
                <Text style={styles.legendValueText}>{seg.count}</Text>
                <Text style={styles.legendPctText}>({seg.pct}%)</Text>
                {isFilterActive && (
                  <MaterialIcons name="check" size={14} color={Colors.primary} style={{ marginLeft: 4 }} />
                )}
              </View>
            </TouchableOpacity>
          );
        })}
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
            ? 'Hide Accounts'
            : `Show All Accounts (${metrics.totalUsers})`}
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
  viewToggleBtnActive: {
    backgroundColor: Colors.primary,
  },
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
    marginBottom: 2,
  },
  titleGroup: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  cardTitle: {
    ...Typography.titleLg,
    fontSize: 16,
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
  chartContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    marginVertical: 4,
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
    marginTop: Spacing.xs,
    gap: 6,
  },
  legendItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 6,
    paddingHorizontal: 10,
    borderRadius: BorderRadius.md,
    backgroundColor: Colors.surfaceContainerLow,
    borderWidth: 1,
    borderColor: 'transparent',
  },
  legendItemActive: {
    backgroundColor: Colors.primaryContainer + '40',
    borderColor: Colors.primary,
  },
  legendLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  colorDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  legendLabel: {
    ...Typography.bodyMd,
    fontSize: 12.5,
    fontFamily: 'Inter-Medium',
    color: Colors.onSurface,
  },
  legendRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  legendValueText: {
    ...Typography.titleLg,
    fontSize: 13,
    fontFamily: 'Inter-Bold',
    color: Colors.onSurface,
  },
  legendPctText: {
    ...Typography.bodyMd,
    fontSize: 11,
    color: Colors.tertiary,
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

export default UserDistributionPieChart;
