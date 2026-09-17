import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Image,
  TouchableOpacity,
  Alert,
  Platform,
  TextInput,
  ActivityIndicator,
  Linking,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { MaterialIcons } from '@expo/vector-icons';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { Colors } from '@/constants/colors';
import { Typography } from '@/constants/typography';
import { Spacing, BorderRadius } from '@/constants/spacing';
import { HomeHeader } from '@/components/common/HomeHeader';
import { PrimaryButton } from '@/components/buttons/PrimaryButton';
import { BottomNavBar, TabRoute } from '@/components/common/BottomNavBar';
import { LoadingSpinner } from '@/components/loaders/LoadingSpinner';
import { orderService, OrderRecord } from '@/services/orderService';
import { useNotificationStore } from '@/store';
import { RootStackParamList } from '@/navigation/types';
import { formatCurrency } from '@/utils/currency';
import { resolveProductImage } from '@/constants/productImages';
import { downloadCustomerOrderInvoicePdf } from '@/utils/invoiceGenerator';
import { paymentService } from '@/services/paymentService';
import { ResponsiveContainer } from '@/components/common/ResponsiveContainer';

import { useSmartTabNavigation } from '@/hooks/useSmartTabNavigation';

type OrderDetailsScreenProps = NativeStackScreenProps<
  RootStackParamList,
  'OrderDetails'
>;

export const OrderDetailsScreen: React.FC<OrderDetailsScreenProps> = ({
  navigation,
  route,
}) => {
  const { handleTabPress } = useSmartTabNavigation();
  const orderIdParam = route.params?.orderId || 'ord1';

  const [order, setOrder] = useState<OrderRecord | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isCancelling, setIsCancelling] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [utr, setUtr] = useState('');
  const [isSubmittingUtr, setIsSubmittingUtr] = useState(false);
  const unreadNotifs = useNotificationStore((state) => state.getUnreadCount());

  const fetchDetails = useCallback(async () => {
    setIsLoading(true);
    try {
      const data = await orderService.getOrderById(orderIdParam);
      setOrder(data);
    } catch (err) {
      console.error('Failed to fetch details:', err);
    }
    setIsLoading(false);
  }, [orderIdParam]);

  useEffect(() => {
    fetchDetails();
  }, [fetchDetails]);



  const handleSubmitUtr = useCallback(async () => {
    if (!order) return;
    if (!utr.trim() || utr.trim().length < 4) {
      Alert.alert('Validation Error', 'Please enter a valid 12-digit UTR / Transaction Reference number.');
      return;
    }
    setIsSubmittingUtr(true);
    try {
      await paymentService.submitUpiReference(order.id, utr);
      setOrder((prev) => prev ? { ...prev, paymentStatus: 'Under Review' } : prev);
      Alert.alert('✅ UTR Submitted', 'Your payment reference has been submitted successfully. Admin will verify and confirm your order shortly.');
      setUtr('');
    } catch (error: any) {
      const msg = error.response?.data?.message || 'Failed to submit UTR reference.';
      Alert.alert('Error', msg);
    } finally {
      setIsSubmittingUtr(false);
    }
  }, [order, utr]);

  const handleDownloadInvoice = useCallback(() => {
    if (!order) return;
    downloadCustomerOrderInvoicePdf({
      orderNumber: (order.orderNumber || '0000').replace('#', ''),
      date: order.date || new Date().toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }),
      customerName: 'Valued Customer',
      shippingAddress: typeof order.shippingAddress === 'string' ? order.shippingAddress : (order.shippingAddress ? `${(order.shippingAddress as any).addressLine1 || ''}, ${(order.shippingAddress as any).city || ''}` : 'Customer Delivery Address'),
      paymentMethod: order.paymentMethod || 'UPI QR / Online Payment',
      paymentId: (order as any).paymentId || (order as any).transactionReference || null,
      paymentStatus: order.paymentStatus || 'Paid Online',
      items: order.items || [],
      subtotal: order.subtotal || order.totalPrice,
      tax: order.tax || 0,
      shipping: order.shippingFee || 0,
      discount: order.discount || 0,
      total: order.totalPrice,
    });
  }, [order]);

  const isCancellable = useMemo(() => {
    if (!order) return false;
    const s = (order.status || '').toLowerCase();
    const ps = (order.paymentStatus || '').toLowerCase();
    if (['cancelled', 'failed', 'refunded', 'delivered'].includes(s) || ['failed', 'refunded'].includes(ps)) {
      return false;
    }
    return ['pending', 'confirmed', 'processing'].includes(s);
  }, [order]);

  const isDeletable = useMemo(() => {
    if (!order) return false;
    const s = (order.status || '').toLowerCase();
    return ['delivered', 'cancelled'].includes(s) || order.paymentStatus === 'Refunded';
  }, [order]);

  const handleCancelOrder = useCallback(async () => {
    if (!order) return;
    setIsCancelling(true);
    try {
      const updated = await orderService.cancelOrder(order.id);
      if (updated) {
        setOrder(updated);
      } else {
        fetchDetails();
      }
      if (Platform.OS === 'web' && typeof window !== 'undefined') {
        window.alert('Your order has been successfully cancelled.');
      } else {
        Alert.alert('Order Cancelled', 'Your order has been successfully cancelled.');
      }
    } catch (error: any) {
      const msg = error.response?.data?.message || error.message || 'Failed to cancel order.';
      if (Platform.OS === 'web' && typeof window !== 'undefined') {
        window.alert(`Error: ${msg}`);
      } else {
        Alert.alert('Error', msg);
      }
    } finally {
      setIsCancelling(false);
    }
  }, [order, fetchDetails]);

  const handleDeleteOrder = useCallback(async () => {
    if (!order) return;
    setIsDeleting(true);
    try {
      await orderService.deleteOrder(order.id);
      if (Platform.OS === 'web' && typeof window !== 'undefined') {
        window.alert('Order removed from your order list.');
      } else {
        Alert.alert('Success', 'Order removed from your order list.');
      }
      navigation.goBack();
    } catch (error: any) {
      const msg = error.response?.data?.message || error.message || 'Failed to delete order.';
      if (Platform.OS === 'web' && typeof window !== 'undefined') {
        window.alert(`Error: ${msg}`);
      } else {
        Alert.alert('Error', msg);
      }
      setIsDeleting(false);
    }
  }, [order, navigation]);

  if (isLoading || !order) {
    return (
      <ResponsiveContainer>
        <SafeAreaView style={styles.safeArea} edges={['top', 'left', 'right']}>
          <HomeHeader
            onBackPress={() => (navigation.canGoBack() ? navigation.goBack() : navigation.navigate('OrderHistory'))}
            onNotificationPress={() => navigation.navigate('Notifications')}
            onProfilePress={() => navigation.navigate('UserProfile')}
            onCartPress={() => navigation.navigate('Cart')}
            notificationCount={unreadNotifs}
          />
          <LoadingSpinner message="Fetching order specifications..." />
          <BottomNavBar activeTab="Profile" onTabPress={handleTabPress} />
        </SafeAreaView>
      </ResponsiveContainer>
    );
  }

  const stLower = (order.status || '').toLowerCase();

  const timelineSteps = order.timeline || [
    { status: 'Order Placed', date: order.date, completed: true },
    { status: 'Processing', date: 'In Progress', completed: stLower !== 'pending' },
    { status: 'In Transit', date: 'Courier Dispatch', completed: ['in transit', 'shipped', 'delivered'].includes(stLower) },
    { status: 'Delivered', date: 'Final Destination', completed: stLower === 'delivered' },
  ];

  const getStatusBadgeInfo = (status: string, paymentStatus?: string) => {
    const s = (status || '').toLowerCase();
    const ps = (paymentStatus || '').toLowerCase();

    if (s === 'failed' || ps === 'failed' || s === 'rejected' || ps === 'rejected') {
      return { badgeStyle: styles.failedBadge, textStyle: styles.failedBadgeText, label: 'Failed' };
    }
    if (s === 'cancelled') {
      return { badgeStyle: styles.cancelledBadge, textStyle: styles.cancelledBadgeText, label: 'Cancelled' };
    }
    if (ps === 'refunded' || s === 'refunded') {
      return { badgeStyle: styles.refundedBadge, textStyle: styles.refundedBadgeText, label: 'Refunded' };
    }
    if (s === 'delivered') {
      return { badgeStyle: styles.deliveredBadge, textStyle: styles.deliveredBadgeText, label: 'Delivered' };
    }
    if (s === 'in transit' || s === 'shipped') {
      return { badgeStyle: styles.inTransitBadge, textStyle: styles.inTransitBadgeText, label: s === 'shipped' ? 'Shipped' : 'In Transit' };
    }
    if (s === 'processing' || s === 'packed' || s === 'confirmed') {
      return { badgeStyle: styles.processingBadge, textStyle: styles.processingBadgeText, label: status || 'Processing' };
    }
    return { badgeStyle: styles.pendingBadge, textStyle: styles.pendingBadgeText, label: status || 'Pending' };
  };

  const statusInfo = getStatusBadgeInfo(order.status, order.paymentStatus);

  const formatPaymentMethod = (pm?: string) => {
    if (!pm) return 'UPI QR / Online Payment';
    const clean = pm.trim().toLowerCase();
    if (clean === 'upi' || clean === 'upi_qr' || clean === 'upi qr' || clean === 'upi/qr') {
      return 'UPI QR / Online Payment';
    }
    if (clean === 'cod') return 'Cash on Delivery';
    if (clean === 'card') return 'Credit / Debit Card';
    return pm;
  };

  return (
    <ResponsiveContainer>
      <SafeAreaView style={styles.safeArea} edges={['top', 'left', 'right']}>
        <HomeHeader
          onBackPress={() => (navigation.canGoBack() ? navigation.goBack() : navigation.navigate('OrderHistory'))}
          onNotificationPress={() => navigation.navigate('Notifications')}
          onProfilePress={() => navigation.navigate('UserProfile')}
          onCartPress={() => navigation.navigate('Cart')}
          notificationCount={unreadNotifs}
        />

        <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
          {/* Back Button Navigation Bar */}
          <TouchableOpacity
            style={styles.backButtonContainer}
            onPress={() => (navigation.canGoBack() ? navigation.goBack() : navigation.navigate('OrderHistory'))}
            activeOpacity={0.7}
          >
            <MaterialIcons name="arrow-back" size={20} color={Colors.primary} />
            <Text style={styles.backButtonText}>Back to My Orders</Text>
          </TouchableOpacity>

          {/* Top Header Card */}
          <View style={styles.orderHeaderCard}>
            <View style={styles.orderHeaderTop}>
              <View>
                <Text style={styles.orderNumberText}>{order.orderNumber}</Text>
                <Text style={styles.orderDateText}>Placed on {order.date}</Text>
              </View>
              <View style={[styles.statusBadge, statusInfo.badgeStyle]}>
                <Text style={[styles.statusBadgeText, statusInfo.textStyle]}>{statusInfo.label}</Text>
              </View>
            </View>
          </View>

          {/* Order Status Timeline or Failed/Refund/Cancel Banner */}
          <View style={styles.sectionCard}>
            <Text style={styles.sectionTitle}>Order Progress Timeline</Text>
            {(order.paymentStatus || '').toLowerCase() === 'failed' || (order.status || '').toLowerCase() === 'failed' ? (
              <View style={styles.failedNoticeBox}>
                <View style={styles.failedNoticeIconWrapper}>
                  <MaterialIcons name="error-outline" size={28} color="#D32F2F" />
                </View>
                <View style={styles.failedNoticeContent}>
                  <Text style={styles.failedNoticeTitle}>Payment Failed</Text>
                  <Text style={styles.failedNoticeText}>
                    The payment for this order was not completed or failed verification.
                  </Text>
                </View>
              </View>
            ) : (order.paymentStatus || '').toLowerCase() === 'refunded' || (order.status || '').toLowerCase() === 'refunded' ? (
              <View style={styles.refundedNoticeBox}>
                <View style={styles.refundedNoticeIconWrapper}>
                  <MaterialIcons name="monetization-on" size={28} color="#00796B" />
                </View>
                <View style={styles.refundedNoticeContent}>
                  <Text style={styles.refundedNoticeTitle}>Order Payment Refunded</Text>
                  <Text style={styles.refundedNoticeText}>
                    This order has been cancelled and the full amount has been successfully refunded to your original payment method.
                  </Text>
                </View>
              </View>
            ) : (order.status || '').toLowerCase() === 'cancelled' ? (
              <View style={styles.cancelledNoticeBox}>
                <View style={styles.cancelledNoticeIconWrapper}>
                  <MaterialIcons name="cancel" size={28} color="#D32F2F" />
                </View>
                <View style={styles.cancelledNoticeContent}>
                  <Text style={styles.cancelledNoticeTitle}>Order Cancelled</Text>
                  <Text style={styles.cancelledNoticeText}>
                    This order has been cancelled.
                  </Text>
                </View>
              </View>
            ) : (
              <View style={styles.horizontalTimelineContainer}>
                {timelineSteps.map((step, idx) => {
                  const isFirst = idx === 0;
                  const isLast = idx === timelineSteps.length - 1;
                  const nextStepCompleted = !isLast && timelineSteps[idx + 1]?.completed;

                  return (
                    <View key={idx} style={styles.horizontalStepItem}>
                      {/* Dots and Connecting Lines Row */}
                      <View style={styles.horizontalDotRow}>
                        <View
                          style={[
                            styles.horizontalLine,
                            isFirst && styles.horizontalLineHidden,
                            step.completed && styles.horizontalLineCompleted,
                          ]}
                        />
                        <View
                          style={[
                            styles.timelineDot,
                            step.completed && styles.timelineDotCompleted,
                          ]}
                        >
                          <MaterialIcons
                            name={step.completed ? 'check' : 'schedule'}
                            size={12}
                            color={step.completed ? '#ffffff' : Colors.onSurfaceVariant}
                          />
                        </View>
                        <View
                          style={[
                            styles.horizontalLine,
                            isLast && styles.horizontalLineHidden,
                            nextStepCompleted && styles.horizontalLineCompleted,
                          ]}
                        />
                      </View>

                      {/* Step Labels */}
                      <View style={styles.horizontalTextContainer}>
                        <Text
                          style={[
                            styles.timelineStatusTitle,
                            step.completed && styles.timelineStatusTitleCompleted,
                            { textAlign: 'center', fontSize: 12 },
                          ]}
                          numberOfLines={1}
                        >
                          {step.status}
                        </Text>
                        <Text
                          style={[
                            styles.timelineDateText,
                            { textAlign: 'center', fontSize: 11, marginTop: 2 },
                          ]}
                          numberOfLines={1}
                        >
                          {step.date}
                        </Text>
                      </View>
                    </View>
                  );
                })}
              </View>
            )}
          </View>

          {/* Shipping Address */}
          {order.shippingAddress && (
            <View style={styles.sectionCard}>
              <View style={styles.cardHeaderRow}>
                <MaterialIcons name="location-on" size={20} color={Colors.primary} />
                <Text style={styles.sectionTitle}>Delivery Destination</Text>
              </View>
              <Text style={styles.addressName}>{order.shippingAddress.fullName || 'Valued Customer'}</Text>
              <Text style={styles.addressText}>
                {order.shippingAddress.street || (order.shippingAddress as any).addressLine1}
              </Text>
              <Text style={styles.addressText}>
                {[order.shippingAddress.city, order.shippingAddress.state, order.shippingAddress.zipCode || (order.shippingAddress as any).postalCode].filter(Boolean).join(', ')}
              </Text>
              {order.shippingAddress.phone && (
                <Text style={styles.addressPhone}>{order.shippingAddress.phone}</Text>
              )}
            </View>
          )}

          {/* Ordered Products List */}
          <View style={styles.sectionCard}>
            <Text style={styles.sectionTitle}>Ordered Products ({order.itemCount})</Text>
            <View style={styles.itemsList}>
              {(order.items || []).map((item, idx) => (
                <View key={item.id || idx} style={[styles.itemRow, idx > 0 && styles.itemRowBorder]}>
                  <Image
                    source={resolveProductImage(item)}
                    style={styles.itemThumb}
                    resizeMode="contain"
                  />
                  <View style={styles.itemInfo}>
                    <Text style={styles.itemTitle}>{item.title}</Text>
                    {item.variantInfo && (
                      <Text style={styles.itemVariantText}>{item.variantInfo}</Text>
                    )}
                    <Text style={styles.itemQtyPrice}>
                      Qty: {item.quantity} × {formatCurrency(item.price)}
                    </Text>
                  </View>
                  <Text style={styles.itemTotal}>{formatCurrency(item.quantity * item.price)}</Text>
                </View>
              ))}
            </View>
          </View>

          {/* Payment & Financial Breakdown */}
          <View style={styles.sectionCard}>
            <View style={styles.cardHeaderRow}>
              <MaterialIcons name="credit-card" size={20} color={Colors.primary} />
              <Text style={styles.sectionTitle}>Payment Information</Text>
            </View>

            <View style={styles.paymentMetaRow}>
              <Text style={styles.metaLabel}>Payment Method:</Text>
              <Text style={styles.metaValue}>{formatPaymentMethod(order.paymentMethod)}</Text>
            </View>
            <View style={styles.paymentMetaRow}>
              <Text style={styles.metaLabel}>Payment Status:</Text>
              <View
                style={[
                  styles.payStatusBadge,
                  order.paymentStatus === 'Paid'
                    ? styles.paidBadge
                    : (order.paymentStatus || '').toLowerCase() === 'refunded'
                    ? styles.refundedBadge
                    : (order.paymentStatus || '').toLowerCase() === 'failed'
                    ? styles.failedBadge
                    : styles.unpaidBadge,
                ]}
              >
                <Text
                  style={[
                    styles.payStatusText,
                    (order.paymentStatus || '').toLowerCase() === 'refunded' && styles.refundedBadgeText,
                    (order.paymentStatus || '').toLowerCase() === 'failed' && styles.failedBadgeText,
                  ]}
                >
                  {order.paymentStatus || 'Paid'}
                </Text>
              </View>
            </View>

            <View style={styles.divider} />

            <View style={styles.summaryRow}>
              <Text style={styles.summaryLabel}>Subtotal</Text>
              <Text style={styles.summaryValue}>{formatCurrency(order.subtotal || order.totalPrice)}</Text>
            </View>
            {order.discount ? (
              <View style={styles.summaryRow}>
                <Text style={styles.summaryLabel}>Discount</Text>
                <Text style={styles.discountValue}>-{formatCurrency(order.discount)}</Text>
              </View>
            ) : null}
            <View style={styles.summaryRow}>
              <Text style={styles.summaryLabel}>Shipping Fee</Text>
              <Text style={styles.summaryValue}>
                {order.shippingFee === 0 ? 'FREE' : formatCurrency(order.shippingFee || 0)}
              </Text>
            </View>
            <View style={styles.summaryRow}>
              <Text style={styles.summaryLabel}>Estimated Tax</Text>
              <Text style={styles.summaryValue}>{formatCurrency(order.tax || 0)}</Text>
            </View>

            <View style={styles.divider} />

            <View style={styles.grandTotalRow}>
              <Text style={styles.grandTotalLabel}>Total Amount Paid</Text>
              <Text style={styles.grandTotalValue}>{formatCurrency(order.totalPrice)}</Text>
            </View>

            {/* UPI QR Code & Payment UTR Reference Code Submission / Re-entry Form */}
            {['pending', 'failed', 'under review', 'cancelled', 'refunded'].includes((order.paymentStatus || '').toLowerCase()) && (order.paymentMethod?.includes('UPI') || order.paymentMethod?.includes('QR') || order.paymentMethod?.includes('Card') || !order.paymentStatus || order.paymentStatus !== 'Paid') && (
              <View style={{ backgroundColor: '#FFF8E1', padding: 14, borderRadius: 12, marginTop: 14, borderWidth: 1, borderColor: '#FFE082' }}>
                <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 8 }}>
                  <MaterialIcons name="qr-code-2" size={24} color="#F57F17" style={{ marginRight: 8 }} />
                  <Text style={{ fontSize: 14, fontFamily: 'Inter-Bold', color: '#F57F17' }}>
                    {['failed', 'cancelled', 'refunded'].includes((order.paymentStatus || '').toLowerCase())
                      ? 'Re-enter / Re-submit 12-Digit Payment UTR Code'
                      : 'Submit 12-Digit Payment UTR Reference'}
                  </Text>
                </View>
                <Text style={{ fontSize: 12, color: '#555', marginBottom: 10, lineHeight: 16 }}>
                  {['failed', 'cancelled', 'refunded'].includes((order.paymentStatus || '').toLowerCase())
                    ? 'Payment was marked failed, cancelled, or refunded. If you made the transaction or want to re-verify payment, enter your 12-digit UTR reference code below for admin verification.'
                    : 'Scan the merchant QR code or transfer to UPI ID below. Submit your 12-digit UTR transaction reference for verification.'}
                </Text>
                
                {/* UTR Input Form */}
                <Text style={{ fontSize: 12, fontFamily: 'Inter-SemiBold', color: '#333', marginBottom: 6 }}>
                  Enter / Re-enter 12-Digit UTR Payment Reference Code:
                </Text>
                <View style={{ flexDirection: 'row', gap: 8 }}>
                  <TextInput
                    style={{
                      flex: 1,
                      backgroundColor: '#ffffff',
                      borderWidth: 1,
                      borderColor: '#ddd',
                      borderRadius: 8,
                      paddingHorizontal: 10,
                      paddingVertical: 8,
                      fontSize: 13,
                      color: '#333',
                    }}
                    placeholder="e.g. 425689123456"
                    placeholderTextColor="#999"
                    value={utr}
                    onChangeText={setUtr}
                    keyboardType="number-pad"
                  />
                  <TouchableOpacity
                    style={{
                      backgroundColor: isSubmittingUtr ? '#ccc' : Colors.primary,
                      paddingHorizontal: 14,
                      borderRadius: 8,
                      justifyContent: 'center',
                      alignItems: 'center',
                    }}
                    onPress={handleSubmitUtr}
                    disabled={isSubmittingUtr}
                  >
                    {isSubmittingUtr ? (
                      <ActivityIndicator size="small" color="#fff" />
                    ) : (
                      <Text style={{ color: '#fff', fontFamily: 'Inter-Bold', fontSize: 12 }}>
                        SUBMIT UTR
                      </Text>
                    )}
                  </TouchableOpacity>
                </View>
              </View>
            )}

            {/* UNDER REVIEW STATUS CARD */}
            {order.paymentStatus === 'Under Review' && (
              <View style={{ backgroundColor: '#E3F2FD', padding: 12, borderRadius: 12, marginTop: 14, borderWidth: 1, borderColor: '#90CAF9', flexDirection: 'row', alignItems: 'center' }}>
                <MaterialIcons name="hourglass-empty" size={22} color="#1565C0" style={{ marginRight: 8 }} />
                <View style={{ flex: 1 }}>
                  <Text style={{ fontSize: 13, fontFamily: 'Inter-Bold', color: '#1565C0' }}>
                    Payment Reference Under Verification
                  </Text>
                  <Text style={{ fontSize: 11, color: '#0D47A1', marginTop: 2 }}>
                    Your UTR transaction reference has been submitted. Admin will confirm payment shortly.
                  </Text>
                </View>
              </View>
            )}
          </View>

          {/* Download Official Tax Invoice (PDF) Button */}
          {order.paymentStatus === 'Paid' && (
            <View style={styles.cancelContainer}>
              <TouchableOpacity
                style={{
                  flexDirection: 'row',
                  alignItems: 'center',
                  justifyContent: 'center',
                  backgroundColor: '#2E7D32',
                  paddingVertical: 12,
                  borderRadius: 12,
                  gap: 8,
                }}
                onPress={handleDownloadInvoice}
                activeOpacity={0.8}
              >
                <MaterialIcons name="picture-as-pdf" size={20} color="#ffffff" />
                <Text style={{ fontSize: 14, fontFamily: 'Inter-Bold', color: '#ffffff' }}>
                  Download Official Tax Invoice (PDF)
                </Text>
              </TouchableOpacity>
            </View>
          )}

          {/* Cancel Order Action Button */}
          {isCancellable && (
            <View style={styles.cancelContainer}>
              <PrimaryButton
                title={isCancelling ? 'Cancelling Order...' : 'Cancel Order'}
                variant="secondary"
                onPress={handleCancelOrder}
                disabled={isCancelling}
              />
            </View>
          )}

          {/* Delete Order Action Button */}
          {isDeletable && (
            <View style={styles.cancelContainer}>
              <PrimaryButton
                title={isDeleting ? 'Deleting...' : '🗑 Delete Order'}
                variant="primary"
                style={{ backgroundColor: '#D32F2F' }}
                onPress={handleDeleteOrder}
                disabled={isDeleting}
              />
            </View>
          )}
        </ScrollView>

        <BottomNavBar activeTab="Profile" onTabPress={handleTabPress} />
      </SafeAreaView>
    </ResponsiveContainer>
  );
};

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  scrollContent: {
    paddingBottom: Spacing.xl,
    paddingHorizontal: Spacing.marginMobile,
    paddingTop: Spacing.sm,
  },
  backButtonContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: Spacing.xs,
    paddingVertical: 4,
    alignSelf: 'flex-start',
  },
  backButtonText: {
    ...Typography.titleLg,
    fontSize: 14,
    fontFamily: 'Inter-Bold',
    color: Colors.primary,
  },
  orderHeaderCard: {
    backgroundColor: Colors.surfaceContainerLowest,
    borderRadius: BorderRadius.xl,
    padding: Spacing.md,
    marginBottom: Spacing.sm,
    borderWidth: 1,
    borderColor: Colors.surfaceContainerHigh,
  },
  orderHeaderTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  orderNumberText: {
    ...Typography.headlineLg,
    fontSize: 20,
    fontFamily: 'Inter-Bold',
    color: Colors.onSurface,
  },
  orderDateText: {
    ...Typography.bodyMd,
    fontSize: 12,
    color: Colors.tertiary,
    marginTop: 2,
  },
  statusBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: BorderRadius.full,
  },
  inTransitBadge: {
    backgroundColor: Colors.secondaryContainer,
  },
  inTransitBadgeText: {
    color: Colors.onSecondaryContainer,
  },
  deliveredBadge: {
    backgroundColor: Colors.surfaceContainerHigh,
  },
  deliveredBadgeText: {
    color: '#2E7D32',
  },
  pendingBadge: {
    backgroundColor: Colors.primaryContainer,
  },
  pendingBadgeText: {
    color: Colors.onPrimaryContainer,
  },
  cancelledBadge: {
    backgroundColor: '#FFEBEE',
  },
  cancelledBadgeText: {
    color: '#C62828',
  },
  refundedBadge: {
    backgroundColor: '#E0F2F1',
  },
  refundedBadgeText: {
    color: '#004D40',
  },
  failedBadge: {
    backgroundColor: '#FFEBEE',
  },
  failedBadgeText: {
    color: '#D32F2F',
  },
  processingBadge: {
    backgroundColor: '#FFF3E0',
  },
  processingBadgeText: {
    color: '#E65100',
  },
  statusBadgeText: {
    ...Typography.labelLg,
    fontSize: 10,
    fontFamily: 'Inter-Bold',
    color: Colors.onSurface,
    textTransform: 'uppercase',
  },
  sectionCard: {
    backgroundColor: Colors.surfaceContainerLowest,
    borderRadius: BorderRadius.xl,
    padding: Spacing.md,
    marginBottom: Spacing.sm,
    borderWidth: 1,
    borderColor: Colors.surfaceContainerHigh,
  },
  cardHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: Spacing.xs,
  },
  sectionTitle: {
    ...Typography.titleLg,
    fontSize: 15,
    fontFamily: 'Inter-Bold',
    color: Colors.onSurface,
  },
  failedNoticeBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFEBEE',
    borderWidth: 1,
    borderColor: '#FFCDD2',
    borderRadius: BorderRadius.lg,
    padding: Spacing.md,
    marginTop: Spacing.sm,
    gap: Spacing.sm,
  },
  failedNoticeIconWrapper: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#FFCCBC',
    alignItems: 'center',
    justifyContent: 'center',
  },
  failedNoticeContent: {
    flex: 1,
  },
  failedNoticeTitle: {
    ...Typography.titleLg,
    fontSize: 15,
    fontFamily: 'Inter-Bold',
    color: '#B71C1C',
  },
  failedNoticeText: {
    ...Typography.bodyMd,
    fontSize: 13,
    color: '#C62828',
    marginTop: 2,
    lineHeight: 18,
  },
  refundedNoticeBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#E0F2F1',
    borderWidth: 1,
    borderColor: '#80CBC4',
    borderRadius: BorderRadius.lg,
    padding: Spacing.md,
    marginTop: Spacing.sm,
    gap: Spacing.sm,
  },
  refundedNoticeIconWrapper: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#B2DFDB',
    alignItems: 'center',
    justifyContent: 'center',
  },
  refundedNoticeContent: {
    flex: 1,
  },
  refundedNoticeTitle: {
    ...Typography.titleLg,
    fontSize: 15,
    fontFamily: 'Inter-Bold',
    color: '#004D40',
  },
  refundedNoticeText: {
    ...Typography.bodyMd,
    fontSize: 13,
    color: '#00695C',
    marginTop: 2,
    lineHeight: 18,
  },
  cancelledNoticeBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFEBEE',
    borderWidth: 1,
    borderColor: '#FFCDD2',
    borderRadius: BorderRadius.lg,
    padding: Spacing.md,
    marginTop: Spacing.sm,
    gap: Spacing.sm,
  },
  cancelledNoticeIconWrapper: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#FFCCBC',
    alignItems: 'center',
    justifyContent: 'center',
  },
  cancelledNoticeContent: {
    flex: 1,
  },
  cancelledNoticeTitle: {
    ...Typography.titleLg,
    fontSize: 15,
    fontFamily: 'Inter-Bold',
    color: '#B71C1C',
  },
  cancelledNoticeText: {
    ...Typography.bodyMd,
    fontSize: 13,
    color: '#C62828',
    marginTop: 2,
    lineHeight: 18,
  },
  horizontalTimelineContainer: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    marginTop: Spacing.md,
    paddingVertical: Spacing.xs,
  },
  horizontalStepItem: {
    flex: 1,
    alignItems: 'center',
  },
  horizontalDotRow: {
    flexDirection: 'row',
    alignItems: 'center',
    width: '100%',
    marginBottom: Spacing.xs,
  },
  horizontalLine: {
    flex: 1,
    height: 3,
    backgroundColor: Colors.surfaceContainerHigh,
  },
  horizontalLineHidden: {
    opacity: 0,
  },
  horizontalLineCompleted: {
    backgroundColor: Colors.primary,
  },
  horizontalTextContainer: {
    alignItems: 'center',
    paddingHorizontal: 2,
  },
  timelineContainer: {
    marginTop: Spacing.sm,
  },
  timelineRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: Spacing.sm,
  },
  timelineIconCol: {
    alignItems: 'center',
    width: 20,
  },
  timelineDot: {
    width: 20,
    height: 20,
    borderRadius: BorderRadius.full,
    backgroundColor: Colors.surfaceContainerHigh,
    alignItems: 'center',
    justifyContent: 'center',
  },
  timelineDotCompleted: {
    backgroundColor: Colors.primary,
  },
  timelineDotCancelled: {
    backgroundColor: '#D32F2F',
  },
  timelineLine: {
    width: 2,
    height: 28,
    backgroundColor: Colors.surfaceContainerHigh,
    marginVertical: 2,
  },
  timelineLineCompleted: {
    backgroundColor: Colors.primary,
  },
  timelineContent: {
    flex: 1,
    paddingBottom: Spacing.xs,
  },
  timelineStatusTitle: {
    ...Typography.labelLg,
    fontSize: 13,
    color: Colors.onSurfaceVariant,
  },
  timelineStatusTitleCompleted: {
    fontFamily: 'Inter-Bold',
    color: Colors.onSurface,
  },
  timelineDateText: {
    ...Typography.bodyMd,
    fontSize: 11,
    color: Colors.tertiary,
  },
  addressName: {
    ...Typography.titleLg,
    fontSize: 14,
    fontFamily: 'Inter-Bold',
    color: Colors.onSurface,
    marginTop: Spacing.xs,
  },
  addressText: {
    ...Typography.bodyMd,
    fontSize: 13,
    color: Colors.onSurfaceVariant,
    marginTop: 2,
  },
  addressPhone: {
    ...Typography.bodyMd,
    fontSize: 12,
    color: Colors.tertiary,
    marginTop: 4,
  },
  itemsList: {
    marginTop: Spacing.xs,
  },
  itemRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: Spacing.xs,
    gap: Spacing.sm,
  },
  itemRowBorder: {
    borderTopWidth: 1,
    borderTopColor: Colors.surfaceContainerHigh,
  },
  itemThumb: {
    width: 52,
    height: 52,
    borderRadius: BorderRadius.lg,
    backgroundColor: Colors.surfaceContainerLow,
  },
  itemInfo: {
    flex: 1,
  },
  itemTitle: {
    ...Typography.titleLg,
    fontSize: 14,
    fontFamily: 'Inter-Bold',
    color: Colors.onSurface,
  },
  itemVariantText: {
    ...Typography.labelLg,
    fontSize: 10,
    color: Colors.primary,
    marginTop: 2,
  },
  itemQtyPrice: {
    ...Typography.bodyMd,
    fontSize: 12,
    color: Colors.tertiary,
    marginTop: 2,
  },
  itemTotal: {
    ...Typography.titleLg,
    fontSize: 14,
    fontFamily: 'Inter-Bold',
    color: Colors.onSurface,
  },
  paymentMetaRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: Spacing.xs,
  },
  metaLabel: {
    ...Typography.bodyMd,
    fontSize: 13,
    color: Colors.onSurfaceVariant,
  },
  metaValue: {
    ...Typography.titleLg,
    fontSize: 13,
    fontFamily: 'Inter-Bold',
    color: Colors.onSurface,
  },
  payStatusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: BorderRadius.full,
  },
  paidBadge: {
    backgroundColor: Colors.secondaryContainer,
  },
  unpaidBadge: {
    backgroundColor: Colors.surfaceContainerHigh,
  },
  payStatusText: {
    ...Typography.labelLg,
    fontSize: 10,
    fontFamily: 'Inter-Bold',
    color: Colors.onSecondaryContainer,
  },
  divider: {
    height: 1,
    backgroundColor: Colors.surfaceContainerHigh,
    marginVertical: Spacing.sm,
  },
  summaryRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginVertical: 3,
  },
  summaryLabel: {
    ...Typography.bodyMd,
    fontSize: 13,
    color: Colors.onSurfaceVariant,
  },
  summaryValue: {
    ...Typography.bodyLg,
    fontSize: 13,
    color: Colors.onSurface,
  },
  discountValue: {
    ...Typography.bodyLg,
    fontSize: 13,
    color: Colors.secondary,
    fontFamily: 'Inter-Bold',
  },
  grandTotalRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  grandTotalLabel: {
    ...Typography.titleLg,
    fontSize: 16,
    fontFamily: 'Inter-Bold',
    color: Colors.onSurface,
  },
  grandTotalValue: {
    ...Typography.headlineLg,
    fontSize: 20,
    fontFamily: 'Inter-Bold',
    color: Colors.primary,
  },
  cancelContainer: {
    marginTop: Spacing.sm,
  },
});

export default OrderDetailsScreen;

