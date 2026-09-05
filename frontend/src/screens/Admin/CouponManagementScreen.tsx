import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  Modal,
  Alert,
  ScrollView,
  Switch,
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
  AdminCouponItem,
  AdminCouponCreateInput,
  AdminCouponUpdateInput,
  CouponSummaryMetrics,
} from '@/services/adminService';
import { useNotificationStore } from '@/store';
import { RootStackParamList } from '@/navigation/types';
import { formatCurrency } from '@/utils/currency';

import { useSmartTabNavigation } from '@/hooks/useSmartTabNavigation';
import { useProductStore } from '@/store/productStore';

type CouponManagementScreenProps = NativeStackScreenProps<
  RootStackParamList,
  'CouponManagement'
>;

export const CouponManagementScreen: React.FC<CouponManagementScreenProps> = ({
  navigation,
}) => {
  const { handleTabPress } = useSmartTabNavigation();
  const [coupons, setCoupons] = useState<AdminCouponItem[]>([]);
  const [metrics, setMetrics] = useState<CouponSummaryMetrics>({
    totalCoupons: 0,
    activeCoupons: 0,
    expiringSoonCount: 0,
    totalRedemptions: 0,
  });
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Search & Filter & Pagination
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<
    'All' | 'Active' | 'Inactive' | 'Expired' | 'Upcoming' | 'Usage Limit Reached'
  >('All');
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalItems, setTotalItems] = useState(0);

  // Create Modal State
  const [isCreateModalVisible, setIsCreateModalVisible] = useState(false);
  const [newCode, setNewCode] = useState('');
  const [newDescription, setNewDescription] = useState('');
  const [newDiscountType, setNewDiscountType] = useState<'percentage' | 'fixed'>('percentage');
  const [newDiscountValue, setNewDiscountValue] = useState('15');
  const [newMinOrder, setNewMinOrder] = useState('500');
  const [newMaxDiscount, setNewMaxDiscount] = useState('200');
  const [newUsageLimit, setNewUsageLimit] = useState('100');
  const [newDaysValid, setNewDaysValid] = useState('30');
  const [newIsActive, setNewIsActive] = useState(true);

  // Edit Modal State
  const [isEditModalVisible, setIsEditModalVisible] = useState(false);
  const [editingCoupon, setEditingCoupon] = useState<AdminCouponItem | null>(null);
  const [editCode, setEditCode] = useState('');
  const [editDescription, setEditDescription] = useState('');
  const [editDiscountType, setEditDiscountType] = useState<'percentage' | 'fixed'>('percentage');
  const [editDiscountValue, setEditDiscountValue] = useState('');
  const [editMinOrder, setEditMinOrder] = useState('');
  const [editMaxDiscount, setEditMaxDiscount] = useState('');
  const [editUsageLimit, setEditUsageLimit] = useState('');
  const [editIsActive, setEditIsActive] = useState(true);

  const unreadNotifs = useNotificationStore((state) => state.getUnreadCount());

  // 1. Fetch coupons from live MongoDB backend
  const fetchCoupons = useCallback(async () => {
    setIsLoading(true);
    setErrorMessage(null);
    try {
      const res = await adminService.getAdminCoupons({
        page,
        limit: 10,
        search: searchQuery,
        statusFilter,
      });
      setCoupons(res.items);
      setMetrics(res.metrics);
      setTotalPages(res.pagination.pages);
      setTotalItems(res.pagination.total);
    } catch (err: any) {
      const msg =
        err.response?.data?.message || err.message || 'Failed to fetch coupon campaigns from backend.';
      setErrorMessage(msg);
    } finally {
      setIsLoading(false);
    }
  }, [page, searchQuery, statusFilter]);

  useEffect(() => {
    fetchCoupons();
  }, [fetchCoupons]);

  // Open Create Modal with default preset
  const handleOpenCreateModal = useCallback(() => {
    setNewCode('DIWALI2026');
    setNewDescription('Festive discount coupon for festival sparklers');
    setNewDiscountType('percentage');
    setNewDiscountValue('15');
    setNewMinOrder('500');
    setNewMaxDiscount('200');
    setNewUsageLimit('100');
    setNewDaysValid('30');
    setNewIsActive(true);
    setIsCreateModalVisible(true);
  }, []);

  // Save New Coupon
  const handleSaveNewCoupon = useCallback(async () => {
    const code = newCode.trim().toUpperCase();
    if (!code || code.length < 2) {
      Alert.alert('Validation Error', 'Coupon code must be at least 2 characters long.');
      return;
    }

    const val = parseFloat(newDiscountValue);
    if (isNaN(val) || val <= 0) {
      Alert.alert('Validation Error', 'Discount value must be greater than 0.');
      return;
    }

    if (newDiscountType === 'percentage' && val > 100) {
      Alert.alert('Validation Error', 'Percentage discount cannot exceed 100%.');
      return;
    }

    const minOrder = parseFloat(newMinOrder) || 0;
    const maxDiscount = newMaxDiscount.trim() ? parseFloat(newMaxDiscount) : undefined;
    const usageLimit = parseInt(newUsageLimit, 10) || 1;
    const daysValid = parseInt(newDaysValid, 10) || 30;

    const expiry = new Date();
    expiry.setDate(expiry.getDate() + daysValid);

    const payload: AdminCouponCreateInput = {
      coupon_code: code,
      description: newDescription.trim() || undefined,
      discount_type: newDiscountType,
      percentage: newDiscountType === 'percentage' ? val : undefined,
      fixed_amount: newDiscountType === 'fixed' ? val : undefined,
      minimum_order: minOrder,
      maximum_discount: maxDiscount,
      start_date: new Date().toISOString(),
      expiry_date: expiry.toISOString(),
      usage_limit: usageLimit,
      is_active: newIsActive,
    };

    setIsSaving(true);
    try {
      await adminService.createCoupon(payload);
      Alert.alert('Success', `Coupon "${code}" created successfully!`);
      setIsCreateModalVisible(false);
      fetchCoupons();
    } catch (err: any) {
      const msg = err.response?.data?.message || err.message || 'Failed to create coupon.';
      Alert.alert('Creation Error', msg);
    } finally {
      setIsSaving(false);
    }
  }, [
    newCode,
    newDescription,
    newDiscountType,
    newDiscountValue,
    newMinOrder,
    newMaxDiscount,
    newUsageLimit,
    newDaysValid,
    newIsActive,
    fetchCoupons,
  ]);

  // Open Edit Modal
  const handleOpenEditModal = useCallback((c: AdminCouponItem) => {
    setEditingCoupon(c);
    setEditCode(c.couponCode);
    setEditDescription(c.description || '');
    setEditDiscountType(c.discountType);
    setEditDiscountValue(
      c.discountType === 'percentage'
        ? String(c.percentage || 15)
        : String(c.fixedAmount || 100)
    );
    setEditMinOrder(String(c.minimumOrder || 0));
    setEditMaxDiscount(c.maximumDiscount !== undefined ? String(c.maximumDiscount) : '');
    setEditUsageLimit(String(c.usageLimit || 1));
    setEditIsActive(c.isActive);
    setIsEditModalVisible(true);
  }, []);

  // Save Coupon Updates
  const handleSaveEditCoupon = useCallback(async () => {
    if (!editingCoupon) return;
    const val = parseFloat(editDiscountValue);
    if (isNaN(val) || val <= 0) {
      Alert.alert('Validation Error', 'Discount value must be greater than 0.');
      return;
    }

    if (editDiscountType === 'percentage' && val > 100) {
      Alert.alert('Validation Error', 'Percentage discount cannot exceed 100%.');
      return;
    }

    const minOrder = parseFloat(editMinOrder) || 0;
    const maxDiscount = editMaxDiscount.trim() ? parseFloat(editMaxDiscount) : undefined;
    const usageLimit = parseInt(editUsageLimit, 10) || 1;

    const updates: AdminCouponUpdateInput = {
      coupon_code: editingCoupon.usedCount === 0 ? editCode.trim().toUpperCase() : undefined,
      description: editDescription.trim() || undefined,
      discount_type: editDiscountType,
      percentage: editDiscountType === 'percentage' ? val : undefined,
      fixed_amount: editDiscountType === 'fixed' ? val : undefined,
      minimum_order: minOrder,
      maximum_discount: maxDiscount,
      usage_limit: usageLimit,
      is_active: editIsActive,
    };

    setIsSaving(true);
    try {
      await adminService.updateCoupon(editingCoupon.id, updates);
      Alert.alert('Success', `Coupon "${editingCoupon.couponCode}" updated!`);
      setIsEditModalVisible(false);
      setEditingCoupon(null);
      fetchCoupons();
    } catch (err: any) {
      const msg = err.response?.data?.message || err.message || 'Failed to update coupon.';
      Alert.alert('Update Error', msg);
    } finally {
      setIsSaving(false);
    }
  }, [
    editingCoupon,
    editCode,
    editDescription,
    editDiscountType,
    editDiscountValue,
    editMinOrder,
    editMaxDiscount,
    editUsageLimit,
    editIsActive,
    fetchCoupons,
  ]);

  // Toggle Active Status
  const handleToggleStatus = useCallback(
    async (item: AdminCouponItem) => {
      try {
        await adminService.updateCouponStatus(item.id, !item.isActive);
        setCoupons((prev) =>
          prev.map((c) => (c.id === item.id ? { ...c, isActive: !c.isActive } : c))
        );
      } catch (err: any) {
        const msg = err.response?.data?.message || err.message || 'Status update failed.';
        Alert.alert('Status Error', msg);
      }
    },
    []
  );

  // Soft Delete Coupon
  const handleDeleteCoupon = useCallback(
    (item: AdminCouponItem) => {
      Alert.alert(
        'Confirm Deletion',
        item.usedCount > 0
          ? `Coupon "${item.couponCode}" has already been redeemed in ${item.usedCount} customer orders. It will be safely deactivated and archived.`
          : `Are you sure you want to delete coupon "${item.couponCode}"?`,
        [
          { text: 'Cancel', style: 'cancel' },
          {
            text: 'Delete',
            style: 'destructive',
            onPress: async () => {
              try {
                await adminService.deleteCoupon(item.id);
                Alert.alert('Deleted', `Coupon "${item.couponCode}" archived.`);
                fetchCoupons();
              } catch (err: any) {
                const msg = err.response?.data?.message || err.message || 'Deletion failed.';
                Alert.alert('Delete Error', msg);
              }
            },
          },
        ]
      );
    },
    [fetchCoupons]
  );

  // Render Coupon Card
  const renderItemRow: ListRenderItem<AdminCouponItem> = useCallback(
    ({ item }) => {
      const isPercent = item.discountType === 'percentage';
      const status = item.couponStatus;
      const isExp = status === 'EXPIRED';
      const isUp = status === 'UPCOMING';
      const isLimit = status === 'USAGE_LIMIT_REACHED';
      const isAct = status === 'ACTIVE';

      return (
        <View style={styles.couponCard}>
          {/* Top Bar with Code Badge and Status Switch */}
          <View style={styles.cardHeader}>
            <View style={styles.codeContainer}>
              <MaterialIcons name="local-offer" size={16} color={Colors.primary} />
              <Text style={styles.codeText}>{item.couponCode}</Text>
            </View>

            <View style={styles.switchRow}>
              <View
                style={[
                  styles.statusBadge,
                  isAct
                    ? styles.statusBadgeActive
                    : isExp
                    ? styles.statusBadgeExpired
                    : isUp
                    ? styles.statusBadgeUpcoming
                    : isLimit
                    ? styles.statusBadgeLimit
                    : styles.statusBadgeInactive,
                ]}
              >
                <Text
                  style={[
                    styles.statusBadgeText,
                    isAct
                      ? styles.statusTextActive
                      : isExp
                      ? styles.statusTextExpired
                      : isUp
                      ? styles.statusTextUpcoming
                      : isLimit
                      ? styles.statusTextLimit
                      : styles.statusTextInactive,
                  ]}
                >
                  {status}
                </Text>
              </View>

              <Switch
                value={item.isActive}
                onValueChange={() => handleToggleStatus(item)}
                trackColor={{ false: '#CFD8DC', true: Colors.primaryContainer }}
                thumbColor={item.isActive ? Colors.primary : '#90A4AE'}
              />
            </View>
          </View>

          {/* Description & Value */}
          <Text style={styles.descriptionText} numberOfLines={2}>
            {item.description || 'General discount campaign'}
          </Text>

          <View style={styles.detailsGrid}>
            <View style={styles.detailBox}>
              <Text style={styles.detailLabel}>DISCOUNT</Text>
              <Text style={styles.detailValue}>
                {isPercent ? `${item.percentage}% OFF` : formatCurrency(item.fixedAmount || 0)}
              </Text>
            </View>

            <View style={styles.detailBox}>
              <Text style={styles.detailLabel}>MIN ORDER</Text>
              <Text style={styles.detailValue}>
                {item.minimumOrder > 0 ? formatCurrency(item.minimumOrder) : 'No Min'}
              </Text>
            </View>

            <View style={styles.detailBox}>
              <Text style={styles.detailLabel}>USAGE</Text>
              <Text style={styles.detailValue}>
                {item.usedCount} / {item.usageLimit}
              </Text>
            </View>

            <View style={styles.detailBox}>
              <Text style={styles.detailLabel}>EXPIRY</Text>
              <Text style={styles.detailValue}>
                {new Date(item.expiryDate).toLocaleDateString([], { month: 'short', day: 'numeric' })}
              </Text>
            </View>
          </View>

          {/* Action Row */}
          <View style={styles.actionRow}>
            <TouchableOpacity
              style={styles.editBtn}
              onPress={() => handleOpenEditModal(item)}
              activeOpacity={0.8}
            >
              <MaterialIcons name="edit" size={14} color={Colors.primary} />
              <Text style={styles.editBtnText}>Edit Campaign</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.deleteBtn}
              onPress={() => handleDeleteCoupon(item)}
              activeOpacity={0.8}
            >
              <MaterialIcons name="delete-outline" size={16} color="#D32F2F" />
              <Text style={styles.deleteBtnText}>Archive</Text>
            </TouchableOpacity>
          </View>
        </View>
      );
    },
    [handleToggleStatus, handleOpenEditModal, handleDeleteCoupon]
  );

  // Render Header
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

        <View style={styles.topSection}>
          <View style={styles.screenTitleRow}>
            <View style={styles.screenTitleTextContainer}>
              <Text style={styles.screenTitle}>Coupon Campaigns</Text>
              <Text style={styles.screenSubtitle}>
                Manage promotional codes and checkout discounts
              </Text>
            </View>

            <TouchableOpacity
              style={styles.addCouponBtn}
              onPress={handleOpenCreateModal}
              activeOpacity={0.8}
            >
              <MaterialIcons name="add" size={18} color={Colors.onPrimary} />
              <Text style={styles.addCouponBtnText}>New</Text>
            </TouchableOpacity>
          </View>

          {/* Summary Metric Cards */}
          <View style={styles.metricsGrid}>
            <View style={styles.metricCard}>
              <View style={[styles.metricIconCircle, { backgroundColor: '#E3F2FD' }]}>
                <MaterialIcons name="discount" size={18} color="#1976D2" />
              </View>
              <Text style={styles.metricLabel}>TOTAL COUPONS</Text>
              <Text style={styles.metricValue}>{metrics.totalCoupons}</Text>
            </View>

            <TouchableOpacity
              style={[
                styles.metricCard,
                statusFilter === 'Active' && styles.metricCardSelected,
              ]}
              onPress={() => {
                setStatusFilter(statusFilter === 'Active' ? 'All' : 'Active');
                setPage(1);
              }}
              activeOpacity={0.8}
            >
              <View style={[styles.metricIconCircle, { backgroundColor: '#E8F5E9' }]}>
                <MaterialIcons name="verified" size={18} color="#2E7D32" />
              </View>
              <Text style={styles.metricLabel}>ACTIVE CODES</Text>
              <Text style={[styles.metricValue, { color: '#2E7D32' }]}>
                {metrics.activeCoupons}
              </Text>
            </TouchableOpacity>

            <View style={styles.metricCard}>
              <View style={[styles.metricIconCircle, { backgroundColor: '#FFF3E0' }]}>
                <MaterialIcons name="hourglass-bottom" size={18} color="#ED6C02" />
              </View>
              <Text style={styles.metricLabel}>EXPIRING SOON</Text>
              <Text style={[styles.metricValue, { color: '#ED6C02' }]}>
                {metrics.expiringSoonCount}
              </Text>
            </View>

            <View style={styles.metricCard}>
              <View style={[styles.metricIconCircle, { backgroundColor: '#F3E5F5' }]}>
                <MaterialIcons name="shopping-bag" size={18} color="#7B1FA2" />
              </View>
              <Text style={styles.metricLabel}>REDEMPTIONS</Text>
              <Text style={[styles.metricValue, { color: '#7B1FA2' }]}>
                {metrics.totalRedemptions}
              </Text>
            </View>
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
            placeholder="Search coupon code or description..."
          />

          {/* Filter Chips */}
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.filterChipRow}
          >
            {(
              [
                'All',
                'Active',
                'Inactive',
                'Expired',
                'Upcoming',
                'Usage Limit Reached',
              ] as const
            ).map((filter) => (
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
          </ScrollView>
        </View>
      </View>
    );
  }, [
    metrics,
    statusFilter,
    searchQuery,
    unreadNotifs,
    navigation,
    handleOpenCreateModal,
  ]);

  // Render Footer Pagination
  const renderFooter = useMemo(() => {
    if (coupons.length === 0) return null;
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
          Page {page} of {totalPages} ({totalItems} campaigns)
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
  }, [page, totalPages, totalItems, coupons.length]);

  // Render Empty State
  const renderEmpty = useMemo(() => {
    if (isLoading) return null;
    return (
      <View style={styles.emptyContainer}>
        <MaterialIcons name="local-offer" size={48} color={Colors.tertiary} />
        <Text style={styles.emptyTitle}>No Coupons Found</Text>
        <Text style={styles.emptySubtitle}>
          {searchQuery.trim() || statusFilter !== 'All'
            ? 'No coupon campaign matches your search filters.'
            : 'No coupon codes are registered in MongoDB.'}
        </Text>
        {(searchQuery.trim() || statusFilter !== 'All') && (
          <TouchableOpacity
            style={styles.resetFiltersBtn}
            onPress={() => {
              setSearchQuery('');
              setStatusFilter('All');
              setPage(1);
            }}
          >
            <Text style={styles.resetFiltersBtnText}>Reset Filters</Text>
          </TouchableOpacity>
        )}
      </View>
    );
  }, [isLoading, searchQuery, statusFilter]);

  return (
    <SafeAreaView style={styles.safeArea} edges={['top', 'left', 'right']}>
      {errorMessage && (
        <View style={styles.errorBanner}>
          <MaterialIcons name="error-outline" size={18} color="#D32F2F" />
          <Text style={styles.errorText}>{errorMessage}</Text>
          <TouchableOpacity onPress={fetchCoupons}>
            <Text style={styles.retryText}>Retry</Text>
          </TouchableOpacity>
        </View>
      )}

      {isLoading && coupons.length === 0 ? (
        <>
          {renderHeader}
          <LoadingSpinner message="Fetching coupons from MongoDB..." />
        </>
      ) : (
        <FlatList
          data={coupons}
          keyExtractor={(item) => item.id}
          renderItem={renderItemRow}
          ListHeaderComponent={renderHeader}
          ListFooterComponent={renderFooter}
          ListEmptyComponent={renderEmpty}
          contentContainerStyle={styles.listContent}
          showsVerticalScrollIndicator={false}
          onRefresh={fetchCoupons}
          refreshing={isLoading}
        />
      )}

      {/* Create Coupon Modal */}
      <Modal visible={isCreateModalVisible} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <View style={styles.modalCard}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Create Discount Coupon</Text>
              <TouchableOpacity onPress={() => setIsCreateModalVisible(false)}>
                <MaterialIcons name="close" size={24} color={Colors.onSurface} />
              </TouchableOpacity>
            </View>

            <ScrollView showsVerticalScrollIndicator={false} style={styles.formScroll}>
              <CustomInput
                label="Coupon Code (e.g. FESTIVE20)"
                value={newCode}
                onChangeText={(v) => setNewCode(v.toUpperCase())}
                placeholder="FESTIVE20"
                autoCapitalize="characters"
              />

              <CustomInput
                label="Campaign Description"
                value={newDescription}
                onChangeText={setNewDescription}
                placeholder="Seasonal sparklers festival discount"
              />

              <Text style={styles.formSectionLabel}>Discount Type</Text>
              <View style={styles.toggleRow}>
                <TouchableOpacity
                  style={[
                    styles.toggleBtn,
                    newDiscountType === 'percentage' && styles.toggleBtnActive,
                  ]}
                  onPress={() => setNewDiscountType('percentage')}
                >
                  <Text
                    style={[
                      styles.toggleBtnText,
                      newDiscountType === 'percentage' && styles.toggleBtnTextActive,
                    ]}
                  >
                    Percentage (%)
                  </Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={[
                    styles.toggleBtn,
                    newDiscountType === 'fixed' && styles.toggleBtnActive,
                  ]}
                  onPress={() => setNewDiscountType('fixed')}
                >
                  <Text
                    style={[
                      styles.toggleBtnText,
                      newDiscountType === 'fixed' && styles.toggleBtnTextActive,
                    ]}
                  >
                    Fixed Amount (₹)
                  </Text>
                </TouchableOpacity>
              </View>

              <CustomInput
                label={newDiscountType === 'percentage' ? 'Percentage (1–100%)' : 'Fixed Discount (₹)'}
                value={newDiscountValue}
                onChangeText={setNewDiscountValue}
                keyboardType="numeric"
                placeholder={newDiscountType === 'percentage' ? '15' : '100'}
              />

              <CustomInput
                label="Minimum Order Total (₹)"
                value={newMinOrder}
                onChangeText={setNewMinOrder}
                keyboardType="numeric"
                placeholder="500"
              />

              {newDiscountType === 'percentage' && (
                <CustomInput
                  label="Maximum Discount Cap (₹ Optional)"
                  value={newMaxDiscount}
                  onChangeText={setNewMaxDiscount}
                  keyboardType="numeric"
                  placeholder="200"
                />
              )}

              <CustomInput
                label="Total Usage Limit (Redemptions)"
                value={newUsageLimit}
                onChangeText={setNewUsageLimit}
                keyboardType="numeric"
                placeholder="100"
              />

              <CustomInput
                label="Valid For Days (from today)"
                value={newDaysValid}
                onChangeText={setNewDaysValid}
                keyboardType="numeric"
                placeholder="30"
              />

              <View style={styles.activeSwitchRow}>
                <Text style={styles.switchLabel}>Activate Immediately</Text>
                <Switch
                  value={newIsActive}
                  onValueChange={setNewIsActive}
                  trackColor={{ false: '#CFD8DC', true: Colors.primaryContainer }}
                  thumbColor={newIsActive ? Colors.primary : '#90A4AE'}
                />
              </View>

              <View style={styles.modalActions}>
                <PrimaryButton
                  title={isSaving ? 'Creating Coupon...' : 'Save Coupon Campaign'}
                  onPress={handleSaveNewCoupon}
                  disabled={isSaving}
                />
              </View>
            </ScrollView>
          </View>
        </View>
      </Modal>

      {/* Edit Coupon Modal */}
      <Modal visible={isEditModalVisible} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <View style={styles.modalCard}>
            <View style={styles.modalHeader}>
              <View>
                <Text style={styles.modalTitle}>Edit Coupon</Text>
                <Text style={styles.modalSubtitle}>{editingCoupon?.couponCode}</Text>
              </View>
              <TouchableOpacity onPress={() => setIsEditModalVisible(false)}>
                <MaterialIcons name="close" size={24} color={Colors.onSurface} />
              </TouchableOpacity>
            </View>

            <ScrollView showsVerticalScrollIndicator={false} style={styles.formScroll}>
              <CustomInput
                label="Coupon Code"
                value={editCode}
                onChangeText={(v) => setEditCode(v.toUpperCase())}
                autoCapitalize="characters"
                editable={editingCoupon?.usedCount ? editingCoupon.usedCount === 0 : true}
              />
              {editingCoupon && editingCoupon.usedCount > 0 && (
                <Text style={styles.lockedCodeNote}>
                  * Code is locked because {editingCoupon.usedCount} customers have already redeemed it.
                </Text>
              )}

              <CustomInput
                label="Description"
                value={editDescription}
                onChangeText={setEditDescription}
              />

              <Text style={styles.formSectionLabel}>Discount Type</Text>
              <View style={styles.toggleRow}>
                <TouchableOpacity
                  style={[
                    styles.toggleBtn,
                    editDiscountType === 'percentage' && styles.toggleBtnActive,
                  ]}
                  onPress={() => setEditDiscountType('percentage')}
                >
                  <Text
                    style={[
                      styles.toggleBtnText,
                      editDiscountType === 'percentage' && styles.toggleBtnTextActive,
                    ]}
                  >
                    Percentage (%)
                  </Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={[
                    styles.toggleBtn,
                    editDiscountType === 'fixed' && styles.toggleBtnActive,
                  ]}
                  onPress={() => setEditDiscountType('fixed')}
                >
                  <Text
                    style={[
                      styles.toggleBtnText,
                      editDiscountType === 'fixed' && styles.toggleBtnTextActive,
                    ]}
                  >
                    Fixed Amount (₹)
                  </Text>
                </TouchableOpacity>
              </View>

              <CustomInput
                label={editDiscountType === 'percentage' ? 'Percentage (1–100%)' : 'Fixed Discount (₹)'}
                value={editDiscountValue}
                onChangeText={setEditDiscountValue}
                keyboardType="numeric"
              />

              <CustomInput
                label="Minimum Order Total (₹)"
                value={editMinOrder}
                onChangeText={setEditMinOrder}
                keyboardType="numeric"
              />

              {editDiscountType === 'percentage' && (
                <CustomInput
                  label="Maximum Discount Cap (₹ Optional)"
                  value={editMaxDiscount}
                  onChangeText={setEditMaxDiscount}
                  keyboardType="numeric"
                />
              )}

              <CustomInput
                label="Usage Limit"
                value={editUsageLimit}
                onChangeText={setEditUsageLimit}
                keyboardType="numeric"
              />

              <View style={styles.activeSwitchRow}>
                <Text style={styles.switchLabel}>Active Campaign</Text>
                <Switch
                  value={editIsActive}
                  onValueChange={setEditIsActive}
                  trackColor={{ false: '#CFD8DC', true: Colors.primaryContainer }}
                  thumbColor={editIsActive ? Colors.primary : '#90A4AE'}
                />
              </View>

              <View style={styles.modalActions}>
                <PrimaryButton
                  title={isSaving ? 'Updating...' : 'Save Changes'}
                  onPress={handleSaveEditCoupon}
                  disabled={isSaving}
                />
              </View>
            </ScrollView>
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
  screenTitleTextContainer: {
    flex: 1,
    paddingRight: Spacing.xs,
  },
  screenTitle: {
    ...Typography.headlineLg,
    fontSize: 22,
    fontFamily: 'Inter-Bold',
    color: Colors.onSurface,
  },
  screenSubtitle: {
    ...Typography.bodyMd,
    fontSize: 11,
    color: Colors.onSurfaceVariant,
    marginTop: 2,
  },
  addCouponBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.primary,
    paddingHorizontal: Spacing.sm,
    paddingVertical: 8,
    borderRadius: BorderRadius.lg,
    gap: 4,
    flexShrink: 0,
  },
  addCouponBtnText: {
    ...Typography.labelLg,
    fontSize: 12,
    fontFamily: 'Inter-Bold',
    color: Colors.onPrimary,
  },
  metricsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.xs,
    marginBottom: Spacing.sm,
  },
  metricCard: {
    flex: 1,
    minWidth: 130,
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
  filterChipRow: {
    gap: Spacing.xs,
    marginTop: Spacing.xs,
    marginBottom: Spacing.sm,
  },
  filterChip: {
    paddingHorizontal: Spacing.md,
    paddingVertical: 6,
    borderRadius: BorderRadius.full,
    backgroundColor: Colors.surfaceContainerLow,
    borderWidth: 1,
    borderColor: Colors.surfaceContainerHigh,
  },
  activeFilterChip: {
    backgroundColor: Colors.primary,
    borderColor: Colors.primary,
  },
  filterChipText: {
    ...Typography.labelLg,
    fontSize: 11,
    color: Colors.onSurfaceVariant,
  },
  activeFilterChipText: {
    color: Colors.onPrimary,
    fontFamily: 'Inter-Bold',
  },
  couponCard: {
    backgroundColor: Colors.surfaceContainerLowest,
    marginHorizontal: Spacing.marginMobile,
    marginBottom: Spacing.xs,
    padding: Spacing.md,
    borderRadius: BorderRadius.xl,
    borderWidth: 1,
    borderColor: Colors.surfaceContainerHigh,
    elevation: 1,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: Spacing.xs,
  },
  codeContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.primaryContainer,
    paddingHorizontal: Spacing.sm,
    paddingVertical: 4,
    borderRadius: BorderRadius.md,
    gap: 4,
  },
  codeText: {
    ...Typography.titleLg,
    fontSize: 14,
    fontFamily: 'Inter-Bold',
    color: Colors.onPrimaryContainer,
  },
  switchRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.xs,
  },
  statusBadge: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: BorderRadius.sm,
  },
  statusBadgeActive: {
    backgroundColor: '#E8F5E9',
  },
  statusBadgeExpired: {
    backgroundColor: '#FFEBEE',
  },
  statusBadgeUpcoming: {
    backgroundColor: '#F3E5F5',
  },
  statusBadgeLimit: {
    backgroundColor: '#FFF3E0',
  },
  statusBadgeInactive: {
    backgroundColor: '#ECEFF1',
  },
  statusBadgeText: {
    ...Typography.labelLg,
    fontSize: 9,
    fontFamily: 'Inter-Bold',
  },
  statusTextActive: {
    color: '#2E7D32',
  },
  statusTextExpired: {
    color: '#D32F2F',
  },
  statusTextUpcoming: {
    color: '#7B1FA2',
  },
  statusTextLimit: {
    color: '#ED6C02',
  },
  statusTextInactive: {
    color: '#546E7A',
  },
  descriptionText: {
    ...Typography.bodyMd,
    fontSize: 12,
    color: Colors.onSurface,
    marginBottom: Spacing.xs,
  },
  detailsGrid: {
    flexDirection: 'row',
    backgroundColor: Colors.surfaceContainerLow,
    borderRadius: BorderRadius.lg,
    paddingVertical: Spacing.xs,
    paddingHorizontal: Spacing.sm,
    marginBottom: Spacing.xs,
  },
  detailBox: {
    flex: 1,
    alignItems: 'center',
  },
  detailLabel: {
    ...Typography.labelLg,
    fontSize: 9,
    color: Colors.tertiary,
    fontFamily: 'Inter-Bold',
  },
  detailValue: {
    ...Typography.titleLg,
    fontSize: 12,
    fontFamily: 'Inter-Bold',
    color: Colors.onSurface,
    marginTop: 2,
  },
  actionRow: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    alignItems: 'center',
    gap: Spacing.sm,
    marginTop: 4,
  },
  editBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: Spacing.sm,
    paddingVertical: 4,
    backgroundColor: Colors.surfaceContainerLow,
    borderRadius: BorderRadius.md,
    gap: 4,
  },
  editBtnText: {
    ...Typography.labelLg,
    fontSize: 11,
    color: Colors.primary,
    fontFamily: 'Inter-Bold',
  },
  deleteBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: Spacing.sm,
    paddingVertical: 4,
    backgroundColor: '#FFEBEE',
    borderRadius: BorderRadius.md,
    gap: 2,
  },
  deleteBtnText: {
    ...Typography.labelLg,
    fontSize: 11,
    color: '#D32F2F',
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
    maxHeight: '85%',
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
    marginTop: 2,
  },
  formScroll: {
    marginTop: Spacing.xs,
  },
  formSectionLabel: {
    ...Typography.labelLg,
    fontSize: 11,
    fontFamily: 'Inter-Bold',
    color: Colors.tertiary,
    marginTop: Spacing.xs,
    marginBottom: 4,
  },
  toggleRow: {
    flexDirection: 'row',
    gap: Spacing.xs,
    marginBottom: Spacing.sm,
  },
  toggleBtn: {
    flex: 1,
    paddingVertical: 8,
    alignItems: 'center',
    borderRadius: BorderRadius.md,
    backgroundColor: Colors.surfaceContainerLow,
    borderWidth: 1,
    borderColor: Colors.surfaceContainerHigh,
  },
  toggleBtnActive: {
    backgroundColor: Colors.primaryContainer,
    borderColor: Colors.primary,
  },
  toggleBtnText: {
    ...Typography.labelLg,
    fontSize: 11,
    color: Colors.onSurfaceVariant,
  },
  toggleBtnTextActive: {
    color: Colors.onPrimaryContainer,
    fontFamily: 'Inter-Bold',
  },
  activeSwitchRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginVertical: Spacing.sm,
  },
  switchLabel: {
    ...Typography.titleLg,
    fontSize: 13,
    fontFamily: 'Inter-Bold',
    color: Colors.onSurface,
  },
  lockedCodeNote: {
    ...Typography.bodyMd,
    fontSize: 10,
    color: '#D32F2F',
    marginTop: -Spacing.xs,
    marginBottom: Spacing.xs,
  },
  modalActions: {
    marginTop: Spacing.md,
    marginBottom: Spacing.sm,
  },
});

export default CouponManagementScreen;
