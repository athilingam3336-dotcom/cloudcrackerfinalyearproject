import { CategoryItem, ProductItem, MOCK_CATEGORIES } from '@/constants/mockData';

/**
 * Checks if a product matches the selected category (by ID, Name, or key Pyrotechnic terms).
 * Prevents non-matching products (e.g. rockets, sparklers) from showing when Bijili or another category is selected.
 */
export function isProductInCategory(
  product: ProductItem,
  selectedCategory: string,
  categories: CategoryItem[] = MOCK_CATEGORIES
): boolean {
  if (!selectedCategory || selectedCategory === 'all' || selectedCategory === 'All') {
    return true;
  }

  const categoryTarget = selectedCategory.trim().toLowerCase();

  // Find category object in catalog by ID or Name
  const catObj = categories.find(
    (c) =>
      (c.id && c.id.toLowerCase() === categoryTarget) ||
      (c.name && c.name.toLowerCase() === categoryTarget)
  );

  const categoryName = (catObj ? catObj.name : selectedCategory).toLowerCase();
  const categoryId = (catObj ? catObj.id : selectedCategory).toLowerCase();

  const prodCat = (product.category || '').toLowerCase();
  const prodTitle = (product.title || '').toLowerCase();
  const prodSub = (product.subtitle || '').toLowerCase();
  const prodId = (product.id || '').toLowerCase();

  // 1. Direct ID or exact category name match
  if (prodCat === categoryId || prodCat === categoryName || prodId === categoryId) {
    return true;
  }

  // 2. Specialized keyword matching by category type
  if (categoryName.includes('bijili')) {
    return prodCat.includes('bijili') || prodTitle.includes('bijili') || prodSub.includes('bijili');
  }

  if (categoryName.includes('sparkler')) {
    return prodCat.includes('sparkler') || prodTitle.includes('sparkler') || prodSub.includes('sparkler');
  }

  if (categoryName.includes('flower') || categoryName.includes('pot')) {
    return (
      prodCat.includes('pot') ||
      prodCat.includes('fountain') ||
      prodTitle.includes('pot') ||
      prodTitle.includes('fountain') ||
      prodSub.includes('pot') ||
      prodSub.includes('fountain')
    );
  }

  if (categoryName.includes('chakkar') || categoryName.includes('wheel')) {
    return (
      prodCat.includes('chakkar') ||
      prodCat.includes('wheel') ||
      prodTitle.includes('chakkar') ||
      prodTitle.includes('wheel') ||
      prodTitle.includes('spin') ||
      prodSub.includes('chakkar')
    );
  }

  if (categoryName.includes('rocket')) {
    return prodCat.includes('rocket') || prodTitle.includes('rocket') || prodSub.includes('rocket');
  }

  if (categoryName.includes('bomb') || categoryName.includes('atom')) {
    return (
      (prodCat.includes('bomb') || prodTitle.includes('bomb') || prodSub.includes('bomb')) &&
      !prodTitle.includes('bijili')
    );
  }

  if (categoryName.includes('shot') || categoryName.includes('aerial') || categoryName.includes('fancy')) {
    return (
      prodCat.includes('shot') ||
      prodCat.includes('aerial') ||
      prodCat.includes('cake') ||
      prodTitle.includes('shot') ||
      prodTitle.includes('cake') ||
      prodTitle.includes('aerial') ||
      prodSub.includes('aerial')
    );
  }

  if (categoryName.includes('sound')) {
    return (
      (prodCat.includes('sound') || prodTitle.includes('sound') || prodSub.includes('sound')) &&
      !prodTitle.includes('bijili')
    );
  }

  if (categoryName.includes('kid')) {
    return (
      prodCat.includes('kid') ||
      prodTitle.includes('kid') ||
      prodTitle.includes('pencil') ||
      prodTitle.includes('magic') ||
      prodSub.includes('kid')
    );
  }

  if (categoryName.includes('gift') || categoryName.includes('box')) {
    return (
      prodCat.includes('gift') ||
      prodCat.includes('box') ||
      prodTitle.includes('gift') ||
      prodTitle.includes('family') ||
      prodTitle.includes('box') ||
      prodSub.includes('gift')
    );
  }

  // Fallback substring search
  return prodCat.includes(categoryName) || prodTitle.includes(categoryName);
}
