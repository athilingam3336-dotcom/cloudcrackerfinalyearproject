import React, { useState, useCallback, useMemo, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Image,
  TouchableOpacity,
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
import { productService } from '@/services/productService';
import { ProductItem } from '@/constants/mockData';
import { RootStackParamList } from '@/navigation/types';
import { useWishlistStore, useCartStore, useNotificationStore, useAuthStore } from '@/store';
import { formatCurrency } from '@/utils/currency';

import { LOCAL_PRODUCT_IMAGES, resolveProductImage } from '@/constants/productImages';

type ProductDetailsVariantScreenProps = NativeStackScreenProps<
  RootStackParamList,
  'ProductDetailsVariant'
>;

interface VariantSize {
  id: string;
  name: string;
  priceModifier: number;
}

interface VariantEffect {
  id: string;
  name: string;
  colorHex: string;
  imageUrl: any;
  stock: number;
}

const SIZE_VARIANTS: VariantSize[] = [
  { id: '12p', name: '12-Pack', priceModifier: 0 },
  { id: '24p', name: '24-Pack (+ ₹350.00)', priceModifier: 350.0 },
  { id: '36p', name: '36-Pack Pro (+ ₹650.00)', priceModifier: 650.0 },
];

const EFFECT_VARIANTS: VariantEffect[] = [
  {
    id: 'gold',
    name: 'Gold Willow (30-Shot)',
    colorHex: '#E5A93C',
    imageUrl: LOCAL_PRODUCT_IMAGES.MULTI_SHOT_30,
    stock: 18,
  },
  {
    id: 'crimson',
    name: 'Crimson Hydro Shells',
    colorHex: '#D32F2F',
    imageUrl: LOCAL_PRODUCT_IMAGES.ATOM_BOMB,
    stock: 12,
  },
  {
    id: 'blue',
    name: 'Blue Crossette Star',
    colorHex: '#1976D2',
    imageUrl: LOCAL_PRODUCT_IMAGES.PENCIL_CANDLES,
    stock: 24,
  },
  {
    id: 'dragon',
    name: 'Dragon Fountain Flame',
    colorHex: '#7B1FA2',
    imageUrl: LOCAL_PRODUCT_IMAGES.FLOWER_POT,
    stock: 15,
  },
];

export const ProductDetailsVariantScreen: React.FC<ProductDetailsVariantScreenProps> = ({
  navigation,
  route,
}) => {
  const productIdParam = route.params?.productId;

  const [product, setProduct] = useState<ProductItem | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedSize, setSelectedSize] = useState<VariantSize>(SIZE_VARIANTS[0]);
  const [selectedEffect, setSelectedEffect] = useState<VariantEffect>(EFFECT_VARIANTS[0]);
  const [quantity, setQuantity] = useState(1);

  const { wishlistItems, toggleWishlist } = useWishlistStore();
  const addToCart = useCartStore((state) => state.addToCart);
  const unreadNotifs = useNotificationStore((state) => state.getUnreadCount());

  useEffect(() => {
    let isMounted = true;
    setIsLoading(true);

    if (productIdParam) {
      productService.getProductById(productIdParam).then((data) => {
        if (isMounted && data) {
          setProduct(data);
          setIsLoading(false);
        }
      });
    } else {
      productService.getProducts(undefined, undefined, 5).then((all) => {
        if (isMounted && all.length > 0) {
          setProduct(all[0]);
          setIsLoading(false);
        }
      });
    }

    return () => {
      isMounted = false;
    };
  }, [productIdParam]);

  const unitPrice = useMemo(() => {
    if (!product) return 0;
    return product.price + selectedSize.priceModifier;
  }, [product, selectedSize]);

  const totalPrice = useMemo(() => {
    return unitPrice * quantity;
  }, [unitPrice, quantity]);

  const isWishlisted = useMemo(
    () => (product ? wishlistItems.some((w) => w.id === product.id) : false),
    [wishlistItems, product]
  );

  const isAuthenticated = useAuthStore((state) => state.isAuthenticated);

  const handleAddToCart = useCallback(async () => {
    if (!product) return;
    if (!isAuthenticated) {
      Alert.alert('Sign In Required', 'Please log in to add items to your cart.', [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Sign In', onPress: () => navigation.navigate('Login') },
      ]);
      return;
    }
    if (selectedEffect.stock <= 0) {
      Alert.alert('Out of Stock', `The selected variant "${selectedEffect.name}" is currently out of stock.`);
      return;
    }
    try {
      await addToCart(product, quantity, {
        size: selectedSize.name,
        color: selectedEffect.name,
        priceModifier: selectedSize.priceModifier,
        imageUrl: selectedEffect.imageUrl,
      });
      Alert.alert(
        'Added to Cart',
        `${quantity}x ${product.title} (${selectedSize.name}, ${selectedEffect.name}) added to your cart.`
      );
    } catch (err: any) {
      Alert.alert('Cart Error', err?.message || 'Failed to add item to cart.');
    }
  }, [isAuthenticated, product, quantity, selectedSize, selectedEffect, addToCart, navigation]);

  const handleToggleWishlist = useCallback(async () => {
    if (!product) return;
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
  }, [isAuthenticated, product, toggleWishlist, navigation]);

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
        <LoadingSpinner message="Loading variant options..." />
        <BottomNavBar activeTab="Home" onTabPress={(tab) => navigation.navigate(tab as any)} />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safeArea} edges={['top', 'left', 'right']}>
      <HomeHeader
        onNotificationPress={() => navigation.navigate('Notifications')}
        onProfilePress={() => navigation.navigate('UserProfile')}
        onCartPress={() => navigation.navigate('Cart')}
        notificationCount={unreadNotifs}
      />

      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        {/* Dynamic Variant Image Display */}
        <View style={styles.imageContainer}>
          <Image
            source={selectedEffect.imageUrl}
            style={styles.mainImage}
            resizeMode="contain"
          />
          <TouchableOpacity
            style={styles.wishlistBtn}
            onPress={handleToggleWishlist}
            activeOpacity={0.8}
          >
            <MaterialIcons
              name={isWishlisted ? 'favorite' : 'favorite-border'}
              size={22}
              color={isWishlisted ? Colors.primary : Colors.onSurface}
            />
          </TouchableOpacity>
          <View style={styles.variantBadge}>
            <Text style={styles.variantBadgeText}>{selectedEffect.name}</Text>
          </View>
        </View>

        <View style={styles.contentContainer}>
          <Text style={styles.title}>{product.title}</Text>
          <Text style={styles.categoryText}>{product.category} • Custom Variants</Text>

          {/* Dynamic Pricing */}
          <View style={styles.priceRow}>
            <Text style={styles.price}>{formatCurrency(unitPrice)}</Text>
            {quantity > 1 && (
              <Text style={styles.totalPriceText}>(Total: {formatCurrency(totalPrice)})</Text>
            )}
          </View>

          {/* Stock Indicator */}
          <View style={styles.stockRow}>
            <MaterialIcons
              name={selectedEffect.stock > 0 ? 'check-circle' : 'cancel'}
              size={18}
              color={selectedEffect.stock > 0 ? (selectedEffect.stock < 10 ? '#F57C00' : Colors.secondary) : '#D32F2F'}
            />
            <Text
              style={[
                styles.stockText,
                selectedEffect.stock <= 0 && styles.outOfStockText,
                selectedEffect.stock > 0 && selectedEffect.stock < 10 && styles.lowStockText,
              ]}
            >
              {selectedEffect.stock > 10
                ? `In Stock (${selectedEffect.stock} available)`
                : selectedEffect.stock > 0
                ? `Low Stock! Only ${selectedEffect.stock} left`
                : 'Out of Stock'}
            </Text>
          </View>

          {/* 1. Size / Pack Variant Selector */}
          <View style={styles.section}>
            <Text style={styles.sectionLabel}>SELECT PACK SIZE</Text>
            <View style={styles.sizeRow}>
              {SIZE_VARIANTS.map((size) => {
                const isSelected = selectedSize.id === size.id;
                return (
                  <TouchableOpacity
                    key={size.id}
                    style={[styles.sizeChip, isSelected && styles.activeSizeChip]}
                    onPress={() => setSelectedSize(size)}
                    activeOpacity={0.8}
                  >
                    <Text style={[styles.sizeChipText, isSelected && styles.activeSizeChipText]}>
                      {size.name}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>
          </View>

          {/* 2. Color / Effect Variant Selector */}
          <View style={styles.section}>
            <Text style={styles.sectionLabel}>SELECT EFFECT / COLOR</Text>
            <View style={styles.effectGrid}>
              {EFFECT_VARIANTS.map((eff) => {
                const isSelected = selectedEffect.id === eff.id;
                return (
                  <TouchableOpacity
                    key={eff.id}
                    style={[styles.effectCard, isSelected && styles.activeEffectCard]}
                    onPress={() => setSelectedEffect(eff)}
                    activeOpacity={0.8}
                  >
                    <View style={[styles.colorDot, { backgroundColor: eff.colorHex }]} />
                    <View style={styles.effectTextCol}>
                      <Text style={[styles.effectName, isSelected && styles.activeEffectName]}>
                        {eff.name}
                      </Text>
                      <Text style={styles.effectStockLabel}>
                        {eff.stock > 0 ? `${eff.stock} left` : 'Sold out'}
                      </Text>
                    </View>
                    {isSelected && (
                      <MaterialIcons name="check-circle" size={20} color={Colors.primary} />
                    )}
                  </TouchableOpacity>
                );
              })}
            </View>
          </View>

          {/* 3. Quantity Selector */}
          <View style={styles.section}>
            <Text style={styles.sectionLabel}>QUANTITY</Text>
            <View style={styles.quantityControl}>
              <TouchableOpacity
                style={styles.qtyBtn}
                onPress={() => setQuantity((q) => Math.max(1, q - 1))}
                activeOpacity={0.7}
              >
                <MaterialIcons name="remove" size={20} color={Colors.onSurface} />
              </TouchableOpacity>
              <Text style={styles.qtyText}>{quantity}</Text>
              <TouchableOpacity
                style={styles.qtyBtn}
                onPress={() => setQuantity((q) => Math.min(selectedEffect.stock || 1, q + 1))}
                disabled={selectedEffect.stock <= 0}
                activeOpacity={0.7}
              >
                <MaterialIcons name="add" size={20} color={Colors.onSurface} />
              </TouchableOpacity>
            </View>
          </View>

          {/* Add to Cart CTA */}
          <View style={styles.ctaWrapper}>
            <PrimaryButton
              title={selectedEffect.stock > 0 ? `Add ${quantity} to Cart • $${totalPrice.toFixed(2)}` : 'Out of Stock'}
              onPress={handleAddToCart}
              disabled={selectedEffect.stock <= 0}
            />
          </View>
        </View>
      </ScrollView>

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
  imageContainer: {
    width: '100%',
    height: 300,
    backgroundColor: Colors.surfaceContainerLow,
    position: 'relative',
  },
  mainImage: {
    width: '100%',
    height: '100%',
  },
  wishlistBtn: {
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
  variantBadge: {
    position: 'absolute',
    bottom: Spacing.sm,
    left: Spacing.sm,
    backgroundColor: 'rgba(0, 0, 0, 0.75)',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: BorderRadius.full,
  },
  variantBadgeText: {
    ...Typography.labelLg,
    color: '#ffffff',
    fontSize: 12,
    fontFamily: 'Inter-Bold',
  },
  contentContainer: {
    paddingHorizontal: Spacing.marginMobile,
    paddingTop: Spacing.md,
  },
  title: {
    ...Typography.headlineLg,
    fontSize: 24,
    fontFamily: 'Inter-Bold',
    color: Colors.onSurface,
  },
  categoryText: {
    ...Typography.bodyMd,
    fontSize: 13,
    color: Colors.tertiary,
    marginTop: 2,
  },
  priceRow: {
    flexDirection: 'row',
    alignItems: 'baseline',
    gap: Spacing.xs,
    marginTop: Spacing.xs,
  },
  price: {
    ...Typography.displayLg,
    fontSize: 28,
    fontFamily: 'Inter-Bold',
    color: Colors.primary,
  },
  totalPriceText: {
    ...Typography.bodyLg,
    fontSize: 14,
    color: Colors.onSurfaceVariant,
  },
  stockRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: 6,
  },
  stockText: {
    ...Typography.labelLg,
    fontSize: 12,
    fontFamily: 'Inter-Bold',
    color: Colors.secondary,
  },
  lowStockText: {
    color: '#F57C00',
  },
  outOfStockText: {
    color: '#D32F2F',
  },
  section: {
    marginTop: Spacing.md,
  },
  sectionLabel: {
    ...Typography.labelLg,
    fontSize: 11,
    fontFamily: 'Inter-Bold',
    color: Colors.tertiary,
    letterSpacing: 1,
    marginBottom: 8,
  },
  sizeRow: {
    flexDirection: 'column',
    gap: 8,
  },
  sizeChip: {
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    borderRadius: BorderRadius.lg,
    backgroundColor: Colors.surfaceContainerLowest,
    borderWidth: 1,
    borderColor: Colors.surfaceContainerHigh,
  },
  activeSizeChip: {
    borderColor: Colors.primary,
    backgroundColor: Colors.primaryContainer,
  },
  sizeChipText: {
    ...Typography.labelLg,
    fontSize: 13,
    color: Colors.onSurfaceVariant,
  },
  activeSizeChipText: {
    color: Colors.onPrimaryContainer,
    fontFamily: 'Inter-Bold',
  },
  effectGrid: {
    gap: 8,
  },
  effectCard: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: Spacing.sm,
    backgroundColor: Colors.surfaceContainerLowest,
    borderRadius: BorderRadius.lg,
    borderWidth: 1,
    borderColor: Colors.surfaceContainerHigh,
    gap: Spacing.sm,
  },
  activeEffectCard: {
    borderColor: Colors.primary,
    backgroundColor: Colors.surfaceContainerLow,
  },
  colorDot: {
    width: 24,
    height: 24,
    borderRadius: BorderRadius.full,
  },
  effectTextCol: {
    flex: 1,
  },
  effectName: {
    ...Typography.titleLg,
    fontSize: 14,
    color: Colors.onSurface,
  },
  activeEffectName: {
    fontFamily: 'Inter-Bold',
    color: Colors.primary,
  },
  effectStockLabel: {
    ...Typography.bodyMd,
    fontSize: 11,
    color: Colors.tertiary,
  },
  quantityControl: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.surfaceContainerLow,
    borderRadius: BorderRadius.lg,
    borderWidth: 1,
    borderColor: Colors.surfaceContainerHigh,
    width: 140,
    height: 44,
  },
  qtyBtn: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    height: '100%',
  },
  qtyText: {
    ...Typography.titleLg,
    fontSize: 16,
    fontFamily: 'Inter-Bold',
    color: Colors.onSurface,
  },
  ctaWrapper: {
    marginTop: Spacing.lg,
  },
});

export default ProductDetailsVariantScreen;
