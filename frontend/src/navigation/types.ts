import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { RouteProp, NavigatorScreenParams } from '@react-navigation/native';

// Auth Stack Param List
export type AuthStackParamList = {
  Welcome: undefined;
  Login: undefined;
  Register: undefined;
  ForgotPassword: undefined;
};

// App Main Stack Param List
export type AppStackParamList = {
  Home: undefined;
  Categories: undefined;
  ProductListing: { categoryId?: string; query?: string } | undefined;
  ProductDetails: { productId?: string } | undefined;
  ProductDetailsVariant: { productId?: string } | undefined;
  Cart: undefined;
  Wishlist: undefined;
  Checkout: undefined;
  OrderSuccess:
    | {
        orderId?: string;
        orderNumber?: string;
        paymentId?: string;
        amountPaid?: number;
        paymentStatus?: string;
        shippingAddress?: string;
        items?: any[];
      }
    | undefined;
  UserProfile: undefined;
  EditProfile: undefined;
  OrderHistory: undefined;
  OrderDetails: { orderId?: string } | undefined;
  Notifications: undefined;
  Settings: undefined;
  AdminDashboard: undefined;
  ProductManagement: undefined;
  CategoryManagement: undefined;
  InventoryManagement: undefined;
  CouponManagement: undefined;
  UserManagement: undefined;
  OrderManagement: undefined;
  AboutManagement: undefined;
};

// Combined Root Stack Param List
export type RootStackParamList = {
  Splash: undefined;
  Auth: NavigatorScreenParams<AuthStackParamList>;
  App: NavigatorScreenParams<AppStackParamList>;
  // Direct shortcut access to screens
  Welcome: undefined;
  Login: undefined;
  Register: undefined;
  ForgotPassword: undefined;
  Home: undefined;
  Categories: undefined;
  ProductListing: { categoryId?: string; query?: string } | undefined;
  ProductDetails: { productId?: string } | undefined;
  ProductDetailsVariant: { productId?: string } | undefined;
  Cart: undefined;
  Wishlist: undefined;
  Checkout: undefined;
  OrderSuccess:
    | {
        orderId?: string;
        orderNumber?: string;
        paymentId?: string;
        amountPaid?: number;
        paymentStatus?: string;
        shippingAddress?: string;
        items?: any[];
      }
    | undefined;
  UserProfile: undefined;
  EditProfile: undefined;
  OrderHistory: undefined;
  OrderDetails: { orderId?: string } | undefined;
  Notifications: undefined;
  Settings: undefined;
  AdminDashboard: undefined;
  ProductManagement: undefined;
  CategoryManagement: undefined;
  InventoryManagement: undefined;
  CouponManagement: undefined;
  UserManagement: undefined;
  OrderManagement: undefined;
  AboutManagement: undefined;
};

export type NavigationProp<T extends keyof RootStackParamList> = NativeStackNavigationProp<
  RootStackParamList,
  T
>;

export type ScreenRouteProp<T extends keyof RootStackParamList> = RouteProp<
  RootStackParamList,
  T
>;

declare global {
  namespace ReactNavigation {
    interface RootParamList extends RootStackParamList {}
  }
}
