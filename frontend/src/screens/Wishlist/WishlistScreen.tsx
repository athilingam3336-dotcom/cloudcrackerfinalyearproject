import React, { useState, useCallback, useMemo, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  ScrollView,
  TouchableOpacity,
  Dimensions,
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
import { ProductCard } from '@/components/cards/ProductCard';
import { PrimaryButton } from '@/components/buttons/PrimaryButton';
import { BottomNavBar, TabRoute } from '@/components/common/BottomNavBar';
import { ProductItem } from '@/constants/mockData';
import { RootStackParamList } from '@/navigation/types';
import { useWishlistStore, useCartStore, useNotificationStore } from '@/store';

type WishlistScreenProps = NativeStackScreenProps<RootStackParamList, 'Wishlist'>;

const getNumColumns = (width: number) => {
  if (width >= 1024) return 4;
  if (width >= 768) return 3;
  return 2;
};

export const WishlistScreen: React.FC<WishlistScreenProps> = ({ navigation }) => {
  const { wishlistItems, removeFromWishlist, fetchWishlist } = useWishlistStore();
  const addToCart = useCartStore((state) => state.addToCart);
  const unreadNotifs = useNotificationStore((state) => state.getUnreadCount());

  useEffect(() => {
    fetchWishlist();
  }, [fetchWishlist]);

  const [screenWidth] = useState(Dimensions.get('window').width);
  const numColumns = useMemo(() => getNumColumns(screenWidth), [screenWidth]);

  const handleAddToCart = useCallback(
    async (product: ProductItem) => {
      try {
        await addToCart(product, 1);
        navigation.navigate('Cart');
      } catch (err: any) {
        Alert.alert('Cart Error', err?.message || 'Failed to add item to cart.');
      }
    },
    [addToCart, navigation]
  );

  const handleAddAllToCart = useCallback(async () => {
    try {
      for (const item of wishlistItems) {
        await addToCart(item, 1);
      }
      navigation.navigate('Cart');
    } catch (err: any) {
      Alert.alert('Cart Error', err?.message || 'Failed to add items to cart.');
    }
  }, [wishlistItems, addToCart, navigation]);

  const handleTabPress = useCallback(
    (tab: TabRoute) => {
      if (tab === 'Home') navigation.navigate('Home');
      else if (tab === 'Categories') navigation.navigate('Categories');
      else if (tab === 'Cart') navigation.navigate('Cart');
      else if (tab === 'Profile') navigation.navigate('UserProfile');
    },
    [navigation]
  );

  const renderWishlistItem: ListRenderItem<ProductItem> = useCallback(
    ({ item }) => (
      <View style={styles.gridColumn}>
        <ProductCard
          id={item.id}
          title={item.title}
          category={item.subtitle || item.category}
          price={item.price}
          originalPrice={item.originalPrice}
          badge={item.badge}
          rating={item.rating}
          reviewCount={item.reviewCount}
          imageUrl={item.imageUrl}
          isWishlisted={true}
          onPress={() => navigation.navigate('ProductDetails', { productId: item.id })}
          onAddToCart={() => handleAddToCart(item)}
          onWishlistToggle={() => removeFromWishlist(item.id)}
        />
      </View>
    ),
    [navigation, handleAddToCart, removeFromWishlist]
  );

  const renderHeader = useMemo(() => {
    return (
      <View style={styles.headerWrapper}>
        <HomeHeader
          onNotificationPress={() => navigation.navigate('Notifications')}
          onProfilePress={() => navigation.navigate('UserProfile')}
          onCartPress={() => navigation.navigate('Cart')}
          notificationCount={unreadNotifs}
        />

        <View style={styles.titleSection}>
          <View style={styles.titleTextWrapper}>
            <Text style={styles.title}>Your Wishlist</Text>
            <Text style={styles.subtitle}>
              {wishlistItems.length} {wishlistItems.length === 1 ? 'item' : 'items'} saved for your next celebration
            </Text>
          </View>

          {wishlistItems.length > 0 && (
            <View style={styles.actionButtonsRow}>
              <PrimaryButton
                title="Add All to Cart"
                onPress={handleAddAllToCart}
                style={styles.addAllCta}
              />
            </View>
          )}
        </View>
      </View>
    );
  }, [wishlistItems.length, unreadNotifs, navigation, handleAddAllToCart]);

  const renderEmptyState = useMemo(() => {
    return (
      <View style={styles.emptyContainer}>
        <View style={styles.emptyIconCircle}>
          <MaterialIcons name="favorite-border" size={56} color={Colors.primary} />
        </View>
        <Text style={styles.emptyTitle}>Your Wishlist is Empty</Text>
        <Text style={styles.emptySubtitle}>
          Explore our catalog and save your favorite pyrotechnics for upcoming celebrations.
        </Text>
        <PrimaryButton
          title="Start Shopping"
          onPress={() => navigation.navigate('Categories')}
          style={styles.emptyCta}
        />
      </View>
    );
  }, [navigation]);

  return (
    <SafeAreaView style={styles.safeArea} edges={['top', 'left', 'right']}>
      {wishlistItems.length > 0 ? (
        <FlatList
          data={wishlistItems}
          key={numColumns}
          numColumns={numColumns}
          keyExtractor={(item) => item.id}
          renderItem={renderWishlistItem}
          ListHeaderComponent={renderHeader}
          columnWrapperStyle={styles.gridRow}
          contentContainerStyle={styles.listContent}
          showsVerticalScrollIndicator={false}
        />
      ) : (
        <ScrollView contentContainerStyle={styles.scrollContent}>
          {renderHeader}
          {renderEmptyState}
        </ScrollView>
      )}

      <BottomNavBar activeTab="Wishlist" onTabPress={handleTabPress} />
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
  scrollContent: {
    flexGrow: 1,
    paddingBottom: Spacing.xl,
  },
  headerWrapper: {
    marginBottom: Spacing.sm,
  },
  titleSection: {
    paddingHorizontal: Spacing.marginMobile,
    marginTop: Spacing.sm,
    marginBottom: Spacing.xs,
  },
  titleTextWrapper: {
    marginBottom: Spacing.xs,
  },
  title: {
    ...Typography.headlineLg,
    fontSize: 26,
    fontFamily: 'Inter-Bold',
    color: Colors.onSurface,
  },
  subtitle: {
    ...Typography.bodyLg,
    fontSize: 14,
    color: Colors.onSurfaceVariant,
    marginTop: 2,
  },
  actionButtonsRow: {
    flexDirection: 'row',
    marginTop: Spacing.xs,
  },
  addAllCta: {
    paddingHorizontal: Spacing.md,
  },
  gridRow: {
    paddingHorizontal: Spacing.marginMobile,
    gap: Spacing.sm,
  },
  gridColumn: {
    flex: 1,
  },
  emptyContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: Spacing.marginMobile,
    marginTop: Spacing.xl,
  },
  emptyIconCircle: {
    width: 100,
    height: 100,
    borderRadius: BorderRadius.full,
    backgroundColor: Colors.primaryFixed,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: Spacing.md,
  },
  emptyTitle: {
    ...Typography.titleLg,
    fontSize: 20,
    fontFamily: 'Inter-Bold',
    color: Colors.onSurface,
    marginBottom: Spacing.xs,
  },
  emptySubtitle: {
    ...Typography.bodyLg,
    fontSize: 14,
    color: Colors.tertiary,
    textAlign: 'center',
    maxWidth: 300,
    marginBottom: Spacing.lg,
  },
  emptyCta: {
    minWidth: 180,
  },
});

export default WishlistScreen;
