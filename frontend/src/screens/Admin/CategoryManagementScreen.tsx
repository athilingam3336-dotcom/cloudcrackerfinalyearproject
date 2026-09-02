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
  AdminCategoryItem,
} from '@/services/adminService';
import { useNotificationStore } from '@/store';
import { RootStackParamList } from '@/navigation/types';
import { resolveProductImage } from '@/constants/productImages';

type CategoryManagementScreenProps = NativeStackScreenProps<
  RootStackParamList,
  'CategoryManagement'
>;

const SUGGESTED_IMAGE_PRESETS = [
  { name: 'Aerial Shells', url: 'https://cloudcrackers.com/assets/categories/aerial_shells.png' },
  { name: 'Flower Pots & Fountains', url: 'https://cloudcrackers.com/assets/categories/flower_pots.png' },
  { name: 'Rockets & Missiles', url: 'https://cloudcrackers.com/assets/categories/rockets.png' },
  { name: 'Multi-Shot Cakes', url: 'https://cloudcrackers.com/assets/categories/cakes.png' },
  { name: 'Ground Spinners & Chakkars', url: 'https://cloudcrackers.com/assets/categories/spinners.png' },
  { name: 'Electric Sparklers', url: 'https://cloudcrackers.com/assets/categories/sparklers.png' },
  { name: 'Gift Assortment Boxes', url: 'https://cloudcrackers.com/assets/categories/gift_boxes.png' },
  { name: 'Sound & Atom Bombs', url: 'https://cloudcrackers.com/assets/categories/atom_bombs.png' },
];

export const CategoryManagementScreen: React.FC<CategoryManagementScreenProps> = ({
  navigation,
}) => {
  const [categories, setCategories] = useState<AdminCategoryItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Search & Filter
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<'All' | 'Active' | 'Inactive'>('All');

  // Modal State
  const [isModalVisible, setIsModalVisible] = useState(false);
  const [editingCategory, setEditingCategory] = useState<AdminCategoryItem | null>(null);

  // Form Fields
  const [formName, setFormName] = useState('');
  const [formDescription, setFormDescription] = useState('');
  const [formImageUrl, setFormImageUrl] = useState('');
  const [formIsActive, setFormIsActive] = useState(true);

  const unreadNotifs = useNotificationStore((state) => state.getUnreadCount());

  // Fetch all categories (including inactive for admin)
  const fetchCategories = useCallback(async () => {
    setIsLoading(true);
    setErrorMessage(null);
    try {
      const data = await adminService.getCategories(true);
      setCategories(data);
    } catch (err: any) {
      const msg =
        err.response?.data?.message || err.message || 'Failed to fetch categories from backend.';
      setErrorMessage(msg);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchCategories();
  }, [fetchCategories]);

  // Filtered categories
  const filteredCategories = useMemo(() => {
    return categories.filter((c) => {
      const matchesSearch =
        c.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (c.description && c.description.toLowerCase().includes(searchQuery.toLowerCase()));

      const matchesStatus =
        statusFilter === 'All' ||
        (statusFilter === 'Active' && c.isActive) ||
        (statusFilter === 'Inactive' && !c.isActive);

      return matchesSearch && matchesStatus;
    });
  }, [categories, searchQuery, statusFilter]);

  // Open Add Category Modal
  const handleOpenAddModal = useCallback(() => {
    setEditingCategory(null);
    setFormName('');
    setFormDescription('');
    setFormImageUrl(SUGGESTED_IMAGE_PRESETS[0].url);
    setFormIsActive(true);
    setIsModalVisible(true);
  }, []);

  // Open Edit Category Modal
  const handleOpenEditModal = useCallback((category: AdminCategoryItem) => {
    setEditingCategory(category);
    setFormName(category.name);
    setFormDescription(category.description || '');
    setFormImageUrl(category.imageUrl || SUGGESTED_IMAGE_PRESETS[0].url);
    setFormIsActive(category.isActive !== undefined ? category.isActive : true);
    setIsModalVisible(true);
  }, []);

  // Save (Create or Update) Category
  const handleSaveCategory = useCallback(async () => {
    if (!formName.trim()) {
      Alert.alert('Validation Error', 'Category name is required (2-50 characters).');
      return;
    }
    if (formName.trim().length < 2 || formName.trim().length > 50) {
      Alert.alert('Validation Error', 'Category name must be between 2 and 50 characters.');
      return;
    }
    if (!formDescription.trim()) {
      Alert.alert('Validation Error', 'Category description is required.');
      return;
    }
    if (!formImageUrl.trim()) {
      Alert.alert('Validation Error', 'Category image URL is required.');
      return;
    }

    setIsSaving(true);
    try {
      if (editingCategory) {
        await adminService.updateCategory(editingCategory.id, {
          name: formName.trim(),
          description: formDescription.trim(),
          image_url: formImageUrl.trim(),
          is_active: formIsActive,
        });
        Alert.alert('Success', `Category "${formName.trim()}" updated successfully in MongoDB.`);
      } else {
        await adminService.createCategory({
          name: formName.trim(),
          description: formDescription.trim(),
          image_url: formImageUrl.trim(),
        });
        Alert.alert('Success', `Category "${formName.trim()}" created successfully in MongoDB.`);
      }
      setIsModalVisible(false);
      fetchCategories();
    } catch (err: any) {
      const msg = err.response?.data?.message || err.message || 'Operation failed.';
      Alert.alert('Error', msg);
    } finally {
      setIsSaving(false);
    }
  }, [editingCategory, formName, formDescription, formImageUrl, formIsActive, fetchCategories]);

  // Toggle Active State
  const handleToggleActive = useCallback(
    async (category: AdminCategoryItem) => {
      const newActive = !category.isActive;
      try {
        await adminService.updateCategory(category.id, {
          is_active: newActive,
        });
        setCategories((prev) =>
          prev.map((c) => (c.id === category.id ? { ...c, isActive: newActive } : c))
        );
      } catch (err: any) {
        const msg = err.response?.data?.message || err.message || 'Failed to update status.';
        Alert.alert('Error', msg);
      }
    },
    []
  );

  // Soft Delete Category
  const handleDeleteCategory = useCallback(
    (category: AdminCategoryItem) => {
      const performDelete = async () => {
        try {
          await adminService.deleteCategory(category.id);
          Alert.alert('Deleted', `Category "${category.name}" was soft-deleted.`);
          fetchCategories();
        } catch (err: any) {
          const msg =
            err.response?.data?.message ||
            err.message ||
            'Failed to delete category.';
          Alert.alert('Cannot Delete Category', msg);
        }
      };

      if (Platform.OS === 'web' && typeof window !== 'undefined') {
        const confirmed = window.confirm(`Are you sure you want to soft-delete category "${category.name}"?\n\nNote: Categories with active products cannot be deleted.`);
        if (confirmed) {
          performDelete();
        }
      } else {
        Alert.alert(
          'Confirm Deactivation',
          `Are you sure you want to soft-delete category "${category.name}"?\n\nNote: Categories with active products cannot be deleted.`,
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
    [fetchCategories]
  );

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

  // Render Category Row
  const renderCategoryRow: ListRenderItem<AdminCategoryItem> = useCallback(
    ({ item }) => {
      return (
        <TouchableOpacity
          style={styles.categoryCard}
          onPress={() => handleOpenEditModal(item)}
          activeOpacity={0.88}
        >
          <Image
            source={resolveProductImage(item.name)}
            style={styles.categoryThumb}
            resizeMode="cover"
          />

          <View style={styles.categoryInfo}>
            <View style={styles.titleStatusRow}>
              <Text style={styles.categoryTitle} numberOfLines={1}>
                {item.name}
              </Text>
              <View
                style={[
                  styles.statusBadge,
                  item.isActive ? styles.statusBadgeActive : styles.statusBadgeInactive,
                ]}
              >
                <Text
                  style={[
                    styles.statusBadgeText,
                    item.isActive ? styles.statusTextActive : styles.statusTextInactive,
                  ]}
                >
                  {item.isActive ? 'Active' : 'Inactive'}
                </Text>
              </View>
            </View>

            <Text style={styles.categoryDescription} numberOfLines={2}>
              {item.description || 'No description provided.'}
            </Text>

            <Text style={styles.imageSourceUrl} numberOfLines={1}>
              Media: {item.imageUrl || 'Default Stitch asset'}
            </Text>
          </View>

          {/* Actions */}
          <View style={styles.cardActions}>
            <TouchableOpacity
              style={styles.toggleBtn}
              onPress={() => handleToggleActive(item)}
              activeOpacity={0.7}
            >
              <MaterialIcons
                name={item.isActive ? 'visibility' : 'visibility-off'}
                size={18}
                color={item.isActive ? '#2E7D32' : Colors.tertiary}
              />
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.editBtn}
              onPress={() => handleOpenEditModal(item)}
              activeOpacity={0.7}
            >
              <MaterialIcons name="edit" size={18} color={Colors.primary} />
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.deleteBtn}
              onPress={() => handleDeleteCategory(item)}
              activeOpacity={0.7}
            >
              <MaterialIcons name="delete-outline" size={18} color={Colors.error} />
            </TouchableOpacity>
          </View>
        </TouchableOpacity>
      );
    },
    [handleToggleActive, handleOpenEditModal, handleDeleteCategory]
  );

  // Render Header
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
              <Text style={styles.title}>Category Catalog</Text>
              <Text style={styles.subtitle}>
                {categories.length} product categories registered in MongoDB
              </Text>
            </View>
            <PrimaryButton
              title="+ Add Category"
              onPress={handleOpenAddModal}
              style={styles.addCta}
            />
          </View>

          {/* Search Bar */}
          <SearchBar
            value={searchQuery}
            onChangeText={setSearchQuery}
            onClear={() => setSearchQuery('')}
            placeholder="Search categories by name or description..."
          />

          {/* Filter Status Chips */}
          <View style={styles.filterRow}>
            {(['All', 'Active', 'Inactive'] as const).map((filter) => (
              <TouchableOpacity
                key={filter}
                style={[
                  styles.filterChip,
                  statusFilter === filter && styles.activeFilterChip,
                ]}
                onPress={() => setStatusFilter(filter)}
                activeOpacity={0.8}
              >
                <Text
                  style={[
                    styles.filterChipText,
                    statusFilter === filter && styles.activeFilterChipText,
                  ]}
                >
                  {filter}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>
      </View>
    );
  }, [
    categories.length,
    searchQuery,
    statusFilter,
    unreadNotifs,
    navigation,
    handleOpenAddModal,
  ]);

  // Render Empty State
  const renderEmpty = useMemo(() => {
    if (isLoading) return null;
    return (
      <View style={styles.emptyContainer}>
        <MaterialIcons name="category" size={48} color={Colors.tertiary} />
        <Text style={styles.emptyTitle}>No Categories Found</Text>
        <Text style={styles.emptySubtitle}>
          {searchQuery.trim() || statusFilter !== 'All'
            ? 'No product categories match your search query or status filter.'
            : 'No categories are currently registered in MongoDB.'}
        </Text>
        {(searchQuery.trim() || statusFilter !== 'All') && (
          <TouchableOpacity
            style={styles.resetFiltersBtn}
            onPress={() => {
              setSearchQuery('');
              setStatusFilter('All');
            }}
          >
            <Text style={styles.resetFiltersBtnText}>Reset Filters</Text>
          </TouchableOpacity>
        )}
      </View>
    );
  }, [isLoading, searchQuery, statusFilter]);

  return (
    <SafeAreaView style={styles.safeArea} edges={['top', 'left', 'right']}>
      {errorMessage && (
        <View style={styles.errorBanner}>
          <MaterialIcons name="error-outline" size={18} color="#D32F2F" />
          <Text style={styles.errorText}>{errorMessage}</Text>
          <TouchableOpacity onPress={fetchCategories}>
            <Text style={styles.retryText}>Retry</Text>
          </TouchableOpacity>
        </View>
      )}

      {isLoading && categories.length === 0 ? (
        <>
          {renderHeader}
          <LoadingSpinner message="Fetching categories from MongoDB..." />
        </>
      ) : (
        <FlatList
          data={filteredCategories}
          keyExtractor={(item) => item.id}
          renderItem={renderCategoryRow}
          ListHeaderComponent={renderHeader}
          ListEmptyComponent={renderEmpty}
          contentContainerStyle={styles.listContent}
          showsVerticalScrollIndicator={false}
          onRefresh={fetchCategories}
          refreshing={isLoading}
        />
      )}

      {/* Add / Edit Category Modal */}
      <Modal visible={isModalVisible} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <ScrollView
            style={styles.modalScroll}
            contentContainerStyle={styles.modalCard}
            showsVerticalScrollIndicator={false}
          >
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>
                {editingCategory ? 'Edit Category' : 'Add New Category'}
              </Text>
              <TouchableOpacity onPress={() => setIsModalVisible(false)}>
                <MaterialIcons name="close" size={24} color={Colors.onSurface} />
              </TouchableOpacity>
            </View>

            <CustomInput
              label="Category Name *"
              value={formName}
              onChangeText={setFormName}
              placeholder="e.g. Aerial Shells, Fountains, Rockets"
            />

            <CustomInput
              label="Category Description *"
              value={formDescription}
              onChangeText={setFormDescription}
              placeholder="Brief description of the pyrotechnic products..."
              multiline
              numberOfLines={3}
            />

            <CustomInput
              label="Category Banner / Image URL *"
              value={formImageUrl}
              onChangeText={setFormImageUrl}
              placeholder="https://example.com/banner.png"
            />

            {/* Suggested Preset Image Selectors */}
            <Text style={styles.formSectionLabel}>Preset Category Image Themes</Text>
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.presetRow}
            >
              {SUGGESTED_IMAGE_PRESETS.map((preset) => (
                <TouchableOpacity
                  key={preset.name}
                  style={[
                    styles.presetChip,
                    formImageUrl === preset.url && styles.presetChipActive,
                  ]}
                  onPress={() => setFormImageUrl(preset.url)}
                >
                  <Text
                    style={[
                      styles.presetChipText,
                      formImageUrl === preset.url && styles.presetChipTextActive,
                    ]}
                  >
                    {preset.name}
                  </Text>
                </TouchableOpacity>
              ))}
            </ScrollView>

            {/* Visibility Toggle */}
            <View style={styles.switchRow}>
              <View>
                <Text style={styles.switchLabel}>Active in Customer Catalog</Text>
                <Text style={styles.switchSubtitle}>
                  Inactive categories are hidden from customer product listings.
                </Text>
              </View>
              <Switch
                value={formIsActive}
                onValueChange={setFormIsActive}
                trackColor={{ false: '#ccc', true: Colors.primaryContainer }}
                thumbColor={formIsActive ? Colors.primary : '#f4f3f4'}
              />
            </View>

            <View style={styles.modalActions}>
              <PrimaryButton
                title={
                  isSaving
                    ? 'Saving...'
                    : editingCategory
                    ? 'Update Category'
                    : 'Save & Publish Category'
                }
                onPress={handleSaveCategory}
                disabled={isSaving}
              />
            </View>
          </ScrollView>
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
  categoryCard: {
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
  categoryThumb: {
    width: 64,
    height: 64,
    borderRadius: BorderRadius.lg,
    backgroundColor: Colors.surfaceContainerLow,
  },
  categoryInfo: {
    flex: 1,
  },
  titleStatusRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  categoryTitle: {
    ...Typography.titleLg,
    fontSize: 14,
    fontFamily: 'Inter-Bold',
    color: Colors.onSurface,
    flex: 1,
  },
  statusBadge: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: BorderRadius.sm,
  },
  statusBadgeActive: {
    backgroundColor: '#E8F5E9',
  },
  statusBadgeInactive: {
    backgroundColor: '#FFEBEE',
  },
  statusBadgeText: {
    ...Typography.labelLg,
    fontSize: 10,
    fontFamily: 'Inter-Bold',
  },
  statusTextActive: {
    color: '#2E7D32',
  },
  statusTextInactive: {
    color: '#D32F2F',
  },
  categoryDescription: {
    ...Typography.bodyMd,
    fontSize: 11,
    color: Colors.tertiary,
    marginTop: 2,
  },
  imageSourceUrl: {
    ...Typography.bodyMd,
    fontSize: 10,
    color: Colors.onSurfaceVariant,
    marginTop: 2,
  },
  cardActions: {
    flexDirection: 'row',
    gap: 4,
  },
  toggleBtn: {
    padding: 8,
    backgroundColor: Colors.surfaceContainerLow,
    borderRadius: BorderRadius.lg,
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
    borderRadius: BorderRadius.xl,
    padding: Spacing.lg,
    elevation: 10,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: Spacing.sm,
  },
  modalTitle: {
    ...Typography.headlineLg,
    fontSize: 20,
    fontFamily: 'Inter-Bold',
    color: Colors.onSurface,
  },
  formSectionLabel: {
    ...Typography.labelLg,
    fontSize: 11,
    fontFamily: 'Inter-Bold',
    color: Colors.tertiary,
    marginTop: Spacing.xs,
    marginBottom: 4,
  },
  presetRow: {
    gap: Spacing.xs,
    marginBottom: Spacing.sm,
  },
  presetChip: {
    paddingHorizontal: Spacing.sm,
    paddingVertical: 4,
    borderRadius: BorderRadius.full,
    backgroundColor: Colors.surfaceContainerLow,
    borderWidth: 1,
    borderColor: Colors.surfaceContainerHigh,
  },
  presetChipActive: {
    backgroundColor: Colors.primaryContainer,
    borderColor: Colors.primary,
  },
  presetChipText: {
    ...Typography.labelLg,
    fontSize: 10,
    color: Colors.onSurfaceVariant,
  },
  presetChipTextActive: {
    color: Colors.onPrimaryContainer,
    fontFamily: 'Inter-Bold',
  },
  switchRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: Colors.surfaceContainerLow,
    borderRadius: BorderRadius.lg,
    padding: Spacing.sm,
    marginVertical: Spacing.xs,
  },
  switchLabel: {
    ...Typography.bodyMd,
    fontSize: 13,
    fontFamily: 'Inter-Bold',
    color: Colors.onSurface,
  },
  switchSubtitle: {
    ...Typography.bodyMd,
    fontSize: 10,
    color: Colors.tertiary,
    marginTop: 2,
    maxWidth: 220,
  },
  modalActions: {
    marginTop: Spacing.md,
  },
});

export default CategoryManagementScreen;
