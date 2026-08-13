import React from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { RootStackParamList } from './types';

// Root Screens & Sub-Navigators
import SplashScreen from '@/screens/Splash/SplashScreen';
import AuthNavigator from './AuthNavigator';
import AppNavigator from './AppNavigator';

// Direct Screen Imports for Shortcut Navigation
import WelcomeScreen from '@/screens/Authentication/WelcomeScreen';
import LoginScreen from '@/screens/Authentication/LoginScreen';
import RegisterScreen from '@/screens/Authentication/RegisterScreen';
import ForgotPasswordScreen from '@/screens/Authentication/ForgotPasswordScreen';
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

const RootStack = createNativeStackNavigator<RootStackParamList>();

export const RootNavigator: React.FC = () => {
  return (
    <RootStack.Navigator
      initialRouteName="Splash"
      screenOptions={{
        headerShown: false,
        animation: 'slide_from_right',
      }}
    >
      {/* Primary Root Stacks */}
      <RootStack.Screen name="Splash" component={SplashScreen} />
      <RootStack.Screen name="Auth" component={AuthNavigator} />
      <RootStack.Screen name="App" component={AppNavigator} />

      {/* Direct Screen Registrations */}
      <RootStack.Screen name="Welcome" component={WelcomeScreen} />
      <RootStack.Screen name="Login" component={LoginScreen} />
      <RootStack.Screen name="Register" component={RegisterScreen} />
      <RootStack.Screen name="ForgotPassword" component={ForgotPasswordScreen} />
      <RootStack.Screen name="Home" component={HomeScreen} />
      <RootStack.Screen name="Categories" component={CategoriesScreen} />
      <RootStack.Screen name="ProductListing" component={ProductListingScreen} />
      <RootStack.Screen name="ProductDetails" component={ProductDetailsScreen} />
      <RootStack.Screen name="ProductDetailsVariant" component={ProductDetailsVariantScreen} />
      <RootStack.Screen name="Cart" component={CartScreen} />
      <RootStack.Screen name="Wishlist" component={WishlistScreen} />
      <RootStack.Screen name="Checkout" component={CheckoutScreen} />
      <RootStack.Screen name="OrderSuccess" component={OrderSuccessScreen} />
      <RootStack.Screen name="UserProfile" component={UserProfileScreen} />
      <RootStack.Screen name="EditProfile" component={EditProfileScreen} />
      <RootStack.Screen name="OrderHistory" component={OrderHistoryScreen} />
      <RootStack.Screen name="OrderDetails" component={OrderDetailsScreen} />
      <RootStack.Screen name="Notifications" component={NotificationsScreen} />
      <RootStack.Screen name="Settings" component={SettingsScreen} />
      <RootStack.Screen name="AdminDashboard" component={AdminDashboardScreen} />
      <RootStack.Screen name="ProductManagement" component={ProductManagementScreen} />
      <RootStack.Screen name="CategoryManagement" component={CategoryManagementScreen} />
      <RootStack.Screen name="InventoryManagement" component={InventoryManagementScreen} />
      <RootStack.Screen name="CouponManagement" component={CouponManagementScreen} />
      <RootStack.Screen name="UserManagement" component={UserManagementScreen} />
      <RootStack.Screen name="OrderManagement" component={OrderManagementScreen} />
      <RootStack.Screen name="AboutManagement" component={AboutManagementScreen} />
    </RootStack.Navigator>
  );
};

export default RootNavigator;

