/**
 * Payment Service
 * Dynamic UPI QR integration for CloudCrackers.
 * Handles server-side order creation and returns the UPI URI and base64 QR code.
 */

import { apiClient } from '@/api/axios';

export interface UpiOrderPayload {
  shipping_address?: string;
  coupon_code?: string;
  delivery_method?: 'standard' | 'express';
}

export interface UpiOrderData {
  order_id: string;
  order_number: string;
  payment_id: string;
  amount: number;
  currency: string;
  upi_uri: string;
  qr_code_base64: string;
  subtotal: number;
  discount: number;
  coupon_discount: number;
  shipping: number;
  tax: number;
  total: number;
}

class PaymentService {
  /**
   * Request backend to calculate amounts server-side and create a pending UPI Order.
   * Returns the dynamic UPI URI and the base64 encoded QR Code image.
   */
  async createUpiOrder(payload: UpiOrderPayload): Promise<UpiOrderData> {
    const { data: res } = await apiClient.post('/payment/upi/create', payload);
    return res.data || res;
  }

  /**
   * Submit the UTR for a pending UPI payment.
   */
  async submitUpiReference(orderId: string, utr: string): Promise<any> {
    const { data: res } = await apiClient.post(`/payment/upi/submit-reference/${orderId}`, {
      transaction_reference: utr,
    });
    return res.data || res;
  }

  /**
   * Poll/Get the current payment status for an order.
   */
  async getUpiPaymentStatus(orderId: string): Promise<{ transaction_id: string; payment_status: string }> {
    const { data: res } = await apiClient.get(`/payment/upi/status/${orderId}`);
    return res.data || res;
  }
}

export const paymentService = new PaymentService();
export default paymentService;
