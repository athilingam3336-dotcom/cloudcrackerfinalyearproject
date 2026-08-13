import apiClient from '@/api/axios';
import { ENV } from '@/config/env';

export interface BackendNotification {
  id: string;
  user_id?: string;
  title: string;
  message: string;
  type: string; // 'order' | 'price' | 'promo' | 'system'
  tag?: string;
  is_read: boolean;
  created_at?: string;
  updated_at?: string;
}

export interface NotificationListResponse {
  notifications: BackendNotification[];
  unread_count: number;
  total_count: number;
}

const MOCK_NOTIFICATIONS: BackendNotification[] = [
  {
    id: 'notif1',
    title: 'Order Out for Delivery',
    message:
      "Your 'Midnight Thunder' assortment bundle (Order #CC-9821) is with our courier and will arrive by 5:00 PM today.",
    type: 'order',
    tag: 'IN TRANSIT',
    is_read: false,
    created_at: new Date().toISOString(),
  },
  {
    id: 'notif2',
    title: 'Price Drop: Titanium Shells',
    message:
      "An item in your wishlist has dropped in price! The 'Titanium Bloom' multi-pack is now $45.00 (was $59.99).",
    type: 'price',
    tag: 'WISHLIST DROP',
    is_read: false,
    created_at: new Date(Date.now() - 3600000 * 3).toISOString(),
  },
  {
    id: 'notif3',
    title: 'Weekend Flash Sale!',
    message:
      'Get 20% off all fountain-style fireworks this weekend only with code SPARK20.',
    type: 'promo',
    tag: '20% OFF',
    is_read: true,
    created_at: new Date(Date.now() - 3600000 * 24).toISOString(),
  },
  {
    id: 'notif4',
    title: 'Security Alert: New Login',
    message:
      'Your CloudCrackers account was logged into from a new Chrome Web device in New York, USA.',
    type: 'system',
    tag: 'SECURITY',
    is_read: true,
    created_at: new Date(Date.now() - 3600000 * 48).toISOString(),
  },
];

export const notificationService = {
  /**
   * Fetches user notifications from backend API.
   */
  async getNotifications(page = 1, limit = 20, is_read?: boolean): Promise<NotificationListResponse> {
    if (ENV.ENABLE_MOCK_API) {
      let filtered = [...MOCK_NOTIFICATIONS];
      if (is_read !== undefined) {
        filtered = filtered.filter((n) => n.is_read === is_read);
      }
      const unreadCount = filtered.filter((n) => !n.is_read).length;
      return {
        notifications: filtered,
        unread_count: unreadCount,
        total_count: filtered.length,
      };
    }
    try {
      const params: Record<string, any> = { page, limit };
      if (is_read !== undefined) {
        params.is_read = is_read;
      }
      const response = await apiClient.get('/notifications', { params });
      return response.data.data;
    } catch {
      const unreadCount = MOCK_NOTIFICATIONS.filter((n) => !n.is_read).length;
      return {
        notifications: MOCK_NOTIFICATIONS,
        unread_count: unreadCount,
        total_count: MOCK_NOTIFICATIONS.length,
      };
    }
  },

  /**
   * Fetches unread count from backend API.
   */
  async getUnreadCount(): Promise<number> {
    if (ENV.ENABLE_MOCK_API) {
      return MOCK_NOTIFICATIONS.filter((n) => !n.is_read).length;
    }
    try {
      const response = await apiClient.get('/notifications/unread-count');
      return response.data.data.unread_count;
    } catch {
      return MOCK_NOTIFICATIONS.filter((n) => !n.is_read).length;
    }
  },

  /**
   * Marks a single notification as read.
   */
  async markAsRead(notificationId: string): Promise<BackendNotification> {
    if (ENV.ENABLE_MOCK_API) {
      const target = MOCK_NOTIFICATIONS.find((n) => n.id === notificationId);
      if (target) target.is_read = true;
      return target || { id: notificationId, title: '', message: '', type: 'system', is_read: true };
    }
    try {
      const response = await apiClient.put(`/notifications/${notificationId}/read`);
      return response.data.data;
    } catch {
      const target = MOCK_NOTIFICATIONS.find((n) => n.id === notificationId);
      if (target) target.is_read = true;
      return target || { id: notificationId, title: '', message: '', type: 'system', is_read: true };
    }
  },

  /**
   * Marks all notifications for user as read.
   */
  async markAllAsRead(): Promise<number> {
    if (ENV.ENABLE_MOCK_API) {
      let count = 0;
      MOCK_NOTIFICATIONS.forEach((n) => {
        if (!n.is_read) {
          n.is_read = true;
          count++;
        }
      });
      return count;
    }
    try {
      const response = await apiClient.put('/notifications/read-all');
      return response.data.data.updated_count;
    } catch {
      let count = 0;
      MOCK_NOTIFICATIONS.forEach((n) => {
        if (!n.is_read) {
          n.is_read = true;
          count++;
        }
      });
      return count;
    }
  },

  /**
   * Deletes a single notification.
   */
  async deleteNotification(notificationId: string): Promise<void> {
    if (ENV.ENABLE_MOCK_API) {
      const idx = MOCK_NOTIFICATIONS.findIndex((n) => n.id === notificationId);
      if (idx !== -1) MOCK_NOTIFICATIONS.splice(idx, 1);
      return;
    }
    try {
      await apiClient.delete(`/notifications/${notificationId}`);
    } catch {
      const idx = MOCK_NOTIFICATIONS.findIndex((n) => n.id === notificationId);
      if (idx !== -1) MOCK_NOTIFICATIONS.splice(idx, 1);
    }
  },
};

export default notificationService;

