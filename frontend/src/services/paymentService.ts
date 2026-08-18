/**
 * Payment Service
 * Razorpay Test Mode integration for CloudCrackers.
 * Handles server-side order creation, Razorpay modal launch, and signature verification.
 */

import { Platform } from 'react-native';
import { apiClient } from '@/api/axios';
import { useUiStore } from '@/store/uiStore';

export interface RazorpayOrderPayload {
  order_id?: string;
  shipping_address?: string;
  coupon_code?: string;
  delivery_method?: 'standard' | 'express';
}

export interface RazorpayOrderData {
  razorpay_order_id: string;
  razorpay_key_id: string;
  amount: number; // in paise
  currency: string;
  order_id: string;
  order_number: string;
  subtotal: number;
  discount: number;
  coupon_discount: number;
  shipping: number;
  tax: number;
  total: number;
}

export interface RazorpayVerifyPayload {
  razorpay_order_id: string;
  razorpay_payment_id: string;
  razorpay_signature: string;
}

export interface RazorpayCheckoutOptions {
  keyId: string;
  amountPaise: number;
  currency: string;
  orderId: string;
  orderNumber: string;
  customerName?: string;
  customerEmail?: string;
  customerPhone?: string;
  onSuccess: (response: {
    razorpay_payment_id: string;
    razorpay_order_id: string;
    razorpay_signature: string;
  }) => void;
  onFailure: (error: { code?: string; description?: string; reason?: string }) => void;
  onDismiss: () => void;
}

class PaymentService {
  /**
   * Request backend to calculate amounts server-side and create a Razorpay Test Order.
   */
  async createRazorpayOrder(payload: RazorpayOrderPayload): Promise<RazorpayOrderData> {
    const { data: res } = await apiClient.post('/payments/create-order', payload);
    return res.data || res;
  }

  /**
   * Send Razorpay payment authorization details to backend for HMAC-SHA256 signature verification.
   */
  async verifyRazorpayPayment(payload: RazorpayVerifyPayload): Promise<any> {
    const { data: res } = await apiClient.post('/payments/verify', payload);
    return res.data || res;
  }

  /**
   * Dynamically loads Razorpay Checkout script on web environments.
   */
  private loadRazorpayWebScript(): Promise<boolean> {
    return new Promise((resolve) => {
      if (typeof window === 'undefined') {
        resolve(false);
        return;
      }
      if ((window as any).Razorpay) {
        resolve(true);
        return;
      }
      const existingScript = document.getElementById('razorpay-checkout-script');
      if (existingScript) {
        existingScript.addEventListener('load', () => resolve(true));
        existingScript.addEventListener('error', () => resolve(false));
        return;
      }

      const script = document.createElement('script');
      script.id = 'razorpay-checkout-script';
      script.src = 'https://checkout.razorpay.com/v1/checkout.js';
      script.async = true;
      script.onload = () => resolve(true);
      script.onerror = () => resolve(false);
      document.body.appendChild(script);
    });
  }

  /**
   * Opens the Razorpay Test Payment checkout modal.
   */
  async openCheckout(options: RazorpayCheckoutOptions): Promise<void> {
    if (Platform.OS === 'web') {
      const isLoaded = await this.loadRazorpayWebScript();
      if (!isLoaded || !(window as any).Razorpay) {
        options.onFailure({
          description: 'Failed to load Razorpay Payment Gateway. Please check your internet connection.',
        });
        return;
      }

      const rzpOptions = {
        key: options.keyId,
        amount: options.amountPaise,
        currency: options.currency || 'INR',
        name: 'CloudCrackers Pyrotechnics',
        description: `Order ${options.orderNumber} (Test Mode)`,
        image: 'https://lh3.googleusercontent.com/aida-public/AB6AXuDAP7p-rAk38wzI36vF04GyEW_IoEFRlYrMcYFTmA5ux2MYU1BVQxdxbOJEtojj4o0nKvYc0UZFZkngXefUeOSuN9RhbAwIWCHjK1gan-giRebFdGC1wSCgAmXYtUDnh87e2p2PuL0SurRoWnXj0rIUOhP9teve675IlY6GDtMgXS27ZrFmHhm0Wh-XXwfNouPJFtdYuhhOjdO-uWxYHtH6-xsyO-JgBDjYXden6z2L9_viSwAnXmIO',
        order_id: options.orderId || undefined,
        prefill: {
          name: options.customerName || 'Test Customer',
          email: options.customerEmail || 'customer@cloudcrackers.com',
          contact: options.customerPhone || '+919876543210',
        },
        theme: {
          color: '#FF6B00',
        },
        handler: (response: any) => {
          if (
            response &&
            response.razorpay_payment_id &&
            response.razorpay_order_id &&
            response.razorpay_signature
          ) {
            options.onSuccess({
              razorpay_payment_id: response.razorpay_payment_id,
              razorpay_order_id: response.razorpay_order_id,
              razorpay_signature: response.razorpay_signature,
            });
          } else {
            options.onFailure({
              description: 'Incomplete response received from Razorpay gateway.',
            });
          }
        },
        modal: {
          ondismiss: () => {
            options.onDismiss();
          },
        },
      };

      try {
        const rzp = new (window as any).Razorpay(rzpOptions);
        rzp.on('payment.failed', (response: any) => {
          const err = response.error || {};
          options.onFailure({
            code: err.code,
            description: err.description || 'Payment was declined by bank/gateway.',
            reason: err.reason,
          });
        });
        rzp.open();
      } catch (err: any) {
        options.onFailure({
          description: err?.message || 'Error opening Razorpay checkout window.',
        });
      }
    } else {
      // Native Mobile Simulator / Fallback (Use WebView Modal)
      useUiStore.getState().openRazorpayModal({
        ...options,
        onSuccess: (res: any) => {
          options.onSuccess(res);
        },
        onFailure: (err: any) => {
          options.onFailure(err);
        },
        onDismiss: () => {
          options.onDismiss();
        }
      });
    }
  }
}

export const paymentService = new PaymentService();
export default paymentService;
