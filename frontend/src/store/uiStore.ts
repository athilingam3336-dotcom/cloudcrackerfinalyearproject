import { create } from 'zustand';

export interface UiState {
  isDarkMode: boolean;
  isDrawerOpen: boolean;
  toastMessage: string | null;

  // Razorpay WebView Modal State
  razorpayModalVisible: boolean;
  razorpayOptions: any | null; // We can use 'any' or import the type if available
  
  // Actions
  toggleDarkMode: () => void;
  setDrawerOpen: (open: boolean) => void;
  showToast: (message: string) => void;
  hideToast: () => void;
  openRazorpayModal: (options: any) => void;
  closeRazorpayModal: () => void;
  resetUiStore: () => void;
}

export const useUiStore = create<UiState>((set) => ({
  isDarkMode: false,
  isDrawerOpen: false,
  toastMessage: null,
  razorpayModalVisible: false,
  razorpayOptions: null,

  toggleDarkMode: () => set((state) => ({ isDarkMode: !state.isDarkMode })),

  setDrawerOpen: (isDrawerOpen) => set({ isDrawerOpen }),

  showToast: (toastMessage) => set({ toastMessage }),

  hideToast: () => set({ toastMessage: null }),

  openRazorpayModal: (options) => set({ razorpayModalVisible: true, razorpayOptions: options }),

  closeRazorpayModal: () => set({ razorpayModalVisible: false, razorpayOptions: null }),

  resetUiStore: () =>
    set({
      isDarkMode: false,
      isDrawerOpen: false,
      toastMessage: null,
      razorpayModalVisible: false,
      razorpayOptions: null,
    }),
}));
