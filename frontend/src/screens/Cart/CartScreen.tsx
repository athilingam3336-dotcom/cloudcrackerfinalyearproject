import React, { useState, useCallback, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Image,
  TouchableOpacity,
  TextInput,
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
import { RootStackParamList } from '@/navigation/types';
import { useCartStore, useNotificationStore } from '@/store';
import { cartService } from '@/services/cartService';
import { formatCurrency } from '@/utils/currency';
import { resolveProductImage } from '@/constants/productImages';

type CartScreenProps = NativeStackScreenProps<RootStackParamList, 'Cart'>;

export const CartScreen: React.FC<CartScreenProps> = ({ navigation }) => {
  const {
    items: cartItems,
    discount,
    updateQuantity,
    removeFromCart,
    applyCoupon: applyStoreCoupon,
    getSubtotal,
    getShippingFee,
    getTax,
    getGrandTotal,
    fetchCart,
  } = useCartStore();

  const setAppliedCoupon = useCartStore((state) => state.setAppliedCoupon);
  const unreadNotifs = useNotificationStore((state) => state.getUnreadCount());

  useEffect(() => {
    fetchCart();
  }, [fetchCart]);

  const [inputCoupon, setInputCoupon] = useState('');

  const subtotal = getSubtotal();
  const shippingFee = getShippingFee();
  const taxAmount = getTax();
  const grandTotal = getGrandTotal();

  const handleApplyCoupon = useCallback(async () => {
    const clean = inputCoupon.trim();
    if (!clean) {
      Alert.alert('Coupon Required', 'Please enter a valid coupon code.');
      return;
    }
    const res = await cartService.validateCoupon(clean, subtotal);
    if (res.valid) {
      setAppliedCoupon(clean, res.discountAmount);
      Alert.alert(
        'Coupon Applied',
        `You saved ${formatCurrency(res.discountAmount)} on your order!`
      );
    } else {
      setAppliedCoupon('', 0);
      Alert.alert('Invalid Coupon', res.message || 'Please enter an active coupon code.');
    }
  }, [inputCoupon, subtotal, setAppliedCoupon]);

  const handleProceedToCheckout = useCallback(() => {
    navigation.navigate('Checkout');
  }, [navigation]);

  const handleTabPress = useCallback(
    (tab: TabRoute) => {
      if (tab === 'Home') navigation.navigate('Home');
      else if (tab === 'Categories') navigation.navigate('Categories');
      else if (tab === 'Wishlist') navigation.navigate('Wishlist');
      else if (tab === 'Profile') navigation.navigate('UserProfile');
    },
    [navigation]
  );

  return (
    <SafeAreaView style={styles.safeArea} edges={['top', 'left', 'right']}>
      <HomeHeader
        onNotificationPress={() => navigation.navigate('Notifications')}
        onProfilePress={() => navigation.navigate('UserProfile')}
        onCartPress={() => {}}
        notificationCount={unreadNotifs}
      />

      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        <View style={styles.titleSection}>
          <Text style={styles.title}>Your Shopping Cart</Text>
          <Text style={styles.subtitle}>
            Review your selection before proceeding to secure checkout.
          </Text>
        </View>

        {cartItems.length > 0 ? (
          <View style={styles.cartContainer}>
            {/* Cart Items List */}
            <View style={styles.itemsList}>
              {cartItems.map(({ product, quantity }) => (
                <View key={product.id} style={styles.cartItemCard}>
                  <Image
                    source={resolveProductImage(product)}
                    style={styles.itemImage}
                    resizeMode="contain"
                  />

                  <View style={styles.itemInfo}>
                    <Text style={styles.itemTitle} numberOfLines={1}>
                      {product.title}
                    </Text>
                    <Text style={styles.itemSubtitle} numberOfLines={1}>
                      {product.subtitle || product.category}
                    </Text>
                    <Text style={styles.itemPrice}>{formatCurrency(product.price)}</Text>
                  </View>

                  <View style={styles.itemActions}>
                    <TouchableOpacity
                      style={styles.deleteButton}
                      onPress={() => removeFromCart(product.id)}
                      activeOpacity={0.7}
                    >
                      <MaterialIcons name="delete-outline" size={20} color={Colors.error} />
                    </TouchableOpacity>

                    <View style={styles.quantityControl}>
                      <TouchableOpacity
                        style={styles.qtyBtn}
                        onPress={() => updateQuantity(product.id, -1)}
                        activeOpacity={0.7}
                      >
                        <MaterialIcons name="remove" size={16} color={Colors.onSurface} />
                      </TouchableOpacity>
                      <Text style={styles.qtyText}>{quantity}</Text>
                      <TouchableOpacity
                        style={styles.qtyBtn}
                        onPress={() => updateQuantity(product.id, 1)}
                        activeOpacity={0.7}
                      >
                        <MaterialIcons name="add" size={16} color={Colors.onSurface} />
                      </TouchableOpacity>
                    </View>
                  </View>
                </View>
              ))}
            </View>

            {/* Order Summary & Coupon Section */}
            <View style={styles.summaryCard}>
              <Text style={styles.summaryTitle}>Order Summary</Text>

              {/* Coupon Form */}
              <View style={styles.couponRow}>
                <TextInput
                  style={styles.couponInput}
                  placeholder="Coupon code (e.g. VIP)"
                  placeholderTextColor={Colors.tertiary}
                  value={inputCoupon}
                  onChangeText={setInputCoupon}
                  autoCapitalize="characters"
                />
                <TouchableOpacity style={styles.applyCouponBtn} onPress={handleApplyCoupon}>
                  <Text style={styles.applyCouponText}>Apply</Text>
                </TouchableOpacity>
              </View>

              {/* Breakdown Rows */}
              <View style={styles.summaryRows}>
                <View style={styles.summaryRow}>
                  <Text style={styles.summaryRowLabel}>Subtotal</Text>
                  <Text style={styles.summaryRowValue}>{formatCurrency(subtotal)}</Text>
                </View>
                <View style={styles.summaryRow}>
                  <Text style={styles.summaryRowLabel}>Hazmat Shipping</Text>
                  <Text style={styles.summaryRowValue}>
                    {shippingFee === 0 ? 'FREE' : formatCurrency(shippingFee)}
                  </Text>
                </View>
                <View style={styles.summaryRow}>
                  <Text style={styles.summaryRowLabel}>Estimated Tax / GST (7%)</Text>
                  <Text style={styles.summaryRowValue}>{formatCurrency(taxAmount)}</Text>
                </View>
                {discount > 0 && (
                  <View style={styles.summaryRow}>
                    <Text style={[styles.summaryRowLabel, { color: Colors.secondary }]}>
                      Discount Coupon
                    </Text>
                    <Text style={[styles.summaryRowValue, { color: Colors.secondary }]}>
                      -{formatCurrency(discount)}
                    </Text>
                  </View>
                )}
              </View>

              {/* Total Row */}
              <View style={styles.totalRow}>
                <Text style={styles.totalLabel}>Total</Text>
                <Text style={styles.totalValue}>{formatCurrency(grandTotal)}</Text>
              </View>

              {/* Checkout Button */}
              <PrimaryButton
                title="Proceed to Checkout"
                onPress={handleProceedToCheckout}
                style={styles.checkoutCta}
              />

              <View style={styles.securityBadge}>
                <MaterialIcons name="verified-user" size={16} color={Colors.tertiary} />
                <Text style={styles.securityText}>SECURE SSL 256-BIT ENCRYPTION</Text>
              </View>
            </View>
          </View>
        ) : (
          <View style={styles.emptyContainer}>
            <View style={styles.emptyIconCircle}>
              <MaterialIcons name="shopping-bag" size={56} color={Colors.primary} />
            </View>
            <Text style={styles.emptyTitle}>Your Shopping Cart is Empty</Text>
            <Text style={styles.emptySubtitle}>
              Discover our premium pyrotechnics catalog and light up your celebrations.
            </Text>
            <PrimaryButton
              title="Explore Catalog"
              onPress={() => navigation.navigate('Categories')}
              style={styles.emptyCta}
            />
          </View>
        )}
      </ScrollView>

      <BottomNavBar activeTab="Cart" onTabPress={handleTabPress} />
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
  titleSection: {
    paddingHorizontal: Spacing.marginMobile,
    marginTop: Spacing.sm,
    marginBottom: Spacing.md,
  },
  title: {
    ...Typography.headlineLg,
    fontSize: 26,
    fontFamily: 'Inter-Bold',
    color: Colors.onSurface,
  },
  subtitle: {
    ...Typography.bodyMd,
    fontSize: 14,
    color: Colors.onSurfaceVariant,
    marginTop: 4,
  },
  cartContainer: {
    paddingHorizontal: Spacing.marginMobile,
    gap: Spacing.lg,
  },
  itemsList: {
    gap: Spacing.sm,
  },
  cartItemCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.surfaceContainerLowest,
    borderRadius: BorderRadius.xl,
    padding: Spacing.sm,
    borderWidth: 1,
    borderColor: Colors.surfaceContainerHigh,
    shadowColor: Colors.shadowColor,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.06,
    shadowRadius: 10,
    elevation: 3,
    gap: Spacing.sm,
  },
  itemImage: {
    width: 80,
    height: 80,
    borderRadius: BorderRadius.lg,
    backgroundColor: Colors.surfaceContainerLow,
  },
  itemInfo: {
    flex: 1,
  },
  itemTitle: {
    ...Typography.titleLg,
    fontSize: 15,
    fontFamily: 'Inter-Bold',
    color: Colors.onSurface,
  },
  itemSubtitle: {
    ...Typography.bodyMd,
    fontSize: 12,
    color: Colors.onSurfaceVariant,
    marginTop: 2,
  },
  itemPrice: {
    ...Typography.titleLg,
    fontSize: 16,
    fontFamily: 'Inter-Bold',
    color: Colors.primary,
    marginTop: 4,
  },
  itemActions: {
    alignItems: 'flex-end',
    justifyContent: 'space-between',
    height: 80,
  },
  deleteButton: {
    padding: 4,
  },
  quantityControl: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.surfaceContainerLow,
    borderRadius: BorderRadius.lg,
    borderWidth: 1,
    borderColor: Colors.surfaceContainerHigh,
    height: 32,
    paddingHorizontal: 4,
  },
  qtyBtn: {
    padding: 4,
  },
  qtyText: {
    ...Typography.bodyMd,
    fontSize: 13,
    fontFamily: 'Inter-Bold',
    color: Colors.onSurface,
    paddingHorizontal: 8,
  },
  summaryCard: {
    backgroundColor: Colors.surfaceContainerLowest,
    borderRadius: BorderRadius.xl,
    padding: Spacing.lg,
    borderWidth: 1,
    borderColor: Colors.surfaceContainerHigh,
    shadowColor: Colors.shadowColor,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.08,
    shadowRadius: 12,
    elevation: 4,
  },
  summaryTitle: {
    ...Typography.headlineLg,
    fontSize: 20,
    fontFamily: 'Inter-Bold',
    color: Colors.onSurface,
    marginBottom: Spacing.md,
  },
  couponRow: {
    flexDirection: 'row',
    gap: Spacing.xs,
    marginBottom: Spacing.md,
  },
  couponInput: {
    flex: 1,
    backgroundColor: Colors.surfaceContainerLow,
    borderRadius: BorderRadius.lg,
    paddingHorizontal: Spacing.md,
    height: 44,
    ...Typography.bodyMd,
    color: Colors.onSurface,
    borderWidth: 1,
    borderColor: Colors.surfaceContainerHigh,
  },
  applyCouponBtn: {
    backgroundColor: Colors.surfaceContainerHigh,
    borderRadius: BorderRadius.lg,
    paddingHorizontal: Spacing.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  applyCouponText: {
    ...Typography.labelLg,
    fontSize: 12,
    fontFamily: 'Inter-Bold',
    color: Colors.onSurface,
  },
  summaryRows: {
    gap: Spacing.xs,
    paddingBottom: Spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: Colors.surfaceContainerHigh,
  },
  summaryRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  summaryRowLabel: {
    ...Typography.bodyMd,
    fontSize: 14,
    color: Colors.onSurfaceVariant,
  },
  summaryRowValue: {
    ...Typography.titleLg,
    fontSize: 15,
    fontFamily: 'Inter-Bold',
    color: Colors.onSurface,
  },
  totalRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginVertical: Spacing.md,
  },
  totalLabel: {
    ...Typography.headlineLg,
    fontSize: 20,
    fontFamily: 'Inter-Bold',
    color: Colors.onSurface,
  },
  totalValue: {
    ...Typography.headlineLg,
    fontSize: 24,
    fontFamily: 'Inter-Bold',
    color: Colors.primary,
  },
  checkoutCta: {
    marginTop: Spacing.xs,
  },
  securityBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: Spacing.md,
    gap: 6,
  },
  securityText: {
    ...Typography.labelLg,
    fontSize: 10,
    color: Colors.tertiary,
    letterSpacing: 0.8,
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

export default CartScreen;
