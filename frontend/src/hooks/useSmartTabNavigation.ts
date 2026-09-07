import { useCallback, useEffect } from 'react';
import { useNavigation, useRoute } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { RootStackParamList } from '@/navigation/types';
import { TabRoute } from '@/components/common/BottomNavBar';
import { useProductStore } from '@/store/productStore';

export const PROFILE_SUB_SCREENS = [
  'OrderHistory',
  'OrderDetails',
  'EditProfile',
  'Settings',
  'AdminDashboard',
  'ProductManagement',
  'CategoryManagement',
  'UserManagement',
  'InventoryManagement',
  'OrderManagement',
  'CouponManagement',
];

export const useSmartTabNavigation = () => {
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const route = useRoute();

  // Automatically record active profile sub-screen whenever user visits one
  useEffect(() => {
    if (PROFILE_SUB_SCREENS.includes(route.name)) {
      useProductStore.getState().setLastProfileScreen({
        routeName: route.name,
        params: route.params,
      });
    }
  }, [route.name, route.params]);

  const handleTabPress = useCallback(
    (tab: TabRoute) => {
      if (tab === 'Home') {
        navigation.navigate('Home');
      } else if (tab === 'Categories') {
        navigation.navigate('Categories');
      } else if (tab === 'Cart') {
        navigation.navigate('Cart');
      } else if (tab === 'Wishlist') {
        navigation.navigate('Wishlist');
      } else if (tab === 'Profile') {
        const currentRouteName = route.name;
        const savedProfileScreen = useProductStore.getState().lastProfileScreen;

        if (currentRouteName === 'UserProfile') {
          if (savedProfileScreen?.routeName) {
            navigation.navigate(
              savedProfileScreen.routeName as any,
              savedProfileScreen.params
            );
          } else {
            navigation.navigate('UserProfile');
          }
        } else if (PROFILE_SUB_SCREENS.includes(currentRouteName)) {
          // Second click when already on a profile sub-screen returns to main UserProfile overview
          navigation.navigate('UserProfile');
        } else if (savedProfileScreen?.routeName) {
          // Coming from another main tab -> return directly to exact active profile sub-screen
          navigation.navigate(
            savedProfileScreen.routeName as any,
            savedProfileScreen.params
          );
        } else {
          navigation.navigate('UserProfile');
        }
      }
    },
    [navigation, route]
  );

  return { handleTabPress };
};

export default useSmartTabNavigation;
