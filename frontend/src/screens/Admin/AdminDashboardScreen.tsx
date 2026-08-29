import React, { useCallback, useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  RefreshControl,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { MaterialIcons } from '@expo/vector-icons';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { Colors } from '@/constants/colors';
import { Typography } from '@/constants/typography';
import { Spacing, BorderRadius } from '@/constants/spacing';
import { HomeHeader } from '@/components/common/HomeHeader';
import { BottomNavBar, TabRoute } from '@/components/common/BottomNavBar';
import { RootStackParamList } from '@/navigation/types';
import { adminService, AdminMetrics } from '@/services/adminService';
import { useNotificationStore } from '@/store';
import { formatCurrency } from '@/utils/currency';

type AdminDashboardScreenProps = NativeStackScreenProps<
  RootStackParamList,
  'AdminDashboard'
>;

export const AdminDashboardScreen: React.FC<AdminDashboardScreenProps> = ({
  navigation,
}) => {
  const [metrics, setMetrics] = useState<AdminMetrics>({
    totalRevenue: 0.0,
    newOrders: 0,
    productsInStock: 0,
    totalUsers: 0,
    revenueGrowth: '+0.0%',
    ordersGrowth: '+0.0%',
    usersGrowth: '+0.0%',
    recentOrders: [],
  });
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const unreadNotifs = useNotificationStore((state) => state.getUnreadCount());

  const loadMetrics = useCallback(async () => {
    try {
      const data = await adminService.getOverviewMetrics();
      setMetrics(data);
    } catch (err) {
      console.warn('Error fetching overview metrics:', err);
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  }, []);

  useEffect(() => {
    loadMetrics();
  }, [loadMetrics]);

  const onRefresh = useCallback(() => {
    setIsRefreshing(true);
    loadMetrics();
  }, [loadMetrics]);

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

  return (
    <SafeAreaView style={styles.safeArea} edges={['top', 'left', 'right']}>
      <HomeHeader
        onBackPress={() => (navigation.canGoBack() ? navigation.goBack() : navigation.navigate('Home'))}
        onNotificationPress={() => navigation.navigate('Notifications')}
        onProfilePress={() => navigation.navigate('UserProfile')}
        onCartPress={() => navigation.navigate('Cart')}
        notificationCount={unreadNotifs}
      />

      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={isRefreshing}
            onRefresh={onRefresh}
            colors={[Colors.primary]}
            tintColor={Colors.primary}
          />
        }
      >
        <View style={styles.titleSection}>
          <Text style={styles.title}>Admin Overview</Text>
          <Text style={styles.subtitle}>
            Real-time pyrotechnics sales metrics and system control.
          </Text>
        </View>

        {isLoading && !isRefreshing ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color={Colors.primary} />
            <Text style={styles.loadingText}>Fetching live metrics from MongoDB Atlas...</Text>
          </View>
        ) : (
          /* Stats Bento Grid */
          <View style={styles.statsGrid}>
            <View style={styles.statCard}>
              <View style={styles.statHeader}>
                <View style={styles.iconCircle}>
                  <MaterialIcons name="currency-rupee" size={20} color={Colors.primary} />
                </View>

                <View style={styles.trendBadge}>
                  <Text style={styles.trendText}>{metrics.revenueGrowth || '+0.0%'}</Text>
                </View>
              </View>
              <Text style={styles.statLabel}>TOTAL REVENUE</Text>
              <Text style={styles.statValue}>{formatCurrency(metrics.totalRevenue)}</Text>
            </View>

            <View style={styles.statCard}>
              <View style={styles.statHeader}>
                <View style={[styles.iconCircle, { backgroundColor: Colors.secondaryContainer }]}>
                  <MaterialIcons name="shopping-bag" size={20} color={Colors.onSecondaryContainer} />
                </View>

                <View style={styles.trendBadge}>
                  <Text style={styles.trendText}>{metrics.ordersGrowth || '+0.0%'}</Text>
                </View>
              </View>
              <Text style={styles.statLabel}>TOTAL ORDERS</Text>
              <Text style={styles.statValue}>{metrics.newOrders}</Text>
            </View>

            <View style={styles.statCard}>
              <View style={styles.statHeader}>
                <View style={[styles.iconCircle, { backgroundColor: Colors.primaryFixed }]}>
                  <MaterialIcons name="inventory-2" size={20} color={Colors.primary} />
                </View>

                <View style={[styles.trendBadge, { backgroundColor: Colors.surfaceContainerHigh }]}>
                  <Text style={[styles.trendText, { color: Colors.tertiary }]}>Catalog</Text>
                </View>
              </View>
              <Text style={styles.statLabel}>PRODUCTS IN STOCK</Text>
              <Text style={styles.statValue}>{metrics.productsInStock} Items</Text>
            </View>

            <View style={styles.statCard}>
              <View style={styles.statHeader}>
                <View style={[styles.iconCircle, { backgroundColor: Colors.surfaceContainerHigh }]}>
                  <MaterialIcons name="people" size={20} color={Colors.onSurface} />
                </View>

                <View style={styles.trendBadge}>
                  <Text style={styles.trendText}>{metrics.usersGrowth || '+0.0%'}</Text>
                </View>
              </View>
              <Text style={styles.statLabel}>TOTAL USERS</Text>
              <Text style={styles.statValue}>{metrics.totalUsers}</Text>
            </View>
          </View>
        )}

        {/* Quick Admin Actions */}
        <View style={styles.sectionContainer}>
          <Text style={styles.sectionTitle}>Quick Management Actions</Text>
          <View style={styles.actionsRow}>
            <TouchableOpacity
              style={styles.actionButton}
              onPress={() => navigation.navigate('UserManagement')}
              activeOpacity={0.8}
            >
              <MaterialIcons name="people" size={24} color={Colors.primary} />
              <Text style={styles.actionButtonText}>Customers</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.actionButton}
              onPress={() => navigation.navigate('CouponManagement')}
              activeOpacity={0.8}
            >
              <MaterialIcons name="local-offer" size={24} color={Colors.primary} />
              <Text style={styles.actionButtonText}>Coupons</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.actionButton}
              onPress={() => navigation.navigate('InventoryManagement')}
              activeOpacity={0.8}
            >
              <MaterialIcons name="inventory" size={24} color={Colors.primary} />
              <Text style={styles.actionButtonText}>Inventory</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.actionButton}
              onPress={() => navigation.navigate('ProductManagement')}
              activeOpacity={0.8}
            >
              <MaterialIcons name="inventory-2" size={24} color={Colors.primary} />
              <Text style={styles.actionButtonText}>Products</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.actionButton}
              onPress={() => navigation.navigate('CategoryManagement')}
              activeOpacity={0.8}
            >
              <MaterialIcons name="category" size={24} color={Colors.primary} />
              <Text style={styles.actionButtonText}>Categories</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.actionButton}
              onPress={() => navigation.navigate('OrderManagement')}
              activeOpacity={0.8}
            >
              <MaterialIcons name="receipt-long" size={24} color={Colors.primary} />
              <Text style={styles.actionButtonText}>Orders</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.actionButton}
              onPress={() => navigation.navigate('AboutManagement')}
              activeOpacity={0.8}
            >
              <MaterialIcons name="info" size={24} color={Colors.primary} />
              <Text style={styles.actionButtonText}>About Us</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Recent Orders Feed */}
        <View style={styles.sectionContainer}>
          <View style={styles.sectionHeaderRow}>
            <Text style={styles.sectionTitle}>Recent Orders Activity</Text>
            <TouchableOpacity onPress={() => navigation.navigate('OrderManagement')} activeOpacity={0.7}>
              <Text style={styles.viewAllText}>View All</Text>
            </TouchableOpacity>
          </View>
          <View style={styles.feedCard}>
            {metrics.recentOrders && metrics.recentOrders.length > 0 ? (
              metrics.recentOrders.map((ord, idx) => (
                <TouchableOpacity
                  key={ord.id}
                  style={[styles.feedRow, idx > 0 && styles.feedRowBorder]}
                  onPress={() => navigation.navigate('OrderDetails', { orderId: ord.id })}
                  activeOpacity={0.7}
                >
                  <View style={styles.feedLeft}>
                    <Text style={styles.feedUser}>{ord.customerName}</Text>
                    <Text style={styles.feedItem}>
                      {ord.itemName} • {ord.orderNumber}
                    </Text>
                  </View>
                  <View style={styles.feedRight}>
                    <Text style={styles.feedAmount}>{formatCurrency(ord.amount)}</Text>
                    <Text
                      style={[
                        styles.feedStatus,
                        (ord.status || '').toLowerCase() === 'delivered'
                          ? styles.statusDelivered
                          : (ord.status || '').toLowerCase() === 'cancelled'
                          ? styles.statusCancelled
                          : ['shipped', 'in transit'].includes((ord.status || '').toLowerCase())
                          ? styles.statusShipped
                          : styles.statusPending,
                      ]}
                    >
                      {ord.status}
                    </Text>
                  </View>
                </TouchableOpacity>
              ))
            ) : (
              <View style={styles.emptyFeed}>
                <MaterialIcons name="receipt-long" size={28} color={Colors.tertiary} />
                <Text style={styles.emptyFeedText}>No recent orders recorded yet.</Text>
              </View>
            )}
          </View>
        </View>
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
  },
  titleSection: {
    paddingHorizontal: Spacing.marginMobile,
    marginTop: Spacing.sm,
    marginBottom: Spacing.xs,
  },
  title: {
    ...Typography.headlineLg,
    fontSize: 26,
    fontFamily: 'Inter-Bold',
    color: Colors.onSurface,
  },
  subtitle: {
    ...Typography.bodyMd,
    fontSize: 13,
    color: Colors.onSurfaceVariant,
    marginTop: 2,
  },
  statsGrid: {
    paddingHorizontal: Spacing.marginMobile,
    marginTop: Spacing.md,
    gap: Spacing.sm,
  },
  statCard: {
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
  statHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: Spacing.xs,
  },
  iconCircle: {
    width: 36,
    height: 36,
    borderRadius: BorderRadius.lg,
    backgroundColor: Colors.primaryFixed,
    alignItems: 'center',
    justifyContent: 'center',
  },
  trendBadge: {
    backgroundColor: Colors.secondaryContainer,
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: BorderRadius.full,
  },
  trendText: {
    ...Typography.labelLg,
    fontSize: 10,
    fontFamily: 'Inter-Bold',
    color: Colors.onSecondaryContainer,
  },
  statLabel: {
    ...Typography.labelLg,
    fontSize: 10,
    fontFamily: 'Inter-Bold',
    color: Colors.tertiary,
    marginTop: 4,
  },
  statValue: {
    ...Typography.headlineLg,
    fontSize: 22,
    fontFamily: 'Inter-Bold',
    color: Colors.onSurface,
    marginTop: 2,
  },
  sectionContainer: {
    paddingHorizontal: Spacing.marginMobile,
    marginTop: Spacing.lg,
  },
  sectionTitle: {
    ...Typography.titleLg,
    fontSize: 16,
    fontFamily: 'Inter-Bold',
    color: Colors.onSurface,
    marginBottom: Spacing.xs,
  },
  actionsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.sm,
  },
  actionButton: {
    flexBasis: '30%',
    flexGrow: 1,
    minWidth: 95,
    backgroundColor: Colors.surfaceContainerLowest,
    borderRadius: BorderRadius.xl,
    paddingVertical: Spacing.md,
    paddingHorizontal: Spacing.xs,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: Colors.surfaceContainerHigh,
    gap: 6,
    shadowColor: Colors.shadowColor,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 6,
    elevation: 1,
  },
  actionButtonText: {
    ...Typography.labelLg,
    fontSize: 11,
    fontFamily: 'Inter-Bold',
    color: Colors.onSurface,
    textAlign: 'center',
  },
  sectionHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: Spacing.xs,
  },
  viewAllText: {
    ...Typography.labelLg,
    fontSize: 12,
    fontFamily: 'Inter-Bold',
    color: Colors.primary,
  },
  feedCard: {
    backgroundColor: Colors.surfaceContainerLowest,
    borderRadius: BorderRadius.xl,
    padding: Spacing.md,
    borderWidth: 1,
    borderColor: Colors.surfaceContainerHigh,
  },
  feedRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: Spacing.xs + 2,
  },
  feedRowBorder: {
    borderTopWidth: 1,
    borderTopColor: Colors.surfaceContainerHigh,
  },
  feedLeft: {
    flex: 1,
  },
  feedUser: {
    ...Typography.titleLg,
    fontSize: 14,
    fontFamily: 'Inter-Bold',
    color: Colors.onSurface,
  },
  feedItem: {
    ...Typography.bodyMd,
    fontSize: 12,
    color: Colors.onSurfaceVariant,
    marginTop: 2,
  },
  feedRight: {
    alignItems: 'flex-end',
  },
  feedAmount: {
    ...Typography.titleLg,
    fontSize: 14,
    fontFamily: 'Inter-Bold',
    color: Colors.primary,
  },
  feedStatus: {
    ...Typography.labelLg,
    fontSize: 9,
    fontFamily: 'Inter-Bold',
    color: Colors.secondary,
    marginTop: 2,
  },
  statusDelivered: {
    color: '#2E7D32',
  },
  statusCancelled: {
    color: '#D32F2F',
  },
  statusShipped: {
    color: '#0288D1',
  },
  statusPending: {
    color: '#ED6C02',
  },
  emptyFeed: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: Spacing.lg,
    gap: Spacing.xs,
  },
  emptyFeedText: {
    ...Typography.bodyMd,
    fontSize: 13,
    color: Colors.tertiary,
  },
  loadingContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: Spacing.xl,
    gap: Spacing.sm,
  },
  loadingText: {
    ...Typography.bodyMd,
    fontSize: 13,
    color: Colors.onSurfaceVariant,
  },
});

export default AdminDashboardScreen;
