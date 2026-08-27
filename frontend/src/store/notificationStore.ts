import { create } from 'zustand';
import { notificationService, BackendNotification } from '@/services/notificationService';

export interface NotificationItem {
  id: string;
  title: string;
  message: string;
  time: string;
  isRead: boolean;
  type: 'order' | 'price' | 'promo' | 'system';
  tag?: string;
  section?: 'Today' | 'Earlier';
}

export interface NotificationState {
  notifications: NotificationItem[];
  isLoading: boolean;
  error: string | null;

  // Actions
  fetchNotifications: () => Promise<void>;
  markAsRead: (id: string) => Promise<void>;
  markAllAsRead: () => Promise<void>;
  deleteNotification: (id: string) => Promise<void>;
  addNotification: (notification: Omit<NotificationItem, 'id' | 'isRead'>) => void;
  getUnreadCount: () => number;
  resetNotificationStore: () => void;
}

const mapBackendToUi = (bn: BackendNotification): NotificationItem => {
  let timeStr = 'Just now';
  if (bn.created_at) {
    const diffHours = Math.floor((Date.now() - new Date(bn.created_at).getTime()) / (1000 * 60 * 60));
    if (diffHours > 24) {
      timeStr = `${Math.floor(diffHours / 24)}d ago`;
    } else if (diffHours > 0) {
      timeStr = `${diffHours}h ago`;
    } else {
      timeStr = 'Just now';
    }
  }
  return {
    id: bn.id,
    title: bn.title,
    message: bn.message,
    time: timeStr,
    isRead: bn.is_read,
    type: (['order', 'price', 'promo', 'system'].includes(bn.type) ? bn.type : 'system') as any,
    tag: bn.tag,
    section: 'Today',
  };
};

const initialNotifications: NotificationItem[] = [
  {
    id: 'notif1',
    title: 'Order Out for Delivery',
    message:
      "Your 'Midnight Thunder' assortment bundle (Order #CC-9821) is with our courier and will arrive by 5:00 PM today.",
    time: '2h ago',
    isRead: false,
    type: 'order',
    tag: 'IN TRANSIT',
    section: 'Today',
  },
  {
    id: 'notif2',
    title: 'Price Drop: Titanium Shells',
    message:
      "An item in your wishlist has dropped in price! The 'Titanium Bloom' multi-pack is now $45.00 (was $59.99).",
    time: '5h ago',
    isRead: false,
    type: 'price',
    tag: 'WISHLIST DROP',
    section: 'Today',
  },
  {
    id: 'notif3',
    title: 'Weekend Flash Sale!',
    message:
      'Get 20% off all fountain-style fireworks this weekend only with code SPARK20.',
    time: '1d ago',
    isRead: true,
    type: 'promo',
    tag: '20% OFF',
    section: 'Earlier',
  },
  {
    id: 'notif4',
    title: 'Security Alert: New Login',
    message:
      'Your Meera Crackers account was logged into from a new Chrome Web device in New York, USA.',
    time: '2d ago',
    isRead: true,
    type: 'system',
    tag: 'SECURITY',
    section: 'Earlier',
  },
];

export const useNotificationStore = create<NotificationState>((set, get) => ({
  // Initialize with empty array so ONLY real user notifications appear
  notifications: [],
  isLoading: false,
  error: null,

  fetchNotifications: async () => {
    set({ isLoading: true, error: null });
    try {
      const response = await notificationService.getNotifications();
      if (response && Array.isArray(response.notifications)) {
        const mapped = response.notifications.map(mapBackendToUi);
        set({ notifications: mapped, isLoading: false });
      } else {
        set({ notifications: [], isLoading: false });
      }
    } catch {
      set({ notifications: [], isLoading: false });
    }
  },

  markAsRead: async (id) => {
    set((state) => ({
      notifications: state.notifications.map((n) =>
        n.id === id ? { ...n, isRead: true } : n
      ),
    }));
    try {
      await notificationService.markAsRead(id);
    } catch {
      // Keep optimistic update
    }
  },

  markAllAsRead: async () => {
    set((state) => ({
      notifications: state.notifications.map((n) => ({ ...n, isRead: true })),
    }));
    try {
      await notificationService.markAllAsRead();
    } catch {
      // Keep optimistic update
    }
  },

  deleteNotification: async (id) => {
    set((state) => ({
      notifications: state.notifications.filter((n) => n.id !== id),
    }));
    try {
      await notificationService.deleteNotification(id);
    } catch {
      // Keep optimistic removal
    }
  },

  addNotification: (newNotif) => {
    const notifObj: NotificationItem = {
      ...newNotif,
      id: `notif_${Date.now()}`,
      isRead: false,
    };
    set((state) => ({ notifications: [notifObj, ...state.notifications] }));
  },

  getUnreadCount: () => {
    return get().notifications.filter((n) => !n.isRead).length;
  },

  resetNotificationStore: () => {
    set({ notifications: [], isLoading: false, error: null });
  },
}));

