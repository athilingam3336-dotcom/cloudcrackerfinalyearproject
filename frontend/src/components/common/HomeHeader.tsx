import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Image, Platform, Linking, useWindowDimensions } from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { Colors } from '@/constants/colors';
import { Typography } from '@/constants/typography';
import { BorderRadius, Spacing } from '@/constants/spacing';
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
      <View style={styles.headerContainer}>
        {/* Main Header Bar (Logo, Title, Actions) */}
        <View style={styles.headerMainRow}>
          {/* Left Section: Back Button & Meera Crackers Logo + Title */}
          <View style={styles.leftSection}>
            {onBackPress && (
              <TouchableOpacity
                style={[styles.backCircleButton, isSmallScreen && styles.backCircleButtonSmall]}
                onPress={onBackPress}
                activeOpacity={0.7}
                accessibilityLabel="Go back"
                accessibilityRole="button"
              >
                <MaterialIcons name="arrow-back" size={isSmallScreen ? 18 : 22} color={Colors.primary} />
              </TouchableOpacity>
            )}

            <TouchableOpacity
              style={styles.leftBrandTouch}
              onPress={onLogoPress}
              activeOpacity={onLogoPress ? 0.7 : 1}
              disabled={!onLogoPress}
            >
              <Image
                source={LOCAL_PRODUCT_IMAGES.LOGO}
                style={[styles.headerShopLogo, isSmallScreen && styles.headerShopLogoSmall]}
                resizeMode="contain"
              />
              <View style={styles.titleContainer}>
                <View style={styles.brandTitleRow}>
                  <Text
                    style={[
                      styles.brandTitle,
                      isSmallScreen && { fontSize: 15, lineHeight: 19 },
                    ]}
                    numberOfLines={1}
                    ellipsizeMode="tail"
                  >
                    MEERA CRACKERS
                  </Text>
                  <MaterialIcons name="auto-awesome" size={13} color="#D97706" style={styles.sparkleIcon} />
                </View>
                <Text style={styles.greetingText} numberOfLines={1} ellipsizeMode="tail">
                  Welcome back, <Text style={styles.greetingUserName}>{activeUserName}</Text>
                </Text>
              </View>
            </TouchableOpacity>
          </View>

          {/* Right Section: Contact Action Pills (Desktop) & Icon Buttons */}
          <View style={styles.rightSection}>
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

            <TouchableOpacity
              style={[styles.iconCircleButton, isSmallScreen && styles.iconCircleButtonSmall]}
              onPress={onNotificationPress}
              activeOpacity={0.7}
              accessibilityLabel="Notifications"
              accessibilityRole="button"
            >
              <MaterialIcons
                name="notifications-none"
                size={isSmallScreen ? 20 : 22}
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
              style={[styles.iconCircleButton, isSmallScreen && styles.iconCircleButtonSmall]}
              onPress={onCartPress}
              activeOpacity={0.7}
              accessibilityLabel="Shopping Cart"
              accessibilityRole="button"
            >
              <MaterialIcons
                name="shopping-bag"
                size={isSmallScreen ? 20 : 22}
                color={Colors.onBackground}
              />
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.avatarButton, isSmallScreen && styles.avatarButtonSmall]}
              onPress={onProfilePress}
              activeOpacity={0.7}
              accessibilityLabel="User Profile"
              accessibilityRole="button"
            >
              {activeAvatar ? (
                <Image
                  source={{ uri: activeAvatar }}
                  style={[styles.avatarImg, isSmallScreen && styles.avatarImgSmall]}
                  resizeMode="cover"
                />
              ) : (
                <View style={[styles.avatarInner, isSmallScreen && styles.avatarInnerSmall]}>
                  <MaterialIcons name="person" size={isSmallScreen ? 18 : 20} color={Colors.primary} />
                </View>
              )}
            </TouchableOpacity>
          </View>
        </View>

        {/* Mobile Contact Strip: Phone, Email & Map Location buttons */}
        {isSmallScreen && (
          <View style={styles.mobileContactStrip}>
            <TouchableOpacity
              style={styles.mobileContactChip}
              onPress={() => Linking.openURL(`tel:${CLIENT_INFO.primaryPhone}`)}
              activeOpacity={0.7}
            >
              <MaterialIcons name="call" size={13} color="#B30000" />
              <Text style={styles.mobileContactChipText}>{CLIENT_INFO.primaryPhone}</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.mobileContactChip}
              onPress={() => Linking.openURL(`mailto:${CLIENT_INFO.email}`)}
              activeOpacity={0.7}
            >
              <MaterialIcons name="email" size={13} color="#B30000" />
              <Text style={styles.mobileContactChipText}>Email Us</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.mobileContactChip, styles.mobileMapChip]}
              onPress={() => Linking.openURL(CLIENT_INFO.locationMapUrl)}
              activeOpacity={0.7}
            >
              <MaterialIcons name="location-on" size={13} color="#B45309" />
              <Text style={styles.mobileMapChipText}>Map Location</Text>
            </TouchableOpacity>
          </View>
        )}
      </View>
    );
  }
);

const styles = StyleSheet.create({
  headerContainer: {
    backgroundColor: Colors.surface,
    borderBottomWidth: 1,
    borderBottomColor: Colors.surfaceContainerHigh,
    width: '100%',
  },
  headerMainRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: Spacing.xs,
    paddingVertical: 6,
    minHeight: 60,
    width: '100%',
  },
  leftSection: {
    flex: 1,
    flexShrink: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-start',
    marginRight: 6,
    overflow: 'hidden',
  },
  leftBrandTouch: {
    flex: 1,
    flexShrink: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-start',
    gap: 6,
    overflow: 'hidden',
  },
  backCircleButton: {
    width: 36,
    height: 36,
    borderRadius: BorderRadius.full,
    backgroundColor: Colors.surfaceContainerLow,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 4,
    flexShrink: 0,
  },
  backCircleButtonSmall: {
    width: 32,
    height: 32,
    marginRight: 2,
  },
  headerShopLogo: {
    width: 52,
    height: 52,
    borderRadius: 26,
    flexShrink: 0,
  },
  headerShopLogoSmall: {
    width: 42,
    height: 42,
    borderRadius: 21,
  },
  titleContainer: {
    flex: 1,
    flexShrink: 1,
    alignItems: 'flex-start',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  brandTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-start',
    gap: 4,
    maxWidth: '100%',
  },
  brandTitle: {
    fontSize: 20,
    lineHeight: 24,
    fontFamily: Platform.OS === 'web' ? "'Cinzel Decorative', 'Cinzel', 'Playfair Display', Georgia, serif" : 'Cinzel-ExtraBold',
    fontWeight: '900',
    color: '#A81818',
    letterSpacing: 0.5,
    textAlign: 'left',
  },
  sparkleIcon: {
    marginTop: -1,
  },
  greetingText: {
    fontSize: 11,
    lineHeight: 14,
    fontFamily: Platform.OS === 'web' ? "'Outfit', 'Poppins', sans-serif" : 'Outfit-Medium',
    fontWeight: '500',
    color: '#64748B',
    marginTop: 1,
    textAlign: 'left',
    letterSpacing: 0.1,
    maxWidth: '100%',
  },
  greetingUserName: {
    fontFamily: Platform.OS === 'web' ? "'Outfit', 'Poppins', sans-serif" : 'Outfit-Bold',
    fontWeight: '700',
    color: '#1E293B',
    textTransform: 'capitalize',
  },
  rightSection: {
    flexShrink: 0,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-end',
    gap: 5,
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
  mobileContactStrip: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-around',
    paddingHorizontal: Spacing.xs,
    paddingVertical: 6,
    backgroundColor: '#FFF9F9',
    borderTopWidth: 1,
    borderTopColor: '#FEE2E2',
    gap: 4,
  },
  mobileContactChip: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
    backgroundColor: '#FFF0F0',
    paddingHorizontal: 6,
    paddingVertical: 5,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#FECDD3',
  },
  mobileContactChipText: {
    fontSize: 11,
    fontFamily: 'Inter-Bold',
    color: '#B30000',
  },
  mobileMapChip: {
    backgroundColor: '#FEF3C7',
    borderColor: '#FDE68A',
  },
  mobileMapChipText: {
    fontSize: 11,
    fontFamily: 'Inter-Bold',
    color: '#B45309',
  },
  iconCircleButton: {
    width: 38,
    height: 38,
    borderRadius: BorderRadius.full,
    backgroundColor: Colors.surfaceContainerLow,
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
    flexShrink: 0,
  },
  iconCircleButtonSmall: {
    width: 34,
    height: 34,
  },
  badge: {
    position: 'absolute',
    top: -2,
    right: -2,
    backgroundColor: Colors.primary,
    borderRadius: 10,
    minWidth: 16,
    height: 16,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 3,
    borderWidth: 1.5,
    borderColor: Colors.surface,
  },
  badgeText: {
    ...Typography.labelLg,
    color: '#ffffff',
    fontSize: 9,
    fontFamily: 'Inter-Bold',
    lineHeight: 11,
  },
  avatarButton: {
    width: 38,
    height: 38,
    borderRadius: BorderRadius.full,
    backgroundColor: Colors.primaryFixed,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: Colors.primary,
    overflow: 'hidden',
    flexShrink: 0,
  },
  avatarButtonSmall: {
    width: 34,
    height: 34,
  },
  avatarImg: {
    width: 34,
    height: 34,
    borderRadius: BorderRadius.full,
  },
  avatarImgSmall: {
    width: 30,
    height: 30,
    borderRadius: BorderRadius.full,
  },
  avatarInner: {
    width: 30,
    height: 30,
    borderRadius: BorderRadius.full,
    backgroundColor: Colors.surfaceContainerLowest,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarInnerSmall: {
    width: 26,
    height: 26,
  },
});

export default HomeHeader;
