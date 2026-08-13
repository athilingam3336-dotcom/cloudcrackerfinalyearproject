import { create } from 'zustand';
import { ProductItem } from '@/constants/mockData';

export interface ProductState {
  products: ProductItem[];
  searchQuery: string;
  selectedCategory: string;
  selectedProduct: ProductItem | null;
  isLoading: boolean;

  // Actions
  setProducts: (products: ProductItem[]) => void;
  setSearchQuery: (query: string) => void;
  setSelectedCategory: (category: string) => void;
  setSelectedProduct: (product: ProductItem | null) => void;
  addProduct: (product: ProductItem) => void;
  updateProduct: (id: string, updatedFields: Partial<ProductItem>) => void;
  deleteProduct: (id: string) => void;
  resetProductsStore: () => void;
}

export const useProductStore = create<ProductState>((set) => ({
  products: [],
  searchQuery: '',
  selectedCategory: 'all',
  selectedProduct: null,
  isLoading: false,

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
    }),
}));
