import React, { useState, useCallback, useMemo, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  Dimensions,
  ListRenderItem,
  Alert,
  ScrollView,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { MaterialIcons } from '@expo/vector-icons';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { Colors } from '@/constants/colors';
import { Typography } from '@/constants/typography';
import { Spacing, BorderRadius } from '@/constants/spacing';
import { HomeHeader } from '@/components/common/HomeHeader';
import { SearchBar } from '@/components/inputs/SearchBar';
import { ProductCard } from '@/components/cards/ProductCard';
import { BottomNavBar, TabRoute } from '@/components/common/BottomNavBar';
import { LoadingSpinner } from '@/components/loaders/LoadingSpinner';
import { productService } from '@/services/productService';
import { useWishlistStore, useCartStore, useNotificationStore, useAuthStore, useProductStore } from '@/store';
import { ProductItem, CategoryItem, MOCK_CATEGORIES, MOCK_PRODUCTS } from '@/constants/mockData';
import { RootStackParamList } from '@/navigation/types';

type ProductListingScreenProps = NativeStackScreenProps<
  RootStackParamList,
  'ProductListing'
>;

type SortOption = 'BEST_SELLING' | 'PRICE_LOW_HIGH' | 'PRICE_HIGH_LOW' | 'NEWEST' | 'RATING';

const getNumColumns = (width: number) => {
  if (width >= 1024) return 5;
  if (width >= 768) return 4;
  if (width >= 600) return 3;
  return 2;
};

export const ProductListingScreen: React.FC<ProductListingScreenProps> = ({
  navigation,
  route,
}) => {
  const flatListRef = useRef<FlatList>(null);
  const categoryIdParam = route.params?.categoryId || 'all';
  const initialQuery = route.params?.query || '';

  const listingState = useProductStore((state) => state.listingState);
  const setListingState = useProductStore((state) => state.setListingState);
  const storeProducts = useProductStore((state) => state.products);
  const setStoreProducts = useProductStore((state) => state.setProducts);

  const isSameCategory = listingState.categoryId === categoryIdParam;

  const [searchQuery, setSearchQuery] = useState(() =>
    initialQuery || (isSameCategory ? listingState.searchQuery : '')
  );
  const [selectedFilterChip, setSelectedFilterChip] = useState<string>(() =>
    isSameCategory ? listingState.selectedFilterChip : 'ALL'
  );
  const [sortBy, setSortBy] = useState<SortOption>(() =>
    (isSameCategory ? listingState.sortBy : 'BEST_SELLING') as SortOption
  );
  const [showSortDropdown, setShowSortDropdown] = useState(false);

  const [products, setProducts] = useState<ProductItem[]>(() =>
    storeProducts.length > 0 ? storeProducts : MOCK_PRODUCTS
  );
  const [categories, setCategories] = useState<CategoryItem[]>(MOCK_CATEGORIES);
  const [isLoading, setIsLoading] = useState(false);

  const { wishlistItems, toggleWishlist } = useWishlistStore();
  const addToCart = useCartStore((state) => state.addToCart);
  const unreadNotifs = useNotificationStore((state) => state.getUnreadCount());

  const [screenWidth, setScreenWidth] = useState(Dimensions.get('window').width);
  const numColumns = useMemo(() => getNumColumns(screenWidth), [screenWidth]);

  const [currentPage, setCurrentPage] = useState(() =>
    isSameCategory ? listingState.currentPage : 1
  );
  const PAGE_SIZE = 8;

  // Persist state to Zustand store whenever user changes filter, sort, search, or page
  React.useEffect(() => {
    setListingState({
      searchQuery,
      selectedFilterChip,
      sortBy,
      currentPage,
      categoryId: categoryIdParam,
    });
  }, [searchQuery, selectedFilterChip, sortBy, currentPage, categoryIdParam, setListingState]);

  // Fetch latest products from API / Service on mount
  React.useEffect(() => {
    let isMounted = true;
    productService.getProducts().then((data) => {
      if (isMounted && data && data.length > 0) {
        setProducts(data);
        setStoreProducts(data);
      }
    }).catch(() => {});

    productService.getCategories().then((cats) => {
      if (isMounted && cats && cats.length > 0) {
        setCategories(cats);
      }
    }).catch(() => {});

    return () => {
      isMounted = false;
    };
  }, [setStoreProducts]);

  const handlePageChange = useCallback((newPage: number) => {
    setCurrentPage(newPage);
    flatListRef.current?.scrollToOffset({ offset: 0, animated: true });
  }, []);

  // Reset page on search or filter change
  React.useEffect(() => {
    setCurrentPage(1);
  }, [searchQuery, selectedFilterChip, sortBy, categoryIdParam]);

  // Current category metadata
  const currentCategory = useMemo(() => {
    if (!categoryIdParam || categoryIdParam === 'all') {
      return {
        name: 'Pro Showstoppers',
        description:
          'Explore top-tier Sivakasi fireworks and spectacular celebration items.',
      };
    }
    const cat = categories.find(
      (c) => c.id === categoryIdParam || c.name.toLowerCase() === categoryIdParam.toLowerCase()
    );
    return {
      name: cat ? cat.name : 'Pyrotechnics Catalog',
      description: cat
        ? cat.description || 'Explore top-tier fireworks and spectacular celebration items.'
        : 'Explore top-tier fireworks and spectacular celebration items.',
    };
  }, [categoryIdParam, categories]);

  const isAuthenticated = useAuthStore((state) => state.isAuthenticated);

  // Wishlist toggle handler
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

  // Filtered and Sorted Products dataset
  const filteredAndSortedProducts = useMemo(() => {
    const allItems = products.length > 0 ? products : MOCK_PRODUCTS;

    // Determine category constraint from URL route param if set
    let categoryConstraintName = '';
    if (categoryIdParam && categoryIdParam !== 'all') {
      const foundCat = categories.find(
        (c) => c.id === categoryIdParam || c.name.toLowerCase() === categoryIdParam.toLowerCase()
      );
      if (foundCat) {
        categoryConstraintName = foundCat.name.toLowerCase();
      } else {
        categoryConstraintName = String(categoryIdParam).toLowerCase();
      }
    }

    const result = allItems.filter((product) => {
      const titleLower = (product.title || '').toLowerCase();
      const subLower = (product.subtitle || '').toLowerCase();
      const catLower = (product.category || '').toLowerCase();

      // 1. Primary Category Filter (from URL / navigation route param)
      if (categoryIdParam && categoryIdParam !== 'all') {
        const catId = String(categoryIdParam).toLowerCase();
        let matchesCat = false;

        if (catLower === catId || product.id === catId) {
          matchesCat = true;
        } else if (categoryConstraintName.includes('gift')) {
          matchesCat =
            titleLower.includes('gift') ||
            subLower.includes('gift') ||
            catLower.includes('gift');
        } else if (categoryConstraintName.includes('pot') || categoryConstraintName.includes('fountain')) {
          matchesCat =
            titleLower.includes('pot') ||
            titleLower.includes('fountain') ||
            subLower.includes('pot') ||
            catLower.includes('pot');
        } else if (categoryConstraintName.includes('sparkler')) {
          matchesCat = titleLower.includes('sparkler') || catLower.includes('sparkler');
        } else if (categoryConstraintName.includes('rocket')) {
          matchesCat = titleLower.includes('rocket') || catLower.includes('rocket');
        } else if (
          categoryConstraintName.includes('bomb') ||
          categoryConstraintName.includes('sound') ||
          categoryConstraintName.includes('bijili')
        ) {
          matchesCat =
            titleLower.includes('bomb') ||
            titleLower.includes('sound') ||
            titleLower.includes('bijili') ||
            catLower.includes('bomb');
        } else if (categoryConstraintName.includes('shot') || categoryConstraintName.includes('aerial')) {
          matchesCat =
            titleLower.includes('shot') ||
            titleLower.includes('cake') ||
            catLower.includes('shot') ||
            catLower.includes('aerial');
        } else if (categoryConstraintName.includes('chakkar') || categoryConstraintName.includes('wheel')) {
          matchesCat =
            titleLower.includes('chakkar') ||
            titleLower.includes('wheel') ||
            catLower.includes('chakkar');
        } else if (categoryConstraintName.includes('kid')) {
          matchesCat =
            titleLower.includes('kid') ||
            titleLower.includes('pencil') ||
            subLower.includes('kid') ||
            catLower.includes('kid');
        } else {
          matchesCat =
            catLower.includes(categoryConstraintName) ||
            titleLower.includes(categoryConstraintName);
        }

        if (!matchesCat) return false;
      }

      // 2. Search Query filter
      const q = searchQuery.trim().toLowerCase();
      if (q && q !== 'special edition' && q !== 'grand finale' && q !== 'new arrival') {
        const matchesSearch =
          titleLower.includes(q) ||
          subLower.includes(q) ||
          catLower.includes(q);
        if (!matchesSearch) return false;
      }

      // 3. Sub-filter chip match (e.g. MORNING, NIGHT, ON SALE)
      if (selectedFilterChip === '☀️ MORNING') {
        const tod = (product as any).timeOfDay || (product as any).time_of_day;
        if (tod === 'night') return false;
        if (tod === 'morning' || tod === 'both') return true;

        const isMorning =
          titleLower.includes('sparkler') ||
          titleLower.includes('bomb') ||
          titleLower.includes('chakkar') ||
          titleLower.includes('bijili') ||
          titleLower.includes('sound') ||
          titleLower.includes('pencil') ||
          catLower.includes('sparkler') ||
          catLower.includes('bomb') ||
          catLower.includes('chakkar') ||
          catLower.includes('bijili') ||
          catLower.includes('kid');
        if (!isMorning) return false;
      } else if (selectedFilterChip === '🌙 NIGHT') {
        const tod = (product as any).timeOfDay || (product as any).time_of_day;
        if (tod === 'morning') return false;
        if (tod === 'night' || tod === 'both') return true;

        const isNight =
          titleLower.includes('rocket') ||
          titleLower.includes('pot') ||
          titleLower.includes('fountain') ||
          titleLower.includes('shot') ||
          titleLower.includes('cake') ||
          titleLower.includes('gift') ||
          catLower.includes('rocket') ||
          catLower.includes('pot') ||
          catLower.includes('shot') ||
          catLower.includes('aerial') ||
          catLower.includes('gift');
        if (!isNight) return false;
      } else if (selectedFilterChip === '✨ DAY & NIGHT' || selectedFilterChip === '✨ BOTH TIME') {
        const tod = (product as any).timeOfDay || (product as any).time_of_day;
        if (tod === 'both') return true;
        const isBoth =
          titleLower.includes('sparkler') ||
          titleLower.includes('chakkar') ||
          titleLower.includes('garland') ||
          titleLower.includes('combo') ||
          titleLower.includes('family') ||
          catLower.includes('sparkler') ||
          catLower.includes('chakkar') ||
          catLower.includes('combo');
        if (!isBoth) return false;
      } else if (selectedFilterChip === 'ON SALE') {
        const isSale =
          Boolean(product.originalPrice && product.originalPrice > product.price) ||
          (product.badge || '').toLowerCase().includes('sale') ||
          (product.badge || '').toLowerCase().includes('off');
        if (!isSale) return false;
      }

      return true;
    });

    // Sort logic
    const sorted = [...result];
    sorted.sort((a, b) => {
      const priceA = typeof a.price === 'number' ? a.price : parseFloat(a.price as any) || 0;
      const priceB = typeof b.price === 'number' ? b.price : parseFloat(b.price as any) || 0;
      const ratingA = typeof a.rating === 'number' ? a.rating : parseFloat(a.rating as any) || 0;
      const ratingB = typeof b.rating === 'number' ? b.rating : parseFloat(b.rating as any) || 0;

      if (sortBy === 'PRICE_LOW_HIGH') return priceA - priceB;
      if (sortBy === 'PRICE_HIGH_LOW') return priceB - priceA;
      if (sortBy === 'RATING') return ratingB - ratingA;
      if (sortBy === 'NEWEST') return (b.id || '').localeCompare(a.id || '');
      return 0;
    });

    return sorted;
  }, [products, categoryIdParam, categories, searchQuery, selectedFilterChip, sortBy]);

  // Paginated dataset
  const totalPages = Math.max(1, Math.ceil(filteredAndSortedProducts.length / PAGE_SIZE));
  const currentPageSafe = Math.min(currentPage, totalPages);
  const paginatedProducts = useMemo(() => {
    const start = (currentPageSafe - 1) * PAGE_SIZE;
    return filteredAndSortedProducts.slice(start, start + PAGE_SIZE);
  }, [filteredAndSortedProducts, currentPageSafe, PAGE_SIZE]);

  const formattedProducts = useMemo(() => {
    const data = [...paginatedProducts];
    if (data.length === 0) return data;
    const remainder = data.length % numColumns;
    if (remainder !== 0) {
      const missingCount = numColumns - remainder;
      for (let i = 0; i < missingCount; i++) {
        data.push({
          id: `placeholder-${i}`,
          title: '',
          category: '',
          price: 0,
          rating: 0,
          isPlaceholder: true,
        } as any);
      }
    }
    return data;
  }, [paginatedProducts, numColumns]);

  // Navigation handlers
  const handleProductPress = useCallback(
    (productId: string) => {
      navigation.navigate('ProductDetails', { productId });
    },
    [navigation]
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

  // Render individual product item in grid
  const renderProductItem: ListRenderItem<ProductItem> = useCallback(
    ({ item }) => {
      if ((item as any).isPlaceholder) {
        return <View style={styles.gridColumn} />;
      }
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
            isWishlisted={wishlistItems.some((w) => w.id === item.id)}
            onPress={() => handleProductPress(item.id)}
            onAddToCart={() => handleAddToCart(item)}
            onWishlistToggle={() => handleToggleWishlist(item)}
          />
        </View>
      );
    },
    [wishlistItems, handleProductPress, handleAddToCart, handleToggleWishlist]
  );

  // List Header Component with Category info and Sorting
  const renderHeader = useMemo(() => {
    return (
      <View style={styles.headerWrapper}>
        <HomeHeader
          onLogoPress={() => navigation.navigate('Home')}
          onBackPress={() => (navigation.canGoBack() ? navigation.goBack() : navigation.navigate('Home'))}
          onNotificationPress={() => navigation.navigate('Notifications')}
          onProfilePress={() => navigation.navigate('UserProfile')}
          onCartPress={() => navigation.navigate('Cart')}
          notificationCount={unreadNotifs}
        />

        {/* Search Bar */}
        <SearchBar
          value={searchQuery}
          onChangeText={setSearchQuery}
          onClear={() => setSearchQuery('')}
          placeholder="Search items in this collection..."
        />

        {/* Breadcrumb Navigation with Back Button */}
        <View style={styles.breadcrumbContainer}>
          <TouchableOpacity
            style={styles.backButtonRow}
            onPress={() => (navigation.canGoBack() ? navigation.goBack() : navigation.navigate('Home'))}
            activeOpacity={0.7}
          >
            <MaterialIcons name="arrow-back" size={18} color={Colors.primary} />
            <Text style={styles.backButtonText}>Back</Text>
          </TouchableOpacity>

          <Text style={styles.breadcrumbDivider}>|</Text>

          <TouchableOpacity onPress={() => navigation.navigate('Home')} activeOpacity={0.7}>
            <Text style={styles.breadcrumbLink}>HOME</Text>
          </TouchableOpacity>
          <MaterialIcons name="chevron-right" size={16} color={Colors.tertiary} />
          <TouchableOpacity onPress={() => navigation.navigate('Categories')} activeOpacity={0.7}>
            <Text style={styles.breadcrumbLink}>CATEGORIES</Text>
          </TouchableOpacity>
          <MaterialIcons name="chevron-right" size={16} color={Colors.tertiary} />
          <Text style={styles.breadcrumbActive}>{currentCategory.name.toUpperCase()}</Text>
        </View>

        {/* Category Info Header */}
        <View style={styles.categoryTitleRow}>
          <View style={styles.categoryTextWrapper}>
            <Text style={styles.categoryTitle}>{currentCategory.name}</Text>
            <Text style={styles.categoryDescription}>{currentCategory.description}</Text>
          </View>
          <View style={styles.productCountBadge}>
            <Text style={styles.productCountText}>
              {filteredAndSortedProducts.length} {filteredAndSortedProducts.length === 1 ? 'PRODUCT' : 'PRODUCTS'}
            </Text>
          </View>
        </View>

        {/* Sort Bar (Low to High, High to Low, Top Rated, etc.) */}
        <View style={styles.sortSection}>
          <Text style={styles.sortHeaderLabel}>SORT BY PRICE & POPULARITY:</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.sortRow}>
            {[
              { label: '🔥 Best Selling', value: 'BEST_SELLING' },
              { label: '💰 Price: Low to High', value: 'PRICE_LOW_HIGH' },
              { label: '💎 Price: High to Low', value: 'PRICE_HIGH_LOW' },
              { label: '⭐ Top Rated', value: 'RATING' },
              { label: '🆕 Newest', value: 'NEWEST' },
            ].map((opt) => {
              const isSelected = sortBy === opt.value;
              return (
                <TouchableOpacity
                  key={opt.value}
                  style={[styles.sortChip, isSelected && styles.sortChipActive]}
                  onPress={() => setSortBy(opt.value as SortOption)}
                  activeOpacity={0.8}
                >
                  <Text style={[styles.sortChipText, isSelected && styles.sortChipTextActive]}>
                    {opt.label}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </ScrollView>
        </View>

        {/* Category Filter Chips (Rendered only when viewing All Pyrotechnics) */}
        {(!categoryIdParam || categoryIdParam === 'all') && (
          <View style={styles.filterSection}>
            <Text style={styles.sortHeaderLabel}>FILTER COLLECTION:</Text>
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.filterChipsContent}
            >
              {['ALL', '☀️ MORNING', '🌙 NIGHT', '✨ DAY & NIGHT', 'ROCKETS', 'SPARKLERS', 'POTS & FOUNTAINS', 'BOMBS', 'MULTI-SHOT', 'ON SALE'].map((chip) => {
                const isSelected = selectedFilterChip === chip;
                return (
                  <TouchableOpacity
                    key={chip}
                    style={[
                      styles.chipButton,
                      isSelected && styles.activeChipButton,
                    ]}
                    onPress={() => setSelectedFilterChip(chip)}
                    activeOpacity={0.8}
                  >
                    <Text
                      style={[
                        styles.chipText,
                        isSelected && styles.activeChipText,
                      ]}
                    >
                      {chip}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </ScrollView>
          </View>
        )}
      </View>
    );
  }, [
    searchQuery,
    currentCategory,
    filteredAndSortedProducts.length,
    selectedFilterChip,
    sortBy,
    unreadNotifs,
    categoryIdParam,
    navigation,
  ]);

  // List Footer Component (Pagination Controls)
  const renderFooter = useMemo(() => {
    if (totalPages <= 1) {
      return null;
    }

    const pages = Array.from({ length: totalPages }, (_, i) => i + 1);

    return (
      <View style={styles.paginationContainer}>
        <TouchableOpacity
          style={[styles.pageButton, currentPageSafe === 1 && styles.disabledPageButton]}
          onPress={() => handlePageChange(Math.max(1, currentPageSafe - 1))}
          disabled={currentPageSafe === 1}
        >
          <MaterialIcons name="chevron-left" size={20} color={Colors.onSurface} />
        </TouchableOpacity>

        {pages.map((page) => (
          <TouchableOpacity
            key={page}
            style={[styles.pageButton, currentPageSafe === page && styles.activePageButton]}
            onPress={() => handlePageChange(page)}
          >
            <Text
              style={[
                styles.pageText,
                currentPageSafe === page && styles.activePageText,
              ]}
            >
              {page}
            </Text>
          </TouchableOpacity>
        ))}

        <TouchableOpacity
          style={[styles.pageButton, currentPageSafe === totalPages && styles.disabledPageButton]}
          onPress={() => handlePageChange(Math.min(totalPages, currentPageSafe + 1))}
          disabled={currentPageSafe === totalPages}
        >
          <MaterialIcons name="chevron-right" size={20} color={Colors.onSurface} />
        </TouchableOpacity>
      </View>
    );
  }, [currentPageSafe, totalPages, handlePageChange]);

  const renderEmptyState = useMemo(() => {
    if (isLoading) return null;
    return (
      <View style={{ alignItems: 'center', padding: 40 }}>
        <MaterialIcons name="search-off" size={48} color={Colors.tertiary} />
        <Text style={{ ...Typography.titleLg, color: Colors.onSurface, marginTop: 12 }}>
          No Pyrotechnics Found
        </Text>
        <Text style={{ ...Typography.bodyMd, color: Colors.onSurfaceVariant, textAlign: 'center', marginTop: 4 }}>
          Try clearing your search query or selecting a different filter category.
        </Text>
        <TouchableOpacity
          style={{
            marginTop: 16,
            backgroundColor: Colors.primary,
            paddingHorizontal: 20,
            paddingVertical: 10,
            borderRadius: BorderRadius.full,
          }}
          onPress={() => {
            setSearchQuery('');
            setSelectedFilterChip('ALL');
            navigation.setParams({ categoryId: undefined, query: undefined });
          }}
        >
          <Text style={{ ...Typography.labelLg, color: '#ffffff' }}>Clear Filters</Text>
        </TouchableOpacity>
      </View>
    );
  }, [isLoading]);

  return (
    <SafeAreaView style={styles.safeArea} edges={['top', 'left', 'right']}>
      {isLoading ? (
        <View style={{ flex: 1 }}>
          {renderHeader}
          <LoadingSpinner message="Loading pyrotechnics collection..." />
        </View>
      ) : (
        <FlatList
          ref={flatListRef}
          data={formattedProducts}
          key={numColumns}
          numColumns={numColumns}
          keyExtractor={(item) => item.id}
          renderItem={renderProductItem}
          ListHeaderComponent={renderHeader}
          ListFooterComponent={renderFooter}
          ListEmptyComponent={renderEmptyState}
          columnWrapperStyle={formattedProducts.length > 0 ? styles.gridRow : undefined}
          contentContainerStyle={styles.listContent}
          showsVerticalScrollIndicator={false}
          initialNumToRender={6}
          maxToRenderPerBatch={10}
          windowSize={5}
        />
      )}

      {/* Reusable Bottom Navigation */}
      <BottomNavBar activeTab="Categories" onTabPress={handleTabPress} />
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
  breadcrumbContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: Spacing.marginMobile,
    paddingTop: Spacing.sm,
    gap: 4,
    flexWrap: 'wrap',
  },
  backButtonRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
    paddingRight: 4,
  },
  backButtonText: {
    ...Typography.labelLg,
    fontSize: 11,
    fontFamily: 'Inter-Bold',
    color: Colors.primary,
  },
  breadcrumbDivider: {
    fontSize: 11,
    color: Colors.surfaceContainerHighest,
    marginHorizontal: 4,
  },
  breadcrumbLink: {
    ...Typography.labelLg,
    fontSize: 10,
    fontFamily: 'Inter-Bold',
    color: Colors.tertiary,
  },
  breadcrumbActive: {
    ...Typography.labelLg,
    fontSize: 10,
    fontFamily: 'Inter-Bold',
    color: Colors.primary,
  },
  categoryTitleRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    paddingHorizontal: Spacing.marginMobile,
    marginTop: Spacing.xs,
    marginBottom: Spacing.sm,
  },
  categoryTextWrapper: {
    flex: 1,
    paddingRight: Spacing.sm,
  },
  categoryTitle: {
    ...Typography.headlineLg,
    fontSize: 24,
    fontFamily: 'Inter-Bold',
    color: Colors.onSurface,
  },
  categoryDescription: {
    ...Typography.bodyMd,
    fontSize: 13,
    color: Colors.onSurfaceVariant,
    marginTop: 4,
  },
  productCountBadge: {
    backgroundColor: Colors.surfaceContainerHigh,
    paddingHorizontal: Spacing.sm,
    paddingVertical: 6,
    borderRadius: BorderRadius.lg,
  },
  productCountText: {
    ...Typography.labelLg,
    fontSize: 10,
    fontFamily: 'Inter-Bold',
    color: Colors.onSurfaceVariant,
  },
  filterSortContainer: {
    borderTopWidth: 1,
    borderBottomWidth: 1,
    borderColor: Colors.surfaceContainerHigh,
    paddingVertical: Spacing.xs,
    backgroundColor: Colors.background,
    zIndex: 100,
  },
  sortSection: {
    paddingHorizontal: Spacing.marginMobile,
    marginBottom: Spacing.xs,
  },
  filterSection: {
    paddingHorizontal: Spacing.marginMobile,
    marginBottom: Spacing.sm,
  },
  sortHeaderLabel: {
    ...Typography.labelLg,
    fontSize: 10,
    fontFamily: 'Inter-Bold',
    color: Colors.tertiary,
    marginBottom: 6,
    letterSpacing: 0.5,
  },
  sortRow: {
    alignItems: 'center',
    gap: Spacing.xs,
    paddingVertical: 2,
  },
  sortChip: {
    paddingHorizontal: Spacing.md,
    paddingVertical: 8,
    borderRadius: BorderRadius.full,
    backgroundColor: Colors.surfaceContainerLow,
    borderWidth: 1,
    borderColor: Colors.surfaceContainerHigh,
  },
  sortChipActive: {
    backgroundColor: Colors.primary,
    borderColor: Colors.primary,
  },
  sortChipText: {
    ...Typography.labelLg,
    fontSize: 11,
    fontFamily: 'Inter-Medium',
    color: Colors.onSurfaceVariant,
  },
  sortChipTextActive: {
    fontFamily: 'Inter-Bold',
    color: '#ffffff',
  },
  filterChipsContent: {
    alignItems: 'center',
    gap: Spacing.xs,
    paddingVertical: 2,
  },
  chipButton: {
    paddingHorizontal: Spacing.md,
    paddingVertical: 8,
    borderRadius: BorderRadius.full,
    backgroundColor: Colors.surfaceContainerLow,
    borderWidth: 1,
    borderColor: Colors.surfaceContainerHigh,
  },
  activeChipButton: {
    backgroundColor: Colors.secondary,
    borderColor: Colors.secondary,
  },
  chipText: {
    ...Typography.labelLg,
    fontSize: 11,
    fontFamily: 'Inter-Medium',
    color: Colors.onSurfaceVariant,
  },
  activeChipText: {
    fontFamily: 'Inter-Bold',
    color: '#ffffff',
  },
  sortWrapper: {
    paddingHorizontal: Spacing.marginMobile,
    marginTop: Spacing.xs,
    position: 'relative',
  },
  sortButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-end',
    gap: 4,
  },
  sortLabel: {
    ...Typography.labelLg,
    fontSize: 11,
    fontFamily: 'Inter-Bold',
    color: Colors.tertiary,
  },
  sortValue: {
    ...Typography.labelLg,
    fontSize: 11,
    fontFamily: 'Inter-Bold',
    color: Colors.primary,
  },
  sortDropdownMenu: {
    position: 'absolute',
    right: Spacing.marginMobile,
    top: 28,
    backgroundColor: Colors.surfaceContainerLowest,
    borderRadius: BorderRadius.lg,
    borderWidth: 1,
    borderColor: Colors.surfaceContainerHigh,
    shadowColor: Colors.shadowColor,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 10,
    elevation: 8,
    zIndex: 200,
    minWidth: 180,
  },
  sortOptionItem: {
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: Colors.surfaceContainerLow,
  },
  activeSortOptionItem: {
    backgroundColor: Colors.primaryFixed,
  },
  sortOptionText: {
    ...Typography.bodyMd,
    fontSize: 12,
    color: Colors.onSurface,
  },
  activeSortOptionText: {
    fontFamily: 'Inter-Bold',
    color: Colors.primary,
  },
  gridRow: {
    paddingHorizontal: Spacing.marginMobile,
    gap: Spacing.sm,
  },
  gridColumn: {
    flex: 1,
  },
  paginationContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: Spacing.lg,
    marginBottom: Spacing.md,
    gap: 8,
  },
  pageButton: {
    width: 38,
    height: 38,
    borderRadius: BorderRadius.full,
    borderWidth: 1,
    borderColor: Colors.surfaceContainerHigh,
    backgroundColor: Colors.surfaceContainerLowest,
    alignItems: 'center',
    justifyContent: 'center',
  },
  activePageButton: {
    backgroundColor: Colors.primary,
    borderColor: Colors.primary,
  },
  disabledPageButton: {
    opacity: 0.4,
  },
  pageText: {
    ...Typography.labelLg,
    fontSize: 12,
    fontFamily: 'Inter-Medium',
    color: Colors.onSurface,
  },
  activePageText: {
    fontFamily: 'Inter-Bold',
    color: '#ffffff',
  },
  pageEllipsis: {
    ...Typography.bodyMd,
    color: Colors.tertiary,
  },
});

export default ProductListingScreen;
