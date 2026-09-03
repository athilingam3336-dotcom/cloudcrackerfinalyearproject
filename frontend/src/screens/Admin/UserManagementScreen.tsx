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
  ListRenderItem,
  ActivityIndicator,
  Image,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { MaterialIcons } from '@expo/vector-icons';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { Colors } from '@/constants/colors';
import { Typography } from '@/constants/typography';
import { Spacing, BorderRadius } from '@/constants/spacing';
import { HomeHeader } from '@/components/common/HomeHeader';
import { SearchBar } from '@/components/inputs/SearchBar';
import { PrimaryButton } from '@/components/buttons/PrimaryButton';
import { BottomNavBar, TabRoute } from '@/components/common/BottomNavBar';
import { LoadingSpinner } from '@/components/loaders/LoadingSpinner';
import {
  adminService,
  AdminUserItem,
  AdminUserDetail,
  UserSummaryMetrics,
  UserOrdersResponseUI,
  CustomerOrderDetailUI,
  UserOrderItemUI,
} from '@/services/adminService';
import { useNotificationStore } from '@/store';
import { RootStackParamList } from '@/navigation/types';
import { formatCurrency } from '@/utils/currency';
import { resolveProductImage } from '@/constants/productImages';

import { useSmartTabNavigation } from '@/hooks/useSmartTabNavigation';

type UserManagementScreenProps = NativeStackScreenProps<
  RootStackParamList,
  'UserManagement'
>;

export const UserManagementScreen: React.FC<UserManagementScreenProps> = ({
  navigation,
}) => {
  const { handleTabPress } = useSmartTabNavigation();
  const [users, setUsers] = useState<AdminUserItem[]>([]);
  const [metrics, setMetrics] = useState<UserSummaryMetrics>({
    totalUsers: 0,
    activeUsers: 0,
    inactiveUsers: 0,
    blockedUsers: 0,
    customerCount: 0,
    adminCount: 0,
  });
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Search, Filter & Pagination
  const [searchQuery, setSearchQuery] = useState('');
  const [activeFilter, setActiveFilter] = useState<
    'All' | 'Customers' | 'Admins' | 'Active' | 'Inactive' | 'Blocked'
  >('All');
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalUsersCount, setTotalUsersCount] = useState(0);

  // User Details & Orders Modal
  const [isDetailModalVisible, setIsDetailModalVisible] = useState(false);
  const [selectedUserDetail, setSelectedUserDetail] = useState<AdminUserDetail | null>(null);
  const [isLoadingDetails, setIsLoadingDetails] = useState(false);
  const [userOrdersData, setUserOrdersData] = useState<UserOrdersResponseUI | null>(null);
  const [ordersPage, setOrdersPage] = useState(1);
  const [isLoadingOrders, setIsLoadingOrders] = useState(false);
  const [expandedOrderId, setExpandedOrderId] = useState<string | null>(null);

  const toggleExpandOrder = useCallback((id: string) => {
    setExpandedOrderId((prev) => (prev === id ? null : id));
  }, []);

  // Status Change Modal
  const [isStatusModalVisible, setIsStatusModalVisible] = useState(false);
  const [targetUser, setTargetUser] = useState<AdminUserItem | null>(null);
  const [selectedStatus, setSelectedStatus] = useState<'active' | 'inactive' | 'blocked'>('active');

  // Role Change Modal
  const [isRoleModalVisible, setIsRoleModalVisible] = useState(false);
  const [selectedRole, setSelectedRole] = useState<'CUSTOMER' | 'ADMIN'>('CUSTOMER');

  const unreadNotifs = useNotificationStore((state) => state.getUnreadCount());

  // Convert UI filter chip to backend query params
  const { roleParam, statusParam } = useMemo(() => {
    let r: string | undefined = undefined;
    let s: string | undefined = undefined;
    if (activeFilter === 'Customers') r = 'CUSTOMER';
    else if (activeFilter === 'Admins') r = 'ADMIN';
    else if (activeFilter === 'Active') s = 'active';
    else if (activeFilter === 'Inactive') s = 'inactive';
    else if (activeFilter === 'Blocked') s = 'blocked';
    return { roleParam: r, statusParam: s };
  }, [activeFilter]);

  // Fetch Users
  const fetchUsers = useCallback(async () => {
    try {
      setErrorMessage(null);
      const res = await adminService.getAdminUsers({
        page,
        limit: 10,
        search: searchQuery.trim() || undefined,
        role: roleParam,
        account_status: statusParam,
        sort_by: 'created_at',
        sort_order: 'desc',
      });
      setUsers(res.users);
      setTotalPages(res.totalPages);
      setTotalUsersCount(res.total);
      setMetrics(res.metrics);
    } catch (err: any) {
      setErrorMessage(
        err.response?.data?.message || err.message || 'Failed to load user accounts.'
      );
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  }, [page, searchQuery, roleParam, statusParam]);

  useEffect(() => {
    fetchUsers();
  }, [fetchUsers]);

  const handleRefresh = useCallback(() => {
    setIsRefreshing(true);
    fetchUsers();
  }, [fetchUsers]);

  // Strictly filtered user list based on active filter chip for 100% UI accuracy
  const displayUsers = useMemo(() => {
    return users.filter((u) => {
      const isRoleAdmin = (u.role || '').toUpperCase() === 'ADMIN';
      const isUserActive = u.isActive && u.status === 'active';
      const isUserBlocked = u.status === 'blocked';
      const isUserInactive = !u.isActive || u.status === 'inactive';

      if (activeFilter === 'Admins') return isRoleAdmin;
      if (activeFilter === 'Customers') return !isRoleAdmin;
      if (activeFilter === 'Active') return isUserActive;
      if (activeFilter === 'Inactive') return isUserInactive;
      if (activeFilter === 'Blocked') return isUserBlocked;

      return true;
    });
  }, [users, activeFilter]);

  // Open Details Modal
  const handleOpenDetails = useCallback(async (user: AdminUserItem) => {
    setIsDetailModalVisible(true);
    setIsLoadingDetails(true);
    setUserOrdersData(null);
    setOrdersPage(1);
    setExpandedOrderId(null);
    try {
      const detail = await adminService.getAdminUser(user.id);
      setSelectedUserDetail(detail);
      // Fetch user's order history
      const ordersRes = await adminService.getUserOrders(user.id, 1, 5);
      setUserOrdersData(ordersRes);
      if (ordersRes && ordersRes.orders.length > 0) {
        setExpandedOrderId(ordersRes.orders[0].id || ordersRes.orders[0].orderNumber);
      }
    } catch (err: any) {
      Alert.alert('Error', err.response?.data?.message || 'Failed to load user details.');
    } finally {
      setIsLoadingDetails(false);
    }
  }, []);

  // Fetch paginated user orders in modal
  const handleLoadUserOrdersPage = useCallback(
    async (newPage: number) => {
      if (!selectedUserDetail) return;
      setIsLoadingOrders(true);
      try {
        const res = await adminService.getUserOrders(selectedUserDetail.id, newPage, 5);
        setUserOrdersData(res);
        setOrdersPage(newPage);
      } catch (err: any) {
        Alert.alert('Error', 'Failed to load order history page.');
      } finally {
        setIsLoadingOrders(false);
      }
    },
    [selectedUserDetail]
  );

  // Open Status Modal
  const handleOpenStatusModal = useCallback((user: AdminUserItem) => {
    setTargetUser(user);
    setSelectedStatus(
      user.status === 'blocked' ? 'blocked' : user.isActive ? 'active' : 'inactive'
    );
    setIsStatusModalVisible(true);
  }, []);

  // Submit Status Change
  const handleSaveStatus = useCallback(async () => {
    if (!targetUser) return;
    setIsSaving(true);
    try {
      const updated = await adminService.updateUserStatus(
        targetUser.id,
        selectedStatus,
        selectedStatus === 'active'
      );
      Alert.alert(
        'Status Updated',
        `Account status for ${updated.fullName} set to ${selectedStatus.toUpperCase()}.`
      );
      setIsStatusModalVisible(false);
      if (selectedUserDetail && selectedUserDetail.id === targetUser.id) {
        setSelectedUserDetail(updated);
      }
      fetchUsers();
    } catch (err: any) {
      Alert.alert(
        'Update Failed',
        err.response?.data?.message || err.message || 'Could not update account status.'
      );
    } finally {
      setIsSaving(false);
    }
  }, [targetUser, selectedStatus, selectedUserDetail, fetchUsers]);

  // Open Role Modal
  const handleOpenRoleModal = useCallback((user: AdminUserItem) => {
    setTargetUser(user);
    setSelectedRole(user.role);
    setIsRoleModalVisible(true);
  }, []);

  // Submit Role Change
  const handleSaveRole = useCallback(async () => {
    if (!targetUser) return;
    setIsSaving(true);
    try {
      const updated = await adminService.updateUserRole(targetUser.id, selectedRole);
      Alert.alert(
        'Role Updated',
        `Account role for ${updated.fullName} is now ${selectedRole}.`
      );
      setIsRoleModalVisible(false);
      if (selectedUserDetail && selectedUserDetail.id === targetUser.id) {
        setSelectedUserDetail(updated);
      }
      fetchUsers();
    } catch (err: any) {
      Alert.alert(
        'Role Update Failed',
        err.response?.data?.message || err.message || 'Could not update user role.'
      );
    } finally {
      setIsSaving(false);
    }
  }, [targetUser, selectedRole, selectedUserDetail, fetchUsers]);

  // Deactivate User with Confirmation
  const handleDeactivate = useCallback(
    (user: AdminUserItem) => {
      Alert.alert(
        'Deactivate Account',
        `Are you sure you want to deactivate ${user.fullName} (${user.email})? Historical order and payment logs will be safely preserved.`,
        [
          { text: 'Cancel', style: 'cancel' },
          {
            text: 'Deactivate',
            style: 'destructive',
            onPress: async () => {
              try {
                await adminService.deactivateUser(user.id);
                Alert.alert('Account Deactivated', 'The user account has been disabled.');
                fetchUsers();
              } catch (err: any) {
                Alert.alert(
                  'Action Failed',
                  err.response?.data?.message || 'Could not deactivate user account.'
                );
              }
            },
          },
        ]
      );
    },
    [fetchUsers]
  );

  // Render User Card Item
  const renderUserItem: ListRenderItem<AdminUserItem> = useCallback(
    ({ item }) => {
      const isAdmin = item.role === 'ADMIN';
      const isBlocked = item.status === 'blocked';
      const isActive = item.isActive && item.status === 'active';

      return (
        <View style={styles.userCard}>
          {/* Card Header */}
          <View style={styles.cardHeader}>
            <View style={styles.avatarCircle}>
              <Text style={styles.avatarText}>
                {item.fullName.charAt(0).toUpperCase()}
              </Text>
            </View>

            <View style={styles.userInfoCol}>
              <View style={styles.nameRow}>
                <Text style={styles.userNameText} numberOfLines={1}>
                  {item.fullName}
                </Text>
                {isAdmin && (
                  <View style={styles.adminBadge}>
                    <MaterialIcons name="admin-panel-settings" size={14} color="#FFF" />
                    <Text style={styles.adminBadgeText}>ADMIN</Text>
                  </View>
                )}
              </View>

              <Text style={styles.userEmailText} numberOfLines={1}>
                {item.email}
              </Text>
              {item.phone ? (
                <Text style={styles.userPhoneText}>
                  <MaterialIcons name="phone" size={12} color={Colors.outline} /> {item.phone}
                </Text>
              ) : null}
            </View>

            {/* Status Pill */}
            <View
              style={[
                styles.statusBadge,
                isActive
                  ? styles.statusActive
                  : isBlocked
                  ? styles.statusBlocked
                  : styles.statusInactive,
              ]}
            >
              <Text
                style={[
                  styles.statusBadgeText,
                  isActive
                    ? styles.statusTextActive
                    : isBlocked
                    ? styles.statusTextBlocked
                    : styles.statusTextInactive,
                ]}
              >
                {isBlocked ? 'BLOCKED' : isActive ? 'ACTIVE' : 'INACTIVE'}
              </Text>
            </View>
          </View>

          {/* Stats Bar */}
          <View style={styles.statsBar}>
            <View style={styles.statCol}>
              <Text style={styles.statLabel}>Orders</Text>
              <Text style={styles.statValue}>{item.orderCount}</Text>
            </View>
            <View style={styles.statDivider} />
            <View style={styles.statCol}>
              <Text style={styles.statLabel}>Total Spent</Text>
              <Text style={styles.statValue}>{formatCurrency(item.totalSpent)}</Text>
            </View>
            <View style={styles.statDivider} />
            <View style={styles.statCol}>
              <Text style={styles.statLabel}>Joined</Text>
              <Text style={styles.statValue}>
                {item.createdAt ? new Date(item.createdAt).toLocaleDateString() : 'N/A'}
              </Text>
            </View>
          </View>

          {/* Action Row */}
          <View style={styles.cardActionsRow}>
            <TouchableOpacity
              style={styles.actionBtnSecondary}
              onPress={() => handleOpenDetails(item)}
              activeOpacity={0.8}
            >
              <MaterialIcons name="visibility" size={16} color={Colors.primary} />
              <Text style={styles.actionBtnTextSecondary}>Details & Orders</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.actionBtnOutline}
              onPress={() => handleOpenStatusModal(item)}
              activeOpacity={0.8}
            >
              <MaterialIcons name="toggle-on" size={16} color={Colors.onSurfaceVariant} />
              <Text style={styles.actionBtnTextOutline}>Status</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.actionBtnOutline}
              onPress={() => handleOpenRoleModal(item)}
              activeOpacity={0.8}
            >
              <MaterialIcons name="shield" size={16} color={Colors.onSurfaceVariant} />
              <Text style={styles.actionBtnTextOutline}>Role</Text>
            </TouchableOpacity>

            {isActive && (
              <TouchableOpacity
                style={styles.deactivateBtn}
                onPress={() => handleDeactivate(item)}
                activeOpacity={0.8}
              >
                <MaterialIcons name="person-off" size={16} color={Colors.error} />
              </TouchableOpacity>
            )}
          </View>
        </View>
      );
    },
    [handleOpenDetails, handleOpenStatusModal, handleOpenRoleModal, handleDeactivate]
  );

  return (
    <SafeAreaView style={styles.safeArea} edges={['top', 'left', 'right']}>
      {/* Header */}
      <HomeHeader
        onBackPress={() => (navigation.canGoBack() ? navigation.goBack() : navigation.navigate('AdminDashboard'))}
        onNotificationPress={() => navigation.navigate('Notifications')}
        onProfilePress={() => navigation.navigate('UserProfile')}
        onCartPress={() => navigation.navigate('Cart')}
        notificationCount={unreadNotifs}
      />

      <View style={styles.container}>
        {/* Title Bar */}
        <View style={styles.titleRow}>
          <TouchableOpacity
            style={styles.backBtn}
            onPress={() => navigation.goBack()}
            activeOpacity={0.8}
          >
            <MaterialIcons name="arrow-back" size={24} color={Colors.onBackground} />
          </TouchableOpacity>
          <View style={styles.titleContainer}>
            <Text style={styles.screenTitle}>Customer & User Management</Text>
            <Text style={styles.screenSubtitle}>
              RBAC access, account status, and order operations
            </Text>
          </View>
          <TouchableOpacity
            style={styles.orderMgmtQuickBtn}
            onPress={() => navigation.navigate('OrderManagement')}
            activeOpacity={0.8}
          >
            <MaterialIcons name="local-shipping" size={16} color={Colors.primary} />
            <Text style={styles.orderMgmtQuickBtnText}>All Orders</Text>
          </TouchableOpacity>
        </View>

        {/* KPI Metrics Cards */}
        <View style={styles.kpiContainer}>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.kpiScroll}>
            <View style={styles.kpiCard}>
              <View style={[styles.kpiIconWrapper, { backgroundColor: Colors.primaryContainer }]}>
                <MaterialIcons name="people" size={20} color={Colors.primary} />
              </View>
              <Text style={styles.kpiValue}>{metrics.totalUsers}</Text>
              <Text style={styles.kpiTitle}>Total Users</Text>
            </View>

            <View style={styles.kpiCard}>
              <View style={[styles.kpiIconWrapper, { backgroundColor: '#E0F2FE' }]}>
                <MaterialIcons name="person" size={20} color="#0284C7" />
              </View>
              <Text style={styles.kpiValue}>{metrics.customerCount}</Text>
              <Text style={styles.kpiTitle}>Customers</Text>
            </View>

            <View style={styles.kpiCard}>
              <View style={[styles.kpiIconWrapper, { backgroundColor: '#DCFCE7' }]}>
                <MaterialIcons name="check-circle" size={20} color="#16A34A" />
              </View>
              <Text style={styles.kpiValue}>{metrics.activeUsers}</Text>
              <Text style={styles.kpiTitle}>Active</Text>
            </View>

            <View style={styles.kpiCard}>
              <View style={[styles.kpiIconWrapper, { backgroundColor: '#FEE2E2' }]}>
                <MaterialIcons name="block" size={20} color="#DC2626" />
              </View>
              <Text style={styles.kpiValue}>{metrics.blockedUsers}</Text>
              <Text style={styles.kpiTitle}>Blocked</Text>
            </View>

            <View style={styles.kpiCard}>
              <View style={[styles.kpiIconWrapper, { backgroundColor: '#FEF3C7' }]}>
                <MaterialIcons name="admin-panel-settings" size={20} color="#D97706" />
              </View>
              <Text style={styles.kpiValue}>{metrics.adminCount}</Text>
              <Text style={styles.kpiTitle}>Admins</Text>
            </View>
          </ScrollView>
        </View>

        {/* Search Bar */}
        <View style={styles.searchSection}>
          <SearchBar
            value={searchQuery}
            onChangeText={(txt) => {
              setSearchQuery(txt);
              setPage(1);
            }}
            placeholder="Search by name, email, or phone..."
          />
        </View>

        {/* Filter Chips */}
        <View style={styles.filterSection}>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.filterScroll}>
            {(['All', 'Customers', 'Admins', 'Active', 'Inactive', 'Blocked'] as const).map((filterName) => {
              const isSelected = activeFilter === filterName;
              return (
                <TouchableOpacity
                  key={filterName}
                  style={[styles.filterChip, isSelected && styles.filterChipActive]}
                  onPress={() => {
                    setActiveFilter(filterName);
                    setPage(1);
                  }}
                  activeOpacity={0.8}
                >
                  <Text style={[styles.filterChipText, isSelected && styles.filterChipTextActive]}>
                    {filterName}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </ScrollView>
        </View>

        {/* Error Banner */}
        {errorMessage && (
          <View style={styles.errorBanner}>
            <MaterialIcons name="error-outline" size={20} color={Colors.error} />
            <Text style={styles.errorBannerText}>{errorMessage}</Text>
            <TouchableOpacity style={styles.retryBtn} onPress={fetchUsers} activeOpacity={0.8}>
              <Text style={styles.retryBtnText}>Retry</Text>
            </TouchableOpacity>
          </View>
        )}

        {/* User FlatList */}
        {isLoading ? (
          <View style={styles.loaderContainer}>
            <LoadingSpinner message="Fetching user accounts from MongoDB..." />
          </View>
        ) : (
          <FlatList
            data={displayUsers}
            keyExtractor={(item) => item.id}
            renderItem={renderUserItem}
            contentContainerStyle={styles.listContent}
            refreshing={isRefreshing}
            onRefresh={handleRefresh}
            ListEmptyComponent={
              <View style={styles.emptyState}>
                <MaterialIcons name="person-search" size={48} color={Colors.outline} />
                <Text style={styles.emptyTitle}>No Users Found</Text>
                <Text style={styles.emptySubtitle}>
                  {searchQuery
                    ? `No account matched "${searchQuery}". Try clearing search.`
                    : 'No user accounts match the current filter selection.'}
                </Text>
                <TouchableOpacity
                  style={styles.resetFilterBtn}
                  onPress={() => {
                    setSearchQuery('');
                    setActiveFilter('All');
                    setPage(1);
                  }}
                  activeOpacity={0.8}
                >
                  <Text style={styles.resetFilterBtnText}>Reset Filters</Text>
                </TouchableOpacity>
              </View>
            }
            ListFooterComponent={
              totalPages > 1 ? (
                <View style={styles.paginationRow}>
                  <TouchableOpacity
                    style={[styles.pageBtn, page <= 1 && styles.pageBtnDisabled]}
                    onPress={() => setPage((p) => Math.max(1, p - 1))}
                    disabled={page <= 1}
                    activeOpacity={0.8}
                  >
                    <MaterialIcons
                      name="chevron-left"
                      size={20}
                      color={page <= 1 ? Colors.outline : Colors.primary}
                    />
                    <Text style={[styles.pageBtnText, page <= 1 && styles.pageBtnTextDisabled]}>
                      Previous
                    </Text>
                  </TouchableOpacity>

                  <Text style={styles.pageInfoText}>
                    Page {page} of {totalPages} ({totalUsersCount} users)
                  </Text>

                  <TouchableOpacity
                    style={[styles.pageBtn, page >= totalPages && styles.pageBtnDisabled]}
                    onPress={() => setPage((p) => Math.min(totalPages, p + 1))}
                    disabled={page >= totalPages}
                    activeOpacity={0.8}
                  >
                    <Text style={[styles.pageBtnText, page >= totalPages && styles.pageBtnTextDisabled]}>
                      Next
                    </Text>
                    <MaterialIcons
                      name="chevron-right"
                      size={20}
                      color={page >= totalPages ? Colors.outline : Colors.primary}
                    />
                  </TouchableOpacity>
                </View>
              ) : null
            }
          />
        )}
      </View>

      {/* User Details & Orders Modal */}
      <Modal
        visible={isDetailModalVisible}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setIsDetailModalVisible(false)}
      >
        <View style={styles.modalBackdrop}>
          <View style={styles.detailModalCard}>
            <View style={styles.modalHeaderRow}>
              <View>
                <Text style={styles.modalTitle}>User Account Profile</Text>
                <Text style={styles.modalSubtitle}>Comprehensive details and transaction logs</Text>
              </View>
              <TouchableOpacity
                onPress={() => setIsDetailModalVisible(false)}
                style={styles.closeIconBtn}
                activeOpacity={0.8}
              >
                <MaterialIcons name="close" size={24} color={Colors.onBackground} />
              </TouchableOpacity>
            </View>

            {isLoadingDetails ? (
              <View style={styles.modalLoaderContainer}>
                <ActivityIndicator size="large" color={Colors.primary} />
                <Text style={styles.loadingText}>Loading profile & order history...</Text>
              </View>
            ) : selectedUserDetail ? (
              <ScrollView style={styles.modalBodyScroll} showsVerticalScrollIndicator={false}>
                {/* Profile Overview Card */}
                <View style={styles.detailProfileBox}>
                  <View style={styles.detailAvatar}>
                    <Text style={styles.detailAvatarText}>
                      {selectedUserDetail.fullName.charAt(0).toUpperCase()}
                    </Text>
                  </View>
                  <View style={styles.detailMainInfo}>
                    <Text style={styles.detailName}>{selectedUserDetail.fullName}</Text>
                    <Text style={styles.detailEmail}>{selectedUserDetail.email}</Text>
                    <Text style={styles.detailPhone}>
                      <MaterialIcons name="phone" size={14} color={Colors.outline} />{' '}
                      {selectedUserDetail.phone || 'No phone provided'}
                    </Text>
                  </View>
                </View>

                {/* Account Badges */}
                <View style={styles.badgesRow}>
                  <View
                    style={[
                      styles.roleBadgeLg,
                      selectedUserDetail.role === 'ADMIN'
                        ? styles.roleBadgeAdmin
                        : styles.roleBadgeCustomer,
                    ]}
                  >
                    <MaterialIcons
                      name={selectedUserDetail.role === 'ADMIN' ? 'admin-panel-settings' : 'person'}
                      size={16}
                      color="#FFF"
                    />
                    <Text style={styles.roleBadgeLgText}>{selectedUserDetail.role}</Text>
                  </View>

                  <View
                    style={[
                      styles.statusBadgeLg,
                      selectedUserDetail.status === 'active'
                        ? styles.statusActive
                        : selectedUserDetail.status === 'blocked'
                        ? styles.statusBlocked
                        : styles.statusInactive,
                    ]}
                  >
                    <Text
                      style={[
                        styles.statusBadgeLgText,
                        selectedUserDetail.status === 'active'
                          ? styles.statusTextActive
                          : selectedUserDetail.status === 'blocked'
                          ? styles.statusTextBlocked
                          : styles.statusTextInactive,
                      ]}
                    >
                      {selectedUserDetail.status.toUpperCase()}
                    </Text>
                  </View>
                </View>

                {/* Lifetime Order Summary */}
                <View style={styles.sectionHeader}>
                  <MaterialIcons name="analytics" size={18} color={Colors.primary} />
                  <Text style={styles.sectionHeaderText}>Lifetime Financial Summary</Text>
                </View>

                <View style={styles.summaryGrid}>
                  <View style={styles.summaryBox}>
                    <Text style={styles.summaryBoxLabel}>Total Orders</Text>
                    <Text style={styles.summaryBoxVal}>
                      {selectedUserDetail.orderSummary.total_orders || 0}
                    </Text>
                  </View>
                  <View style={styles.summaryBox}>
                    <Text style={styles.summaryBoxLabel}>Total Spent</Text>
                    <Text style={styles.summaryBoxVal}>
                      {formatCurrency(selectedUserDetail.orderSummary.total_spent || 0.0)}
                    </Text>
                  </View>
                  <View style={styles.summaryBox}>
                    <Text style={styles.summaryBoxLabel}>Pending Orders</Text>
                    <Text style={[styles.summaryBoxVal, { color: '#D97706' }]}>
                      {selectedUserDetail.orderSummary.pending_orders || 0}
                    </Text>
                  </View>
                  <View style={styles.summaryBox}>
                    <Text style={styles.summaryBoxLabel}>Completed</Text>
                    <Text style={[styles.summaryBoxVal, { color: '#16A34A' }]}>
                      {selectedUserDetail.orderSummary.completed_orders || 0}
                    </Text>
                  </View>
                </View>

                {/* Order History Section */}
                <View style={styles.sectionHeader}>
                  <MaterialIcons name="receipt-long" size={18} color={Colors.primary} />
                  <Text style={styles.sectionHeaderText}>Customer Order History</Text>
                </View>

                {isLoadingOrders ? (
                  <ActivityIndicator size="small" color={Colors.primary} style={{ marginVertical: 12 }} />
                ) : userOrdersData && userOrdersData.orders.length > 0 ? (
                  <View style={styles.ordersListContainer}>
                    {userOrdersData.orders.map((ord) => {
                      const isExpanded = expandedOrderId === (ord.id || ord.orderNumber);
                      return (
                        <View key={ord.id || ord.orderNumber} style={styles.orderHistoryItem}>
                          {/* Interactive Header to Toggle Expansion */}
                          <TouchableOpacity
                            style={styles.orderItemHeader}
                            onPress={() => toggleExpandOrder(ord.id || ord.orderNumber)}
                            activeOpacity={0.7}
                          >
                            <View style={styles.orderHeaderLeft}>
                              <View style={styles.orderNumRow}>
                                <MaterialIcons name="receipt" size={16} color={Colors.primary} />
                                <Text style={styles.orderNumberText}>{ord.orderNumber}</Text>
                              </View>
                              <Text style={styles.orderDateText}>Placed: {ord.date}</Text>
                            </View>

                            <View style={styles.orderHeaderRight}>
                              <Text style={styles.orderTotalText}>{formatCurrency(ord.total)}</Text>
                              <MaterialIcons
                                name={isExpanded ? 'keyboard-arrow-up' : 'keyboard-arrow-down'}
                                size={22}
                                color={Colors.onSurfaceVariant}
                              />
                            </View>
                          </TouchableOpacity>

                          {/* Quick Badges Row */}
                          <View style={styles.orderItemRow}>
                            <View
                              style={[
                                styles.orderStatusPill,
                                (ord.orderStatus || '').toLowerCase() === 'delivered'
                                  ? styles.pillDelivered
                                  : ['shipped', 'packed', 'in transit'].includes((ord.orderStatus || '').toLowerCase())
                                  ? styles.pillShipped
                                  : (ord.orderStatus || '').toLowerCase() === 'cancelled'
                                  ? styles.pillCancelled
                                  : styles.pillPending,
                              ]}
                            >
                              <Text style={styles.pillText}>Order: {ord.orderStatus}</Text>
                            </View>

                            <View
                              style={[
                                styles.orderPayPill,
                                ord.paymentStatus === 'Paid'
                                  ? styles.pillPaid
                                  : ord.paymentStatus === 'Refunded'
                                  ? styles.pillRefunded
                                  : styles.pillUnpaid,
                              ]}
                            >
                              <Text style={styles.pillText}>Pay: {ord.paymentStatus}</Text>
                            </View>

                            <Text style={styles.orderItemsCountText}>
                              {ord.itemCount || ord.items?.length || 0} item{(ord.itemCount || ord.items?.length || 0) === 1 ? '' : 's'}
                            </Text>
                          </View>

                          {/* Expanded Detailed Order View */}
                          {isExpanded && (
                            <View style={styles.expandedOrderSection}>
                              {/* Ordered Pyrotechnics Items List */}
                              <View style={styles.expandedSubHeader}>
                                <MaterialIcons name="local-fire-department" size={16} color={Colors.primary} />
                                <Text style={styles.expandedSectionHeading}>
                                  Ordered Products ({ord.items?.length || ord.itemCount})
                                </Text>
                              </View>

                              {ord.items && ord.items.length > 0 ? (
                                <View style={styles.expandedItemsList}>
                                  {ord.items.map((item, idx) => (
                                    <View key={item.id || item.productId || idx} style={styles.productItemCard}>
                                      <Image
                                        source={resolveProductImage({
                                          name: item.productName,
                                          category: item.category,
                                          images: item.productImage ? [item.productImage] : [],
                                        })}
                                        style={styles.productThumb}
                                        resizeMode="cover"
                                      />
                                      <View style={styles.productInfoCol}>
                                        <Text style={styles.productItemName} numberOfLines={2}>
                                          {item.productName}
                                        </Text>
                                        {item.category ? (
                                          <View style={styles.categoryTag}>
                                            <Text style={styles.categoryTagText}>{item.category}</Text>
                                          </View>
                                        ) : null}
                                        <Text style={styles.productItemQtyPrice}>
                                          Qty: <Text style={{ fontWeight: '700', color: Colors.onBackground }}>{item.quantity}</Text> × {formatCurrency(item.unitPrice || item.price)}
                                        </Text>
                                      </View>
                                      <Text style={styles.productItemTotal}>
                                        {formatCurrency(item.subtotal || item.total || (item.quantity * item.price))}
                                      </Text>
                                    </View>
                                  ))}
                                </View>
                              ) : (
                                <View style={styles.noItemsBox}>
                                  <Text style={styles.noItemsText}>Total Items: {ord.itemCount}</Text>
                                </View>
                              )}

                              {/* Delivery Address */}
                              {ord.shippingAddress ? (
                                <View style={styles.orderDetailInfoBox}>
                                  <View style={styles.infoBoxHeader}>
                                    <MaterialIcons name="local-shipping" size={15} color={Colors.primary} />
                                    <Text style={styles.infoBoxTitle}>Delivery Address</Text>
                                  </View>
                                  <Text style={styles.infoBoxText}>{ord.shippingAddress}</Text>
                                </View>
                              ) : null}

                              {/* Complete Financial Breakdown */}
                              <View style={styles.financialSummaryCard}>
                                <View style={styles.finRow}>
                                  <Text style={styles.finLabel}>Subtotal</Text>
                                  <Text style={styles.finValue}>{formatCurrency(ord.subtotal)}</Text>
                                </View>

                                {(ord.discount > 0 || (ord.couponDiscount && ord.couponDiscount > 0)) ? (
                                  <View style={styles.finRow}>
                                    <Text style={[styles.finLabel, { color: Colors.primary }]}>
                                      Discount {ord.couponCode ? `(${ord.couponCode})` : ''}
                                    </Text>
                                    <Text style={[styles.finValue, { color: Colors.primary }]}>
                                      -{formatCurrency(ord.couponDiscount || ord.discount)}
                                    </Text>
                                  </View>
                                ) : null}

                                <View style={styles.finRow}>
                                  <Text style={styles.finLabel}>Shipping Fee</Text>
                                  <Text style={styles.finValue}>
                                    {ord.shipping > 0 ? formatCurrency(ord.shipping) : 'FREE'}
                                  </Text>
                                </View>

                                <View style={styles.finRow}>
                                  <Text style={styles.finLabel}>Tax / GST</Text>
                                  <Text style={styles.finValue}>{formatCurrency(ord.tax)}</Text>
                                </View>

                                <View style={styles.finDivider} />

                                <View style={styles.finRow}>
                                  <Text style={styles.finGrandLabel}>Grand Total</Text>
                                  <Text style={styles.finGrandValue}>{formatCurrency(ord.total)}</Text>
                                </View>

                                <View style={[styles.finRow, { marginTop: 4 }]}>
                                  <Text style={styles.finLabel}>Payment Method</Text>
                                  <Text style={styles.finValue}>{ord.paymentMethod || 'Card'}</Text>
                                </View>
                              </View>

                              {/* Razorpay Transaction Details (Requirements 3 & 10) */}
                              {(ord.razorpayOrderId || (ord.razorpayPaymentId && ord.paymentStatus !== 'Pending')) ? (
                                <View style={styles.razorpayBox}>
                                  <View style={styles.infoBoxHeader}>
                                    <MaterialIcons name="verified" size={15} color="#0284C7" />
                                    <Text style={styles.razorpayHeaderTitle}>Razorpay Payment Details</Text>
                                  </View>
                                  {ord.razorpayOrderId ? (
                                    <Text style={styles.razorpayText}>
                                      <Text style={styles.razorpayLabel}>Order ID: </Text>
                                      {ord.razorpayOrderId}
                                    </Text>
                                  ) : null}
                                  {ord.razorpayPaymentId ? (
                                    <Text style={styles.razorpayText}>
                                      <Text style={styles.razorpayLabel}>Payment ID: </Text>
                                      {ord.razorpayPaymentId}
                                    </Text>
                                  ) : null}
                                  {ord.paymentCompletedAt ? (
                                    <Text style={styles.razorpayText}>
                                      <Text style={styles.razorpayLabel}>Completed: </Text>
                                      {new Date(ord.paymentCompletedAt).toLocaleString()}
                                    </Text>
                                  ) : null}
                                </View>
                              ) : null}

                              {/* Action Link to Full Order Invoice */}
                              <TouchableOpacity
                                style={styles.fullOrderDetailsBtn}
                                onPress={() => {
                                  setIsDetailModalVisible(false);
                                  navigation.navigate('OrderDetails', { orderId: ord.id });
                                }}
                                activeOpacity={0.8}
                              >
                                <MaterialIcons name="launch" size={16} color={Colors.primary} />
                                <Text style={styles.fullOrderDetailsBtnText}>
                                  View Full Order Invoice & Timeline
                                </Text>
                              </TouchableOpacity>
                            </View>
                          )}
                        </View>
                      );
                    })}

                    {userOrdersData.totalPages > 1 && (
                      <View style={styles.modalPaginationRow}>
                        <TouchableOpacity
                          style={[styles.smallPageBtn, ordersPage <= 1 && styles.pageBtnDisabled]}
                          disabled={ordersPage <= 1}
                          onPress={() => handleLoadUserOrdersPage(ordersPage - 1)}
                        >
                          <Text style={styles.smallPageBtnText}>Prev</Text>
                        </TouchableOpacity>
                        <Text style={styles.modalPageInfo}>
                          {ordersPage} / {userOrdersData.totalPages}
                        </Text>
                        <TouchableOpacity
                          style={[styles.smallPageBtn, ordersPage >= userOrdersData.totalPages && styles.pageBtnDisabled]}
                          disabled={ordersPage >= userOrdersData.totalPages}
                          onPress={() => handleLoadUserOrdersPage(ordersPage + 1)}
                        >
                          <Text style={styles.smallPageBtnText}>Next</Text>
                        </TouchableOpacity>
                      </View>
                    )}
                  </View>
                ) : (
                  <View style={styles.emptyOrdersBox}>
                    <Text style={styles.emptyOrdersText}>No orders placed by this customer yet.</Text>
                  </View>
                )}

                {/* Account Metadata */}
                <View style={styles.metadataBox}>
                  <Text style={styles.metadataText}>
                    User ID: {selectedUserDetail.id}
                  </Text>
                  <Text style={styles.metadataText}>
                    Registered: {new Date(selectedUserDetail.createdAt).toLocaleString()}
                  </Text>
                </View>
              </ScrollView>
            ) : null}

            <View style={styles.modalBottomActions}>
              <PrimaryButton
                title="Close"
                onPress={() => setIsDetailModalVisible(false)}
                variant="outline"
              />
            </View>
          </View>
        </View>
      </Modal>

      {/* Account Status Modal */}
      <Modal
        visible={isStatusModalVisible}
        animationType="fade"
        transparent={true}
        onRequestClose={() => setIsStatusModalVisible(false)}
      >
        <View style={styles.modalBackdrop}>
          <View style={styles.actionModalCard}>
            <Text style={styles.modalTitle}>Update Account Status</Text>
            <Text style={styles.modalSubtitle}>
              Select new account state for {targetUser?.fullName}
            </Text>

            <View style={styles.statusOptions}>
              {(['active', 'inactive', 'blocked'] as const).map((st) => {
                const isSelected = selectedStatus === st;
                return (
                  <TouchableOpacity
                    key={st}
                    style={[styles.statusOptionRow, isSelected && styles.statusOptionRowSelected]}
                    onPress={() => setSelectedStatus(st)}
                    activeOpacity={0.8}
                  >
                    <MaterialIcons
                      name={
                        isSelected
                          ? 'radio-button-checked'
                          : 'radio-button-unchecked'
                      }
                      size={22}
                      color={isSelected ? Colors.primary : Colors.outline}
                    />
                    <View style={styles.statusOptionInfo}>
                      <Text style={styles.statusOptionTitle}>{st.toUpperCase()}</Text>
                      <Text style={styles.statusOptionDesc}>
                        {st === 'active'
                          ? 'Full login and checkout permissions.'
                          : st === 'inactive'
                          ? 'Disabled account. Cannot log in.'
                          : 'Blocked account. Restricted for security.'}
                      </Text>
                    </View>
                  </TouchableOpacity>
                );
              })}
            </View>

            <View style={styles.modalBtnRow}>
              <TouchableOpacity
                style={styles.cancelBtn}
                onPress={() => setIsStatusModalVisible(false)}
                disabled={isSaving}
              >
                <Text style={styles.cancelBtnText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.confirmBtn}
                onPress={handleSaveStatus}
                disabled={isSaving}
              >
                {isSaving ? (
                  <ActivityIndicator size="small" color="#FFF" />
                ) : (
                  <Text style={styles.confirmBtnText}>Save Status</Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Role Change Modal */}
      <Modal
        visible={isRoleModalVisible}
        animationType="fade"
        transparent={true}
        onRequestClose={() => setIsRoleModalVisible(false)}
      >
        <View style={styles.modalBackdrop}>
          <View style={styles.actionModalCard}>
            <Text style={styles.modalTitle}>Manage User Role</Text>
            <Text style={styles.modalSubtitle}>
              Configure RBAC permissions for {targetUser?.fullName}
            </Text>

            <View style={styles.statusOptions}>
              {(['CUSTOMER', 'ADMIN'] as const).map((r) => {
                const isSelected = selectedRole === r;
                return (
                  <TouchableOpacity
                    key={r}
                    style={[styles.statusOptionRow, isSelected && styles.statusOptionRowSelected]}
                    onPress={() => setSelectedRole(r)}
                    activeOpacity={0.8}
                  >
                    <MaterialIcons
                      name={isSelected ? 'radio-button-checked' : 'radio-button-unchecked'}
                      size={22}
                      color={isSelected ? Colors.primary : Colors.outline}
                    />
                    <View style={styles.statusOptionInfo}>
                      <Text style={styles.statusOptionTitle}>{r}</Text>
                      <Text style={styles.statusOptionDesc}>
                        {r === 'ADMIN'
                          ? 'Full administrative control over catalog, inventory, orders & users.'
                          : 'Standard customer account with shopping and checkout access.'}
                      </Text>
                    </View>
                  </TouchableOpacity>
                );
              })}
            </View>

            <View style={styles.modalBtnRow}>
              <TouchableOpacity
                style={styles.cancelBtn}
                onPress={() => setIsRoleModalVisible(false)}
                disabled={isSaving}
              >
                <Text style={styles.cancelBtnText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.confirmBtn}
                onPress={handleSaveRole}
                disabled={isSaving}
              >
                {isSaving ? (
                  <ActivityIndicator size="small" color="#FFF" />
                ) : (
                  <Text style={styles.confirmBtnText}>Update Role</Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Bottom Navigation */}
      <BottomNavBar activeTab="Profile" onTabPress={handleTabPress} />
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  container: {
    flex: 1,
    paddingHorizontal: Spacing.md,
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: Spacing.sm,
    gap: Spacing.sm,
  },
  backBtn: {
    padding: Spacing.xs,
    borderRadius: BorderRadius.sm,
    backgroundColor: Colors.surfaceContainerLow,
  },
  titleContainer: {
    flex: 1,
  },
  screenTitle: {
    ...Typography.headlineLgMobile,
    fontWeight: '700',
    color: Colors.onBackground,
  },
  screenSubtitle: {
    ...Typography.bodyMd,
    color: Colors.onSurfaceVariant,
  },
  kpiContainer: {
    marginBottom: Spacing.sm,
  },
  kpiScroll: {
    gap: Spacing.sm,
    paddingVertical: 2,
  },
  kpiCard: {
    backgroundColor: Colors.surfaceContainerLow,
    borderRadius: BorderRadius.md,
    padding: Spacing.sm,
    minWidth: 100,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: Colors.surfaceContainerHigh,
  },
  kpiIconWrapper: {
    width: 32,
    height: 32,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 4,
  },
  kpiValue: {
    ...Typography.titleLg,
    fontWeight: '700',
    color: Colors.onBackground,
  },
  kpiTitle: {
    ...Typography.labelLg,
    color: Colors.onSurfaceVariant,
  },
  searchSection: {
    marginBottom: Spacing.xs,
  },
  filterSection: {
    marginBottom: Spacing.sm,
  },
  filterScroll: {
    gap: Spacing.xs,
  },
  filterChip: {
    paddingHorizontal: Spacing.sm,
    paddingVertical: 6,
    borderRadius: BorderRadius.full,
    backgroundColor: Colors.surfaceContainerLow,
    borderWidth: 1,
    borderColor: Colors.surfaceContainerHigh,
  },
  filterChipActive: {
    backgroundColor: Colors.primary,
    borderColor: Colors.primary,
  },
  filterChipText: {
    ...Typography.labelLg,
    fontWeight: '500',
    color: Colors.onSurfaceVariant,
  },
  filterChipTextActive: {
    color: Colors.onPrimary,
  },
  errorBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FEE2E2',
    padding: Spacing.sm,
    borderRadius: BorderRadius.sm,
    marginBottom: Spacing.sm,
    gap: Spacing.xs,
  },
  errorBannerText: {
    flex: 1,
    ...Typography.bodyMd,
    color: Colors.error,
  },
  retryBtn: {
    paddingHorizontal: Spacing.xs,
    paddingVertical: 4,
  },
  retryBtnText: {
    ...Typography.labelLg,
    fontWeight: '600',
    color: Colors.error,
  },
  loaderContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    gap: Spacing.sm,
  },
  loadingText: {
    ...Typography.bodyMd,
    color: Colors.onSurfaceVariant,
  },
  listContent: {
    paddingBottom: 80,
    gap: Spacing.sm,
  },
  userCard: {
    backgroundColor: Colors.surfaceContainerLow,
    borderRadius: BorderRadius.md,
    padding: Spacing.md,
    borderWidth: 1,
    borderColor: Colors.surfaceContainerHigh,
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    marginBottom: Spacing.sm,
  },
  avatarCircle: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: Colors.primaryContainer,
    justifyContent: 'center',
    alignItems: 'center',
  },
  avatarText: {
    ...Typography.titleLg,
    fontWeight: '700',
    color: Colors.primary,
  },
  userInfoCol: {
    flex: 1,
  },
  nameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.xs,
  },
  userNameText: {
    ...Typography.bodyLg,
    fontWeight: '700',
    color: Colors.onBackground,
    flexShrink: 1,
  },
  adminBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#D97706',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: BorderRadius.full,
    gap: 2,
  },
  adminBadgeText: {
    fontSize: 10,
    fontWeight: '700',
    color: '#FFF',
  },
  userEmailText: {
    ...Typography.bodyMd,
    color: Colors.onSurfaceVariant,
  },
  userPhoneText: {
    ...Typography.bodyMd,
    color: Colors.outline,
    marginTop: 2,
  },
  statusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: BorderRadius.full,
  },
  statusActive: {
    backgroundColor: '#DCFCE7',
  },
  statusInactive: {
    backgroundColor: '#F3F4F6',
  },
  statusBlocked: {
    backgroundColor: '#FEE2E2',
  },
  statusBadgeText: {
    fontSize: 10,
    fontWeight: '700',
  },
  statusTextActive: {
    color: '#16A34A',
  },
  statusTextInactive: {
    color: '#6B7280',
  },
  statusTextBlocked: {
    color: '#DC2626',
  },
  statsBar: {
    flexDirection: 'row',
    backgroundColor: Colors.surfaceContainer,
    borderRadius: BorderRadius.sm,
    paddingVertical: Spacing.xs,
    paddingHorizontal: Spacing.sm,
    marginBottom: Spacing.sm,
    alignItems: 'center',
  },
  statCol: {
    flex: 1,
    alignItems: 'center',
  },
  statDivider: {
    width: 1,
    height: 20,
    backgroundColor: Colors.surfaceContainerHigh,
  },
  statLabel: {
    fontSize: 10,
    color: Colors.outline,
  },
  statValue: {
    ...Typography.labelLg,
    fontWeight: '700',
    color: Colors.onBackground,
  },
  cardActionsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.xs,
  },
  actionBtnSecondary: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.primaryContainer,
    paddingHorizontal: Spacing.sm,
    paddingVertical: 6,
    borderRadius: BorderRadius.sm,
    gap: 4,
  },
  actionBtnTextSecondary: {
    ...Typography.labelLg,
    fontWeight: '600',
    color: Colors.primary,
  },
  actionBtnOutline: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.surfaceContainerHigh,
    paddingHorizontal: Spacing.sm,
    paddingVertical: 6,
    borderRadius: BorderRadius.sm,
    gap: 4,
  },
  actionBtnTextOutline: {
    ...Typography.labelLg,
    fontWeight: '500',
    color: Colors.onSurfaceVariant,
  },
  deactivateBtn: {
    padding: 6,
    borderRadius: BorderRadius.sm,
    backgroundColor: '#FEE2E2',
    marginLeft: 'auto',
  },
  emptyState: {
    paddingVertical: Spacing.xl,
    alignItems: 'center',
    gap: Spacing.xs,
  },
  emptyTitle: {
    ...Typography.titleLg,
    fontWeight: '700',
    color: Colors.onBackground,
  },
  emptySubtitle: {
    ...Typography.bodyMd,
    color: Colors.onSurfaceVariant,
    textAlign: 'center',
    paddingHorizontal: Spacing.lg,
  },
  resetFilterBtn: {
    marginTop: Spacing.sm,
    backgroundColor: Colors.primaryContainer,
    paddingHorizontal: Spacing.md,
    paddingVertical: 8,
    borderRadius: BorderRadius.sm,
  },
  resetFilterBtnText: {
    ...Typography.labelLg,
    fontWeight: '600',
    color: Colors.primary,
  },
  paginationRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: Spacing.sm,
    paddingVertical: Spacing.sm,
  },
  pageBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: Spacing.sm,
    paddingVertical: 6,
    borderRadius: BorderRadius.sm,
    backgroundColor: Colors.surfaceContainerLow,
    borderWidth: 1,
    borderColor: Colors.surfaceContainerHigh,
  },
  pageBtnDisabled: {
    opacity: 0.4,
  },
  pageBtnText: {
    ...Typography.labelLg,
    fontWeight: '600',
    color: Colors.primary,
  },
  pageBtnTextDisabled: {
    color: Colors.outline,
  },
  pageInfoText: {
    ...Typography.bodyMd,
    color: Colors.onSurfaceVariant,
  },
  modalBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: Spacing.md,
  },
  detailModalCard: {
    backgroundColor: Colors.surface,
    borderRadius: BorderRadius.lg,
    width: '100%',
    maxHeight: '90%',
    padding: Spacing.md,
  },
  actionModalCard: {
    backgroundColor: Colors.surface,
    borderRadius: BorderRadius.lg,
    width: '100%',
    maxWidth: 400,
    padding: Spacing.lg,
  },
  modalHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: Spacing.sm,
  },
  modalTitle: {
    ...Typography.headlineLgMobile,
    fontWeight: '700',
    color: Colors.onBackground,
  },
  modalSubtitle: {
    ...Typography.bodyMd,
    color: Colors.onSurfaceVariant,
  },
  closeIconBtn: {
    padding: 4,
  },
  modalLoaderContainer: {
    paddingVertical: Spacing.xl,
    alignItems: 'center',
    gap: Spacing.sm,
  },
  modalBodyScroll: {
    maxHeight: 450,
  },
  detailProfileBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.surfaceContainerLow,
    padding: Spacing.md,
    borderRadius: BorderRadius.md,
    gap: Spacing.md,
    marginBottom: Spacing.sm,
  },
  detailAvatar: {
    width: 52,
    height: 52,
    borderRadius: 26,
    backgroundColor: Colors.primary,
    justifyContent: 'center',
    alignItems: 'center',
  },
  detailAvatarText: {
    fontSize: 22,
    fontWeight: '700',
    color: Colors.onPrimary,
  },
  detailMainInfo: {
    flex: 1,
  },
  detailName: {
    ...Typography.titleLg,
    fontWeight: '700',
    color: Colors.onBackground,
  },
  detailEmail: {
    ...Typography.bodyMd,
    color: Colors.onSurfaceVariant,
  },
  detailPhone: {
    ...Typography.bodyMd,
    color: Colors.outline,
    marginTop: 2,
  },
  badgesRow: {
    flexDirection: 'row',
    gap: Spacing.xs,
    marginBottom: Spacing.md,
  },
  roleBadgeLg: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: BorderRadius.full,
    gap: 4,
  },
  roleBadgeAdmin: {
    backgroundColor: '#D97706',
  },
  roleBadgeCustomer: {
    backgroundColor: '#0284C7',
  },
  roleBadgeLgText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#FFF',
  },
  statusBadgeLg: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: BorderRadius.full,
  },
  statusBadgeLgText: {
    fontSize: 12,
    fontWeight: '700',
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.xs,
    marginTop: Spacing.sm,
    marginBottom: Spacing.xs,
  },
  sectionHeaderText: {
    ...Typography.bodyLg,
    fontWeight: '700',
    color: Colors.onBackground,
  },
  summaryGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.xs,
    marginBottom: Spacing.md,
  },
  summaryBox: {
    flex: 1,
    minWidth: 130,
    backgroundColor: Colors.surfaceContainerLow,
    borderRadius: BorderRadius.sm,
    padding: Spacing.sm,
    borderWidth: 1,
    borderColor: Colors.surfaceContainerHigh,
  },
  summaryBoxLabel: {
    ...Typography.labelLg,
    color: Colors.onSurfaceVariant,
  },
  summaryBoxVal: {
    ...Typography.titleLg,
    fontWeight: '700',
    color: Colors.onBackground,
    marginTop: 2,
  },
  orderMgmtQuickBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.primaryContainer,
    paddingHorizontal: Spacing.sm,
    paddingVertical: 6,
    borderRadius: BorderRadius.sm,
    gap: 4,
    marginLeft: 'auto',
  },
  orderMgmtQuickBtnText: {
    ...Typography.labelLg,
    fontWeight: '700',
    color: Colors.primary,
  },
  ordersListContainer: {
    gap: Spacing.sm,
    marginBottom: Spacing.sm,
  },
  orderHistoryItem: {
    backgroundColor: Colors.surfaceContainerLow,
    borderRadius: BorderRadius.md,
    padding: Spacing.sm,
    borderWidth: 1,
    borderColor: Colors.surfaceContainerHigh,
  },
  orderItemHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 6,
  },
  orderHeaderLeft: {
    flex: 1,
  },
  orderHeaderRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  orderNumRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  orderNumberText: {
    ...Typography.labelLg,
    fontWeight: '700',
    color: Colors.primary,
  },
  orderDateText: {
    ...Typography.bodyMd,
    color: Colors.outline,
    marginTop: 1,
  },
  orderItemRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.xs,
  },
  orderStatusPill: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: BorderRadius.full,
  },
  orderPayPill: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: BorderRadius.full,
  },
  pillDelivered: {
    backgroundColor: '#DCFCE7',
  },
  pillShipped: {
    backgroundColor: '#E0F2FE',
  },
  pillCancelled: {
    backgroundColor: '#FEE2E2',
  },
  pillPending: {
    backgroundColor: '#FEF3C7',
  },
  pillPaid: {
    backgroundColor: '#DCFCE7',
  },
  pillRefunded: {
    backgroundColor: '#F3E8FF',
  },
  pillUnpaid: {
    backgroundColor: '#FEF3C7',
  },
  pillText: {
    fontSize: 10,
    fontWeight: '600',
    color: Colors.onSurface,
  },
  orderItemsCountText: {
    fontSize: 11,
    color: Colors.onSurfaceVariant,
    marginLeft: 'auto',
    fontWeight: '500',
  },
  orderTotalText: {
    ...Typography.labelLg,
    fontWeight: '700',
    color: Colors.onBackground,
  },
  orderCouponNote: {
    ...Typography.bodyMd,
    color: Colors.primary,
    marginTop: 4,
  },
  expandedOrderSection: {
    marginTop: Spacing.sm,
    paddingTop: Spacing.sm,
    borderTopWidth: 1,
    borderTopColor: Colors.surfaceContainerHigh,
    gap: Spacing.xs,
  },
  expandedSubHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginBottom: 4,
  },
  expandedSectionHeading: {
    ...Typography.labelLg,
    fontWeight: '700',
    color: Colors.onBackground,
  },
  expandedItemsList: {
    gap: 6,
  },
  productItemCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.surface,
    borderRadius: BorderRadius.sm,
    padding: Spacing.xs,
    borderWidth: 1,
    borderColor: Colors.surfaceContainerHigh,
    gap: Spacing.sm,
  },
  productThumb: {
    width: 44,
    height: 44,
    borderRadius: 6,
    backgroundColor: Colors.surfaceContainerHigh,
  },
  productInfoCol: {
    flex: 1,
  },
  productItemName: {
    ...Typography.bodyMd,
    fontWeight: '700',
    color: Colors.onBackground,
  },
  categoryTag: {
    alignSelf: 'flex-start',
    backgroundColor: Colors.surfaceContainerHigh,
    borderRadius: BorderRadius.full,
    paddingHorizontal: 6,
    paddingVertical: 1,
    marginTop: 2,
    marginBottom: 2,
  },
  categoryTagText: {
    fontSize: 9,
    fontWeight: '600',
    color: Colors.primary,
  },
  productItemQtyPrice: {
    fontSize: 11,
    color: Colors.onSurfaceVariant,
  },
  productItemTotal: {
    ...Typography.labelLg,
    fontWeight: '700',
    color: Colors.onBackground,
    paddingRight: Spacing.xs,
  },
  noItemsBox: {
    paddingVertical: 6,
  },
  noItemsText: {
    fontSize: 12,
    color: Colors.outline,
  },
  orderDetailInfoBox: {
    backgroundColor: Colors.surface,
    borderRadius: BorderRadius.sm,
    padding: Spacing.sm,
    borderWidth: 1,
    borderColor: Colors.surfaceContainerHigh,
    marginTop: 4,
  },
  infoBoxHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginBottom: 2,
  },
  infoBoxTitle: {
    fontSize: 11,
    fontWeight: '700',
    color: Colors.onBackground,
  },
  infoBoxText: {
    ...Typography.bodyMd,
    color: Colors.onSurfaceVariant,
  },
  financialSummaryCard: {
    backgroundColor: Colors.surface,
    borderRadius: BorderRadius.sm,
    padding: Spacing.sm,
    borderWidth: 1,
    borderColor: Colors.surfaceContainerHigh,
    marginTop: 4,
    gap: 3,
  },
  finRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  finLabel: {
    fontSize: 11,
    color: Colors.onSurfaceVariant,
  },
  finValue: {
    fontSize: 11,
    fontWeight: '600',
    color: Colors.onBackground,
  },
  finDivider: {
    height: 1,
    backgroundColor: Colors.surfaceContainerHigh,
    marginVertical: 3,
  },
  finGrandLabel: {
    ...Typography.labelLg,
    fontWeight: '700',
    color: Colors.onBackground,
  },
  finGrandValue: {
    ...Typography.titleLg,
    fontWeight: '700',
    color: Colors.primary,
  },
  razorpayBox: {
    backgroundColor: '#F0F9FF',
    borderRadius: BorderRadius.sm,
    padding: Spacing.sm,
    borderWidth: 1,
    borderColor: '#BAE6FD',
    marginTop: 4,
    gap: 2,
  },
  razorpayHeaderTitle: {
    fontSize: 11,
    fontWeight: '700',
    color: '#0284C7',
  },
  razorpayText: {
    fontSize: 11,
    color: '#0369A1',
  },
  razorpayLabel: {
    fontWeight: '600',
    color: '#0C4A6E',
  },
  fullOrderDetailsBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Colors.primaryContainer,
    paddingVertical: 8,
    borderRadius: BorderRadius.sm,
    gap: 6,
    marginTop: 6,
  },
  fullOrderDetailsBtnText: {
    ...Typography.labelLg,
    fontWeight: '700',
    color: Colors.primary,
  },
  modalPaginationRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: Spacing.xs,
  },
  smallPageBtn: {
    backgroundColor: Colors.surfaceContainerHigh,
    paddingHorizontal: Spacing.sm,
    paddingVertical: 4,
    borderRadius: BorderRadius.sm,
  },
  smallPageBtnText: {
    ...Typography.labelLg,
    fontWeight: '600',
    color: Colors.primary,
  },
  modalPageInfo: {
    ...Typography.labelLg,
    color: Colors.onSurfaceVariant,
  },
  emptyOrdersBox: {
    paddingVertical: Spacing.md,
    alignItems: 'center',
  },
  emptyOrdersText: {
    ...Typography.bodyMd,
    color: Colors.outline,
  },
  metadataBox: {
    backgroundColor: Colors.surfaceContainerLow,
    borderRadius: BorderRadius.sm,
    padding: Spacing.sm,
    marginTop: Spacing.sm,
    marginBottom: Spacing.sm,
    gap: 2,
  },
  metadataText: {
    fontSize: 10,
    color: Colors.outline,
  },
  modalBottomActions: {
    marginTop: Spacing.sm,
  },
  statusOptions: {
    gap: Spacing.xs,
    marginVertical: Spacing.md,
  },
  statusOptionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: Spacing.sm,
    borderRadius: BorderRadius.md,
    borderWidth: 1,
    borderColor: Colors.surfaceContainerHigh,
    backgroundColor: Colors.surfaceContainerLow,
    gap: Spacing.sm,
  },
  statusOptionRowSelected: {
    borderColor: Colors.primary,
    backgroundColor: Colors.primaryContainer,
  },
  statusOptionInfo: {
    flex: 1,
  },
  statusOptionTitle: {
    ...Typography.bodyLg,
    fontWeight: '700',
    color: Colors.onBackground,
  },
  statusOptionDesc: {
    ...Typography.bodyMd,
    color: Colors.onSurfaceVariant,
  },
  modalBtnRow: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: Spacing.sm,
    marginTop: Spacing.sm,
  },
  cancelBtn: {
    paddingHorizontal: Spacing.md,
    paddingVertical: 10,
    borderRadius: BorderRadius.sm,
  },
  cancelBtnText: {
    ...Typography.labelLg,
    color: Colors.onSurfaceVariant,
  },
  confirmBtn: {
    backgroundColor: Colors.primary,
    paddingHorizontal: Spacing.lg,
    paddingVertical: 10,
    borderRadius: BorderRadius.sm,
    minWidth: 100,
    alignItems: 'center',
  },
  confirmBtnText: {
    ...Typography.labelLg,
    fontWeight: '700',
    color: Colors.onPrimary,
  },
});

export default UserManagementScreen;
