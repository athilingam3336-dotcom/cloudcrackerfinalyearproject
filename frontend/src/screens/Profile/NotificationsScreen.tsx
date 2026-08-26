import React, { useCallback, useMemo, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  ListRenderItem,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { MaterialIcons } from '@expo/vector-icons';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { Colors } from '@/constants/colors';
import { Typography } from '@/constants/typography';
import { Spacing, BorderRadius } from '@/constants/spacing';
import { HomeHeader } from '@/components/common/HomeHeader';
import { PrimaryButton } from '@/components/buttons/PrimaryButton';
import { BottomNavBar, TabRoute } from '@/components/common/BottomNavBar';
import { LoadingSpinner } from '@/components/loaders/LoadingSpinner';
import { RootStackParamList } from '@/navigation/types';
import { useNotificationStore, NotificationItem } from '@/store';

type NotificationsScreenProps = NativeStackScreenProps<
  RootStackParamList,
  'Notifications'
>;

export const NotificationsScreen: React.FC<NotificationsScreenProps> = ({
  navigation,
}) => {
  const {
    notifications,
    isLoading,
    fetchNotifications,
    markAsRead,
    markAllAsRead,
    deleteNotification,
    getUnreadCount,
  } = useNotificationStore();

  const unreadCount = getUnreadCount();

  useEffect(() => {
    fetchNotifications();
  }, [fetchNotifications]);

  const handleMarkAllRead = useCallback(() => {
    markAllAsRead();
    Alert.alert('Notifications', 'All notifications marked as read.');
  }, [markAllAsRead]);

  const handleNotificationClick = useCallback(
    (id: string) => {
      markAsRead(id);
    },
    [markAsRead]
  );

  const handleDeleteNotification = useCallback(
    (id: string, title: string) => {
      Alert.alert(
        'Delete Notification',
        `Are you sure you want to remove "${title}"?`,
        [
          { text: 'Cancel', style: 'cancel' },
          {
            text: 'Delete',
            style: 'destructive',
            onPress: () => deleteNotification(id),
          },
        ]
      );
    },
    [deleteNotification]
  );

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

  const renderNotificationItem: ListRenderItem<NotificationItem> = useCallback(
    ({ item }) => (
      <TouchableOpacity
        style={[styles.notifCard, !item.isRead && styles.unreadNotifCard]}
        onPress={() => handleNotificationClick(item.id)}
        activeOpacity={0.8}
      >
        <View
          style={[
            styles.iconBox,
            item.type === 'order'
              ? styles.orderIconBox
              : item.type === 'price'
              ? styles.priceIconBox
              : styles.promoIconBox,
          ]}
        >
          <MaterialIcons
            name={
              item.type === 'order'
                ? 'local-shipping'
                : item.type === 'price'
                ? 'trending-down'
                : item.type === 'promo'
                ? 'sell'
                : 'security'
            }
            size={22}
            color="#ffffff"
          />
        </View>

        <View style={styles.notifContent}>
          <View style={styles.notifHeaderRow}>
            <Text style={styles.notifTitle}>{item.title}</Text>
            <Text style={styles.notifTime}>{item.time}</Text>
          </View>
          <Text style={styles.notifMessage}>{item.message}</Text>
          {item.tag && (
            <View style={styles.tagBadge}>
              <Text style={styles.tagText}>{item.tag}</Text>
            </View>
          )}
        </View>

        <View style={styles.rightActionsCol}>
          {!item.isRead && <View style={styles.unreadDot} />}
          <TouchableOpacity
            style={styles.deleteBtn}
            onPress={() => handleDeleteNotification(item.id, item.title)}
            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
            activeOpacity={0.7}
          >
            <MaterialIcons name="delete-outline" size={18} color={Colors.tertiary} />
          </TouchableOpacity>
        </View>
      </TouchableOpacity>
    ),
    [handleNotificationClick, handleDeleteNotification]
  );

  const renderHeader = useMemo(() => {
    return (
      <View style={styles.headerWrapper}>
        <HomeHeader
          onBackPress={() => (navigation.canGoBack() ? navigation.goBack() : navigation.navigate('Home'))}
          onNotificationPress={() => {}}
          onProfilePress={() => navigation.navigate('UserProfile')}
          onCartPress={() => navigation.navigate('Cart')}
          notificationCount={unreadCount}
        />

        <View style={styles.titleRow}>
          <TouchableOpacity
            style={styles.inlineBackRow}
            onPress={() => (navigation.canGoBack() ? navigation.goBack() : navigation.navigate('Home'))}
            activeOpacity={0.7}
          >
            <MaterialIcons name="arrow-back" size={20} color={Colors.primary} />
            <Text style={styles.inlineBackText}>Back</Text>
          </TouchableOpacity>
          <View>
            <Text style={styles.title}>Notifications</Text>
            <Text style={styles.subtitle}>
              Stay updated with your latest pyrotechnic orders and deals.
            </Text>
          </View>
          {unreadCount > 0 && (
            <TouchableOpacity onPress={handleMarkAllRead} activeOpacity={0.7}>
              <Text style={styles.markReadText}>Mark all read</Text>
            </TouchableOpacity>
          )}
        </View>
      </View>
    );
  }, [unreadCount, navigation, handleMarkAllRead]);

  const renderEmptyState = useMemo(() => {
    if (isLoading) return null;
    return (
      <View style={styles.emptyContainer}>
        <View style={styles.emptyIconCircle}>
          <MaterialIcons name="notifications-off" size={48} color={Colors.tertiary} />
        </View>
        <Text style={styles.emptyTitle}>No Notifications</Text>
        <Text style={styles.emptySubtitle}>
          You're all caught up! Order status, shipment tracking, and flash sales will show up here.
        </Text>
        <PrimaryButton
          title="Explore Fireworks"
          onPress={() => navigation.navigate('Home')}
          style={styles.emptyBtn}
        />
      </View>
    );
  }, [isLoading, navigation]);

  return (
    <SafeAreaView style={styles.safeArea} edges={['top', 'left', 'right']}>
      {isLoading && notifications.length === 0 ? (
        <>
          {renderHeader}
          <LoadingSpinner message="Fetching your notifications..." />
        </>
      ) : (
        <FlatList
          data={notifications}
          keyExtractor={(item) => item.id}
          renderItem={renderNotificationItem}
          ListHeaderComponent={renderHeader}
          ListEmptyComponent={renderEmptyState}
          contentContainerStyle={styles.listContent}
          showsVerticalScrollIndicator={false}
          onRefresh={fetchNotifications}
          refreshing={isLoading}
        />
      )}
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
    marginBottom: Spacing.sm,
  },
  titleRow: {
    paddingHorizontal: Spacing.marginMobile,
    marginTop: Spacing.sm,
    marginBottom: Spacing.xs,
  },
  inlineBackRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginBottom: Spacing.xs,
  },
  inlineBackText: {
    ...Typography.labelLg,
    fontSize: 13,
    fontFamily: 'Inter-Bold',
    color: Colors.primary,
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
    maxWidth: 240,
  },
  markReadText: {
    ...Typography.labelLg,
    fontSize: 12,
    fontFamily: 'Inter-Bold',
    color: Colors.primary,
  },
  notifCard: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    backgroundColor: Colors.surfaceContainerLowest,
    marginHorizontal: Spacing.marginMobile,
    marginBottom: Spacing.xs,
    padding: Spacing.md,
    borderRadius: BorderRadius.xl,
    borderWidth: 1,
    borderColor: Colors.surfaceContainerHigh,
    gap: Spacing.sm,
  },
  unreadNotifCard: {
    borderColor: Colors.primaryContainer,
    backgroundColor: Colors.surfaceContainerLow,
  },
  iconBox: {
    width: 42,
    height: 42,
    borderRadius: BorderRadius.lg,
    alignItems: 'center',
    justifyContent: 'center',
  },
  orderIconBox: {
    backgroundColor: Colors.primary,
  },
  priceIconBox: {
    backgroundColor: Colors.secondary,
  },
  promoIconBox: {
    backgroundColor: Colors.tertiary,
  },
  notifContent: {
    flex: 1,
  },
  notifHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  notifTitle: {
    ...Typography.titleLg,
    fontSize: 15,
    fontFamily: 'Inter-Bold',
    color: Colors.onSurface,
    flex: 1,
  },
  notifTime: {
    ...Typography.labelLg,
    fontSize: 10,
    color: Colors.tertiary,
  },
  notifMessage: {
    ...Typography.bodyMd,
    fontSize: 13,
    color: Colors.onSurfaceVariant,
    marginTop: 4,
    lineHeight: 18,
  },
  tagBadge: {
    backgroundColor: Colors.secondaryContainer,
    alignSelf: 'flex-start',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: BorderRadius.full,
    marginTop: Spacing.xs,
  },
  tagText: {
    ...Typography.labelLg,
    fontSize: 9,
    fontFamily: 'Inter-Bold',
    color: Colors.onSecondaryContainer,
  },
  rightActionsCol: {
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 8,
  },
  unreadDot: {
    width: 10,
    height: 10,
    borderRadius: BorderRadius.full,
    backgroundColor: Colors.primary,
  },
  deleteBtn: {
    padding: 4,
  },
  emptyContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: Spacing.marginMobile,
    marginTop: Spacing.xl * 2,
  },
  emptyIconCircle: {
    width: 80,
    height: 80,
    borderRadius: BorderRadius.full,
    backgroundColor: Colors.surfaceContainerLow,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: Spacing.md,
  },
  emptyTitle: {
    ...Typography.titleLg,
    fontSize: 20,
    fontFamily: 'Inter-Bold',
    color: Colors.onSurface,
  },
  emptySubtitle: {
    ...Typography.bodyMd,
    fontSize: 14,
    color: Colors.onSurfaceVariant,
    textAlign: 'center',
    marginTop: Spacing.xs,
    maxWidth: 280,
    lineHeight: 20,
    marginBottom: Spacing.md,
  },
  emptyBtn: {
    minWidth: 180,
  },
});

export default NotificationsScreen;

