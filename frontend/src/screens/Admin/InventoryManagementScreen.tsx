import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  Image,
  TouchableOpacity,
  Modal,
  Alert,
  ScrollView,
  ListRenderItem,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { MaterialIcons } from '@expo/vector-icons';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { Colors } from '@/constants/colors';
import { Typography } from '@/constants/typography';
import { Spacing, BorderRadius } from '@/constants/spacing';
import { HomeHeader } from '@/components/common/HomeHeader';
import { SearchBar } from '@/components/inputs/SearchBar';
import { CustomInput } from '@/components/inputs/CustomInput';
import { PrimaryButton } from '@/components/buttons/PrimaryButton';
import { BottomNavBar, TabRoute } from '@/components/common/BottomNavBar';
import { LoadingSpinner } from '@/components/loaders/LoadingSpinner';
import {
  adminService,
  InventoryItemOverviewUI,
  InventorySummaryMetrics,
  InventoryHistoryItemUI,
  AdminCategoryItem,
} from '@/services/adminService';
import { useNotificationStore } from '@/store';
import { RootStackParamList } from '@/navigation/types';
import { formatCurrency } from '@/utils/currency';
import { resolveProductImage } from '@/constants/productImages';

type InventoryManagementScreenProps = NativeStackScreenProps<
  RootStackParamList,
  'InventoryManagement'
>;

export const InventoryManagementScreen: React.FC<InventoryManagementScreenProps> = ({
  navigation,
}) => {
  const [items, setItems] = useState<InventoryItemOverviewUI[]>([]);
  const [metrics, setMetrics] = useState<InventorySummaryMetrics>({
    totalProducts: 0,
    totalStockUnits: 0,
    lowStockCount: 0,
    outOfStockCount: 0,
  });
  const [categories, setCategories] = useState<AdminCategoryItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Search & Filter & Pagination States
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<'All' | 'In Stock' | 'Low Stock' | 'Out of Stock'>('All');
  const [selectedCategory, setSelectedCategory] = useState<string>('All');
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalItems, setTotalItems] = useState(0);

  // Adjust Stock Modal State
  const [isAdjustModalVisible, setIsAdjustModalVisible] = useState(false);
  const [adjustingProduct, setAdjustingProduct] = useState<InventoryItemOverviewUI | null>(null);
  const [adjustTxType, setAdjustTxType] = useState<'IN' | 'OUT' | 'ADJUST'>('IN');
  const [adjustQuantity, setAdjustQuantity] = useState('20');
  const [adjustRemarks, setAdjustRemarks] = useState('');

  // History Modal State
  const [isHistoryModalVisible, setIsHistoryModalVisible] = useState(false);
  const [historyProduct, setHistoryProduct] = useState<InventoryItemOverviewUI | null>(null);
  const [historyLogs, setHistoryLogs] = useState<InventoryHistoryItemUI[]>([]);
  const [isLoadingHistory, setIsLoadingHistory] = useState(false);

  const unreadNotifs = useNotificationStore((state) => state.getUnreadCount());

  // 1. Fetch categories on mount for filter chips
  useEffect(() => {
    let isMounted = true;
    adminService.getCategories(true).then((cats) => {
      if (isMounted) setCategories(cats);
    });
    return () => {
      isMounted = false;
    };
  }, []);

  // 2. Fetch inventory overview from backend
  const fetchInventory = useCallback(async () => {
    setIsLoading(true);
    setErrorMessage(null);
    try {
      const res = await adminService.getInventoryOverview({
        page,
        limit: 10,
        search: searchQuery,
        statusFilter,
        categoryId: selectedCategory,
      });
      setItems(res.items);
      setMetrics(res.metrics);
      setTotalPages(res.pagination.pages);
      setTotalItems(res.pagination.total);
    } catch (err: any) {
      const msg =
        err.response?.data?.message || err.message || 'Failed to fetch inventory from backend.';
      setErrorMessage(msg);
    } finally {
      setIsLoading(false);
    }
  }, [page, searchQuery, statusFilter, selectedCategory]);

  useEffect(() => {
    fetchInventory();
  }, [fetchInventory]);

  // Open Quick Adjust Stock Modal
  const handleOpenAdjustModal = useCallback((item: InventoryItemOverviewUI) => {
    setAdjustingProduct(item);
    setAdjustTxType('IN');
    setAdjustQuantity('20');
    setAdjustRemarks(`Warehouse delivery for ${item.name}`);
    setIsAdjustModalVisible(true);
  }, []);

  // Save Stock Adjustment
  const handleSaveAdjustment = useCallback(async () => {
    if (!adjustingProduct) return;
    const qty = parseInt(adjustQuantity, 10);
    if (isNaN(qty) || qty < (adjustTxType === 'ADJUST' ? 0 : 1)) {
      Alert.alert(
        'Validation Error',
        `Quantity must be ${adjustTxType === 'ADJUST' ? '0 or greater' : 'at least 1'}.`
      );
      return;
    }

    if (adjustTxType === 'OUT' && qty > adjustingProduct.stock) {
      Alert.alert(
        'Validation Error',
        `Cannot deduct ${qty} units when current stock is only ${adjustingProduct.stock}.`
      );
      return;
    }

    setIsSaving(true);
    try {
      await adminService.adjustInventory(
        adjustingProduct.productId,
        adjustTxType,
        qty,
        adjustRemarks.trim() || undefined
      );
      Alert.alert(
        'Stock Adjusted',
        `Successfully logged ${adjustTxType} transaction for "${adjustingProduct.name}".`
      );
      setIsAdjustModalVisible(false);
      setAdjustingProduct(null);
      fetchInventory();
    } catch (err: any) {
      const msg = err.response?.data?.message || err.message || 'Stock adjustment failed.';
      Alert.alert('Adjustment Error', msg);
    } finally {
      setIsSaving(false);
    }
  }, [adjustingProduct, adjustTxType, adjustQuantity, adjustRemarks, fetchInventory]);

  // Open History Modal
  const handleOpenHistoryModal = useCallback(async (item: InventoryItemOverviewUI) => {
    setHistoryProduct(item);
    setIsHistoryModalVisible(true);
    setIsLoadingHistory(true);
    try {
      const logs = await adminService.getInventoryHistory(item.productId);
      setHistoryLogs(logs);
    } catch {
      setHistoryLogs([]);
    } finally {
      setIsLoadingHistory(false);
    }
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

  // Render Product Inventory Row
  const renderItemRow: ListRenderItem<InventoryItemOverviewUI> = useCallback(
    ({ item }) => {
      const isOut = item.stockStatus === 'OUT_OF_STOCK' || item.stock <= 0;
      const isLow = item.stockStatus === 'LOW_STOCK' || (item.stock > 0 && item.stock <= item.minimumStock);

      return (
        <View style={styles.itemCard}>
          <Image
            source={resolveProductImage(item.name)}
            style={styles.itemThumb}
            resizeMode="cover"
          />

          <View style={styles.itemInfo}>
            <View style={styles.titleRow}>
              <Text style={styles.itemName} numberOfLines={1}>
                {item.name}
              </Text>
            </View>

            <Text style={styles.itemCategory}>{item.categoryName}</Text>
            <Text style={styles.itemPrice}>{formatCurrency(item.price)}</Text>

            {/* Stock status indicator */}
            <View style={styles.statusBadgeRow}>
              <View
                style={[
                  styles.statusBadge,
                  isOut
                    ? styles.statusBadgeOut
                    : isLow
                    ? styles.statusBadgeLow
                    : styles.statusBadgeIn,
                ]}
              >
                <MaterialIcons
                  name={isOut ? 'error-outline' : isLow ? 'warning' : 'check-circle'}
                  size={12}
                  color={isOut ? '#D32F2F' : isLow ? '#ED6C02' : '#2E7D32'}
                />
                <Text
                  style={[
                    styles.statusBadgeText,
                    isOut
                      ? styles.statusTextOut
                      : isLow
                      ? styles.statusTextLow
                      : styles.statusTextIn,
                  ]}
                >
                  {isOut
                    ? 'OUT OF STOCK (0)'
                    : isLow
                    ? `LOW STOCK (${item.stock})`
                    : `IN STOCK (${item.stock})`}
                </Text>
              </View>

              <Text style={styles.minStockText}>Min: {item.minimumStock}</Text>
            </View>
          </View>

          {/* Action buttons */}
          <View style={styles.actionsColumn}>
            <TouchableOpacity
              style={styles.adjustBtn}
              onPress={() => handleOpenAdjustModal(item)}
              activeOpacity={0.7}
            >
              <MaterialIcons name="edit" size={14} color={Colors.primary} />
              <Text style={styles.adjustBtnText}>Adjust</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.historyBtn}
              onPress={() => handleOpenHistoryModal(item)}
              activeOpacity={0.7}
            >
              <MaterialIcons name="history" size={14} color={Colors.onSurfaceVariant} />
              <Text style={styles.historyBtnText}>Logs</Text>
            </TouchableOpacity>
          </View>
        </View>
      );
    },
    [handleOpenAdjustModal, handleOpenHistoryModal]
  );

  // Render Header (Dashboard Metrics + Search + Filter Chips)
  const renderHeader = useMemo(() => {
    return (
      <View style={styles.headerWrapper}>
        <HomeHeader
          onNotificationPress={() => navigation.navigate('Notifications')}
          onProfilePress={() => navigation.navigate('UserProfile')}
          onCartPress={() => navigation.navigate('Cart')}
          notificationCount={unreadNotifs}
        />

        <View style={styles.topSection}>
          <View style={styles.screenTitleRow}>
            <View>
              <Text style={styles.screenTitle}>Inventory Control</Text>
              <Text style={styles.screenSubtitle}>
                Live stock monitoring and warehouse auditing
              </Text>
            </View>
          </View>

          {/* Metric Summary Cards */}
          <View style={styles.metricsGrid}>
            <View style={styles.metricCard}>
              <View style={[styles.metricIconCircle, { backgroundColor: '#E3F2FD' }]}>
                <MaterialIcons name="inventory-2" size={18} color="#1976D2" />
              </View>
              <Text style={styles.metricLabel}>TOTAL PRODUCTS</Text>
              <Text style={styles.metricValue}>{metrics.totalProducts}</Text>
            </View>

            <View style={styles.metricCard}>
              <View style={[styles.metricIconCircle, { backgroundColor: '#E8F5E9' }]}>
                <MaterialIcons name="all-inbox" size={18} color="#2E7D32" />
              </View>
              <Text style={styles.metricLabel}>TOTAL UNITS</Text>
              <Text style={styles.metricValue}>{metrics.totalStockUnits}</Text>
            </View>

            <TouchableOpacity
              style={[
                styles.metricCard,
                statusFilter === 'Low Stock' && styles.metricCardSelected,
              ]}
              onPress={() => {
                setStatusFilter(statusFilter === 'Low Stock' ? 'All' : 'Low Stock');
                setPage(1);
              }}
              activeOpacity={0.8}
            >
              <View style={[styles.metricIconCircle, { backgroundColor: '#FFF3E0' }]}>
                <MaterialIcons name="warning" size={18} color="#ED6C02" />
              </View>
              <Text style={styles.metricLabel}>LOW STOCK</Text>
              <Text style={[styles.metricValue, { color: '#ED6C02' }]}>
                {metrics.lowStockCount}
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[
                styles.metricCard,
                statusFilter === 'Out of Stock' && styles.metricCardSelected,
              ]}
              onPress={() => {
                setStatusFilter(statusFilter === 'Out of Stock' ? 'All' : 'Out of Stock');
                setPage(1);
              }}
              activeOpacity={0.8}
            >
              <View style={[styles.metricIconCircle, { backgroundColor: '#FFEBEE' }]}>
                <MaterialIcons name="error-outline" size={18} color="#D32F2F" />
              </View>
              <Text style={styles.metricLabel}>OUT OF STOCK</Text>
              <Text style={[styles.metricValue, { color: '#D32F2F' }]}>
                {metrics.outOfStockCount}
              </Text>
            </TouchableOpacity>
          </View>

          {/* Search Bar */}
          <SearchBar
            value={searchQuery}
            onChangeText={(q) => {
              setSearchQuery(q);
              setPage(1);
            }}
            onClear={() => {
              setSearchQuery('');
              setPage(1);
            }}
            placeholder="Search inventory by product name..."
          />

          {/* Stock Status Filters */}
          <View style={styles.filterRow}>
            {(['All', 'In Stock', 'Low Stock', 'Out of Stock'] as const).map((filter) => (
              <TouchableOpacity
                key={filter}
                style={[
                  styles.filterChip,
                  statusFilter === filter && styles.activeFilterChip,
                ]}
                onPress={() => {
                  setStatusFilter(filter);
                  setPage(1);
                }}
                activeOpacity={0.8}
              >
                <Text
                  style={[
                    styles.filterChipText,
                    statusFilter === filter && styles.activeFilterChipText,
                  ]}
                >
                  {filter}
                </Text>
              </TouchableOpacity>
            ))}
          </View>

          {/* Category Filters */}
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.categoryFilterRow}
          >
            <TouchableOpacity
              style={[
                styles.catFilterChip,
                selectedCategory === 'All' && styles.activeCatFilterChip,
              ]}
              onPress={() => {
                setSelectedCategory('All');
                setPage(1);
              }}
            >
              <Text
                style={[
                  styles.catFilterChipText,
                  selectedCategory === 'All' && styles.activeCatFilterChipText,
                ]}
              >
                All Categories
              </Text>
            </TouchableOpacity>

            {categories.map((cat) => (
              <TouchableOpacity
                key={cat.id}
                style={[
                  styles.catFilterChip,
                  selectedCategory === cat.id && styles.activeCatFilterChip,
                ]}
                onPress={() => {
                  setSelectedCategory(cat.id);
                  setPage(1);
                }}
              >
                <Text
                  style={[
                    styles.catFilterChipText,
                    selectedCategory === cat.id && styles.activeCatFilterChipText,
                  ]}
                >
                  {cat.name}
                </Text>
              </TouchableOpacity>
            ))}
          </ScrollView>
        </View>
      </View>
    );
  }, [
    metrics,
    statusFilter,
    searchQuery,
    selectedCategory,
    categories,
    unreadNotifs,
    navigation,
  ]);

  // Render Footer Pagination
  const renderFooter = useMemo(() => {
    if (items.length === 0) return null;
    return (
      <View style={styles.paginationContainer}>
        <TouchableOpacity
          style={[styles.pageBtn, page <= 1 && styles.disabledPageBtn]}
          onPress={() => setPage((p) => Math.max(1, p - 1))}
          disabled={page <= 1}
          activeOpacity={0.8}
        >
          <MaterialIcons
            name="chevron-left"
            size={20}
            color={page <= 1 ? Colors.tertiary : Colors.onSurface}
          />
          <Text style={[styles.pageBtnText, page <= 1 && styles.disabledPageText]}>
            Previous
          </Text>
        </TouchableOpacity>

        <Text style={styles.pageIndicator}>
          Page {page} of {totalPages} ({totalItems} items)
        </Text>

        <TouchableOpacity
          style={[styles.pageBtn, page >= totalPages && styles.disabledPageBtn]}
          onPress={() => setPage((p) => Math.min(totalPages, p + 1))}
          disabled={page >= totalPages}
          activeOpacity={0.8}
        >
          <Text style={[styles.pageBtnText, page >= totalPages && styles.disabledPageText]}>
            Next
          </Text>
          <MaterialIcons
            name="chevron-right"
            size={20}
            color={page >= totalPages ? Colors.tertiary : Colors.onSurface}
          />
        </TouchableOpacity>
      </View>
    );
  }, [page, totalPages, totalItems, items.length]);

  // Render Empty State
  const renderEmpty = useMemo(() => {
    if (isLoading) return null;
    return (
      <View style={styles.emptyContainer}>
        <MaterialIcons name="inventory" size={48} color={Colors.tertiary} />
        <Text style={styles.emptyTitle}>No Inventory Items Found</Text>
        <Text style={styles.emptySubtitle}>
          {searchQuery.trim() || statusFilter !== 'All' || selectedCategory !== 'All'
            ? 'No product stock records match your search filters.'
            : 'No inventory items are registered in MongoDB.'}
        </Text>
        {(searchQuery.trim() || statusFilter !== 'All' || selectedCategory !== 'All') && (
          <TouchableOpacity
            style={styles.resetFiltersBtn}
            onPress={() => {
              setSearchQuery('');
              setStatusFilter('All');
              setSelectedCategory('All');
              setPage(1);
            }}
          >
            <Text style={styles.resetFiltersBtnText}>Reset Filters</Text>
          </TouchableOpacity>
        )}
      </View>
    );
  }, [isLoading, searchQuery, statusFilter, selectedCategory]);

  return (
    <SafeAreaView style={styles.safeArea} edges={['top', 'left', 'right']}>
      {errorMessage && (
        <View style={styles.errorBanner}>
          <MaterialIcons name="error-outline" size={18} color="#D32F2F" />
          <Text style={styles.errorText}>{errorMessage}</Text>
          <TouchableOpacity onPress={fetchInventory}>
            <Text style={styles.retryText}>Retry</Text>
          </TouchableOpacity>
        </View>
      )}

      {isLoading && items.length === 0 ? (
        <>
          {renderHeader}
          <LoadingSpinner message="Fetching inventory data from MongoDB..." />
        </>
      ) : (
        <FlatList
          data={items}
          keyExtractor={(item) => item.productId}
          renderItem={renderItemRow}
          ListHeaderComponent={renderHeader}
          ListFooterComponent={renderFooter}
          ListEmptyComponent={renderEmpty}
          contentContainerStyle={styles.listContent}
          showsVerticalScrollIndicator={false}
          onRefresh={fetchInventory}
          refreshing={isLoading}
        />
      )}

      {/* Adjust Stock Modal */}
      <Modal visible={isAdjustModalVisible} animationType="fade" transparent>
        <View style={styles.modalOverlay}>
          <View style={styles.modalCard}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Adjust Product Stock</Text>
              <TouchableOpacity onPress={() => setIsAdjustModalVisible(false)}>
                <MaterialIcons name="close" size={24} color={Colors.onSurface} />
              </TouchableOpacity>
            </View>

            <Text style={styles.modalSubtitle}>
              Product: {adjustingProduct?.name} (Current: {adjustingProduct?.stock} units)
            </Text>

            <Text style={styles.formSectionLabel}>Transaction Type</Text>
            <View style={styles.txTypeRow}>
              {[
                { type: 'IN' as const, label: '+ IN (Receive)' },
                { type: 'OUT' as const, label: '- OUT (Deduct)' },
                { type: 'ADJUST' as const, label: '= ADJUST (Set)' },
              ].map((t) => (
                <TouchableOpacity
                  key={t.type}
                  style={[
                    styles.txTypeBtn,
                    adjustTxType === t.type && styles.txTypeBtnActive,
                  ]}
                  onPress={() => setAdjustTxType(t.type)}
                >
                  <Text
                    style={[
                      styles.txTypeBtnText,
                      adjustTxType === t.type && styles.txTypeBtnTextActive,
                    ]}
                  >
                    {t.label}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            <CustomInput
              label={
                adjustTxType === 'ADJUST'
                  ? 'New Exact Stock Level'
                  : adjustTxType === 'IN'
                  ? 'Units to Add (+)'
                  : 'Units to Deduct (-)'
              }
              value={adjustQuantity}
              onChangeText={setAdjustQuantity}
              keyboardType="numeric"
              placeholder="e.g. 20"
            />

            <CustomInput
              label="Audit Remarks / Transaction Reason"
              value={adjustRemarks}
              onChangeText={setAdjustRemarks}
              placeholder="e.g. Batch #902 restocked from Sivakasi factory"
            />

            <View style={styles.modalActions}>
              <PrimaryButton
                title={isSaving ? 'Logging Adjustment...' : 'Confirm Stock Adjustment'}
                onPress={handleSaveAdjustment}
                disabled={isSaving}
              />
            </View>
          </View>
        </View>
      </Modal>

      {/* Transaction History Modal */}
      <Modal visible={isHistoryModalVisible} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <View style={styles.historyModalCard}>
            <View style={styles.modalHeader}>
              <View>
                <Text style={styles.modalTitle}>Stock Audit Trail</Text>
                <Text style={styles.historySubtitle} numberOfLines={1}>
                  {historyProduct?.name} (Current: {historyProduct?.stock})
                </Text>
              </View>
              <TouchableOpacity onPress={() => setIsHistoryModalVisible(false)}>
                <MaterialIcons name="close" size={24} color={Colors.onSurface} />
              </TouchableOpacity>
            </View>

            {isLoadingHistory ? (
              <LoadingSpinner message="Fetching history logs..." />
            ) : historyLogs.length === 0 ? (
              <View style={styles.emptyHistoryContainer}>
                <MaterialIcons name="history" size={36} color={Colors.tertiary} />
                <Text style={styles.emptyHistoryText}>
                  No inventory adjustments recorded for this product yet.
                </Text>
              </View>
            ) : (
              <ScrollView style={styles.historyList} showsVerticalScrollIndicator={false}>
                {historyLogs.map((log, idx) => (
                  <View key={idx} style={styles.historyRow}>
                    <View style={styles.historyLeft}>
                      <View
                        style={[
                          styles.txBadge,
                          log.transactionType === 'IN'
                            ? styles.txBadgeIn
                            : log.transactionType === 'OUT'
                            ? styles.txBadgeOut
                            : styles.txBadgeAdjust,
                        ]}
                      >
                        <Text
                          style={[
                            styles.txBadgeText,
                            log.transactionType === 'IN'
                              ? styles.txTextIn
                              : log.transactionType === 'OUT'
                              ? styles.txTextOut
                              : styles.txTextAdjust,
                          ]}
                        >
                          {log.transactionType} ({log.transactionType === 'IN' ? `+${log.quantity}` : log.transactionType === 'OUT' ? `-${log.quantity}` : log.quantity})
                        </Text>
                      </View>
                      <Text style={styles.historyStockShift}>
                        {log.oldStock} → {log.newStock} units
                      </Text>
                      {log.remarks ? (
                        <Text style={styles.historyRemarks}>{log.remarks}</Text>
                      ) : null}
                    </View>
                    <View style={styles.historyRight}>
                      <Text style={styles.historyDate}>
                        {new Date(log.createdAt).toLocaleDateString()}
                      </Text>
                      <Text style={styles.historyTime}>
                        {new Date(log.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </Text>
                    </View>
                  </View>
                ))}
              </ScrollView>
            )}
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
  headerWrapper: {
    marginBottom: Spacing.xs,
  },
  topSection: {
    paddingHorizontal: Spacing.marginMobile,
    marginTop: Spacing.sm,
  },
  screenTitleRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: Spacing.sm,
  },
  screenTitle: {
    ...Typography.headlineLg,
    fontSize: 24,
    fontFamily: 'Inter-Bold',
    color: Colors.onSurface,
  },
  screenSubtitle: {
    ...Typography.bodyMd,
    fontSize: 12,
    color: Colors.onSurfaceVariant,
    marginTop: 2,
  },
  metricsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.xs,
    marginBottom: Spacing.sm,
  },
  metricCard: {
    flex: 1,
    minWidth: '47%',
    backgroundColor: Colors.surfaceContainerLowest,
    borderRadius: BorderRadius.xl,
    padding: Spacing.sm,
    borderWidth: 1,
    borderColor: Colors.surfaceContainerHigh,
    elevation: 1,
  },
  metricCardSelected: {
    borderColor: Colors.primary,
    backgroundColor: Colors.primaryContainer,
  },
  metricIconCircle: {
    width: 32,
    height: 32,
    borderRadius: BorderRadius.full,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 4,
  },
  metricLabel: {
    ...Typography.labelLg,
    fontSize: 10,
    color: Colors.onSurfaceVariant,
    fontFamily: 'Inter-Bold',
  },
  metricValue: {
    ...Typography.titleLg,
    fontSize: 18,
    fontFamily: 'Inter-Bold',
    color: Colors.onSurface,
    marginTop: 2,
  },
  filterRow: {
    flexDirection: 'row',
    gap: Spacing.xs,
    marginTop: Spacing.xs,
    marginBottom: Spacing.xs,
  },
  filterChip: {
    flex: 1,
    paddingVertical: 6,
    alignItems: 'center',
    borderRadius: BorderRadius.full,
    backgroundColor: Colors.surfaceContainerLow,
    borderWidth: 1,
    borderColor: Colors.surfaceContainerHigh,
  },
  activeFilterChip: {
    backgroundColor: Colors.primaryContainer,
    borderColor: Colors.primary,
  },
  filterChipText: {
    ...Typography.labelLg,
    fontSize: 11,
    color: Colors.onSurfaceVariant,
  },
  activeFilterChipText: {
    color: Colors.onPrimaryContainer,
    fontFamily: 'Inter-Bold',
  },
  categoryFilterRow: {
    gap: Spacing.xs,
    marginTop: Spacing.xs,
    marginBottom: Spacing.sm,
  },
  catFilterChip: {
    paddingHorizontal: Spacing.md,
    paddingVertical: 4,
    borderRadius: BorderRadius.full,
    backgroundColor: Colors.surfaceContainerLow,
    borderWidth: 1,
    borderColor: Colors.surfaceContainerHigh,
  },
  activeCatFilterChip: {
    backgroundColor: Colors.primary,
    borderColor: Colors.primary,
  },
  catFilterChipText: {
    ...Typography.labelLg,
    fontSize: 11,
    color: Colors.onSurfaceVariant,
  },
  activeCatFilterChipText: {
    color: Colors.onPrimary,
    fontFamily: 'Inter-Bold',
  },
  itemCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.surfaceContainerLowest,
    marginHorizontal: Spacing.marginMobile,
    marginBottom: Spacing.xs,
    padding: Spacing.sm,
    borderRadius: BorderRadius.xl,
    borderWidth: 1,
    borderColor: Colors.surfaceContainerHigh,
    gap: Spacing.sm,
    elevation: 1,
  },
  itemThumb: {
    width: 64,
    height: 64,
    borderRadius: BorderRadius.lg,
    backgroundColor: Colors.surfaceContainerLow,
  },
  itemInfo: {
    flex: 1,
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  itemName: {
    ...Typography.titleLg,
    fontSize: 14,
    fontFamily: 'Inter-Bold',
    color: Colors.onSurface,
    flex: 1,
  },
  itemCategory: {
    ...Typography.bodyMd,
    fontSize: 11,
    color: Colors.tertiary,
    marginTop: 1,
  },
  itemPrice: {
    ...Typography.titleLg,
    fontSize: 13,
    fontFamily: 'Inter-Bold',
    color: Colors.primary,
    marginTop: 2,
  },
  statusBadgeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: 3,
  },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: BorderRadius.sm,
    gap: 3,
  },
  statusBadgeIn: {
    backgroundColor: '#E8F5E9',
  },
  statusBadgeLow: {
    backgroundColor: '#FFF3E0',
  },
  statusBadgeOut: {
    backgroundColor: '#FFEBEE',
  },
  statusBadgeText: {
    ...Typography.labelLg,
    fontSize: 9,
    fontFamily: 'Inter-Bold',
  },
  statusTextIn: {
    color: '#2E7D32',
  },
  statusTextLow: {
    color: '#ED6C02',
  },
  statusTextOut: {
    color: '#D32F2F',
  },
  minStockText: {
    ...Typography.bodyMd,
    fontSize: 10,
    color: Colors.tertiary,
  },
  actionsColumn: {
    gap: 4,
    alignItems: 'center',
  },
  adjustBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingVertical: 6,
    backgroundColor: Colors.surfaceContainerLow,
    borderRadius: BorderRadius.lg,
    gap: 3,
  },
  adjustBtnText: {
    ...Typography.labelLg,
    fontSize: 11,
    color: Colors.primary,
    fontFamily: 'Inter-Bold',
  },
  historyBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingVertical: 6,
    backgroundColor: Colors.surfaceContainerLow,
    borderRadius: BorderRadius.lg,
    gap: 3,
  },
  historyBtnText: {
    ...Typography.labelLg,
    fontSize: 11,
    color: Colors.onSurfaceVariant,
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
    fontSize: 12,
    color: Colors.onSurfaceVariant,
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
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: Spacing.marginMobile,
  },
  modalCard: {
    width: '100%',
    backgroundColor: Colors.surfaceContainerLowest,
    borderRadius: BorderRadius.xl,
    padding: Spacing.lg,
    elevation: 10,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: Spacing.xs,
  },
  modalTitle: {
    ...Typography.headlineLg,
    fontSize: 18,
    fontFamily: 'Inter-Bold',
    color: Colors.onSurface,
  },
  modalSubtitle: {
    ...Typography.bodyMd,
    fontSize: 12,
    color: Colors.tertiary,
    marginBottom: Spacing.sm,
  },
  formSectionLabel: {
    ...Typography.labelLg,
    fontSize: 11,
    fontFamily: 'Inter-Bold',
    color: Colors.tertiary,
    marginTop: Spacing.xs,
    marginBottom: 4,
  },
  txTypeRow: {
    flexDirection: 'row',
    gap: 4,
    marginBottom: Spacing.sm,
  },
  txTypeBtn: {
    flex: 1,
    paddingVertical: 6,
    alignItems: 'center',
    borderRadius: BorderRadius.md,
    backgroundColor: Colors.surfaceContainerLow,
    borderWidth: 1,
    borderColor: Colors.surfaceContainerHigh,
  },
  txTypeBtnActive: {
    backgroundColor: Colors.primaryContainer,
    borderColor: Colors.primary,
  },
  txTypeBtnText: {
    ...Typography.labelLg,
    fontSize: 10,
    color: Colors.onSurfaceVariant,
  },
  txTypeBtnTextActive: {
    color: Colors.onPrimaryContainer,
    fontFamily: 'Inter-Bold',
  },
  modalActions: {
    marginTop: Spacing.md,
  },
  historyModalCard: {
    width: '100%',
    maxHeight: '80%',
    backgroundColor: Colors.surfaceContainerLowest,
    borderRadius: BorderRadius.xl,
    padding: Spacing.lg,
    elevation: 10,
  },
  historySubtitle: {
    ...Typography.bodyMd,
    fontSize: 12,
    color: Colors.tertiary,
    marginTop: 2,
  },
  historyList: {
    marginTop: Spacing.sm,
  },
  historyRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    paddingVertical: Spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: Colors.surfaceContainerLow,
  },
  historyLeft: {
    flex: 1,
  },
  txBadge: {
    alignSelf: 'flex-start',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: BorderRadius.sm,
    marginBottom: 2,
  },
  txBadgeIn: {
    backgroundColor: '#E8F5E9',
  },
  txBadgeOut: {
    backgroundColor: '#FFEBEE',
  },
  txBadgeAdjust: {
    backgroundColor: '#E3F2FD',
  },
  txBadgeText: {
    ...Typography.labelLg,
    fontSize: 10,
    fontFamily: 'Inter-Bold',
  },
  txTextIn: {
    color: '#2E7D32',
  },
  txTextOut: {
    color: '#D32F2F',
  },
  txTextAdjust: {
    color: '#1976D2',
  },
  historyStockShift: {
    ...Typography.titleLg,
    fontSize: 12,
    fontFamily: 'Inter-Bold',
    color: Colors.onSurface,
  },
  historyRemarks: {
    ...Typography.bodyMd,
    fontSize: 11,
    color: Colors.tertiary,
    marginTop: 1,
  },
  historyRight: {
    alignItems: 'flex-end',
  },
  historyDate: {
    ...Typography.labelLg,
    fontSize: 10,
    color: Colors.onSurface,
  },
  historyTime: {
    ...Typography.bodyMd,
    fontSize: 10,
    color: Colors.tertiary,
    marginTop: 1,
  },
  emptyHistoryContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: Spacing.xl,
    gap: Spacing.xs,
  },
  emptyHistoryText: {
    ...Typography.bodyMd,
    fontSize: 12,
    color: Colors.tertiary,
    textAlign: 'center',
  },
});

export default InventoryManagementScreen;
