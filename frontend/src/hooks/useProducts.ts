/**
 * Custom Hook: useProducts
 * Reactive binding for product searching, catalog filtering, and product service calls.
 */

import { useCallback } from 'react';
import { useProductStore } from '@/store/productStore';
import { productService } from '@/services/productService';

export const useProducts = () => {
  const products = useProductStore((state) => state.products);
  const searchQuery = useProductStore((state) => state.searchQuery);
  const selectedCategory = useProductStore((state) => state.selectedCategory);
  const setSearchQuery = useProductStore((state) => state.setSearchQuery);
  const setSelectedCategory = useProductStore((state) => state.setSelectedCategory);

  const fetchProducts = useCallback(async (category?: string, query?: string) => {
    return await productService.getProducts(category, query);
  }, []);

  return {
    products,
    searchQuery,
    selectedCategory,
    setSearchQuery,
    setSelectedCategory,
    fetchProducts,
  };
};

export default useProducts;
