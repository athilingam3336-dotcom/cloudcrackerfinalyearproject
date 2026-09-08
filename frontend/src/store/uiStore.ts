import { create } from 'zustand';

export interface UiState {
  isDarkMode: boolean;
  isDrawerOpen: boolean;
  toastMessage: string | null;

  // Actions
  toggleDarkMode: () => void;
  setDarkMode: (isDarkMode: boolean) => void;
  setDrawerOpen: (open: boolean) => void;
  showToast: (message: string) => void;
  hideToast: () => void;
  resetUiStore: () => void;
}

export const useUiStore = create<UiState>((set) => ({
  isDarkMode: false,
  isDrawerOpen: false,
  toastMessage: null,

  toggleDarkMode: () => set((state) => ({ isDarkMode: !state.isDarkMode })),

  setDarkMode: (isDarkMode) => set({ isDarkMode }),

  setDrawerOpen: (isDrawerOpen) => set({ isDrawerOpen }),

  showToast: (toastMessage) => set({ toastMessage }),

  hideToast: () => set({ toastMessage: null }),

  resetUiStore: () =>
    set({
      isDarkMode: false,
      isDrawerOpen: false,
      toastMessage: null,
    }),
}));
