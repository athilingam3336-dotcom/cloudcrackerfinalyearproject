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
];

export const ADMIN_SCREENS = [
  'AdminDashboard',
  'ProductManagement',
  'CategoryManagement',
  'UserManagement',
  'InventoryManagement',
  'OrderManagement',
  'CouponManagement',
  'AboutManagement',
];

export const useSmartTabNavigation = () => {
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const route = useRoute();

  // Automatically record active profile sub-screen whenever user visits one (excluding Admin screens)
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

        // If currently on an Admin screen, clear saved profile screen and go directly to main UserProfile overview
        if (ADMIN_SCREENS.includes(currentRouteName)) {
          useProductStore.getState().setLastProfileScreen(null);
          navigation.navigate('UserProfile');
          return;
        }

        if (currentRouteName === 'UserProfile') {
          if (savedProfileScreen?.routeName && !ADMIN_SCREENS.includes(savedProfileScreen.routeName)) {
            navigation.navigate(
              savedProfileScreen.routeName as any,
              savedProfileScreen.params
            );
          } else {
            useProductStore.getState().setLastProfileScreen(null);
            navigation.navigate('UserProfile');
          }
        } else if (PROFILE_SUB_SCREENS.includes(currentRouteName)) {
          // Click when on a profile sub-screen returns to main UserProfile overview
          useProductStore.getState().setLastProfileScreen(null);
          navigation.navigate('UserProfile');
        } else if (savedProfileScreen?.routeName && !ADMIN_SCREENS.includes(savedProfileScreen.routeName)) {
          // Coming from another main tab -> return to active profile sub-screen if valid
          navigation.navigate(
            savedProfileScreen.routeName as any,
            savedProfileScreen.params
          );
        } else {
          useProductStore.getState().setLastProfileScreen(null);
          navigation.navigate('UserProfile');
        }
      }
    },
    [navigation, route]
  );

  return { handleTabPress };
};

export default useSmartTabNavigation;
