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
  useWindowDimensions,
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
import { useAuthStore, useCartStore, useNotificationStore, useSettingsStore } from '@/store';
import { formatCurrency } from '@/utils/currency';
import { OnlineDeliveryBanner } from '@/components/cart/OnlineDeliveryBanner';

import { ResponsiveContainer } from '@/components/common/ResponsiveContainer';
import { useAppLayout } from '@/hooks/useAppLayout';
import { useSmartTabNavigation } from '@/hooks/useSmartTabNavigation';

type CheckoutScreenProps = NativeStackScreenProps<RootStackParamList, 'Checkout'>;

type PaymentMethod = 'upi' | 'cod';

export const CheckoutScreen: React.FC<CheckoutScreenProps> = ({ navigation }) => {
  const { handleTabPress } = useSmartTabNavigation();
  const { isDesktopWeb: isDesktop } = useAppLayout();
  const { width: windowWidth } = useWindowDimensions();
  const isSmallMobile = windowWidth < 380;
  const [currentStep, setCurrentStep] = useState<1 | 2 | 3>(1);

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
  type DeliveryMethodType = 'online' | 'pickup';
  const [deliveryMethod, setDeliveryMethod] = useState<DeliveryMethodType>('pickup');
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>('upi');

  const { items, clearCart, couponCode, discount: couponDiscount, fetchCart } = useCartStore();
  const { minOnlineDeliveryAmount, fetchSettings } = useSettingsStore();
  const unreadNotifs = useNotificationStore((state) => state.getUnreadCount());

  useEffect(() => {
    fetchCart();
    fetchSettings();
  }, [fetchCart, fetchSettings]);

  const subtotal = items.reduce((sum, item) => sum + item.product.price * item.quantity, 0);

  // Reset to pickup when subtotal drops below minOnlineDeliveryAmount
  useEffect(() => {
    if (subtotal < minOnlineDeliveryAmount && deliveryMethod === 'online') {
      setDeliveryMethod('pickup');
    }
  }, [subtotal, deliveryMethod, minOnlineDeliveryAmount]);

  // City → Pincode auto-mapping for known service areas
  const CITY_PINCODE_MAP: Record<string, string> = {
    'sivakasi': '626189',
    'virudhunagar': '626001',
    'madurai': '625001',
    'tirunelveli': '627001',
    'coimbatore': '641001',
    'chennai': '600001',
    'trichy': '620001',
    'tiruchirappalli': '620001',
    'salem': '636001',
    'erode': '638001',
    'vellore': '632001',
    'thoothukudi': '628001',
    'tuticorin': '628001',
    'dindigul': '624001',
    'thanjavur': '613001',
    'tiruppur': '641601',
    'rajapalayam': '626117',
    'srivilliputtur': '626125',
    'aruppukkottai': '626101',
    'sattur': '626203',
    'kovilpatti': '628501',
  };

  // Auto-fill pincode when city changes
  useEffect(() => {
    if (deliveryMethod !== 'online') return;
    const key = city.trim().toLowerCase();
    if (key && CITY_PINCODE_MAP[key]) {
      setPincode(CITY_PINCODE_MAP[key]);
    } else if (key && !CITY_PINCODE_MAP[key]) {
      // Don't invent a pincode — let user enter manually
      setPincode('');
    }
  }, [city, deliveryMethod]);

  const shippingFee = 0; // Always ₹0 — no delivery charges
  const tax = items.reduce((sum, item) => sum + (item.product.gstAmount || 0) * item.quantity, 0);
  const total = Math.max(0, subtotal - couponDiscount + shippingFee + tax);

  const [isPlacingOrder, setIsPlacingOrder] = useState(false);
  const [paymentError, setPaymentError] = useState<string | null>(null);

  const handleProceedToPayment = useCallback(() => {
    setPaymentError(null);
    const isPickup = deliveryMethod === 'pickup';
    const missingFields: string[] = [];
    if (!fullName.trim()) missingFields.push('Full Name');
    if (!isPickup) {
      if (!address.trim()) missingFields.push('Street Address');
      if (!city.trim()) missingFields.push('City');
      if (!pincode.trim()) missingFields.push('Pincode');
    }
    if (missingFields.length > 0) {
      setPaymentError(`⚠️ Please fill in: ${missingFields.join(', ')} before proceeding to payment.`);
      return;
    }
    setCurrentStep(2);
  }, [fullName, address, city, pincode, deliveryMethod]);

  const handlePlaceOrder = useCallback(async () => {
    setPaymentError(null);
    const isPickup = deliveryMethod === 'pickup';
    const missingFields: string[] = [];
    if (!fullName.trim()) missingFields.push('Full Name');
    if (!isPickup) {
      if (!address.trim()) missingFields.push('Street Address');
      if (!city.trim()) missingFields.push('City');
      if (!pincode.trim()) missingFields.push('Pincode');
    }
    if (missingFields.length > 0) {
      const errorMsg = `⚠️ Please fill in: ${missingFields.join(', ')} before placing your order.`;
      setPaymentError(errorMsg);
      setCurrentStep(1);
      if (Platform.OS === 'web') {
        window.alert(`Incomplete Details!\nPlease fill in: ${missingFields.join(', ')}`);
      } else {
        Alert.alert('Incomplete Details', `Please fill in: ${missingFields.join(', ')}`);
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
    const shippingAddressStr = isPickup
      ? `${fullName.trim()}${email ? ` (${email.trim()})` : ''} — Store Pickup${phone ? ` (Phone: ${phone.trim()})` : ''}`
      : `${fullName.trim()}${email ? ` (${email.trim()})` : ''}, ${address.trim()}, ${city.trim()} - ${pincode.trim()}${phone ? ` (Phone: ${phone.trim()})` : ''}`;

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
            'Please log in or register to complete your order with Online Payment.',
            [
              { text: 'Cancel', style: 'cancel' },
              { text: 'Login', onPress: () => navigation.navigate('Login') },
            ]
          );
        }
        return;
      }

      // 3. UPI QR Payment Flow
      if (paymentMethod === 'upi') {
        // Step A: Request server to calculate order amount and create UPI pending order
        const upiOrderData = await paymentService.createUpiOrder({
          shipping_address: shippingAddressStr,
          coupon_code: couponCode || undefined,
          delivery_method: deliveryMethod === 'online' ? 'ONLINE_DELIVERY' : 'STORE_PICKUP',
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
          orderId: upiOrderData.order_id,
          orderNumber: upiOrderData.order_number,
          paymentId: upiOrderData.payment_id,
          amountPaid: upiOrderData.total,
          paymentStatus: 'Pending',
          shippingAddress: shippingAddressStr,
          items: purchasedItems,
          upiUri: upiOrderData.upi_uri,
          qrCodeBase64: upiOrderData.qr_code_base64,
        });

      } else {
        // 4. Cash on Delivery (COD) Flow
        const nameParts = fullName.trim().split(' ');
        const fName = nameParts[0] || 'Customer';
        const lName = nameParts.slice(1).join(' ') || '';

        const response = await orderService.placeOrder({
          firstName: fName,
          lastName: lName,
          streetAddress: deliveryMethod === 'pickup' ? 'Store Pickup' : address.trim(),
          city: deliveryMethod === 'pickup' ? '' : city.trim(),
          zipCode: deliveryMethod === 'pickup' ? '' : pincode.trim(),
          deliveryMethod: deliveryMethod === 'online' ? 'ONLINE_DELIVERY' : 'STORE_PICKUP',
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
          paymentStatus: deliveryMethod === 'pickup' ? 'Pay at Store' : 'Pending (COD)',
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
  }, [fullName, email, phone, address, city, pincode, items, deliveryMethod, paymentMethod, couponCode, user, clearCart, navigation, total, subtotal]);

  const handleCheckoutBack = useCallback(() => {
    if (currentStep === 2) {
      setCurrentStep(1);
    } else if (currentStep === 3) {
      setCurrentStep(2);
    } else {
      if (navigation.canGoBack()) {
        navigation.goBack();
      } else {
        navigation.navigate('Cart');
      }
    }
  }, [currentStep, navigation]);

  return (
    <ResponsiveContainer>
      <SafeAreaView style={styles.safeArea} edges={['top', 'left', 'right']}>
      <HomeHeader
        onBackPress={handleCheckoutBack}
        onNotificationPress={() => navigation.navigate('Notifications')}
        onProfilePress={() => navigation.navigate('UserProfile')}
        onCartPress={() => navigation.navigate('Cart')}
        notificationCount={unreadNotifs}
      />

      {/* Sleek Horizontal Stepper Header Bar */}
      <View style={styles.horizontalStepperBar}>
        <TouchableOpacity
          style={styles.inlineBackBtn}
          onPress={handleCheckoutBack}
          activeOpacity={0.7}
        >
          <MaterialIcons name="arrow-back" size={18} color={Colors.primary} />
          <Text style={styles.inlineBackText} numberOfLines={1}>
            Back
          </Text>
        </TouchableOpacity>

        <View style={styles.stepperRowHorizontal}>
          {[
            { step: 1, label: 'Shipping' },
            { step: 2, label: 'Payment' },
            { step: 3, label: 'Confirm' },
          ].map(({ step, label }, idx) => {
            const isCompleted = currentStep > step;
            const isCurrent = currentStep === step;
            const isActive = currentStep >= step;
            const showLabel = !isSmallMobile || isCurrent;
            return (
              <React.Fragment key={step}>
                {idx > 0 && (
                  <View style={[styles.stepLineHorizontal, currentStep >= step && styles.activeStepLineHorizontal]} />
                )}
                <TouchableOpacity
                  style={styles.stepItemHorizontal}
                  onPress={() => {
                    if (step === 2 && currentStep === 1) {
                      handleProceedToPayment();
                    } else {
                      setCurrentStep(step as any);
                    }
                  }}
                  activeOpacity={0.8}
                >
                  <View
                    style={[
                      styles.stepCircleHorizontal,
                      isCurrent ? styles.currentStepCircle : isCompleted ? styles.completedStepCircle : null,
                    ]}
                  >
                    {isCompleted ? (
                      <MaterialIcons name="check" size={12} color="#ffffff" />
                    ) : (
                      <Text style={[styles.stepNumberHorizontal, isActive && styles.activeStepNumberHorizontal]}>
                        {step}
                      </Text>
                    )}
                  </View>
                  {showLabel && (
                    <Text
                      style={[styles.stepLabelHorizontal, isActive && styles.activeStepLabelHorizontal]}
                      numberOfLines={1}
                    >
                      {label}
                    </Text>
                  )}
                </TouchableOpacity>
              </React.Fragment>
            );
          })}
        </View>
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        {paymentError && (
          <View style={styles.errorCard}>
            <MaterialIcons name="error-outline" size={20} color="#D32F2F" />
            <Text style={styles.errorText}>{paymentError}</Text>
          </View>
        )}

        <View style={[styles.checkoutContainer, isDesktop && styles.checkoutContainerDesktop]}>
          {/* Active Step Content (Left Column on Desktop) */}
          <View style={[styles.stepContentWrap, isDesktop && styles.stepContentWrapDesktop]}>
            {/* STEP 1: Shipping Address & Delivery Method */}
            {currentStep === 1 && (
              <View style={styles.cardSection}>
                <View style={styles.sectionHeaderRow}>
                  <MaterialIcons name="local-shipping" size={22} color={Colors.primary} />
                  <Text style={styles.sectionTitle}>1. Shipping & Delivery Address</Text>
                </View>

                {/* Name & Phone */}
                <View style={[styles.nameRow, !isDesktop && styles.nameRowMobile]}>
                  <CustomInput
                    label="Name"
                    value={fullName}
                    onChangeText={setFullName}
                    placeholder="Enter your name"
                    containerStyle={styles.halfInput}
                  />
                  <CustomInput
                    label="Phone Number"
                    value={phone}
                    onChangeText={setPhone}
                    placeholder="Phone number"
                    keyboardType="phone-pad"
                    containerStyle={styles.halfInput}
                  />
                </View>

                {/* Email & Street Address */}
                <View style={[styles.nameRow, !isDesktop && styles.nameRowMobile]}>
                  <CustomInput
                    label="Email"
                    value={email}
                    onChangeText={setEmail}
                    placeholder="Enter your email"
                    keyboardType="email-address"
                    autoCapitalize="none"
                    containerStyle={styles.halfInput}
                  />
                  <CustomInput
                    label="Street Address"
                    value={address}
                    onChangeText={setAddress}
                    placeholder="House No., Building, Street Name"
                    containerStyle={styles.halfInput}
                  />
                </View>

                {/* City & Pincode — only shown for Online Delivery */}
                {deliveryMethod === 'online' && (
                  <View style={[styles.nameRow, !isDesktop && styles.nameRowMobile]}>
                    <CustomInput
                      label="City"
                      value={city}
                      onChangeText={(v) => setCity(v)}
                      placeholder="Enter city"
                      containerStyle={styles.halfInput}
                    />
                    <CustomInput
                      label="Pincode"
                      value={pincode}
                      onChangeText={setPincode}
                      placeholder="Enter 6-digit pincode"
                      keyboardType="numeric"
                      maxLength={6}
                      containerStyle={styles.halfInput}
                    />
                  </View>
                )}


                {/* Delivery Method Section */}
                <View style={[styles.sectionHeaderRow, { marginTop: 10, marginBottom: 6 }]}>
                  <MaterialIcons name="local-shipping" size={18} color={Colors.primary} />
                  <Text style={[styles.sectionTitle, { fontSize: 15 }]}>Delivery Method</Text>
                </View>

                {/* Online Delivery Option */}
                <TouchableOpacity
                  style={[
                    styles.radioOption,
                    { marginBottom: 8 },
                    deliveryMethod === 'online' && styles.selectedRadioOption,
                    subtotal < minOnlineDeliveryAmount && styles.disabledRadioOption,
                  ]}
                  onPress={() => {
                    if (subtotal >= minOnlineDeliveryAmount) setDeliveryMethod('online');
                  }}
                  activeOpacity={subtotal >= minOnlineDeliveryAmount ? 0.8 : 1}
                >
                  <MaterialIcons
                    name={deliveryMethod === 'online' ? 'radio-button-checked' : 'radio-button-unchecked'}
                    size={18}
                    color={subtotal >= minOnlineDeliveryAmount ? Colors.primary : Colors.tertiary}
                  />
                  <View style={{ flex: 1, marginLeft: 8 }}>
                    <Text style={[
                      styles.radioTitle,
                      subtotal < minOnlineDeliveryAmount && { color: Colors.tertiary },
                    ]}>Online Delivery</Text>
                    <Text style={styles.radioSubtitle}>Delivered to your selected address • FREE</Text>
                    {subtotal < minOnlineDeliveryAmount && (
                      <Text style={styles.deliveryInfoMsg}>
                        Available for orders of {formatCurrency(minOnlineDeliveryAmount)} and above
                      </Text>
                    )}
                  </View>
                  {subtotal >= minOnlineDeliveryAmount && (
                    <View style={styles.freeBadge}>
                      <Text style={styles.freeBadgeText}>FREE</Text>
                    </View>
                  )}
                </TouchableOpacity>

                {/* Store Pickup Option */}
                <TouchableOpacity
                  style={[
                    styles.radioOption,
                    { marginBottom: 0 },
                    deliveryMethod === 'pickup' && styles.selectedRadioOption,
                  ]}
                  onPress={() => setDeliveryMethod('pickup')}
                  activeOpacity={0.8}
                >
                  <MaterialIcons
                    name={deliveryMethod === 'pickup' ? 'radio-button-checked' : 'radio-button-unchecked'}
                    size={18}
                    color={Colors.primary}
                  />
                  <View style={{ flex: 1, marginLeft: 8 }}>
                    <Text style={styles.radioTitle}>Store Pickup</Text>
                    <Text style={styles.radioSubtitle}>Pick up your order directly from our store • FREE</Text>
                  </View>
                  <View style={styles.freeBadge}>
                    <Text style={styles.freeBadgeText}>FREE</Text>
                  </View>
                </TouchableOpacity>

                {!isDesktop && (
                  <PrimaryButton
                    title="Proceed to Payment →"
                    onPress={handleProceedToPayment}
                    style={{ marginTop: Spacing.md }}
                  />
                )}
              </View>
            )}

            {/* STEP 2: Payment Method */}
            {currentStep === 2 && (
              <View style={styles.cardSection}>
                {/* Compact Address Summary Pill */}
                <View style={styles.addressSummaryPill}>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.summaryPillTitle}>Deliver to: {fullName || 'Customer'}</Text>
                    <Text style={styles.summaryPillText} numberOfLines={1}>
                      {deliveryMethod === 'pickup'
                        ? '🏪 Store Pickup'
                        : address ? `${address}, ${city} - ${pincode}` : 'Address not specified'}
                    </Text>
                  </View>
                  <TouchableOpacity
                    style={styles.changeAddressBtn}
                    onPress={() => setCurrentStep(1)}
                    activeOpacity={0.7}
                  >
                    <Text style={styles.changeAddressText}>Edit</Text>
                  </TouchableOpacity>
                </View>

                <View style={styles.sectionHeaderRow}>
                  <MaterialIcons name="payment" size={22} color={Colors.primary} />
                  <Text style={styles.sectionTitle}>2. Choose Payment Method</Text>
                </View>

                {/* UPI QR Option */}
                <TouchableOpacity
                  style={[
                    styles.paymentOptionCard,
                    paymentMethod === 'upi' && styles.activePaymentOptionCard,
                  ]}
                  onPress={() => setPaymentMethod('upi')}
                  activeOpacity={0.8}
                >
                  <View style={styles.paymentOptionHeader}>
                    <MaterialIcons
                      name={paymentMethod === 'upi' ? 'radio-button-checked' : 'radio-button-unchecked'}
                      size={22}
                      color={Colors.primary}
                    />
                    <View style={styles.paymentOptionTextWrap}>
                      <View style={styles.paymentBadgeRow}>
                        <Text style={styles.paymentOptionTitle}>UPI QR Payment</Text>
                      </View>
                      <Text style={styles.paymentOptionDesc}>
                        Receive payment QR Code on your registered email or pay via UPI App
                      </Text>
                    </View>
                  </View>

                  {paymentMethod === 'upi' && (
                    <View style={styles.gatewayPillsRow}>
                      <View style={styles.gatewayPill}>
                        <MaterialIcons name="qr-code-scanner" size={14} color={Colors.primary} />
                        <Text style={styles.gatewayPillText}>GPay / PhonePe / Paytm</Text>
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
                      <Text style={styles.paymentOptionTitle}>
                        {deliveryMethod === 'pickup' ? 'Pay at Store (Cash / UPI at Store)' : 'Cash on Delivery (COD)'}
                      </Text>
                      <Text style={styles.paymentOptionDesc}>
                        {deliveryMethod === 'pickup'
                          ? 'Pay via cash or UPI scanner when collecting your crackers at our store'
                          : 'Pay in cash when order arrives at your address'}
                      </Text>
                    </View>
                  </View>
                </TouchableOpacity>

                {!isDesktop && (
                  <PrimaryButton
                    title="Review Order & Pay →"
                    onPress={() => setCurrentStep(3)}
                    style={{ marginTop: Spacing.md }}
                  />
                )}

                <TouchableOpacity
                  style={styles.backStepBtn}
                  onPress={() => setCurrentStep(1)}
                  activeOpacity={0.7}
                >
                  <Text style={styles.backStepBtnText}>← Back to Shipping Address</Text>
                </TouchableOpacity>
              </View>
            )}

            {/* STEP 3: Confirm & Order Summary */}
            {currentStep === 3 && (
              <View style={styles.cardSection}>
                {/* Shipping & Payment Summary Banners */}
                <View style={styles.addressSummaryPill}>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.summaryPillTitle}>Deliver To: {fullName}</Text>
                    <Text style={styles.summaryPillText} numberOfLines={1}>
                      {deliveryMethod === 'pickup'
                        ? '🏪 Store Pickup — Collect from our store'
                        : `${address}, ${city} - ${pincode}`}
                    </Text>
                  </View>
                  <TouchableOpacity
                    style={styles.changeAddressBtn}
                    onPress={() => setCurrentStep(1)}
                    activeOpacity={0.7}
                  >
                    <Text style={styles.changeAddressText}>Change</Text>
                  </TouchableOpacity>
                </View>

                <View style={[styles.addressSummaryPill, { marginTop: Spacing.xs }]}>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.summaryPillTitle}>Payment Method</Text>
                    <Text style={styles.summaryPillText}>
                      {paymentMethod === 'upi'
                        ? 'Online UPI QR Payment'
                        : deliveryMethod === 'pickup'
                        ? 'Pay at Store (Cash / UPI at Store)'
                        : 'Cash on Delivery (COD)'}
                    </Text>
                  </View>
                  <TouchableOpacity
                    style={styles.changeAddressBtn}
                    onPress={() => setCurrentStep(2)}
                    activeOpacity={0.7}
                  >
                    <Text style={styles.changeAddressText}>Change</Text>
                  </TouchableOpacity>
                </View>

                {/* Order Summary (on Mobile or Step 3) */}
                <View style={styles.summaryCardInner}>
                  <Text style={styles.summaryTitle}>3. Order Summary & Payment</Text>

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
                  </View>

                  <View style={styles.totalRow}>
                    <Text style={styles.totalLabel}>Payable Total</Text>
                    <Text style={styles.totalValue}>{formatCurrency(total)}</Text>
                  </View>

                  {!isDesktop && (
                    <PrimaryButton
                      title={
                        isPlacingOrder
                          ? 'Generating UPI QR...'
                          : paymentMethod === 'upi'
                          ? `Pay with UPI • ${formatCurrency(total)}`
                          : `Confirm COD Order • ${formatCurrency(total)}`
                      }
                      onPress={handlePlaceOrder}
                      disabled={isPlacingOrder}
                      style={styles.placeOrderCta}
                    />
                  )}

                  {isPlacingOrder && (
                    <View style={styles.loadingIndicatorRow}>
                      <ActivityIndicator size="small" color={Colors.primary} />
                      <Text style={styles.loadingText}>Processing order & sending payment QR to email...</Text>
                    </View>
                  )}
                </View>

                <TouchableOpacity
                  style={styles.backStepBtn}
                  onPress={() => setCurrentStep(2)}
                  activeOpacity={0.7}
                >
                  <Text style={styles.backStepBtnText}>← Back to Payment Method</Text>
                </TouchableOpacity>
              </View>
            )}
          </View>

          {/* Right Side Summary Panel (Desktop Only) */}
          {isDesktop && (
            <View style={{ width: '100%', maxWidth: 360 }}>
              <View style={styles.sideSummaryCard}>
                <Text style={styles.sideSummaryTitle}>Order Summary ({items.length} items)</Text>

              <View style={styles.summaryRows}>
                <View style={styles.summaryRow}>
                  <Text style={styles.summaryLabel}>Subtotal</Text>
                  <Text style={styles.summaryValue}>{formatCurrency(subtotal)}</Text>
                </View>
                {couponDiscount > 0 && (
                  <View style={styles.summaryRow}>
                    <Text style={[styles.summaryLabel, { color: '#2E7D32' }]}>
                      Discount ({couponCode})
                    </Text>
                    <Text style={[styles.summaryValue, { color: '#2E7D32' }]}>
                      -{formatCurrency(couponDiscount)}
                    </Text>
                  </View>
                )}
              </View>

              <View style={styles.totalRow}>
                <Text style={styles.totalLabel}>Total</Text>
                <Text style={styles.totalValue}>{formatCurrency(total)}</Text>
              </View>

              {currentStep === 1 && (
                <PrimaryButton
                  title="Proceed to Payment →"
                  onPress={handleProceedToPayment}
                  style={{ marginTop: Spacing.sm }}
                />
              )}
              {currentStep === 2 && (
                <PrimaryButton
                  title="Review Order & Pay →"
                  onPress={() => setCurrentStep(3)}
                  style={{ marginTop: Spacing.sm }}
                />
              )}
              {currentStep === 3 && (
                <PrimaryButton
                  title={
                    isPlacingOrder
                      ? 'Processing Payment...'
                      : paymentMethod === 'upi'
                      ? `Pay Now • ${formatCurrency(total)}`
                      : deliveryMethod === 'pickup'
                      ? `Confirm Store Pickup Order • ${formatCurrency(total)}`
                      : `Confirm COD Order • ${formatCurrency(total)}`
                  }
                  onPress={handlePlaceOrder}
                  disabled={isPlacingOrder}
                  style={{ marginTop: Spacing.sm }}
                />
              )}

              <View style={[styles.securityBadge, { marginTop: 12 }]}>
                <MaterialIcons name="verified-user" size={14} color={Colors.tertiary} />
                <Text style={styles.securityText}>SECURE SSL 256-BIT ENCRYPTION</Text>
              </View>
            </View>
          </View>
          )}
        </View>
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
    paddingBottom: Spacing.xs,
  },
  horizontalStepperBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: Colors.surfaceContainerLowest,
    paddingHorizontal: Spacing.marginMobile,
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: Colors.surfaceContainerHigh,
    marginBottom: 6,
  },
  inlineBackBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingRight: 8,
    flexShrink: 0,
  },
  inlineBackText: {
    ...Typography.labelLg,
    fontSize: 12,
    fontFamily: 'Inter-Bold',
    color: Colors.primary,
  },
  stepperRowHorizontal: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-end',
    gap: 4,
    flex: 1,
  },
  stepItemHorizontal: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    flexShrink: 0,
  },
  stepLineHorizontal: {
    width: 10,
    height: 2,
    backgroundColor: Colors.surfaceContainerHigh,
    marginHorizontal: 1,
    flexShrink: 1,
  },
  activeStepLineHorizontal: {
    backgroundColor: Colors.primary,
  },
  stepCircleHorizontal: {
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: Colors.surfaceContainerHigh,
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  currentStepCircle: {
    backgroundColor: Colors.primary,
  },
  completedStepCircle: {
    backgroundColor: Colors.primary,
  },
  stepNumberHorizontal: {
    ...Typography.labelLg,
    fontSize: 10,
    fontFamily: 'Inter-Bold',
    color: Colors.tertiary,
  },
  activeStepNumberHorizontal: {
    color: '#ffffff',
  },
  stepLabelHorizontal: {
    ...Typography.labelLg,
    fontSize: 11,
    fontFamily: 'Inter-Medium',
    color: Colors.tertiary,
    flexShrink: 0,
  },
  activeStepLabelHorizontal: {
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
  },
  checkoutContainerDesktop: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 20,
  },
  stepContentWrap: {
    width: '100%',
  },
  stepContentWrapDesktop: {
    flex: 1.3,
  },
  sideSummaryCard: {
    flex: 1,
    maxWidth: 380,
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
  sideSummaryTitle: {
    ...Typography.headlineLg,
    fontSize: 18,
    fontFamily: 'Inter-Bold',
    color: Colors.onSurface,
    marginBottom: Spacing.sm,
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
    fontSize: 17,
    fontFamily: 'Inter-Bold',
    color: Colors.onSurface,
  },
  nameRow: {
    flexDirection: 'row',
    gap: Spacing.xs,
  },
  nameRowMobile: {
    flexDirection: 'column',
    gap: 0,
  },
  halfInput: {
    flex: 1,
    width: '100%',
  },
  radioOption: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.surfaceContainerLow,
    borderRadius: BorderRadius.lg,
    padding: Spacing.sm,
    marginBottom: Spacing.xs,
    borderWidth: 1,
    borderColor: Colors.surfaceContainerHigh,
  },
  selectedRadioOption: {
    borderColor: Colors.primary,
    backgroundColor: Colors.primaryFixed,
  },
  disabledRadioOption: {
    opacity: 0.5,
    backgroundColor: Colors.surfaceContainerHigh,
    borderColor: Colors.surfaceContainerHigh,
  },
  deliveryInfoMsg: {
    fontSize: 11,
    fontFamily: 'Inter-Medium',
    color: '#E65100',
    marginTop: 3,
  },
  freeBadge: {
    backgroundColor: '#E8F5E9',
    borderRadius: 6,
    paddingHorizontal: 7,
    paddingVertical: 3,
    borderWidth: 1,
    borderColor: '#4CAF50',
    marginLeft: 6,
  },
  freeBadgeText: {
    fontSize: 10,
    fontFamily: 'Inter-Bold',
    color: '#2E7D32',
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
  addressSummaryPill: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.surfaceContainerLow,
    borderRadius: BorderRadius.lg,
    padding: Spacing.sm,
    marginBottom: Spacing.md,
    borderWidth: 1,
    borderColor: Colors.surfaceContainerHigh,
  },
  summaryPillTitle: {
    ...Typography.titleLg,
    fontSize: 13,
    fontFamily: 'Inter-Bold',
    color: Colors.onSurface,
  },
  summaryPillText: {
    ...Typography.bodyMd,
    fontSize: 12,
    color: Colors.onSurfaceVariant,
    marginTop: 2,
  },
  changeAddressBtn: {
    paddingHorizontal: Spacing.sm,
    paddingVertical: 4,
    backgroundColor: Colors.primaryFixed,
    borderRadius: BorderRadius.md,
    borderWidth: 1,
    borderColor: Colors.primary,
  },
  changeAddressText: {
    ...Typography.labelLg,
    fontSize: 12,
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
    flexWrap: 'wrap',
    gap: 6,
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
  summaryCardInner: {
    marginTop: Spacing.xs,
  },
  summaryTitle: {
    ...Typography.headlineLg,
    fontSize: 18,
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
    fontSize: 18,
    fontFamily: 'Inter-Bold',
    color: Colors.onSurface,
  },
  totalValue: {
    ...Typography.headlineLg,
    fontSize: 22,
    fontFamily: 'Inter-Bold',
    color: Colors.primary,
  },
  placeOrderCta: {
    marginTop: Spacing.xs,
  },
  backStepBtn: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: Spacing.sm,
    marginTop: Spacing.xs,
  },
  backStepBtnText: {
    ...Typography.labelLg,
    fontSize: 13,
    fontFamily: 'Inter-Medium',
    color: Colors.tertiary,
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
  securityBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
  },
  securityText: {
    ...Typography.labelLg,
    fontSize: 10,
    color: Colors.tertiary,
    fontFamily: 'Inter-Medium',
  },
});

export default CheckoutScreen;
