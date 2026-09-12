import React from 'react';
import { View, Text, Image, Pressable, StyleSheet } from 'react-native';
import { Colors } from '@/constants/colors';
import { Typography } from '@/constants/typography';
import { BorderRadius, Spacing } from '@/constants/spacing';
import { MaterialIcons } from '@expo/vector-icons';
import { formatCurrency } from '@/utils/currency';
import { resolveProductImage } from '@/constants/productImages';
import { useCartStore } from '@/store/cartStore';

export interface ProductCardProps {
  id: string;
  title: string;
  category: string;
  price: number;
  originalPrice?: number;
  stock?: number;
  badge?: string;
  imageUrl?: any;
  rating?: number;
  reviewCount?: number;
  isWishlisted?: boolean;
  onPress?: () => void;
  onAddToCart?: () => void;
  onWishlistToggle?: () => void;
}

export const ProductCard: React.FC<ProductCardProps> = React.memo(
  ({
    id,
    title,
    category,
    price,
    originalPrice,
    stock,
    badge,
    imageUrl,
    rating = 4.8,
    reviewCount,
    isWishlisted = false,
    onPress,
    onAddToCart,
    onWishlistToggle,
  }) => {
    const isOutOfStock = (stock !== undefined && stock <= 0) || badge === 'Out of Stock';
    const effectiveBadge = isOutOfStock ? 'Out of Stock' : badge;
    const imageSource = resolveProductImage({ title, category, imageUrl });

    // Live Cart Quantity for this specific product
    const cartItem = useCartStore((state) => state.items.find((i) => i.product?.id === id));
    const cartQuantity = cartItem ? cartItem.quantity : 0;

    return (
      <View style={styles.cardContainer}>
        {/* Main Card Surface */}
        <Pressable
          style={({ pressed }) => [styles.card, pressed && styles.cardPressed, isOutOfStock && styles.cardOutOfStock]}
          onPress={onPress}
          accessibilityLabel={`${title}, ${category}, ${formatCurrency(price)}`}
          accessibilityRole="button"
        >
          {/* Product Image Box */}
          <View style={styles.imageContainer}>
            <Image
              source={imageSource}
              style={[styles.image, isOutOfStock && { opacity: 0.6 }]}
              resizeMode="contain"
              accessibilityLabel={title}
            />
            {effectiveBadge && (
              <View style={[styles.badge, isOutOfStock && styles.badgeOutOfStock]}>
                <Text style={styles.badgeText}>{effectiveBadge}</Text>
              </View>
            )}

            {/* In Cart Live Indicator Badge */}
            {cartQuantity > 0 && (
              <View style={styles.inCartBadge}>
                <MaterialIcons name="shopping-cart" size={11} color="#ffffff" style={{ marginRight: 3 }} />
                <Text style={styles.inCartBadgeText}>{cartQuantity} in Cart</Text>
              </View>
            )}
          </View>

          {/* Product Info Section */}
          <View style={styles.content}>
            <Text style={styles.category} numberOfLines={1}>
              {category}
            </Text>
            <Text style={styles.title} numberOfLines={2}>
              {title}
            </Text>

            {/* Rating Stars */}
            <View style={styles.ratingRow}>
              <MaterialIcons name="star" size={14} color={Colors.secondaryContainer} />
              <Text style={styles.ratingText}>{rating.toFixed(1)}</Text>
              {reviewCount !== undefined && (
                <Text style={styles.reviewCount}>({reviewCount})</Text>
              )}
            </View>

            <View style={styles.footer}>
              <View style={styles.priceContainer}>
                <Text style={styles.price}>{formatCurrency(price)}</Text>
                {originalPrice && (
                  <Text style={styles.originalPrice}>{formatCurrency(originalPrice)}</Text>
                )}
              </View>
            </View>
          </View>
        </Pressable>

        {/* Sibling Wishlist Heart Button */}
        {onWishlistToggle && (
          <Pressable
            style={({ pressed }) => [styles.wishlistButton, pressed && styles.buttonPressed]}
            onPress={onWishlistToggle}
            accessibilityLabel={isWishlisted ? 'Remove from wishlist' : 'Add to wishlist'}
            accessibilityRole="button"
          >
            <MaterialIcons
              name={isWishlisted ? 'favorite' : 'favorite-border'}
              size={18}
              color={isWishlisted ? Colors.primary : Colors.onSurfaceVariant}
            />
          </Pressable>
        )}

        {/* Sibling Add to Cart Button with Counter Badge */}
        {onAddToCart && (
          <View style={styles.addButtonWrapper}>
            <Pressable
              style={({ pressed }) => [
                styles.addButton,
                pressed && !isOutOfStock && styles.buttonPressed,
                isOutOfStock && styles.disabledAddButton,
                cartQuantity > 0 && styles.activeCartAddButton,
              ]}
              onPress={isOutOfStock ? undefined : onAddToCart}
              disabled={isOutOfStock}
              accessibilityLabel={isOutOfStock ? `${title} is out of stock` : `Add ${title} to cart (${cartQuantity} in cart)`}
              accessibilityRole="button"
            >
              <MaterialIcons
                name={isOutOfStock ? 'block' : 'shopping-cart'}
                size={16}
                color={isOutOfStock ? Colors.onSurfaceVariant : Colors.onPrimary}
              />
            </Pressable>
            {cartQuantity > 0 && (
              <View style={styles.addButtonBadge}>
                <Text style={styles.addButtonBadgeText}>{cartQuantity}</Text>
              </View>
            )}
          </View>
        )}
      </View>
    );
  }
);

const styles = StyleSheet.create({
  cardContainer: {
    width: '100%',
    position: 'relative',
    marginBottom: Spacing.sm,
  },
  card: {
    backgroundColor: Colors.surfaceContainerLowest,
    borderRadius: BorderRadius.xl,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: Colors.surfaceContainerHigh,
    elevation: 3,
  },
  cardPressed: {
    opacity: 0.95,
  },
  buttonPressed: {
    opacity: 0.7,
  },
  imageContainer: {
    height: 140,
    width: '100%',
    backgroundColor: Colors.surfaceContainerLow,
    position: 'relative',
    justifyContent: 'center',
    alignItems: 'center',
  },
  image: {
    width: '100%',
    height: '100%',
  },
  badge: {
    position: 'absolute',
    top: Spacing.xs,
    left: Spacing.xs,
    paddingHorizontal: Spacing.xs,
    paddingVertical: 2,
    borderRadius: BorderRadius.full,
    backgroundColor: Colors.secondaryContainer,
  },
  badgeText: {
    ...Typography.labelLg,
    fontSize: 9,
    fontFamily: 'Inter-Bold',
    color: Colors.onSecondaryContainer,
  },
  wishlistButton: {
    position: 'absolute',
    top: Spacing.xs,
    right: Spacing.xs,
    width: 32,
    height: 32,
    borderRadius: BorderRadius.full,
    backgroundColor: 'rgba(255, 255, 255, 0.9)',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 10,
  },
  content: {
    padding: Spacing.sm,
  },
  category: {
    ...Typography.labelLg,
    fontSize: 10,
    fontFamily: 'Inter-Bold',
    color: Colors.onSurfaceVariant,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: 2,
    minHeight: 14,
  },
  title: {
    ...Typography.titleLg,
    fontSize: 14,
    fontFamily: 'Inter-Bold',
    color: Colors.onSurface,
    minHeight: 38,
    lineHeight: 19,
  },
  ratingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 4,
    gap: 2,
  },
  ratingText: {
    ...Typography.labelLg,
    fontSize: 11,
    fontFamily: 'Inter-Bold',
    color: Colors.onSurface,
  },
  reviewCount: {
    ...Typography.bodyMd,
    fontSize: 10,
    color: Colors.tertiary,
  },
  footer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: Spacing.xs,
    minHeight: 32,
  },
  priceContainer: {
    flex: 1,
    flexShrink: 1,
    maxWidth: '68%',
    flexDirection: 'row',
    alignItems: 'baseline',
    gap: 4,
  },
  price: {
    ...Typography.titleLg,
    fontSize: 15,
    fontFamily: 'Inter-Bold',
    color: Colors.primary,
    flexShrink: 1,
  },
  originalPrice: {
    ...Typography.bodyMd,
    fontSize: 11,
    color: Colors.tertiary,
    textDecorationLine: 'line-through',
    flexShrink: 1,
  },
  addButtonWrapper: {
    position: 'absolute',
    bottom: Spacing.sm,
    right: Spacing.sm,
    zIndex: 10,
  },
  addButton: {
    width: 34,
    height: 34,
    borderRadius: BorderRadius.lg,
    backgroundColor: Colors.primary,
    justifyContent: 'center',
    alignItems: 'center',
    elevation: 2,
  },
  activeCartAddButton: {
    backgroundColor: '#2E7D32',
  },
  addButtonBadge: {
    position: 'absolute',
    top: -6,
    right: -6,
    backgroundColor: '#D32F2F',
    borderRadius: 10,
    minWidth: 18,
    height: 18,
    paddingHorizontal: 4,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1.5,
    borderColor: '#ffffff',
    elevation: 4,
  },
  addButtonBadgeText: {
    color: '#ffffff',
    fontSize: 10,
    fontFamily: 'Inter-Bold',
    lineHeight: 12,
  },
  inCartBadge: {
    position: 'absolute',
    bottom: Spacing.xs,
    left: Spacing.xs,
    paddingHorizontal: Spacing.xs,
    paddingVertical: 3,
    borderRadius: BorderRadius.full,
    backgroundColor: '#2E7D32',
    flexDirection: 'row',
    alignItems: 'center',
    elevation: 2,
  },
  inCartBadgeText: {
    fontSize: 9,
    fontFamily: 'Inter-Bold',
    color: '#ffffff',
  },
  cardOutOfStock: {
    opacity: 0.8,
  },
  badgeOutOfStock: {
    backgroundColor: '#dc2626',
  },
  disabledAddButton: {
    backgroundColor: Colors.surfaceContainerHigh,
  },
});

export default ProductCard;
