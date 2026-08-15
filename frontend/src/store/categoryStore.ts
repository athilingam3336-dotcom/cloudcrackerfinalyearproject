import { create } from 'zustand';
import { MOCK_CATEGORIES, CategoryItem } from '@/constants/mockData';

export interface CategoryState {
  categories: CategoryItem[];
  selectedCategoryId: string;

  // Actions
  setCategories: (categories: CategoryItem[]) => void;
  setSelectedCategoryId: (id: string) => void;
  resetCategoryStore: () => void;
}

export const useCategoryStore = create<CategoryState>((set) => ({
  categories: [],
  selectedCategoryId: 'all',

  setCategories: (categories) => set({ categories }),
  setSelectedCategoryId: (selectedCategoryId) => set({ selectedCategoryId }),

  resetCategoryStore: () =>
    set({
      categories: [],
      selectedCategoryId: 'all',
    }),
}));
