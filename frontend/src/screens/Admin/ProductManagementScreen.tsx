import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  Image,
  TouchableOpacity,
  Modal,
  Alert,
  ScrollView,
  Switch,
  ListRenderItem,
  Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { MaterialIcons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { Colors } from '@/constants/colors';
import { Typography } from '@/constants/typography';
import { Spacing, BorderRadius } from '@/constants/spacing';
import { HomeHeader } from '@/components/common/HomeHeader';
import { SearchBar } from '@/components/inputs/SearchBar';
import { CustomInput } from '@/components/inputs/CustomInput';
import { PrimaryButton } from '@/components/buttons/PrimaryButton';
import { BottomNavBar, TabRoute } from '@/components/common/BottomNavBar';
import { LoadingSpinner } from '@/components/loaders/LoadingSpinner';
import {
  adminService,
  AdminProductItemUI,
  AdminCategoryItem,
} from '@/services/adminService';
import { useNotificationStore } from '@/store';
import { RootStackParamList } from '@/navigation/types';
import { formatCurrency } from '@/utils/currency';
import { resolveProductImage } from '@/constants/productImages';

export interface SelectedProductImage {
  uri: string;
  name: string;
  type: string;
  size?: number;
  file?: any;
  base64?: string | null;
}

type ProductManagementScreenProps = NativeStackScreenProps<
  RootStackParamList,
  'ProductManagement'
>;

export const ProductManagementScreen: React.FC<ProductManagementScreenProps> = ({
  navigation,
}) => {
  const [products, setProducts] = useState<AdminProductItemUI[]>([]);
  const [categories, setCategories] = useState<AdminCategoryItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Filter & Pagination States
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('All');
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalProducts, setTotalProducts] = useState(0);

  // Add / Edit Modal State
  const [isProductModalVisible, setIsProductModalVisible] = useState(false);
  const [editingProduct, setEditingProduct] = useState<AdminProductItemUI | null>(null);

  // Form Fields
  const [formName, setFormName] = useState('');
  const [formDescription, setFormDescription] = useState('');
  const [formCategoryId, setFormCategoryId] = useState('');
  const [formPrice, setFormPrice] = useState('');
  const [formDiscountPrice, setFormDiscountPrice] = useState('');
  const [formStock, setFormStock] = useState('50');
  const [formIsFeatured, setFormIsFeatured] = useState(false);
  const [formIsBestseller, setFormIsBestseller] = useState(false);
  const [formIsFlashSale, setFormIsFlashSale] = useState(false);
  const [formFlashSaleHours, setFormFlashSaleHours] = useState('4');
  const [formIsRecommended, setFormIsRecommended] = useState(false);
  const [formTimeOfDay, setFormTimeOfDay] = useState<'morning' | 'night' | 'both'>('both');

  // Product Image State
  const [selectedImage, setSelectedImage] = useState<SelectedProductImage | null>(null);
  const [formExistingImageUrl, setFormExistingImageUrl] = useState<string | null>(null);
  const [imageError, setImageError] = useState<string | null>(null);

  // Allowed file extensions & mime types for validation
  const ALLOWED_EXTENSIONS = useMemo(() => ['jpg', 'jpeg', 'png', 'webp'], []);
  const ALLOWED_MIME_TYPES = useMemo(
    () => ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'],
    []
  );

  // Image Selection Handler (Cross-Platform: Web + Mobile)
  const pickProductImage = useCallback(async () => {
    setImageError(null);

    // Web Platform: Standard HTML5 File Input for direct File object & instant preview
    if (Platform.OS === 'web' && typeof document !== 'undefined') {
      const input = document.createElement('input');
      input.type = 'file';
      input.accept = '.jpg,.jpeg,.png,.webp,image/jpeg,image/png,image/webp';
      input.onchange = (e: any) => {
        const file: File | undefined = e.target?.files?.[0];
        if (!file) return;

        const fileExt = file.name.split('.').pop()?.toLowerCase() || '';
        const isExtValid = ALLOWED_EXTENSIONS.includes(fileExt);
        const isMimeValid = ALLOWED_MIME_TYPES.includes(file.type.toLowerCase());

        if (!isExtValid && !isMimeValid) {
          setImageError('Unsupported image format. Please select a JPG, JPEG, PNG, or WebP image.');
          Alert.alert('Invalid Format', 'Only JPG, JPEG, PNG, and WebP images are allowed.');
          return;
        }

        const previewUrl = URL.createObjectURL(file);
        setSelectedImage({
          uri: previewUrl,
          name: file.name,
          type: file.type || `image/${fileExt === 'jpg' ? 'jpeg' : fileExt}`,
          size: file.size,
          file: file,
        });
        setImageError(null);
      };
      input.click();
      return;
    }

    // Native Mobile (iOS/Android) via Expo ImagePicker
    try {
      const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (!permission.granted) {
        Alert.alert(
          'Permission Required',
          'Media library permission is required to choose a product image.'
        );
        return;
      }

      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ['images'],
        allowsEditing: true,
        quality: 0.8,
        base64: true,
      });

      if (!result.canceled && result.assets && result.assets.length > 0) {
        const asset = result.assets[0];
        const fileName =
          asset.fileName || asset.uri.split('/').pop() || 'product_image.jpg';
        const fileExt = fileName.split('.').pop()?.toLowerCase() || 'jpg';

        if (!ALLOWED_EXTENSIONS.includes(fileExt)) {
          setImageError('Unsupported image format. Please select a JPG, JPEG, PNG, or WebP image.');
          Alert.alert('Invalid Format', 'Only JPG, JPEG, PNG, and WebP images are allowed.');
          return;
        }

        const mimeType =
          asset.mimeType ||
          (fileExt === 'png'
            ? 'image/png'
            : fileExt === 'webp'
            ? 'image/webp'
            : 'image/jpeg');

        setSelectedImage({
          uri: asset.uri,
          name: fileName,
          type: mimeType,
          size: asset.fileSize,
          base64: asset.base64,
        });
        setImageError(null);
      }
    } catch (err: any) {
      console.error('Image picker error:', err);
      Alert.alert('Error', 'Unable to pick image from photo library.');
    }
  }, [ALLOWED_EXTENSIONS, ALLOWED_MIME_TYPES]);

  // Remove Selected Image Handler
  const handleRemoveImage = useCallback(() => {
    setSelectedImage(null);
    setFormExistingImageUrl(null);
    setImageError('Product image is required.');
  }, []);

  // Inventory Quick Adjust Modal State
  const [isStockModalVisible, setIsStockModalVisible] = useState(false);
  const [stockProduct, setStockProduct] = useState<AdminProductItemUI | null>(null);
  const [stockTxType, setStockTxType] = useState<'IN' | 'OUT' | 'ADJUST'>('IN');
  const [stockQuantity, setStockQuantity] = useState('10');
  const [stockRemarks, setStockRemarks] = useState('');

  const unreadNotifs = useNotificationStore((state) => state.getUnreadCount());

  // 1. Fetch categories on mount
  useEffect(() => {
    let isMounted = true;
    adminService.getCategories().then((cats) => {
      if (isMounted) {
        setCategories(cats);
        if (cats.length > 0 && !formCategoryId) {
          setFormCategoryId(cats[0].id);
        }
      }
    });
    return () => {
      isMounted = false;
    };
  }, []);

  // 2. Fetch products with pagination, search, and category filtering
  const fetchProducts = useCallback(async () => {
    setIsLoading(true);
    setErrorMessage(null);
    try {
      const res = await adminService.getAdminProducts(
        page,
        10,
        searchQuery,
        selectedCategory
      );
      setProducts(res.products);
      setTotalPages(res.totalPages);
      setTotalProducts(res.total);
    } catch (err: any) {
      const msg =
        err.response?.data?.message || err.message || 'Failed to fetch products from backend.';
      setErrorMessage(msg);
    } finally {
      setIsLoading(false);
    }
  }, [page, searchQuery, selectedCategory]);

  useEffect(() => {
    fetchProducts();
  }, [fetchProducts]);

  // Open Create Product Modal
  const handleOpenAddModal = useCallback(() => {
    setEditingProduct(null);
    setFormName('');
    setFormDescription('High quality pyrotechnic fireworks product.');
    setFormCategoryId(categories.length > 0 ? categories[0].id : '');
    setFormPrice('499.00');
    setFormDiscountPrice('');
    setFormStock('50');
    setFormIsFeatured(false);
    setFormIsBestseller(false);
    setFormIsFlashSale(false);
    setFormFlashSaleHours('4');
    setFormIsRecommended(false);
    setFormTimeOfDay('both');
    setSelectedImage(null);
    setFormExistingImageUrl(null);
    setImageError(null);
    setIsProductModalVisible(true);
  }, [categories]);

  // Open Edit Product Modal
  const handleOpenEditModal = useCallback(
    (product: AdminProductItemUI) => {
      setEditingProduct(product);
      setFormName(product.name || product.title);
      setFormDescription(product.description || '');
      setFormCategoryId(product.categoryId || (categories.length > 0 ? categories[0].id : ''));
      setFormPrice(product.price.toString());
      setFormDiscountPrice(product.discountPrice ? product.discountPrice.toString() : '');
      setFormStock(product.stock.toString());
      setFormIsFeatured(Boolean(product.isFeatured));
      setFormIsBestseller(Boolean(product.isBestseller));
      setFormIsFlashSale(Boolean(product.isFlashSale));
      setFormFlashSaleHours(
        (product as any).flashSaleHours || (product as any).flash_sale_hours
          ? String((product as any).flashSaleHours || (product as any).flash_sale_hours)
          : '4'
      );
      setFormIsRecommended(Boolean(product.isRecommended));
      setFormTimeOfDay(product.timeOfDay || 'both');
      setSelectedImage(null);
      setFormExistingImageUrl(
        product.imageUrl || (product.images && product.images.length > 0 ? product.images[0] : null)
      );
      setImageError(null);
      setIsProductModalVisible(true);
    },
    [categories]
  );

  // Save (Create or Update) Product
  const handleSaveProduct = useCallback(async () => {
    if (!formName.trim() || !formPrice.trim()) {
      Alert.alert('Validation Error', 'Product title and price are required.');
      return;
    }

    const priceNum = parseFloat(formPrice);
    if (isNaN(priceNum) || priceNum <= 0) {
      Alert.alert('Validation Error', 'Price must be a positive numeric amount.');
      return;
    }

    let discountNum: number | null = null;
    if (formDiscountPrice.trim()) {
      discountNum = parseFloat(formDiscountPrice);
      if (isNaN(discountNum) || discountNum <= 0) {
        Alert.alert('Validation Error', 'Discount price must be a valid positive number.');
        return;
      }
      if (discountNum >= priceNum) {
        Alert.alert('Validation Error', 'Discount price must be strictly less than original price.');
        return;
      }
    }

    const stockNum = parseInt(formStock, 10);
    if (isNaN(stockNum) || stockNum < 0) {
      Alert.alert('Validation Error', 'Stock must be a non-negative integer.');
      return;
    }

    if (!formCategoryId) {
      Alert.alert('Validation Error', 'Please select a valid category.');
      return;
    }

    const hasImage = Boolean(selectedImage || formExistingImageUrl);
    if (!hasImage) {
      setImageError('Product image is required. Please upload an image.');
      Alert.alert('Validation Error', 'Product image is required. Please upload an image.');
      return;
    }

    setIsSaving(true);
    try {
      if (editingProduct) {
        await adminService.updateAdminProduct(editingProduct.id, {
          name: formName.trim(),
          description: formDescription.trim(),
          price: priceNum,
          discount_price: discountNum,
          category_id: formCategoryId,
          stock: stockNum,
          image: selectedImage || undefined,
          image_url: formExistingImageUrl || undefined,
          is_featured: formIsFeatured,
          is_bestseller: formIsBestseller,
          is_flash_sale: formIsFlashSale,
          flash_sale_hours: formIsFlashSale ? (parseFloat(formFlashSaleHours) || 4) : undefined,
          is_recommended: formIsRecommended,
          time_of_day: formTimeOfDay,
        });
        Alert.alert('Success', `Product "${formName}" updated successfully.`);
      } else {
        await adminService.createProduct({
          name: formName.trim(),
          description: formDescription.trim(),
          price: priceNum,
          discount_price: discountNum,
          category_id: formCategoryId,
          stock: stockNum,
          image: selectedImage,
          image_url: formExistingImageUrl,
          is_featured: formIsFeatured,
          is_bestseller: formIsBestseller,
          is_flash_sale: formIsFlashSale,
          flash_sale_hours: formIsFlashSale ? (parseFloat(formFlashSaleHours) || 4) : 4,
          is_recommended: formIsRecommended,
          time_of_day: formTimeOfDay,
        });
        Alert.alert('Success', `Product "${formName}" created successfully.`);
      }
      setIsProductModalVisible(false);
      fetchProducts();
    } catch (err: any) {
      const msg = err.response?.data?.message || err.message || 'Operation failed.';
      Alert.alert('Error', msg);
    } finally {
      setIsSaving(false);
    }
  }, [
    editingProduct,
    formName,
    formDescription,
    formPrice,
    formDiscountPrice,
    formStock,
    formCategoryId,
    formIsFeatured,
    formIsBestseller,
    formIsFlashSale,
    formIsRecommended,
    selectedImage,
    formExistingImageUrl,
    fetchProducts,
  ]);

  // Soft Delete Product
  const handleDeleteProduct = useCallback(
    (product: AdminProductItemUI) => {
      const performDelete = async () => {
        try {
          setIsLoading(true);
          await adminService.deleteAdminProduct(product.id);
          Alert.alert('Deleted', `Product "${product.title}" was soft-deleted.`);
          await fetchProducts();
        } catch (err: any) {
          const msg = err.response?.data?.message || err.message || 'Delete failed.';
          Alert.alert('Error', msg);
        } finally {
          setIsLoading(false);
        }
      };

      if (Platform.OS === 'web' && typeof window !== 'undefined') {
        const confirmed = window.confirm(`Are you sure you want to soft-delete "${product.title}"? It will be removed from customer listings.`);
        if (confirmed) {
          performDelete();
        }
      } else {
        Alert.alert(
          'Confirm Deactivation',
          `Are you sure you want to soft-delete "${product.title}"? It will be removed from customer listings.`,
          [
            { text: 'Cancel', style: 'cancel' },
            {
              text: 'Delete',
              style: 'destructive',
              onPress: performDelete,
            },
          ]
        );
      }
    },
    [fetchProducts]
  );

  // Open Inventory Quick Stock Adjust Modal
  const handleOpenStockModal = useCallback((product: AdminProductItemUI) => {
    setStockProduct(product);
    setStockTxType('IN');
    setStockQuantity('10');
    setStockRemarks(`Restock for ${product.title}`);
    setIsStockModalVisible(true);
  }, []);

  // Submit Stock Adjustment to Inventory Service
  const handleSaveStockAdjustment = useCallback(async () => {
    if (!stockProduct) return;
    const qty = parseInt(stockQuantity, 10);
    if (isNaN(qty) || qty < (stockTxType === 'ADJUST' ? 0 : 1)) {
      Alert.alert(
        'Validation Error',
        `Quantity must be ${stockTxType === 'ADJUST' ? '0 or greater' : 'at least 1'}.`
      );
      return;
    }

    setIsSaving(true);
    try {
      await adminService.adjustInventory(
        stockProduct.id,
        stockTxType,
        qty,
        stockRemarks.trim() || undefined
      );
      Alert.alert('Stock Updated', `Inventory transaction logged successfully.`);
      setIsStockModalVisible(false);
      setStockProduct(null);
      fetchProducts();
    } catch (err: any) {
      const msg = err.response?.data?.message || err.message || 'Stock adjustment failed.';
      Alert.alert('Error', msg);
    } finally {
      setIsSaving(false);
    }
  }, [stockProduct, stockTxType, stockQuantity, stockRemarks, fetchProducts]);

  const handleTabPress = useCallback(
    (tab: TabRoute) => {
      if (tab === 'Home') navigation.navigate('Home');
      else if (tab === 'Categories') navigation.navigate('Categories');
      else if (tab === 'Cart') navigation.navigate('Cart');
      else if (tab === 'Wishlist') navigation.navigate('Wishlist');
      else if (tab === 'Profile') navigation.navigate('UserProfile');
    },
    [navigation]
  );

  // Render Product Card Item
  const renderProductRow: ListRenderItem<AdminProductItemUI> = useCallback(
    ({ item }) => {
      const isOutOfStock = item.stock <= 0;
      const isLowStock = item.stock > 0 && item.stock <= 10;

      return (
        <TouchableOpacity
          style={styles.productCard}
          onPress={() => handleOpenEditModal(item)}
          activeOpacity={0.88}
        >
          <Image
            source={resolveProductImage(item)}
            style={styles.productThumb}
            resizeMode="cover"
          />

          <View style={styles.productInfo}>
            <View style={styles.titleBadgeRow}>
              <Text style={styles.productTitle} numberOfLines={1}>
                {item.title}
              </Text>
            </View>

            <Text style={styles.productCategory}>{item.category}</Text>

            <View style={styles.priceRow}>
              <Text style={styles.productPrice}>{formatCurrency(item.price)}</Text>
              {item.discountPrice && (
                <Text style={styles.discountPriceBadge}>
                  Sale: {formatCurrency(item.discountPrice)}
                </Text>
              )}
            </View>

            {/* Stock Badge & Flags */}
            <View style={styles.metaRow}>
              <TouchableOpacity
                style={[
                  styles.stockBadge,
                  isOutOfStock
                    ? styles.stockBadgeOut
                    : isLowStock
                    ? styles.stockBadgeLow
                    : styles.stockBadgeIn,
                ]}
                onPress={() => handleOpenStockModal(item)}
                activeOpacity={0.7}
              >
                <MaterialIcons
                  name={isOutOfStock ? 'error-outline' : 'inventory'}
                  size={12}
                  color={
                    isOutOfStock
                      ? '#D32F2F'
                      : isLowStock
                      ? '#ED6C02'
                      : '#2E7D32'
                  }
                />
                <Text
                  style={[
                    styles.stockBadgeText,
                    isOutOfStock
                      ? styles.stockTextOut
                      : isLowStock
                      ? styles.stockTextLow
                      : styles.stockTextIn,
                  ]}
                >
                  {isOutOfStock
                    ? 'Out of Stock (0)'
                    : isLowStock
                    ? `Low Stock (${item.stock})`
                    : `Stock: ${item.stock}`}
                </Text>
                <MaterialIcons name="edit" size={10} color={Colors.tertiary} />
              </TouchableOpacity>

              {item.timeOfDay === 'morning' && <Text style={[styles.flagChip, { backgroundColor: '#FFF3E0', color: '#E65100' }]}>☀️ Morning</Text>}
              {item.timeOfDay === 'night' && <Text style={[styles.flagChip, { backgroundColor: '#EDE7F6', color: '#4A148C' }]}>🌙 Night</Text>}
              {item.timeOfDay === 'both' && <Text style={[styles.flagChip, { backgroundColor: '#E8F5E9', color: '#1B5E20' }]}>✨ Day & Night</Text>}
              {item.isFeatured && <Text style={styles.flagChip}>Featured</Text>}
              {item.isBestseller && <Text style={styles.flagChip}>Bestseller</Text>}
              {item.isFlashSale && <Text style={styles.flagChip}>Flash Sale</Text>}
            </View>
          </View>

          {/* Action Buttons */}
          <View style={styles.productActions}>
            <TouchableOpacity
              style={styles.editBtn}
              onPress={() => handleOpenEditModal(item)}
              activeOpacity={0.7}
            >
              <MaterialIcons name="edit" size={18} color={Colors.primary} />
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.deleteBtn}
              onPress={() => handleDeleteProduct(item)}
              activeOpacity={0.7}
            >
              <MaterialIcons name="delete-outline" size={18} color={Colors.error} />
            </TouchableOpacity>
          </View>
        </TouchableOpacity>
      );
    },
    [handleOpenEditModal, handleDeleteProduct, handleOpenStockModal]
  );

  // Render Header Component
  const renderHeader = useMemo(() => {
    return (
      <View style={styles.headerWrapper}>
        <HomeHeader
          onBackPress={() => (navigation.canGoBack() ? navigation.goBack() : navigation.navigate('AdminDashboard'))}
          onNotificationPress={() => navigation.navigate('Notifications')}
          onProfilePress={() => navigation.navigate('UserProfile')}
          onCartPress={() => navigation.navigate('Cart')}
          notificationCount={unreadNotifs}
        />

        <View style={styles.topSection}>
          <View style={styles.titleRow}>
            <View>
              <Text style={styles.title}>Inventory Control</Text>
            </View>
            <PrimaryButton
              title="+ Add New"
              onPress={handleOpenAddModal}
              style={styles.addCta}
            />
          </View>

          {/* Search Bar */}
          <SearchBar
            value={searchQuery}
            onChangeText={(q) => {
              setSearchQuery(q);
              setPage(1);
            }}
            onClear={() => {
              setSearchQuery('');
              setPage(1);
            }}
            placeholder="Search products by title or description..."
          />

          {/* Category & Badge Filter Chips */}
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.filterRow}
          >
            {[
              { id: 'All', label: 'All' },
              { id: 'flash_sale', label: '⚡ Flash Sale' },
              { id: 'featured', label: '✨ Featured' },
              { id: 'bestseller', label: '🔥 Bestsellers' },
            ].map((f) => {
              const isSel = selectedCategory === f.id;
              return (
                <TouchableOpacity
                  key={f.id}
                  style={[
                    styles.filterChip,
                    isSel && styles.activeFilterChip,
                    f.id === 'flash_sale' && isSel && { backgroundColor: '#B30000', borderColor: '#B30000' },
                    f.id === 'featured' && isSel && { backgroundColor: '#D97706', borderColor: '#D97706' },
                    f.id === 'bestseller' && isSel && { backgroundColor: '#2E7D32', borderColor: '#2E7D32' },
                  ]}
                  onPress={() => {
                    setSelectedCategory(f.id);
                    setPage(1);
                  }}
                  activeOpacity={0.8}
                >
                  <Text
                    style={[
                      styles.filterChipText,
                      isSel && styles.activeFilterChipText,
                    ]}
                  >
                    {f.label}
                  </Text>
                </TouchableOpacity>
              );
            })}

            {categories.map((cat) => (
              <TouchableOpacity
                key={cat.id}
                style={[
                  styles.filterChip,
                  selectedCategory === cat.id && styles.activeFilterChip,
                ]}
                onPress={() => {
                  setSelectedCategory(cat.id);
                  setPage(1);
                }}
                activeOpacity={0.8}
              >
                <Text
                  style={[
                    styles.filterChipText,
                    selectedCategory === cat.id && styles.activeFilterChipText,
                  ]}
                >
                  {cat.name}
                </Text>
              </TouchableOpacity>
            ))}
          </ScrollView>
        </View>
      </View>
    );
  }, [
    totalProducts,
    searchQuery,
    selectedCategory,
    categories,
    unreadNotifs,
    navigation,
    handleOpenAddModal,
  ]);

  // Render Footer Pagination
  const renderFooter = useMemo(() => {
    if (products.length === 0) return null;
    return (
      <View style={styles.paginationContainer}>
        <TouchableOpacity
          style={[styles.pageBtn, page <= 1 && styles.disabledPageBtn]}
          onPress={() => setPage((p) => Math.max(1, p - 1))}
          disabled={page <= 1}
          activeOpacity={0.8}
        >
          <MaterialIcons
            name="chevron-left"
            size={20}
            color={page <= 1 ? Colors.tertiary : Colors.onSurface}
          />
          <Text style={[styles.pageBtnText, page <= 1 && styles.disabledPageText]}>
            Previous
          </Text>
        </TouchableOpacity>

        <Text style={styles.pageIndicator}>
          Page {page} of {totalPages}
        </Text>

        <TouchableOpacity
          style={[styles.pageBtn, page >= totalPages && styles.disabledPageBtn]}
          onPress={() => setPage((p) => Math.min(totalPages, p + 1))}
          disabled={page >= totalPages}
          activeOpacity={0.8}
        >
          <Text style={[styles.pageBtnText, page >= totalPages && styles.disabledPageText]}>
            Next
          </Text>
          <MaterialIcons
            name="chevron-right"
            size={20}
            color={page >= totalPages ? Colors.tertiary : Colors.onSurface}
          />
        </TouchableOpacity>
      </View>
    );
  }, [page, totalPages, products.length]);

  // Render Empty State
  const renderEmpty = useMemo(() => {
    if (isLoading) return null;
    return (
      <View style={styles.emptyContainer}>
        <MaterialIcons name="inventory" size={48} color={Colors.tertiary} />
        <Text style={styles.emptyTitle}>No Products Found</Text>
        <Text style={styles.emptySubtitle}>
          {searchQuery.trim() || selectedCategory !== 'All'
            ? 'No catalog items match your search query or category filter.'
            : 'No products are currently available in the database.'}
        </Text>
        {(searchQuery.trim() || selectedCategory !== 'All') && (
          <TouchableOpacity
            style={styles.resetFiltersBtn}
            onPress={() => {
              setSearchQuery('');
              setSelectedCategory('All');
              setPage(1);
            }}
          >
            <Text style={styles.resetFiltersBtnText}>Reset Filters</Text>
          </TouchableOpacity>
        )}
      </View>
    );
  }, [isLoading, searchQuery, selectedCategory]);

  return (
    <SafeAreaView style={styles.safeArea} edges={['top', 'left', 'right']}>
      {errorMessage && (
        <View style={styles.errorBanner}>
          <MaterialIcons name="error-outline" size={18} color="#D32F2F" />
          <Text style={styles.errorText}>{errorMessage}</Text>
          <TouchableOpacity onPress={fetchProducts}>
            <Text style={styles.retryText}>Retry</Text>
          </TouchableOpacity>
        </View>
      )}

      {isLoading && products.length === 0 ? (
        <>
          {renderHeader}
          <LoadingSpinner message="Fetching catalog from MongoDB..." />
        </>
      ) : (
        <FlatList
          data={products}
          keyExtractor={(item) => item.id}
          renderItem={renderProductRow}
          ListHeaderComponent={renderHeader}
          ListFooterComponent={renderFooter}
          ListEmptyComponent={renderEmpty}
          contentContainerStyle={styles.listContent}
          showsVerticalScrollIndicator={false}
          onRefresh={fetchProducts}
          refreshing={isLoading}
        />
      )}

      {/* Add / Edit Product Modal */}
      <Modal visible={isProductModalVisible} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <ScrollView
            style={styles.modalScroll}
            contentContainerStyle={styles.modalCard}
            showsVerticalScrollIndicator={false}
          >
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>
                {editingProduct ? 'Edit Product' : 'Add New Product'}
              </Text>
              <TouchableOpacity onPress={() => setIsProductModalVisible(false)}>
                <MaterialIcons name="close" size={24} color={Colors.onSurface} />
              </TouchableOpacity>
            </View>

            <View style={styles.formRow}>
              <CustomInput
                label="Product Title *"
                value={formName}
                onChangeText={setFormName}
                placeholder="e.g. Midnight Fury 30-Shot"
                containerStyle={styles.halfFormInput}
              />
              <CustomInput
                label="Description"
                value={formDescription}
                onChangeText={setFormDescription}
                placeholder="Short effects summary..."
                containerStyle={styles.halfFormInput}
              />
            </View>

            {/* Product Image Required Section */}
            <View style={styles.imageUploadSection}>
              <View style={styles.imageUploadHeader}>
                <Text style={styles.formInputLabel}>
                  Product Image <Text style={styles.requiredAsterisk}>*</Text>
                </Text>
                {Boolean(selectedImage || formExistingImageUrl) && (
                  <View style={styles.imageBadge}>
                    <Text style={styles.imageBadgeText}>
                      {selectedImage ? 'Image Ready' : 'Existing Image'}
                    </Text>
                  </View>
                )}
              </View>

              {selectedImage || formExistingImageUrl ? (
                <View
                  style={[
                    styles.imagePreviewCard,
                    !!imageError && styles.imageCardError,
                  ]}
                >
                  <View style={styles.imagePreviewBox}>
                    <Image
                      source={{
                        uri: selectedImage?.uri || formExistingImageUrl || '',
                      }}
                      style={styles.imagePreviewImg}
                      resizeMode="contain"
                    />
                  </View>
                  <View style={styles.imageMetaRow}>
                    <View style={styles.imageMetaInfo}>
                      <Text style={styles.imageMetaName} numberOfLines={1}>
                        {selectedImage?.name ||
                          (formExistingImageUrl
                            ? 'Current catalog image'
                            : 'Product Image')}
                      </Text>
                    </View>
                    <View style={styles.imageActionButtons}>
                      <TouchableOpacity
                        style={styles.imageChangeBtn}
                        onPress={pickProductImage}
                        activeOpacity={0.7}
                      >
                        <MaterialIcons
                          name="edit"
                          size={12}
                          color={Colors.primary}
                        />
                        <Text style={styles.imageChangeBtnText}>Change</Text>
                      </TouchableOpacity>
                      <TouchableOpacity
                        style={styles.imageRemoveBtn}
                        onPress={handleRemoveImage}
                        activeOpacity={0.7}
                      >
                        <MaterialIcons
                          name="delete-outline"
                          size={12}
                          color={Colors.error}
                        />
                        <Text style={styles.imageRemoveBtnText}>Remove</Text>
                      </TouchableOpacity>
                    </View>
                  </View>
                </View>
              ) : (
                <TouchableOpacity
                  style={[
                    styles.imageDropzone,
                    !!imageError && styles.imageDropzoneError,
                  ]}
                  onPress={pickProductImage}
                  activeOpacity={0.7}
                >
                  <MaterialIcons
                    name="cloud-upload"
                    size={22}
                    color={Colors.primary}
                  />
                  <Text style={styles.imageDropzoneTitle}>
                    Choose Image / Upload Image (JPG, PNG, WebP)
                  </Text>
                  <View style={styles.imageBrowseChip}>
                    <MaterialIcons
                      name="add-photo-alternate"
                      size={12}
                      color={Colors.onPrimary}
                    />
                    <Text style={styles.imageBrowseChipText}>Browse</Text>
                  </View>
                </TouchableOpacity>
              )}

              {!!imageError && (
                <View style={styles.imageErrorContainer}>
                  <MaterialIcons
                    name="error-outline"
                    size={14}
                    color={Colors.error}
                  />
                  <Text style={styles.imageErrorText}>{imageError}</Text>
                </View>
              )}
            </View>

            {/* Category Selector */}
            <Text style={styles.formSectionLabel}>Category *</Text>
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.modalCategoryRow}
            >
              {categories.map((cat) => (
                <TouchableOpacity
                  key={cat.id}
                  style={[
                    styles.modalCategoryChip,
                    formCategoryId === cat.id && styles.modalCategoryChipSelected,
                  ]}
                  onPress={() => setFormCategoryId(cat.id)}
                >
                  <Text
                    style={[
                      styles.modalCategoryChipText,
                      formCategoryId === cat.id && styles.modalCategoryChipTextSelected,
                    ]}
                  >
                    {cat.name}
                  </Text>
                </TouchableOpacity>
              ))}
            </ScrollView>

            {/* Price & Stock 3-Column Row */}
            <View style={styles.formRow}>
              <CustomInput
                label="Original Price (₹) *"
                value={formPrice}
                onChangeText={setFormPrice}
                keyboardType="numeric"
                containerStyle={styles.halfFormInput}
                placeholder="499.00"
              />
              <CustomInput
                label="Discount Price (₹)"
                value={formDiscountPrice}
                onChangeText={setFormDiscountPrice}
                keyboardType="numeric"
                containerStyle={styles.halfFormInput}
                placeholder="Optional (449)"
              />
              <CustomInput
                label="Stock Count *"
                value={formStock}
                onChangeText={setFormStock}
                keyboardType="numeric"
                containerStyle={styles.halfFormInput}
                placeholder="e.g. 50"
              />
            </View>

            {/* Celebration Timing Selector */}
            <Text style={styles.formSectionLabel}>Celebration Burst Timing *</Text>
            <View style={{ flexDirection: 'row', gap: 6, marginBottom: 8 }}>
              {[
                { label: '☀️ Morning', value: 'morning', icon: 'wb-sunny', color: '#ED6C02' },
                { label: '🌙 Night', value: 'night', icon: 'nights-stay', color: '#673AB7' },
                { label: '✨ Day & Night', value: 'both', icon: 'wb-twilight', color: '#2E7D32' },
              ].map((t) => {
                const isSel = formTimeOfDay === t.value;
                return (
                  <TouchableOpacity
                    key={t.value}
                    style={{
                      flex: 1,
                      flexDirection: 'row',
                      alignItems: 'center',
                      justifyContent: 'center',
                      paddingVertical: 6,
                      paddingHorizontal: 6,
                      borderRadius: BorderRadius.md,
                      borderWidth: isSel ? 2 : 1,
                      borderColor: isSel ? Colors.primary : Colors.surfaceContainerHigh,
                      backgroundColor: isSel ? Colors.primaryContainer : Colors.surfaceContainerLowest,
                      gap: 4,
                    }}
                    onPress={() => setFormTimeOfDay(t.value as any)}
                    activeOpacity={0.8}
                  >
                    <MaterialIcons name={t.icon as any} size={14} color={isSel ? Colors.primary : t.color} />
                    <Text
                      style={{
                        ...Typography.labelLg,
                        fontSize: 11,
                        color: isSel ? Colors.primary : Colors.onSurface,
                        fontFamily: isSel ? 'Inter-Bold' : 'Inter-Regular',
                      }}
                    >
                      {t.label}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>

            {/* Feature Flags */}
            <Text style={styles.formSectionLabel}>Product Badges & Visibility</Text>
            <View style={styles.switchesContainer}>
              <View style={styles.switchRow}>
                <Text style={styles.switchLabel}>Featured</Text>
                <Switch
                  value={formIsFeatured}
                  onValueChange={setFormIsFeatured}
                  trackColor={{ false: '#ccc', true: Colors.primaryContainer }}
                  thumbColor={formIsFeatured ? Colors.primary : '#f4f3f4'}
                />
              </View>

              <View style={styles.switchRow}>
                <Text style={styles.switchLabel}>Bestseller</Text>
                <Switch
                  value={formIsBestseller}
                  onValueChange={setFormIsBestseller}
                  trackColor={{ false: '#ccc', true: Colors.primaryContainer }}
                  thumbColor={formIsBestseller ? Colors.primary : '#f4f3f4'}
                />
              </View>

              <View style={styles.switchRow}>
                <Text style={styles.switchLabel}>Flash Sale</Text>
                <Switch
                  value={formIsFlashSale}
                  onValueChange={setFormIsFlashSale}
                  trackColor={{ false: '#ccc', true: Colors.primaryContainer }}
                  thumbColor={formIsFlashSale ? Colors.primary : '#f4f3f4'}
                />
              </View>

              {formIsFlashSale && (
                <View
                  style={{
                    backgroundColor: Colors.primaryContainer,
                    padding: 12,
                    borderRadius: BorderRadius.lg,
                    marginTop: 8,
                    borderWidth: 1,
                    borderColor: Colors.primary,
                  }}
                >
                  <Text
                    style={{
                      ...Typography.labelLg,
                      fontSize: 12,
                      fontFamily: 'Inter-Bold',
                      color: Colors.primary,
                      marginBottom: 6,
                    }}
                  >
                    ⚡ Flash Sale Duration (Hours)
                  </Text>
                  <View style={{ flexDirection: 'row', gap: 6, flexWrap: 'wrap', marginBottom: 8 }}>
                    {['1', '2', '4', '6', '12', '24', '48'].map((hr) => {
                      const isSel = formFlashSaleHours === hr;
                      return (
                        <TouchableOpacity
                          key={hr}
                          style={{
                            paddingHorizontal: 12,
                            paddingVertical: 6,
                            borderRadius: BorderRadius.full,
                            backgroundColor: isSel ? Colors.primary : Colors.surfaceContainerLowest,
                            borderWidth: 1,
                            borderColor: isSel ? Colors.primary : Colors.surfaceContainerHigh,
                          }}
                          onPress={() => setFormFlashSaleHours(hr)}
                          activeOpacity={0.8}
                        >
                          <Text
                            style={{
                              ...Typography.labelLg,
                              fontSize: 11,
                              fontFamily: isSel ? 'Inter-Bold' : 'Inter-Medium',
                              color: isSel ? '#ffffff' : Colors.onSurface,
                            }}
                          >
                            {hr} Hours
                          </Text>
                        </TouchableOpacity>
                      );
                    })}
                  </View>
                  <CustomInput
                    label="Custom Duration (Hours)"
                    value={formFlashSaleHours}
                    onChangeText={setFormFlashSaleHours}
                    keyboardType="numeric"
                    placeholder="e.g. 3.5"
                  />
                </View>
              )}
            </View>

            <View style={styles.modalActions}>
              <PrimaryButton
                title={
                  isSaving
                    ? 'Saving...'
                    : editingProduct
                    ? 'Update Product'
                    : 'Save & Publish Product'
                }
                onPress={handleSaveProduct}
                disabled={isSaving}
              />
            </View>
          </ScrollView>
        </View>
      </Modal>

      {/* Stock Quick Adjustment Modal */}
      <Modal visible={isStockModalVisible} animationType="fade" transparent>
        <View style={styles.modalOverlay}>
          <View style={styles.modalCard}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Adjust Inventory Stock</Text>
              <TouchableOpacity onPress={() => setIsStockModalVisible(false)}>
                <MaterialIcons name="close" size={24} color={Colors.onSurface} />
              </TouchableOpacity>
            </View>

            <Text style={styles.stockModalSubtitle}>
              Product: {stockProduct?.title} (Current: {stockProduct?.stock})
            </Text>

            <Text style={styles.formSectionLabel}>Transaction Type</Text>
            <View style={styles.txTypeRow}>
              {[
                { type: 'IN' as const, label: '+ IN (Receive)' },
                { type: 'OUT' as const, label: '- OUT (Deduct)' },
                { type: 'ADJUST' as const, label: '= ADJUST (Set Exact)' },
              ].map((t) => (
                <TouchableOpacity
                  key={t.type}
                  style={[
                    styles.txTypeBtn,
                    stockTxType === t.type && styles.txTypeBtnActive,
                  ]}
                  onPress={() => setStockTxType(t.type)}
                >
                  <Text
                    style={[
                      styles.txTypeBtnText,
                      stockTxType === t.type && styles.txTypeBtnTextActive,
                    ]}
                  >
                    {t.label}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            <CustomInput
              label={
                stockTxType === 'ADJUST'
                  ? 'New Stock Total'
                  : stockTxType === 'IN'
                  ? 'Units to Add (+)'
                  : 'Units to Deduct (-)'
              }
              value={stockQuantity}
              onChangeText={setStockQuantity}
              keyboardType="numeric"
              placeholder="e.g. 10"
            />

            <CustomInput
              label="Audit Remarks / Reason"
              value={stockRemarks}
              onChangeText={setStockRemarks}
              placeholder="e.g. Warehouse batch delivery #481"
            />

            <View style={styles.modalActions}>
              <PrimaryButton
                title={isSaving ? 'Logging...' : 'Confirm Stock Adjustment'}
                onPress={handleSaveStockAdjustment}
                disabled={isSaving}
              />
            </View>
          </View>
        </View>
      </Modal>

      <BottomNavBar activeTab="Profile" onTabPress={handleTabPress} />
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  listContent: {
    paddingBottom: Spacing.xl,
  },
  headerWrapper: {
    marginBottom: Spacing.sm,
  },
  topSection: {
    paddingHorizontal: Spacing.marginMobile,
    marginTop: Spacing.sm,
  },
  titleRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: Spacing.sm,
  },
  title: {
    ...Typography.headlineLg,
    fontSize: 24,
    fontFamily: 'Inter-Bold',
    color: Colors.onSurface,
  },
  subtitle: {
    ...Typography.bodyMd,
    fontSize: 12,
    color: Colors.onSurfaceVariant,
    marginTop: 2,
  },
  addCta: {
    paddingHorizontal: Spacing.md,
    height: 40,
  },
  filterRow: {
    flexDirection: 'row',
    gap: Spacing.xs,
    marginTop: Spacing.sm,
    marginBottom: Spacing.xs,
    paddingRight: Spacing.marginMobile,
  },
  filterChip: {
    paddingHorizontal: Spacing.md,
    paddingVertical: 6,
    borderRadius: BorderRadius.full,
    backgroundColor: Colors.surfaceContainerLow,
    borderWidth: 1,
    borderColor: Colors.surfaceContainerHigh,
  },
  activeFilterChip: {
    backgroundColor: Colors.primaryContainer,
    borderColor: Colors.primary,
  },
  filterChipText: {
    ...Typography.labelLg,
    fontSize: 12,
    color: Colors.onSurfaceVariant,
  },
  activeFilterChipText: {
    color: Colors.onPrimaryContainer,
    fontFamily: 'Inter-Bold',
  },
  productCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.surfaceContainerLowest,
    marginHorizontal: Spacing.marginMobile,
    marginBottom: Spacing.xs,
    padding: Spacing.sm,
    borderRadius: BorderRadius.xl,
    borderWidth: 1,
    borderColor: Colors.surfaceContainerHigh,
    gap: Spacing.sm,
    elevation: 1,
  },
  productThumb: {
    width: 68,
    height: 68,
    borderRadius: BorderRadius.lg,
    backgroundColor: Colors.surfaceContainerLow,
  },
  productInfo: {
    flex: 1,
  },
  titleBadgeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  productTitle: {
    ...Typography.titleLg,
    fontSize: 14,
    fontFamily: 'Inter-Bold',
    color: Colors.onSurface,
    flex: 1,
  },
  productCategory: {
    ...Typography.bodyMd,
    fontSize: 11,
    color: Colors.tertiary,
    marginTop: 1,
  },
  priceRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: 2,
  },
  productPrice: {
    ...Typography.titleLg,
    fontSize: 14,
    fontFamily: 'Inter-Bold',
    color: Colors.primary,
  },
  discountPriceBadge: {
    ...Typography.labelLg,
    fontSize: 11,
    color: '#2E7D32',
    fontFamily: 'Inter-Bold',
  },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: 4,
    marginTop: 4,
  },
  stockBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: BorderRadius.sm,
    gap: 3,
  },
  stockBadgeIn: {
    backgroundColor: '#E8F5E9',
  },
  stockBadgeLow: {
    backgroundColor: '#FFF3E0',
  },
  stockBadgeOut: {
    backgroundColor: '#FFEBEE',
  },
  stockBadgeText: {
    ...Typography.labelLg,
    fontSize: 10,
    fontFamily: 'Inter-Bold',
  },
  stockTextIn: {
    color: '#2E7D32',
  },
  stockTextLow: {
    color: '#ED6C02',
  },
  stockTextOut: {
    color: '#D32F2F',
  },
  flagChip: {
    ...Typography.labelLg,
    fontSize: 9,
    fontFamily: 'Inter-Bold',
    backgroundColor: Colors.surfaceContainerHigh,
    color: Colors.onSurfaceVariant,
    paddingHorizontal: 4,
    paddingVertical: 1,
    borderRadius: 4,
  },
  productActions: {
    flexDirection: 'row',
    gap: Spacing.xs,
  },
  editBtn: {
    padding: 8,
    backgroundColor: Colors.surfaceContainerLow,
    borderRadius: BorderRadius.lg,
  },
  deleteBtn: {
    padding: 8,
    backgroundColor: Colors.errorContainer,
    borderRadius: BorderRadius.lg,
  },
  paginationContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: Spacing.marginMobile,
    marginVertical: Spacing.md,
  },
  pageBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.surfaceContainerLow,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.xs,
    borderRadius: BorderRadius.lg,
    borderWidth: 1,
    borderColor: Colors.surfaceContainerHigh,
    gap: 4,
  },
  disabledPageBtn: {
    opacity: 0.4,
  },
  pageBtnText: {
    ...Typography.labelLg,
    fontSize: 13,
    fontFamily: 'Inter-Bold',
    color: Colors.onSurface,
  },
  disabledPageText: {
    color: Colors.tertiary,
  },
  pageIndicator: {
    ...Typography.bodyMd,
    fontSize: 13,
    color: Colors.onSurfaceVariant,
  },
  errorBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#FFEBEE',
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    marginHorizontal: Spacing.marginMobile,
    marginTop: Spacing.xs,
    borderRadius: BorderRadius.lg,
    gap: Spacing.xs,
  },
  errorText: {
    flex: 1,
    ...Typography.bodyMd,
    fontSize: 12,
    color: '#D32F2F',
  },
  retryText: {
    ...Typography.labelLg,
    fontSize: 12,
    fontFamily: 'Inter-Bold',
    color: '#D32F2F',
    textDecorationLine: 'underline',
  },
  emptyContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: Spacing.xl * 2,
    paddingHorizontal: Spacing.xl,
    gap: Spacing.xs,
  },
  emptyTitle: {
    ...Typography.titleLg,
    fontSize: 18,
    fontFamily: 'Inter-Bold',
    color: Colors.onSurface,
    marginTop: Spacing.xs,
  },
  emptySubtitle: {
    ...Typography.bodyMd,
    fontSize: 13,
    color: Colors.tertiary,
    textAlign: 'center',
  },
  resetFiltersBtn: {
    marginTop: Spacing.md,
    backgroundColor: Colors.primary,
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.sm,
    borderRadius: BorderRadius.lg,
  },
  resetFiltersBtnText: {
    ...Typography.labelLg,
    fontSize: 13,
    fontFamily: 'Inter-Bold',
    color: Colors.onPrimary,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: Spacing.marginMobile,
  },
  modalScroll: {
    width: '100%',
    maxHeight: '90%',
  },
  modalCard: {
    backgroundColor: Colors.surfaceContainerLowest,
    borderRadius: BorderRadius.lg,
    padding: Spacing.sm + 2,
    elevation: 10,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: Spacing.xs,
  },
  modalTitle: {
    ...Typography.headlineLg,
    fontSize: 17,
    fontFamily: 'Inter-Bold',
    color: Colors.onSurface,
  },
  stockModalSubtitle: {
    ...Typography.bodyMd,
    fontSize: 12,
    color: Colors.tertiary,
    marginBottom: Spacing.xs,
  },
  formSectionLabel: {
    ...Typography.labelLg,
    fontSize: 11,
    fontFamily: 'Inter-Bold',
    color: Colors.tertiary,
    marginTop: 2,
    marginBottom: 4,
  },
  modalCategoryRow: {
    gap: Spacing.xs,
    marginBottom: Spacing.xs,
  },
  modalCategoryChip: {
    paddingHorizontal: Spacing.sm,
    paddingVertical: 4,
    borderRadius: BorderRadius.full,
    backgroundColor: Colors.surfaceContainerLow,
    borderWidth: 1,
    borderColor: Colors.surfaceContainerHigh,
  },
  modalCategoryChipSelected: {
    backgroundColor: Colors.primaryContainer,
    borderColor: Colors.primary,
  },
  modalCategoryChipText: {
    ...Typography.labelLg,
    fontSize: 11,
    color: Colors.onSurfaceVariant,
  },
  modalCategoryChipTextSelected: {
    color: Colors.onPrimaryContainer,
    fontFamily: 'Inter-Bold',
  },
  formRow: {
    flexDirection: 'row',
    gap: Spacing.xs,
  },
  halfFormInput: {
    flex: 1,
  },
  switchesContainer: {
    backgroundColor: Colors.surfaceContainerLow,
    borderRadius: BorderRadius.md,
    padding: 4,
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 4,
    marginBottom: Spacing.xs,
  },
  switchRow: {
    flex: 1,
    minWidth: 140,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: Colors.surfaceContainerLowest,
    paddingHorizontal: Spacing.sm,
    paddingVertical: 6,
    borderRadius: BorderRadius.md,
    borderWidth: 1,
    borderColor: Colors.surfaceContainerHigh,
  },
  switchLabel: {
    ...Typography.bodyMd,
    fontSize: 13,
    color: Colors.onSurface,
  },
  modalActions: {
    marginTop: Spacing.sm,
  },
  txTypeRow: {
    flexDirection: 'row',
    gap: 4,
    marginBottom: Spacing.sm,
  },
  txTypeBtn: {
    flex: 1,
    paddingVertical: 6,
    paddingHorizontal: 2,
    alignItems: 'center',
    borderRadius: BorderRadius.md,
    backgroundColor: Colors.surfaceContainerLow,
    borderWidth: 1,
    borderColor: Colors.surfaceContainerHigh,
  },
  txTypeBtnActive: {
    backgroundColor: Colors.primaryContainer,
    borderColor: Colors.primary,
  },
  txTypeBtnText: {
    ...Typography.labelLg,
    fontSize: 10,
    color: Colors.onSurfaceVariant,
  },
  txTypeBtnTextActive: {
    color: Colors.onPrimaryContainer,
    fontFamily: 'Inter-Bold',
  },
  formInputLabel: {
    ...Typography.bodyMd,
    fontWeight: '500',
    color: Colors.onBackground,
    marginBottom: Spacing.xs,
  },
  requiredAsterisk: {
    color: Colors.error,
    fontWeight: '700',
  },
  imageUploadSection: {
    marginBottom: Spacing.sm,
    width: '100%',
  },
  imageUploadHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  imageBadge: {
    backgroundColor: Colors.primaryContainer,
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: BorderRadius.full,
  },
  imageBadgeText: {
    ...Typography.labelLg,
    fontSize: 10,
    fontFamily: 'Inter-Bold',
    color: Colors.onPrimaryContainer,
  },
  imageDropzone: {
    backgroundColor: Colors.surfaceContainerLow,
    borderRadius: BorderRadius.md,
    borderWidth: 1.5,
    borderColor: Colors.surfaceContainerHigh,
    borderStyle: 'dashed',
    paddingVertical: 8,
    paddingHorizontal: Spacing.sm,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 8,
  },
  imageDropzoneError: {
    borderColor: Colors.error,
    backgroundColor: '#FFF5F5',
  },
  imageDropzoneTitle: {
    ...Typography.bodyMd,
    fontSize: 12,
    fontFamily: 'Inter-Medium',
    color: Colors.onSurface,
    flex: 1,
  },
  imageBrowseChip: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.primary,
    paddingHorizontal: Spacing.sm,
    paddingVertical: 4,
    borderRadius: BorderRadius.md,
    gap: 4,
  },
  imageBrowseChipText: {
    ...Typography.labelLg,
    fontSize: 11,
    fontFamily: 'Inter-Bold',
    color: Colors.onPrimary,
  },
  imagePreviewCard: {
    backgroundColor: Colors.surfaceContainerLow,
    borderRadius: BorderRadius.md,
    borderWidth: 1,
    borderColor: Colors.surfaceContainerHigh,
    overflow: 'hidden',
  },
  imageCardError: {
    borderColor: Colors.error,
  },
  imagePreviewBox: {
    width: '100%',
    height: 90,
    backgroundColor: '#1E1E1E',
    alignItems: 'center',
    justifyContent: 'center',
  },
  imagePreviewImg: {
    width: '100%',
    height: '100%',
  },
  imageMetaRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: Spacing.sm,
    paddingVertical: Spacing.xs,
    backgroundColor: Colors.surfaceContainerLowest,
    borderTopWidth: 1,
    borderTopColor: Colors.surfaceContainerHigh,
  },
  imageMetaInfo: {
    flex: 1,
    marginRight: Spacing.xs,
  },
  imageMetaName: {
    ...Typography.bodyMd,
    fontSize: 12,
    fontFamily: 'Inter-Bold',
    color: Colors.onSurface,
  },
  imageMetaDetails: {
    ...Typography.bodyMd,
    fontSize: 10,
    color: Colors.tertiary,
    marginTop: 1,
  },
  imageActionButtons: {
    flexDirection: 'row',
    gap: 6,
  },
  imageChangeBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingVertical: 5,
    borderRadius: BorderRadius.md,
    backgroundColor: Colors.surfaceContainerLow,
    borderWidth: 1,
    borderColor: Colors.surfaceContainerHigh,
    gap: 3,
  },
  imageChangeBtnText: {
    ...Typography.labelLg,
    fontSize: 11,
    color: Colors.primary,
    fontFamily: 'Inter-Bold',
  },
  imageRemoveBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingVertical: 5,
    borderRadius: BorderRadius.md,
    backgroundColor: Colors.errorContainer,
    gap: 3,
  },
  imageRemoveBtnText: {
    ...Typography.labelLg,
    fontSize: 11,
    color: Colors.error,
    fontFamily: 'Inter-Bold',
  },
  imageErrorContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginTop: 4,
  },
  imageErrorText: {
    ...Typography.labelLg,
    fontSize: 11,
    color: Colors.error,
  },
});

export default ProductManagementScreen;
