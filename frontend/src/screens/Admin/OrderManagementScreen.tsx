import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  ScrollView,
  TextInput,
  TouchableOpacity,
  Alert,
  Modal,
  Image,
  Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { MaterialIcons } from '@expo/vector-icons';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { Colors } from '@/constants/colors';
import { Typography } from '@/constants/typography';
import { Spacing, BorderRadius } from '@/constants/spacing';
import { HomeHeader } from '@/components/common/HomeHeader';
import { BottomNavBar, TabRoute } from '@/components/common/BottomNavBar';
import { LoadingSpinner } from '@/components/loaders/LoadingSpinner';
import { adminService, AdminOrderItem } from '@/services/adminService';
import { useNotificationStore } from '@/store';
import { RootStackParamList } from '@/navigation/types';
import { formatCurrency } from '@/utils/currency';
import { resolveProductImage } from '@/constants/productImages';

type OrderManagementScreenProps = NativeStackScreenProps<
  RootStackParamList,
  'OrderManagement'
>;

const ORDER_STATUS_OPTIONS: AdminOrderItem['orderStatus'][] = [
  'Pending',
  'Confirmed',
  'Packed',
  'Shipped',
  'Delivered',
  'Cancelled',
];

const PAYMENT_STATUS_OPTIONS: AdminOrderItem['paymentStatus'][] = [
  'Pending',
  'Paid',
  'Refunded',
  'Failed',
];

export const OrderManagementScreen: React.FC<OrderManagementScreenProps> = ({
  navigation,
}) => {
  const [orders, setOrders] = useState<AdminOrderItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [orderStatusFilter, setOrderStatusFilter] = useState<string>('All');
  const [paymentStatusFilter, setPaymentStatusFilter] = useState<string>('All');
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalOrders, setTotalOrders] = useState(0);

  // Status edit modal state
  const [selectedOrder, setSelectedOrder] = useState<AdminOrderItem | null>(null);
  const [editType, setEditType] = useState<'order' | 'payment' | null>(null);
  const [modalVisible, setModalVisible] = useState(false);
  const [expandedOrderIds, setExpandedOrderIds] = useState<Record<string, boolean>>({});
  const [deletingOrderId, setDeletingOrderId] = useState<string | null>(null);

  const toggleExpand = useCallback((orderId: string) => {
    setExpandedOrderIds((prev) => ({
      ...prev,
      [orderId]: !prev[orderId],
    }));
  }, []);

  const unreadNotifs = useNotificationStore((state) => state.getUnreadCount());

  const fetchOrders = useCallback(async () => {
    setIsLoading(true);
    setErrorMessage(null);
    try {
      const res = await adminService.getAdminOrders(
        page,
        10,
        searchQuery,
        orderStatusFilter,
        paymentStatusFilter
      );
      setOrders(res.orders);
      setTotalPages(res.totalPages);
      setTotalOrders(res.total);
    } catch (err: any) {
      const msg = err.response?.data?.message || err.message || 'Failed to fetch admin orders.';
      setErrorMessage(msg);
    } finally {
      setIsLoading(false);
    }
  }, [page, searchQuery, orderStatusFilter, paymentStatusFilter]);

  useEffect(() => {
    fetchOrders();
  }, [fetchOrders]);

  const handleUpdateOrderStatus = useCallback(
    async (orderId: string, newStatus: AdminOrderItem['orderStatus']) => {
      try {
        await adminService.updateOrderStatus(orderId, newStatus);
        setModalVisible(false);
        setSelectedOrder(null);
        setEditType(null);
        fetchOrders();
        Alert.alert('Success', `Order status updated to "${newStatus}".`);
      } catch (err: any) {
        const msg = err.response?.data?.message || err.message || 'Failed to update order status.';
        Alert.alert('Error', msg);
      }
    },
    [fetchOrders]
  );

  const handleUpdatePaymentStatus = useCallback(
    async (orderId: string, newStatus: AdminOrderItem['paymentStatus']) => {
      try {
        await adminService.updatePaymentStatus(orderId, newStatus);
        setModalVisible(false);
        setSelectedOrder(null);
        setEditType(null);
        fetchOrders();
        Alert.alert('Success', `Payment status updated to "${newStatus}".`);
      } catch (err: any) {
        const msg = err.response?.data?.message || err.message || 'Failed to update payment status.';
        Alert.alert('Error', msg);
      }
    },
    [fetchOrders]
  );

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

  const [isClearingAllCancelled, setIsClearingAllCancelled] = useState(false);

  const handleDeleteAllCancelledAdmin = useCallback(async () => {
    setIsClearingAllCancelled(true);
    try {
      const res = await adminService.deleteAllCancelledAdminOrders();
      const msg = `Successfully deleted ${res.deletedCount} cancelled order(s) from admin history.`;
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

  const handleDeleteOrderAdmin = useCallback(
    async (order: AdminOrderItem) => {
      setDeletingOrderId(order.id);
      try {
        await adminService.deleteAdminOrder(order.id);
        if (Platform.OS === 'web' && typeof window !== 'undefined') {
          window.alert(`Order ${order.orderNumber} removed successfully.`);
        } else {
          Alert.alert('Success', `Order ${order.orderNumber} removed successfully.`);
        }
        fetchOrders();
      } catch (error: any) {
        const msg = error.response?.data?.message || error.message || 'Failed to delete order.';
        if (Platform.OS === 'web' && typeof window !== 'undefined') {
          window.alert(`Error: ${msg}`);
        } else {
          Alert.alert('Error', msg);
        }
      } finally {
        setDeletingOrderId(null);
      }
    },
    [fetchOrders]
  );

  const renderHeader = useMemo(() => {
    return (
      <View style={styles.headerContainer}>
        <HomeHeader
          onBackPress={() => (navigation.canGoBack() ? navigation.goBack() : navigation.navigate('AdminDashboard'))}
          onNotificationPress={() => navigation.navigate('Notifications')}
          onProfilePress={() => navigation.navigate('UserProfile')}
          onCartPress={() => navigation.navigate('Cart')}
          notificationCount={unreadNotifs}
        />

        <View style={styles.titleSection}>
          <Text style={styles.title}>Admin Order Management</Text>
          <Text style={styles.subtitle}>
            Track, filter, and manage customer pyrotechnic orders ({totalOrders} total).
          </Text>

          {/* Search Box */}
          <View style={styles.searchBox}>
            <MaterialIcons name="search" size={20} color={Colors.tertiary} />
            <TextInput
              style={styles.searchInput}
              placeholder="Search order #, customer name, email..."
              placeholderTextColor={Colors.tertiary}
              value={searchQuery}
              onChangeText={(text) => {
                setSearchQuery(text);
                setPage(1);
              }}
            />
            {searchQuery.length > 0 && (
              <TouchableOpacity onPress={() => setSearchQuery('')} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
                <MaterialIcons name="close" size={18} color={Colors.tertiary} />
              </TouchableOpacity>
            )}
          </View>

          {/* Order Status Filters */}
          <Text style={styles.filterSectionLabel}>ORDER STATUS</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.filterRow}>
            {['All', 'Pending', 'Confirmed', 'Packed', 'Shipped', 'Delivered', 'Cancelled'].map((st) => (
              <TouchableOpacity
                key={st}
                style={[
                  styles.filterChip,
                  orderStatusFilter === st && styles.activeFilterChip,
                ]}
                onPress={() => {
                  setOrderStatusFilter(st);
                  setPage(1);
                }}
                activeOpacity={0.8}
              >
                <Text
                  style={[
                    styles.filterChipText,
                    orderStatusFilter === st && styles.activeFilterChipText,
                  ]}
                >
                  {st}
                </Text>
              </TouchableOpacity>
            ))}
          </ScrollView>

          {/* Payment Status Filters */}
          <Text style={styles.filterSectionLabel}>PAYMENT STATUS</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.filterRow}>
            {['All', 'Paid', 'Pending', 'Refunded', 'Failed'].map((pst) => (
              <TouchableOpacity
                key={pst}
                style={[
                  styles.filterChip,
                  paymentStatusFilter === pst && styles.activeFilterChip,
                ]}
                onPress={() => {
                  setPaymentStatusFilter(pst);
                  setPage(1);
                }}
                activeOpacity={0.8}
              >
                <Text
                  style={[
                    styles.filterChipText,
                    paymentStatusFilter === pst && styles.activeFilterChipText,
                  ]}
                >
                  {pst}
                </Text>
              </TouchableOpacity>
            ))}
          </ScrollView>

          {/* Bulk Delete All Cancelled Orders Button */}
          {(orderStatusFilter === 'Cancelled' || orders.some(o => (o.orderStatus || '').toLowerCase() === 'cancelled')) && (
            <View style={styles.clearAllRow}>
              <TouchableOpacity
                style={styles.clearAllBtn}
                onPress={handleDeleteAllCancelledAdmin}
                disabled={isClearingAllCancelled}
                activeOpacity={0.8}
              >
                <MaterialIcons name="delete-forever" size={18} color="#FFFFFF" />
                <Text style={styles.clearAllBtnText}>
                  {isClearingAllCancelled ? 'Deleting All Cancelled...' : 'Delete All Cancelled Orders'}
                </Text>
              </TouchableOpacity>
            </View>
          )}
        </View>
      </View>
    );
  }, [navigation, unreadNotifs, totalOrders, searchQuery, orderStatusFilter, paymentStatusFilter, orders, isClearingAllCancelled, handleDeleteAllCancelledAdmin]);

  const renderOrderItem = useCallback(
    ({ item }: { item: AdminOrderItem }) => {
      const isExpanded = Boolean(expandedOrderIds[item.id]);
      const st = (item.orderStatus || '').toLowerCase();
      const ps = (item.paymentStatus || '').toLowerCase();
      const isDeletable = ['delivered', 'cancelled'].includes(st) || ps === 'refunded';

      return (
        <View style={styles.orderCard}>
          {/* Header Row */}
          <View style={styles.orderCardHeader}>
            <View style={styles.orderNumberCol}>
              <Text style={styles.orderNumber}>{item.orderNumber}</Text>
              <Text style={styles.orderDate}>{item.date} • {item.itemCount} items</Text>
            </View>
            <Text style={styles.orderAmount}>{formatCurrency(item.totalAmount)}</Text>
          </View>

          {/* Customer Details */}
          <View style={styles.customerBox}>
            <MaterialIcons name="person-outline" size={16} color={Colors.tertiary} />
            <Text style={styles.customerName}>{item.customerName}</Text>
            <Text style={styles.customerEmail}>({item.customerEmail})</Text>
          </View>

          {/* Payment Info */}
          <View style={styles.paymentInfoRow}>
            <MaterialIcons name="payment" size={14} color={Colors.primary} />
            <Text style={styles.paymentInfoText}>
              {item.paymentMethod || 'Razorpay'}
              {item.razorpayPaymentId ? ` • ID: ${item.razorpayPaymentId}` : ''}
            </Text>
          </View>

          {/* Status Badges & Quick Dropdown Modals */}
          <View style={styles.statusRow}>
            {/* Order Status Badge */}
            <TouchableOpacity
              style={[
                styles.statusBadge,
                ['shipped', 'packed', 'in transit'].includes(st)
                  ? styles.inTransitBadge
                  : st === 'delivered'
                  ? styles.deliveredBadge
                  : st === 'cancelled'
                  ? styles.cancelledBadge
                  : styles.pendingBadge,
              ]}
              onPress={() => {
                setSelectedOrder(item);
                setEditType('order');
                setModalVisible(true);
              }}
              activeOpacity={0.8}
            >
              <Text style={styles.badgeLabel}>Order:</Text>
              <Text style={styles.badgeValue}>{item.orderStatus}</Text>
              <MaterialIcons name="arrow-drop-down" size={16} color={Colors.onSurface} />
            </TouchableOpacity>

            {/* Payment Status Badge */}
            <TouchableOpacity
              style={[
                styles.statusBadge,
                item.paymentStatus === 'Paid'
                  ? styles.paidBadge
                  : item.paymentStatus === 'Refunded'
                  ? styles.refundedBadge
                  : styles.unpaidBadge,
              ]}
              onPress={() => {
                setSelectedOrder(item);
                setEditType('payment');
                setModalVisible(true);
              }}
              activeOpacity={0.8}
            >
              <Text style={styles.badgeLabel}>Pay:</Text>
              <Text style={styles.badgeValue}>{item.paymentStatus}</Text>
              <MaterialIcons name="arrow-drop-down" size={16} color={Colors.onSurface} />
            </TouchableOpacity>
          </View>

          {/* Actions Row */}
          <View style={styles.actionsRow}>
            {isDeletable && (
              <TouchableOpacity
                style={[styles.actionButton, styles.deleteActionButton]}
                onPress={() => handleDeleteOrderAdmin(item)}
                disabled={deletingOrderId === item.id}
                activeOpacity={0.8}
              >
                <MaterialIcons name="delete-outline" size={16} color="#D32F2F" />
                <Text style={styles.deleteActionButtonText}>
                  {deletingOrderId === item.id ? 'Deleting...' : 'Delete Order'}
                </Text>
              </TouchableOpacity>
            )}

            <TouchableOpacity
              style={[styles.toggleProductsBtn, isExpanded && styles.toggleProductsBtnActive]}
              onPress={() => toggleExpand(item.id)}
              activeOpacity={0.8}
            >
              <MaterialIcons
                name={isExpanded ? 'expand-less' : 'expand-more'}
                size={18}
                color={isExpanded ? Colors.primary : Colors.onSurfaceVariant}
              />
              <Text style={[styles.toggleProductsBtnText, isExpanded && styles.toggleProductsBtnTextActive]}>
                {isExpanded ? 'Hide Products' : `View Products (${item.itemCount || item.items?.length || 0})`}
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.viewDetailsBtn}
              onPress={() => navigation.navigate('OrderDetails', { orderId: item.id })}
              activeOpacity={0.8}
            >
              <MaterialIcons name="visibility" size={16} color={Colors.primary} />
              <Text style={styles.viewDetailsText}>View Details</Text>
            </TouchableOpacity>
          </View>

          {/* Expanded Ordered Products & Address */}
          {isExpanded && (
            <View style={styles.expandedOrderSection}>
              <Text style={styles.expandedSectionTitle}>
                📦 Ordered Items ({item.items?.length || item.itemCount})
              </Text>

              {item.items && item.items.length > 0 ? (
                <View style={styles.expandedItemsList}>
                  {item.items.map((prodItem, pIdx) => (
                    <View key={prodItem.id || prodItem.product_id || pIdx} style={styles.productRow}>
                      <Image
                        source={resolveProductImage({
                          name: prodItem.product_name || prodItem.product?.name,
                          category: prodItem.category || prodItem.product?.category,
                          images: prodItem.product_image ? [prodItem.product_image] : (prodItem.product?.images || []),
                        })}
                        style={styles.productThumb}
                        resizeMode="cover"
                      />
                      <View style={styles.productInfoCol}>
                        <Text style={styles.productTitle} numberOfLines={2}>
                          {prodItem.product_name || prodItem.product?.name || 'Cracker Item'}
                        </Text>
                        {(prodItem.category || prodItem.product?.category) ? (
                          <Text style={styles.productCategory}>
                            {prodItem.category || prodItem.product?.category}
                          </Text>
                        ) : null}
                        <Text style={styles.productQtyPrice}>
                          Qty: <Text style={{ fontWeight: '700', color: Colors.onSurface }}>{prodItem.quantity}</Text> × {formatCurrency(prodItem.unit_price || prodItem.price || 0)}
                        </Text>
                      </View>
                      <Text style={styles.productTotal}>
                        {formatCurrency(prodItem.subtotal || (prodItem.quantity * (prodItem.unit_price || prodItem.price || 0)))}
                      </Text>
                    </View>
                  ))}
                </View>
              ) : (
                <Text style={styles.noItemsNote}>Item count: {item.itemCount} items</Text>
              )}

              {item.shippingAddress ? (
                <View style={styles.addressBox}>
                  <MaterialIcons name="local-shipping" size={14} color={Colors.primary} />
                  <Text style={styles.addressText} numberOfLines={2}>
                    {item.shippingAddress}
                  </Text>
                </View>
              ) : null}

              {(item.razorpayOrderId || (item.razorpayPaymentId && item.paymentStatus !== 'Pending')) ? (
                <View style={styles.razorpayInfoBox}>
                  <MaterialIcons name="verified" size={14} color="#0284C7" />
                  <Text style={styles.razorpayText}>
                    {item.razorpayOrderId ? `Order: ${item.razorpayOrderId}` : ''}
                    {item.razorpayPaymentId ? ` • Pay: ${item.razorpayPaymentId}` : ''}
                  </Text>
                </View>
              ) : null}
            </View>
          )}
        </View>
      );
    },
    [navigation, expandedOrderIds, toggleExpand]
  );

  const renderFooter = useMemo(() => {
    return (
      <View style={styles.paginationContainer}>
        <TouchableOpacity
          style={[styles.pageBtn, page <= 1 && styles.disabledPageBtn]}
          onPress={() => setPage((p) => Math.max(1, p - 1))}
          disabled={page <= 1}
          activeOpacity={0.8}
        >
          <MaterialIcons name="chevron-left" size={20} color={page <= 1 ? Colors.tertiary : Colors.onSurface} />
          <Text style={[styles.pageBtnText, page <= 1 && styles.disabledPageText]}>Previous</Text>
        </TouchableOpacity>

        <Text style={styles.pageIndicator}>
          Page {page} of {totalPages}
        </Text>

        <TouchableOpacity
          style={[styles.pageBtn, page >= totalPages && styles.disabledPageBtn]}
          onPress={() => setPage((p) => Math.min(totalPages, p + 1))}
          disabled={page >= totalPages}
          activeOpacity={0.8}
        >
          <Text style={[styles.pageBtnText, page >= totalPages && styles.disabledPageText]}>Next</Text>
          <MaterialIcons name="chevron-right" size={20} color={page >= totalPages ? Colors.tertiary : Colors.onSurface} />
        </TouchableOpacity>
      </View>
    );
  }, [page, totalPages]);

  const renderEmpty = useMemo(() => {
    if (isLoading) return null;
    return (
      <View style={styles.emptyContainer}>
        <MaterialIcons name="search-off" size={48} color={Colors.tertiary} />
        <Text style={styles.emptyTitle}>No Orders Found</Text>
        <Text style={styles.emptySubtitle}>
          {searchQuery.trim() || orderStatusFilter !== 'All' || paymentStatusFilter !== 'All'
            ? 'No pyrotechnic orders match the selected filters or search terms.'
            : 'No customer orders have been placed yet.'}
        </Text>
        {(searchQuery.trim() || orderStatusFilter !== 'All' || paymentStatusFilter !== 'All') && (
          <TouchableOpacity
            style={styles.resetFiltersBtn}
            onPress={() => {
              setSearchQuery('');
              setOrderStatusFilter('All');
              setPaymentStatusFilter('All');
              setPage(1);
            }}
          >
            <Text style={styles.resetFiltersBtnText}>Reset Filters</Text>
          </TouchableOpacity>
        )}
      </View>
    );
  }, [isLoading, searchQuery, orderStatusFilter, paymentStatusFilter]);

  return (
    <SafeAreaView style={styles.safeArea} edges={['top', 'left', 'right']}>
      {errorMessage && (
        <View style={styles.errorBanner}>
          <MaterialIcons name="error-outline" size={18} color="#D32F2F" />
          <Text style={styles.errorText}>{errorMessage}</Text>
          <TouchableOpacity onPress={fetchOrders}>
            <Text style={styles.retryText}>Retry</Text>
          </TouchableOpacity>
        </View>
      )}

      {isLoading && orders.length === 0 ? (
        <>
          {renderHeader}
          <LoadingSpinner message="Fetching admin orders table..." />
        </>
      ) : (
        <FlatList
          data={orders}
          keyExtractor={(item) => item.id}
          renderItem={renderOrderItem}
          ListHeaderComponent={renderHeader}
          ListFooterComponent={orders.length > 0 ? renderFooter : null}
          ListEmptyComponent={renderEmpty}
          contentContainerStyle={styles.listContent}
          showsVerticalScrollIndicator={false}
          onRefresh={fetchOrders}
          refreshing={isLoading}
        />
      )}

      {/* Edit Status Modal */}
      <Modal
        visible={modalVisible}
        transparent
        animationType="fade"
        onRequestClose={() => setModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>
                Update {editType === 'order' ? 'Order' : 'Payment'} Status
              </Text>
              <TouchableOpacity onPress={() => setModalVisible(false)} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
                <MaterialIcons name="close" size={20} color={Colors.onSurface} />
              </TouchableOpacity>
            </View>

            <Text style={styles.modalSubtitle}>
              Order: {selectedOrder?.orderNumber} ({selectedOrder?.customerName})
            </Text>

            <View style={styles.modalOptionsList}>
              {editType === 'order'
                ? ORDER_STATUS_OPTIONS.map((opt) => (
                    <TouchableOpacity
                      key={opt}
                      style={[
                        styles.modalOptionItem,
                        selectedOrder?.orderStatus === opt && styles.selectedModalOption,
                      ]}
                      onPress={() => selectedOrder && handleUpdateOrderStatus(selectedOrder.id, opt)}
                    >
                      <Text
                        style={[
                          styles.modalOptionText,
                          selectedOrder?.orderStatus === opt && styles.selectedModalOptionText,
                        ]}
                      >
                        {opt}
                      </Text>
                      {selectedOrder?.orderStatus === opt && (
                        <MaterialIcons name="check" size={18} color={Colors.primary} />
                      )}
                    </TouchableOpacity>
                  ))
                : PAYMENT_STATUS_OPTIONS.map((opt) => (
                    <TouchableOpacity
                      key={opt}
                      style={[
                        styles.modalOptionItem,
                        selectedOrder?.paymentStatus === opt && styles.selectedModalOption,
                      ]}
                      onPress={() => selectedOrder && handleUpdatePaymentStatus(selectedOrder.id, opt)}
                    >
                      <Text
                        style={[
                          styles.modalOptionText,
                          selectedOrder?.paymentStatus === opt && styles.selectedModalOptionText,
                        ]}
                      >
                        {opt}
                      </Text>
                      {selectedOrder?.paymentStatus === opt && (
                        <MaterialIcons name="check" size={18} color={Colors.primary} />
                      )}
                    </TouchableOpacity>
                  ))}
            </View>
          </View>
        </View>
      </Modal>

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
  headerContainer: {
    marginBottom: Spacing.sm,
  },
  titleSection: {
    paddingHorizontal: Spacing.marginMobile,
    marginTop: Spacing.sm,
  },
  title: {
    ...Typography.headlineLg,
    fontSize: 24,
    fontFamily: 'Inter-Bold',
    color: Colors.onSurface,
  },
  subtitle: {
    ...Typography.bodyMd,
    fontSize: 13,
    color: Colors.onSurfaceVariant,
    marginTop: 2,
  },
  searchBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.surfaceContainerLow,
    borderRadius: BorderRadius.lg,
    paddingHorizontal: Spacing.sm,
    height: 44,
    marginTop: Spacing.md,
    borderWidth: 1,
    borderColor: Colors.surfaceContainerHigh,
    gap: Spacing.xs,
  },
  searchInput: {
    flex: 1,
    ...Typography.bodyLg,
    fontSize: 14,
    color: Colors.onSurface,
  },
  filterSectionLabel: {
    ...Typography.labelLg,
    fontSize: 10,
    fontFamily: 'Inter-Bold',
    color: Colors.tertiary,
    marginTop: Spacing.md,
    marginBottom: 4,
    letterSpacing: 1,
  },
  filterRow: {
    gap: Spacing.xs,
    paddingRight: Spacing.marginMobile,
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
    backgroundColor: Colors.surfaceContainerLowest,
    marginHorizontal: Spacing.marginMobile,
    marginBottom: Spacing.sm,
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
    alignItems: 'flex-start',
  },
  orderNumberCol: {
    flex: 1,
  },
  orderNumber: {
    ...Typography.titleLg,
    fontSize: 16,
    fontFamily: 'Inter-Bold',
    color: Colors.onSurface,
  },
  orderDate: {
    ...Typography.bodyMd,
    fontSize: 12,
    color: Colors.tertiary,
    marginTop: 2,
  },
  orderAmount: {
    ...Typography.headlineLg,
    fontSize: 18,
    fontFamily: 'Inter-Bold',
    color: Colors.primary,
  },
  customerBox: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: Spacing.xs,
    gap: 4,
  },
  customerName: {
    ...Typography.bodyMd,
    fontSize: 13,
    fontFamily: 'Inter-Bold',
    color: Colors.onSurface,
  },
  customerEmail: {
    ...Typography.bodyMd,
    fontSize: 12,
    color: Colors.tertiary,
  },
  paymentInfoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 4,
    gap: 4,
  },
  paymentInfoText: {
    ...Typography.bodyMd,
    fontSize: 12,
    color: Colors.primary,
    fontFamily: 'Inter-Medium',
  },
  statusRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.xs,
    marginTop: Spacing.sm,
  },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: Spacing.xs + 2,
    paddingVertical: 4,
    borderRadius: BorderRadius.lg,
    borderWidth: 1,
    borderColor: Colors.surfaceContainerHigh,
    gap: 4,
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
  paidBadge: {
    backgroundColor: Colors.secondaryContainer,
  },
  refundedBadge: {
    backgroundColor: Colors.surfaceContainerHigh,
  },
  unpaidBadge: {
    backgroundColor: Colors.primaryContainer,
  },
  badgeLabel: {
    ...Typography.labelLg,
    fontSize: 10,
    color: Colors.tertiary,
  },
  badgeValue: {
    ...Typography.labelLg,
    fontSize: 11,
    fontFamily: 'Inter-Bold',
    color: Colors.onSurface,
  },
  actionsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: Spacing.xs,
    marginTop: Spacing.sm,
    paddingTop: Spacing.xs,
    borderTopWidth: 1,
    borderTopColor: Colors.surfaceContainerHigh,
  },
  toggleProductsBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.surfaceContainerLow,
    borderWidth: 1,
    borderColor: Colors.surfaceContainerHigh,
    paddingHorizontal: Spacing.sm,
    paddingVertical: 6,
    borderRadius: BorderRadius.lg,
    gap: 4,
  },
  toggleProductsBtnActive: {
    backgroundColor: Colors.primaryContainer,
    borderColor: Colors.primary,
  },
  toggleProductsBtnText: {
    ...Typography.labelLg,
    fontSize: 12,
    color: Colors.onSurfaceVariant,
    fontFamily: 'Inter-Medium',
  },
  toggleProductsBtnTextActive: {
    color: Colors.primary,
    fontFamily: 'Inter-Bold',
  },
  viewDetailsBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: Colors.primary,
    paddingHorizontal: Spacing.md,
    paddingVertical: 6,
    borderRadius: BorderRadius.lg,
    gap: 4,
  },
  viewDetailsText: {
    ...Typography.labelLg,
    fontSize: 12,
    fontFamily: 'Inter-Bold',
    color: Colors.primary,
  },
  expandedOrderSection: {
    marginTop: Spacing.sm,
    paddingTop: Spacing.sm,
    borderTopWidth: 1,
    borderTopColor: Colors.surfaceContainerHigh,
    gap: Spacing.xs,
  },
  expandedSectionTitle: {
    ...Typography.labelLg,
    fontSize: 12,
    fontFamily: 'Inter-Bold',
    color: Colors.onSurface,
    marginBottom: 2,
  },
  expandedItemsList: {
    gap: 6,
  },
  productRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.surfaceContainerLow,
    borderRadius: BorderRadius.md,
    padding: Spacing.xs,
    borderWidth: 1,
    borderColor: Colors.surfaceContainerHigh,
    gap: Spacing.sm,
  },
  productThumb: {
    width: 40,
    height: 40,
    borderRadius: 6,
    backgroundColor: Colors.surfaceContainerHigh,
  },
  productInfoCol: {
    flex: 1,
  },
  productTitle: {
    ...Typography.bodyMd,
    fontSize: 12,
    fontFamily: 'Inter-Bold',
    color: Colors.onSurface,
  },
  productCategory: {
    fontSize: 10,
    color: Colors.primary,
    fontFamily: 'Inter-Medium',
    marginTop: 1,
  },
  productQtyPrice: {
    fontSize: 11,
    color: Colors.tertiary,
    marginTop: 1,
  },
  productTotal: {
    ...Typography.labelLg,
    fontSize: 12,
    fontFamily: 'Inter-Bold',
    color: Colors.onSurface,
    paddingRight: Spacing.xs,
  },
  noItemsNote: {
    fontSize: 12,
    color: Colors.tertiary,
    paddingVertical: 4,
  },
  addressBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.surfaceContainerLow,
    borderRadius: BorderRadius.md,
    padding: Spacing.xs + 2,
    borderWidth: 1,
    borderColor: Colors.surfaceContainerHigh,
    gap: 6,
    marginTop: 2,
  },
  addressText: {
    flex: 1,
    fontSize: 11,
    color: Colors.onSurfaceVariant,
  },
  razorpayInfoBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F0F9FF',
    borderRadius: BorderRadius.md,
    padding: Spacing.xs + 2,
    borderWidth: 1,
    borderColor: '#BAE6FD',
    gap: 6,
    marginTop: 2,
  },
  razorpayText: {
    fontSize: 11,
    color: '#0369A1',
    fontFamily: 'Inter-Medium',
  },
  paginationContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: Spacing.marginMobile,
    marginVertical: Spacing.md,
  },
  pageBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.surfaceContainerLow,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.xs,
    borderRadius: BorderRadius.lg,
    borderWidth: 1,
    borderColor: Colors.surfaceContainerHigh,
    gap: 4,
  },
  disabledPageBtn: {
    opacity: 0.4,
  },
  pageBtnText: {
    ...Typography.labelLg,
    fontSize: 13,
    fontFamily: 'Inter-Bold',
    color: Colors.onSurface,
  },
  disabledPageText: {
    color: Colors.tertiary,
  },
  pageIndicator: {
    ...Typography.bodyMd,
    fontSize: 13,
    color: Colors.onSurfaceVariant,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: Spacing.marginMobile,
  },
  modalContent: {
    width: '100%',
    backgroundColor: Colors.surfaceContainerLowest,
    borderRadius: BorderRadius.xl,
    padding: Spacing.md,
    borderWidth: 1,
    borderColor: Colors.surfaceContainerHigh,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  modalTitle: {
    ...Typography.titleLg,
    fontSize: 18,
    fontFamily: 'Inter-Bold',
    color: Colors.onSurface,
  },
  modalSubtitle: {
    ...Typography.bodyMd,
    fontSize: 12,
    color: Colors.tertiary,
    marginTop: 2,
    marginBottom: Spacing.sm,
  },
  modalOptionsList: {
    gap: Spacing.xs,
  },
  modalOptionItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: Spacing.sm,
    borderRadius: BorderRadius.lg,
    backgroundColor: Colors.surfaceContainerLow,
    borderWidth: 1,
    borderColor: Colors.surfaceContainerHigh,
  },
  selectedModalOption: {
    borderColor: Colors.primary,
    backgroundColor: Colors.primaryContainer,
  },
  modalOptionText: {
    ...Typography.titleLg,
    fontSize: 14,
    color: Colors.onSurface,
  },
  selectedModalOptionText: {
    fontFamily: 'Inter-Bold',
    color: Colors.onPrimaryContainer,
  },
  errorBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#FFEBEE',
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    marginHorizontal: Spacing.marginMobile,
    marginTop: Spacing.xs,
    borderRadius: BorderRadius.lg,
    gap: Spacing.xs,
  },
  errorText: {
    flex: 1,
    ...Typography.bodyMd,
    fontSize: 12,
    color: '#D32F2F',
  },
  retryText: {
    ...Typography.labelLg,
    fontSize: 12,
    fontFamily: 'Inter-Bold',
    color: '#D32F2F',
    textDecorationLine: 'underline',
  },
  emptyContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: Spacing.xl * 2,
    paddingHorizontal: Spacing.xl,
    gap: Spacing.xs,
  },
  emptyTitle: {
    ...Typography.titleLg,
    fontSize: 18,
    fontFamily: 'Inter-Bold',
    color: Colors.onSurface,
    marginTop: Spacing.xs,
  },
  emptySubtitle: {
    ...Typography.bodyMd,
    fontSize: 13,
    color: Colors.tertiary,
    textAlign: 'center',
  },
  resetFiltersBtn: {
    marginTop: Spacing.md,
    backgroundColor: Colors.primary,
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.sm,
    borderRadius: BorderRadius.lg,
  },
  resetFiltersBtnText: {
    ...Typography.labelLg,
    fontSize: 13,
    fontFamily: 'Inter-Bold',
    color: Colors.onPrimary,
  },
  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: Colors.surfaceContainerLow,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.xs,
    borderRadius: BorderRadius.md,
    borderWidth: 1,
    borderColor: Colors.surfaceContainerHigh,
  },
  actionButtonText: {
    ...Typography.labelLg,
    fontSize: 12,
    color: Colors.primary,
  },
  deleteActionButton: {
    backgroundColor: '#FFEBEE',
    borderColor: '#FFCDD2',
  },
  deleteActionButtonText: {
    ...Typography.labelLg,
    fontSize: 12,
    fontFamily: 'Inter-Bold',
    color: '#D32F2F',
  },
  clearAllRow: {
    marginTop: Spacing.md,
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

export default OrderManagementScreen;
