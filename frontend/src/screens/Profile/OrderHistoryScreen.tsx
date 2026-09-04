import React, { useState, useCallback, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  Image,
  TouchableOpacity,
  ListRenderItem,
  Alert,
  RefreshControl,
  Platform,
  ScrollView,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { MaterialIcons } from '@expo/vector-icons';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { useFocusEffect } from '@react-navigation/native';
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
import { resolveProductImage } from '@/constants/productImages';
import { formatCurrency } from '@/utils/currency';

import { useSmartTabNavigation } from '@/hooks/useSmartTabNavigation';
import { useProductStore } from '@/store/productStore';

type OrderHistoryScreenProps = NativeStackScreenProps<
  RootStackParamList,
  'OrderHistory'
>;

type FilterCategory = 'All' | 'In Transit' | 'Delivered' | 'Cancelled';

export const OrderHistoryScreen: React.FC<OrderHistoryScreenProps> = ({
  navigation,
}) => {
  const { handleTabPress } = useSmartTabNavigation();
  const [selectedFilter, setSelectedFilter] = useState<FilterCategory>('All');
  const [orders, setOrders] = useState<OrderRecord[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [deletingOrderId, setDeletingOrderId] = useState<string | null>(null);
  const [cancellingOrderId, setCancellingOrderId] = useState<string | null>(null);
  const unreadNotifs = useNotificationStore((state) => state.getUnreadCount());

  const fetchOrders = useCallback(async (isPullRefresh = false) => {
    if (isPullRefresh) {
      setIsRefreshing(true);
    } else if (orders.length === 0) {
      setIsLoading(true);
    }
    try {
      const data = await orderService.getOrderHistory();
      setOrders(data);
    } catch (err) {
      console.error('Failed to fetch order history:', err);
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  }, [orders.length]);

  // Automatically refresh orders when screen comes into focus (e.g. after navigating back from OrderDetails)
  useFocusEffect(
    useCallback(() => {
      fetchOrders();
    }, [fetchOrders])
  );

  const totalOrders = orders.length;
  const inTransitCount = orders.filter((o) => {
    const st = (o.status || '').toLowerCase();
    return ['in transit', 'shipped', 'processing', 'confirmed', 'pending', 'packed'].includes(st);
  }).length;
  const totalSpent = orders
    .filter((o) => (o.status || '').toLowerCase() !== 'cancelled')
    .reduce((sum, o) => sum + (o.totalPrice || 0), 0);

  const filteredOrders = useMemo(() => {
    if (selectedFilter === 'All') return orders;
    if (selectedFilter === 'In Transit') {
      return orders.filter((o) => {
        const st = (o.status || '').toLowerCase();
        return ['in transit', 'shipped', 'processing', 'confirmed', 'pending', 'packed'].includes(st);
      });
    }
    if (selectedFilter === 'Delivered') {
      return orders.filter((o) => (o.status || '').toLowerCase() === 'delivered');
    }
    if (selectedFilter === 'Cancelled') {
      return orders.filter((o) => {
        const st = (o.status || '').toLowerCase();
        const ps = (o.paymentStatus || '').toLowerCase();
        return st === 'cancelled' || ps === 'refunded' || st === 'refunded';
      });
    }
    return orders;
  }, [selectedFilter, orders]);

  const handleReorder = useCallback((orderNumber: string) => {
    Alert.alert('Re-order', `Items from ${orderNumber} added to cart.`);
  }, []);

  const handleCancelOrder = useCallback(
    async (item: OrderRecord) => {
      setCancellingOrderId(item.id);
      try {
        const updated = await orderService.cancelOrder(item.id);
        if (updated) {
          setOrders((prev) =>
            prev.map((o) => (o.id === item.id ? updated : o))
          );
        } else {
          fetchOrders();
        }
        if (Platform.OS === 'web' && typeof window !== 'undefined') {
          window.alert(`Order ${item.orderNumber} has been cancelled.`);
        } else {
          Alert.alert('Success', `Order ${item.orderNumber} has been cancelled.`);
        }
      } catch (error: any) {
        const msg =
          error.response?.data?.message ||
          error.message ||
          'Failed to cancel order.';
        if (Platform.OS === 'web' && typeof window !== 'undefined') {
          window.alert(`Error: ${msg}`);
        } else {
          Alert.alert('Error', msg);
        }
      } finally {
        setCancellingOrderId(null);
      }
    },
    [fetchOrders]
  );

  const [isClearingAllCancelled, setIsClearingAllCancelled] = useState(false);

  const handleDeleteAllCancelledCustomer = useCallback(async () => {
    setIsClearingAllCancelled(true);
    try {
      const res = await orderService.deleteAllCancelledOrders();
      const msg = `Successfully deleted ${res.deletedCount} cancelled order(s) from your order history.`;
      if (Platform.OS === 'web' && typeof window !== 'undefined') {
        window.alert(msg);
      } else {
        Alert.alert('Success', msg);
      }
      fetchOrders();
    } catch (error: any) {
      const msg = error.response?.data?.message || error.message || 'Failed to clear cancelled orders.';
      if (Platform.OS === 'web' && typeof window !== 'undefined') {
        window.alert(`Error: ${msg}`);
      } else {
        Alert.alert('Error', msg);
      }
    } finally {
      setIsClearingAllCancelled(false);
    }
  }, [fetchOrders]);

  const handleDeleteOrder = useCallback(
    async (item: OrderRecord) => {
      setDeletingOrderId(item.id);
      try {
        await orderService.deleteOrder(item.id);
        setOrders((prev) => prev.filter((o) => o.id !== item.id));
        if (Platform.OS === 'web' && typeof window !== 'undefined') {
          window.alert('Order removed from your order history.');
        } else {
          Alert.alert('Success', 'Order removed from your order history.');
        }
      } catch (error: any) {
        const msg =
          error.response?.data?.message ||
          error.message ||
          'Failed to delete order.';
        if (Platform.OS === 'web' && typeof window !== 'undefined') {
          window.alert(`Error: ${msg}`);
        } else {
          Alert.alert('Error', msg);
        }
      } finally {
        setDeletingOrderId(null);
      }
    },
    []
  );

  const getStatusBadgeStyles = (status: string, paymentStatus?: string) => {
    const s = (status || '').toLowerCase();
    const ps = (paymentStatus || '').toLowerCase();

    if (s === 'cancelled') {
      return { badge: styles.cancelledBadge, text: styles.cancelledBadgeText, label: 'Cancelled' };
    }
    if (ps === 'refunded' || s === 'refunded') {
      return { badge: styles.refundedBadge, text: styles.refundedBadgeText, label: 'Refunded' };
    }
    if (s === 'delivered') {
      return { badge: styles.deliveredBadge, text: styles.deliveredBadgeText, label: 'Delivered' };
    }
    if (s === 'in transit' || s === 'shipped') {
      return { badge: styles.inTransitBadge, text: styles.inTransitBadgeText, label: s === 'shipped' ? 'Shipped' : 'In Transit' };
    }
    if (s === 'processing' || s === 'packed' || s === 'confirmed') {
      return { badge: styles.processingBadge, text: styles.processingBadgeText, label: status || 'Processing' };
    }
    return { badge: styles.pendingBadge, text: styles.pendingBadgeText, label: status || 'Pending' };
  };

  const renderOrderItem: ListRenderItem<OrderRecord> = useCallback(
    ({ item }) => {
      const badgeInfo = getStatusBadgeStyles(item.status, item.paymentStatus);
      const st = (item.status || '').toLowerCase();
      const ps = (item.paymentStatus || '').toLowerCase();

      const isCancellable = ['pending', 'confirmed', 'processing'].includes(st);
      const isDeletable =
        st === 'cancelled' ||
        st === 'delivered' ||
        ps === 'refunded' ||
        st === 'refunded';

      const isDeletingThis = deletingOrderId === item.id;
      const isCancellingThis = cancellingOrderId === item.id;

      return (
        <View style={styles.orderCard}>
          <TouchableOpacity
            style={styles.orderCardContent}
            onPress={() => navigation.navigate('OrderDetails', { orderId: item.id })}
            activeOpacity={0.85}
          >
            <View style={styles.orderCardHeader}>
              <View style={styles.orderTitleBox}>
                <Text style={styles.orderNumberText}>{item.orderNumber}</Text>
                <View style={[styles.statusBadge, badgeInfo.badge]}>
                  <Text style={[styles.statusBadgeText, badgeInfo.text]}>{badgeInfo.label}</Text>
                </View>
              </View>
              <Text style={styles.orderPrice}>{formatCurrency(item.totalPrice)}</Text>
            </View>

            <Text style={styles.orderDateText}>Placed on {item.date} • {item.itemCount} Items</Text>

            <View style={styles.orderItemsRow}>
              {(item.items || []).map((prod, idx) => (
                <Image
                  key={idx}
                  source={resolveProductImage(prod)}
                  style={styles.orderThumb}
                  resizeMode="cover"
                />
              ))}
            </View>
          </TouchableOpacity>

          <View style={styles.orderActionsRow}>
            {/* Cancel Button for Pending/Confirmed/Processing orders */}
            {isCancellable && (
              <TouchableOpacity
                style={styles.cancelBtn}
                onPress={() => handleCancelOrder(item)}
                disabled={isCancellingThis}
                activeOpacity={0.8}
              >
                <MaterialIcons name="cancel" size={16} color="#D32F2F" />
                <Text style={styles.cancelBtnText}>
                  {isCancellingThis ? 'Cancelling...' : 'Cancel'}
                </Text>
              </TouchableOpacity>
            )}

            {/* Delete Option for Cancelled, Refunded, or Delivered orders */}
            {isDeletable && (
              <TouchableOpacity
                style={styles.deleteBtn}
                onPress={() => handleDeleteOrder(item)}
                disabled={isDeletingThis}
                activeOpacity={0.8}
              >
                <MaterialIcons name="delete-outline" size={16} color={Colors.error || '#D32F2F'} />
                <Text style={styles.deleteBtnText}>
                  {isDeletingThis ? 'Deleting...' : 'Delete'}
                </Text>
              </TouchableOpacity>
            )}

            <TouchableOpacity
              style={styles.trackBtn}
              onPress={() => navigation.navigate('OrderDetails', { orderId: item.id })}
              activeOpacity={0.8}
            >
              <MaterialIcons name="receipt-long" size={16} color={Colors.primary} />
              <Text style={styles.trackBtnText}>Details</Text>
            </TouchableOpacity>

            {st !== 'cancelled' && (
              <TouchableOpacity
                style={styles.reorderBtn}
                onPress={() => handleReorder(item.orderNumber)}
                activeOpacity={0.8}
              >
                <Text style={styles.reorderBtnText}>Re-order</Text>
              </TouchableOpacity>
            )}
          </View>
        </View>
      );
    },
    [navigation, handleReorder, handleCancelOrder, handleDeleteOrder, deletingOrderId, cancellingOrderId]
  );

  const renderHeader = useMemo(() => {
    return (
      <View style={styles.headerWrapper}>
        <HomeHeader
          onBackPress={() => {
            useProductStore.getState().setLastProfileScreen(null);
            navigation.navigate('UserProfile');
          }}
          onNotificationPress={() => navigation.navigate('Notifications')}
          onProfilePress={() => navigation.navigate('UserProfile')}
          onCartPress={() => navigation.navigate('Cart')}
          notificationCount={unreadNotifs}
        />

        <View style={styles.titleSection}>
          <TouchableOpacity
            style={styles.inlineBackRow}
            onPress={() => {
              useProductStore.getState().setLastProfileScreen(null);
              navigation.navigate('UserProfile');
            }}
            activeOpacity={0.7}
          >
            <MaterialIcons name="arrow-back" size={20} color={Colors.primary} />
            <Text style={styles.inlineBackText}>Back</Text>
          </TouchableOpacity>
          <Text style={styles.title}>Order History</Text>
          <Text style={styles.subtitle}>Review and track your previous pyrotechnic purchases.</Text>

          {/* Stats Bento Scrollable Row */}
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.statsScrollContent}
            style={styles.statsScrollView}
          >
            <View style={styles.statCard}>
              <View style={styles.statIconBox}>
                <MaterialIcons name="shopping-bag" size={18} color={Colors.primary} />
              </View>
              <View style={styles.statTextBox}>
                <Text style={styles.statLabel} numberOfLines={1}>Total Orders</Text>
                <Text style={styles.statValue} numberOfLines={1}>{totalOrders}</Text>
              </View>
            </View>

            <View style={styles.statCard}>
              <View style={[styles.statIconBox, { backgroundColor: Colors.secondaryContainer }]}>
                <MaterialIcons name="local-shipping" size={18} color={Colors.onSecondaryContainer} />
              </View>
              <View style={styles.statTextBox}>
                <Text style={styles.statLabel} numberOfLines={1}>In Transit</Text>
                <Text style={styles.statValue} numberOfLines={1}>{inTransitCount}</Text>
              </View>
            </View>

            <View style={styles.statCard}>
              <View style={[styles.statIconBox, { backgroundColor: Colors.primaryFixed }]}>
                <MaterialIcons name="savings" size={18} color={Colors.primary} />
              </View>
              <View style={styles.statTextBox}>
                <Text style={styles.statLabel} numberOfLines={1}>Total Spent</Text>
                <Text style={styles.statValue} numberOfLines={1}>{formatCurrency(totalSpent)}</Text>
              </View>
            </View>
          </ScrollView>

          {/* Filter Chips */}
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.filterScrollContent}
            style={styles.filterScrollView}
          >
            {(['All', 'In Transit', 'Delivered', 'Cancelled'] as const).map((chip) => (
              <TouchableOpacity
                key={chip}
                style={[
                  styles.filterChip,
                  selectedFilter === chip && styles.activeFilterChip,
                ]}
                onPress={() => setSelectedFilter(chip)}
                activeOpacity={0.8}
              >
                <Text
                  style={[
                    styles.filterChipText,
                    selectedFilter === chip && styles.activeFilterChipText,
                  ]}
                  numberOfLines={1}
                >
                  {chip}
                </Text>
              </TouchableOpacity>
            ))}
          </ScrollView>

          {/* Bulk Delete All Cancelled Orders Button */}
          {(selectedFilter === 'Cancelled' || orders.some((o) => o.status === 'Cancelled' || o.paymentStatus === 'Refunded')) && (
            <View style={styles.clearAllRow}>
              <TouchableOpacity
                style={styles.clearAllBtn}
                onPress={handleDeleteAllCancelledCustomer}
                disabled={isClearingAllCancelled}
                activeOpacity={0.8}
              >
                <MaterialIcons name="delete-forever" size={18} color="#FFFFFF" />
                <Text style={styles.clearAllBtnText}>
                  {isClearingAllCancelled ? 'Clearing Cancelled History...' : 'Delete All Cancelled Orders'}
                </Text>
              </TouchableOpacity>
            </View>
          )}
        </View>
      </View>
    );
  }, [selectedFilter, navigation, unreadNotifs, totalOrders, inTransitCount, totalSpent, orders, isClearingAllCancelled, handleDeleteAllCancelledCustomer]);

  if (isLoading && orders.length === 0) {
    return (
      <SafeAreaView style={styles.safeArea} edges={['top', 'left', 'right']}>
        <HomeHeader
          onNotificationPress={() => navigation.navigate('Notifications')}
          onProfilePress={() => navigation.navigate('UserProfile')}
          onCartPress={() => navigation.navigate('Cart')}
          notificationCount={unreadNotifs}
        />
        <LoadingSpinner message="Fetching order history..." />
        <BottomNavBar activeTab="Profile" onTabPress={handleTabPress} />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safeArea} edges={['top', 'left', 'right']}>
      {filteredOrders.length > 0 ? (
        <FlatList
          data={filteredOrders}
          keyExtractor={(item) => item.id}
          renderItem={renderOrderItem}
          ListHeaderComponent={renderHeader}
          contentContainerStyle={styles.listContent}
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl
              refreshing={isRefreshing}
              onRefresh={() => fetchOrders(true)}
              tintColor={Colors.primary}
              colors={[Colors.primary]}
            />
          }
        />
      ) : (
        <FlatList
          data={[]}
          renderItem={null}
          ListHeaderComponent={
            <>
              {renderHeader}
              <View style={styles.emptyContainer}>
                <View style={styles.emptyIconCircle}>
                  <MaterialIcons name="receipt-long" size={54} color={Colors.primary} />
                </View>
                <Text style={styles.emptyTitle}>
                  {selectedFilter === 'All' ? 'No Orders Placed Yet' : `No ${selectedFilter} Orders`}
                </Text>
                <Text style={styles.emptySubtitle}>
                  {selectedFilter === 'All'
                    ? "You haven't placed any orders yet. Explore our fireworks catalog to start shopping."
                    : `You have no orders matching the '${selectedFilter}' filter.`}
                </Text>
                {selectedFilter === 'All' ? (
                  <PrimaryButton
                    title="Explore Catalog"
                    onPress={() => navigation.navigate('Categories')}
                    style={styles.emptyBtn}
                  />
                ) : (
                  <PrimaryButton
                    title="View All Orders"
                    onPress={() => setSelectedFilter('All')}
                    style={styles.emptyBtn}
                  />
                )}
              </View>
            </>
          }
          contentContainerStyle={styles.listContent}
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl
              refreshing={isRefreshing}
              onRefresh={() => fetchOrders(true)}
              tintColor={Colors.primary}
              colors={[Colors.primary]}
            />
          }
        />
      )}
      <BottomNavBar activeTab="Profile" onTabPress={handleTabPress} />
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  listContent: {
    paddingBottom: Spacing.xl,
  },
  headerWrapper: {
    marginBottom: Spacing.sm,
  },
  titleSection: {
    paddingHorizontal: Spacing.marginMobile,
    marginTop: Spacing.sm,
  },
  inlineBackRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginBottom: Spacing.xs,
  },
  inlineBackText: {
    ...Typography.labelLg,
    fontSize: 13,
    fontFamily: 'Inter-Bold',
    color: Colors.primary,
  },
  title: {
    ...Typography.headlineLg,
    fontSize: 26,
    fontFamily: 'Inter-Bold',
    color: Colors.onSurface,
  },
  subtitle: {
    ...Typography.bodyMd,
    fontSize: 14,
    color: Colors.onSurfaceVariant,
    marginTop: 2,
  },
  statsScrollView: {
    marginTop: Spacing.sm,
    marginBottom: Spacing.xs,
  },
  statsScrollContent: {
    flexDirection: 'row',
    gap: Spacing.xs,
    paddingRight: Spacing.md,
  },
  statCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.surfaceContainerLowest,
    borderRadius: BorderRadius.lg,
    paddingHorizontal: 10,
    paddingVertical: 8,
    gap: 8,
    borderWidth: 1,
    borderColor: Colors.surfaceContainerHigh,
    minWidth: 115,
  },
  statIconBox: {
    width: 34,
    height: 34,
    borderRadius: BorderRadius.md,
    backgroundColor: Colors.primaryFixed,
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  statTextBox: {
    flex: 1,
    justifyContent: 'center',
  },
  statLabel: {
    ...Typography.labelLg,
    fontSize: 9.5,
    fontFamily: 'Inter-Bold',
    color: Colors.tertiary,
  },
  statValue: {
    ...Typography.titleLg,
    fontSize: 14,
    fontFamily: 'Inter-Bold',
    color: Colors.onSurface,
    marginTop: 1,
  },
  filterScrollView: {
    marginTop: Spacing.sm,
    marginBottom: Spacing.xs,
  },
  filterScrollContent: {
    flexDirection: 'row',
    gap: Spacing.xs,
    paddingRight: Spacing.lg,
  },
  filterChip: {
    paddingHorizontal: Spacing.md,
    paddingVertical: 6,
    borderRadius: BorderRadius.full,
    backgroundColor: Colors.surfaceContainerLow,
    flexShrink: 0,
  },
  activeFilterChip: {
    backgroundColor: Colors.primaryContainer,
  },
  filterChipText: {
    ...Typography.labelLg,
    fontSize: 12,
    color: Colors.onSurfaceVariant,
  },
  activeFilterChipText: {
    color: Colors.onPrimaryContainer,
    fontFamily: 'Inter-Bold',
  },
  orderCard: {
    marginHorizontal: Spacing.marginMobile,
    marginBottom: Spacing.sm,
    backgroundColor: Colors.surfaceContainerLowest,
    borderRadius: BorderRadius.xl,
    padding: Spacing.md,
    borderWidth: 1,
    borderColor: Colors.surfaceContainerHigh,
    shadowColor: Colors.shadowColor,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.06,
    shadowRadius: 10,
    elevation: 3,
  },
  orderCardContent: {
    width: '100%',
  },
  orderCardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  orderTitleBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.xs,
    flexWrap: 'wrap',
    flex: 1,
  },
  orderNumberText: {
    ...Typography.titleLg,
    fontSize: 15,
    fontFamily: 'Inter-Bold',
    color: Colors.onSurface,
  },
  statusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: BorderRadius.full,
  },
  inTransitBadge: {
    backgroundColor: Colors.secondaryContainer,
  },
  inTransitBadgeText: {
    color: Colors.onSecondaryContainer,
  },
  deliveredBadge: {
    backgroundColor: '#E8F5E9',
  },
  deliveredBadgeText: {
    color: '#2E7D32',
  },
  cancelledBadge: {
    backgroundColor: '#FFEBEE',
  },
  cancelledBadgeText: {
    color: '#D32F2F',
  },
  refundedBadge: {
    backgroundColor: '#EDE7F6',
  },
  refundedBadgeText: {
    color: '#512DA8',
  },
  processingBadge: {
    backgroundColor: '#E0F2FE',
  },
  processingBadgeText: {
    color: '#0284C7',
  },
  pendingBadge: {
    backgroundColor: '#FFF3E0',
  },
  pendingBadgeText: {
    color: '#E65100',
  },
  statusBadgeText: {
    ...Typography.labelLg,
    fontSize: 10,
    fontFamily: 'Inter-Bold',
    textTransform: 'uppercase',
  },
  orderPrice: {
    ...Typography.headlineLg,
    fontSize: 17,
    fontFamily: 'Inter-Bold',
    color: Colors.primary,
  },
  orderDateText: {
    ...Typography.bodyMd,
    fontSize: 12,
    color: Colors.tertiary,
    marginTop: 2,
    marginBottom: Spacing.xs,
  },
  orderItemsRow: {
    flexDirection: 'row',
    gap: Spacing.xs,
    marginVertical: Spacing.xs,
  },
  orderThumb: {
    width: 48,
    height: 48,
    borderRadius: BorderRadius.md,
    backgroundColor: Colors.surfaceContainerLow,
  },
  orderActionsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'flex-end',
    alignItems: 'center',
    gap: 6,
    marginTop: Spacing.xs,
  },
  trackBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: Colors.primary,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: BorderRadius.lg,
    gap: 4,
  },
  trackBtnText: {
    ...Typography.labelLg,
    fontSize: 11.5,
    fontFamily: 'Inter-Bold',
    color: Colors.primary,
  },
  cancelBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#FFCDD2',
    backgroundColor: '#FFF5F5',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: BorderRadius.lg,
    gap: 4,
  },
  cancelBtnText: {
    ...Typography.labelLg,
    fontSize: 11.5,
    fontFamily: 'Inter-Bold',
    color: '#D32F2F',
  },
  deleteBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#FFCDD2',
    backgroundColor: '#FFEBEE',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: BorderRadius.lg,
    gap: 4,
  },
  deleteBtnText: {
    ...Typography.labelLg,
    fontSize: 11.5,
    fontFamily: 'Inter-Bold',
    color: '#D32F2F',
  },
  reorderBtn: {
    backgroundColor: Colors.primary,
    paddingHorizontal: 12,
    paddingVertical: 5,
    borderRadius: BorderRadius.lg,
  },
  reorderBtnText: {
    ...Typography.labelLg,
    fontSize: 12,
    fontFamily: 'Inter-Bold',
    color: Colors.onPrimary,
  },
  emptyContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: Spacing.marginMobile,
    marginTop: Spacing.xl,
    paddingBottom: Spacing.xl,
  },
  emptyIconCircle: {
    width: 90,
    height: 90,
    borderRadius: BorderRadius.full,
    backgroundColor: Colors.primaryFixed,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: Spacing.md,
  },
  emptyTitle: {
    ...Typography.headlineLg,
    fontSize: 20,
    fontFamily: 'Inter-Bold',
    color: Colors.onSurface,
    marginBottom: Spacing.xs,
  },
  emptySubtitle: {
    ...Typography.bodyMd,
    fontSize: 13,
    color: Colors.onSurfaceVariant,
    textAlign: 'center',
    maxWidth: 300,
    marginBottom: Spacing.lg,
    lineHeight: 18,
  },
  emptyBtn: {
    minWidth: 190,
  },
  clearAllRow: {
    marginTop: Spacing.sm,
    marginBottom: Spacing.xs,
    width: '100%',
    alignItems: 'flex-start',
  },
  clearAllBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#D32F2F',
    paddingHorizontal: Spacing.md,
    paddingVertical: 8,
    borderRadius: BorderRadius.lg,
    gap: 6,
    shadowColor: '#D32F2F',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 2,
  },
  clearAllBtnText: {
    ...Typography.labelLg,
    fontSize: 13,
    fontFamily: 'Inter-Bold',
    color: '#FFFFFF',
  },
});

export default OrderHistoryScreen;
