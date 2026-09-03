import React, { useState, useCallback, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  Dimensions,
  ImageBackground,
  ListRenderItem,
  TouchableOpacity,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { MaterialIcons } from '@expo/vector-icons';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { Colors } from '@/constants/colors';
import { Typography } from '@/constants/typography';
import { Spacing, BorderRadius } from '@/constants/spacing';
import { HomeHeader } from '@/components/common/HomeHeader';
import { SearchBar } from '@/components/inputs/SearchBar';
import { CategoryGridCard } from '@/components/cards/CategoryGridCard';
import { BottomNavBar, TabRoute } from '@/components/common/BottomNavBar';
import { PrimaryButton } from '@/components/buttons/PrimaryButton';
import { LoadingSpinner } from '@/components/loaders/LoadingSpinner';
import { productService } from '@/services/productService';
import { useNotificationStore } from '@/store';
import { CategoryItem } from '@/constants/mockData';
import { RootStackParamList } from '@/navigation/types';
import { LOCAL_PRODUCT_IMAGES } from '@/constants/productImages';

type CategoriesScreenProps = NativeStackScreenProps<RootStackParamList, 'Categories'>;

const getNumColumns = (width: number) => {
  if (width >= 1024) return 5;
  if (width >= 768) return 4;
  if (width >= 600) return 3;
  return 2;
};

export const CategoriesScreen: React.FC<CategoriesScreenProps> = ({ navigation }) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedFilter, setSelectedFilter] = useState<'all' | 'morning' | 'night' | 'both'>('all');
  const [screenWidth, setScreenWidth] = useState(Dimensions.get('window').width);

  const [categories, setCategories] = useState<CategoryItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const unreadNotifs = useNotificationStore((state) => state.getUnreadCount());

  const numColumns = useMemo(() => getNumColumns(screenWidth), [screenWidth]);

  React.useEffect(() => {
    let isMounted = true;
    productService.getCategories(true).then((data) => {
      if (isMounted) {
        setCategories(data);
        setIsLoading(false);
      }
    });
    return () => {
      isMounted = false;
    };
  }, []);

  // Filter categories by search query and morning/night/both tags
  const filteredCategories = useMemo(() => {
    return categories.filter((cat) => {
      const matchesSearch =
        !searchQuery.trim() ||
        cat.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (cat.description && cat.description.toLowerCase().includes(searchQuery.toLowerCase()));

      const catName = cat.name.toLowerCase();

      let matchesFilter = true;
      if (selectedFilter === 'morning') {
        matchesFilter =
          catName.includes('sparkler') ||
          catName.includes('chakkar') ||
          catName.includes('bomb') ||
          catName.includes('bijili') ||
          catName.includes('sound') ||
          catName.includes('kid');
      } else if (selectedFilter === 'night') {
        matchesFilter =
          catName.includes('rocket') ||
          catName.includes('pot') ||
          catName.includes('fountain') ||
          catName.includes('aerial') ||
          catName.includes('shot') ||
          catName.includes('star') ||
          catName.includes('gift');
      } else if (selectedFilter === 'both') {
        matchesFilter =
          catName.includes('sparkler') ||
          catName.includes('chakkar') ||
          catName.includes('bomb') ||
          catName.includes('garland') ||
          catName.includes('combo') ||
          catName.includes('gift') ||
          catName.includes('kid') ||
          catName.includes('family');
      }

      return matchesSearch && matchesFilter;
    });
  }, [categories, searchQuery, selectedFilter]);

  // Navigation handlers
  const handleCategoryPress = useCallback(
    (categoryId: string) => {
      navigation.navigate('ProductListing', { categoryId });
    },
    [navigation]
  );

  const handleTabPress = useCallback(
    (tab: TabRoute) => {
      if (tab === 'Home') navigation.navigate('Home');
      else if (tab === 'Cart') navigation.navigate('Cart');
      else if (tab === 'Wishlist') navigation.navigate('Wishlist');
      else if (tab === 'Profile') navigation.navigate('UserProfile');
    },
    [navigation]
  );

  const handleEliteProgramPress = useCallback(() => {
    Alert.alert(
      'Meera Crackers Elite',
      'Unlock wholesale pyrotechnic pricing, seasonal priority access, and zero-fee shipping on bulk orders.'
    );
  }, []);

  // Render individual Category grid item
  const renderCategoryItem: ListRenderItem<CategoryItem> = useCallback(
    ({ item }) => (
      <View style={styles.gridColumn}>
        <CategoryGridCard
          category={item}
          onPress={() => handleCategoryPress(item.id)}
        />
      </View>
    ),
    [handleCategoryPress]
  );

  // List Header Component containing Header Bar, Search Bar, Hero Banner & Filter Chips
  const renderHeader = useMemo(() => {
    return (
      <View style={styles.headerWrapper}>
        {/* Top Header Bar */}
        <HomeHeader
          onBackPress={() => (navigation.canGoBack() ? navigation.goBack() : navigation.navigate('Home'))}
          onNotificationPress={() => navigation.navigate('Notifications')}
          onProfilePress={() => navigation.navigate('UserProfile')}
          onCartPress={() => navigation.navigate('Cart')}
          notificationCount={3}
        />

        {/* Search Bar */}
        <SearchBar
          value={searchQuery}
          onChangeText={setSearchQuery}
          onClear={() => setSearchQuery('')}
          placeholder="Search categories (e.g. rockets, sparklers)..."
        />

        {/* Filter Pills */}
        <View style={styles.filterBar}>
          <TouchableOpacity
            style={[styles.filterChip, selectedFilter === 'all' && styles.activeFilterChip]}
            onPress={() => setSelectedFilter('all')}
            activeOpacity={0.8}
          >
            <Text
              style={[
                styles.filterChipText,
                selectedFilter === 'all' && styles.activeFilterChipText,
              ]}
            >
              All Categories
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.filterChip, selectedFilter === 'morning' && styles.activeFilterChip]}
            onPress={() => setSelectedFilter('morning')}
            activeOpacity={0.8}
          >
            <Text
              style={[
                styles.filterChipText,
                selectedFilter === 'morning' && styles.activeFilterChipText,
              ]}
            >
              ☀️ Morning Crackers
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.filterChip, selectedFilter === 'night' && styles.activeFilterChip]}
            onPress={() => setSelectedFilter('night')}
            activeOpacity={0.8}
          >
            <Text
              style={[
                styles.filterChipText,
                selectedFilter === 'night' && styles.activeFilterChipText,
              ]}
            >
              🌙 Night Crackers
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.filterChip, selectedFilter === 'both' && styles.activeFilterChip]}
            onPress={() => setSelectedFilter('both')}
            activeOpacity={0.8}
          >
            <Text
              style={[
                styles.filterChipText,
                selectedFilter === 'both' && styles.activeFilterChipText,
              ]}
            >
              ✨ Both Day & Night
            </Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }, [searchQuery, selectedFilter, navigation]);

  return (
    <SafeAreaView style={styles.safeArea} edges={['top', 'left', 'right']}>
      <FlatList
        data={filteredCategories}
        key={numColumns}
        numColumns={numColumns}
        keyExtractor={(item) => item.id}
        renderItem={renderCategoryItem}
        ListHeaderComponent={renderHeader}
        columnWrapperStyle={styles.gridRow}
        contentContainerStyle={styles.listContent}
        showsVerticalScrollIndicator={false}
        initialNumToRender={8}
        maxToRenderPerBatch={12}
        windowSize={5}
      />

      {/* Bottom Navigation with Active Categories Tab */}
      <BottomNavBar activeTab="Categories" onTabPress={handleTabPress} />
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
  heroContainer: {
    marginHorizontal: Spacing.marginMobile,
    marginVertical: Spacing.sm,
    borderRadius: BorderRadius.xl,
    overflow: 'hidden',
  },
  inlineBackRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginBottom: Spacing.xs,
    paddingHorizontal: 4,
  },
  inlineBackText: {
    ...Typography.labelLg,
    fontSize: 13,
    fontFamily: 'Inter-Bold',
    color: Colors.primary,
  },
  heroBackground: {
    width: '100%',
    height: '100%',
    justifyContent: 'center',
    alignItems: 'center',
  },
  heroOverlay: {
    ...StyleSheet.absoluteFill,
    backgroundColor: 'rgba(0, 0, 0, 0.45)',
  },
  heroContent: {
    padding: Spacing.md,
    alignItems: 'center',
    zIndex: 10,
  },
  heroTitle: {
    ...Typography.headlineLg,
    fontSize: 26,
    fontFamily: 'Inter-Bold',
    color: '#ffffff',
    textAlign: 'center',
    marginBottom: 6,
  },
  heroSubtitle: {
    ...Typography.bodyLg,
    fontSize: 14,
    fontFamily: 'Inter-Regular',
    color: 'rgba(255, 255, 255, 0.9)',
    textAlign: 'center',
  },
  filterBar: {
    flexDirection: 'row',
    paddingHorizontal: Spacing.marginMobile,
    marginVertical: Spacing.xs,
    gap: Spacing.xs,
  },
  filterChip: {
    paddingHorizontal: Spacing.md,
    paddingVertical: 8,
    borderRadius: BorderRadius.full,
    backgroundColor: Colors.surfaceContainerLow,
    borderWidth: 1,
    borderColor: Colors.surfaceContainerHigh,
  },
  activeFilterChip: {
    backgroundColor: Colors.primaryContainer,
    borderColor: Colors.primaryContainer,
  },
  filterChipText: {
    ...Typography.bodyMd,
    fontSize: 13,
    fontFamily: 'Inter-Medium',
    color: Colors.onSurfaceVariant,
  },
  activeFilterChipText: {
    fontFamily: 'Inter-Bold',
    color: Colors.onPrimaryContainer,
  },
  gridRow: {
    paddingHorizontal: Spacing.marginMobile,
    gap: Spacing.sm,
  },
  gridColumn: {
    flex: 1,
  },
  footerWrapper: {
    paddingHorizontal: Spacing.marginMobile,
    marginTop: Spacing.lg,
    marginBottom: Spacing.md,
  },
  eliteCard: {
    backgroundColor: Colors.primary,
    borderRadius: BorderRadius.xl,
    padding: Spacing.lg,
    flexDirection: 'column',
    gap: Spacing.md,
  },
  eliteTextContent: {
    flex: 1,
  },
  eliteTitle: {
    ...Typography.headlineLg,
    fontSize: 22,
    fontFamily: 'Inter-Bold',
    color: Colors.onPrimary,
    marginBottom: Spacing.xs,
  },
  eliteSubtitle: {
    ...Typography.bodyMd,
    fontSize: 14,
    fontFamily: 'Inter-Regular',
    color: 'rgba(255, 255, 255, 0.9)',
    lineHeight: 20,
  },
  eliteCta: {
    alignSelf: 'flex-start',
    paddingHorizontal: Spacing.lg,
  },
});

export default CategoriesScreen;
