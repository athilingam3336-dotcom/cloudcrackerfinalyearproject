import React from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { AppStackParamList } from './types';

// App Screens
import HomeScreen from '@/screens/Home/HomeScreen';
import CategoriesScreen from '@/screens/Home/CategoriesScreen';
import ProductListingScreen from '@/screens/Product/ProductListingScreen';
import ProductDetailsScreen from '@/screens/Product/ProductDetailsScreen';
import ProductDetailsVariantScreen from '@/screens/Product/ProductDetailsVariantScreen';
import CartScreen from '@/screens/Cart/CartScreen';
import WishlistScreen from '@/screens/Wishlist/WishlistScreen';
import CheckoutScreen from '@/screens/Checkout/CheckoutScreen';
import OrderSuccessScreen from '@/screens/Checkout/OrderSuccessScreen';
import UserProfileScreen from '@/screens/Profile/UserProfileScreen';
import EditProfileScreen from '@/screens/Profile/EditProfileScreen';
import OrderHistoryScreen from '@/screens/Profile/OrderHistoryScreen';
import OrderDetailsScreen from '@/screens/Profile/OrderDetailsScreen';
import NotificationsScreen from '@/screens/Profile/NotificationsScreen';
import SettingsScreen from '@/screens/Profile/SettingsScreen';
import AdminDashboardScreen from '@/screens/Admin/AdminDashboardScreen';
import ProductManagementScreen from '@/screens/Admin/ProductManagementScreen';
import CategoryManagementScreen from '@/screens/Admin/CategoryManagementScreen';
import InventoryManagementScreen from '@/screens/Admin/InventoryManagementScreen';
import CouponManagementScreen from '@/screens/Admin/CouponManagementScreen';
import UserManagementScreen from '@/screens/Admin/UserManagementScreen';
import OrderManagementScreen from '@/screens/Admin/OrderManagementScreen';
import AboutManagementScreen from '@/screens/Admin/AboutManagementScreen';

const AppStack = createNativeStackNavigator<AppStackParamList>();

export const AppNavigator: React.FC = () => {
  return (
    <AppStack.Navigator
      initialRouteName="Home"
      screenOptions={{
        headerShown: false,
        animation: 'slide_from_right',
      }}
    >
      <AppStack.Screen name="Home" component={HomeScreen} />
      <AppStack.Screen name="Categories" component={CategoriesScreen} />
      <AppStack.Screen name="ProductListing" component={ProductListingScreen} />
      <AppStack.Screen name="ProductDetails" component={ProductDetailsScreen} />
      <AppStack.Screen name="ProductDetailsVariant" component={ProductDetailsVariantScreen} />
      <AppStack.Screen name="Cart" component={CartScreen} />
      <AppStack.Screen name="Wishlist" component={WishlistScreen} />
      <AppStack.Screen name="Checkout" component={CheckoutScreen} />
      <AppStack.Screen name="OrderSuccess" component={OrderSuccessScreen} />
      <AppStack.Screen name="UserProfile" component={UserProfileScreen} />
      <AppStack.Screen name="EditProfile" component={EditProfileScreen} />
      <AppStack.Screen name="OrderHistory" component={OrderHistoryScreen} />
      <AppStack.Screen name="OrderDetails" component={OrderDetailsScreen} />
      <AppStack.Screen name="Notifications" component={NotificationsScreen} />
      <AppStack.Screen name="Settings" component={SettingsScreen} />
      <AppStack.Screen name="AdminDashboard" component={AdminDashboardScreen} />
      <AppStack.Screen name="ProductManagement" component={ProductManagementScreen} />
      <AppStack.Screen name="CategoryManagement" component={CategoryManagementScreen} />
      <AppStack.Screen name="InventoryManagement" component={InventoryManagementScreen} />
      <AppStack.Screen name="CouponManagement" component={CouponManagementScreen} />
      <AppStack.Screen name="UserManagement" component={UserManagementScreen} />
      <AppStack.Screen name="OrderManagement" component={OrderManagementScreen} />
      <AppStack.Screen name="AboutManagement" component={AboutManagementScreen} />
    </AppStack.Navigator>
  );
};

export default AppNavigator;

