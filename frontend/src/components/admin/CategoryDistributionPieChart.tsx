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
import { AdminCategoryItem } from '@/services/adminService';
import { UniversalSvgChart } from '@/components/common/UniversalSvgChart';

export interface CategoryDistributionPieChartProps {
  categories: AdminCategoryItem[];
  activeFilter: 'All' | 'Active' | 'Inactive';
  onSelectFilter: (filter: 'All' | 'Active' | 'Inactive') => void;
  isListExpanded?: boolean;
  onToggleExpandList?: () => void;
}

type ChartMode = 'status' | 'name';

const PALETTE_COLORS = [
  '#0284C7',
  '#7B1FA2',
  '#D97706',
  '#E11D48',
  '#059669',
  '#4F46E5',
  '#0891B2',
  '#C026D3',
];

export const CategoryDistributionPieChart: React.FC<CategoryDistributionPieChartProps> = ({
  categories,
  activeFilter,
  onSelectFilter,
  isListExpanded = false,
  onToggleExpandList,
}) => {
  const [chartMode, setChartMode] = useState<ChartMode>('status');
  const [viewType, setViewType] = useState<'pie' | 'bar'>('pie');
  const [hoveredSegment, setHoveredSegment] = useState<string | null>(null);

  const segments = useMemo(() => {
    if (chartMode === 'status') {
      const activeCount = categories.filter((c) => c.isActive !== false).length;
      const inactiveCount = categories.filter((c) => c.isActive === false).length;
      return [
        {
          id: 'Active',
          label: 'Active',
          count: activeCount,
          color: '#16A34A',
          filter: 'Active' as const,
          icon: 'check-circle',
        },
        {
          id: 'Inactive',
          label: 'Inactive',
          count: inactiveCount,
          color: '#DC2626',
          filter: 'Inactive' as const,
          icon: 'cancel',
        },
      ];
    } else {
      return categories.slice(0, 8).map((c, idx) => ({
        id: c.id,
        label: c.name.length > 14 ? c.name.slice(0, 13) + '…' : c.name,
        count: 1,
        color: PALETTE_COLORS[idx % PALETTE_COLORS.length],
        filter: null as null,
        icon: 'category',
      }));
    }
  }, [categories, chartMode]);

  const totalForPie = segments.reduce((s, seg) => s + seg.count, 0) || 1;
  const maxBarCount = Math.max(...segments.map((s) => s.count), 1);

  const formattedSegments = useMemo(() => {
    return segments.map((seg) => ({
      ...seg,
      pct: ((seg.count / Math.max(1, totalForPie)) * 100).toFixed(1),
    }));
  }, [segments, totalForPie]);

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
        { id: 'empty1', label: 'No Categories', count: 0, color: '#CBD5E1', filter: 'All' as const, icon: 'help-outline', path: path1, pct: '0' },
        { id: 'empty2', label: 'No Categories', count: 0, color: '#CBD5E1', filter: 'All' as const, icon: 'help-outline', path: path2, pct: '0' },
      ];
    }

    const resultSlices: Array<typeof validSegs[0] & { path: string }> = [];

    validSegs.forEach((seg) => {
      const frac = seg.count / Math.max(1, totalForPie);
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
  }, [formattedSegments, totalForPie]);

  const activeSegmentItem = useMemo(() => {
    if (hoveredSegment) {
      return formattedSegments.find((s) => s.id === hoveredSegment);
    }
    return null;
  }, [hoveredSegment, formattedSegments]);

  const mobileSvgHtml = useMemo(() => {
    return `
      <svg width="280" height="280" viewBox="0 0 280 280">
        <g>
          ${mobilePieSlices.map((slice) => `<path d="${slice.path}" fill="${slice.color}" stroke="#FFFFFF" stroke-width="2.5" opacity="0.95" />`).join('')}
        </g>
      </svg>
    `;
  }, [mobilePieSlices]);

  const isWeb = Platform.OS === 'web';

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.headerRow}>
        <View style={styles.titleBlock}>
          <Text style={styles.chartTitle}>📂 Category Analytics</Text>
          <Text style={styles.chartSubtitle}>
            {categories.length} total · {categories.filter((c) => c.isActive !== false).length} active · {categories.filter((c) => c.isActive === false).length} inactive
          </Text>
        </View>
        <View style={styles.viewToggleGroup}>
          <TouchableOpacity
            style={[styles.viewToggleBtn, viewType === 'pie' && styles.viewToggleBtnActive]}
            onPress={() => setViewType('pie')}
            activeOpacity={0.8}
          >
            <MaterialIcons name="pie-chart" size={16} color={viewType === 'pie' ? '#fff' : Colors.onSurfaceVariant} />
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.viewToggleBtn, viewType === 'bar' && styles.viewToggleBtnActive]}
            onPress={() => setViewType('bar')}
            activeOpacity={0.8}
          >
            <MaterialIcons name="bar-chart" size={16} color={viewType === 'bar' ? '#fff' : Colors.onSurfaceVariant} />
          </TouchableOpacity>
        </View>
      </View>

      {/* Mode tabs */}
      <View style={styles.modeTabs}>
        {([['status', 'By Status'], ['name', 'By Name']] as [ChartMode, string][]).map(([mode, label]) => (
          <TouchableOpacity
            key={mode}
            style={[styles.modeTab, chartMode === mode && styles.modeTabActive]}
            onPress={() => setChartMode(mode)}
            activeOpacity={0.8}
          >
            <Text style={[styles.modeTabText, chartMode === mode && styles.modeTabTextActive]}>{label}</Text>
          </TouchableOpacity>
        ))}
      </View>

      {/* Side-by-side Chart & Legend Wrapper */}
      <View style={styles.chartAndLegendWrapper}>
        {viewType === 'pie' ? (
          <View style={styles.pieWrapper}>
            <View style={{ width: 280, height: 280, position: 'relative', alignItems: 'center', justifyContent: 'center' }}>
              {isWeb ? (
                <View style={styles.webPieWrapper}>
                  <svg width="280" height="280" viewBox="0 0 280 280">
                    <g>
                      {mobilePieSlices.map((slice) => (
                        <path
                          key={`cat_web_path_${slice.id}`}
                          d={slice.path}
                          fill={slice.color}
                          stroke="#FFFFFF"
                          strokeWidth="2.5"
                          opacity="0.95"
                          style={{ cursor: slice.filter ? 'pointer' : 'default' }}
                          onClick={() => slice.filter && onSelectFilter(slice.filter as any)}
                        />
                      ))}
                    </g>
                  </svg>
                </View>
              ) : (
                <UniversalSvgChart height={280} svgHtml={mobileSvgHtml} />
              )}
              {/* Center Summary */}
              <View style={styles.donutCenter}>
                <Text style={styles.donutCenterValue}>
                  {activeSegmentItem ? activeSegmentItem.count : categories.length}
                </Text>
                <Text style={styles.donutCenterLabel}>
                  {activeSegmentItem ? activeSegmentItem.label : 'Categories'}
                </Text>
                {activeSegmentItem && (
                  <Text style={styles.donutCenterPct}>{activeSegmentItem.pct}%</Text>
                )}
              </View>
            </View>
          </View>
        ) : (
          <View style={styles.barChartContainer}>
            {segments.map((seg) => {
              const barPct = (seg.count / maxBarCount) * 100;
              const isHovered = hoveredSegment === seg.id;
              return (
                <TouchableOpacity
                  key={seg.id}
                  activeOpacity={0.85}
                  onPress={() => seg.filter && onSelectFilter(seg.filter)}
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
                    <View style={[styles.barFill, { width: `${Math.max(barPct, 4)}%` as any, backgroundColor: seg.color, opacity: isHovered ? 1 : 0.82 }]} />
                  </View>
                  <Text style={[styles.barCount, { color: seg.color }]}>{seg.count}</Text>
                </TouchableOpacity>
              );
            })}
          </View>
        )}

        {/* Breakdown Legend Side List */}
        <View style={styles.legendContainer}>
          {segments.map((seg) => {
            const isActive = seg.filter && activeFilter === seg.filter;
            const isHovered = hoveredSegment === seg.id;
            return (
              <TouchableOpacity
                key={seg.id}
                style={[
                  styles.legendCard,
                  { borderLeftColor: seg.color, borderLeftWidth: 4 },
                  (isActive || isHovered) && styles.legendCardActive,
                ]}
                onPress={() => {
                  if (seg.filter) onSelectFilter(activeFilter === seg.filter ? 'All' : seg.filter);
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
                    {seg.count} categories ({Math.round((seg.count / totalForPie) * 100)}%)
                  </Text>
                </View>

                <MaterialIcons
                  name="chevron-right"
                  size={16}
                  color={isActive ? Colors.primary : Colors.outline}
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
            ? 'Hide Categories'
            : `Show All Categories (${categories.length})`}
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
  allUsersFooterBtn: {
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
  allUsersFooterText: {
    ...Typography.labelLg,
    fontSize: 13,
    fontFamily: 'Inter-Bold',
    color: Colors.primary,
  },
  container: {
    backgroundColor: Colors.surfaceContainerLowest,
    borderRadius: BorderRadius.xl,
    borderWidth: 1,
    borderColor: Colors.surfaceContainerHigh,
    marginTop: Spacing.sm,
    marginBottom: Spacing.sm,
    padding: Spacing.md,
    shadowColor: Colors.shadowColor,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.07,
    shadowRadius: 14,
    elevation: 3,
    width: '100%',
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    marginBottom: Spacing.xs,
  },
  titleBlock: { flex: 1 },
  chartTitle: {
    ...Typography.titleLg,
    fontSize: 16,
    fontFamily: 'Inter-Bold',
    color: Colors.onSurface,
  },
  chartSubtitle: {
    ...Typography.bodyMd,
    fontSize: 11,
    color: Colors.onSurfaceVariant,
    marginTop: 2,
  },
  viewToggleGroup: {
    flexDirection: 'row',
    borderRadius: BorderRadius.md,
    borderWidth: 1,
    borderColor: Colors.surfaceContainerHigh,
    overflow: 'hidden',
  },
  viewToggleBtn: {
    padding: 7,
    backgroundColor: Colors.surfaceContainerLow,
  },
  viewToggleBtnActive: { backgroundColor: Colors.primary },
  modeTabs: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: Spacing.sm,
    marginTop: 4,
  },
  modeTab: {
    paddingHorizontal: Spacing.md,
    paddingVertical: 6,
    borderRadius: BorderRadius.lg,
    backgroundColor: Colors.surfaceContainerLow,
    borderWidth: 1,
    borderColor: Colors.surfaceContainerHigh,
  },
  modeTabActive: {
    backgroundColor: Colors.primaryContainer,
    borderColor: Colors.primary,
  },
  modeTabText: {
    ...Typography.labelLg,
    fontSize: 11,
    color: Colors.onSurfaceVariant,
    fontFamily: 'Inter-Medium',
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
  pieWrapper: {
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
    width: 30,
    textAlign: 'left',
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
});
