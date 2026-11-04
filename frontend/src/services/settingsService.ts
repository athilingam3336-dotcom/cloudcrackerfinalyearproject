import { apiClient } from '@/api/axios';

export interface StoreSettings {
  min_online_delivery_amount: number;
  store_name: string;
  announcement_text?: string;
  location_map_url?: string;
  contact_email?: string;
  contact_phone?: string;
  whatsapp_number?: string;
  popup_enabled?: boolean;
  popup_title?: string;
  popup_message?: string;
  popup_image_type?: string;
  popup_image_url?: string;
  popup_button_text?: string;
  popup_button_link?: string;
  updated_at?: string;
}

export const settingsService = {
  async getSettings(): Promise<StoreSettings> {
    try {
      const response = await apiClient.get('/settings');
      if (response.data?.success && response.data?.data) {
        return response.data.data;
      }
      return {
        min_online_delivery_amount: 5000,
        store_name: 'Meera Crackers',
        announcement_text: 'Direct Sivakasi Factory Prices | Express Delivery Across Tamil Nadu & All India',
        location_map_url: 'https://maps.app.goo.gl/6BE5qX4vxyutrkAD6?g_st=aw',
        contact_email: 'Meeracrackers@gmail.com',
        contact_phone: '7339624431',
        whatsapp_number: '7339624431',
        popup_enabled: true,
        popup_title: '⚡ Urgent Diwali Booking Notice!',
        popup_message: 'Diwali parcel & transport bookings close 3 days prior to the festival. Place your cracker orders early to guarantee doorstep delivery across Tamil Nadu & India!',
        popup_image_type: 'diwali',
        popup_button_text: 'Book Diwali Crackers Now ➔',
        popup_button_link: 'Categories',
      };
    } catch {
      return {
        min_online_delivery_amount: 5000,
        store_name: 'Meera Crackers',
        announcement_text: 'Direct Sivakasi Factory Prices | Express Delivery Across Tamil Nadu & All India',
        location_map_url: 'https://maps.app.goo.gl/6BE5qX4vxyutrkAD6?g_st=aw',
        contact_email: 'Meeracrackers@gmail.com',
        contact_phone: '7339624431',
        whatsapp_number: '7339624431',
        popup_enabled: true,
        popup_title: '⚡ Urgent Diwali Booking Notice!',
        popup_message: 'Diwali parcel & transport bookings close 3 days prior to the festival. Place your cracker orders early to guarantee doorstep delivery across Tamil Nadu & India!',
        popup_image_type: 'diwali',
        popup_button_text: 'Book Diwali Crackers Now ➔',
        popup_button_link: 'Categories',
      };
    }
  },

  async updateSettings(payload: Partial<StoreSettings> | number): Promise<StoreSettings> {
    const dataToSend = typeof payload === 'number'
      ? { min_online_delivery_amount: payload, store_name: 'Meera Crackers' }
      : payload;

    const response = await apiClient.put('/admin/settings', dataToSend);
    if (response.data?.success && response.data?.data) {
      return response.data.data;
    }
    throw new Error(response.data?.message || 'Failed to update store settings.');
  },
};
