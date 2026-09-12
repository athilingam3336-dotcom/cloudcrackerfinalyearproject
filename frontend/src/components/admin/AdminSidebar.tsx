import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
} from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { Spacing, BorderRadius } from '@/constants/spacing';

export type AdminNavTab =
  | 'Dashboard'
  | 'Orders'
  | 'Products'
  | 'Categories'
  | 'Customers'
  | 'Inventory'
  | 'Coupons'
  | 'Delivery'
  | 'Reports'
  | 'Settings';

interface AdminSidebarProps {
  activeTab: AdminNavTab;
  onSelectTab: (tab: AdminNavTab) => void;
  pendingOrdersCount?: number;
  onCloseMobileDrawer?: () => void;
}

const NAV_ITEMS: { id: AdminNavTab; label: string; icon: string; badgeKey?: string }[] = [
  { id: 'Dashboard', label: 'Dashboard', icon: 'dashboard' },
  { id: 'Orders', label: 'Orders', icon: 'receipt-long', badgeKey: 'orders' },
  { id: 'Products', label: 'Products', icon: 'inventory-2' },
  { id: 'Categories', label: 'Categories', icon: 'category' },
  { id: 'Customers', label: 'Customers', icon: 'people' },
  { id: 'Inventory', label: 'Inventory', icon: 'inventory' },
  { id: 'Coupons', label: 'Coupons', icon: 'local-offer' },
  { id: 'Delivery', label: 'Delivery', icon: 'local-shipping' },
  { id: 'Reports', label: 'Reports', icon: 'insert-chart' },
  { id: 'Settings', label: 'Settings', icon: 'settings' },
];

export const AdminSidebar: React.FC<AdminSidebarProps> = ({
  activeTab,
  onSelectTab,
  pendingOrdersCount = 12,
  onCloseMobileDrawer,
}) => {
  return (
    <View style={styles.sidebarContainer}>
      {/* BRAND HEADER */}
      <View style={styles.brandHeader}>
        <View style={styles.logoBadge}>
          <Text style={styles.logoText}>🎆</Text>
        </View>
        <View style={{ flex: 1 }}>
          <Text style={styles.brandTitle} numberOfLines={1}>
            MEERA CRACKERS
          </Text>
          <Text style={styles.brandSubtitle} numberOfLines={1}>
            Sivakasi Pyrotechnics Store
          </Text>
        </View>
      </View>

      {/* NAVIGATION ITEMS */}
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.navListContent}
      >
        {NAV_ITEMS.map((item) => {
          const isActive = activeTab === item.id;
          return (
            <TouchableOpacity
              key={item.id}
              style={[styles.navItem, isActive && styles.navItemActive]}
              onPress={() => {
                onSelectTab(item.id);
                if (onCloseMobileDrawer) onCloseMobileDrawer();
              }}
              activeOpacity={0.75}
            >
              <MaterialIcons
                name={item.icon as any}
                size={20}
                color={isActive ? '#FFFFFF' : '#94A3B8'}
              />
              <Text style={[styles.navItemText, isActive && styles.navItemTextActive]}>
                {item.label}
              </Text>
              {item.badgeKey === 'orders' && pendingOrdersCount > 0 && (
                <View style={styles.badgePill}>
                  <Text style={styles.badgeText}>{pendingOrdersCount}</Text>
                </View>
              )}
            </TouchableOpacity>
          );
        })}
      </ScrollView>

      {/* BOTTOM FIREWORKS PROMO BANNER */}
      <View style={styles.sidebarBottomBanner}>
        <View style={styles.bannerSparkles}>
          <MaterialIcons name="auto-awesome" size={24} color="#FACC15" />
          <MaterialIcons name="brightness-high" size={20} color="#FB923C" />
        </View>
        <Text style={styles.bannerTitle}>Safe Crackers</Text>
        <Text style={styles.bannerSubtitle}>Happy Moments</Text>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  sidebarContainer: {
    width: 240,
    backgroundColor: '#0F172A', // Dark Navy theme matching Image 1
    height: '100%',
    paddingVertical: Spacing.md,
    paddingHorizontal: Spacing.sm,
    justifyContent: 'space-between',
    borderRightWidth: 1,
    borderRightColor: '#1E293B',
  },
  brandHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: Spacing.sm,
    paddingBottom: Spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: '#1E293B',
    marginBottom: Spacing.sm,
    gap: 10,
  },
  logoBadge: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#E11D48',
    alignItems: 'center',
    justifyContent: 'center',
  },
  logoText: {
    fontSize: 18,
  },
  brandTitle: {
    color: '#FFFFFF',
    fontFamily: 'Inter-Bold',
    fontSize: 13.5,
    letterSpacing: 0.5,
  },
  brandSubtitle: {
    color: '#94A3B8',
    fontFamily: 'Inter-Regular',
    fontSize: 10.5,
    marginTop: 1,
  },
  navListContent: {
    paddingVertical: Spacing.xs,
    gap: 4,
  },
  navItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderRadius: BorderRadius.lg,
    gap: 12,
  },
  navItemActive: {
    backgroundColor: '#E11D48', // Red highlight pill matching Image 1
  },
  navItemText: {
    flex: 1,
    color: '#94A3B8',
    fontFamily: 'Inter-Medium',
    fontSize: 13,
  },
  navItemTextActive: {
    color: '#FFFFFF',
    fontFamily: 'Inter-Bold',
  },
  badgePill: {
    backgroundColor: '#E11D48',
    paddingHorizontal: 7,
    paddingVertical: 2,
    borderRadius: BorderRadius.full,
  },
  badgeText: {
    color: '#FFFFFF',
    fontFamily: 'Inter-Bold',
    fontSize: 10,
  },
  sidebarBottomBanner: {
    marginTop: Spacing.md,
    backgroundColor: '#1E1B4B',
    borderRadius: BorderRadius.xl,
    padding: Spacing.md,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#312E81',
  },
  bannerSparkles: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 6,
  },
  bannerTitle: {
    color: '#FFFFFF',
    fontFamily: 'Inter-Bold',
    fontSize: 13.5,
    textAlign: 'center',
  },
  bannerSubtitle: {
    color: '#F43F5E',
    fontFamily: 'Inter-SemiBold',
    fontSize: 11.5,
    marginTop: 2,
    textAlign: 'center',
  },
});

export default AdminSidebar;
