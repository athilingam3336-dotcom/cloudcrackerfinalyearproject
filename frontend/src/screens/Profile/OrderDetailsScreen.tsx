import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Image,
  TouchableOpacity,
  Alert,
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

type OrderDetailsScreenProps = NativeStackScreenProps<
  RootStackParamList,
  'OrderDetails'
>;

export const OrderDetailsScreen: React.FC<OrderDetailsScreenProps> = ({
  navigation,
  route,
}) => {
  const orderIdParam = route.params?.orderId || 'ord1';

  const [order, setOrder] = useState<OrderRecord | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isCancelling, setIsCancelling] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
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

  const isCancellable = useMemo(() => {
    if (!order) return false;
    return order.status === 'Pending' || order.status === 'Processing';
  }, [order]);

  const isDeletable = useMemo(() => {
    if (!order) return false;
    return ['Delivered', 'Cancelled'].includes(order.status) || order.paymentStatus === 'Refunded';
  }, [order]);

  const handleCancelOrder = useCallback(() => {
    if (!order) return;
    Alert.alert(
      'Cancel Order',
      `Are you sure you want to cancel order ${order.orderNumber}? Stock items will be restored.`,
      [
        { text: 'Keep Order', style: 'cancel' },
        {
          text: 'Yes, Cancel Order',
          style: 'destructive',
          onPress: async () => {
            setIsCancelling(true);
            const updated = await orderService.cancelOrder(order.id);
            setOrder(updated);
            setIsCancelling(false);
            Alert.alert('Order Cancelled', 'Your order has been successfully cancelled.');
          },
        },
      ]
    );
  }, [order]);

  const handleDeleteOrder = useCallback(() => {
    if (!order) return;
    Alert.alert(
      'Delete this order?',
      'This order will be removed from your order list.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            setIsDeleting(true);
            try {
              await orderService.deleteOrder(order.id);
              Alert.alert('Success', 'Order removed from your order list.');
              navigation.goBack();
            } catch (error: any) {
              const msg = error.response?.data?.message || error.message || 'Failed to delete order.';
              Alert.alert('Error', msg);
              setIsDeleting(false);
            }
          },
        },
      ]
    );
  }, [order, navigation]);

  const handleTabPress = useCallback(
    (tab: TabRoute) => {
      if (tab === 'Home') navigation.navigate('Home');
      else if (tab === 'Categories') navigation.navigate('Categories');
      else if (tab === 'Cart') navigation.navigate('Cart');
      else if (tab === 'Wishlist') navigation.navigate('Wishlist');
      else if (tab === 'Profile') navigation.navigate('UserProfile');
    },
    [navigation]
  );

  if (isLoading || !order) {
    return (
      <SafeAreaView style={styles.safeArea} edges={['top', 'left', 'right']}>
        <HomeHeader
          onNotificationPress={() => navigation.navigate('Notifications')}
          onProfilePress={() => navigation.navigate('UserProfile')}
          onCartPress={() => navigation.navigate('Cart')}
          notificationCount={unreadNotifs}
        />
        <LoadingSpinner message="Fetching order specifications..." />
        <BottomNavBar activeTab="Profile" onTabPress={handleTabPress} />
      </SafeAreaView>
    );
  }

  const timelineSteps = order.timeline || [
    { status: 'Order Placed', date: order.date, completed: true },
    { status: 'Processing', date: 'In Progress', completed: order.status !== 'Pending' },
    { status: 'In Transit', date: 'Courier Dispatch', completed: order.status === 'In Transit' || order.status === 'Delivered' },
    { status: 'Delivered', date: 'Final Destination', completed: order.status === 'Delivered' },
  ];

  return (
    <SafeAreaView style={styles.safeArea} edges={['top', 'left', 'right']}>
      <HomeHeader
        onNotificationPress={() => navigation.navigate('Notifications')}
        onProfilePress={() => navigation.navigate('UserProfile')}
        onCartPress={() => navigation.navigate('Cart')}
        notificationCount={unreadNotifs}
      />

      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        {/* Top Header Card */}
        <View style={styles.orderHeaderCard}>
          <View style={styles.orderHeaderTop}>
            <View>
              <Text style={styles.orderNumberText}>{order.orderNumber}</Text>
              <Text style={styles.orderDateText}>Placed on {order.date}</Text>
            </View>
            <View
              style={[
                styles.statusBadge,
                order.status === 'In Transit'
                  ? styles.inTransitBadge
                  : order.status === 'Delivered'
                  ? styles.deliveredBadge
                  : order.status === 'Cancelled'
                  ? styles.cancelledBadge
                  : styles.pendingBadge,
              ]}
            >
              <Text style={styles.statusBadgeText}>{order.status}</Text>
            </View>
          </View>
        </View>

        {/* Order Status Timeline */}
        <View style={styles.sectionCard}>
          <Text style={styles.sectionTitle}>Order Progress Timeline</Text>
          <View style={styles.timelineContainer}>
            {timelineSteps.map((step, idx) => {
              const isLast = idx === timelineSteps.length - 1;
              const isCancelled = order.status === 'Cancelled';
              return (
                <View key={idx} style={styles.timelineRow}>
                  <View style={styles.timelineIconCol}>
                    <View
                      style={[
                        styles.timelineDot,
                        step.completed && styles.timelineDotCompleted,
                        isCancelled && styles.timelineDotCancelled,
                      ]}
                    >
                      <MaterialIcons
                        name={isCancelled ? 'close' : step.completed ? 'check' : 'schedule'}
                        size={12}
                        color="#ffffff"
                      />
                    </View>
                    {!isLast && (
                      <View
                        style={[
                          styles.timelineLine,
                          step.completed && styles.timelineLineCompleted,
                        ]}
                      />
                    )}
                  </View>
                  <View style={styles.timelineContent}>
                    <Text
                      style={[
                        styles.timelineStatusTitle,
                        step.completed && styles.timelineStatusTitleCompleted,
                      ]}
                    >
                      {step.status}
                    </Text>
                    <Text style={styles.timelineDateText}>{step.date}</Text>
                  </View>
                </View>
              );
            })}
          </View>
        </View>

        {/* Shipping Address */}
        {order.shippingAddress && (
          <View style={styles.sectionCard}>
            <View style={styles.cardHeaderRow}>
              <MaterialIcons name="location-on" size={20} color={Colors.primary} />
              <Text style={styles.sectionTitle}>Shipping Address</Text>
            </View>
            <Text style={styles.addressName}>{order.shippingAddress.fullName}</Text>
            <Text style={styles.addressText}>{order.shippingAddress.street}</Text>
            <Text style={styles.addressText}>
              {order.shippingAddress.city}, {order.shippingAddress.state} {order.shippingAddress.zipCode}
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
            <Text style={styles.metaValue}>{order.paymentMethod || 'Credit Card'}</Text>
          </View>
          <View style={styles.paymentMetaRow}>
            <Text style={styles.metaLabel}>Payment Status:</Text>
            <View
              style={[
                styles.payStatusBadge,
                order.paymentStatus === 'Paid'
                  ? styles.paidBadge
                  : styles.unpaidBadge,
              ]}
            >
              <Text style={styles.payStatusText}>{order.paymentStatus || 'Paid'}</Text>
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
            <Text style={styles.grandTotalLabel}>Grand Total</Text>
            <Text style={styles.grandTotalValue}>{formatCurrency(order.totalPrice)}</Text>
          </View>
        </View>

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
  deliveredBadge: {
    backgroundColor: Colors.surfaceContainerHigh,
  },
  pendingBadge: {
    backgroundColor: Colors.primaryContainer,
  },
  cancelledBadge: {
    backgroundColor: '#FFEBEE',
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

