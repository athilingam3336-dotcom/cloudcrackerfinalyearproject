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
import { AdminCategoryItem } from '@/services/adminService';

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

  const PIE_SIZE = 340;
  const CX = PIE_SIZE / 2;
  const CY = PIE_SIZE / 2;
  const R_OUTER = 130;
  const R_INNER = 72;

  const pieSlices = useMemo(() => {
    let startAngle = -Math.PI / 2;
    return segments.map((seg) => {
      const frac = seg.count / totalForPie;
      const sweep = frac * 2 * Math.PI;
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
      const midAngle = startAngle + sweep / 2;
      const path =
        `M ${x1} ${y1} A ${R_OUTER} ${R_OUTER} 0 ${largeArc} 1 ${x2} ${y2} ` +
        `L ${ix1} ${iy1} A ${R_INNER} ${R_INNER} 0 ${largeArc} 0 ${ix2} ${iy2} Z`;
      const labelR = (R_OUTER + R_INNER) / 2;
      const lx = CX + labelR * Math.cos(midAngle);
      const ly = CY + labelR * Math.sin(midAngle);
      const txtR = R_OUTER + 24;
      const tx = CX + txtR * Math.cos(midAngle);
      const ty = CY + txtR * Math.sin(midAngle);
      startAngle = endAngle;
      return { ...seg, path, lx, ly, midAngle, frac, sweep, tx, ty };
    });
  }, [segments, totalForPie]);

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

      {viewType === 'pie' ? (
        <View style={styles.pieWrapper}>
          {isWeb ? (
            <svg
              width={PIE_SIZE}
              height={PIE_SIZE}
              viewBox={`0 0 ${PIE_SIZE} ${PIE_SIZE}`}
              style={{ display: 'block' } as any}
            >
              {pieSlices.map((slice) => {
                const isHovered = hoveredSegment === slice.id;
                const scale = isHovered ? 1.04 : 1;
                const pct = Math.round(slice.frac * 100);
                return (
                  <g
                    key={slice.id}
                    style={{
                      transform: `translate(${CX}px,${CY}px) scale(${scale}) translate(-${CX}px,-${CY}px)`,
                      transition: 'transform 0.18s ease',
                      cursor: slice.filter ? 'pointer' : 'default',
                    } as any}
                    onMouseEnter={() => setHoveredSegment(slice.id)}
                    onMouseLeave={() => setHoveredSegment(null)}
                    onClick={() => slice.filter && onSelectFilter(slice.filter)}
                  >
                    <path d={slice.path} fill={slice.color} opacity={isHovered ? 1 : 0.88} stroke={Colors.background} strokeWidth={3} />
                    {slice.frac > 0.05 && (
                      <text x={slice.lx} y={slice.ly} fill="#fff" fontSize={12} fontWeight="700" textAnchor="middle" dominantBaseline="middle">
                        {pct}%
                      </text>
                    )}
                    {slice.frac > 0.08 && (
                      <>
                        <text x={slice.tx} y={slice.ty - 7} fill={slice.color} fontSize={10} fontWeight="700" textAnchor="middle">{slice.label}</text>
                        <text x={slice.tx} y={slice.ty + 7} fill={Colors.onSurfaceVariant} fontSize={9} textAnchor="middle">{slice.count}</text>
                      </>
                    )}
                  </g>
                );
              })}
              {/* Center */}
              <text x={CX} y={CY - 16} fill={Colors.onSurface} fontSize={32} fontWeight="800" textAnchor="middle" dominantBaseline="middle">
                {categories.length}
              </text>
              <text x={CX} y={CY + 14} fill={Colors.onSurfaceVariant} fontSize={12} textAnchor="middle">
                Categories
              </text>
              <text x={CX} y={CY + 30} fill={Colors.tertiary} fontSize={10} textAnchor="middle">
                {categories.filter((c) => c.isActive !== false).length} active
              </text>
            </svg>
          ) : (
            <View style={styles.nativePieHint}>
              <MaterialIcons name="pie-chart" size={64} color={Colors.primary} />
              <Text style={styles.nativePieText}>{categories.length} Categories</Text>
            </View>
          )}
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

      {/* Legend */}
      <View style={styles.legendRow}>
        {segments.map((seg) => {
          const isActive = seg.filter && activeFilter === seg.filter;
          return (
            <TouchableOpacity
              key={seg.id}
              style={[styles.legendChip, isActive && styles.legendChipActive, { borderColor: seg.color }]}
              onPress={() => {
                if (seg.filter) onSelectFilter(activeFilter === seg.filter ? 'All' : seg.filter);
              }}
              activeOpacity={0.8}
            >
              <View style={[styles.legendDot, { backgroundColor: seg.color }]} />
              <Text style={[styles.legendChipText, isActive && { color: seg.color, fontFamily: 'Inter-Bold' }]}>{seg.label}</Text>
              <View style={[styles.legendCountBadge, { backgroundColor: seg.color + '22' }]}>
                <Text style={[styles.legendCountText, { color: seg.color }]}>{seg.count}</Text>
              </View>
            </TouchableOpacity>
          );
        })}
        <TouchableOpacity
          style={[styles.legendChip, activeFilter === 'All' && styles.legendChipAllActive]}
          onPress={() => onSelectFilter('All')}
          activeOpacity={0.8}
        >
          <MaterialIcons name="select-all" size={12} color={activeFilter === 'All' ? Colors.primary : Colors.onSurfaceVariant} />
          <Text style={[styles.legendChipText, activeFilter === 'All' && { color: Colors.primary, fontFamily: 'Inter-Bold' }]}>All</Text>
          <View style={[styles.legendCountBadge, { backgroundColor: Colors.primaryContainer }]}>
            <Text style={[styles.legendCountText, { color: Colors.primary }]}>{categories.length}</Text>
          </View>
        </TouchableOpacity>
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
  pieWrapper: {
    alignItems: 'center',
    marginVertical: Spacing.xs,
  },
  nativePieHint: {
    alignItems: 'center',
    paddingVertical: Spacing.lg,
    gap: Spacing.xs,
  },
  nativePieText: {
    ...Typography.headlineLg,
    fontSize: 22,
    fontFamily: 'Inter-Bold',
    color: Colors.onSurface,
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
  legendRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginTop: Spacing.sm,
    borderTopWidth: 1,
    borderTopColor: Colors.surfaceContainerHigh,
    paddingTop: Spacing.sm,
  },
  legendChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingHorizontal: Spacing.sm,
    paddingVertical: 6,
    borderRadius: BorderRadius.lg,
    backgroundColor: Colors.surfaceContainerLow,
    borderWidth: 1,
    borderColor: Colors.surfaceContainerHigh,
  },
  legendChipActive: { backgroundColor: Colors.surfaceContainerHigh },
  legendChipAllActive: {
    backgroundColor: Colors.primaryContainer,
    borderColor: Colors.primary,
  },
  legendDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  legendChipText: {
    ...Typography.labelLg,
    fontSize: 11,
    color: Colors.onSurfaceVariant,
    fontFamily: 'Inter-Medium',
  },
  legendCountBadge: {
    paddingHorizontal: 5,
    paddingVertical: 1,
    borderRadius: BorderRadius.sm,
  },
  legendCountText: {
    fontSize: 10,
    fontFamily: 'Inter-Bold',
  },
});
