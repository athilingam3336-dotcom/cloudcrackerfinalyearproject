import React, { useEffect, useMemo } from 'react';
import { Modal, StyleSheet, View, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { WebView } from 'react-native-webview';
import { useUiStore } from '@/store/uiStore';
import { Colors } from '@/constants/colors';

export const RazorpayWebViewCheckout: React.FC = () => {
  const { razorpayModalVisible, razorpayOptions, closeRazorpayModal } = useUiStore();

  useEffect(() => {
    if (razorpayModalVisible && razorpayOptions?.orderId?.startsWith('order_test_')) {
      if (razorpayOptions.onSuccess) {
        razorpayOptions.onSuccess({
          razorpay_payment_id: `pay_test_${Math.random().toString(36).substring(2, 10)}`,
          razorpay_order_id: razorpayOptions.orderId,
          razorpay_signature: 'dummy_signature_for_test_order',
        });
      }
      closeRazorpayModal();
    }
  }, [razorpayModalVisible, razorpayOptions]);

  const htmlContent = useMemo(() => {
    if (!razorpayOptions) return '';

    const options = {
      key: razorpayOptions.keyId,
      amount: razorpayOptions.amountPaise,
      currency: razorpayOptions.currency || 'INR',
      name: 'CloudCrackers Pyrotechnics',
      description: `Order ${razorpayOptions.orderNumber || ''} (Test Mode)`,
      image: 'https://lh3.googleusercontent.com/aida-public/AB6AXuDAP7p-rAk38wzI36vF04GyEW_IoEFRlYrMcYFTmA5ux2MYU1BVQxdxbOJEtojj4o0nKvYc0UZFZkngXefUeOSuN9RhbAwIWCHjK1gan-giRebFdGC1wSCgAmXYtUDnh87e2p2PuL0SurRoWnXj0rIUOhP9teve675IlY6GDtMgXS27ZrFmHhm0Wh-XXwfNouPJFtdYuhhOjdO-uWxYHtH6-xsyO-JgBDjYXden6z2L9_viSwAnXmIO',
      order_id: razorpayOptions.orderId || undefined,
      prefill: {
        name: razorpayOptions.customerName || 'Test Customer',
        email: razorpayOptions.customerEmail || 'customer@cloudcrackers.com',
        contact: razorpayOptions.customerPhone || '+919876543210',
      },
      theme: {
        color: '#FF6B00',
      },
    };

    return `
      <!DOCTYPE html>
      <html>
      <head>
        <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no">
        <style>
          body, html { margin: 0; padding: 0; height: 100%; width: 100%; background-color: #fff; }
          .loader {
            position: absolute; top: 50%; left: 50%; transform: translate(-50%, -50%);
            font-family: sans-serif; color: #555;
          }
        </style>
      </head>
      <body>
        <div class="loader" id="loader">Loading secure payment gateway...</div>
        <script src="https://checkout.razorpay.com/v1/checkout.js"></script>
        <script>
          function sendMessage(msg) {
            window.ReactNativeWebView.postMessage(JSON.stringify(msg));
          }

          var options = ${JSON.stringify(options)};
          
          options.handler = function (response) {
            sendMessage({ type: 'SUCCESS', data: response });
          };
          
          options.modal = {
            ondismiss: function() {
              sendMessage({ type: 'DISMISS' });
            }
          };

          var rzp1 = new Razorpay(options);
          
          rzp1.on('payment.failed', function (response){
              sendMessage({ type: 'FAILED', error: response.error });
          });

          window.onload = function() {
            document.getElementById('loader').style.display = 'none';
            rzp1.open();
          };
        </script>
      </body>
      </html>
    `;
  }, [razorpayOptions]);

  const handleMessage = (event: any) => {
    try {
      const message = JSON.parse(event.nativeEvent.data);
      
      switch (message.type) {
        case 'SUCCESS':
          if (razorpayOptions?.onSuccess) {
            razorpayOptions.onSuccess(message.data);
          }
          closeRazorpayModal();
          break;
        case 'FAILED':
          if (razorpayOptions?.onFailure) {
            razorpayOptions.onFailure(message.error);
          }
          closeRazorpayModal();
          break;
        case 'DISMISS':
          if (razorpayOptions?.onDismiss) {
            razorpayOptions.onDismiss();
          }
          closeRazorpayModal();
          break;
      }
    } catch (error) {
      console.error('Error parsing WebView message', error);
      closeRazorpayModal();
    }
  };

  if (!razorpayModalVisible || !razorpayOptions) {
    return null;
  }

  if (razorpayOptions.orderId?.startsWith('order_test_')) {
    return null;
  }

  return (
    <Modal visible={razorpayModalVisible} animationType="slide" transparent={false}>
      <SafeAreaView style={styles.container}>
        <WebView
          source={{ html: htmlContent, baseUrl: 'https://checkout.razorpay.com' }}
          originWhitelist={['*']}
          onMessage={handleMessage}
          javaScriptEnabled={true}
          domStorageEnabled={true}
          startInLoadingState={true}
          renderLoading={() => (
            <View style={styles.loadingContainer}>
              <ActivityIndicator size="large" color={Colors.primary} />
            </View>
          )}
          style={styles.webview}
        />
      </SafeAreaView>
    </Modal>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },
  webview: {
    flex: 1,
  },
  loadingContainer: {
    ...StyleSheet.absoluteFill,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#fff',
  }
});
