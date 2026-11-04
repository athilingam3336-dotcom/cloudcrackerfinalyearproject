import { create } from 'zustand';
import { settingsService, StoreSettings } from '@/services/settingsService';

interface SettingsState {
  minOnlineDeliveryAmount: number;
  storeName: string;
  announcementText: string;
  locationMapUrl: string;
  contactEmail: string;
  contactPhone: string;
  whatsappNumber: string;

  // Home Page Festive / Announcement Popup
  popupEnabled: boolean;
  popupTitle: string;
  popupMessage: string;
  popupImageType: string; // 'diwali' | 'delivery' | 'giftbox' | 'custom'
  popupImageUrl: string;
  popupButtonText: string;
  popupButtonLink: string;

  isLoading: boolean;
  fetchSettings: () => Promise<void>;
  updateStoreSettings: (payload: Partial<StoreSettings>) => Promise<boolean>;
  togglePopup: (enabled: boolean) => Promise<boolean>;
  updateMinOnlineDeliveryAmount: (amount: number) => Promise<boolean>;
}

export const useSettingsStore = create<SettingsState>((set, get) => ({
  minOnlineDeliveryAmount: 5000,
  storeName: 'Meera Crackers',
  announcementText: 'Direct Sivakasi Factory Prices | Express Delivery Across Tamil Nadu & All India',
  locationMapUrl: 'https://maps.app.goo.gl/6BE5qX4vxyutrkAD6?g_st=aw',
  contactEmail: 'Meeracrackers@gmail.com',
  contactPhone: '7339624431',
  whatsappNumber: '7339624431',

  popupEnabled: true,
  popupTitle: '⚡ Urgent Diwali Booking Notice!',
  popupMessage: 'Diwali parcel & transport bookings close 3 days prior to the festival. Place your cracker orders early to guarantee doorstep delivery across Tamil Nadu & India!',
  popupImageType: 'diwali',
  popupImageUrl: '',
  popupButtonText: 'Book Diwali Crackers Now ➔',
  popupButtonLink: 'Categories',

  isLoading: false,

  fetchSettings: async () => {
    set({ isLoading: true });
    try {
      const data = await settingsService.getSettings();
      set({
        minOnlineDeliveryAmount: data.min_online_delivery_amount ?? 5000,
        storeName: data.store_name || 'Meera Crackers',
        announcementText: data.announcement_text || 'Direct Sivakasi Factory Prices | Express Delivery Across Tamil Nadu & All India',
        locationMapUrl: data.location_map_url || 'https://maps.app.goo.gl/6BE5qX4vxyutrkAD6?g_st=aw',
        contactEmail: data.contact_email || 'Meeracrackers@gmail.com',
        contactPhone: data.contact_phone || '7339624431',
        whatsappNumber: data.whatsapp_number || '7339624431',
        popupEnabled: data.popup_enabled !== undefined ? Boolean(data.popup_enabled) : true,
        popupTitle: data.popup_title || '⚡ Urgent Diwali Booking Notice!',
        popupMessage: data.popup_message || 'Diwali parcel & transport bookings close 3 days prior to the festival. Place your cracker orders early to guarantee doorstep delivery across Tamil Nadu & India!',
        popupImageType: data.popup_image_type || 'diwali',
        popupImageUrl: data.popup_image_url || '',
        popupButtonText: data.popup_button_text || 'Book Diwali Crackers Now ➔',
        popupButtonLink: data.popup_button_link || 'Categories',
        isLoading: false,
      });
    } catch {
      set({ isLoading: false });
    }
  },

  updateStoreSettings: async (payload: Partial<StoreSettings>) => {
    set({ isLoading: true });
    try {
      const updated = await settingsService.updateSettings(payload);
      set({
        minOnlineDeliveryAmount: updated.min_online_delivery_amount,
        storeName: updated.store_name || 'Meera Crackers',
        announcementText: updated.announcement_text || 'Direct Sivakasi Factory Prices | Express Delivery Across Tamil Nadu & All India',
        locationMapUrl: updated.location_map_url || 'https://maps.app.goo.gl/6BE5qX4vxyutrkAD6?g_st=aw',
        contactEmail: updated.contact_email || 'Meeracrackers@gmail.com',
        contactPhone: updated.contact_phone || '7339624431',
        whatsappNumber: updated.whatsapp_number || '7339624431',
        popupEnabled: updated.popup_enabled !== undefined ? Boolean(updated.popup_enabled) : get().popupEnabled,
        popupTitle: updated.popup_title || get().popupTitle,
        popupMessage: updated.popup_message || get().popupMessage,
        popupImageType: updated.popup_image_type || get().popupImageType,
        popupImageUrl: updated.popup_image_url !== undefined ? (updated.popup_image_url || '') : get().popupImageUrl,
        popupButtonText: updated.popup_button_text || get().popupButtonText,
        popupButtonLink: updated.popup_button_link || get().popupButtonLink,
        isLoading: false,
      });
      return true;
    } catch (err) {
      set({ isLoading: false });
      throw err;
    }
  },

  togglePopup: async (enabled: boolean) => {
    return get().updateStoreSettings({ popup_enabled: enabled });
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
