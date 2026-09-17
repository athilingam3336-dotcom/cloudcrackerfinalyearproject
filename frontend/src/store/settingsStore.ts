import { create } from 'zustand';
import { settingsService } from '@/services/settingsService';

interface SettingsState {
  minOnlineDeliveryAmount: number;
  isLoading: boolean;
  fetchSettings: () => Promise<void>;
  updateMinOnlineDeliveryAmount: (amount: number) => Promise<boolean>;
}

export const useSettingsStore = create<SettingsState>((set) => ({
  minOnlineDeliveryAmount: 5000,
  isLoading: false,

  fetchSettings: async () => {
    set({ isLoading: true });
    try {
      const data = await settingsService.getSettings();
      set({
        minOnlineDeliveryAmount: data.min_online_delivery_amount ?? 5000,
        isLoading: false,
      });
    } catch {
      set({ isLoading: false });
    }
  },

  updateMinOnlineDeliveryAmount: async (amount: number) => {
    set({ isLoading: true });
    try {
      const updated = await settingsService.updateSettings(amount);
      set({
        minOnlineDeliveryAmount: updated.min_online_delivery_amount,
        isLoading: false,
      });
      return true;
    } catch (err) {
      set({ isLoading: false });
      throw err;
    }
  },
}));
