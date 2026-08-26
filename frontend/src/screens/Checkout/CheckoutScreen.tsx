import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
  Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { MaterialIcons } from '@expo/vector-icons';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { Colors } from '@/constants/colors';
import { Typography } from '@/constants/typography';
import { Spacing, BorderRadius } from '@/constants/spacing';
import { HomeHeader } from '@/components/common/HomeHeader';
import { CustomInput } from '@/components/inputs/CustomInput';
import { PrimaryButton } from '@/components/buttons/PrimaryButton';
import { BottomNavBar, TabRoute } from '@/components/common/BottomNavBar';
import { RootStackParamList } from '@/navigation/types';
import { orderService } from '@/services/orderService';
import { paymentService } from '@/services/paymentService';
import { profileService } from '@/services/profileService';
import { cartService } from '@/services/cartService';
import { tokenStorage } from '@/storage/tokenStorage';
import { useAuthStore, useCartStore, useNotificationStore } from '@/store';
import { formatCurrency } from '@/utils/currency';

type CheckoutScreenProps = NativeStackScreenProps<RootStackParamList, 'Checkout'>;

type PaymentMethod = 'razorpay' | 'cod';

export const CheckoutScreen: React.FC<CheckoutScreenProps> = ({ navigation }) => {
  const [currentStep, setCurrentStep] = useState<1 | 2 | 3>(2);

  const user = useAuthStore((state) => state.user);
  const updateProfile = useAuthStore((state) => state.updateProfile);

  // Address State - pre-filled with registration details
  const [fullName, setFullName] = useState(user?.name || '');
  const [email, setEmail] = useState(user?.email || '');
  const [phone, setPhone] = useState(user?.phone || '');
  const [address, setAddress] = useState('');
  const [city, setCity] = useState('');
  const [pincode, setPincode] = useState('');

  // Automatically populate user registration / profile info
  useEffect(() => {
    if (user) {
      if (user.name) setFullName(user.name);
      if (user.email) setEmail(user.email);
      if (user.phone) setPhone(user.phone);
    } else {
      profileService
        .getProfile()
        .then((profile) => {
          if (profile) {
            updateProfile(profile);
            if (profile.name) setFullName(profile.name);
            if (profile.email) setEmail(profile.email);
            if (profile.phone) setPhone(profile.phone);
          }
        })
        .catch(() => {});
    }
  }, [user, updateProfile]);

  // Delivery & Payment
  const [deliveryMethod, setDeliveryMethod] = useState<'standard' | 'express'>('standard');
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>('razorpay');

  const { items, clearCart, couponCode, discount: couponDiscount, fetchCart } = useCartStore();
  const unreadNotifs = useNotificationStore((state) => state.getUnreadCount());

  useEffect(() => {
    fetchCart();
  }, [fetchCart]);

  const subtotal = items.reduce((sum, item) => sum + item.product.price * item.quantity, 0);
  const shippingFee = deliveryMethod === 'express' ? 250 : subtotal > 1000 ? 0 : 99;
  const tax = (subtotal - couponDiscount) > 0 ? (subtotal - couponDiscount) * 0.05 : 0; // 5% GST
  const total = Math.max(0, subtotal - couponDiscount + shippingFee + tax);

  const [isPlacingOrder, setIsPlacingOrder] = useState(false);
  const [paymentError, setPaymentError] = useState<string | null>(null);

  const handlePlaceOrder = useCallback(async () => {
    setPaymentError(null);
    if (!fullName.trim() || !address.trim() || !city.trim() || !pincode.trim()) {
      const missingFields: string[] = [];
      if (!fullName.trim()) missingFields.push('Full Name');
      if (!address.trim()) missingFields.push('Street Address');
      if (!city.trim()) missingFields.push('City');
      if (!pincode.trim()) missingFields.push('Pincode');

      const errorMsg = `⚠️ Please fill in: ${missingFields.join(', ')} before placing your order.`;
      setPaymentError(errorMsg);

      if (Platform.OS === 'web') {
        window.alert(`Incomplete Address!\nPlease fill in your shipping details (${missingFields.join(', ')}) before proceeding to payment.`);
      } else {
        Alert.alert('Incomplete Address', `Please fill in: ${missingFields.join(', ')}`);
      }
      return;
    }
    if (items.length === 0) {
      const errorMsg = 'Your cart is empty. Please add items before checkout.';
      setPaymentError(errorMsg);
      if (Platform.OS === 'web') {
        window.alert(errorMsg);
      } else {
        Alert.alert('Cart Empty', errorMsg);
      }
      return;
    }

    setIsPlacingOrder(true);
    const shippingAddressStr = `${fullName.trim()}${email ? ` (${email.trim()})` : ''}, ${address.trim()}, ${city.trim()} - ${pincode.trim()}${phone ? ` (Phone: ${phone.trim()})` : ''}`;

    try {
      // 1. Verify user authentication
      const token = await tokenStorage.getAccessToken();
      if (!token && !user) {
        setPaymentError('Login Required: Please log in to complete your order.');
        if (Platform.OS === 'web') {
          if (window.confirm('Login Required\nPlease log in or register to complete your order. Go to Login now?')) {
            navigation.navigate('Login');
          }
        } else {
          Alert.alert(
            'Login Required',
            'Please log in or register to complete your order with Razorpay.',
            [
              { text: 'Cancel', style: 'cancel' },
              { text: 'Login', onPress: () => navigation.navigate('Login') },
            ]
          );
        }
        return;
      }

      // 3. Razorpay Payment Flow
      if (paymentMethod === 'razorpay') {
        // Step A: Request server to calculate order amount and create Razorpay test order
        const rzpOrderData = await paymentService.createRazorpayOrder({
          shipping_address: shippingAddressStr,
          coupon_code: couponCode || undefined,
          delivery_method: deliveryMethod,
        });

        // Step B: Launch Razorpay Checkout Modal
        await paymentService.openCheckout({
          keyId: rzpOrderData.razorpay_key_id,
          amountPaise: rzpOrderData.amount,
          currency: rzpOrderData.currency || 'INR',
          orderId: rzpOrderData.razorpay_order_id,
          orderNumber: rzpOrderData.order_number,
          customerName: fullName.trim(),
          customerEmail: email || user?.email || 'customer@cloudcrackers.com',
          customerPhone: phone || '+919876543210',
          onSuccess: async (response) => {
            try {
              setIsPlacingOrder(true);
              // Step C: Send signature to server for HMAC SHA-256 verification
              const verifyRes = await paymentService.verifyRazorpayPayment({
                razorpay_order_id: response.razorpay_order_id,
                razorpay_payment_id: response.razorpay_payment_id,
                razorpay_signature: response.razorpay_signature,
              });

              const backendOrderItems = verifyRes?.order?.items || verifyRes?.data?.order?.items;
              const purchasedItems = Array.isArray(backendOrderItems) && backendOrderItems.length > 0
                ? backendOrderItems.map((item: any) => ({
                    id: item.id || item.product_id || item.product?.id,
                    title: item.product?.name || item.product?.title || item.title || 'Product',
                    name: item.product?.name || item.product?.title || item.name || 'Product',
                    quantity: item.quantity || 1,
                    price: item.price || item.product?.price || 0,
                    imageUrl: Array.isArray(item.product?.images) && item.product.images.length > 0 ? item.product.images[0] : (item.product?.image_url || item.product?.imageUrl),
                    images: item.product?.images,
                    product: item.product,
                  }))
                : items.map((ci) => ({
                    id: ci.product?.id,
                    title: ci.product?.title || 'Product',
                    name: ci.product?.title || 'Product',
                    subtitle: ci.product?.subtitle,
                    quantity: ci.quantity || 1,
                    price: ci.product?.price || 0,
                    imageUrl: ci.product?.imageUrl,
                    images: ci.product?.images,
                    product: ci.product,
                  }));

              clearCart();
              navigation.navigate('OrderSuccess', {
                orderId: rzpOrderData.order_id,
                orderNumber: rzpOrderData.order_number,
                paymentId: response.razorpay_payment_id,
                amountPaid: rzpOrderData.total,
                paymentStatus: 'Paid',
                shippingAddress: shippingAddressStr,
                items: purchasedItems,
              });
            } catch (vErr: any) {
              const errMsg = vErr?.response?.data?.message || vErr?.message || 'Payment signature verification failed.';
              setPaymentError(errMsg);
              Alert.alert('Verification Failed', errMsg);
            } finally {
              setIsPlacingOrder(false);
            }
          },
          onFailure: (err) => {
            setIsPlacingOrder(false);
            const msg = err.description || 'Payment was declined or cancelled.';
            setPaymentError(msg);
            Alert.alert('Payment Failed', msg);
          },
          onDismiss: () => {
            setIsPlacingOrder(false);
          },
        });
      } else {
        // 4. Cash on Delivery (COD) Flow
        const nameParts = fullName.trim().split(' ');
        const fName = nameParts[0] || 'Customer';
        const lName = nameParts.slice(1).join(' ') || '';

        const response = await orderService.placeOrder({
          firstName: fName,
          lastName: lName,
          streetAddress: address.trim(),
          city: city.trim(),
          zipCode: pincode.trim(),
          deliveryMethod,
          paymentMethod: 'cod',
          couponCode: couponCode || undefined,
        });

        const purchasedItems = items.map((ci) => ({
          id: ci.product?.id,
          title: ci.product?.title || 'Product',
          name: ci.product?.title || 'Product',
          subtitle: ci.product?.subtitle,
          quantity: ci.quantity || 1,
          price: ci.product?.price || 0,
          imageUrl: ci.product?.imageUrl,
          images: ci.product?.images,
          product: ci.product,
        }));

        clearCart();
        navigation.navigate('OrderSuccess', {
          orderId: response.orderId,
          orderNumber: response.orderId,
          amountPaid: total,
          paymentStatus: 'Pending (COD)',
          shippingAddress: shippingAddressStr,
          items: purchasedItems,
        });
      }
    } catch (err: any) {
      const errMsg = err?.response?.data?.message || err?.message || 'Failed to initiate order.';
      setPaymentError(errMsg);
      if (err?.status === 401 || err?.response?.status === 401) {
        Alert.alert(
          'Session Expired',
          'Your login session has expired. Please log in again to complete your order.',
          [{ text: 'Login', onPress: () => navigation.navigate('Login') }]
        );
      } else {
        Alert.alert('Checkout Error', errMsg);
      }
    } finally {
      setIsPlacingOrder(false);
    }
  }, [fullName, email, phone, address, city, pincode, items, deliveryMethod, paymentMethod, couponCode, user, clearCart, navigation, total]);

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

  return (
    <SafeAreaView style={styles.safeArea} edges={['top', 'left', 'right']}>
      <HomeHeader
        onBackPress={() => (navigation.canGoBack() ? navigation.goBack() : navigation.navigate('Cart'))}
        onNotificationPress={() => navigation.navigate('Notifications')}
        onProfilePress={() => navigation.navigate('UserProfile')}
        onCartPress={() => navigation.navigate('Cart')}
        notificationCount={unreadNotifs}
      />

      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        {/* Step Progress Indicator */}
        <View style={styles.progressContainer}>
          <TouchableOpacity
            style={styles.inlineBackRow}
            onPress={() => (navigation.canGoBack() ? navigation.goBack() : navigation.navigate('Cart'))}
            activeOpacity={0.7}
          >
            <MaterialIcons name="arrow-back" size={20} color={Colors.primary} />
            <Text style={styles.inlineBackText}>Back to Cart</Text>
          </TouchableOpacity>
          {[
            { step: 1, label: 'Shipping' },
            { step: 2, label: 'Payment' },
            { step: 3, label: 'Confirm' },
          ].map(({ step, label }) => {
            const isActive = currentStep >= step;
            return (
              <TouchableOpacity
                key={step}
                style={styles.stepItem}
                onPress={() => setCurrentStep(step as any)}
                activeOpacity={0.8}
              >
                <View style={[styles.stepCircle, isActive && styles.activeStepCircle]}>
                  <Text style={[styles.stepNumber, isActive && styles.activeStepNumber]}>
                    {step}
                  </Text>
                </View>
                <Text style={[styles.stepLabel, isActive && styles.activeStepLabel]}>
                  {label}
                </Text>
              </TouchableOpacity>
            );
          })}
        </View>

        {paymentError && (
          <View style={styles.errorCard}>
            <MaterialIcons name="error-outline" size={20} color="#D32F2F" />
            <Text style={styles.errorText}>{paymentError}</Text>
          </View>
        )}

        <View style={styles.checkoutContainer}>
          {/* Shipping Address Section */}
          <View style={styles.cardSection}>
            <View style={styles.sectionHeaderRow}>
              <MaterialIcons name="local-shipping" size={22} color={Colors.primary} />
              <Text style={styles.sectionTitle}>Shipping Address</Text>
            </View>

            {/* Name */}
            <CustomInput
              label="Name"
              value={fullName}
              onChangeText={setFullName}
              placeholder="Enter your name"
            />

            {/* Email */}
            <CustomInput
              label="Email"
              value={email}
              onChangeText={setEmail}
              placeholder="Enter your email"
              keyboardType="email-address"
              autoCapitalize="none"
            />

            {/* Phone Number */}
            <CustomInput
              label="Phone Number"
              value={phone}
              onChangeText={setPhone}
              placeholder="Enter phone number"
              keyboardType="phone-pad"
            />

            {/* Address */}
            <CustomInput
              label="Address"
              value={address}
              onChangeText={setAddress}
              placeholder="Enter your address"
            />

            {/* City & Pincode */}
            <View style={styles.nameRow}>
              <CustomInput
                label="City"
                value={city}
                onChangeText={setCity}
                placeholder="Enter city"
                containerStyle={styles.halfInput}
              />
              <CustomInput
                label="Pincode"
                value={pincode}
                onChangeText={setPincode}
                placeholder="Enter pincode"
                keyboardType="numeric"
                containerStyle={styles.halfInput}
              />
            </View>
          </View>

          {/* Delivery Method Section */}
          <View style={styles.cardSection}>
            <View style={styles.sectionHeaderRow}>
              <MaterialIcons name="speed" size={22} color={Colors.primary} />
              <Text style={styles.sectionTitle}>Delivery Method</Text>
            </View>

            <TouchableOpacity
              style={[
                styles.radioOption,
                deliveryMethod === 'standard' && styles.selectedRadioOption,
              ]}
              onPress={() => setDeliveryMethod('standard')}
              activeOpacity={0.8}
            >
              <MaterialIcons
                name={deliveryMethod === 'standard' ? 'radio-button-checked' : 'radio-button-unchecked'}
                size={20}
                color={Colors.primary}
              />
              <View style={styles.radioTextWrapper}>
                <Text style={styles.radioTitle}>Standard Hazmat Delivery</Text>
                <Text style={styles.radioSubtitle}>3-5 business days (Free over {formatCurrency(1000)})</Text>
              </View>
              <Text style={styles.radioPrice}>{subtotal > 1000 ? 'FREE' : formatCurrency(99)}</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[
                styles.radioOption,
                deliveryMethod === 'express' && styles.selectedRadioOption,
              ]}
              onPress={() => setDeliveryMethod('express')}
              activeOpacity={0.8}
            >
              <MaterialIcons
                name={deliveryMethod === 'express' ? 'radio-button-checked' : 'radio-button-unchecked'}
                size={20}
                color={Colors.primary}
              />
              <View style={styles.radioTextWrapper}>
                <Text style={styles.radioTitle}>Express Priority Hazmat</Text>
                <Text style={styles.radioSubtitle}>1-2 business days express dispatch</Text>
              </View>
              <Text style={styles.radioPrice}>{formatCurrency(250)}</Text>
            </TouchableOpacity>
          </View>

          {/* Payment Method Section */}
          <View style={styles.cardSection}>
            <View style={styles.sectionHeaderRow}>
              <MaterialIcons name="payment" size={22} color={Colors.primary} />
              <Text style={styles.sectionTitle}>Payment Method</Text>
            </View>

            {/* Razorpay Option */}
            <TouchableOpacity
              style={[
                styles.paymentOptionCard,
                paymentMethod === 'razorpay' && styles.activePaymentOptionCard,
              ]}
              onPress={() => setPaymentMethod('razorpay')}
              activeOpacity={0.8}
            >
              <View style={styles.paymentOptionHeader}>
                <MaterialIcons
                  name={paymentMethod === 'razorpay' ? 'radio-button-checked' : 'radio-button-unchecked'}
                  size={22}
                  color={Colors.primary}
                />
                <View style={styles.paymentOptionTextWrap}>
                  <View style={styles.paymentBadgeRow}>
                    <Text style={styles.paymentOptionTitle}>Razorpay</Text>
                    <View style={styles.testModeBadge}>
                      <Text style={styles.testModeBadgeText}>TEST MODE</Text>
                    </View>
                  </View>
                  <Text style={styles.paymentOptionDesc}>
                    UPI (GPay, PhonePe, Paytm), Credit/Debit Cards, Net Banking & Wallets
                  </Text>
                </View>
              </View>

              {paymentMethod === 'razorpay' && (
                <View style={styles.gatewayPillsRow}>
                  <View style={styles.gatewayPill}>
                    <MaterialIcons name="account-balance-wallet" size={14} color={Colors.primary} />
                    <Text style={styles.gatewayPillText}>UPI</Text>
                  </View>
                  <View style={styles.gatewayPill}>
                    <MaterialIcons name="credit-card" size={14} color={Colors.primary} />
                    <Text style={styles.gatewayPillText}>Cards</Text>
                  </View>
                  <View style={styles.gatewayPill}>
                    <MaterialIcons name="account-balance" size={14} color={Colors.primary} />
                    <Text style={styles.gatewayPillText}>Net Banking</Text>
                  </View>
                  <View style={styles.gatewayPill}>
                    <MaterialIcons name="wallet" size={14} color={Colors.primary} />
                    <Text style={styles.gatewayPillText}>Wallets</Text>
                  </View>
                </View>
              )}
            </TouchableOpacity>

            {/* COD Option */}
            <TouchableOpacity
              style={[
                styles.paymentOptionCard,
                paymentMethod === 'cod' && styles.activePaymentOptionCard,
                { marginTop: Spacing.sm },
              ]}
              onPress={() => setPaymentMethod('cod')}
              activeOpacity={0.8}
            >
              <View style={styles.paymentOptionHeader}>
                <MaterialIcons
                  name={paymentMethod === 'cod' ? 'radio-button-checked' : 'radio-button-unchecked'}
                  size={22}
                  color={Colors.primary}
                />
                <View style={styles.paymentOptionTextWrap}>
                  <Text style={styles.paymentOptionTitle}>Cash on Delivery (COD)</Text>
                  <Text style={styles.paymentOptionDesc}>Pay in cash when order arrives</Text>
                </View>
              </View>
            </TouchableOpacity>
          </View>

          {/* Order Summary */}
          <View style={styles.summaryCard}>
            <Text style={styles.summaryTitle}>Order Summary</Text>

            <View style={styles.summaryRows}>
              <View style={styles.summaryRow}>
                <Text style={styles.summaryLabel}>Subtotal ({items.length} items)</Text>
                <Text style={styles.summaryValue}>{formatCurrency(subtotal)}</Text>
              </View>

              {couponDiscount > 0 && (
                <View style={styles.summaryRow}>
                  <Text style={[styles.summaryLabel, { color: '#2E7D32' }]}>
                    Coupon Discount ({couponCode})
                  </Text>
                  <Text style={[styles.summaryValue, { color: '#2E7D32' }]}>
                    -{formatCurrency(couponDiscount)}
                  </Text>
                </View>
              )}

              <View style={styles.summaryRow}>
                <Text style={styles.summaryLabel}>Shipping ({deliveryMethod === 'express' ? 'Express' : 'Standard'})</Text>
                <Text style={styles.summaryValue}>{shippingFee === 0 ? 'FREE' : formatCurrency(shippingFee)}</Text>
              </View>

              <View style={styles.summaryRow}>
                <Text style={styles.summaryLabel}>GST / Hazmat Tax (5%)</Text>
                <Text style={styles.summaryValue}>{formatCurrency(tax)}</Text>
              </View>
            </View>

            <View style={styles.totalRow}>
              <Text style={styles.totalLabel}>Payable Total</Text>
              <Text style={styles.totalValue}>{formatCurrency(total)}</Text>
            </View>

            {paymentError && (
              <View style={[styles.errorCard, { marginHorizontal: 0, marginTop: Spacing.xs, marginBottom: Spacing.sm }]}>
                <MaterialIcons name="error-outline" size={20} color="#D32F2F" />
                <Text style={styles.errorText}>{paymentError}</Text>
              </View>
            )}

            <PrimaryButton
              title={
                isPlacingOrder
                  ? 'Processing Payment...'
                  : paymentMethod === 'razorpay'
                  ? `Pay Now • ${formatCurrency(total)}`
                  : `Confirm COD Order • ${formatCurrency(total)}`
              }
              onPress={handlePlaceOrder}
              disabled={isPlacingOrder}
              style={styles.placeOrderCta}
            />

            {isPlacingOrder && (
              <View style={styles.loadingIndicatorRow}>
                <ActivityIndicator size="small" color={Colors.primary} />
                <Text style={styles.loadingText}>Securing transaction with Razorpay...</Text>
              </View>
            )}
          </View>
        </View>
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
  progressContainer: {
    paddingHorizontal: Spacing.marginMobile,
    marginTop: Spacing.sm,
    marginBottom: Spacing.md,
  },
  inlineBackRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginBottom: Spacing.xs,
  },
  inlineBackText: {
    ...Typography.labelLg,
    fontSize: 13,
    fontFamily: 'Inter-Bold',
    color: Colors.primary,
  },
  stepItem: {
    alignItems: 'center',
  },
  stepCircle: {
    width: 32,
    height: 32,
    borderRadius: BorderRadius.full,
    backgroundColor: Colors.surfaceContainerHigh,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 4,
  },
  activeStepCircle: {
    backgroundColor: Colors.primary,
  },
  stepNumber: {
    ...Typography.labelLg,
    fontSize: 12,
    fontFamily: 'Inter-Bold',
    color: Colors.tertiary,
  },
  activeStepNumber: {
    color: '#ffffff',
  },
  stepLabel: {
    ...Typography.labelLg,
    fontSize: 11,
    fontFamily: 'Inter-Medium',
    color: Colors.tertiary,
  },
  activeStepLabel: {
    fontFamily: 'Inter-Bold',
    color: Colors.primary,
  },
  errorCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFEBEE',
    marginHorizontal: Spacing.marginMobile,
    marginBottom: Spacing.sm,
    padding: Spacing.sm,
    borderRadius: BorderRadius.lg,
    gap: Spacing.xs,
  },
  errorText: {
    flex: 1,
    ...Typography.bodyMd,
    fontSize: 13,
    color: '#D32F2F',
  },
  checkoutContainer: {
    paddingHorizontal: Spacing.marginMobile,
    gap: Spacing.md,
  },
  cardSection: {
    backgroundColor: Colors.surfaceContainerLowest,
    borderRadius: BorderRadius.xl,
    padding: Spacing.md,
    borderWidth: 1,
    borderColor: Colors.surfaceContainerHigh,
    shadowColor: Colors.shadowColor,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.06,
    shadowRadius: 10,
    elevation: 3,
  },
  sectionHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.xs,
    marginBottom: Spacing.sm,
  },
  sectionTitle: {
    ...Typography.titleLg,
    fontSize: 18,
    fontFamily: 'Inter-Bold',
    color: Colors.onSurface,
  },
  nameRow: {
    flexDirection: 'row',
    gap: Spacing.xs,
  },
  halfInput: {
    flex: 1,
  },
  quarterInput: {
    flex: 1,
  },
  radioOption: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.surfaceContainerLow,
    borderRadius: BorderRadius.lg,
    padding: Spacing.md,
    marginBottom: Spacing.xs,
    borderWidth: 1,
    borderColor: Colors.surfaceContainerHigh,
  },
  selectedRadioOption: {
    borderColor: Colors.primary,
    backgroundColor: Colors.primaryFixed,
  },
  radioTextWrapper: {
    flex: 1,
    marginLeft: Spacing.xs,
  },
  radioTitle: {
    ...Typography.titleLg,
    fontSize: 14,
    fontFamily: 'Inter-Bold',
    color: Colors.onSurface,
  },
  radioSubtitle: {
    ...Typography.bodyMd,
    fontSize: 12,
    color: Colors.tertiary,
  },
  radioPrice: {
    ...Typography.titleLg,
    fontSize: 14,
    fontFamily: 'Inter-Bold',
    color: Colors.primary,
  },
  paymentOptionCard: {
    backgroundColor: Colors.surfaceContainerLow,
    borderRadius: BorderRadius.lg,
    padding: Spacing.md,
    borderWidth: 1,
    borderColor: Colors.surfaceContainerHigh,
  },
  activePaymentOptionCard: {
    borderColor: Colors.primary,
    backgroundColor: Colors.primaryFixed,
  },
  paymentOptionHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: Spacing.xs,
  },
  paymentOptionTextWrap: {
    flex: 1,
  },
  paymentBadgeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.xs,
  },
  paymentOptionTitle: {
    ...Typography.titleLg,
    fontSize: 15,
    fontFamily: 'Inter-Bold',
    color: Colors.onSurface,
  },
  testModeBadge: {
    backgroundColor: '#FFF3E0',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
    borderWidth: 1,
    borderColor: '#FF9800',
  },
  testModeBadgeText: {
    fontSize: 10,
    fontFamily: 'Inter-Bold',
    color: '#E65100',
  },
  paymentOptionDesc: {
    ...Typography.bodyMd,
    fontSize: 12,
    color: Colors.onSurfaceVariant,
    marginTop: 2,
  },
  gatewayPillsRow: {
    flexDirection: 'row',
    gap: Spacing.xs,
    marginTop: Spacing.sm,
    paddingTop: Spacing.xs,
    borderTopWidth: 1,
    borderTopColor: Colors.surfaceContainerHigh,
  },
  gatewayPill: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.surfaceContainerLowest,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: BorderRadius.md,
    borderWidth: 1,
    borderColor: Colors.surfaceContainerHigh,
    gap: 4,
  },
  gatewayPillText: {
    ...Typography.labelLg,
    fontSize: 11,
    fontFamily: 'Inter-Medium',
    color: Colors.onSurface,
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
    marginBottom: Spacing.sm,
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
  summaryLabel: {
    ...Typography.bodyMd,
    fontSize: 14,
    color: Colors.onSurfaceVariant,
  },
  summaryValue: {
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
  placeOrderCta: {
    marginTop: Spacing.xs,
  },
  loadingIndicatorRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: Spacing.sm,
    gap: Spacing.xs,
  },
  loadingText: {
    ...Typography.bodyMd,
    fontSize: 12,
    color: Colors.primary,
    fontFamily: 'Inter-Medium',
  },
});

export default CheckoutScreen;
