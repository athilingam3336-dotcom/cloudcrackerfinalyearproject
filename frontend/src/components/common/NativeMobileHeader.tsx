import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Image } from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { Colors } from '@/constants/colors';
import { Typography } from '@/constants/typography';
import { Spacing } from '@/constants/spacing';
import { useAuthStore } from '@/store/authStore';
import { LOCAL_PRODUCT_IMAGES } from '@/constants/productImages';

import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { RootStackParamList } from '@/navigation/types';

import { useCartStore } from '@/store/cartStore';

export interface NativeMobileHeaderProps {
  onNotificationPress: () => void;
  onProfilePress: () => void;
  onCartPress: () => void;
  onBackPress?: () => void;
  onLogoPress?: () => void;
  notificationCount?: number;
}

export const NativeMobileHeader: React.FC<NativeMobileHeaderProps> = React.memo(
  ({
    onNotificationPress,
    onProfilePress,
    onCartPress,
    onBackPress,
    onLogoPress,
    notificationCount = 0,
  }) => {
    const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
    const user = useAuthStore((state) => state.user);
    const cartCount = useCartStore((state) => state.getItemCount());
    const activeUserName = user?.name ? user.name.split(' ')[0] : 'Explorer';
    const handleLogo = onLogoPress || (() => navigation.navigate('Home'));

    return (
      <View style={styles.container}>
        <View style={styles.leftRow}>
          {onBackPress && (
            <TouchableOpacity style={styles.backBtn} onPress={onBackPress} activeOpacity={0.7}>
              <MaterialIcons name="arrow-back" size={22} color={Colors.primary} />
            </TouchableOpacity>
          )}

          <TouchableOpacity style={styles.brandTouch} onPress={handleLogo} activeOpacity={0.8}>
            <Image source={LOCAL_PRODUCT_IMAGES.LOGO} style={styles.logo} resizeMode="contain" />
            <View>
              <Text style={styles.title} numberOfLines={1}>
                MEERA CRACKERS
              </Text>
              <Text style={styles.subtitle} numberOfLines={1}>
                Hi, {activeUserName} 👋
              </Text>
            </View>
          </TouchableOpacity>
        </View>

        <View style={styles.rightRow}>
          <TouchableOpacity
            style={styles.iconBtn}
            onPress={onNotificationPress || (() => navigation.navigate('Notifications'))}
            activeOpacity={0.7}
          >
            <MaterialIcons name="notifications-none" size={24} color={Colors.onSurface} />
            {notificationCount > 0 && (
              <View style={styles.badge}>
                <Text style={styles.badgeText}>{notificationCount}</Text>
              </View>
            )}
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.iconBtn}
            onPress={onCartPress || (() => navigation.navigate('Cart'))}
            activeOpacity={0.7}
          >
            <MaterialIcons name="shopping-cart" size={24} color={Colors.primary} />
            {cartCount > 0 && (
              <View style={styles.badge}>
                <Text style={styles.badgeText}>{cartCount}</Text>
              </View>
            )}
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.iconBtn}
            onPress={onProfilePress || (() => navigation.navigate('UserProfile'))}
            activeOpacity={0.7}
          >
            <MaterialIcons name="person-outline" size={24} color={Colors.onSurface} />
          </TouchableOpacity>
        </View>
      </View>
    );
  }
);

const styles = StyleSheet.create({
  container: {
    height: 56,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: Spacing.sm,
    backgroundColor: Colors.surface,
    borderBottomWidth: 1,
    borderBottomColor: Colors.surfaceContainerHigh,
    width: '100%',
  },
  leftRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  backBtn: {
    width: 36,
    height: 36,
    alignItems: 'center',
    justifyContent: 'center',
  },
  brandTouch: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  logo: {
    width: 34,
    height: 34,
    borderRadius: 17,
    overflow: 'hidden',
  },
  title: {
    ...Typography.titleLg,
    fontSize: 15,
    fontFamily: 'Inter-Bold',
    color: Colors.primary,
  },
  subtitle: {
    ...Typography.labelLg,
    fontSize: 10.5,
    color: Colors.onSurfaceVariant,
  },
  rightRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  iconBtn: {
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
  },
  badge: {
    position: 'absolute',
    top: 4,
    right: 4,
    backgroundColor: Colors.primary,
    minWidth: 15,
    height: 15,
    borderRadius: 7.5,
    alignItems: 'center',
    justifyContent: 'center',
  },
  badgeText: {
    color: '#ffffff',
    fontSize: 9,
    fontFamily: 'Inter-Bold',
  },
});

export default NativeMobileHeader;
