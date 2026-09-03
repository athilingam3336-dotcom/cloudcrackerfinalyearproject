import { useCallback } from 'react';
import { useNavigation, useRoute } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { RootStackParamList } from '@/navigation/types';
import { TabRoute } from '@/components/common/BottomNavBar';
import { useProductStore } from '@/store/productStore';

export const useSmartTabNavigation = () => {
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const route = useRoute();

  const handleTabPress = useCallback(
    (tab: TabRoute) => {
      const currentRouteName = route.name;

      if (tab === 'Home') {
        if (currentRouteName !== 'Home') {
          navigation.navigate('Home');
        }
      } else if (tab === 'Categories') {
        const savedCategoryId = useProductStore.getState().listingState.categoryId || useProductStore.getState().selectedCategory;

        if (currentRouteName === 'ProductListing') {
          // If already on ProductListing screen, second click takes user to main Categories overview
          navigation.navigate('Categories');
        } else if (savedCategoryId && savedCategoryId !== 'all') {
          // Smart Navigation: Return to exact active product category (e.g. Ground Chakkars)
          navigation.navigate('ProductListing', { categoryId: savedCategoryId });
        } else {
          navigation.navigate('Categories');
        }
      } else if (tab === 'Cart') {
        if (currentRouteName !== 'Cart') {
          navigation.navigate('Cart');
        }
      } else if (tab === 'Wishlist') {
        if (currentRouteName !== 'Wishlist') {
          navigation.navigate('Wishlist');
        }
      } else if (tab === 'Profile') {
        if (currentRouteName !== 'UserProfile') {
          navigation.navigate('UserProfile');
        }
      }
    },
    [navigation, route]
  );

  return { handleTabPress };
};

export default useSmartTabNavigation;
