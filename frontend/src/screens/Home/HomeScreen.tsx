import React, { useState, useCallback, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  Dimensions,
  ListRenderItem,
  TextInput,
  Alert,
  Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { MaterialIcons } from '@expo/vector-icons';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { Colors } from '@/constants/colors';
import { Typography } from '@/constants/typography';
import { Spacing, BorderRadius } from '@/constants/spacing';
import { HomeHeader } from '@/components/common/HomeHeader';
import { SearchBar } from '@/components/inputs/SearchBar';
import { BannerCarousel } from '@/components/common/BannerCarousel';
import { ProductCard } from '@/components/cards/ProductCard';
import { CategoryCard } from '@/components/cards/CategoryCard';
import { SectionHeader } from '@/components/common/SectionHeader';
import { BottomNavBar, TabRoute } from '@/components/common/BottomNavBar';
import { PrimaryButton } from '@/components/buttons/PrimaryButton';
import { LoadingSpinner } from '@/components/loaders/LoadingSpinner';
import { productService } from '@/services/productService';
import { paymentService } from '@/services/paymentService';
import { useWishlistStore, useCartStore, useNotificationStore, useAuthStore } from '@/store';
import {
  MOCK_CATEGORIES,
  MOCK_BANNERS,
  MOCK_FLASH_SALE,
  ProductItem,
  FlashSaleItem,
  BannerItem,
} from '@/constants/mockData';
import { RootStackParamList } from '@/navigation/types';

type HomeScreenProps = NativeStackScreenProps<RootStackParamList, 'Home'>;

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const IS_DESKTOP_OR_TABLET = SCREEN_WIDTH >= 768;
const NUM_COLUMNS = IS_DESKTOP_OR_TABLET ? 4 : 2;

export const HomeScreen: React.FC<HomeScreenProps> = ({ navigation }) => {
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [newsletterEmail, setNewsletterEmail] = useState('');

  // API State
  const [products, setProducts] = useState<ProductItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isError, setIsError] = useState(false);

  // Store Hooks
  const user = useAuthStore((state) => state.user);
  const updateProfile = useAuthStore((state) => state.updateProfile);
  const { wishlistItems, toggleWishlist } = useWishlistStore();
  const addToCart = useCartStore((state) => state.addToCart);
  const unreadNotifs = useNotificationStore((state) => state.getUnreadCount());

  const loadProducts = useCallback(async () => {
    setIsLoading(true);
    setIsError(false);
    try {
      const data = await productService.getProducts(selectedCategory, searchQuery);
      setProducts(data);
      setIsLoading(false);
    } catch (e) {
      setIsError(true);
      setIsLoading(false);
    }
  }, [selectedCategory, searchQuery]);

  React.useEffect(() => {
    loadProducts();
  }, [loadProducts]);

  // Wishlist handler
  const handleToggleWishlist = useCallback((product: ProductItem) => {
    toggleWishlist(product);
  }, [toggleWishlist]);

  // Navigation handlers
  const handleProductPress = useCallback(
    (productId: string) => {
      navigation.navigate('ProductDetails', { productId });
    },
    [navigation]
  );

  const handleAddToCart = useCallback(
    (productTitle: string) => {
      Alert.alert('Cart Updated', `"${productTitle}" has been added to your cart.`);
    },
    []
  );

  const handleCategoryPress = useCallback((categoryId: string) => {
    setSelectedCategory(categoryId);
  }, []);

  const handleViewAllCategories = useCallback(() => {
    navigation.navigate('Categories');
  }, [navigation]);

  const handleBannerPress = useCallback(
    (banner: BannerItem) => {
      navigation.navigate('ProductListing', { query: banner.tag });
    },
    [navigation]
  );

  const handleTabPress = useCallback(
    (tab: TabRoute) => {
      if (tab === 'Categories') navigation.navigate('Categories');
      else if (tab === 'Cart') navigation.navigate('Cart');
      else if (tab === 'Wishlist') navigation.navigate('Wishlist');
      else if (tab === 'Profile') navigation.navigate('UserProfile');
    },
    [navigation]
  );

  const handleNewsletterSubscribe = useCallback(() => {
    if (!newsletterEmail.includes('@')) {
      if (Platform.OS === 'web') {
        window.alert('Please enter a valid email address.');
      } else {
        Alert.alert('Invalid Email', 'Please enter a valid email address.');
      }
      return;
    }
    
    const proceedToPayment = () => {
      paymentService.openCheckout({
        keyId: 'rzp_test_TNZEhfxl0Doyl7',
        amountPaise: 10000,
        currency: 'INR',
        orderId: '',
        orderNumber: 'VIP-' + Date.now(),
        customerEmail: newsletterEmail,
        customerName: user?.name || 'VIP Member',
        onSuccess: (response) => {
          updateProfile({ membership: 'VIP Member' });
          if (Platform.OS === 'web') {
            window.alert('Payment Successful! Thank you for joining! You are now a VIP Member.');
          } else {
            Alert.alert(
              'Payment Successful!',
              'Thank you for joining! You are now a VIP Member.'
            );
          }
          setNewsletterEmail('');
        },
        onFailure: (err) => {
          const msg = err.description || 'Payment was declined or cancelled.';
          if (Platform.OS === 'web') {
            window.alert(msg);
          } else {
            Alert.alert('Payment Failed', msg);
          }
        },
        onDismiss: () => {},
      });
    };

    if (Platform.OS === 'web') {
      if (typeof window !== 'undefined' && window.confirm('VIP Membership requires a one-time fee of ₹100. Proceed to payment?')) {
        proceedToPayment();
      }
    } else {
      Alert.alert(
        'Join VIP Club',
        'VIP Membership requires a one-time fee of ₹100. Proceed to payment?',
        [
          { text: 'Cancel', style: 'cancel' },
          {
            text: 'Pay ₹100',
            onPress: proceedToPayment,
          },
        ]
      );
    }
  }, [newsletterEmail, updateProfile]);

  // Render Horizontal Product Card item
  const renderHorizontalProductItem = useCallback(
    ({ item }: { item: ProductItem }) => {
      const isWishlisted = wishlistItems.some((w) => w.id === item.id);
      return (
        <View style={styles.horizontalCardWrapper}>
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
            isWishlisted={isWishlisted}
            onPress={() => handleProductPress(item.id)}
            onAddToCart={() => addToCart(item, 1)}
            onWishlistToggle={() => toggleWishlist(item)}
          />
        </View>
      );
    },
    [wishlistItems, handleProductPress, addToCart, toggleWishlist]
  );

  // Render main Grid Product Card
  const renderProductItem: ListRenderItem<ProductItem> = useCallback(
    ({ item }) => {
      const isWishlisted = wishlistItems.some((w) => w.id === item.id);
      return (
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
            isWishlisted={isWishlisted}
            onPress={() => handleProductPress(item.id)}
            onAddToCart={() => addToCart(item, 1)}
            onWishlistToggle={() => toggleWishlist(item)}
          />
        </View>
      );
    },
    [wishlistItems, handleProductPress, addToCart, toggleWishlist]
  );

  // Render Flash Sale Item
  const renderFlashSaleItem = useCallback(
    ({ item }: { item: FlashSaleItem }) => {
      const isWishlisted = wishlistItems.some((w) => w.id === item.id);
      return (
        <View style={styles.flashSaleCardWrapper}>
          <ProductCard
            id={item.id}
            title={item.title}
            category={`${item.stockLeft} left in stock`}
            price={item.price}
            originalPrice={item.originalPrice}
            badge={item.badge || `${item.discountPercent}% OFF`}
            rating={item.rating}
            reviewCount={item.reviewCount}
            imageUrl={item.imageUrl}
            isWishlisted={isWishlisted}
            onPress={() => handleProductPress(item.id)}
            onAddToCart={() => addToCart(item, 1)}
            onWishlistToggle={() =>
              toggleWishlist({
                id: item.id,
                title: item.title,
                subtitle: 'Flash Sale Item',
                category: 'Flash Sale',
                price: item.price,
                rating: item.rating,
                reviewCount: item.reviewCount,
                imageUrl: item.imageUrl,
              })
            }
          />
        </View>
      );
    },
    [wishlistItems, handleProductPress, addToCart, toggleWishlist]
  );

  // List Header Component
  const renderHeader = useMemo(() => {
    return (
      <View style={styles.headerWrapper}>
        {/* Top App Header */}
        <HomeHeader
          onNotificationPress={() => navigation.navigate('Notifications')}
          onProfilePress={() => navigation.navigate('UserProfile')}
          onCartPress={() => navigation.navigate('Cart')}
          notificationCount={unreadNotifs}
          userName={user?.name ? user.name.split(' ')[0] : 'Explorer'}
        />

        {/* Search Bar */}
        <SearchBar
          value={searchQuery}
          onChangeText={setSearchQuery}
          onClear={() => setSearchQuery('')}
          onFilterPress={() => navigation.navigate('ProductListing')}
          placeholder="Search rockets, sparklers, barrages..."
        />

        {/* Hero Banner Carousel */}
        <BannerCarousel
          banners={MOCK_BANNERS}
          onBannerPress={handleBannerPress}
        />

        {/* Categories Horizontal Scroll */}
        <View style={styles.categoriesSection}>
          <SectionHeader
            title="Categories"
            actionText="View All"
            onActionPress={handleViewAllCategories}
          />
          <FlatList
            horizontal
            data={MOCK_CATEGORIES}
            keyExtractor={(item) => item.id}
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.categoriesList}
            renderItem={({ item }) => (
              <CategoryCard
                name={item.name}
                isSelected={selectedCategory === item.id}
                onPress={() => handleCategoryPress(item.id)}
              />
            )}
          />
        </View>

        {/* Flash Sale Banner Section */}
        <View style={styles.flashSaleSection}>
          <View style={styles.flashSaleHeaderRow}>
            <View style={styles.flashSaleTitleBox}>
              <MaterialIcons name="bolt" size={24} color={Colors.secondaryContainer} />
              <Text style={styles.flashSaleTitle}>Flash Sale</Text>
            </View>
            <View style={styles.timerBadge}>
              <MaterialIcons name="timer" size={14} color="#ffffff" />
              <Text style={styles.timerText}>01h : 45m : 30s</Text>
            </View>
          </View>
          <FlatList
            horizontal
            data={MOCK_FLASH_SALE}
            keyExtractor={(item) => item.id}
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.horizontalListContent}
            renderItem={renderFlashSaleItem}
          />
        </View>

        {/* Featured Products Section */}
        <View style={styles.sectionContainer}>
          <SectionHeader
            title="Featured Products"
            subtitle="Handpicked pyrotechnics for maximum celebration."
            actionText="See All"
            onActionPress={() => navigation.navigate('ProductListing')}
          />
          <FlatList
            horizontal
            data={products}
            keyExtractor={(item) => item.id}
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.horizontalListContent}
            renderItem={renderHorizontalProductItem}
          />
        </View>

        {/* Best Sellers Section */}
        <View style={styles.sectionContainer}>
          <SectionHeader
            title="Best Sellers"
            subtitle="Top rated pyrotechnics chosen by our community."
            actionText="See All"
            onActionPress={() => navigation.navigate('ProductListing')}
          />
          <FlatList
            horizontal
            data={products}
            keyExtractor={(item) => item.id}
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.horizontalListContent}
            renderItem={renderHorizontalProductItem}
          />
        </View>

        {/* Grid Title for Recommended Products */}
        <SectionHeader
          title="Recommended Products"
          subtitle="Tailored picks matching your preferences."
        />
      </View>
    );
  }, [
    products,
    searchQuery,
    selectedCategory,
    navigation,
    handleBannerPress,
    handleViewAllCategories,
    handleCategoryPress,
    renderFlashSaleItem,
    renderHorizontalProductItem,
  ]);

  // List Footer Component (Club Subscription Banner)
  const renderFooter = useMemo(() => {
    return (
      <View style={styles.footerWrapper}>
        <View style={styles.clubCard}>
          <Text style={styles.clubTitle}>Join the VIP Club</Text>
          <Text style={styles.clubSubtitle}>
            Get exclusive early access to new releases, safety tips, and special
            member-only discounts straight to your inbox.
          </Text>
          <View style={styles.newsletterForm}>
            <TextInput
              style={styles.newsletterInput}
              placeholder="Enter your email"
              placeholderTextColor={Colors.tertiary}
              value={newsletterEmail}
              onChangeText={setNewsletterEmail}
              keyboardType="email-address"
              autoCapitalize="none"
            />
            <PrimaryButton
              title="SUBSCRIBE"
              variant="secondary"
              onPress={handleNewsletterSubscribe}
              style={styles.newsletterCta}
            />
          </View>
          <MaterialIcons
            name="celebration"
            size={120}
            color="rgba(255,255,255,0.12)"
            style={styles.clubWatermark}
          />
        </View>
      </View>
    );
  }, [newsletterEmail, handleNewsletterSubscribe]);

  if (isLoading) {
    return (
      <SafeAreaView style={styles.safeArea} edges={['top', 'left', 'right']}>
        <HomeHeader
          onNotificationPress={() => navigation.navigate('Notifications')}
          onProfilePress={() => navigation.navigate('UserProfile')}
          onCartPress={() => navigation.navigate('Cart')}
          notificationCount={unreadNotifs}
        />
        <LoadingSpinner message="Loading pyrotechnics catalog..." />
        <BottomNavBar activeTab="Home" onTabPress={(tab) => navigation.navigate(tab as any)} />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safeArea} edges={['top', 'left', 'right']}>
      <FlatList
        data={products}
        key={NUM_COLUMNS}
        numColumns={NUM_COLUMNS}
        keyExtractor={(item) => item.id}
        renderItem={renderProductItem}
        ListHeaderComponent={renderHeader}
        ListFooterComponent={renderFooter}
        columnWrapperStyle={NUM_COLUMNS > 1 ? styles.gridRow : undefined}
        contentContainerStyle={styles.listContent}
        showsVerticalScrollIndicator={false}
        initialNumToRender={6}
        maxToRenderPerBatch={10}
        windowSize={5}
      />

      {/* Reusable Bottom Navigation Bar */}
      <BottomNavBar activeTab="Home" onTabPress={handleTabPress} />
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
    marginBottom: Spacing.xs,
  },
  categoriesSection: {
    marginVertical: Spacing.xs,
  },
  categoriesList: {
    paddingHorizontal: Spacing.marginMobile,
  },
  flashSaleSection: {
    marginVertical: Spacing.sm,
    backgroundColor: Colors.primary,
    paddingVertical: Spacing.md,
    borderRadius: BorderRadius.xl,
    marginHorizontal: Spacing.marginMobile,
  },
  flashSaleHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: Spacing.md,
    marginBottom: Spacing.sm,
  },
  flashSaleTitleBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  flashSaleTitle: {
    ...Typography.titleLg,
    fontFamily: 'Inter-Bold',
    color: '#ffffff',
  },
  timerBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(0,0,0,0.3)',
    paddingHorizontal: Spacing.xs,
    paddingVertical: 4,
    borderRadius: BorderRadius.full,
    gap: 4,
  },
  timerText: {
    ...Typography.labelLg,
    color: '#ffffff',
    fontSize: 11,
    fontFamily: 'Inter-Bold',
  },
  sectionContainer: {
    marginVertical: Spacing.xs,
  },
  horizontalListContent: {
    paddingHorizontal: Spacing.marginMobile,
  },
  horizontalCardWrapper: {
    width: 170,
    marginRight: Spacing.sm,
  },
  flashSaleCardWrapper: {
    width: 180,
    marginRight: Spacing.sm,
  },
  gridRow: {
    justifyContent: 'space-between',
    paddingHorizontal: Spacing.marginMobile,
    gap: Spacing.sm,
  },
  gridColumn: {
    flex: 1,
  },
  footerWrapper: {
    paddingHorizontal: Spacing.marginMobile,
    marginTop: Spacing.lg,
    marginBottom: Spacing.md,
  },
  clubCard: {
    backgroundColor: Colors.splashBackground,
    borderRadius: BorderRadius.xl,
    padding: Spacing.lg,
    position: 'relative',
    overflow: 'hidden',
  },
  clubTitle: {
    ...Typography.headlineLg,
    fontSize: 24,
    fontFamily: 'Inter-Bold',
    color: Colors.onPrimary,
    marginBottom: Spacing.xs,
  },
  clubSubtitle: {
    ...Typography.bodyLg,
    fontSize: 14,
    fontFamily: 'Inter-Regular',
    color: 'rgba(255,255,255,0.9)',
    marginBottom: Spacing.md,
    lineHeight: 20,
  },
  newsletterForm: {
    gap: Spacing.xs,
  },
  newsletterInput: {
    backgroundColor: Colors.surfaceContainerLowest,
    borderRadius: BorderRadius.lg,
    paddingHorizontal: Spacing.md,
    height: 48,
    ...Typography.bodyMd,
    color: Colors.onSurface,
  },
  newsletterCta: {
    alignSelf: 'stretch',
  },
  clubWatermark: {
    position: 'absolute',
    right: -20,
    bottom: -20,
  },
});

export default HomeScreen;
