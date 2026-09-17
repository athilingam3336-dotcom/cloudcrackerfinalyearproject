import { apiClient } from '@/api/axios';

export interface StoreSettings {
  min_online_delivery_amount: number;
  store_name: string;
  updated_at?: string;
}

export const settingsService = {
  async getSettings(): Promise<StoreSettings> {
    try {
      const response = await apiClient.get('/settings');
      if (response.data?.success && response.data?.data) {
        return response.data.data;
      }
      return { min_online_delivery_amount: 5000, store_name: 'Meera Crackers' };
    } catch {
      return { min_online_delivery_amount: 5000, store_name: 'Meera Crackers' };
    }
  },

  async updateSettings(minOnlineDeliveryAmount: number): Promise<StoreSettings> {
    const response = await apiClient.put('/admin/settings', {
      min_online_delivery_amount: minOnlineDeliveryAmount,
      store_name: 'Meera Crackers',
    });
    if (response.data?.success && response.data?.data) {
      return response.data.data;
    }
    throw new Error(response.data?.message || 'Failed to update store settings.');
  },
};

