import { create } from 'zustand';
import { MOCK_CATEGORIES, CategoryItem } from '@/constants/mockData';

export interface CategoryState {
  categories: CategoryItem[];
  selectedCategoryId: string;
  searchQuery: string;
  selectedFilter: 'all' | 'morning' | 'night' | 'both';

  // Actions
  setCategories: (categories: CategoryItem[]) => void;
  setSelectedCategoryId: (id: string) => void;
  setCategoryFilters: (query: string, filter: 'all' | 'morning' | 'night' | 'both') => void;
  resetCategoryStore: () => void;
}

export const useCategoryStore = create<CategoryState>((set) => ({
  categories: [],
  selectedCategoryId: 'all',
  searchQuery: '',
  selectedFilter: 'all',

  setCategories: (categories) => set({ categories }),
  setSelectedCategoryId: (selectedCategoryId) => set({ selectedCategoryId }),
  setCategoryFilters: (searchQuery, selectedFilter) => set({ searchQuery, selectedFilter }),

  resetCategoryStore: () =>
    set({
      categories: [],
      selectedCategoryId: 'all',
      searchQuery: '',
      selectedFilter: 'all',
    }),
}));
