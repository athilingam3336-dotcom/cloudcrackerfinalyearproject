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
    const { data: res } = await apiClient.post('/payments/upi/create', payload);
    return res.data || res;
  }
}

export const paymentService = new PaymentService();
export default paymentService;
