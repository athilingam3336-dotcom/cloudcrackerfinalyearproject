import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Image, Platform, Linking, useWindowDimensions } from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { Colors } from '@/constants/colors';
import { Typography } from '@/constants/typography';
import { Spacing, BorderRadius } from '@/constants/spacing';
import { useAuthStore } from '@/store/authStore';
import { sanitizeRemoteImageUrl, LOCAL_PRODUCT_IMAGES } from '@/constants/productImages';
import { CLIENT_INFO } from '@/constants/clientInfo';

interface HomeHeaderProps {
  onNotificationPress: () => void;
  onProfilePress: () => void;
  onCartPress: () => void;
  onBackPress?: () => void;
  onLogoPress?: () => void;
  notificationCount?: number;
  userName?: string;
  avatarUrl?: string;
}

export const HomeHeader: React.FC<HomeHeaderProps> = React.memo(
  ({
    onNotificationPress,
    onProfilePress,
    onCartPress,
    onBackPress,
    onLogoPress,
    notificationCount = 3,
    userName,
    avatarUrl,
  }) => {
    const user = useAuthStore((state) => state.user);
    const activeUserName = userName || (user?.name ? user.name.split(' ')[0] : 'Explorer');
    const activeAvatar = sanitizeRemoteImageUrl(avatarUrl || user?.avatarUrl);
    const { width } = useWindowDimensions();
    const isSmallScreen = width < 640;

    return (
      <View style={styles.header}>
        {/* Left Section: Back Button & Quick Contact Actions */}
        <View style={styles.leftSection}>
          {onBackPress && (
            <TouchableOpacity
              style={styles.backCircleButton}
              onPress={onBackPress}
              activeOpacity={0.7}
              accessibilityLabel="Go back"
              accessibilityRole="button"
            >
              <MaterialIcons name="arrow-back" size={22} color={Colors.primary} />
            </TouchableOpacity>
          )}

          {!isSmallScreen && (
            <View style={styles.headerContactPillsRow}>
              <TouchableOpacity
                style={styles.headerContactChip}
                onPress={() => Linking.openURL(`tel:${CLIENT_INFO.primaryPhone}`)}
                activeOpacity={0.7}
              >
                <MaterialIcons name="call" size={14} color="#B30000" />
                <Text style={styles.headerContactChipText}>{CLIENT_INFO.primaryPhone}</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.headerContactChip}
                onPress={() => Linking.openURL(`mailto:${CLIENT_INFO.email}`)}
                activeOpacity={0.7}
              >
                <MaterialIcons name="email" size={14} color="#B30000" />
                <Text style={styles.headerContactChipText}>Email Us</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.headerContactChip, styles.headerMapChip]}
                onPress={() => Linking.openURL(CLIENT_INFO.locationMapUrl)}
                activeOpacity={0.7}
              >
                <MaterialIcons name="location-on" size={14} color="#B45309" />
                <Text style={styles.headerMapChipText}>Map Location</Text>
              </TouchableOpacity>
            </View>
          )}
        </View>

        {/* Center Section: Grand Brand Emblem Logo & Title */}
        <View style={styles.centerSection}>
          <TouchableOpacity
            style={styles.centerBrandTouch}
            onPress={onLogoPress}
            activeOpacity={onLogoPress ? 0.7 : 1}
            disabled={!onLogoPress}
          >
            <Image
              source={LOCAL_PRODUCT_IMAGES.LOGO}
              style={styles.headerShopLogo}
              resizeMode="contain"
            />
            <View style={styles.titleContainer}>
              <View style={styles.brandTitleRow}>
                <Text
                  style={[
                    styles.brandTitle,
                    isSmallScreen && { fontSize: 18, lineHeight: 22 },
                  ]}
                  numberOfLines={1}
                >
                  MEERA CRACKERS
                </Text>
                <MaterialIcons name="auto-awesome" size={15} color="#D97706" style={styles.sparkleIcon} />
              </View>
              <Text style={styles.greetingText} numberOfLines={1}>
                Welcome back, <Text style={styles.greetingUserName}>{activeUserName}</Text>
              </Text>
            </View>
          </TouchableOpacity>
        </View>

        {/* Right Section: Action Buttons */}
        <View style={styles.rightSection}>
          <TouchableOpacity
            style={styles.iconCircleButton}
            onPress={onNotificationPress}
            activeOpacity={0.7}
            accessibilityLabel="Notifications"
            accessibilityRole="button"
          >
            <MaterialIcons
              name="notifications-none"
              size={22}
              color={Colors.onBackground}
            />
            {notificationCount > 0 && (
              <View style={styles.badge}>
                <Text style={styles.badgeText}>
                  {notificationCount > 9 ? '9+' : notificationCount}
                </Text>
              </View>
            )}
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.iconCircleButton}
            onPress={onCartPress}
            activeOpacity={0.7}
            accessibilityLabel="Shopping Cart"
            accessibilityRole="button"
          >
            <MaterialIcons
              name="shopping-bag"
              size={22}
              color={Colors.onBackground}
            />
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.avatarButton}
            onPress={onProfilePress}
            activeOpacity={0.7}
            accessibilityLabel="User Profile"
            accessibilityRole="button"
          >
            {activeAvatar ? (
              <Image
                source={{ uri: activeAvatar }}
                style={styles.avatarImg}
                resizeMode="cover"
              />
            ) : (
              <View style={styles.avatarInner}>
                <MaterialIcons name="person" size={20} color={Colors.primary} />
              </View>
            )}
          </TouchableOpacity>
        </View>
      </View>
    );
  }
);

const styles = StyleSheet.create({
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: Spacing.marginMobile,
    paddingVertical: Spacing.xs,
    backgroundColor: Colors.surface,
    borderBottomWidth: 1,
    borderBottomColor: Colors.surfaceContainerHigh,
    minHeight: 74,
  },
  leftSection: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-start',
  },
  centerSection: {
    flex: 2,
    alignItems: 'center',
    justifyContent: 'center',
  },
  centerBrandTouch: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 12,
  },
  backCircleButton: {
    width: 38,
    height: 38,
    borderRadius: BorderRadius.full,
    backgroundColor: Colors.surfaceContainerLow,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 6,
  },
  headerShopLogo: {
    width: 64,
    height: 64,
    borderRadius: 32,
  },
  titleContainer: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  brandTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
  },
  brandTitle: {
    fontSize: 26,
    lineHeight: 32,
    fontFamily: Platform.OS === 'web' ? "'Cinzel Decorative', 'Cinzel', 'Playfair Display', Georgia, serif" : 'Cinzel-ExtraBold',
    fontWeight: '900',
    color: '#A81818',
    letterSpacing: 1.0,
    textAlign: 'center',
  },
  sparkleIcon: {
    marginTop: -2,
  },
  greetingText: {
    fontSize: 12,
    lineHeight: 16,
    fontFamily: Platform.OS === 'web' ? "'Outfit', 'Poppins', sans-serif" : 'Outfit-Medium',
    fontWeight: '500',
    color: '#64748B',
    marginTop: 2,
    textAlign: 'center',
    letterSpacing: 0.2,
  },
  greetingUserName: {
    fontFamily: Platform.OS === 'web' ? "'Outfit', 'Poppins', sans-serif" : 'Outfit-Bold',
    fontWeight: '700',
    color: '#1E293B',
    textTransform: 'capitalize',
  },
  rightSection: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-end',
    gap: Spacing.xs,
    flexShrink: 0,
  },
  headerContactPillsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginRight: 6,
  },
  headerContactChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#FFF5F5',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#FECDD3',
  },
  headerContactChipText: {
    fontSize: 11,
    fontFamily: 'Inter-Bold',
    color: '#B30000',
  },
  headerMapChip: {
    backgroundColor: '#FEF3C7',
    borderColor: '#FDE68A',
  },
  headerMapChipText: {
    fontSize: 11,
    fontFamily: 'Inter-Bold',
    color: '#B45309',
  },
  iconCircleButton: {
    width: 40,
    height: 40,
    borderRadius: BorderRadius.full,
    backgroundColor: Colors.surfaceContainerLow,
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
  },
  badge: {
    position: 'absolute',
    top: 4,
    right: 4,
    backgroundColor: Colors.primary,
    borderRadius: 10,
    minWidth: 16,
    height: 16,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 3,
  },
  badgeText: {
    ...Typography.labelLg,
    color: '#ffffff',
    fontSize: 9,
    fontFamily: 'Inter-Bold',
  },
  avatarButton: {
    width: 40,
    height: 40,
    borderRadius: BorderRadius.full,
    backgroundColor: Colors.primaryFixed,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: Colors.primary,
    overflow: 'hidden',
  },
  avatarImg: {
    width: 36,
    height: 36,
    borderRadius: BorderRadius.full,
  },
  avatarInner: {
    width: 32,
    height: 32,
    borderRadius: BorderRadius.full,
    backgroundColor: Colors.surfaceContainerLowest,
    alignItems: 'center',
    justifyContent: 'center',
  },
});

export default HomeHeader;
