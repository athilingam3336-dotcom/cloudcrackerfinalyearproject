import React, { useMemo } from 'react';
import { View, Text, StyleSheet, Modal, TouchableOpacity, ScrollView, Platform, ActivityIndicator } from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { formatCurrency } from '@/utils/currency';
import { BusinessAnalyticsData, TodayReportData } from '@/services/adminService';

interface DailyBusinessReportModalProps {
  visible: boolean;
  onClose: () => void;
  analyticsData: BusinessAnalyticsData | null;
  todayReport: TodayReportData | null;
  isLoading: boolean;
  onDownloadPdf: () => void;
  onEmailReport: () => void;
  isDownloading: boolean;
  isEmailing: boolean;
}

const BRAND_RED = '#E63946';
const SUCCESS_GREEN = '#2E7D32';

export const DailyBusinessReportModal: React.FC<DailyBusinessReportModalProps> = ({
  visible,
  onClose,
  analyticsData,
  todayReport,
  isLoading,
  onDownloadPdf,
  onEmailReport,
  isDownloading,
  isEmailing,
}) => {

  const reportDate = new Date();
  
  // Custom hook logic directly in useMemo to process today's data
  const reportData = useMemo(() => {
    const rawOrders = analyticsData?.rawOrders || [];
    const todayStr = reportDate.toISOString().slice(0, 10);
    const todayOrders = rawOrders.filter(o => {
      const d = new Date(o.created_at || o.date);
      if (isNaN(d.getTime())) return false;
      return d.toISOString().slice(0, 10) === todayStr;
    });

    // 1. TODAY AT A GLANCE
    const todayRevenue = todayOrders.reduce((sum, o) => sum + (o.total || o.totalAmount || 0), 0);
    const orderCount = todayOrders.length;
    const avgOrderValue = orderCount > 0 ? todayRevenue / orderCount : 0;
    const uniqueUserIds = new Set(todayOrders.map(o => o.user_id || o.customerName || o.customerEmail).filter(Boolean));
    const customerCount = uniqueUserIds.size;

    // 2. SALES PERFORMANCE (Hourly)
    const hourlySales = Array(24).fill(0);
    todayOrders.forEach(o => {
      const d = new Date(o.created_at || o.date);
      if (!isNaN(d.getTime())) {
        hourlySales[d.getHours()] += (o.total || o.totalAmount || 0);
      }
    });
    const maxHourSales = Math.max(...hourlySales, 100);

    // 3. ORDER PERFORMANCE
    let completed = 0, pending = 0, cancelled = 0;
    todayOrders.forEach(o => {
      const st = (o.status || o.order_status || '').toLowerCase();
      if (st.includes('deliver') || st.includes('complet')) completed++;
      else if (st.includes('cancel')) cancelled++;
      else pending++;
    });
    const completionRate = orderCount > 0 ? (completed / orderCount) * 100 : 0;

    // 4. TOP DELIVERY AREAS
    const areaMap: Record<string, { orders: number; revenue: number }> = {};
    todayOrders.forEach(o => {
      const area = o.shippingAddress?.city || o.shippingAddress?.state || o.city || o.state || 'Other';
      if (!areaMap[area]) areaMap[area] = { orders: 0, revenue: 0 };
      areaMap[area].orders++;
      areaMap[area].revenue += (o.total || o.totalAmount || 0);
    });
    const topAreas = Object.entries(areaMap)
      .map(([name, data]) => ({ name, ...data }))
      .sort((a, b) => b.revenue - a.revenue)
      .slice(0, 5);

    // 5. INVENTORY HEALTH & TOP SELLING PRODUCTS
    const stockList = todayReport?.stock_inventory_list || [];
    let healthyStock = 0, lowStock = 0, outOfStock = 0;
    const lowStockAlerts: any[] = [];
    
    stockList.forEach(stk => {
      if (stk.status === 'Out of Stock') {
        outOfStock++;
        lowStockAlerts.push(stk);
      }
      else if (stk.status === 'Low Stock') {
        lowStock++;
        lowStockAlerts.push(stk);
      }
      else healthyStock++;
    });

    const topProducts = [...stockList]
      .filter(p => (p.sold_today || 0) > 0)
      .sort((a, b) => (b.sold_today || 0) - (a.sold_today || 0))
      .slice(0, 5);

    // 6. CUSTOMER ACTIVITY (Estimate new vs returning from 1000 order history)
    let newCustomers = 0, returningCustomers = 0;
    if (uniqueUserIds.size > 0 && rawOrders.length > 0) {
      uniqueUserIds.forEach(uid => {
        // Did they order before today?
        const priorOrders = rawOrders.filter(o => {
           const d = new Date(o.created_at || o.date);
           return (o.user_id === uid || o.customerName === uid) && d.toISOString().slice(0, 10) < todayStr;
        });
        if (priorOrders.length > 0) returningCustomers++;
        else newCustomers++;
      });
    }

    // 7. KEY INSIGHTS & ACTIONS
    const insights = [];
    const actions = [];
    
    if (orderCount > 0) {
      const peakHour = hourlySales.indexOf(Math.max(...hourlySales));
      const period = peakHour >= 12 ? 'PM' : 'AM';
      const h12 = peakHour % 12 || 12;
      insights.push(`Peak sales happened at ${h12} ${period} with ${formatCurrency(hourlySales[peakHour])} in revenue.`);
      
      if (topAreas.length > 0) {
        insights.push(`Top performing delivery area is ${topAreas[0].name} contributing ${formatCurrency(topAreas[0].revenue)}.`);
      }
      if (topProducts.length > 0) {
        insights.push(`${topProducts[0].name} is the best-selling item today (${topProducts[0].sold_today} units).`);
      }
    } else {
      insights.push("No sales activity recorded for today yet.");
    }

    if (pending > 0) actions.push(`${pending} orders are currently pending. Review fulfillment.`);
    if (outOfStock > 0) actions.push(`${outOfStock} items are fully out of stock. Immediate restock required.`);
    else if (lowStock > 0) actions.push(`${lowStock} items are running low. Consider replenishing inventory.`);
    if (cancelled > 0) actions.push(`${cancelled} orders were cancelled today. Investigate underlying reasons.`);

    return {
      todayRevenue, orderCount, avgOrderValue, customerCount,
      hourlySales, maxHourSales,
      completed, pending, cancelled, completionRate,
      topAreas, topProducts,
      healthyStock, lowStock, outOfStock, lowStockAlerts,
      newCustomers, returningCustomers,
      insights, actions,
      stockList
    };
  }, [analyticsData, todayReport]);

  if (!visible) return null;

  return (
    <Modal visible={visible} animationType="slide" transparent>
      <View style={styles.modalOverlay}>
        
        {/* Render a specific style block to target print CSS */}
        {Platform.OS === 'web' && (
          <style>{`
            @media print {
              body * {
                visibility: hidden;
              }
              #printable-report, #printable-report * {
                visibility: visible;
              }
              #printable-report {
                position: absolute;
                left: 0;
                top: 0;
                width: 100%;
                margin: 0;
                padding: 10mm;
                background-color: white !important;
                -webkit-print-color-adjust: exact; 
                print-color-adjust: exact;
              }
              /* Hide action buttons during print */
              #action-header {
                display: none !important;
              }
              /* Ensure the scroll container expands fully */
              #scroll-container {
                overflow: visible !important;
                height: auto !important;
              }
            }
          `}</style>
        )}

        <View style={styles.modalContentWrapper}>
          {/* Non-printable action header */}
          <View style={[styles.actionHeader, { paddingRight: 16 }]} nativeID="action-header">
            <View style={{ flexDirection: 'row', gap: 12 }}>
              <TouchableOpacity style={styles.btnPrimary} onPress={onDownloadPdf} disabled={isDownloading}>
                <MaterialIcons name="picture-as-pdf" size={20} color="#fff" />
                <Text style={styles.btnText}>{isDownloading ? 'Generating...' : 'Download PDF'}</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.btnSecondary} onPress={onEmailReport} disabled={isEmailing}>
                <MaterialIcons name="email" size={20} color="#fff" />
                <Text style={styles.btnText}>{isEmailing ? 'Sending...' : 'Email Report'}</Text>
              </TouchableOpacity>
            </View>
            <TouchableOpacity onPress={onClose} style={{ padding: 8 }}>
              <MaterialIcons name="close" size={28} color="#333" />
            </TouchableOpacity>
          </View>

          {isLoading ? (
             <View style={{ padding: 40, alignItems: 'center' }}>
               <ActivityIndicator size="large" color={BRAND_RED} />
               <Text style={{ marginTop: 12, color: '#666' }}>Processing Report Data...</Text>
             </View>
          ) : (
            <ScrollView 
              nativeID="scroll-container"
              style={{ flex: 1, backgroundColor: '#fff' }} 
              contentContainerStyle={{ padding: 40 }}
              showsVerticalScrollIndicator={false}
            >
              <View nativeID="printable-report">
                
                {/* 1. REPORT HEADER */}
                <View style={styles.headerBox}>
                  <View>
                    <Text style={styles.brandTitle}>MEERA CRACKERS</Text>
                    <Text style={styles.brandSub}>Sivakasi Pyrotechnics Store</Text>
                  </View>
                  <View style={{ alignItems: 'flex-end' }}>
                    <Text style={styles.docTitle}>DAILY BUSINESS REPORT</Text>
                    <Text style={styles.docMeta}>Date: {reportDate.toLocaleDateString('en-IN')}</Text>
                    <Text style={styles.docMeta}>Time: {reportDate.toLocaleTimeString('en-IN')}</Text>
                  </View>
                </View>

                {/* 2. TODAY AT A GLANCE */}
                <Text style={styles.sectionTitle}>TODAY AT A GLANCE</Text>
                <View style={styles.kpiRow}>
                  <View style={styles.kpiCard}>
                    <Text style={styles.kpiLabel}>Today's Revenue</Text>
                    <Text style={[styles.kpiVal, { color: BRAND_RED }]}>{formatCurrency(reportData.todayRevenue)}</Text>
                  </View>
                  <View style={styles.kpiCard}>
                    <Text style={styles.kpiLabel}>Today's Orders</Text>
                    <Text style={styles.kpiVal}>{reportData.orderCount}</Text>
                  </View>
                  <View style={styles.kpiCard}>
                    <Text style={styles.kpiLabel}>Avg Order Value</Text>
                    <Text style={styles.kpiVal}>{formatCurrency(reportData.avgOrderValue)}</Text>
                  </View>
                  <View style={styles.kpiCard}>
                    <Text style={styles.kpiLabel}>Customers</Text>
                    <Text style={styles.kpiVal}>{reportData.customerCount}</Text>
                  </View>
                </View>

                {/* TWO COLUMN LAYOUT for Charts */}
                <View style={styles.rowWrapper}>
                  {/* 3. SALES PERFORMANCE */}
                  <View style={[styles.colHalf, { paddingRight: 12 }]}>
                    <Text style={styles.sectionTitle}>SALES PERFORMANCE (Hourly)</Text>
                    <View style={styles.chartBox}>
                       {Platform.OS === 'web' ? (
                         // @ts-ignore
                         <svg width="100%" height="180" viewBox="0 0 400 180" style={{ overflow: 'visible' }}>
                           <defs>
                             <linearGradient id="hourGrad" x1="0" y1="0" x2="0" y2="1">
                               <stop offset="0%" stopColor={BRAND_RED} stopOpacity="0.2" />
                               <stop offset="100%" stopColor={BRAND_RED} stopOpacity="0" />
                             </linearGradient>
                           </defs>
                           {/* Grid */}
                           <line x1="30" y1="20" x2="380" y2="20" stroke="#E2E8F0" strokeDasharray="3 3"/>
                           <line x1="30" y1="80" x2="380" y2="80" stroke="#E2E8F0" strokeDasharray="3 3"/>
                           <line x1="30" y1="140" x2="380" y2="140" stroke="#CBD5E1"/>
                           
                           {/* Axis Labels */}
                           <text x="25" y="24" fontSize="10" fill="#64748B" textAnchor="end">{formatCurrency(reportData.maxHourSales).replace('₹','')}</text>
                           <text x="25" y="84" fontSize="10" fill="#64748B" textAnchor="end">{formatCurrency(reportData.maxHourSales/2).replace('₹','')}</text>
                           <text x="25" y="144" fontSize="10" fill="#64748B" textAnchor="end">0</text>
                           
                           {/* Data Path */}
                           {(() => {
                              const points = reportData.hourlySales.map((val, i) => {
                                const x = 30 + (i/23) * 350;
                                const y = 140 - (val / reportData.maxHourSales) * 120;
                                return `${x},${y}`;
                              });
                              const d = `M ${points[0]} ` + points.slice(1).map(p => `L ${p}`).join(' ');
                              const areaD = `${d} L 380,140 L 30,140 Z`;
                              
                              return (
                                <>
                                  <path d={areaD} fill="url(#hourGrad)" />
                                  <path d={d} fill="none" stroke={BRAND_RED} strokeWidth="2" />
                                </>
                              );
                           })()}
                           
                           {/* X Axis */}
                           <text x="30" y="156" fontSize="9" fill="#94A3B8" textAnchor="middle">12am</text>
                           <text x="117" y="156" fontSize="9" fill="#94A3B8" textAnchor="middle">6am</text>
                           <text x="205" y="156" fontSize="9" fill="#94A3B8" textAnchor="middle">12pm</text>
                           <text x="292" y="156" fontSize="9" fill="#94A3B8" textAnchor="middle">6pm</text>
                           <text x="380" y="156" fontSize="9" fill="#94A3B8" textAnchor="middle">11pm</text>
                         </svg>
                       ) : <Text>Web Only</Text>}
                    </View>
                  </View>

                  {/* 4. ORDER PERFORMANCE */}
                  <View style={[styles.colHalf, { paddingLeft: 12 }]}>
                    <Text style={styles.sectionTitle}>ORDER PERFORMANCE</Text>
                    <View style={styles.chartBox}>
                       <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 12 }}>
                          <View>
                            <Text style={styles.statLabel}>Completed</Text>
                            <Text style={[styles.statVal, { color: SUCCESS_GREEN }]}>{reportData.completed}</Text>
                          </View>
                          <View>
                            <Text style={styles.statLabel}>Pending</Text>
                            <Text style={[styles.statVal, { color: '#F59E0B' }]}>{reportData.pending}</Text>
                          </View>
                          <View>
                            <Text style={styles.statLabel}>Cancelled</Text>
                            <Text style={[styles.statVal, { color: BRAND_RED }]}>{reportData.cancelled}</Text>
                          </View>
                       </View>
                       
                       <View style={styles.progressBarBg}>
                         <View style={[styles.progressBarFill, { backgroundColor: SUCCESS_GREEN, width: `${reportData.completionRate}%` }]} />
                         {reportData.pending > 0 && <View style={[styles.progressBarFill, { backgroundColor: '#F59E0B', width: `${(reportData.pending / Math.max(reportData.orderCount, 1)) * 100}%` }]} />}
                       </View>
                       <Text style={{ fontSize: 12, color: '#64748B', marginTop: 8, textAlign: 'center' }}>
                         {reportData.completionRate.toFixed(1)}% Completion Rate
                       </Text>
                    </View>
                  </View>
                </View>

                {/* TWO COLUMN LAYOUT for Tops */}
                <View style={styles.rowWrapper}>
                  {/* 5. TOP SELLING PRODUCTS */}
                  <View style={[styles.colHalf, { paddingRight: 12 }]}>
                    <Text style={styles.sectionTitle}>TOP SELLING PRODUCTS</Text>
                    <View style={styles.listBox}>
                      {reportData.topProducts.length === 0 ? (
                        <Text style={styles.emptyText}>No products sold today.</Text>
                      ) : (
                        reportData.topProducts.map((p, i) => (
                          <View key={p.id} style={styles.listItem}>
                            <Text style={styles.listNum}>{i+1}.</Text>
                            <Text style={styles.listName} numberOfLines={1}>{p.name}</Text>
                            <Text style={styles.listRight}>{p.sold_today} units</Text>
                          </View>
                        ))
                      )}
                    </View>
                  </View>

                  {/* 6. TOP DELIVERY AREAS */}
                  <View style={[styles.colHalf, { paddingLeft: 12 }]}>
                    <Text style={styles.sectionTitle}>TOP DELIVERY AREAS</Text>
                    <View style={styles.listBox}>
                      {reportData.topAreas.length === 0 ? (
                        <Text style={styles.emptyText}>No delivery data today.</Text>
                      ) : (
                        reportData.topAreas.map((a, i) => (
                          <View key={i} style={styles.listItem}>
                            <Text style={styles.listNum}>{i+1}.</Text>
                            <Text style={styles.listName} numberOfLines={1}>{a.name}</Text>
                            <Text style={styles.listRight}>{formatCurrency(a.revenue)}</Text>
                          </View>
                        ))
                      )}
                    </View>
                  </View>
                </View>

                <View style={styles.rowWrapper}>
                  {/* 7. INVENTORY HEALTH */}
                  <View style={[styles.colHalf, { paddingRight: 12 }]}>
                    <Text style={styles.sectionTitle}>INVENTORY HEALTH</Text>
                    <View style={[styles.chartBox, { padding: 16 }]}>
                      <View style={{ flexDirection: 'row', gap: 12, marginBottom: 16 }}>
                        <View style={[styles.invPill, { backgroundColor: '#E8F5E9' }]}>
                          <Text style={[styles.invPillText, { color: SUCCESS_GREEN }]}>{reportData.healthyStock} Healthy</Text>
                        </View>
                        <View style={[styles.invPill, { backgroundColor: '#FFF3E0' }]}>
                          <Text style={[styles.invPillText, { color: '#E65100' }]}>{reportData.lowStock} Low</Text>
                        </View>
                        <View style={[styles.invPill, { backgroundColor: '#FFEBEE' }]}>
                          <Text style={[styles.invPillText, { color: BRAND_RED }]}>{reportData.outOfStock} Out</Text>
                        </View>
                      </View>
                      
                      {reportData.lowStockAlerts.length > 0 ? (
                        <View>
                          <Text style={{ fontSize: 13, fontFamily: 'Inter-SemiBold', color: '#333', marginBottom: 8 }}>Critical Alerts (Top 3):</Text>
                          {reportData.lowStockAlerts.slice(0, 3).map(stk => (
                            <Text key={stk.id} style={{ fontSize: 12, color: BRAND_RED, marginBottom: 4 }}>
                              • {stk.name} ({stk.stock_left} left)
                            </Text>
                          ))}
                        </View>
                      ) : (
                        <Text style={styles.emptyText}>Inventory is well stocked.</Text>
                      )}
                    </View>
                  </View>

                  {/* 8. CUSTOMER ACTIVITY */}
                  <View style={[styles.colHalf, { paddingLeft: 12 }]}>
                    <Text style={styles.sectionTitle}>CUSTOMER ACTIVITY</Text>
                    <View style={styles.chartBox}>
                      <View style={{ flexDirection: 'row', justifyContent: 'space-around', alignItems: 'center', height: '100%' }}>
                        <View style={{ alignItems: 'center' }}>
                          <Text style={{ fontSize: 32, fontFamily: 'Inter-Bold', color: '#1565C0' }}>{reportData.newCustomers}</Text>
                          <Text style={styles.statLabel}>New Today</Text>
                        </View>
                        <View style={{ height: 40, width: 1, backgroundColor: '#E2E8F0' }} />
                        <View style={{ alignItems: 'center' }}>
                          <Text style={{ fontSize: 32, fontFamily: 'Inter-Bold', color: SUCCESS_GREEN }}>{reportData.returningCustomers}</Text>
                          <Text style={styles.statLabel}>Returning</Text>
                        </View>
                      </View>
                    </View>
                  </View>
                </View>

                {/* 9 & 10. INSIGHTS & ACTIONS */}
                <View style={styles.rowWrapper}>
                  <View style={[styles.colHalf, { paddingRight: 12 }]}>
                    <Text style={styles.sectionTitle}>KEY BUSINESS INSIGHTS</Text>
                    <View style={[styles.insightBox, { backgroundColor: '#F8FAFC', borderColor: '#E2E8F0' }]}>
                      {reportData.insights.map((ins, i) => (
                        <Text key={i} style={styles.insightText}>• {ins}</Text>
                      ))}
                    </View>
                  </View>
                  <View style={[styles.colHalf, { paddingLeft: 12 }]}>
                    <Text style={styles.sectionTitle}>ACTION REQUIRED</Text>
                    <View style={[styles.insightBox, { backgroundColor: '#FFF5F5', borderColor: '#FECACA' }]}>
                      {reportData.actions.length > 0 ? reportData.actions.map((act, i) => (
                        <Text key={i} style={[styles.insightText, { color: '#991B1B' }]}>⚠️ {act}</Text>
                      )) : (
                        <Text style={[styles.insightText, { color: SUCCESS_GREEN }]}>✓ All caught up! No urgent actions required.</Text>
                      )}
                    </View>
                  </View>
                </View>

                {/* 11. DETAILED INVENTORY TABLE */}
                <Text style={[styles.sectionTitle, { marginTop: 20 }]}>DETAILED INVENTORY</Text>
                <View style={styles.table}>
                  <View style={styles.tableHeader}>
                    <Text style={[styles.th, { flex: 3 }]}>Product Name</Text>
                    <Text style={[styles.th, { flex: 2 }]}>Category</Text>
                    <Text style={[styles.th, { flex: 1, textAlign: 'right' }]}>Stock</Text>
                    <Text style={[styles.th, { flex: 1, textAlign: 'right' }]}>Sold</Text>
                    <Text style={[styles.th, { flex: 1.5, textAlign: 'right' }]}>Status</Text>
                  </View>
                  {reportData.stockList.length > 0 ? (
                    reportData.stockList.map((stk, i) => (
                      <View key={stk.id} style={[styles.tableRow, i % 2 !== 0 && { backgroundColor: '#F8FAFC' }]}>
                        <Text style={[styles.td, { flex: 3 }]} numberOfLines={1}>{stk.name}</Text>
                        <Text style={[styles.td, { flex: 2 }]} numberOfLines={1}>{stk.category_name}</Text>
                        <Text style={[styles.td, { flex: 1, textAlign: 'right' }]}>{stk.stock_left}</Text>
                        <Text style={[styles.td, { flex: 1, textAlign: 'right' }]}>{stk.sold_today}</Text>
                        <Text style={[styles.td, { flex: 1.5, textAlign: 'right', color: stk.status === 'Out of Stock' ? BRAND_RED : stk.status === 'Low Stock' ? '#E65100' : SUCCESS_GREEN }]}>
                          {stk.status}
                        </Text>
                      </View>
                    ))
                  ) : (
                    <Text style={[styles.emptyText, { padding: 16 }]}>No inventory data available.</Text>
                  )}
                </View>

                {/* FOOTER */}
                <View style={styles.footer}>
                  <Text style={styles.footerText}>Generated from Meera Crackers Admin Dashboard</Text>
                  <Text style={styles.footerText}>Page 1</Text>
                </View>

              </View>
            </ScrollView>
          )}
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.6)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContentWrapper: {
    width: '95%',
    maxWidth: 900,
    height: '90%',
    backgroundColor: '#fff',
    borderRadius: 12,
    overflow: 'hidden',
  },
  actionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#F8FAFC',
    borderBottomWidth: 1,
    borderColor: '#E2E8F0',
    padding: 12,
  },
  btnPrimary: {
    backgroundColor: BRAND_RED,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 6,
    gap: 8
  },
  btnSecondary: {
    backgroundColor: SUCCESS_GREEN,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 6,
    gap: 8
  },
  btnText: {
    color: '#fff',
    fontFamily: 'Inter-SemiBold',
    fontSize: 14,
  },
  headerBox: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    borderBottomWidth: 2,
    borderColor: BRAND_RED,
    paddingBottom: 16,
    marginBottom: 24,
  },
  brandTitle: {
    fontSize: 24,
    fontFamily: 'Inter-Bold',
    color: BRAND_RED,
    letterSpacing: -0.5,
  },
  brandSub: {
    fontSize: 14,
    color: '#64748B',
    fontFamily: 'Inter-Medium',
  },
  docTitle: {
    fontSize: 20,
    fontFamily: 'Inter-Bold',
    color: '#1E293B',
    marginBottom: 4,
  },
  docMeta: {
    fontSize: 12,
    color: '#64748B',
  },
  sectionTitle: {
    fontSize: 14,
    fontFamily: 'Inter-Bold',
    color: '#334155',
    marginBottom: 12,
    letterSpacing: 0.5,
  },
  rowWrapper: {
    flexDirection: 'row',
    marginBottom: 24,
  },
  colHalf: {
    flex: 1,
  },
  kpiRow: {
    flexDirection: 'row',
    gap: 16,
    marginBottom: 28,
  },
  kpiCard: {
    flex: 1,
    backgroundColor: '#F8FAFC',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    borderRadius: 8,
    padding: 16,
  },
  kpiLabel: {
    fontSize: 12,
    color: '#64748B',
    fontFamily: 'Inter-Medium',
    marginBottom: 8,
  },
  kpiVal: {
    fontSize: 22,
    fontFamily: 'Inter-Bold',
    color: '#1E293B',
  },
  chartBox: {
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    borderRadius: 8,
    padding: 12,
    height: 180,
  },
  statLabel: {
    fontSize: 12,
    color: '#64748B',
    marginBottom: 4,
  },
  statVal: {
    fontSize: 20,
    fontFamily: 'Inter-Bold',
  },
  progressBarBg: {
    height: 12,
    backgroundColor: '#F1F5F9',
    borderRadius: 6,
    flexDirection: 'row',
    overflow: 'hidden',
    marginTop: 16,
  },
  progressBarFill: {
    height: '100%',
  },
  listBox: {
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    borderRadius: 8,
    padding: 12,
    height: 180,
  },
  listItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderColor: '#F1F5F9',
  },
  listNum: {
    width: 24,
    fontSize: 13,
    color: '#94A3B8',
    fontFamily: 'Inter-Medium',
  },
  listName: {
    flex: 1,
    fontSize: 13,
    color: '#334155',
    fontFamily: 'Inter-Medium',
  },
  listRight: {
    fontSize: 13,
    color: '#1E293B',
    fontFamily: 'Inter-SemiBold',
  },
  emptyText: {
    fontSize: 13,
    color: '#94A3B8',
    fontStyle: 'italic',
    textAlign: 'center',
    marginTop: 20,
  },
  invPill: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
  },
  invPillText: {
    fontSize: 12,
    fontFamily: 'Inter-SemiBold',
  },
  insightBox: {
    borderWidth: 1,
    borderRadius: 8,
    padding: 16,
    height: 140,
  },
  insightText: {
    fontSize: 13,
    fontFamily: 'Inter-Medium',
    color: '#334155',
    marginBottom: 8,
    lineHeight: 20,
  },
  table: {
    borderWidth: 1,
    borderColor: '#E2E8F0',
    borderRadius: 8,
    overflow: 'hidden',
    marginBottom: 24,
  },
  tableHeader: {
    flexDirection: 'row',
    backgroundColor: '#F1F5F9',
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderBottomWidth: 1,
    borderColor: '#E2E8F0',
  },
  th: {
    fontSize: 12,
    fontFamily: 'Inter-SemiBold',
    color: '#64748B',
  },
  tableRow: {
    flexDirection: 'row',
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderBottomWidth: 1,
    borderColor: '#F1F5F9',
  },
  td: {
    fontSize: 13,
    fontFamily: 'Inter-Medium',
    color: '#334155',
  },
  footer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    borderTopWidth: 1,
    borderColor: '#E2E8F0',
    paddingTop: 16,
    marginTop: 24,
  },
  footerText: {
    fontSize: 11,
    color: '#94A3B8',
  }
});
