import { create } from 'zustand';
import { adminService, BusinessAnalyticsData } from '@/services/adminService';

interface AttentionModalState {
  isVisible: boolean;
  analyticsData: BusinessAnalyticsData | null;
  isLoading: boolean;
  openAttentionModal: () => void;
  closeAttentionModal: () => void;
  fetchAnalyticsData: () => Promise<void>;
  setAnalyticsData: (data: BusinessAnalyticsData | null) => void;
}

export const useAttentionModalStore = create<AttentionModalState>((set, get) => ({
  isVisible: false,
  analyticsData: null,
  isLoading: false,

  openAttentionModal: () => {
    set({ isVisible: true });
    // Always ensure fresh analytics data if not yet loaded
    if (!get().analyticsData) {
      get().fetchAnalyticsData();
    }
  },

  closeAttentionModal: () => set({ isVisible: false }),

  fetchAnalyticsData: async () => {
    set({ isLoading: true });
    try {
      const data = await adminService.getBusinessAnalyticsData();
      set({ analyticsData: data, isLoading: false });
    } catch {
      set({ isLoading: false });
    }
  },

  setAnalyticsData: (data: BusinessAnalyticsData | null) => {
    set({ analyticsData: data });
  },
}));
