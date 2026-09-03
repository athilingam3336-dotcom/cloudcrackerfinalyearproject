import { create } from 'zustand';
import { ProductItem } from '@/constants/mockData';

export interface ListingState {
  searchQuery: string;
  selectedFilterChip: string;
  sortBy: string;
  currentPage: number;
  categoryId: string;
}

export interface ProductState {
  products: ProductItem[];
  searchQuery: string;
  selectedCategory: string;
  selectedProduct: ProductItem | null;
  isLoading: boolean;

  listingState: ListingState;

  lastProfileScreen: { routeName: string; params?: any } | null;

  // Actions
  setLastProfileScreen: (screen: { routeName: string; params?: any } | null) => void;
  setListingState: (state: Partial<ListingState>) => void;
  resetListingState: () => void;
  setProducts: (products: ProductItem[]) => void;
  setSearchQuery: (query: string) => void;
  setSelectedCategory: (category: string) => void;
  setSelectedProduct: (product: ProductItem | null) => void;
  addProduct: (product: ProductItem) => void;
  updateProduct: (id: string, updatedFields: Partial<ProductItem>) => void;
  deleteProduct: (id: string) => void;
  resetProductsStore: () => void;
}

const initialListingState: ListingState = {
  searchQuery: '',
  selectedFilterChip: 'ALL',
  sortBy: 'BEST_SELLING',
  currentPage: 1,
  categoryId: '',
};

export const useProductStore = create<ProductState>((set) => ({
  products: [],
  searchQuery: '',
  selectedCategory: 'all',
  selectedProduct: null,
  isLoading: false,

  listingState: initialListingState,
  lastProfileScreen: null,

  setLastProfileScreen: (screen) => set({ lastProfileScreen: screen }),

  setListingState: (newState) =>
    set((state) => ({
      listingState: { ...state.listingState, ...newState },
    })),

  resetListingState: () =>
    set({
      listingState: initialListingState,
    }),

  setProducts: (products) => set({ products }),
  setSearchQuery: (searchQuery) => set({ searchQuery }),
  setSelectedCategory: (selectedCategory) => set({ selectedCategory }),
  setSelectedProduct: (selectedProduct) => set({ selectedProduct }),

  addProduct: (newProd) =>
    set((state) => ({ products: [newProd, ...state.products] })),

  updateProduct: (id, updatedFields) =>
    set((state) => ({
      products: state.products.map((p) =>
        p.id === id ? { ...p, ...updatedFields } : p
      ),
    })),

  deleteProduct: (id) =>
    set((state) => ({
      products: state.products.filter((p) => p.id !== id),
    })),

  resetProductsStore: () =>
    set({
      products: [],
      searchQuery: '',
      selectedCategory: 'all',
      selectedProduct: null,
      isLoading: false,
      listingState: initialListingState,
    }),
}));
