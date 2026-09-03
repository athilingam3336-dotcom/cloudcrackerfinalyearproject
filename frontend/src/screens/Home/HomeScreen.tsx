import React, { useState, useCallback, useMemo, useRef } from 'react';
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
  Linking,
  Image,
  ScrollView,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { MaterialIcons } from '@expo/vector-icons';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { Colors } from '@/constants/colors';
import { Typography } from '@/constants/typography';
import { Spacing, BorderRadius } from '@/constants/spacing';
import { HomeHeader } from '@/components/common/HomeHeader';
import { CLIENT_INFO } from '@/constants/clientInfo';
import { LOCAL_PRODUCT_IMAGES } from '@/constants/productImages';
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
  MOCK_PRODUCTS,
  MOCK_FEATURED_PRODUCTS,
  MOCK_BEST_SELLERS,
  MOCK_CATEGORIES,
  MOCK_BANNERS,
  MOCK_FLASH_SALE,
  ProductItem,
  FlashSaleItem,
  BannerItem,
} from '@/constants/mockData';
import { RootStackParamList } from '@/navigation/types';
import { useSmartTabNavigation } from '@/hooks/useSmartTabNavigation';

type HomeScreenProps = NativeStackScreenProps<RootStackParamList, 'Home'>;

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const IS_DESKTOP_OR_TABLET = SCREEN_WIDTH >= 768;
const NUM_COLUMNS = IS_DESKTOP_OR_TABLET ? 4 : 2;

export const HomeScreen: React.FC<HomeScreenProps> = ({ navigation }) => {
  const { handleTabPress } = useSmartTabNavigation();
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');

  // API State with Instant Hydration (0ms wait time)
  const [products, setProducts] = useState<ProductItem[]>(() => MOCK_PRODUCTS);
  const [isLoading, setIsLoading] = useState(false);
  const [isError, setIsError] = useState(false);

  // Store Hooks
  const user = useAuthStore((state) => state.user);
  const updateProfile = useAuthStore((state) => state.updateProfile);
  const { wishlistItems, toggleWishlist } = useWishlistStore();
  const addToCart = useCartStore((state) => state.addToCart);
  const unreadNotifs = useNotificationStore((state) => state.getUnreadCount());

  const loadProducts = useCallback(async () => {
    if (products.length === 0) {
      setIsLoading(true);
    }
    setIsError(false);
    try {
      const data = await productService.getProducts(selectedCategory, searchQuery, 50, 1, true);
      if (data && data.length > 0) {
        setProducts(data);
      }
      setIsLoading(false);
    } catch (e) {
      setIsError(true);
      setIsLoading(false);
    }
  }, [selectedCategory, searchQuery]);

  React.useEffect(() => {
    loadProducts();
  }, [loadProducts]);

  const isAuthenticated = useAuthStore((state) => state.isAuthenticated);

  // Wishlist handler
  const handleToggleWishlist = useCallback(
    async (product: ProductItem) => {
      if (!isAuthenticated) {
        Alert.alert('Sign In Required', 'Please log in to manage your wishlist.', [
          { text: 'Cancel', style: 'cancel' },
          { text: 'Sign In', onPress: () => navigation.navigate('Login') },
        ]);
        return;
      }
      try {
        const isAdded = await toggleWishlist(product);
        if (isAdded) {
          Alert.alert('Wishlist Updated', `"${product.title}" added to your wishlist.`);
        }
      } catch (err: any) {
        Alert.alert('Wishlist Error', err?.message || 'Failed to update wishlist.');
      }
    },
    [isAuthenticated, toggleWishlist, navigation]
  );

  // Navigation handlers
  const handleProductPress = useCallback(
    (productId: string) => {
      navigation.navigate('ProductDetails', { productId });
    },
    [navigation]
  );

  const handleAddToCart = useCallback(
    async (product: ProductItem) => {
      if (!isAuthenticated) {
        Alert.alert('Sign In Required', 'Please log in to add items to your cart.', [
          { text: 'Cancel', style: 'cancel' },
          { text: 'Sign In', onPress: () => navigation.navigate('Login') },
        ]);
        return;
      }
      try {
        await addToCart(product, 1);
        Alert.alert('Cart Updated', `"${product.title}" has been added to your cart.`);
      } catch (err: any) {
        Alert.alert('Cart Error', err?.message || 'Failed to add item to cart.');
      }
    },
    [isAuthenticated, addToCart, navigation]
  );

  const handleCategoryPress = useCallback((categoryId: string) => {
    setSelectedCategory(categoryId);
  }, []);

  const handleViewAllCategories = useCallback(() => {
    navigation.navigate('Categories');
  }, [navigation]);

  const activeBanners = useMemo(() => {
    const featuredAsBanners: BannerItem[] = products
      .filter((p: any) => Boolean(p.isFeatured || p.is_featured))
      .map((p: any) => ({
        id: p.id,
        tag: '✨ FEATURED DEAL',
        title: p.title || p.name,
        subtitle: p.subtitle || p.description || 'Exclusive Sivakasi celebration pyrotechnics.',
        discountText: p.originalPrice && p.originalPrice > p.price
          ? `Save ₹${p.originalPrice - p.price}`
          : 'Special Offer',
        ctaText: 'Shop Now',
        imageUrl: p.imageUrl,
      }));

    if (featuredAsBanners.length > 0) {
      return [...featuredAsBanners, ...MOCK_BANNERS];
    }
    return MOCK_BANNERS;
  }, [products]);

  const handleBannerPress = useCallback(
    (banner: BannerItem) => {
      if (banner.id.startsWith('banner')) {
        if (banner.id === 'banner1') {
          navigation.navigate('ProductListing', { categoryId: '660000000000000000000007', query: 'Shot' });
        } else if (banner.id === 'banner2') {
          navigation.navigate('ProductListing', { categoryId: '660000000000000000000004', query: 'Rocket' });
        } else if (banner.id === 'banner3') {
          navigation.navigate('ProductListing', { categoryId: '660000000000000000000001', query: 'Sparkler' });
        } else {
          navigation.navigate('ProductListing', { query: banner.tag });
        }
      } else {
        navigation.navigate('ProductDetails', { productId: banner.id });
      }
    },
    [navigation]
  );





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
            onAddToCart={() => handleAddToCart(item)}
            onWishlistToggle={() => handleToggleWishlist(item)}
          />
        </View>
      );
    },
    [wishlistItems, handleProductPress, handleAddToCart, handleToggleWishlist]
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
            stock={item.stock}
            badge={item.badge}
            rating={item.rating}
            reviewCount={item.reviewCount}
            imageUrl={item.imageUrl}
            isWishlisted={isWishlisted}
            onPress={() => handleProductPress(item.id)}
            onAddToCart={() => handleAddToCart(item)}
            onWishlistToggle={() => handleToggleWishlist(item)}
          />
        </View>
      );
    },
    [wishlistItems, handleProductPress, handleAddToCart, handleToggleWishlist]
  );

  // Render Flash Sale Item
  const renderFlashSaleItem = useCallback(
    ({ item }: { item: FlashSaleItem }) => {
      const isWishlisted = wishlistItems.some((w) => w.id === item.id);
      const productObj: ProductItem = {
        id: item.id,
        title: item.title,
        subtitle: item.subtitle,
        category: item.category,
        price: item.price,
        originalPrice: item.originalPrice,
        rating: item.rating,
        reviewCount: item.reviewCount,
        imageUrl: item.imageUrl,
        badge: item.badge,
      };

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
            onAddToCart={() => handleAddToCart(productObj)}
            onWishlistToggle={() => handleToggleWishlist(productObj)}
          />
        </View>
      );
    },
    [wishlistItems, handleProductPress, handleAddToCart, handleToggleWishlist]
  );

  // Dynamic Live Countdown Timer for Flash Sale (Unified across all Flash Sale items)
  const [timerSeconds, setTimerSeconds] = useState<number>(0);
  const targetEndTimeRef = useRef<number | null>(null);

  React.useEffect(() => {
    const activeFlashItems = products.filter(
      (p: any) =>
        Boolean(p.isFlashSale || p.is_flash_sale) &&
        (p.stock === undefined || p.stock === null || p.stock > 0)
    );

    if (activeFlashItems.length > 0) {
      const remainingSecondsList = activeFlashItems.map((p: any) => {
        if (typeof p.endsInSeconds === 'number' && p.endsInSeconds > 0) {
          return p.endsInSeconds;
        }
        const hrs = parseFloat(p.flashSaleHours || p.flash_sale_hours || 4);
        return Math.max(60, Math.floor(hrs * 3600));
      });
      // Pick the max duration among active flash sale items
      const maxRemainingSecs = Math.max(...remainingSecondsList);
      const newTargetMs = Date.now() + maxRemainingSecs * 1000;

      // Only update target if not set or if duration changed (> 30 seconds diff)
      if (
        !targetEndTimeRef.current ||
        Math.abs(newTargetMs - targetEndTimeRef.current) > 30000
      ) {
        targetEndTimeRef.current = newTargetMs;
        setTimerSeconds(maxRemainingSecs);
      }
    }
  }, [products]);

  React.useEffect(() => {
    const interval = setInterval(() => {
      if (targetEndTimeRef.current) {
        const now = Date.now();
        const diffSecs = Math.max(0, Math.floor((targetEndTimeRef.current - now) / 1000));
        setTimerSeconds(diffSecs);
      }
    }, 1000);

    return () => clearInterval(interval);
  }, []);

  const formattedTimer = useMemo(() => {
    const hrs = String(Math.floor(timerSeconds / 3600)).padStart(2, '0');
    const mins = String(Math.floor((timerSeconds % 3600) / 60)).padStart(2, '0');
    const secs = String(timerSeconds % 60).padStart(2, '0');
    return `${hrs}h : ${mins}m : ${secs}s`;
  }, [timerSeconds]);

  const flashSaleData: FlashSaleItem[] = useMemo(() => {
    // Strictly filter products that are explicitly tagged isFlashSale AND in stock (stock > 0)
    const inStockProducts = products.filter(
      (p: any) => p.stock === undefined || p.stock === null || p.stock > 0
    );

    const explicitFlashSales = inStockProducts.filter(
      (p: any) => Boolean(p.isFlashSale || p.is_flash_sale)
    );

    if (explicitFlashSales.length > 0) {
      return explicitFlashSales.map((p: any) => ({
        id: p.id,
        title: p.title || p.name,
        subtitle: p.subtitle || 'Flash Sale Special',
        category: p.category || 'Fireworks',
        price: p.price,
        originalPrice: p.originalPrice || Math.round(p.price * 1.25),
        discountPercent: p.originalPrice
          ? Math.round(((p.originalPrice - p.price) / p.originalPrice) * 100)
          : 20,
        badge: 'FLASH SALE',
        rating: p.rating || 5.0,
        reviewCount: p.reviewCount || 0,
        endsInSeconds: timerSeconds,
        stockLeft: p.stock !== undefined ? p.stock : 45,
        imageUrl: p.imageUrl,
      }));
    }
    return [];
  }, [products, timerSeconds]);

  const featuredProducts: ProductItem[] = useMemo(() => {
    const featured = products.filter(
      (p) =>
        p.badge?.toLowerCase().includes('featured') ||
        p.badge?.toLowerCase().includes('top') ||
        p.badge?.toLowerCase().includes('sky') ||
        p.rating >= 4.9
    );
    return featured.length >= 3 ? featured.slice(0, 6) : MOCK_FEATURED_PRODUCTS;
  }, [products]);

  const bestSellerProducts: ProductItem[] = useMemo(() => {
    const bestSellers = products.filter(
      (p) =>
        p.badge?.toLowerCase().includes('bestseller') ||
        p.badge?.toLowerCase().includes('popular') ||
        p.badge?.toLowerCase().includes('trending') ||
        p.badge?.toLowerCase().includes('hot') ||
        (p.reviewCount && p.reviewCount >= 100)
    );
    return bestSellers.length >= 3 ? bestSellers.slice(0, 6) : MOCK_BEST_SELLERS;
  }, [products]);

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
          banners={activeBanners}
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

        {/* Flash Sale Banner Section (Only shown when active Flash Sale items exist) */}
        {flashSaleData.length > 0 && (
          <View style={styles.flashSaleSection}>
            <View style={styles.flashSaleHeaderRow}>
              <View style={styles.flashSaleTitleBox}>
                <MaterialIcons name="bolt" size={24} color={Colors.secondaryContainer} />
                <Text style={styles.flashSaleTitle}>Flash Sale</Text>
              </View>
              <View style={styles.timerBadge}>
                <MaterialIcons name="timer" size={14} color="#ffffff" />
                <Text style={styles.timerText}>{formattedTimer}</Text>
              </View>
            </View>
            <FlatList
              horizontal
              data={flashSaleData}
              keyExtractor={(item) => item.id}
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.horizontalListContent}
              renderItem={renderFlashSaleItem}
            />
          </View>
        )}

        {/* Featured Products Section */}
        <View style={styles.sectionContainer}>
          <SectionHeader
            title="Featured Products"
            subtitle="Handpicked pyrotechnics for maximum celebration."
            actionText="See All"
            onActionPress={() => navigation.navigate('ProductListing', { query: 'featured' })}
          />
          <FlatList
            horizontal
            data={featuredProducts}
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
            onActionPress={() => navigation.navigate('ProductListing', { query: 'bestseller' })}
          />
          <FlatList
            horizontal
            data={bestSellerProducts}
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
    featuredProducts,
    bestSellerProducts,
    searchQuery,
    selectedCategory,
    navigation,
    handleBannerPress,
    handleViewAllCategories,
    handleCategoryPress,
    renderFlashSaleItem,
    renderHorizontalProductItem,
  ]);
  if (isLoading && products.length === 0) {
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
    width: '100%',
  },
  listContent: {
    paddingBottom: Spacing.xl,
    maxWidth: 1400,
    width: '100%',
    alignSelf: 'center',
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
    width: IS_DESKTOP_OR_TABLET ? 210 : 165,
    marginRight: Spacing.sm,
  },
  flashSaleCardWrapper: {
    width: IS_DESKTOP_OR_TABLET ? 220 : 175,
    marginRight: Spacing.sm,
  },
  gridRow: {
    justifyContent: 'flex-start',
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
  topWideBarScroll: {
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#E2E8F0',
  },
  topWideBarScrollContent: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 6,
    paddingHorizontal: Spacing.marginMobile,
    gap: 8,
  },
  topBarLeftItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  topBarMascot: {
    width: 34,
    height: 34,
    borderRadius: 17,
  },
  badgePill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#FFF0F0',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#FECDD3',
  },
  badgePillText: {
    ...Typography.labelLg,
    color: '#B30000',
    fontSize: 11,
    fontFamily: 'Inter-Bold',
    letterSpacing: 0.5,
  },
  topActionsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    flexWrap: 'wrap',
  },
  topActionChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#F8FAFC',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  topActionChipText: {
    ...Typography.labelLg,
    color: '#1E293B',
    fontSize: 12,
    fontFamily: 'Inter-SemiBold',
  },
  topActionMapChip: {
    backgroundColor: '#FEF3C7',
    borderColor: '#FDE68A',
  },
  topActionMapText: {
    ...Typography.labelLg,
    color: '#92400E',
    fontSize: 12,
    fontFamily: 'Inter-Bold',
  },
});

export default HomeScreen;
