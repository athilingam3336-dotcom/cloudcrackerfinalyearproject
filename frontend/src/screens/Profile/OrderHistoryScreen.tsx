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

type OrderHistoryScreenProps = NativeStackScreenProps<
  RootStackParamList,
  'OrderHistory'
>;

type FilterCategory = 'All' | 'In Transit' | 'Delivered' | 'Cancelled';

export const OrderHistoryScreen: React.FC<OrderHistoryScreenProps> = ({
  navigation,
}) => {
  const [selectedFilter, setSelectedFilter] = useState<FilterCategory>('All');
  const [orders, setOrders] = useState<OrderRecord[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [deletingOrderId, setDeletingOrderId] = useState<string | null>(null);
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
  const inTransitCount = orders.filter(
    (o) => o.status === 'In Transit' || o.status === 'Processing' || o.status === 'Confirmed' || o.status === 'Pending'
  ).length;
  const totalSpent = orders
    .filter((o) => o.status !== 'Cancelled')
    .reduce((sum, o) => sum + (o.totalPrice || 0), 0);

  const filteredOrders = useMemo(() => {
    if (selectedFilter === 'All') return orders;
    if (selectedFilter === 'In Transit') {
      return orders.filter(
        (o) => o.status === 'In Transit' || o.status === 'Processing' || o.status === 'Confirmed' || o.status === 'Pending'
      );
    }
    if (selectedFilter === 'Delivered') {
      return orders.filter((o) => o.status === 'Delivered');
    }
    if (selectedFilter === 'Cancelled') {
      return orders.filter(
        (o) => o.status === 'Cancelled' || o.paymentStatus === 'Refunded' || o.status === 'Refunded'
      );
    }
    return orders;
  }, [selectedFilter, orders]);

  const handleReorder = useCallback((orderNumber: string) => {
    Alert.alert('Re-order', `Items from ${orderNumber} added to cart.`);
  }, []);

  const handleDeleteOrder = useCallback((item: OrderRecord) => {
    Alert.alert(
      'Delete Order',
      `Are you sure you want to remove order ${item.orderNumber} from your order history? This cannot be undone.`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            setDeletingOrderId(item.id);
            try {
              await orderService.deleteOrder(item.id);
              setOrders((prev) => prev.filter((o) => o.id !== item.id));
              Alert.alert('Success', 'Order removed from your order history.');
            } catch (error: any) {
              const msg =
                error.response?.data?.message ||
                error.message ||
                'Failed to delete order.';
              Alert.alert('Error', msg);
            } finally {
              setDeletingOrderId(null);
            }
          },
        },
      ]
    );
  }, []);

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

  const getStatusBadgeStyles = (status: string, paymentStatus?: string) => {
    if (status === 'Cancelled') {
      return { badge: styles.cancelledBadge, text: styles.cancelledBadgeText, label: 'Cancelled' };
    }
    if (paymentStatus === 'Refunded' || status === 'Refunded') {
      return { badge: styles.refundedBadge, text: styles.refundedBadgeText, label: 'Refunded' };
    }
    if (status === 'Delivered') {
      return { badge: styles.deliveredBadge, text: styles.deliveredBadgeText, label: 'Delivered' };
    }
    if (status === 'In Transit') {
      return { badge: styles.inTransitBadge, text: styles.inTransitBadgeText, label: 'In Transit' };
    }
    if (status === 'Processing' || status === 'Confirmed') {
      return { badge: styles.processingBadge, text: styles.processingBadgeText, label: status };
    }
    return { badge: styles.pendingBadge, text: styles.pendingBadgeText, label: status || 'Pending' };
  };

  const renderOrderItem: ListRenderItem<OrderRecord> = useCallback(
    ({ item }) => {
      const badgeInfo = getStatusBadgeStyles(item.status, item.paymentStatus);
      const isDeletable =
        item.status === 'Cancelled' ||
        item.status === 'Delivered' ||
        item.paymentStatus === 'Refunded' ||
        item.status === 'Refunded';

      const isDeletingThis = deletingOrderId === item.id;

      return (
        <TouchableOpacity
          style={styles.orderCard}
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

          <View style={styles.orderActionsRow}>
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

            {item.status !== 'Cancelled' && (
              <TouchableOpacity
                style={styles.reorderBtn}
                onPress={() => handleReorder(item.orderNumber)}
                activeOpacity={0.8}
              >
                <Text style={styles.reorderBtnText}>Re-order</Text>
              </TouchableOpacity>
            )}
          </View>
        </TouchableOpacity>
      );
    },
    [navigation, handleReorder, handleDeleteOrder, deletingOrderId]
  );

  const renderHeader = useMemo(() => {
    return (
      <View style={styles.headerWrapper}>
        <HomeHeader
          onNotificationPress={() => navigation.navigate('Notifications')}
          onProfilePress={() => navigation.navigate('UserProfile')}
          onCartPress={() => navigation.navigate('Cart')}
          notificationCount={unreadNotifs}
        />

        <View style={styles.titleSection}>
          <Text style={styles.title}>Order History</Text>
          <Text style={styles.subtitle}>Review and track your previous pyrotechnic purchases.</Text>

          {/* Stats Bento Grid */}
          <View style={styles.statsGrid}>
            <View style={styles.statCard}>
              <View style={styles.statIconBox}>
                <MaterialIcons name="shopping-bag" size={20} color={Colors.primary} />
              </View>
              <View>
                <Text style={styles.statLabel}>TOTAL ORDERS</Text>
                <Text style={styles.statValue}>{totalOrders}</Text>
              </View>
            </View>
            <View style={styles.statCard}>
              <View style={[styles.statIconBox, { backgroundColor: Colors.secondaryContainer }]}>
                <MaterialIcons name="local-shipping" size={20} color={Colors.onSecondaryContainer} />
              </View>
              <View>
                <Text style={styles.statLabel}>IN TRANSIT</Text>
                <Text style={styles.statValue}>{inTransitCount}</Text>
              </View>
            </View>
            <View style={styles.statCard}>
              <View style={[styles.statIconBox, { backgroundColor: Colors.primaryFixed }]}>
                <MaterialIcons name="savings" size={20} color={Colors.primary} />
              </View>
              <View>
                <Text style={styles.statLabel}>TOTAL SPENT</Text>
                <Text style={styles.statValue}>{formatCurrency(totalSpent)}</Text>
              </View>
            </View>
          </View>

          {/* Filter Chips */}
          <View style={styles.filterRow}>
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
                >
                  {chip}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>
      </View>
    );
  }, [selectedFilter, navigation, unreadNotifs, totalOrders, inTransitCount, totalSpent]);

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
  statsGrid: {
    flexDirection: 'row',
    gap: Spacing.xs,
    marginTop: Spacing.md,
  },
  statCard: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.surfaceContainerLowest,
    borderRadius: BorderRadius.lg,
    padding: Spacing.xs,
    gap: Spacing.xs,
    borderWidth: 1,
    borderColor: Colors.surfaceContainerHigh,
  },
  statIconBox: {
    width: 36,
    height: 36,
    borderRadius: BorderRadius.lg,
    backgroundColor: Colors.primaryFixed,
    alignItems: 'center',
    justifyContent: 'center',
  },
  statLabel: {
    ...Typography.labelLg,
    fontSize: 9,
    fontFamily: 'Inter-Bold',
    color: Colors.tertiary,
  },
  statValue: {
    ...Typography.titleLg,
    fontSize: 13,
    fontFamily: 'Inter-Bold',
    color: Colors.onSurface,
  },
  filterRow: {
    flexDirection: 'row',
    gap: Spacing.xs,
    marginTop: Spacing.md,
    marginBottom: Spacing.xs,
  },
  filterChip: {
    paddingHorizontal: Spacing.md,
    paddingVertical: 6,
    borderRadius: BorderRadius.full,
    backgroundColor: Colors.surfaceContainerLow,
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
    justifyContent: 'flex-end',
    alignItems: 'center',
    gap: Spacing.xs,
    marginTop: Spacing.xs,
  },
  trackBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: Colors.primary,
    paddingHorizontal: Spacing.md,
    paddingVertical: 6,
    borderRadius: BorderRadius.lg,
    gap: 4,
  },
  trackBtnText: {
    ...Typography.labelLg,
    fontSize: 12,
    fontFamily: 'Inter-Bold',
    color: Colors.primary,
  },
  deleteBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#FFCDD2',
    backgroundColor: '#FFEBEE',
    paddingHorizontal: Spacing.sm,
    paddingVertical: 6,
    borderRadius: BorderRadius.lg,
    gap: 4,
  },
  deleteBtnText: {
    ...Typography.labelLg,
    fontSize: 12,
    fontFamily: 'Inter-Bold',
    color: '#D32F2F',
  },
  reorderBtn: {
    backgroundColor: Colors.primary,
    paddingHorizontal: Spacing.md,
    paddingVertical: 6,
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
});

export default OrderHistoryScreen;
