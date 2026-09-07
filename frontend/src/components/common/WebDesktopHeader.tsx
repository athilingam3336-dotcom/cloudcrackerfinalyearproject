import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Image, Linking } from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { Colors } from '@/constants/colors';
import { Typography } from '@/constants/typography';
import { Spacing, BorderRadius } from '@/constants/spacing';
import { useAuthStore } from '@/store/authStore';
import { sanitizeRemoteImageUrl, LOCAL_PRODUCT_IMAGES } from '@/constants/productImages';
import { CLIENT_INFO } from '@/constants/clientInfo';
import { MAX_CONTENT_WIDTH } from '@/constants/responsive';

import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { RootStackParamList } from '@/navigation/types';
import { useSmartTabNavigation } from '@/hooks/useSmartTabNavigation';
import { TabRoute } from '@/components/common/BottomNavBar';

export interface WebDesktopHeaderProps {
  onNotificationPress: () => void;
  onProfilePress: () => void;
  onCartPress: () => void;
  onWishlistPress?: () => void;
  onBackPress?: () => void;
  onLogoPress?: () => void;
  onNavigateTab?: (tab: string) => void;
  notificationCount?: number;
  userName?: string;
  avatarUrl?: string;
}

export const WebDesktopHeader: React.FC<WebDesktopHeaderProps> = React.memo(
  ({
    onNotificationPress,
    onProfilePress,
    onCartPress,
    onWishlistPress,
    onBackPress,
    onLogoPress,
    onNavigateTab,
    notificationCount = 0,
    userName,
    avatarUrl,
  }) => {
    const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
    const { handleTabPress } = useSmartTabNavigation();
    const user = useAuthStore((state) => state.user);
    const activeUserName = userName || (user?.name ? user.name.split(' ')[0] : 'Account');
    const activeAvatar = sanitizeRemoteImageUrl(avatarUrl || user?.avatarUrl);
    const isAdmin = user?.role === 'admin' || (user as any)?.isAdmin;

    const handleNav = (tab: string) => {
      if (onNavigateTab) {
        onNavigateTab(tab);
      } else if (tab === 'AdminDashboard') {
        navigation.navigate('AdminDashboard');
      } else if (tab === 'Home') {
        navigation.navigate('Home');
      } else if (tab === 'Categories') {
        navigation.navigate('Categories');
      } else if (tab === 'Wishlist') {
        navigation.navigate('Wishlist');
      } else if (tab === 'Cart') {
        navigation.navigate('Cart');
      } else {
        handleTabPress(tab as TabRoute);
      }
    };

    const handleLogo = onLogoPress || (() => navigation.navigate('Home'));

    return (
      <View style={styles.webHeaderWrapper}>
        {/* Top Announcement Bar */}
        <View style={styles.announcementBar}>
          <View style={styles.announcementInner}>
            <View style={styles.announcementLeft}>
              <MaterialIcons name="local-shipping" size={15} color="#FFD700" />
              <Text style={styles.announcementText}>
                Direct Sivakasi Factory Prices | Express Delivery Across Tamil Nadu & All India
              </Text>
            </View>
            <View style={styles.announcementRight}>
              <TouchableOpacity
                style={styles.announcementLink}
                onPress={() => Linking.openURL(CLIENT_INFO.locationMapUrl)}
              >
                <MaterialIcons name="place" size={13} color="#FFD700" />
                <Text style={styles.announcementLinkText}>Store Map 📍</Text>
              </TouchableOpacity>
              <Text style={styles.announcementDivider}>|</Text>
              <TouchableOpacity
                style={styles.announcementLink}
                onPress={() => Linking.openURL(`mailto:${CLIENT_INFO.email}`)}
              >
                <MaterialIcons name="email" size={13} color="#60A5FA" />
                <Text style={styles.announcementLinkText}>{CLIENT_INFO.email}</Text>
              </TouchableOpacity>
              <Text style={styles.announcementDivider}>|</Text>
              <TouchableOpacity
                style={styles.announcementLink}
                onPress={() => Linking.openURL(`tel:${CLIENT_INFO.primaryPhone}`)}
              >
                <MaterialIcons name="phone" size={13} color="#FFFFFF" />
                <Text style={styles.announcementLinkText}>Call: {CLIENT_INFO.primaryPhone}</Text>
              </TouchableOpacity>
              <Text style={styles.announcementDivider}>|</Text>
              <TouchableOpacity
                style={styles.announcementLink}
                onPress={() => Linking.openURL(`https://wa.me/${CLIENT_INFO.primaryPhone}`)}
              >
                <MaterialIcons name="chat" size={13} color="#25D366" />
                <Text style={styles.announcementLinkText}>WhatsApp Order</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>

        {/* Main Desktop Header Bar */}
        <View style={styles.mainHeaderBar}>
          <View style={styles.mainHeaderInner}>
            {/* Left: Brand Logo & Title */}
            <TouchableOpacity style={styles.brandContainer} onPress={handleLogo} activeOpacity={0.8}>
              <Image source={LOCAL_PRODUCT_IMAGES.LOGO} style={styles.logoImage} resizeMode="contain" />
              <View style={styles.brandTitleBox}>
                <View style={styles.brandTitleRow}>
                  <Text style={styles.brandTitleText}>MEERA CRACKERS</Text>
                  <MaterialIcons name="auto-awesome" size={15} color="#D97706" />
                </View>
                <Text style={styles.brandSubtitleText}>Sivakasi Pyrotechnics Store</Text>
              </View>
            </TouchableOpacity>

            {/* Desktop Navigation Links */}
            <View style={styles.navLinksRow}>
              <TouchableOpacity style={styles.navLinkBtn} onPress={() => handleNav('Home')}>
                <Text style={styles.navLinkText}>Home</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.navLinkBtn} onPress={() => handleNav('Categories')}>
                <Text style={styles.navLinkText}>Categories</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.navLinkBtn} onPress={() => handleNav('Wishlist')}>
                <Text style={styles.navLinkText}>Wishlist</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.navLinkBtn} onPress={() => handleNav('Cart')}>
                <Text style={styles.navLinkText}>Cart</Text>
              </TouchableOpacity>
              {isAdmin && (
                <TouchableOpacity
                  style={[styles.navLinkBtn, styles.adminBadgeBtn]}
                  onPress={() => handleNav('AdminDashboard')}
                >
                  <MaterialIcons name="admin-panel-settings" size={16} color={Colors.primary} />
                  <Text style={[styles.navLinkText, { color: Colors.primary, fontFamily: 'Inter-Bold' }]}>
                    Admin Panel
                  </Text>
                </TouchableOpacity>
              )}
            </View>

            {/* Right Action Icons */}
            <View style={styles.rightActionsRow}>
              <TouchableOpacity style={styles.actionIconBtn} onPress={onNotificationPress} activeOpacity={0.7}>
                <MaterialIcons name="notifications-none" size={22} color={Colors.onSurface} />
                {notificationCount > 0 && (
                  <View style={styles.badgeCircle}>
                    <Text style={styles.badgeText}>{notificationCount}</Text>
                  </View>
                )}
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.actionIconBtn}
                onPress={onWishlistPress || (() => handleNav('Wishlist'))}
                activeOpacity={0.7}
              >
                <MaterialIcons name="favorite-border" size={22} color={Colors.onSurface} />
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.cartActionBtn}
                onPress={onCartPress || (() => handleNav('Cart'))}
                activeOpacity={0.8}
              >
                <MaterialIcons name="shopping-cart" size={20} color="#FFFFFF" />
                <Text style={styles.cartBtnText}>Cart</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.userProfileBtn}
                onPress={onProfilePress || (() => navigation.navigate('UserProfile'))}
                activeOpacity={0.8}
              >
                {activeAvatar ? (
                  <Image source={{ uri: activeAvatar }} style={styles.avatarImg} />
                ) : (
                  <View style={styles.avatarPlaceholder}>
                    <MaterialIcons name="person" size={18} color={Colors.primary} />
                  </View>
                )}
                <Text style={styles.userNameText} numberOfLines={1}>
                  {activeUserName}
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </View>
    );
  }
);

const styles = StyleSheet.create({
  webHeaderWrapper: {
    width: '100%',
    backgroundColor: Colors.surface,
    borderBottomWidth: 1,
    borderBottomColor: Colors.surfaceContainerHigh,
    elevation: 3,
  },
  announcementBar: {
    backgroundColor: '#990000',
    paddingVertical: 6,
    width: '100%',
  },
  announcementInner: {
    maxWidth: MAX_CONTENT_WIDTH,
    width: '100%',
    alignSelf: 'center',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: Spacing.md,
  },
  announcementLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  announcementText: {
    ...Typography.labelLg,
    fontSize: 11.5,
    color: '#FFFFFF',
    fontFamily: 'Inter-Medium',
  },
  announcementRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.md,
  },
  announcementLink: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  announcementLinkText: {
    ...Typography.labelLg,
    fontSize: 11,
    color: '#FFFFFF',
    fontFamily: 'Inter-Bold',
  },
  announcementDivider: {
    color: 'rgba(255, 255, 255, 0.4)',
    fontSize: 11,
  },
  mainHeaderBar: {
    paddingVertical: Spacing.sm + 2,
    width: '100%',
  },
  mainHeaderInner: {
    maxWidth: MAX_CONTENT_WIDTH,
    width: '100%',
    alignSelf: 'center',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: Spacing.md,
  },
  brandContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.xs + 2,
  },
  logoImage: {
    width: 44,
    height: 44,
    borderRadius: 22,
    overflow: 'hidden',
  },
  brandTitleBox: {
    justifyContent: 'center',
  },
  brandTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  brandTitleText: {
    ...Typography.headlineLg,
    fontSize: 19,
    fontFamily: 'Inter-Bold',
    color: Colors.primary,
    letterSpacing: 0.5,
  },
  brandSubtitleText: {
    ...Typography.bodyMd,
    fontSize: 11,
    color: Colors.onSurfaceVariant,
  },
  navLinksRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.md,
  },
  navLinkBtn: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: BorderRadius.md,
  },
  navLinkText: {
    ...Typography.titleLg,
    fontSize: 14,
    fontFamily: 'Inter-SemiBold',
    color: Colors.onSurface,
  },
  adminBadgeBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: Colors.primaryFixed,
    paddingHorizontal: 12,
  },
  rightActionsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm + 2,
  },
  actionIconBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: Colors.surfaceContainerLow,
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
  },
  badgeCircle: {
    position: 'absolute',
    top: -2,
    right: -2,
    backgroundColor: Colors.primary,
    minWidth: 16,
    height: 16,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 4,
  },
  badgeText: {
    color: '#FFFFFF',
    fontSize: 9.5,
    fontFamily: 'Inter-Bold',
  },
  cartActionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: Colors.primary,
    paddingHorizontal: Spacing.md,
    paddingVertical: 8,
    borderRadius: BorderRadius.full,
  },
  cartBtnText: {
    ...Typography.labelLg,
    color: '#FFFFFF',
    fontSize: 13,
    fontFamily: 'Inter-Bold',
  },
  userProfileBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: Colors.surfaceContainerLow,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: BorderRadius.full,
    borderWidth: 1,
    borderColor: Colors.surfaceContainerHigh,
  },
  avatarImg: {
    width: 28,
    height: 28,
    borderRadius: 14,
  },
  avatarPlaceholder: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: Colors.primaryContainer,
    alignItems: 'center',
    justifyContent: 'center',
  },
  userNameText: {
    ...Typography.titleLg,
    fontSize: 13,
    fontFamily: 'Inter-Bold',
    color: Colors.onSurface,
    maxWidth: 90,
  },
  backHeaderBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: BorderRadius.md,
    backgroundColor: Colors.surfaceContainerLow,
    borderWidth: 1,
    borderColor: Colors.surfaceContainerHigh,
    marginRight: 10,
  },
  backHeaderBtnText: {
    ...Typography.labelLg,
    color: Colors.primary,
    fontSize: 13,
    fontFamily: 'Inter-Bold',
  },
});

export default WebDesktopHeader;
