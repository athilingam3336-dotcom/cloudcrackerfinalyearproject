import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Image } from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { Colors } from '@/constants/colors';
import { Typography } from '@/constants/typography';
import { Spacing, BorderRadius } from '@/constants/spacing';
import { useAuthStore } from '@/store/authStore';
import { sanitizeRemoteImageUrl } from '@/constants/productImages';

interface HomeHeaderProps {
  onNotificationPress: () => void;
  onProfilePress: () => void;
  onCartPress: () => void;
  notificationCount?: number;
  userName?: string;
  avatarUrl?: string;
}

export const HomeHeader: React.FC<HomeHeaderProps> = React.memo(
  ({
    onNotificationPress,
    onProfilePress,
    onCartPress,
    notificationCount = 3,
    userName = 'Explorer',
    avatarUrl,
  }) => {
    const user = useAuthStore((state) => state.user);
    const activeAvatar = sanitizeRemoteImageUrl(avatarUrl || user?.avatarUrl);

    return (
      <View style={styles.header}>
        <View style={styles.leftSection}>
          <Text style={styles.brandTitle}>CloudCrackers</Text>
          <Text style={styles.greetingText}>Welcome back, {userName}</Text>
        </View>

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
    paddingVertical: Spacing.sm,
    backgroundColor: Colors.surface,
    borderBottomWidth: 1,
    borderBottomColor: Colors.surfaceContainerHigh,
  },
  leftSection: {
    flex: 1,
  },
  brandTitle: {
    ...Typography.titleLg,
    fontFamily: 'Inter-Bold',
    color: Colors.primary,
    letterSpacing: -0.5,
  },
  greetingText: {
    ...Typography.bodyMd,
    fontFamily: 'Inter-Regular',
    color: Colors.tertiary,
    marginTop: 2,
  },
  rightSection: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.xs,
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
