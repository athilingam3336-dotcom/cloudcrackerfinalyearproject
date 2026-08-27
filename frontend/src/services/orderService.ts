/**
 * Order Service
 * API service for creating orders, checking history, tracking packages, and order details.
 * Uses apiClient for real backend calls; falls back to mock data when ENABLE_MOCK_API is true.
 */

import { apiClient } from '@/api/axios';
import { ENV } from '@/config/env';

export interface OrderItemDetail {
  id: string;
  title: string;
  quantity: number;
  price: number;
  imageUrl?: string;
  variantInfo?: string;
}

export interface ShippingAddressDetail {
  fullName: string;
  street: string;
  city: string;
  state: string;
  zipCode: string;
  phone?: string;
}

export interface OrderRecord {
  id: string;
  orderNumber: string;
  date: string;
  status:
    | 'Pending'
    | 'Confirmed'
    | 'Processing'
    | 'Packed'
    | 'Shipped'
    | 'In Transit'
    | 'Delivered'
    | 'Cancelled'
    | string;
  itemCount: number;
  totalPrice: number;
  subtotal?: number;
  discount?: number;
  shippingFee?: number;
  tax?: number;
  paymentMethod?: string;
  paymentStatus?: 'Pending' | 'Paid' | 'Refunded' | 'Failed' | string;
  shippingAddress?: ShippingAddressDetail;
  items?: OrderItemDetail[];
  timeline?: Array<{ status: string; date: string; completed: boolean }>;
}

export interface PlaceOrderPayload {
  firstName: string;
  lastName: string;
  streetAddress: string;
  city: string;
  zipCode: string;
  deliveryMethod: 'standard' | 'express';
  paymentMethod: 'card' | 'upi' | 'cod';
  couponCode?: string;
}

const MOCK_ORDER_HISTORY: OrderRecord[] = [
  {
    id: 'ord1',
    orderNumber: '#CC-89421',
    date: 'Oct 24, 2026',
    status: 'In Transit',
    itemCount: 3,
    totalPrice: 189.99,
    subtotal: 165.0,
    discount: 10.0,
    shippingFee: 15.0,
    tax: 19.99,
    paymentMethod: 'Credit Card (**** 4242)',
    paymentStatus: 'Paid',
    shippingAddress: {
      fullName: 'John Doe',
      street: '742 Evergreen Terrace',
      city: 'Springfield',
      state: 'IL',
      zipCode: '62704',
      phone: '+1 (555) 019-2834',
    },
    items: [
      {
        id: 'p1',
        title: 'Midnight Thunder Assortment',
        quantity: 1,
        price: 89.99,
        imageUrl:
          'https://lh3.googleusercontent.com/aida-public/AB6AXuDAP7p-rAk38wzI36vF04GyEW_IoEFRlYrMcYFTmA5ux2MYU1BVQxdxbOJEtojj4o0nKvYc0UZFZkngXefUeOSuN9RhbAwIWCHjK1gan-giRebFdGC1wSCgAmXYtUDnh87e2p2PuL0SurRoWnXj0rIUOhP9teve675IlY6GDtMgXS27ZrFmHhm0Wh-XXwfNouPJFtdYuhhOjdO-uWxYHtH6-xsyO-JgBDjYXden6z2L9_viSwAnXmIO',
        variantInfo: '24-Pack, Gold Willow',
      },
      {
        id: 'p2',
        title: 'Titanium Bloom Multi-Pack',
        quantity: 2,
        price: 50.0,
        imageUrl:
          'https://lh3.googleusercontent.com/aida-public/AB6AXuBBP0PxeVrZxJ4gFuBCNvfqWc4dOpgTwZMgEDYHMTnlYzhJKYuMrleVbUqJMqfUzdk3dHQAGTgmZYZ_5S_rekV_MEoh-bzLDNgctwchTG4oJH0b38spk3zbfiElWfuxfxKJ_pp9-m5Z3GRrYJZCnbioUhjiaYZAJaTzZqInrb85VZaI-IA_3xii92KRiTcow_1O8G7VgWHGpwFUt2RlctnKly3Q0Mq9wBnOp0MKTLx3H7o6HJLqtk0E',
        variantInfo: '12-Pack, Crimson Peony',
      },
    ],
    timeline: [
      { status: 'Order Placed', date: 'Oct 24, 09:30 AM', completed: true },
      { status: 'Processing & Hazmat Inspection', date: 'Oct 24, 11:45 AM', completed: true },
      { status: 'In Transit', date: 'Oct 24, 02:15 PM', completed: true },
      { status: 'Delivered', date: 'Expected Oct 25, 05:00 PM', completed: false },
    ],
  },
  {
    id: 'ord2',
    orderNumber: '#CC-78210',
    date: 'Sep 12, 2026',
    status: 'Delivered',
    itemCount: 5,
    totalPrice: 342.5,
    subtotal: 320.0,
    discount: 15.0,
    shippingFee: 0.0,
    tax: 37.5,
    paymentMethod: 'UPI Direct',
    paymentStatus: 'Paid',
    shippingAddress: {
      fullName: 'John Doe',
      street: '742 Evergreen Terrace',
      city: 'Springfield',
      state: 'IL',
      zipCode: '62704',
      phone: '+1 (555) 019-2834',
    },
    items: [
      {
        id: 'p3',
        title: 'Neon Nebula 25s Cake',
        quantity: 5,
        price: 64.5,
        imageUrl:
          'https://lh3.googleusercontent.com/aida-public/AB6AXuAkdLzyHFDsw1zGBwyGgm-1xpMbLOo7JKyUmR7wwvNN8EpPEFqWtTq5LEZrTKTOlc-fBvKNBSEu4hx-h9VcJGqQfJPsu36jToTX6DM3qFtmW4-lZ_8hIy90AwFsHe_1Kt3xtwbZB57QxmOn6zMjTmO6gE6HhHxUSrhbS7M3B6tQ_nJDuM9xawSjJdNvmohXg4BlXlKb3RGKrqUlv92X4ENyl2HIyNKm188I2EyCOUVnmcl8hSaNQ_j4',
      },
    ],
    timeline: [
      { status: 'Order Placed', date: 'Sep 12, 10:00 AM', completed: true },
      { status: 'Processing', date: 'Sep 12, 01:00 PM', completed: true },
      { status: 'In Transit', date: 'Sep 13, 09:00 AM', completed: true },
      { status: 'Delivered', date: 'Sep 14, 04:30 PM', completed: true },
    ],
  },
  {
    id: 'ord3',
    orderNumber: '#CC-65108',
    date: 'Aug 4, 2026',
    status: 'Pending',
    itemCount: 2,
    totalPrice: 95.0,
    subtotal: 90.0,
    discount: 0.0,
    shippingFee: 5.0,
    tax: 0.0,
    paymentMethod: 'Cash on Delivery (COD)',
    paymentStatus: 'Pending',
    shippingAddress: {
      fullName: 'John Doe',
      street: '742 Evergreen Terrace',
      city: 'Springfield',
      state: 'IL',
      zipCode: '62704',
    },
    items: [
      {
        id: 'p4',
        title: 'Silver Comet Fountain Pack',
        quantity: 2,
        price: 45.0,
        imageUrl:
          'https://lh3.googleusercontent.com/aida-public/AB6AXuAoum7swOtdclsKd9sBbC_PmeBiyHLDDBtsp8aPIOU0g4qEVXMniiVfuGV1zlcAwJAGdbfObfo6sFV4ffXb9No1dlW1IzNfNUjGv6wJXbd5YMC0fALXg0n6LpUkxXk7qtpCF94JMu1T0F3TU6I9Aj1o2-9inBJ9Xr5vvkqkMOW6aMqQ5LL6a0bDgrxCrSj05KxdPlMFe1ZaJbNhXrvIY0Ze8eWO_AyWS-69-lrgzPtT-gTS_oIbzukh',
      },
    ],
    timeline: [
      { status: 'Order Placed', date: 'Aug 4, 08:15 AM', completed: true },
      { status: 'Processing', date: 'Pending approval', completed: false },
      { status: 'In Transit', date: 'Pending dispatch', completed: false },
      { status: 'Delivered', date: 'Pending delivery', completed: false },
    ],
  },
];

export class OrderService {
  async placeOrder(
    orderPayload: PlaceOrderPayload
  ): Promise<{ orderId: string; status: string }> {
    if (ENV.ENABLE_MOCK_API) {
      const generatedId = `CC-${Math.floor(100000 + Math.random() * 900000)}`;
      return { orderId: generatedId, status: 'CONFIRMED' };
    }
    const shippingAddressStr = `${orderPayload.firstName || ''} ${orderPayload.lastName || ''}, ${orderPayload.streetAddress || ''}, ${orderPayload.city || ''} ${orderPayload.zipCode || ''}`.trim();
    const { data: res } = await apiClient.post('/orders/checkout', {
      payment_method: orderPayload.paymentMethod || 'card',
      shipping_address: shippingAddressStr.length > 5 ? shippingAddressStr : '742 Evergreen Terrace, Springfield, 62704',
      coupon_code: orderPayload.couponCode ? orderPayload.couponCode.trim() : undefined,
    });
    const payload = res.data || res;
    return {
      orderId: payload.id || payload.order_number || payload.orderId || `CC-${Date.now()}`,
      status: payload.order_status || 'CONFIRMED',
    };
  }

  async getOrderHistory(): Promise<OrderRecord[]> {
    if (ENV.ENABLE_MOCK_API) {
      return [];
    }
    try {
      const { data: res } = await apiClient.get('/orders');
      const payload = res.data || res;
      const items = Array.isArray(payload) ? payload : Array.isArray(payload.orders) ? payload.orders : [];
      if (items.length > 0) {
        return items.map((bo: any) => this.mapBackendOrderToUi(bo));
      }
      return [];
    } catch {
      return [];
    }
  }

  async getOrderById(orderId: string): Promise<OrderRecord | null> {
    if (ENV.ENABLE_MOCK_API) {
      return null;
    }
    try {
      const { data: res } = await apiClient.get(`/orders/${orderId}`);
      const payload = res.data || res;
      return payload ? this.mapBackendOrderToUi(payload) : null;
    } catch {
      return null;
    }
  }

  async cancelOrder(orderId: string): Promise<OrderRecord | null> {
    if (ENV.ENABLE_MOCK_API) {
      return null;
    }
    try {
      const { data: res } = await apiClient.put(`/orders/${orderId}/cancel`);
      const payload = res.data || res;
      return payload ? this.mapBackendOrderToUi(payload) : null;
    } catch (error: any) {
      console.error('Failed to cancel order:', error);
      throw error;
    }
  }

  async deleteOrder(orderId: string): Promise<void> {
    try {
      await apiClient.delete(`/orders/${orderId}`);
    } catch (error) {
      console.error('Failed to delete order', error);
      throw error;
    }
  }

  private parseShippingAddress(
    rawAddress: any,
    customerName?: string,
    customerPhone?: string
  ): ShippingAddressDetail | undefined {
    if (!rawAddress && !customerName) {
      return undefined;
    }

    if (typeof rawAddress === 'object' && rawAddress !== null) {
      return {
        fullName:
          rawAddress.full_name ||
          rawAddress.fullName ||
          rawAddress.name ||
          customerName ||
          'Customer',
        street: rawAddress.street || rawAddress.address || '',
        city: rawAddress.city || '',
        state: rawAddress.state || '',
        zipCode:
          rawAddress.zip_code ||
          rawAddress.zipCode ||
          rawAddress.pincode ||
          '',
        phone: rawAddress.phone || customerPhone || undefined,
      };
    }

    if (typeof rawAddress === 'string') {
      const raw = rawAddress.trim();
      if (!raw) {
        if (!customerName) return undefined;
        return {
          fullName: customerName,
          street: '',
          city: '',
          state: '',
          zipCode: '',
          phone: customerPhone || undefined,
        };
      }

      let phone = customerPhone || '';
      let addressPart = raw;

      // 1. Extract phone if formatted as (Phone: ...)
      const phoneMatch = addressPart.match(/\(Phone:\s*([^)]+)\)/i);
      if (phoneMatch) {
        if (!phone) phone = phoneMatch[1].trim();
        addressPart = addressPart.replace(phoneMatch[0], '').trim();
      }

      // 2. Extract email if formatted as (email@example.com)
      const emailMatch = addressPart.match(/\(([^)]+@[^)]+)\)/);
      if (emailMatch) {
        addressPart = addressPart.replace(emailMatch[0], '').trim();
      }

      // 3. Extract name if at the beginning before a comma
      let name = customerName || '';
      const parts = addressPart.split(',').map((p) => p.trim()).filter(Boolean);

      if (!name) {
        if (parts.length > 1) {
          name = parts[0];
          addressPart = parts.slice(1).join(', ');
        } else {
          name = 'Customer';
        }
      } else if (parts.length > 1 && parts[0].toLowerCase() === name.toLowerCase()) {
        addressPart = parts.slice(1).join(', ');
      }

      // Clean leading/trailing punctuation
      addressPart = addressPart.replace(/^,\s*/, '').replace(/,\s*$/, '').trim();

      return {
        fullName: name,
        street: addressPart,
        city: '',
        state: '',
        zipCode: '',
        phone: phone || undefined,
      };
    }

    return undefined;
  }

  private mapBackendOrderToUi(bo: any): OrderRecord {

    return {
      id: bo.id || bo._id || 'ord_meta',
      orderNumber: bo.order_number || bo.orderNumber || '#CC-99000',
      date: bo.created_at ? new Date(bo.created_at).toLocaleDateString() : 'Today',
      status: bo.order_status || bo.status || 'Pending',
      itemCount: bo.items?.length || 1,
      totalPrice: bo.total || bo.totalPrice || 0.0,
      subtotal: bo.subtotal || 0.0,
      discount: bo.discount || 0.0,
      shippingFee: bo.shipping || 0.0,
      tax: bo.tax || 0.0,
      paymentMethod: bo.payment_method || 'Card',
      paymentStatus: bo.payment_status || 'Pending',
      shippingAddress: this.parseShippingAddress(
        bo.shipping_address || bo.shippingAddress,
        bo.customer_name || bo.customerName,
        bo.customer_phone || bo.customerPhone
      ),

      items: Array.isArray(bo.items)
        ? bo.items.map((item: any) => ({
            id: item.id || item.product_id || 'item',
            title: item.product?.title || item.product?.name || 'Pyrotechnic Product',
            quantity: item.quantity || 1,
            price: item.price || 0.0,
            imageUrl: Array.isArray(item.product?.images) && item.product.images.length > 0 ? item.product.images[0] : (item.product?.image_url || item.product?.imageUrl),
            images: item.product?.images,
            variantInfo: item.variant_info || item.variantInfo,
            product: item.product,
          }))
        : [],
    };
  }
}

export const orderService = new OrderService();
export default orderService;

