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
import { AdminOrderItem } from '@/services/adminService';

export interface OrderDistributionPieChartProps {
  orders: AdminOrderItem[];
  totalOrdersCount: number;
  selectedOrderStatus: string;
  selectedPaymentStatus: string;
  onSelectOrderStatusFilter: (status: string) => void;
  onSelectPaymentStatusFilter: (status: string) => void;
}

type ChartMode = 'status' | 'payment';

const STATUS_COLORS: Record<string, string> = {
  Pending: '#D97706', // Amber
  Confirmed: '#0284C7', // Sky Blue
  Packed: '#4F46E5', // Indigo
  Shipped: '#7B1FA2', // Purple
  Delivered: '#16A34A', // Emerald Green
  Cancelled: '#DC2626', // Crimson Red
  Paid: '#16A34A', // Green
  Refunded: '#EA580C', // Orange
  Failed: '#DC2626', // Red
};

const STATUS_ICONS: Record<string, string> = {
  Pending: 'hourglass-top',
  Confirmed: 'check-circle-outline',
  Packed: 'inventory-2',
  Shipped: 'local-shipping',
  Delivered: 'verified',
  Cancelled: 'cancel',
  Paid: 'payments',
  Refunded: 'replay',
  Failed: 'error-outline',
};

export const OrderDistributionPieChart: React.FC<OrderDistributionPieChartProps> = ({
  orders,
  totalOrdersCount,
  selectedOrderStatus,
  selectedPaymentStatus,
  onSelectOrderStatusFilter,
  onSelectPaymentStatusFilter,
}) => {
  const [chartMode, setChartMode] = useState<ChartMode>('status');
  const [viewType, setViewType] = useState<'pie' | 'bar'>('pie');
  const [hoveredSegment, setHoveredSegment] = useState<string | null>(null);

  // Calculate breakdown segments dynamically
  const segments = useMemo(() => {
    if (chartMode === 'status') {
      const counts: Record<string, number> = {
        Pending: 0,
        Confirmed: 0,
        Packed: 0,
        Shipped: 0,
        Delivered: 0,
        Cancelled: 0,
      };

      if (orders && orders.length > 0) {
        orders.forEach((o) => {
          const st = o.orderStatus || 'Pending';
          if (counts[st] !== undefined) {
            counts[st] += 1;
          } else {
            counts[st] = 1;
          }
        });
      }

      return Object.entries(counts).map(([st, cnt]) => ({
        id: st,
        label: st,
        count: cnt,
        color: STATUS_COLORS[st] || '#0284C7',
        statusValue: st,
        icon: STATUS_ICONS[st] || 'receipt',
      }));
    } else {
      // By Payment Status
      const counts: Record<string, number> = {
        Paid: 0,
        Pending: 0,
        Refunded: 0,
        Failed: 0,
      };

      if (orders && orders.length > 0) {
        orders.forEach((o) => {
          const pst = o.paymentStatus || 'Pending';
          if (counts[pst] !== undefined) {
            counts[pst] += 1;
          } else {
            counts[pst] = 1;
          }
        });
      }

      return Object.entries(counts).map(([pst, cnt]) => ({
        id: `pay_${pst}`,
        label: `${pst} Pay`,
        count: cnt,
        color: STATUS_COLORS[pst] || '#6B7280',
        statusValue: pst,
        icon: STATUS_ICONS[pst] || 'payment',
      }));
    }
  }, [chartMode, orders]);

  const sliceTotal = useMemo(() => {
    return segments.reduce((sum, s) => sum + s.count, 0) || 1;
  }, [segments]);

  const displayTotal = useMemo(() => {
    return totalOrdersCount || sliceTotal;
  }, [totalOrdersCount, sliceTotal]);

  // Calculate percentages, SVG Slice Paths, and 2-Line Curved Text Paths (<textPath>)
  const { arcs, formattedSegments } = useMemo(() => {
    const cx = 170;
    const cy = 170;
    const R = 152;
    const r = 74;

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

      // Line 1: Status Name (Top Line)
      // Line 2: Count & Percentage (Bottom Line)
      const R_name = isLowerHalf ? 94 : 132;
      const R_pct = isLowerHalf ? 132 : 94;

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
    const barGap = 24;
    const totalGap = Math.max(0, count - 1) * barGap;
    const barWidth = Math.max(30, (chartW - totalGap) / Math.max(1, count));

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
      {/* Header with Mode & View Type Toggle Tabs */}
      <View style={styles.headerRow}>
        <View style={styles.titleGroup}>
          <MaterialIcons
            name={viewType === 'pie' ? 'pie-chart' : 'bar-chart'}
            size={20}
            color={Colors.primary}
          />
          <Text style={styles.cardTitle} numberOfLines={1}>
            Order Analytics
          </Text>
        </View>

        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
          {/* Mode Tabs (By Status / By Payment) */}
          <View style={styles.modeTabs}>
            <TouchableOpacity
              style={[styles.modeTabBtn, chartMode === 'status' && styles.modeTabBtnActive]}
              onPress={() => setChartMode('status')}
              activeOpacity={0.8}
            >
              <Text style={[styles.modeTabText, chartMode === 'status' && styles.modeTabTextActive]}>
                By Status
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.modeTabBtn, chartMode === 'payment' && styles.modeTabBtnActive]}
              onPress={() => setChartMode('payment')}
              activeOpacity={0.8}
            >
              <Text style={[styles.modeTabText, chartMode === 'payment' && styles.modeTabTextActive]}>
                By Payment
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

      {/* Main Visual Chart View */}
      {viewType === 'bar' ? (
        <View style={styles.chartContainer}>
          {Platform.OS === 'web' ? (
            <svg width="100%" height="250" viewBox="0 0 860 250" style={{ overflow: 'visible', maxWidth: '100%' }}>
              <defs>
                {barChartData.bars.map((bar) => (
                  <linearGradient
                    key={`grad_${bar.id}`}
                    id={`orderBarGrad_${bar.id}`}
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
                  chartMode === 'status'
                    ? selectedOrderStatus === bar.statusValue
                    : selectedPaymentStatus === bar.statusValue;

                return (
                  <g
                    key={`bargroup_${bar.id}`}
                    style={{ cursor: 'pointer' }}
                    onMouseEnter={() => setHoveredSegment(bar.id)}
                    onMouseLeave={() => setHoveredSegment(null)}
                    onClick={() => {
                      if (chartMode === 'status') {
                        onSelectOrderStatusFilter(bar.statusValue);
                      } else {
                        onSelectPaymentStatusFilter(bar.statusValue);
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
                      fill={`url(#orderBarGrad_${bar.id})`}
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

                    {/* X-axis Label (FULL UN-TRUNCATED LABEL!) */}
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
            <svg width="340" height="340" viewBox="0 0 340 340" style={{ overflow: 'visible' }}>
              <defs>
                {arcs.map((arc, index) => (
                  <React.Fragment key={`def_order_frag_${arc.id}_${index}`}>
                    <path id={`orderTextPath_Name_${arc.id}_${index}`} d={arc.textArcD_Name} />
                    <path id={`orderTextPath_Pct_${arc.id}_${index}`} d={arc.textArcD_Pct} />
                  </React.Fragment>
                ))}
              </defs>

              {/* Render Donut Slices */}
              {arcs.map((arc) => {
                const isHovered = hoveredSegment === arc.id;
                const isSelected =
                  chartMode === 'status'
                    ? selectedOrderStatus === arc.statusValue
                    : selectedPaymentStatus === arc.statusValue;

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
                      transformOrigin: '170px 170px',
                      filter: isHovered ? 'drop-shadow(0px 4px 8px rgba(0,0,0,0.25))' : 'none',
                    }}
                    onMouseEnter={() => setHoveredSegment(arc.id)}
                    onMouseLeave={() => setHoveredSegment(null)}
                    onClick={() => {
                      if (chartMode === 'status') {
                        onSelectOrderStatusFilter(arc.statusValue);
                      } else {
                        onSelectPaymentStatusFilter(arc.statusValue);
                      }
                    }}
                  />
                );
              })}

              {/* Render 2-Line Curved Text Labels inside slices using SVG <textPath> */}
              {arcs.map((arc, index) => {
                if (arc.angleDeg < 14) return null; // Don't render text inside tiny slices to avoid overflow

                return (
                  <g key={`order_text_group_${arc.id}_${index}`}>
                    {/* Line 1: Status Name (e.g. Delivered) */}
                    <text
                      style={{
                        fontSize: arc.angleDeg < 25 ? '11px' : '13px',
                        fontWeight: 'bold',
                        fill: '#FFFFFF',
                        pointerEvents: 'none',
                        letterSpacing: '0.4px',
                      }}
                    >
                      <textPath
                        href={`#orderTextPath_Name_${arc.id}_${index}`}
                        startOffset="50%"
                        textAnchor="middle"
                      >
                        {arc.label}
                      </textPath>
                    </text>

                    {/* Line 2: Count & Percentage (e.g. 2 (28.6%)) */}
                    <text
                      style={{
                        fontSize: arc.angleDeg < 25 ? '10px' : '11.5px',
                        fontWeight: '600',
                        fill: 'rgba(255, 255, 255, 0.95)',
                        pointerEvents: 'none',
                        letterSpacing: '0.2px',
                      }}
                    >
                      <textPath
                        href={`#orderTextPath_Pct_${arc.id}_${index}`}
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
              {activeSegmentItem ? activeSegmentItem.label : 'Total Orders'}
            </Text>
            {activeSegmentItem && (
              <Text style={styles.donutCenterPct}>{activeSegmentItem.pct}%</Text>
            )}
          </View>
        </View>
      )}

      {/* Interactive Legend Grid/List */}
      <View style={styles.legendContainer}>
        {formattedSegments.map((seg) => {
          const isSelected =
            chartMode === 'status'
              ? selectedOrderStatus === seg.statusValue
              : selectedPaymentStatus === seg.statusValue;
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
                  onSelectOrderStatusFilter(seg.statusValue);
                } else {
                  onSelectPaymentStatusFilter(seg.statusValue);
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
                  {seg.count} orders ({seg.pct}%)
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
    width: '100%',
    marginBottom: Spacing.md,
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
    height: 340,
    marginVertical: Spacing.xs,
  },
  donutCenter: {
    position: 'absolute',
    alignItems: 'center',
    justifyContent: 'center',
    width: 130,
    height: 130,
    borderRadius: 65,
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
    fontSize: 28,
    fontFamily: 'Inter-Bold',
    color: Colors.onSurface,
  },
  donutCenterLabel: {
    ...Typography.labelLg,
    fontSize: 11,
    color: Colors.onSurfaceVariant,
    textAlign: 'center',
  },
  donutCenterPct: {
    ...Typography.labelLg,
    fontSize: 12,
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
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginTop: Spacing.xs,
    justifyContent: 'center',
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
    minWidth: 135,
    flex: 1,
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
    fontSize: 11.5,
    fontFamily: 'Inter-Bold',
    color: Colors.onSurface,
  },
  legendSubtitle: {
    ...Typography.bodyMd,
    fontSize: 9.5,
    color: Colors.onSurfaceVariant,
  },
});

export default OrderDistributionPieChart;
