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
  useWindowDimensions,
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
import { useCartStore, useNotificationStore, useSettingsStore } from '@/store';
import { cartService } from '@/services/cartService';
import { formatCurrency } from '@/utils/currency';
import { resolveProductImage } from '@/constants/productImages';
import { OnlineDeliveryBanner } from '@/components/cart/OnlineDeliveryBanner';

import { ResponsiveContainer } from '@/components/common/ResponsiveContainer';
import { useAppLayout } from '@/hooks/useAppLayout';
import { useSmartTabNavigation } from '@/hooks/useSmartTabNavigation';

interface CartQuantityControlProps {
  productId: string;
  quantity: number;
  stock: number;
  onUpdateDelta: (delta: number) => Promise<void>;
  onSetExact: (qty: number) => Promise<void>;
}

const CartQuantityControl: React.FC<CartQuantityControlProps> = ({
  productId,
  quantity,
  stock,
  onUpdateDelta,
  onSetExact,
}) => {
  const [inputText, setInputText] = useState<string>(String(quantity));
  const maxStock = typeof stock === 'number' && stock > 0 ? stock : 999;

  useEffect(() => {
    setInputText(String(quantity));
  }, [quantity]);

  const handleChangeText = (t: string) => {
    const cleaned = t.replace(/[^0-9]/g, '');
    if (!cleaned) {
      setInputText('');
      return;
    }
    const val = parseInt(cleaned, 10);
    if (val > maxStock) {
      Alert.alert('Stock Limit Reached', `Only ${maxStock} items available in stock.`);
      setInputText(String(maxStock));
      onSetExact(maxStock);
      return;
    }
    setInputText(cleaned);
  };

  const handleCommit = async () => {
    const val = parseInt(inputText, 10);
    if (isNaN(val) || val < 1) {
      setInputText(String(quantity));
      return;
    }
    if (val > maxStock) {
      Alert.alert('Stock Limit Reached', `Only ${maxStock} items available in stock.`);
      setInputText(String(maxStock));
      await onSetExact(maxStock);
      return;
    }
    if (val !== quantity) {
      await onSetExact(val);
    }
  };

  return (
    <View style={styles.quantityControl}>
      <TouchableOpacity
        style={styles.qtyBtn}
        onPress={() => onUpdateDelta(-1)}
        activeOpacity={0.7}
      >
        <MaterialIcons name="remove" size={16} color={Colors.onSurface} />
      </TouchableOpacity>

      <TextInput
        style={styles.qtyInput}
        value={inputText}
        onChangeText={handleChangeText}
        onBlur={handleCommit}
        onSubmitEditing={handleCommit}
        keyboardType="numeric"
        maxLength={Math.max(3, String(maxStock).length)}
        selectTextOnFocus
      />

      <TouchableOpacity
        style={[
          styles.qtyBtn,
          quantity >= maxStock && { opacity: 0.4 },
        ]}
        onPress={() => {
          if (quantity >= maxStock) {
            Alert.alert('Stock Limit Reached', `Cannot add more. Stock limit is ${maxStock} items.`);
            return;
          }
          onUpdateDelta(1);
        }}
        activeOpacity={0.7}
      >
        <MaterialIcons name="add" size={16} color={Colors.onSurface} />
      </TouchableOpacity>
    </View>
  );
};

type CartScreenProps = NativeStackScreenProps<RootStackParamList, 'Cart'>;

export const CartScreen: React.FC<CartScreenProps> = ({ navigation }) => {
  const { handleTabPress } = useSmartTabNavigation();
  const { isDesktopWeb: isDesktop } = useAppLayout();

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

  const setQuantity = useCartStore((state) => state.setQuantity);
  const setAppliedCoupon = useCartStore((state) => state.setAppliedCoupon);
  const unreadNotifs = useNotificationStore((state) => state.getUnreadCount());

  const { minOnlineDeliveryAmount, fetchSettings } = useSettingsStore();

  useEffect(() => {
    fetchCart();
    fetchSettings();
  }, [fetchCart, fetchSettings]);

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



  return (
    <ResponsiveContainer>
      <SafeAreaView style={styles.safeArea} edges={['top', 'left', 'right']}>
      <HomeHeader
        onBackPress={() => (navigation.canGoBack() ? navigation.goBack() : navigation.navigate('Home'))}
        onNotificationPress={() => navigation.navigate('Notifications')}
        onProfilePress={() => navigation.navigate('UserProfile')}
        onCartPress={() => {}}
        notificationCount={unreadNotifs}
      />

      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        {!isDesktop && (
          <View style={styles.titleSection}>
            <TouchableOpacity
              style={styles.inlineBackRow}
              onPress={() => (navigation.canGoBack() ? navigation.goBack() : navigation.navigate('Home'))}
              activeOpacity={0.7}
            >
              <MaterialIcons name="arrow-back" size={18} color={Colors.primary} />
              <Text style={styles.inlineBackText}>Back</Text>
            </TouchableOpacity>
            <Text style={styles.title}>Your Shopping Cart</Text>
            <Text style={styles.subtitle}>
              Review your selection before proceeding to secure checkout.
            </Text>
          </View>
        )}

        {cartItems.length > 0 ? (
          <View style={[styles.cartContainer, isDesktop && styles.cartContainerDesktop]}>
            {/* Cart Items List */}
            <View style={[styles.itemsList, isDesktop && styles.itemsListDesktop]}>
              {isDesktop && (
                <View style={[styles.titleSection, { paddingHorizontal: 0, marginTop: 0, marginBottom: 12 }]}>
                  <TouchableOpacity
                    style={styles.inlineBackRow}
                    onPress={() => (navigation.canGoBack() ? navigation.goBack() : navigation.navigate('Home'))}
                    activeOpacity={0.7}
                  >
                    <MaterialIcons name="arrow-back" size={18} color={Colors.primary} />
                    <Text style={styles.inlineBackText}>Back</Text>
                  </TouchableOpacity>
                  <Text style={styles.title}>Your Shopping Cart</Text>
                  <Text style={styles.subtitle}>
                    Review your selection before proceeding to secure checkout.
                  </Text>
                </View>
              )}

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
                    {quantity > 1 && (
                      <Text style={styles.itemCalculatedPrice}>
                        {quantity} × {formatCurrency(product.price)} = {formatCurrency(product.price * quantity)}
                      </Text>
                    )}
                    {typeof product.stock === 'number' && quantity >= product.stock && (
                      <Text style={styles.stockLimitWarning}>
                        Stock limit reached ({product.stock} max available)
                      </Text>
                    )}
                  </View>

                  <View style={styles.itemActions}>
                    <TouchableOpacity
                      style={styles.deleteButton}
                      onPress={async () => {
                        try {
                          await removeFromCart(product.id);
                        } catch (err: any) {
                          Alert.alert('Cart Error', err?.message || 'Failed to remove item.');
                        }
                      }}
                      activeOpacity={0.7}
                    >
                      <MaterialIcons name="delete-outline" size={20} color={Colors.error} />
                    </TouchableOpacity>

                    <CartQuantityControl
                      productId={product.id}
                      quantity={quantity}
                      stock={typeof product.stock === 'number' ? product.stock : 999}
                      onUpdateDelta={async (delta) => {
                        try {
                          await updateQuantity(product.id, delta);
                        } catch (err: any) {
                          Alert.alert('Quantity Error', err?.message || 'Failed to update quantity.');
                        }
                      }}
                      onSetExact={async (qty) => {
                        try {
                          await setQuantity(product.id, qty);
                        } catch (err: any) {
                          Alert.alert('Quantity Error', err?.message || 'Failed to set quantity.');
                        }
                      }}
                    />
                  </View>
                </View>
              ))}
            </View>

            {/* Order Summary & Coupon Section */}
            <View style={[styles.summarySideContainer, isDesktop && styles.summaryCardDesktop]}>
              <OnlineDeliveryBanner subtotal={subtotal} minAmount={minOnlineDeliveryAmount} />

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
  </ResponsiveContainer>
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
    marginTop: 4,
    marginBottom: 8,
  },
  inlineBackRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginBottom: 2,
  },
  inlineBackText: {
    ...Typography.labelLg,
    fontSize: 12,
    fontFamily: 'Inter-Bold',
    color: Colors.primary,
  },
  title: {
    ...Typography.headlineLg,
    fontSize: 22,
    fontFamily: 'Inter-Bold',
    color: Colors.onSurface,
  },
  subtitle: {
    ...Typography.bodyMd,
    fontSize: 12,
    color: Colors.onSurfaceVariant,
    marginTop: 2,
  },
  cartContainer: {
    paddingHorizontal: Spacing.marginMobile,
    gap: Spacing.md,
  },
  cartContainerDesktop: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 20,
  },
  itemsList: {
    gap: Spacing.xs,
  },
  itemsListDesktop: {
    flex: 1.3,
  },
  cartItemCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.surfaceContainerLowest,
    borderRadius: BorderRadius.lg,
    padding: Spacing.xs,
    borderWidth: 1,
    borderColor: Colors.surfaceContainerHigh,
    shadowColor: Colors.shadowColor,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 6,
    elevation: 2,
    gap: Spacing.xs,
  },
  itemImage: {
    width: 60,
    height: 60,
    borderRadius: BorderRadius.md,
    backgroundColor: Colors.surfaceContainerLow,
  },
  itemInfo: {
    flex: 1,
  },
  itemTitle: {
    ...Typography.titleLg,
    fontSize: 14,
    fontFamily: 'Inter-Bold',
    color: Colors.onSurface,
  },
  itemSubtitle: {
    ...Typography.bodyMd,
    fontSize: 11,
    color: Colors.onSurfaceVariant,
    marginTop: 1,
  },
  itemPrice: {
    ...Typography.titleLg,
    fontSize: 14,
    fontFamily: 'Inter-Bold',
    color: Colors.primary,
    marginTop: 2,
  },
  itemCalculatedPrice: {
    ...Typography.bodyMd,
    fontSize: 13,
    fontFamily: 'Inter-Bold',
    color: Colors.primary,
    marginTop: 2,
  },
  stockLimitWarning: {
    ...Typography.labelLg,
    fontSize: 10,
    fontFamily: 'Inter-Bold',
    color: Colors.error,
    marginTop: 2,
  },
  itemActions: {
    alignItems: 'flex-end',
    justifyContent: 'space-between',
    height: 60,
  },
  deleteButton: {
    padding: 4,
  },
  qtyRowContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  itemTotalPrice: {
    ...Typography.titleLg,
    fontSize: 15,
    fontFamily: 'Inter-Bold',
    color: Colors.primary,
  },
  quantityControl: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#F3F4F6',
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    height: 36,
    paddingHorizontal: 4,
    width: 110,
  },
  qtyBtn: {
    width: 28,
    height: 28,
    borderRadius: 14,
    justifyContent: 'center',
    alignItems: 'center',
  },
  qtyInput: {
    width: 44,
    height: 32,
    textAlign: 'center',
    fontSize: 15,
    fontFamily: 'Inter-Bold',
    fontWeight: '700',
    color: Colors.onSurface,
    paddingHorizontal: 0,
    paddingVertical: 0,
    backgroundColor: 'transparent',
    borderWidth: 0,
    outlineStyle: 'none',
  } as any,
  qtyText: {
    ...Typography.bodyMd,
    fontSize: 15,
    fontFamily: 'Inter-Bold',
    fontWeight: '700',
    color: Colors.onSurface,
    paddingHorizontal: 8,
  },
  summarySideContainer: {
    width: '100%',
  },
  summaryCard: {
    backgroundColor: Colors.surfaceContainerLowest,
    borderRadius: BorderRadius.xl,
    padding: Spacing.md,
    borderWidth: 1,
    borderColor: Colors.surfaceContainerHigh,
    shadowColor: Colors.shadowColor,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.08,
    shadowRadius: 12,
    elevation: 4,
  },
  summaryCardDesktop: {
    flex: 1,
    maxWidth: 400,
  },
  summaryTitle: {
    ...Typography.headlineLg,
    fontSize: 17,
    fontFamily: 'Inter-Bold',
    color: Colors.onSurface,
    marginBottom: 8,
  },
  couponRow: {
    flexDirection: 'row',
    gap: Spacing.xs,
    marginBottom: 8,
  },
  couponInput: {
    flex: 1,
    backgroundColor: Colors.surfaceContainerLow,
    borderRadius: BorderRadius.md,
    paddingHorizontal: Spacing.sm,
    height: 38,
    ...Typography.bodyMd,
    fontSize: 12,
    color: Colors.onSurface,
    borderWidth: 1,
    borderColor: Colors.surfaceContainerHigh,
  },
  applyCouponBtn: {
    backgroundColor: Colors.surfaceContainerHigh,
    borderRadius: BorderRadius.md,
    paddingHorizontal: Spacing.md,
    alignItems: 'center',
    justifyContent: 'center',
    height: 38,
  },
  applyCouponText: {
    ...Typography.labelLg,
    fontSize: 12,
    fontFamily: 'Inter-Bold',
    color: Colors.onSurface,
  },
  summaryRows: {
    gap: 4,
    paddingBottom: 6,
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
    fontSize: 13,
    color: Colors.onSurfaceVariant,
  },
  summaryRowValue: {
    ...Typography.titleLg,
    fontSize: 14,
    fontFamily: 'Inter-Bold',
    color: Colors.onSurface,
  },
  totalRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginVertical: 8,
  },
  totalLabel: {
    ...Typography.headlineLg,
    fontSize: 18,
    fontFamily: 'Inter-Bold',
    color: Colors.onSurface,
  },
  totalValue: {
    ...Typography.headlineLg,
    fontSize: 20,
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
