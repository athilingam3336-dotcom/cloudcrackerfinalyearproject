import React, { useState, useCallback, useMemo } from 'react';
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
import { useWishlistStore, useCartStore, useNotificationStore } from '@/store';
import { ProductItem, CategoryItem, MOCK_CATEGORIES } from '@/constants/mockData';
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
  const categoryIdParam = route.params?.categoryId;
  const initialQuery = route.params?.query || '';

  const [searchQuery, setSearchQuery] = useState(initialQuery);
  const [selectedFilterChip, setSelectedFilterChip] = useState<string>('ALL');
  const [sortBy, setSortBy] = useState<SortOption>('BEST_SELLING');
  const [showSortDropdown, setShowSortDropdown] = useState(false);

  const [products, setProducts] = useState<ProductItem[]>([]);
  const [categories, setCategories] = useState<CategoryItem[]>(MOCK_CATEGORIES);
  const [isLoading, setIsLoading] = useState(true);

  const { wishlistItems, toggleWishlist } = useWishlistStore();
  const addToCart = useCartStore((state) => state.addToCart);
  const unreadNotifs = useNotificationStore((state) => state.getUnreadCount());

  const [screenWidth, setScreenWidth] = useState(Dimensions.get('window').width);
  const numColumns = useMemo(() => getNumColumns(screenWidth), [screenWidth]);

  // Load categories from API / cache
  React.useEffect(() => {
    let isMounted = true;
    productService.getCategories().then((data) => {
      if (isMounted && data.length > 0) {
        setCategories(data);
      }
    });
    return () => {
      isMounted = false;
    };
  }, []);

  // Fetch products
  React.useEffect(() => {
    let isMounted = true;
    setIsLoading(true);
    // If search is a promotional banner tag (like 'Special Edition', 'Grand Finale', 'New Arrival'), pass empty search to API
    const apiSearch =
      searchQuery.toLowerCase() === 'special edition' ||
      searchQuery.toLowerCase() === 'grand finale' ||
      searchQuery.toLowerCase() === 'new arrival'
        ? undefined
        : searchQuery;

    productService.getProducts(categoryIdParam, apiSearch).then((data) => {
      if (isMounted) {
        setProducts(data);
        setIsLoading(false);
      }
    });
    return () => {
      isMounted = false;
    };
  }, [categoryIdParam, searchQuery]);

  const [currentPage, setCurrentPage] = useState(1);
  const PAGE_SIZE = 8;

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
          'Experience professional-grade pyrotechnics with our curated selection of high-altitude display shells and synchronized multi-shot cakes.',
      };
    }
    const cat = categories.find((c) => c.id === categoryIdParam) || MOCK_CATEGORIES.find((c) => c.id === categoryIdParam);
    return {
      name: cat ? cat.name : 'Pyrotechnics Catalog',
      description: cat
        ? cat.description || 'Explore top-tier fireworks and spectacular celebration items.'
        : 'Explore top-tier fireworks and spectacular celebration items.',
    };
  }, [categoryIdParam, categories]);

  // Wishlist toggle handler
  const handleToggleWishlist = useCallback(
    (product: ProductItem) => {
      toggleWishlist(product);
    },
    [toggleWishlist]
  );

  // Filtered and Sorted Products dataset
  const filteredAndSortedProducts = useMemo(() => {
    let result = products.filter((product) => {
      // Search query match
      const q = searchQuery.trim().toLowerCase();
      let matchesSearch = true;
      if (
        q &&
        q !== 'special edition' &&
        q !== 'grand finale' &&
        q !== 'new arrival'
      ) {
        matchesSearch =
          (product.title || '').toLowerCase().includes(q) ||
          (product.subtitle || '').toLowerCase().includes(q) ||
          (product.category || '').toLowerCase().includes(q);
      }

      // Chip filter match
      let matchesChip = true;
      const titleLower = (product.title || '').toLowerCase();
      const subLower = (product.subtitle || '').toLowerCase();
      const catLower = (product.category || '').toLowerCase();

      if (selectedFilterChip === 'ROCKETS') {
        matchesChip =
          titleLower.includes('rocket') ||
          subLower.includes('rocket') ||
          subLower.includes('flare') ||
          catLower.includes('rocket');
      } else if (selectedFilterChip === 'SPARKLERS') {
        matchesChip =
          titleLower.includes('sparkler') ||
          subLower.includes('sparkler') ||
          catLower.includes('sparkler');
      } else if (selectedFilterChip === 'POTS & FOUNTAINS') {
        matchesChip =
          titleLower.includes('pot') ||
          titleLower.includes('fountain') ||
          subLower.includes('pot') ||
          subLower.includes('fountain') ||
          catLower.includes('pot');
      } else if (selectedFilterChip === 'BOMBS') {
        matchesChip =
          titleLower.includes('bomb') ||
          subLower.includes('bomb') ||
          subLower.includes('hydro') ||
          titleLower.includes('sound') ||
          catLower.includes('bomb') ||
          catLower.includes('sound');
      } else if (selectedFilterChip === 'MULTI-SHOT') {
        matchesChip =
          titleLower.includes('shot') ||
          subLower.includes('shot') ||
          titleLower.includes('cake') ||
          titleLower.includes('barrage') ||
          catLower.includes('aerial') ||
          catLower.includes('shot');
      } else if (selectedFilterChip === 'ON SALE') {
        matchesChip =
          Boolean(product.originalPrice && product.originalPrice > product.price) ||
          (product.badge || '').toLowerCase().includes('sale') ||
          (product.badge || '').toLowerCase().includes('off');
      }

      return matchesSearch && matchesChip;
    });

    // Sort logic
    const sorted = [...result];
    sorted.sort((a, b) => {
      const priceA = typeof a.price === 'number' ? a.price : parseFloat(a.price as any) || 0;
      const priceB = typeof b.price === 'number' ? b.price : parseFloat(b.price as any) || 0;
      const ratingA = typeof a.rating === 'number' ? a.rating : parseFloat(a.rating as any) || 0;
      const ratingB = typeof b.rating === 'number' ? b.rating : parseFloat(b.rating as any) || 0;

      if (sortBy === 'PRICE_LOW_HIGH') {
        return priceA - priceB;
      }
      if (sortBy === 'PRICE_HIGH_LOW') {
        return priceB - priceA;
      }
      if (sortBy === 'RATING') {
        return ratingB - ratingA;
      }
      if (sortBy === 'NEWEST') {
        return (b.reviewCount || 0) - (a.reviewCount || 0);
      }
      // Default: Best Selling / Popular
      return ratingB * (b.reviewCount || 1) - ratingA * (a.reviewCount || 1);
    });

    return sorted;
  }, [products, searchQuery, selectedFilterChip, sortBy]);

  // Paginated dataset
  const totalPages = Math.max(1, Math.ceil(filteredAndSortedProducts.length / PAGE_SIZE));
  const currentPageSafe = Math.min(currentPage, totalPages);
  const paginatedProducts = useMemo(() => {
    const start = (currentPageSafe - 1) * PAGE_SIZE;
    return filteredAndSortedProducts.slice(start, start + PAGE_SIZE);
  }, [filteredAndSortedProducts, currentPageSafe, PAGE_SIZE]);

  // Navigation handlers
  const handleProductPress = useCallback(
    (productId: string) => {
      navigation.navigate('ProductDetails', { productId });
    },
    [navigation]
  );

  const handleAddToCart = useCallback((productTitle: string) => {
    Alert.alert('Cart Updated', `"${productTitle}" added to shopping cart.`);
  }, []);

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
          isWishlisted={wishlistItems.some((w) => w.id === item.id)}
          onPress={() => handleProductPress(item.id)}
          onAddToCart={() => addToCart(item, 1)}
          onWishlistToggle={() => handleToggleWishlist(item)}
        />
      </View>
    ),
    [wishlistItems, handleProductPress, addToCart, handleToggleWishlist]
  );

  // List Header Component with Category info and Sorting
  const renderHeader = useMemo(() => {
    return (
      <View style={styles.headerWrapper}>
        <HomeHeader
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

        {/* Breadcrumb Navigation */}
        <View style={styles.breadcrumbContainer}>
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

        {/* Category Filter Chips */}
        <View style={styles.filterSection}>
          <Text style={styles.sortHeaderLabel}>FILTER COLLECTION:</Text>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.filterChipsContent}
          >
            {['ALL', 'ROCKETS', 'SPARKLERS', 'POTS & FOUNTAINS', 'BOMBS', 'MULTI-SHOT', 'ON SALE'].map((chip) => {
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
      </View>
    );
  }, [
    searchQuery,
    currentCategory,
    filteredAndSortedProducts.length,
    selectedFilterChip,
    sortBy,
    unreadNotifs,
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
          onPress={() => setCurrentPage((p) => Math.max(1, p - 1))}
          disabled={currentPageSafe === 1}
        >
          <MaterialIcons name="chevron-left" size={20} color={Colors.onSurface} />
        </TouchableOpacity>

        {pages.map((page) => (
          <TouchableOpacity
            key={page}
            style={[styles.pageButton, currentPageSafe === page && styles.activePageButton]}
            onPress={() => setCurrentPage(page)}
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
          onPress={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
          disabled={currentPageSafe === totalPages}
        >
          <MaterialIcons name="chevron-right" size={20} color={Colors.onSurface} />
        </TouchableOpacity>
      </View>
    );
  }, [currentPageSafe, totalPages]);

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
          data={paginatedProducts}
          key={numColumns}
          numColumns={numColumns}
          keyExtractor={(item) => item.id}
          renderItem={renderProductItem}
          ListHeaderComponent={renderHeader}
          ListFooterComponent={renderFooter}
          ListEmptyComponent={renderEmptyState}
          columnWrapperStyle={paginatedProducts.length > 0 ? styles.gridRow : undefined}
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
