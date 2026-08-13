import { create } from 'zustand';
import { MOCK_CATEGORIES, CategoryItem } from '@/constants/mockData';

export interface CategoryState {
  categories: CategoryItem[];
  selectedCategoryId: string;

  // Actions
  setSelectedCategoryId: (id: string) => void;
  resetCategoryStore: () => void;
}

export const useCategoryStore = create<CategoryState>((set) => ({
  categories: MOCK_CATEGORIES,
  selectedCategoryId: 'all',

  setSelectedCategoryId: (selectedCategoryId) => set({ selectedCategoryId }),

  resetCategoryStore: () =>
    set({
      categories: MOCK_CATEGORIES,
      selectedCategoryId: 'all',
    }),
}));
