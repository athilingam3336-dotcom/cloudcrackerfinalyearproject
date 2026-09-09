import React, { useCallback, useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Image,
  ImageSourcePropType,
  TouchableOpacity,
  TextInput,
  Alert,
  ActivityIndicator,
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
import { LOCAL_PRODUCT_IMAGES, resolveProductImage } from '@/constants/productImages';
import { formatCurrency } from '@/utils/currency';
import { orderService } from '@/services/orderService';
import { paymentService } from '@/services/paymentService';
import { downloadCustomerOrderInvoicePdf } from '@/utils/invoiceGenerator';

import { useSmartTabNavigation } from '@/hooks/useSmartTabNavigation';

type OrderSuccessScreenProps = NativeStackScreenProps<
  RootStackParamList,
  'OrderSuccess'
>;

export const OrderSuccessScreen: React.FC<OrderSuccessScreenProps> = ({
  navigation,
  route,
}) => {
  const { handleTabPress } = useSmartTabNavigation();
  const orderId = route.params?.orderId;
  const orderNumber = route.params?.orderNumber || route.params?.orderId || '#CC-99420851';
  const paymentId = route.params?.paymentId;
  const amountPaid = route.params?.amountPaid;
  const paymentStatus = route.params?.paymentStatus || 'Paid';
  const shippingAddress = route.params?.shippingAddress || '42 Marina Beach Road, Chennai, TN 600004';
  const initialItems = route.params?.items || [];
  const upiUri = route.params?.upiUri;
  const qrCodeBase64 = route.params?.qrCodeBase64;

  const [orderItems, setOrderItems] = useState<any[]>(initialItems);
  const [currentPaymentStatus, setCurrentPaymentStatus] = useState<string>(paymentStatus);
  const [utr, setUtr] = useState('');
  const [isSubmittingUtr, setIsSubmittingUtr] = useState(false);

  // Poll status if pending/under review
  useEffect(() => {
    let intervalId: ReturnType<typeof setInterval>;
    
    if (orderId && ['Pending', 'Under Review'].includes(currentPaymentStatus)) {
      intervalId = setInterval(async () => {
        try {
          const res = await paymentService.getUpiPaymentStatus(orderId);
          if (res && res.payment_status) {
            setCurrentPaymentStatus(res.payment_status);
            if (['Paid', 'Confirmed', 'Verified', 'Success', 'Rejected', 'Failed'].includes(res.payment_status)) {
              clearInterval(intervalId);
            }
          }
        } catch (error) {
          // Silent catch for polling
        }
      }, 5000);
    }
    
    return () => {
      if (intervalId) clearInterval(intervalId);
    };
  }, [orderId, currentPaymentStatus]);

  const handleSubmitUtr = useCallback(async () => {
    if (!orderId) {
      Alert.alert('Error', 'Order ID is missing.');
      return;
    }
    if (!utr.trim() || utr.trim().length < 4) {
      Alert.alert('Validation Error', 'Please enter a valid UTR / Transaction Reference.');
      return;
    }
    setIsSubmittingUtr(true);
    try {
      await paymentService.submitUpiReference(orderId, utr);
      setCurrentPaymentStatus('Under Review');
      Alert.alert('Success', 'Payment reference submitted successfully. Please wait for admin verification.');
    } catch (error: any) {
      const msg = error.response?.data?.message || 'Failed to submit UTR.';
      Alert.alert('Error', msg);
    } finally {
      setIsSubmittingUtr(false);
    }
  }, [utr, orderId]);

  // If items weren't passed in route params, fetch the completed order from backend
  useEffect(() => {
    if (orderItems.length === 0 && orderId) {
      orderService.getOrderById(orderId).then((ord) => {
        if (ord && Array.isArray(ord.items) && ord.items.length > 0) {
          setOrderItems(ord.items);
        }
      }).catch(() => {
        // Safe silent catch, fallback to default
      });
    }
  }, [orderId, orderItems.length]);

  const handleDownloadInvoice = useCallback(() => {
    downloadCustomerOrderInvoicePdf({
      orderNumber: (orderNumber || '0000').replace('#', ''),
      date: new Date().toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }),
      customerName: 'Customer',
      shippingAddress: shippingAddress,
      paymentMethod: paymentId ? 'Dynamic UPI QR Payment' : 'Online Payment',
      paymentId: paymentId || null,
      paymentStatus: paymentStatus || 'Paid Online',
      items: orderItems,
      subtotal: amountPaid || 0,
      total: amountPaid || 0,
    });
  }, [orderNumber, shippingAddress, paymentId, paymentStatus, orderItems, amountPaid]);

  const handleContinueShopping = useCallback(() => {
    navigation.navigate('Home');
  }, [navigation]);

  const handleViewOrders = useCallback(() => {
    navigation.navigate('OrderHistory');
  }, [navigation]);

  // Primary image from the first purchased product
  const primaryItem = orderItems.length > 0 ? orderItems[0] : null;
  const heroImageSource: ImageSourcePropType = primaryItem
    ? resolveProductImage(primaryItem)
    : LOCAL_PRODUCT_IMAGES.GIFT_BOX;

  return (
    <SafeAreaView style={styles.safeArea} edges={['top', 'left', 'right']}>
      <HomeHeader
        onNotificationPress={() => navigation.navigate('Notifications')}
        onProfilePress={() => navigation.navigate('UserProfile')}
        onCartPress={() => navigation.navigate('Cart')}
        notificationCount={0}
      />

      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        {/* Celebration Banner Card with Primary Purchased Product Image */}
        <View style={styles.heroCard}>
          <Image
            source={heroImageSource}
            style={styles.heroImage}
            resizeMode="contain"
          />
          <View style={styles.heroOverlay} />
          <View style={styles.checkCircle}>
            <MaterialIcons name="check" size={48} color="#ffffff" />
          </View>
        </View>

        <View style={styles.contentContainer}>
          {currentPaymentStatus === 'Pending' && qrCodeBase64 ? (
            <View style={[styles.badgeSuccess, { backgroundColor: '#FFF3E0' }]}>
              <MaterialIcons name="pending-actions" size={16} color="#E65100" />
              <Text style={[styles.badgeSuccessText, { color: '#E65100' }]}>Awaiting Payment</Text>
            </View>
          ) : currentPaymentStatus === 'Under Review' ? (
            <View style={[styles.badgeSuccess, { backgroundColor: '#E3F2FD' }]}>
              <MaterialIcons name="hourglass-empty" size={16} color="#1565C0" />
              <Text style={[styles.badgeSuccessText, { color: '#1565C0' }]}>Under Review</Text>
            </View>
          ) : ['Rejected', 'Failed'].includes(currentPaymentStatus) ? (
            <View style={[styles.badgeSuccess, { backgroundColor: '#FFEBEE' }]}>
              <MaterialIcons name="error" size={16} color="#C62828" />
              <Text style={[styles.badgeSuccessText, { color: '#C62828' }]}>Payment Failed / Rejected</Text>
            </View>
          ) : (
            <View style={styles.badgeSuccess}>
              <MaterialIcons name="verified" size={16} color="#2E7D32" />
              <Text style={styles.badgeSuccessText}>Payment Successful</Text>
            </View>
          )}

          <Text style={styles.title}>
            {currentPaymentStatus === 'Pending' && qrCodeBase64 ? 'Pending Payment' :
             currentPaymentStatus === 'Under Review' ? 'Payment Submitted' :
             ['Rejected', 'Failed'].includes(currentPaymentStatus) ? 'Payment Failed' :
             'Order Confirmed!'}
          </Text>
          <Text style={styles.subtitle}>
            {currentPaymentStatus === 'Pending' && qrCodeBase64
              ? "A payment QR has been sent to your registered email. Please scan the QR code to complete your payment."
              : currentPaymentStatus === 'Under Review'
              ? "Your payment reference has been submitted. We are verifying the payment. You will be notified shortly."
              : ['Rejected', 'Failed'].includes(currentPaymentStatus)
              ? "Your payment verification failed. Please contact support or try placing a new order."
              : "Your pyrotechnics are locked, loaded, and ready for dispatch. We've sent an order confirmation to your registered email."}
          </Text>

          {currentPaymentStatus === 'Pending' && qrCodeBase64 && (
            <View style={styles.qrContainer}>
              <View style={{ marginVertical: 20, alignItems: 'center' }}>
                <View style={{ backgroundColor: '#FFEBEE', padding: 20, borderRadius: 50, marginBottom: 15 }}>
                  <MaterialIcons name="mark-email-read" size={60} color="#D32F2F" />
                </View>
                <Text style={{ fontSize: 18, color: '#333', fontWeight: '600', marginBottom: 5 }}>
                  QR Code Sent to Email
                </Text>
                <Text style={{ fontSize: 14, color: '#666', textAlign: 'center', paddingHorizontal: 20 }}>
                  Please check your registered email inbox for the payment QR code for {formatCurrency(amountPaid || 0)}.
                </Text>
              </View>
              <Text style={styles.qrHelpText}>After paying, please submit your UTR below</Text>
              
              <View style={styles.utrForm}>
                <TextInput
                  style={styles.utrInput}
                  placeholder="Enter 12-digit UTR or Reference No."
                  placeholderTextColor="#999"
                  value={utr}
                  onChangeText={setUtr}
                />
                <TouchableOpacity
                  style={[styles.utrSubmitBtn, isSubmittingUtr && styles.utrSubmitBtnDisabled]}
                  onPress={handleSubmitUtr}
                  disabled={isSubmittingUtr}
                >
                  {isSubmittingUtr ? (
                    <ActivityIndicator size="small" color="#fff" />
                  ) : (
                    <Text style={styles.utrSubmitBtnText}>I HAVE PAID</Text>
                  )}
                </TouchableOpacity>
              </View>
            </View>
          )}

          {/* Purchased Products Showcase Card */}
          {orderItems.length > 0 && (
            <View style={styles.purchasedCard}>
              <View style={styles.cardHeaderRow}>
                <MaterialIcons name="local-fire-department" size={20} color={Colors.primary} />
                <Text style={styles.purchasedTitle}>
                  Purchased Products ({orderItems.length} {orderItems.length === 1 ? 'item' : 'items'})
                </Text>
              </View>

              <View style={styles.productsList}>
                {orderItems.map((item, idx) => {
                  const itemImg = resolveProductImage(item);
                  const title = item.title || item.name || item.product?.name || item.product?.title || 'Sivakasi Cracker';
                  const qty = item.quantity || 1;
                  const unitPrice = item.price || item.product?.price || 0;

                  return (
                    <View key={item.id || item.product_id || idx} style={[styles.productRow, idx > 0 && styles.productRowBorder]}>
                      <View style={styles.productThumbWrap}>
                        <Image
                          source={itemImg}
                          style={styles.productThumb}
                          resizeMode="contain"
                        />
                      </View>

                      <View style={styles.productInfo}>
                        <Text style={styles.productName} numberOfLines={2}>
                          {title}
                        </Text>
                        <View style={styles.qtyBadgeRow}>
                          <View style={styles.qtyBadge}>
                            <Text style={styles.qtyBadgeText}>Qty: {qty}</Text>
                          </View>
                          {unitPrice > 0 && (
                            <Text style={styles.unitPriceText}>
                              {formatCurrency(unitPrice)} each
                            </Text>
                          )}
                        </View>
                      </View>

                      {unitPrice > 0 && (
                        <Text style={styles.productTotalText}>
                          {formatCurrency(qty * unitPrice)}
                        </Text>
                      )}
                    </View>
                  );
                })}
              </View>
            </View>
          )}

          {/* Order Details Card */}
          <View style={styles.orderDetailsCard}>
            <View style={styles.detailRow}>
              <View style={styles.detailItem}>
                <Text style={styles.detailLabel}>ORDER NUMBER</Text>
                <Text style={styles.detailValue}>{orderNumber}</Text>
              </View>

              <View style={styles.detailItem}>
                <Text style={styles.detailLabel}>ORDER STATUS</Text>
                <View style={styles.statusBadgeRow}>
                  <View style={styles.statusDot} />
                  <Text style={styles.statusValue}>Confirmed</Text>
                </View>
              </View>
            </View>

            <View style={styles.divider} />

            <View style={styles.detailRow}>
              {amountPaid !== undefined && (
                <View style={styles.detailItem}>
                  <Text style={styles.detailLabel}>AMOUNT PAID</Text>
                  <Text style={[styles.detailValue, { color: Colors.primary }]}>
                    {formatCurrency(amountPaid)}
                  </Text>
                </View>
              )}

              <View style={styles.detailItem}>
                <Text style={styles.detailLabel}>PAYMENT STATUS</Text>
                <Text style={[styles.detailValue, { color: '#2E7D32' }]}>{paymentStatus}</Text>
              </View>
            </View>

            {paymentId && !qrCodeBase64 && (
              <>
                <View style={styles.divider} />
                <View style={styles.detailItem}>
                  <Text style={styles.detailLabel}>PAYMENT ID / TRANSACTION REF</Text>
                  <Text style={styles.paymentIdText}>{paymentId}</Text>
                </View>
              </>
            )}

            <View style={styles.divider} />

            <View style={styles.detailItem}>
              <Text style={styles.detailLabel}>DELIVERY ADDRESS</Text>
              <Text style={styles.addressText}>{shippingAddress}</Text>
            </View>
          </View>

          {/* Actions */}
          <View style={styles.actionsContainer}>
            <TouchableOpacity
              style={styles.downloadInvoiceCta}
              onPress={handleDownloadInvoice}
              activeOpacity={0.8}
            >
              <MaterialIcons name="picture-as-pdf" size={20} color="#ffffff" />
              <Text style={styles.downloadInvoiceCtaText}>Download Official Tax Invoice (PDF)</Text>
            </TouchableOpacity>

            <PrimaryButton
              title="View Order History"
              onPress={handleViewOrders}
              style={styles.actionCta}
            />
            <PrimaryButton
              title="Continue Shopping"
              variant="secondary"
              onPress={handleContinueShopping}
              style={styles.actionCta}
            />
          </View>
        </View>
      </ScrollView>

      <BottomNavBar activeTab="Home" onTabPress={handleTabPress} />
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
  heroCard: {
    height: 220,
    width: '100%',
    position: 'relative',
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#1E1B18',
  },
  heroImage: {
    width: '100%',
    height: '100%',
    opacity: 0.85,
  },
  heroOverlay: {
    ...StyleSheet.absoluteFill,
    backgroundColor: 'rgba(0,0,0,0.45)',
  },
  checkCircle: {
    width: 80,
    height: 80,
    borderRadius: BorderRadius.full,
    backgroundColor: Colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 4,
    borderColor: '#ffffff',
    zIndex: 10,
    shadowColor: Colors.shadowColor,
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.25,
    shadowRadius: 12,
    elevation: 8,
  },
  contentContainer: {
    paddingHorizontal: Spacing.marginMobile,
    alignItems: 'center',
    marginTop: Spacing.md,
  },
  badgeSuccess: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#E8F5E9',
    paddingHorizontal: 12,
    paddingVertical: 5,
    borderRadius: BorderRadius.full,
    gap: 5,
    marginBottom: Spacing.xs,
  },
  badgeSuccessText: {
    fontSize: 12,
    fontFamily: 'Inter-Bold',
    color: '#2E7D32',
  },
  title: {
    ...Typography.headlineLg,
    fontSize: 28,
    fontFamily: 'Inter-Bold',
    color: Colors.onSurface,
    textAlign: 'center',
  },
  subtitle: {
    ...Typography.bodyLg,
    fontSize: 14,
    color: Colors.onSurfaceVariant,
    textAlign: 'center',
    marginTop: Spacing.xs,
    maxWidth: 340,
    lineHeight: 20,
  },
  purchasedCard: {
    width: '100%',
    backgroundColor: Colors.surfaceContainerLowest,
    borderRadius: BorderRadius.xl,
    padding: Spacing.md,
    marginTop: Spacing.lg,
    borderWidth: 1,
    borderColor: Colors.surfaceContainerHigh,
    shadowColor: Colors.shadowColor,
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  cardHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: Spacing.sm,
    paddingBottom: Spacing.xs,
    borderBottomWidth: 1,
    borderBottomColor: Colors.surfaceContainerHigh,
  },
  purchasedTitle: {
    ...Typography.titleLg,
    fontSize: 15,
    fontFamily: 'Inter-Bold',
    color: Colors.onSurface,
  },
  productsList: {
    gap: Spacing.xs,
  },
  productRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: Spacing.sm,
  },
  productRowBorder: {
    borderTopWidth: 1,
    borderTopColor: Colors.surfaceContainerLow,
  },
  productThumbWrap: {
    width: 64,
    height: 64,
    borderRadius: BorderRadius.md,
    overflow: 'hidden',
    backgroundColor: Colors.surfaceContainerLow,
    borderWidth: 1,
    borderColor: Colors.surfaceContainerHigh,
  },
  productThumb: {
    width: '100%',
    height: '100%',
  },
  productInfo: {
    flex: 1,
    marginLeft: Spacing.sm,
    marginRight: Spacing.xs,
  },
  productName: {
    ...Typography.bodyMd,
    fontSize: 14,
    fontFamily: 'Inter-SemiBold',
    color: Colors.onSurface,
    marginBottom: 4,
  },
  qtyBadgeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  qtyBadge: {
    backgroundColor: Colors.surfaceContainerHigh,
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: BorderRadius.full,
  },
  qtyBadgeText: {
    fontSize: 11,
    fontFamily: 'Inter-Bold',
    color: Colors.onSurfaceVariant,
  },
  unitPriceText: {
    fontSize: 12,
    color: Colors.tertiary,
    fontFamily: 'Inter-Regular',
  },
  productTotalText: {
    ...Typography.titleLg,
    fontSize: 15,
    fontFamily: 'Inter-Bold',
    color: Colors.primary,
  },
  orderDetailsCard: {
    width: '100%',
    backgroundColor: Colors.surfaceContainerLowest,
    borderRadius: BorderRadius.xl,
    padding: Spacing.lg,
    marginTop: Spacing.md,
    borderWidth: 1,
    borderColor: Colors.surfaceContainerHigh,
    shadowColor: Colors.shadowColor,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.06,
    shadowRadius: 10,
    elevation: 3,
  },
  detailRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  detailItem: {
    flex: 1,
  },
  detailLabel: {
    ...Typography.labelLg,
    fontSize: 10,
    fontFamily: 'Inter-Bold',
    color: Colors.tertiary,
    marginBottom: 4,
  },
  detailValue: {
    ...Typography.titleLg,
    fontSize: 15,
    fontFamily: 'Inter-Bold',
    color: Colors.onSurface,
  },
  statusBadgeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  statusDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#2E7D32',
  },
  statusValue: {
    ...Typography.titleLg,
    fontSize: 14,
    fontFamily: 'Inter-Bold',
    color: '#2E7D32',
  },
  paymentIdText: {
    ...Typography.bodyMd,
    fontSize: 13,
    fontFamily: 'Inter-Medium',
    color: Colors.onSurface,
  },
  divider: {
    height: 1,
    backgroundColor: Colors.surfaceContainerHigh,
    marginVertical: Spacing.sm,
  },
  addressText: {
    ...Typography.bodyMd,
    fontSize: 13,
    color: Colors.onSurfaceVariant,
  },
  actionsContainer: {
    width: '100%',
    marginTop: Spacing.lg,
    gap: Spacing.sm,
  },
  downloadInvoiceCta: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#2E7D32',
    paddingVertical: Spacing.sm + 2,
    paddingHorizontal: Spacing.md,
    borderRadius: BorderRadius.xl,
    gap: 8,
    width: '100%',
    shadowColor: Colors.shadowColor,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  downloadInvoiceCtaText: {
    ...Typography.labelLg,
    fontSize: 14,
    fontFamily: 'Inter-Bold',
    color: '#ffffff',
  },
  actionCta: {
    width: '100%',
  },
  qrContainer: {
    alignItems: 'center',
    marginVertical: 20,
    padding: 20,
    backgroundColor: '#ffffff',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#eeeeee',
    width: '100%',
  },
  qrAmountText: {
    fontSize: 18,
    fontFamily: 'Inter-Bold',
    color: '#333333',
    marginBottom: 15,
  },
  qrImage: {
    width: 220,
    height: 220,
  },
  qrHelpText: {
    ...Typography.bodyMd,
    color: Colors.onSurfaceVariant,
    marginTop: 15,
    marginBottom: 10,
    textAlign: 'center',
  },
  utrForm: {
    width: '100%',
    marginTop: 10,
  },
  utrInput: {
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    fontFamily: 'Inter-Regular',
    backgroundColor: '#FAFAFA',
    marginBottom: 10,
  },
  utrSubmitBtn: {
    backgroundColor: Colors.primary,
    paddingVertical: 14,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  utrSubmitBtnDisabled: {
    opacity: 0.7,
  },
  utrSubmitBtnText: {
    color: '#ffffff',
    fontFamily: 'Inter-Bold',
    fontSize: 16,
  },
});

export default OrderSuccessScreen;
