import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Image,
  TouchableOpacity,
  Alert,
  FlatList,
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
import { LoadingSpinner } from '@/components/loaders/LoadingSpinner';
import { productService } from '@/services/productService';
import { useWishlistStore, useCartStore, useNotificationStore, useAuthStore } from '@/store';
import { ProductItem } from '@/constants/mockData';
import { RootStackParamList } from '@/navigation/types';
import { formatCurrency } from '@/utils/currency';
import { getProductGalleryItems, resolveProductImage } from '@/constants/productImages';

type ProductDetailsScreenProps = NativeStackScreenProps<
  RootStackParamList,
  'ProductDetails'
>;

export const ProductDetailsScreen: React.FC<ProductDetailsScreenProps> = ({
  navigation,
  route,
}) => {
  const productIdParam = route.params?.productId;

  const [product, setProduct] = useState<ProductItem | null>(null);
  const [relatedProducts, setRelatedProducts] = useState<ProductItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [activeImageIndex, setActiveImageIndex] = useState(0);
  const [quantity, setQuantity] = useState(1);

  const { wishlistItems, toggleWishlist } = useWishlistStore();
  const addToCart = useCartStore((state) => state.addToCart);
  const unreadNotifs = useNotificationStore((state) => state.getUnreadCount());

  useEffect(() => {
    let isMounted = true;
    setIsLoading(true);

    if (productIdParam) {
      productService.getProductById(productIdParam).then((data) => {
        if (isMounted) {
          setProduct(data);
          setIsLoading(false);
          const cat = data?.category;
          productService.getProducts(cat, undefined, 5).then((all) => {
            if (isMounted) {
              setRelatedProducts(all.filter((p) => p.id !== productIdParam).slice(0, 4));
            }
          });
        }
      });
    } else {
      productService.getProducts(undefined, undefined, 5).then((all) => {
        if (isMounted && all.length > 0) {
          setProduct(all[0]);
          setRelatedProducts(all.slice(1, 5));
          setIsLoading(false);
        }
      });
    }

    return () => {
      isMounted = false;
    };
  }, [productIdParam]);

  const galleryItems = useMemo(() => {
    return getProductGalleryItems(product);
  }, [product]);

  const currentDisplayItem = useMemo(() => {
    if (galleryItems.length > 0 && activeImageIndex < galleryItems.length) {
      const item = galleryItems[activeImageIndex].itemData;
      return {
        id: item.id,
        title: item.title,
        subtitle: item.subtitle,
        category: product?.category || 'all',
        price: item.price,
        originalPrice: item.originalPrice,
        stock: item.stock,
        badge: item.badge,
        rating: item.rating,
        reviewCount: item.reviewCount,
        imageUrl: item.imageUrl,
        description: item.description,
      };
    }
    return (
      product || {
        id: 'prod_default',
        title: 'Pyrotechnic Item',
        subtitle: 'Festive item',
        category: 'all',
        price: 50.0,
        stock: 100,
        rating: 5.0,
        reviewCount: 128,
        description: 'Quality celebration item',
        imageUrl: undefined,
      }
    );
  }, [galleryItems, activeImageIndex, product]);

  const isWishlisted = useMemo(
    () => (currentDisplayItem ? wishlistItems.some((w) => w.id === currentDisplayItem.id || w.id === product?.id) : false),
    [wishlistItems, currentDisplayItem, product]
  );

  const isAuthenticated = useAuthStore((state) => state.isAuthenticated);

  const handleAddToCart = useCallback(async () => {
    if (!currentDisplayItem) return;
    if (!isAuthenticated) {
      Alert.alert('Sign In Required', 'Please log in to add items to your cart.', [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Sign In', onPress: () => navigation.navigate('Login') },
      ]);
      return;
    }
    try {
      await addToCart(currentDisplayItem, quantity);
      Alert.alert('Success', `${quantity}x "${currentDisplayItem.title}" added to your cart.`);
    } catch (err: any) {
      Alert.alert('Cart Error', err?.message || 'Failed to add item to cart.');
    }
  }, [isAuthenticated, quantity, currentDisplayItem, addToCart, navigation]);

  const handleBuyNow = useCallback(async () => {
    if (!currentDisplayItem) return;
    if (!isAuthenticated) {
      Alert.alert('Sign In Required', 'Please log in to purchase items.', [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Sign In', onPress: () => navigation.navigate('Login') },
      ]);
      return;
    }
    try {
      await addToCart(currentDisplayItem, quantity);
      navigation.navigate('Checkout');
    } catch (err: any) {
      Alert.alert('Cart Error', err?.message || 'Failed to proceed to checkout.');
    }
  }, [isAuthenticated, navigation, currentDisplayItem, quantity, addToCart]);

  const handleToggleWishlist = useCallback(async () => {
    if (!currentDisplayItem) return;
    if (!isAuthenticated) {
      Alert.alert('Sign In Required', 'Please log in to manage your wishlist.', [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Sign In', onPress: () => navigation.navigate('Login') },
      ]);
      return;
    }
    try {
      const isAdded = await toggleWishlist(currentDisplayItem);
      if (isAdded) {
        Alert.alert('Wishlist Updated', `"${currentDisplayItem.title}" added to your wishlist.`);
      }
    } catch (err: any) {
      Alert.alert('Wishlist Error', err?.message || 'Failed to update wishlist.');
    }
  }, [isAuthenticated, currentDisplayItem, toggleWishlist, navigation]);

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

  if (isLoading || !product) {
    return (
      <SafeAreaView style={styles.safeArea} edges={['top', 'left', 'right']}>
        <HomeHeader
          onNotificationPress={() => navigation.navigate('Notifications')}
          onProfilePress={() => navigation.navigate('UserProfile')}
          onCartPress={() => navigation.navigate('Cart')}
          notificationCount={unreadNotifs}
        />
        <LoadingSpinner message="Loading pyrotechnics specs..." />
        <BottomNavBar activeTab="Home" onTabPress={(tab) => navigation.navigate(tab as any)} />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safeArea} edges={['top', 'left', 'right']}>
      {/* Header Bar with Back Button */}
      <HomeHeader
        onBackPress={() => (navigation.canGoBack() ? navigation.goBack() : navigation.navigate('Home'))}
        onNotificationPress={() => navigation.navigate('Notifications')}
        onProfilePress={() => navigation.navigate('UserProfile')}
        onCartPress={() => navigation.navigate('Cart')}
        notificationCount={unreadNotifs}
      />

      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
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

          <TouchableOpacity onPress={() => (navigation.canGoBack() ? navigation.goBack() : navigation.navigate('Home'))} activeOpacity={0.7}>
            <Text style={styles.breadcrumbLink}>Shop</Text>
          </TouchableOpacity>
          <MaterialIcons name="chevron-right" size={16} color={Colors.tertiary} />
          <TouchableOpacity onPress={() => (navigation.canGoBack() ? navigation.goBack() : navigation.navigate('Categories'))} activeOpacity={0.7}>
            <Text style={styles.breadcrumbLink}>{currentDisplayItem.category || product.category}</Text>
          </TouchableOpacity>
          <MaterialIcons name="chevron-right" size={16} color={Colors.tertiary} />
          <Text style={styles.breadcrumbActive} numberOfLines={1}>
            {currentDisplayItem.title}
          </Text>
        </View>

        {/* Hero Gallery Image */}
        <View style={styles.galleryContainer}>
          <View style={styles.mainImageWrapper}>
            <Image
              source={galleryItems[activeImageIndex]?.uri || resolveProductImage(product)}
              style={styles.mainImage}
              resizeMode="contain"
            />
            {currentDisplayItem.badge && (
              <View style={styles.badge}>
                <Text style={styles.badgeText}>{currentDisplayItem.badge}</Text>
              </View>
            )}
            <TouchableOpacity
              style={styles.wishlistButton}
              onPress={handleToggleWishlist}
              activeOpacity={0.8}
            >
              <MaterialIcons
                name={isWishlisted ? 'favorite' : 'favorite-border'}
                size={22}
                color={isWishlisted ? Colors.primary : Colors.onSurface}
              />
            </TouchableOpacity>
          </View>

          {/* Thumbnail Gallery Row */}
          <View style={styles.thumbnailRow}>
            {galleryItems.map((item, index) => (
              <TouchableOpacity
                key={index}
                style={[
                  styles.thumbnailWrapper,
                  activeImageIndex === index && styles.activeThumbnailWrapper,
                ]}
                onPress={() => setActiveImageIndex(index)}
                activeOpacity={0.8}
              >
                <Image source={item.uri} style={styles.thumbnailImage} resizeMode="cover" />
              </TouchableOpacity>
            ))}
          </View>
        </View>

        {/* Product Details Specs Section */}
        <View style={styles.detailsContainer}>
          <Text style={styles.title}>{currentDisplayItem.title}</Text>

          {/* Rating Summary */}
          <View style={styles.ratingRow}>
            <View style={styles.starsRow}>
              {[1, 2, 3, 4, 5].map((star) => (
                <MaterialIcons
                  key={star}
                  name="star"
                  size={18}
                  color={Colors.secondaryContainer}
                />
              ))}
            </View>
            <Text style={styles.ratingText}>
              {currentDisplayItem.rating.toFixed(1)} ({currentDisplayItem.reviewCount || 128} reviews)
            </Text>
          </View>

          {/* Price & Stock */}
          <View style={styles.priceRow}>
            <Text style={styles.price}>{formatCurrency(currentDisplayItem.price)}</Text>
            {currentDisplayItem.originalPrice && (
              <Text style={styles.originalPrice}>{formatCurrency(currentDisplayItem.originalPrice)}</Text>
            )}
          </View>
          {currentDisplayItem.stock !== undefined && currentDisplayItem.stock <= 0 ? (
            <Text style={[styles.stockText, { color: '#dc2626', fontWeight: 'bold' }]}>
              Out of Stock • Back in stock soon
            </Text>
          ) : (
            <Text style={styles.stockText}>
              In Stock ({currentDisplayItem.stock ?? 100} available) • Ready to ship
            </Text>
          )}

          {/* Description */}
          <View style={styles.descriptionSection}>
            <Text style={styles.sectionHeader}>DESCRIPTION</Text>
            <Text style={styles.descriptionText}>
              {(currentDisplayItem as any).description || currentDisplayItem.subtitle}
            </Text>
          </View>

          {/* Quantity Selector */}
          <View style={styles.quantitySection}>
            <Text style={styles.sectionHeader}>QUANTITY</Text>
            <View style={styles.quantitySelector}>
              <TouchableOpacity
                style={styles.quantityBtn}
                onPress={() => setQuantity((q) => Math.max(1, q - 1))}
                activeOpacity={0.7}
                disabled={product.stock !== undefined && product.stock <= 0}
              >
                <MaterialIcons name="remove" size={20} color={Colors.onSurface} />
              </TouchableOpacity>
              <Text style={styles.quantityText}>{quantity}</Text>
              <TouchableOpacity
                style={styles.quantityBtn}
                onPress={() => setQuantity((q) => q + 1)}
                activeOpacity={0.7}
                disabled={product.stock !== undefined && product.stock <= 0}
              >
                <MaterialIcons name="add" size={20} color={Colors.onSurface} />
              </TouchableOpacity>
            </View>
          </View>

          {/* Action CTA Buttons */}
          <View style={styles.ctaRow}>
            <PrimaryButton
              title={product.stock !== undefined && product.stock <= 0 ? 'Out of Stock' : 'Add to Cart'}
              onPress={handleAddToCart}
              disabled={product.stock !== undefined && product.stock <= 0}
              style={styles.addToCartCta}
            />
            <PrimaryButton
              title="Buy Now"
              variant="secondary"
              onPress={handleBuyNow}
              disabled={product.stock !== undefined && product.stock <= 0}
              style={styles.buyNowCta}
            />
          </View>

          {/* Product Perks Row */}
          <View style={styles.perksRow}>
            <View style={styles.perkItem}>
              <MaterialIcons name="local-shipping" size={24} color={Colors.primary} />
              <View>
                <Text style={styles.perkTitle}>Free Delivery</Text>
                <Text style={styles.perkSubtitle}>Orders over {formatCurrency(1000)}</Text>
              </View>
            </View>
            <View style={styles.perkItem}>
              <MaterialIcons name="verified-user" size={24} color={Colors.primary} />
              <View>
                <Text style={styles.perkTitle}>Hazmat Safe</Text>
                <Text style={styles.perkSubtitle}>Certified Handling</Text>
              </View>
            </View>
          </View>
        </View>

        {/* Related Products Carousel Section */}
        <View style={styles.relatedSection}>
          <View style={styles.relatedHeaderRow}>
            <Text style={styles.relatedTitle}>You May Also Like</Text>
            <TouchableOpacity onPress={() => navigation.navigate('ProductListing')} activeOpacity={0.7}>
              <Text style={styles.viewAllText}>View All</Text>
            </TouchableOpacity>
          </View>
          <FlatList
            horizontal
            data={relatedProducts}
            keyExtractor={(item) => item.id}
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.relatedList}
            renderItem={({ item }) => (
              <View style={styles.relatedCardWrapper}>
                <ProductCard
                  id={item.id}
                  title={item.title}
                  category={item.category}
                  price={item.price}
                  rating={item.rating}
                  imageUrl={item.imageUrl}
                  isWishlisted={wishlistItems.some((w) => w.id === item.id)}
                  onPress={() => navigation.navigate('ProductDetails', { productId: item.id })}
                  onAddToCart={() => addToCart(item, 1)}
                  onWishlistToggle={() => toggleWishlist(item)}
                />
              </View>
            )}
          />
        </View>
      </ScrollView>

      {/* Bottom Navigation Bar */}
      <BottomNavBar activeTab="Categories" onTabPress={handleTabPress} />
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  scrollContent: {
    paddingBottom: Spacing.xl,
  },
  breadcrumbContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: Spacing.marginMobile,
    paddingVertical: Spacing.sm,
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
    fontSize: 12,
    fontFamily: 'Inter-Bold',
    color: Colors.primary,
  },
  breadcrumbDivider: {
    fontSize: 12,
    color: Colors.surfaceContainerHighest,
    marginHorizontal: 4,
  },
  breadcrumbLink: {
    ...Typography.labelLg,
    fontSize: 11,
    fontFamily: 'Inter-Medium',
    color: Colors.tertiary,
  },
  breadcrumbActive: {
    ...Typography.labelLg,
    fontSize: 11,
    fontFamily: 'Inter-Bold',
    color: Colors.primary,
    flexShrink: 1,
  },
  galleryContainer: {
    paddingHorizontal: Spacing.marginMobile,
  },
  mainImageWrapper: {
    width: '100%',
    height: 320,
    borderRadius: BorderRadius.xl,
    overflow: 'hidden',
    backgroundColor: Colors.surfaceContainerLow,
    position: 'relative',
  },
  mainImage: {
    width: '100%',
    height: '100%',
  },
  badge: {
    position: 'absolute',
    top: Spacing.sm,
    left: Spacing.sm,
    backgroundColor: Colors.secondaryContainer,
    paddingHorizontal: Spacing.sm,
    paddingVertical: 4,
    borderRadius: BorderRadius.full,
  },
  badgeText: {
    ...Typography.labelLg,
    color: Colors.onSecondaryContainer,
    fontSize: 10,
    fontFamily: 'Inter-Bold',
  },
  wishlistButton: {
    position: 'absolute',
    top: Spacing.sm,
    right: Spacing.sm,
    width: 40,
    height: 40,
    borderRadius: BorderRadius.full,
    backgroundColor: 'rgba(255, 255, 255, 0.9)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  thumbnailRow: {
    flexDirection: 'row',
    marginTop: Spacing.sm,
    gap: Spacing.sm,
  },
  thumbnailWrapper: {
    width: 72,
    height: 72,
    borderRadius: BorderRadius.lg,
    overflow: 'hidden',
    borderWidth: 2,
    borderColor: Colors.surfaceContainerHigh,
  },
  activeThumbnailWrapper: {
    borderColor: Colors.primary,
  },
  thumbnailImage: {
    width: '100%',
    height: '100%',
  },
  detailsContainer: {
    paddingHorizontal: Spacing.marginMobile,
    marginTop: Spacing.md,
  },
  title: {
    ...Typography.headlineLg,
    fontSize: 24,
    fontFamily: 'Inter-Bold',
    color: Colors.onSurface,
  },
  ratingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginVertical: Spacing.xs,
    gap: 8,
  },
  starsRow: {
    flexDirection: 'row',
  },
  ratingText: {
    ...Typography.bodyMd,
    fontSize: 13,
    color: Colors.onSurfaceVariant,
  },
  priceRow: {
    flexDirection: 'row',
    alignItems: 'baseline',
    gap: Spacing.sm,
    marginTop: Spacing.xs,
  },
  price: {
    ...Typography.displayLg,
    fontSize: 28,
    fontFamily: 'Inter-Bold',
    color: Colors.primary,
  },
  originalPrice: {
    ...Typography.bodyLg,
    fontSize: 16,
    color: Colors.tertiary,
    textDecorationLine: 'line-through',
  },
  stockText: {
    ...Typography.labelLg,
    color: Colors.secondary,
    fontFamily: 'Inter-Bold',
    fontSize: 12,
    marginTop: 2,
  },
  descriptionSection: {
    marginTop: Spacing.md,
  },
  sectionHeader: {
    ...Typography.labelLg,
    fontSize: 11,
    fontFamily: 'Inter-Bold',
    color: Colors.tertiary,
    letterSpacing: 1,
    marginBottom: 6,
  },
  descriptionText: {
    ...Typography.bodyLg,
    fontSize: 14,
    color: Colors.onSurfaceVariant,
    lineHeight: 22,
  },
  quantitySection: {
    marginTop: Spacing.md,
  },
  quantitySelector: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.surfaceContainerLow,
    borderRadius: BorderRadius.lg,
    borderWidth: 1,
    borderColor: Colors.surfaceContainerHigh,
    width: 130,
    height: 44,
  },
  quantityBtn: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    height: '100%',
  },
  quantityText: {
    ...Typography.titleLg,
    fontSize: 16,
    fontFamily: 'Inter-Bold',
    color: Colors.onSurface,
  },
  ctaRow: {
    flexDirection: 'row',
    gap: Spacing.sm,
    marginTop: Spacing.lg,
  },
  addToCartCta: {
    flex: 1,
  },
  buyNowCta: {
    flex: 1,
  },
  perksRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginTop: Spacing.lg,
    paddingTop: Spacing.md,
    borderTopWidth: 1,
    borderTopColor: Colors.surfaceContainerHigh,
  },
  perkItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.xs,
  },
  perkTitle: {
    ...Typography.labelLg,
    fontSize: 12,
    fontFamily: 'Inter-Bold',
    color: Colors.onSurface,
  },
  perkSubtitle: {
    ...Typography.bodyMd,
    fontSize: 10,
    color: Colors.tertiary,
  },
  relatedSection: {
    marginTop: Spacing.lg,
  },
  relatedHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: Spacing.marginMobile,
    marginBottom: Spacing.sm,
  },
  relatedTitle: {
    ...Typography.titleLg,
    fontSize: 18,
    fontFamily: 'Inter-Bold',
    color: Colors.onSurface,
  },
  viewAllText: {
    ...Typography.bodyMd,
    fontSize: 13,
    fontFamily: 'Inter-Bold',
    color: Colors.primary,
  },
  relatedList: {
    paddingHorizontal: Spacing.marginMobile,
  },
  relatedCardWrapper: {
    width: 170,
    marginRight: Spacing.sm,
  },
});

export default ProductDetailsScreen;
