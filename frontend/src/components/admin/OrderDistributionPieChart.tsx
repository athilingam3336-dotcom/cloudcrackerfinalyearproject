import React, { useState, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Platform,
  ScrollView,
  useWindowDimensions,
} from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { Colors } from '@/constants/colors';
import { Typography } from '@/constants/typography';
import { Spacing, BorderRadius } from '@/constants/spacing';
import { AdminOrderItem } from '@/services/adminService';
import { UniversalSvgChart } from '@/components/common/UniversalSvgChart';

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

function calculateDesktopDonutArcs(
  formattedSegments: Array<{
    id: string;
    label: string;
    count: number;
    color: string;
    statusValue: string;
    pct: string;
    icon: string;
  }>,
  sliceTotal: number,
  cx: number,
  cy: number,
  R: number,
  r: number
) {
  let accumulatedDeg = -90;

  const validSegs = formattedSegments.filter((s) => s.count > 0);
  const segsToDraw =
    validSegs.length > 0
      ? validSegs
      : [
          {
            id: 'empty_placeholder',
            label: 'No Orders',
            count: 0,
            color: '#CBD5E1',
            statusValue: 'None',
            pct: '0.0',
            icon: 'help-outline',
          },
        ];

  const totalForCalc = validSegs.length > 0 ? sliceTotal : 1;

  return segsToDraw.map((seg) => {
    const fraction = validSegs.length > 0 ? seg.count / Math.max(1, totalForCalc) : 1;
    const angleDeg = fraction * 360;

    const startDeg = accumulatedDeg;
    const endDeg = accumulatedDeg + angleDeg;
    accumulatedDeg = endDeg;

    const midDeg = startDeg + angleDeg / 2;

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

    const normMid = ((midDeg % 360) + 360) % 360;
    const isLowerHalf = normMid > 20 && normMid < 160;

    const pStartRad = (isLowerHalf ? endDeg : startDeg) * (Math.PI / 180);
    const pEndRad = (isLowerHalf ? startDeg : endDeg) * (Math.PI / 180);
    const sweepFlag = isLowerHalf ? 0 : 1;
    const largeArcText = angleDeg > 180 ? 1 : 0;

    const R_name = isLowerHalf ? r + (R - r) * 0.3 : r + (R - r) * 0.7;
    const R_pct = isLowerHalf ? r + (R - r) * 0.7 : r + (R - r) * 0.3;

    const tx1_n = cx + R_name * Math.cos(pStartRad);
    const ty1_n = cy + R_name * Math.sin(pStartRad);
    const tx2_n = cx + R_name * Math.cos(pEndRad);
    const ty2_n = cy + R_name * Math.sin(pEndRad);
    const textArcD_Name = `M ${tx1_n.toFixed(2)} ${ty1_n.toFixed(2)} A ${R_name.toFixed(2)} ${R_name.toFixed(2)} 0 ${largeArcText} ${sweepFlag} ${tx2_n.toFixed(2)} ${ty2_n.toFixed(2)}`;

    const tx1_p = cx + R_pct * Math.cos(pStartRad);
    const ty1_p = cy + R_pct * Math.sin(pStartRad);
    const tx2_p = cx + R_pct * Math.cos(pEndRad);
    const ty2_p = cy + R_pct * Math.sin(pEndRad);
    const textArcD_Pct = `M ${tx1_p.toFixed(2)} ${ty1_p.toFixed(2)} A ${R_pct.toFixed(2)} ${R_pct.toFixed(2)} 0 ${largeArcText} ${sweepFlag} ${tx2_p.toFixed(2)} ${ty2_p.toFixed(2)}`;

    const midRad = (midDeg * Math.PI) / 180;
    const x_donut = cx + R * Math.cos(midRad);
    const y_donut = cy + R * Math.sin(midRad);

    return {
      ...seg,
      pathD,
      textArcD_Name,
      textArcD_Pct,
      angleDeg,
      midDeg,
      x_donut,
      y_donut,
    };
  });
}

export const OrderDistributionPieChart: React.FC<OrderDistributionPieChartProps> = ({
  orders,
  totalOrdersCount,
  selectedOrderStatus,
  selectedPaymentStatus,
  onSelectOrderStatusFilter,
  onSelectPaymentStatusFilter,
}) => {
  const { width: windowWidth } = useWindowDimensions();
  const isMobile = windowWidth < 768;

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
        { id: 'empty1', label: 'No Orders', count: 0, color: '#CBD5E1', statusValue: 'None', icon: 'help-outline', path: path1, pct: '0', frac: 1, sweep: 2 * Math.PI },
        { id: 'empty2', label: 'No Orders', count: 0, color: '#CBD5E1', statusValue: 'None', icon: 'help-outline', path: path2, pct: '0', frac: 1, sweep: 2 * Math.PI },
      ];
    }

    const resultSlices: Array<typeof validSegs[0] & { path: string; frac: number; sweep: number }> = [];

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

        resultSlices.push({ ...seg, path: path1, frac, sweep });
        resultSlices.push({ ...seg, id: `${seg.id}_h2`, path: path2, frac, sweep });
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

        resultSlices.push({ ...seg, path, frac, sweep });
        startAngle = endAngle;
      }
    });

    return resultSlices;
  }, [formattedSegments, sliceTotal]);

  // Desktop Donut Arcs & Connector Line Coordinates (cx=220, cy=170, R=110, r=58)
  const { desktopArcs, leftSegments, rightSegments } = useMemo(() => {
    const cx = 220;
    const cy = 170;
    const R = 110;
    const r = 58;

    const arcItems = calculateDesktopDonutArcs(formattedSegments, sliceTotal, cx, cy, R, r);

    const half = Math.ceil(formattedSegments.length / 2);
    const leftRaw = formattedSegments.slice(0, half);
    const rightRaw = formattedSegments.slice(half);

    const getTargetY = (index: number, count: number) => {
      if (count === 3) return 100 + index * 70;
      if (count === 2) return 135 + index * 70;
      return 170;
    };

    const leftSegs = leftRaw.map((item, idx) => {
      const y_card = getTargetY(idx, leftRaw.length);
      const dy = y_card - cy;
      let x_donut = cx - R;
      let y_donut = y_card;
      if (Math.abs(dy) < R) {
        const dx = Math.sqrt(R * R - dy * dy);
        x_donut = cx - dx;
      }
      return { ...item, y_card, x_donut, y_donut };
    });

    const rightSegs = rightRaw.map((item, idx) => {
      const y_card = getTargetY(idx, rightRaw.length);
      const dy = y_card - cy;
      let x_donut = cx + R;
      let y_donut = y_card;
      if (Math.abs(dy) < R) {
        const dx = Math.sqrt(R * R - dy * dy);
        x_donut = cx + dx;
      }
      return { ...item, y_card, x_donut, y_donut };
    });

    return {
      desktopArcs: arcItems,
      leftSegments: leftSegs,
      rightSegments: rightSegs,
    };
  }, [formattedSegments, sliceTotal]);

  // Bar Chart calculations
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

  // Generate Desktop Donut SVG HTML for UniversalSvgChart
  const desktopSvgHtml = useMemo(() => {
    return `
      <svg width="440" height="340" viewBox="0 0 440 340" style="display:block;margin:auto;">
        <defs>
          ${desktopArcs.map((arc, index) => `
            <path id="deskTextPath_Name_${arc.id}_${index}" d="${arc.textArcD_Name}" />
            <path id="deskTextPath_Pct_${arc.id}_${index}" d="${arc.textArcD_Pct}" />
          `).join('')}
        </defs>

        ${leftSegments.map((seg) => {
          if (seg.count <= 0) return '';
          return `
            <g>
              <circle cx="${seg.x_donut}" cy="${seg.y_donut}" r="4.5" fill="${seg.color}" stroke="#FFFFFF" stroke-width="1.5" />
              <path d="M 0 ${seg.y_card} L ${seg.x_donut} ${seg.y_donut}" stroke="${seg.color}" stroke-width="2.5" opacity="0.9" fill="none" />
              <circle cx="4" cy="${seg.y_card}" r="4" fill="${seg.color}" />
            </g>
          `;
        }).join('')}

        ${rightSegments.map((seg) => {
          if (seg.count <= 0) return '';
          return `
            <g>
              <circle cx="${seg.x_donut}" cy="${seg.y_donut}" r="4.5" fill="${seg.color}" stroke="#FFFFFF" stroke-width="1.5" />
              <path d="M 440 ${seg.y_card} L ${seg.x_donut} ${seg.y_donut}" stroke="${seg.color}" stroke-width="2.5" opacity="0.9" fill="none" />
              <circle cx="436" cy="${seg.y_card}" r="4" fill="${seg.color}" />
            </g>
          `;
        }).join('')}

        ${desktopArcs.map((arc) => `
          <path d="${arc.pathD}" fill="${arc.color}" opacity="0.92" stroke="#FFFFFF" stroke-width="2" />
        `).join('')}

        ${desktopArcs.map((arc, index) => arc.angleDeg >= 14 ? `
          <text font-size="${arc.angleDeg < 25 ? '10' : '12'}" font-weight="bold" fill="#FFFFFF" text-anchor="middle" font-family="sans-serif">
            <textPath href="#deskTextPath_Name_${arc.id}_${index}" startOffset="50%">${arc.label}</textPath>
          </text>
          <text font-size="${arc.angleDeg < 25 ? '9.5' : '11'}" font-weight="600" fill="rgba(255, 255, 255, 0.95)" text-anchor="middle" font-family="sans-serif">
            <textPath href="#deskTextPath_Pct_${arc.id}_${index}" startOffset="50%">${arc.count} (${arc.pct}%)</textPath>
          </text>
        ` : '').join('')}

        <circle cx="220" cy="170" r="54" fill="#FFFFFF" />
        <text x="220" y="162" text-anchor="middle" font-size="24" font-weight="800" fill="#0F172A" font-family="sans-serif">${displayTotal}</text>
        <text x="220" y="180" text-anchor="middle" font-size="10" font-weight="600" fill="#64748B" font-family="sans-serif">Total Orders</text>
      </svg>
    `;
  }, [desktopArcs, leftSegments, rightSegments, displayTotal]);

  // Generate Bar SVG HTML
  const barSvgHtml = useMemo(() => {
    return `
      <svg width="860" height="250" viewBox="0 0 860 250" style="display:block;">
        <defs>
          ${barChartData.bars.map((bar) => `
            <linearGradient id="orderBarGrad_${bar.id}" x1="0" y1="0" x2="0" y2="1">
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
            <rect x="${bar.x}" y="${bar.y}" width="${bar.barWidth}" height="${Math.max(4, bar.barH)}" rx="6" ry="6" fill="url(#orderBarGrad_${bar.id})" opacity="0.9" />
            <text x="${bar.x + bar.barWidth / 2}" y="${Math.max(16, bar.y - 6)}" text-anchor="middle" font-size="11" font-weight="bold" fill="#475569" font-family="sans-serif">${bar.count}</text>
            <text x="${bar.x + bar.barWidth / 2}" y="${barChartData.paddingTop + barChartData.chartH + 18}" text-anchor="middle" font-size="12" font-weight="bold" fill="#475569" font-family="sans-serif">${bar.label}</text>
          </g>
        `).join('')}
      </svg>
    `;
  }, [barChartData]);

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
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={true}
          style={styles.chartContainer}
          contentContainerStyle={{ alignItems: 'center', justifyContent: 'center', minWidth: '100%' }}
        >
          {Platform.OS === 'web' ? (
            <svg width="860" height="250" viewBox="0 0 860 250" style={{ overflow: 'visible', maxWidth: '100%' }}>
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
                    <rect
                      x={bar.x}
                      y={bar.y}
                      width={bar.barWidth}
                      height={Math.max(4, bar.barH)}
                      rx="6"
                      ry="6"
                      fill={`url(#orderBarGrad_${bar.id})`}
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
      ) : isMobile ? (
        /* 📱 MOBILE VIEW: CENTERED DONUT CHART + RESPONSIVE STATUS CARDS GRID */
        <View style={styles.mobilePieContainer}>
          <View style={styles.mobileChartCenterWrapper}>
            {Platform.OS === 'web' ? (
              <svg width="280" height="280" viewBox="0 0 280 280" style={{ overflow: 'visible', margin: 'auto' }}>
                <g>
                  {mobilePieSlices.map((slice) => (
                    <path
                      key={`mob_web_slice_${slice.id}`}
                      d={slice.path}
                      fill={slice.color}
                      stroke="#FFFFFF"
                      strokeWidth="2.5"
                      opacity="0.95"
                      style={{ cursor: 'pointer' }}
                      onClick={() => {
                        if (chartMode === 'status') {
                          onSelectOrderStatusFilter(slice.statusValue);
                        } else {
                          onSelectPaymentStatusFilter(slice.statusValue);
                        }
                      }}
                    />
                  ))}
                </g>
              </svg>
            ) : (
              <UniversalSvgChart height={280} svgHtml={mobileSvgHtml} />
            )}

            {/* Center Summary Overlay */}
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

          {/* Mobile Status Cards Grid */}
          <View style={styles.mobileLegendGrid}>
            {formattedSegments.map((seg) => {
              const isSelected =
                chartMode === 'status'
                  ? selectedOrderStatus === seg.statusValue
                  : selectedPaymentStatus === seg.statusValue;

              return (
                <TouchableOpacity
                  key={`mob_card_${seg.id}`}
                  style={[
                    styles.mobileLegendCard,
                    isSelected && styles.legendCardActive,
                    { borderLeftColor: seg.color, borderLeftWidth: 4 },
                  ]}
                  onPress={() => {
                    if (chartMode === 'status') {
                      onSelectOrderStatusFilter(seg.statusValue);
                    } else {
                      onSelectPaymentStatusFilter(seg.statusValue);
                    }
                  }}
                  activeOpacity={0.8}
                >
                  <View style={[styles.colorBadgeCircle, { backgroundColor: seg.color }]}>
                    <MaterialIcons name={seg.icon as any} size={13} color="#FFF" />
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
      ) : (
        /* 💻 DESKTOP VIEW: 3-COLUMN LAYOUT WITH CONNECTOR LINES & STATUS CARDS */
        <View style={styles.pieLayoutRow}>
          {/* 👈 LEFT SIDE STATUS CARDS */}
          <View style={styles.sideColumn}>
            {leftSegments.map((seg) => {
              const isSelected =
                chartMode === 'status'
                  ? selectedOrderStatus === seg.statusValue
                  : selectedPaymentStatus === seg.statusValue;
              const isHovered = hoveredSegment === seg.id;

              return (
                <TouchableOpacity
                  key={`left_card_${seg.id}`}
                  style={[
                    styles.sideLegendCard,
                    (isSelected || isHovered) && styles.legendCardActive,
                    { borderLeftColor: seg.color, borderLeftWidth: 4 },
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
                    <MaterialIcons name={seg.icon as any} size={13} color="#FFF" />
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

          {/* 🎯 CENTER SVG DONUT CHART WITH CONNECTOR LINES */}
          <View style={styles.chartCenterWrapper}>
            {Platform.OS === 'web' ? (
              <svg width="440" height="340" viewBox="0 0 440 340" style={{ overflow: 'visible', margin: 'auto' }}>
                <defs>
                  {desktopArcs.map((arc, index) => (
                    <React.Fragment key={`def_order_frag_${arc.id}_${index}`}>
                      <path id={`orderTextPath_Name_${arc.id}_${index}`} d={arc.textArcD_Name} />
                      <path id={`orderTextPath_Pct_${arc.id}_${index}`} d={arc.textArcD_Pct} />
                    </React.Fragment>
                  ))}
                </defs>

                {/* Left Connector Lines */}
                {leftSegments.map((seg) => {
                  if (seg.count <= 0) return null;
                  const isHovered = hoveredSegment === seg.id;
                  const isSelected =
                    chartMode === 'status'
                      ? selectedOrderStatus === seg.statusValue
                      : selectedPaymentStatus === seg.statusValue;
                  return (
                    <g key={`line_left_${seg.id}`}>
                      <circle cx={seg.x_donut} cy={seg.y_donut} r="4.5" fill={seg.color} stroke="#FFFFFF" strokeWidth="1.5" />
                      <path
                        d={`M 0 ${seg.y_card} L ${seg.x_donut} ${seg.y_donut}`}
                        stroke={seg.color}
                        strokeWidth={isHovered || isSelected ? '3.5' : '2.5'}
                        opacity={isHovered || isSelected ? 1 : 0.9}
                        fill="none"
                      />
                      <circle cx="4" cy={seg.y_card} r="4" fill={seg.color} />
                    </g>
                  );
                })}

                {/* Right Connector Lines */}
                {rightSegments.map((seg) => {
                  if (seg.count <= 0) return null;
                  const isHovered = hoveredSegment === seg.id;
                  const isSelected =
                    chartMode === 'status'
                      ? selectedOrderStatus === seg.statusValue
                      : selectedPaymentStatus === seg.statusValue;
                  return (
                    <g key={`line_right_${seg.id}`}>
                      <circle cx={seg.x_donut} cy={seg.y_donut} r="4.5" fill={seg.color} stroke="#FFFFFF" strokeWidth="1.5" />
                      <path
                        d={`M 440 ${seg.y_card} L ${seg.x_donut} ${seg.y_donut}`}
                        stroke={seg.color}
                        strokeWidth={isHovered || isSelected ? '3.5' : '2.5'}
                        opacity={isHovered || isSelected ? 1 : 0.9}
                        fill="none"
                      />
                      <circle cx="436" cy={seg.y_card} r="4" fill={seg.color} />
                    </g>
                  );
                })}

                {/* Donut Slices */}
                {desktopArcs.map((arc) => {
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
                        transformOrigin: '220px 170px',
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

                {/* Curved Text Labels inside slices */}
                {desktopArcs.map((arc, index) => {
                  if (arc.angleDeg < 14) return null;
                  return (
                    <g key={`order_text_group_${arc.id}_${index}`}>
                      <text style={{ fontSize: arc.angleDeg < 25 ? '10px' : '12px', fontWeight: 'bold', fill: '#FFFFFF', pointerEvents: 'none' }}>
                        <textPath href={`#orderTextPath_Name_${arc.id}_${index}`} startOffset="50%" textAnchor="middle">
                          {arc.label}
                        </textPath>
                      </text>
                      <text style={{ fontSize: arc.angleDeg < 25 ? '9.5px' : '11px', fontWeight: '600', fill: 'rgba(255, 255, 255, 0.95)', pointerEvents: 'none' }}>
                        <textPath href={`#orderTextPath_Pct_${arc.id}_${index}`} startOffset="50%" textAnchor="middle">
                          {`${arc.count} (${arc.pct}%)`}
                        </textPath>
                      </text>
                    </g>
                  );
                })}
              </svg>
            ) : (
              <UniversalSvgChart height={340} svgHtml={desktopSvgHtml} />
            )}

            {/* Donut Center Summary */}
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

          {/* 👉 RIGHT SIDE STATUS CARDS */}
          <View style={styles.sideColumn}>
            {rightSegments.map((seg) => {
              const isSelected =
                chartMode === 'status'
                  ? selectedOrderStatus === seg.statusValue
                  : selectedPaymentStatus === seg.statusValue;
              const isHovered = hoveredSegment === seg.id;

              return (
                <TouchableOpacity
                  key={`right_card_${seg.id}`}
                  style={[
                    styles.sideLegendCard,
                    (isSelected || isHovered) && styles.legendCardActive,
                    { borderLeftColor: seg.color, borderLeftWidth: 4 },
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
                    <MaterialIcons name={seg.icon as any} size={13} color="#FFF" />
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
      )}
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
    height: 270,
    marginVertical: Spacing.xs,
  },
  mobilePieContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    width: '100%',
    paddingVertical: Spacing.xs,
  },
  mobileChartCenterWrapper: {
    position: 'relative',
    width: 280,
    height: 280,
    alignItems: 'center',
    justifyContent: 'center',
  },
  mobileLegendGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginTop: Spacing.md,
    width: '100%',
  },
  mobileLegendCard: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 10,
    borderRadius: BorderRadius.lg,
    backgroundColor: Colors.surfaceContainerLow,
    borderWidth: 1,
    borderColor: Colors.surfaceContainerHigh,
    gap: 8,
    width: '48%',
    minWidth: 140,
    flexGrow: 1,
  },
  pieLayoutRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    flexWrap: 'wrap',
    gap: 12,
    marginVertical: Spacing.xs,
    width: '100%',
  },
  sideColumn: {
    flex: 1,
    minWidth: 160,
    gap: 16,
    justifyContent: 'center',
  },
  chartCenterWrapper: {
    position: 'relative',
    width: 440,
    height: 340,
    alignItems: 'center',
    justifyContent: 'center',
  },
  sideLegendCard: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 10,
    borderRadius: BorderRadius.lg,
    backgroundColor: Colors.surfaceContainerLow,
    borderWidth: 1,
    borderColor: Colors.surfaceContainerHigh,
    gap: 8,
    width: '100%',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04,
    shadowRadius: 2,
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
});

export default OrderDistributionPieChart;
