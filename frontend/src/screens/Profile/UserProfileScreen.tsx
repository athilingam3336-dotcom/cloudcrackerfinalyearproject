import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Image,
  TouchableOpacity,
  Alert,
  Platform,
  Modal,
  Linking,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { MaterialIcons } from '@expo/vector-icons';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { Colors } from '@/constants/colors';
import { Typography } from '@/constants/typography';
import { Spacing, BorderRadius } from '@/constants/spacing';
import { HomeHeader } from '@/components/common/HomeHeader';
import { CLIENT_INFO } from '@/constants/clientInfo';
import { BottomNavBar, TabRoute } from '@/components/common/BottomNavBar';
import { RootStackParamList } from '@/navigation/types';
import { tokenStorage } from '@/storage/tokenStorage';
import { useAuthStore } from '@/store/authStore';
import { profileService } from '@/services/profileService';
import { aboutService, AboutData } from '@/services/aboutService';
import { sanitizeRemoteImageUrl } from '@/constants/productImages';

import { useSmartTabNavigation } from '@/hooks/useSmartTabNavigation';

type UserProfileScreenProps = NativeStackScreenProps<
  RootStackParamList,
  'UserProfile'
>;

export const UserProfileScreen: React.FC<UserProfileScreenProps> = ({
  navigation,
}) => {
  const { handleTabPress } = useSmartTabNavigation();
  const user = useAuthStore((state) => state.user);
  const updateProfile = useAuthStore((state) => state.updateProfile);
  const [isAboutModalVisible, setIsAboutModalVisible] = useState(false);
  const [aboutData, setAboutData] = useState<AboutData | null>(null);

  React.useEffect(() => {
    (async () => {
      try {
        const liveProfile = await profileService.getProfile();
        if (liveProfile) {
          updateProfile(liveProfile);
        }
      } catch (err) {
        // Use existing store profile on error
      }
    })();
  }, [updateProfile]);

  React.useEffect(() => {
    const fetchAbout = async () => {
      try {
        const data = await aboutService.getAbout();
        setAboutData(data);
      } catch (err) {
        // Safe fallback
      }
    };
    fetchAbout();
  }, [isAboutModalVisible]);

  const handleLogout = useCallback(async () => {
    const performSignout = async () => {
      await tokenStorage.clearTokens();
      useAuthStore.getState().logout();
      navigation.reset({
        index: 0,
        routes: [{ name: 'Login' }],
      });
    };

    if (Platform.OS === 'web') {
      const confirmed = window.confirm('Are you sure you want to sign out of Meera Crackers?');
      if (confirmed) {
        await performSignout();
      }
    } else {
      Alert.alert(
        'Sign Out',
        'Are you sure you want to sign out of Meera Crackers?',
        [
          { text: 'Cancel', style: 'cancel' },
          {
            text: 'Sign Out',
            style: 'destructive',
            onPress: performSignout,
          },
        ]
      );
    }
  }, [navigation]);



  const isAdmin = user?.role === 'admin';

  const menuItems = [
    {
      id: 'edit_profile',
      title: 'Edit Profile',
      subtitle: 'Update your personal details and avatar',
      icon: 'manage-accounts',
      badge: null,
      onPress: () => navigation.navigate('EditProfile'),
    },
    {
      id: 'orders',
      title: 'Order History',
      subtitle: 'View and track your previous purchases',
      icon: 'receipt-long',
      badge: null,
      onPress: () => navigation.navigate('OrderHistory'),
    },
    {
      id: 'wishlist',
      title: 'Wishlist',
      subtitle: 'Your curated collection of favorites',
      icon: 'favorite',
      badge: null,
      onPress: () => navigation.navigate('Wishlist'),
    },
    {
      id: 'notifications',
      title: 'Notifications',
      subtitle: 'Stay updated on sales and delivery',
      icon: 'notifications',
      badge: '3 NEW',
      onPress: () => navigation.navigate('Notifications'),
    },
    {
      id: 'store_location',
      title: 'Store Location & Contact',
      subtitle: `${CLIENT_INFO.primaryPhone} • ${CLIENT_INFO.email}`,
      icon: 'location-on',
      badge: 'MAP',
      onPress: () => Linking.openURL(CLIENT_INFO.locationMapUrl),
    },
    {
      id: 'about',
      title: 'About Meera Crackers',
      subtitle: 'Certified Sivakasi fireworks, wholesale & retail',
      icon: 'info',
      badge: aboutData?.version || 'v2.4.0',
      onPress: () => setIsAboutModalVisible(true),
    },
    {
      id: 'settings',
      title: 'Settings',
      subtitle: 'Security, Privacy, and Preferences',
      icon: 'settings',
      badge: null,
      onPress: () => navigation.navigate('Settings'),
    },
    ...(isAdmin
      ? [
          {
            id: 'admin_dashboard',
            title: 'Admin Dashboard',
            subtitle: 'System metrics and sales reporting',
            icon: 'dashboard',
            badge: 'ADMIN',
            onPress: () => navigation.navigate('AdminDashboard'),
          },
          {
            id: 'user_management',
            title: 'Customer Management',
            subtitle: 'User accounts, RBAC permissions & order metrics',
            icon: 'people',
            badge: 'ADMIN',
            onPress: () => navigation.navigate('UserManagement'),
          },
          {
            id: 'coupon_management',
            title: 'Coupon Campaigns',
            subtitle: 'Promo codes, discount rules & usage tracking',
            icon: 'local-offer',
            badge: 'ADMIN',
            onPress: () => navigation.navigate('CouponManagement'),
          },
          {
            id: 'inventory_management',
            title: 'Inventory Control',
            subtitle: 'Stock monitoring, thresholds & audit trail logs',
            icon: 'inventory',
            badge: 'ADMIN',
            onPress: () => navigation.navigate('InventoryManagement'),
          },
          {
            id: 'product_management',
            title: 'Product Catalog',
            subtitle: 'Manage pyrotechnic products, pricing & discounts',
            icon: 'inventory-2',
            badge: 'ADMIN',
            onPress: () => navigation.navigate('ProductManagement'),
          },
          {
            id: 'category_management',
            title: 'Category Catalog',
            subtitle: 'Manage categories, descriptions & banner media',
            icon: 'category',
            badge: 'ADMIN',
            onPress: () => navigation.navigate('CategoryManagement'),
          },
          {
            id: 'order_management',
            title: 'Order Operations',
            subtitle: 'Manage order status, tracking & customer orders',
            icon: 'receipt-long',
            badge: 'ADMIN',
            onPress: () => navigation.navigate('OrderManagement'),
          },
        ]
      : []),
  ];

  const displayName = user?.name || 'Explorer';
  const displayEmail = user?.email || 'Meeracrackers@gmail.com';
  const displayMembership = isAdmin ? 'Administrator' : (user?.membership || 'Standard Member');
  const userInitial = displayName.charAt(0).toUpperCase();

  return (
    <SafeAreaView style={styles.safeArea} edges={['top', 'left', 'right']}>
      <HomeHeader
        onBackPress={() => (navigation.canGoBack() ? navigation.goBack() : navigation.navigate('Home'))}
        onNotificationPress={() => navigation.navigate('Notifications')}
        onProfilePress={() => {}}
        onCartPress={() => navigation.navigate('Cart')}
        notificationCount={3}
        userName={displayName.split(' ')[0]}
      />

      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        {/* Profile Hero Card */}
        <View style={styles.profileHeroCard}>
          <TouchableOpacity
            style={styles.avatarContainer}
            activeOpacity={0.85}
            onPress={() => navigation.navigate('EditProfile')}
          >
            {(() => {
              const safeAvatar = sanitizeRemoteImageUrl(user?.avatarUrl);
              return safeAvatar ? (
                <Image
                  source={{ uri: safeAvatar }}
                  style={styles.avatarImage}
                  resizeMode="cover"
                />
              ) : (
                <View style={styles.avatarPlaceholder}>
                  <Text style={styles.avatarInitial}>{userInitial}</Text>
                </View>
              );
            })()}
            <View style={styles.editAvatarBtn}>
              <MaterialIcons name="edit" size={14} color="#ffffff" />
            </View>
          </TouchableOpacity>

          <View style={styles.profileInfo}>
            <Text style={styles.userName}>{displayName}</Text>
            <Text style={styles.userEmail}>{displayEmail}</Text>

            <View style={styles.memberBadgesRow}>
              <View style={isAdmin ? styles.adminBadgeContainer : styles.goldBadge}>
                <Text style={isAdmin ? styles.adminBadgeText : styles.goldBadgeText}>
                  {displayMembership}
                </Text>
              </View>
              <View style={styles.orderBadge}>
                <Text style={styles.orderBadgeText}>{user?.ordersCount ?? 0} Orders</Text>
              </View>
            </View>
          </View>
        </View>

        {/* Menu Options Grid */}
        <View style={styles.menuContainer}>
          {menuItems.map((item) => (
            <TouchableOpacity
              key={item.id}
              style={styles.menuCard}
              onPress={item.onPress}
              activeOpacity={0.8}
            >
              <View style={styles.menuIconBox}>
                <MaterialIcons name={item.icon as any} size={22} color={Colors.primary} />
              </View>

              <View style={styles.menuTextContent}>
                <Text style={styles.menuTitle}>{item.title}</Text>
                <Text style={styles.menuSubtitle}>{item.subtitle}</Text>
              </View>

              {item.badge ? (
                <View
                  style={[
                    styles.itemBadge,
                    item.badge === 'ADMIN' ? styles.adminBadge : styles.newBadge,
                  ]}
                >
                  <Text style={styles.itemBadgeText}>{item.badge}</Text>
                </View>
              ) : (
                <MaterialIcons name="chevron-right" size={22} color={Colors.tertiary} />
              )}
            </TouchableOpacity>
          ))}

          {/* Logout Action Card */}
          <TouchableOpacity style={styles.logoutCard} onPress={handleLogout} activeOpacity={0.8}>
            <View style={styles.logoutIconBox}>
              <MaterialIcons name="logout" size={22} color={Colors.error} />
            </View>
            <Text style={styles.logoutText}>Sign Out Account</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>

      <BottomNavBar activeTab="Profile" onTabPress={handleTabPress} />

      {/* About CloudCrackers Dialog Modal */}
      <Modal
        visible={isAboutModalVisible}
        transparent
        animationType="fade"
        onRequestClose={() => setIsAboutModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalCard}>
            <View style={styles.modalHeader}>
              <View style={styles.modalIconBox}>
                <MaterialIcons name="auto-awesome" size={24} color={Colors.primary} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.modalTitleText}>About Meera Crackers</Text>
                <Text style={styles.modalSubtitleText}>
                  {(aboutData?.version || 'v2.4.0') + ' • ' + (aboutData?.description || 'Meera Crackers World')}
                </Text>
              </View>
            </View>

            <ScrollView style={styles.modalScrollView} showsVerticalScrollIndicator={false}>
              {aboutData && aboutData.sections && aboutData.sections.length > 0 ? (
                aboutData.sections.map((section, idx) => (
                  <View key={idx} style={idx > 0 ? { marginTop: 12 } : undefined}>
                    <Text style={styles.modalSectionTitle}>{section.title}</Text>
                    <Text style={styles.modalBodyText}>{section.content}</Text>
                  </View>
                ))
              ) : (
                <>
                  <Text style={styles.modalSectionTitle}>🎆 Who We Are</Text>
                  <Text style={styles.modalBodyText}>
                    Meera Crackers World is your premier platform for 100% legal, Sivakasi-manufactured green crackers and professional pyrotechnics. Happy & Safety Guarantee for all your celebrations.
                  </Text>

                  <Text style={[styles.modalSectionTitle, { marginTop: 12 }]}>📍 Contact & Store Location</Text>
                  <Text style={styles.modalBodyText}>
                    Email: Meeracrackers@gmail.com | Phone: 7339624431, 94421 72314, 96268 24431{"\n"}
                    Lic No: E/SC/TN/24/685 (E 54389){"\n"}
                    Location: https://maps.app.goo.gl/6BE5qX4vxyutrkAD6?g_st=aw
                  </Text>

                  <Text style={[styles.modalSectionTitle, { marginTop: 12 }]}>🛡️ Safe & Compliant</Text>
                  <Text style={styles.modalBodyText}>
                    All our products strictly adhere to Supreme Court safety norms and NEERI green cracker formulations with reduced emissions and zero harmful heavy metals.
                  </Text>
                </>
              )}
            </ScrollView>

            <TouchableOpacity
              style={styles.modalCloseBtn}
              onPress={() => setIsAboutModalVisible(false)}
              activeOpacity={0.8}
            >
              <Text style={styles.modalCloseBtnText}>Close</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
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
  profileHeroCard: {
    marginHorizontal: Spacing.marginMobile,
    marginTop: Spacing.sm,
    backgroundColor: Colors.surfaceContainerLowest,
    borderRadius: BorderRadius.xl,
    padding: Spacing.lg,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: Colors.surfaceContainerHigh,
    shadowColor: Colors.shadowColor,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.06,
    shadowRadius: 10,
    elevation: 3,
  },
  avatarContainer: {
    position: 'relative',
    marginBottom: Spacing.sm,
  },
  avatarImage: {
    width: 100,
    height: 100,
    borderRadius: BorderRadius.full,
    borderWidth: 3,
    borderColor: Colors.primaryFixed,
  },
  avatarPlaceholder: {
    width: 100,
    height: 100,
    borderRadius: BorderRadius.full,
    backgroundColor: Colors.primaryFixed,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 3,
    borderColor: Colors.primary,
  },
  avatarInitial: {
    fontSize: 40,
    fontFamily: 'Inter-Bold',
    color: Colors.primary,
  },
  editAvatarBtn: {
    position: 'absolute',
    bottom: 2,
    right: 2,
    width: 28,
    height: 28,
    borderRadius: BorderRadius.full,
    backgroundColor: Colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
    elevation: 4,
    zIndex: 10,
  },
  profileInfo: {
    alignItems: 'center',
  },
  userName: {
    ...Typography.headlineLg,
    fontSize: 22,
    fontFamily: 'Inter-Bold',
    color: Colors.onSurface,
  },
  userEmail: {
    ...Typography.bodyMd,
    fontSize: 13,
    color: Colors.onSurfaceVariant,
    marginTop: 2,
  },
  memberBadgesRow: {
    flexDirection: 'row',
    gap: Spacing.xs,
    marginTop: Spacing.sm,
  },
  goldBadge: {
    backgroundColor: Colors.secondaryContainer,
    paddingHorizontal: Spacing.sm,
    paddingVertical: 4,
    borderRadius: BorderRadius.full,
  },
  goldBadgeText: {
    ...Typography.labelLg,
    fontSize: 10,
    fontFamily: 'Inter-Bold',
    color: Colors.onSecondaryContainer,
    textTransform: 'uppercase',
  },
  adminBadgeContainer: {
    backgroundColor: Colors.primary,
    paddingHorizontal: Spacing.sm,
    paddingVertical: 4,
    borderRadius: BorderRadius.full,
  },
  adminBadgeText: {
    ...Typography.labelLg,
    fontSize: 10,
    fontFamily: 'Inter-Bold',
    color: '#ffffff',
    textTransform: 'uppercase',
  },
  orderBadge: {
    backgroundColor: Colors.surfaceContainerHigh,
    paddingHorizontal: Spacing.sm,
    paddingVertical: 4,
    borderRadius: BorderRadius.full,
  },
  orderBadgeText: {
    ...Typography.labelLg,
    fontSize: 10,
    fontFamily: 'Inter-Bold',
    color: Colors.onSurfaceVariant,
    textTransform: 'uppercase',
  },
  menuContainer: {
    paddingHorizontal: Spacing.marginMobile,
    marginTop: Spacing.md,
    gap: Spacing.xs,
  },
  menuCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.surfaceContainerLowest,
    borderRadius: BorderRadius.xl,
    padding: Spacing.md,
    borderWidth: 1,
    borderColor: Colors.surfaceContainerHigh,
    gap: Spacing.sm,
  },
  menuIconBox: {
    width: 44,
    height: 44,
    borderRadius: BorderRadius.lg,
    backgroundColor: Colors.primaryFixed,
    alignItems: 'center',
    justifyContent: 'center',
  },
  menuTextContent: {
    flex: 1,
  },
  menuTitle: {
    ...Typography.titleLg,
    fontSize: 15,
    fontFamily: 'Inter-Bold',
    color: Colors.onSurface,
  },
  menuSubtitle: {
    ...Typography.bodyMd,
    fontSize: 12,
    color: Colors.onSurfaceVariant,
    marginTop: 2,
  },
  itemBadge: {
    paddingHorizontal: Spacing.xs,
    paddingVertical: 3,
    borderRadius: BorderRadius.full,
  },
  newBadge: {
    backgroundColor: Colors.primary,
  },
  adminBadge: {
    backgroundColor: Colors.secondary,
  },
  itemBadgeText: {
    ...Typography.labelLg,
    fontSize: 9,
    fontFamily: 'Inter-Bold',
    color: '#ffffff',
  },
  logoutCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.errorContainer,
    borderRadius: BorderRadius.xl,
    padding: Spacing.md,
    marginTop: Spacing.sm,
    gap: Spacing.sm,
  },
  logoutIconBox: {
    width: 44,
    height: 44,
    borderRadius: BorderRadius.lg,
    backgroundColor: '#ffffff',
    alignItems: 'center',
    justifyContent: 'center',
  },
  logoutText: {
    ...Typography.titleLg,
    fontSize: 15,
    fontFamily: 'Inter-Bold',
    color: Colors.error,
  },
  editBadge: {
    position: 'absolute',
    bottom: 0,
    right: 0,
    backgroundColor: Colors.primary,
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: Colors.surface,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.65)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: Spacing.md,
  },
  modalCard: {
    width: '100%',
    maxWidth: 520,
    backgroundColor: Colors.surfaceContainerLowest,
    borderRadius: BorderRadius.xl,
    padding: Spacing.lg,
    maxHeight: '85%',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.25,
    shadowRadius: 20,
    elevation: 10,
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    marginBottom: Spacing.md,
    paddingBottom: Spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: Colors.surfaceContainerHigh,
  },
  modalIconBox: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: Colors.primaryFixed,
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalTitleText: {
    ...Typography.headlineLg,
    fontSize: 18,
    fontFamily: 'Inter-Bold',
    color: Colors.onSurface,
  },
  modalSubtitleText: {
    ...Typography.bodyMd,
    fontSize: 12,
    color: Colors.tertiary,
    fontFamily: 'Inter-Medium',
  },
  modalScrollView: {
    marginBottom: Spacing.lg,
  },
  modalSectionTitle: {
    ...Typography.titleLg,
    fontSize: 14,
    fontFamily: 'Inter-Bold',
    color: Colors.primary,
    marginBottom: 4,
  },
  modalBodyText: {
    ...Typography.bodyLg,
    fontSize: 13,
    color: Colors.onSurfaceVariant,
    lineHeight: 20,
  },
  modalCloseBtn: {
    backgroundColor: Colors.primary,
    paddingVertical: Spacing.md,
    borderRadius: BorderRadius.lg,
    alignItems: 'center',
  },
  modalCloseBtnText: {
    ...Typography.labelLg,
    color: '#ffffff',
    fontFamily: 'Inter-Bold',
    fontSize: 14,
  },
});

export default UserProfileScreen;
