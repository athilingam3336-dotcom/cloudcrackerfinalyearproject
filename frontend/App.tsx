import React, { useEffect } from 'react';
import { StatusBar } from 'expo-status-bar';
import { Platform } from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { NavigationContainer } from '@react-navigation/native';
import {
  useFonts,
  Inter_400Regular,
  Inter_500Medium,
  Inter_600SemiBold,
  Inter_700Bold,
} from '@expo-google-fonts/inter';
import { Cinzel_700Bold, Cinzel_800ExtraBold } from '@expo-google-fonts/cinzel';
import { Outfit_500Medium, Outfit_600SemiBold, Outfit_700Bold } from '@expo-google-fonts/outfit';
import { PlayfairDisplay_700Bold, PlayfairDisplay_700Bold_Italic } from '@expo-google-fonts/playfair-display';
import { MaterialIcons } from '@expo/vector-icons';
import { RootNavigator } from '@/navigation/RootNavigator';
import { LoadingSpinner } from '@/components/loaders/LoadingSpinner';
import { RazorpayWebViewCheckout } from '@/components/payment/RazorpayWebViewCheckout';
import { PyrotechnicEffectOverlay } from '@/components/effects/PyrotechnicEffectOverlay';

import { useUiStore } from '@/store';

const linking = {
  prefixes: [
    'cloudcrackers://',
    'https://cloudcrackerfinalyearproject-1.onrender.com',
    'https://cloudcrackerfinalyearproject.onrender.com',
  ],
  config: {
    screens: {
      Home: 'Home',
      Categories: 'Categories',
      ProductListing: 'ProductListing',
      ProductDetails: 'ProductDetails',
      ProductDetailsVariant: 'ProductDetailsVariant',
      Cart: 'Cart',
      Wishlist: 'Wishlist',
      Checkout: 'Checkout',
      OrderSuccess: 'OrderSuccess',
      UserProfile: 'UserProfile',
      EditProfile: 'EditProfile',
      OrderHistory: 'OrderHistory',
      OrderDetails: 'OrderDetails',
      Notifications: 'Notifications',
      Settings: 'Settings',
      AdminDashboard: 'AdminDashboard',
      Login: 'login',
      Register: 'register',
    },
  },
};

function ThemeAppController({ children }: { children: React.ReactNode }) {
  const isDarkMode = useUiStore((state) => state.isDarkMode);

  useEffect(() => {
    if (Platform.OS === 'web' && typeof document !== 'undefined') {
      const themeCssId = 'app-dynamic-theme';
      let styleEl = document.getElementById(themeCssId) as HTMLStyleElement | null;
      if (!styleEl) {
        styleEl = document.createElement('style');
        styleEl.id = themeCssId;
        document.head.appendChild(styleEl);
      }

      if (isDarkMode) {
        styleEl.textContent = `
          html, body, #root {
            background-color: #121316 !important;
            color: #f3f4f6 !important;
          }
          div[style*="background-color: rgb(248, 249, 250)"],
          div[style*="background-color: #f8f9fa"],
          div[style*="background-color: rgb(255, 255, 255)"],
          div[style*="background-color: #ffffff"] {
            background-color: #1c1d22 !important;
          }
          div[style*="background-color: rgb(243, 244, 245)"],
          div[style*="background-color: #f3f4f5"],
          div[style*="background-color: rgb(237, 238, 239)"],
          div[style*="background-color: #edeeef"] {
            background-color: #24252a !important;
          }
          div[style*="color: rgb(25, 28, 29)"],
          div[style*="color: #191c1d"],
          span[style*="color: rgb(25, 28, 29)"],
          span[style*="color: #191c1d"] {
            color: #f3f4f6 !important;
          }
          div[style*="color: rgb(91, 92, 96)"],
          div[style*="color: #5b5c60"],
          div[style*="color: rgb(91, 64, 63)"] {
            color: #9ca3af !important;
          }
          div[style*="border-color: rgb(231, 232, 233)"],
          div[style*="border-color: #e7e8e9"],
          div[style*="border-color: rgb(226, 232, 240)"] {
            border-color: #33343c !important;
          }
        `;
      } else {
        styleEl.textContent = `
          html, body, #root {
            background-color: #f8f9fa !important;
            color: #191c1d !important;
          }
        `;
      }
    }
  }, [isDarkMode]);

  return <>{children}</>;
}

export default function App() {
  const isDarkMode = useUiStore((state) => state.isDarkMode);

  useEffect(() => {
    if (Platform.OS === 'web' && typeof document !== 'undefined') {
      // 1. Enforce browser tab title to Meera Crackers across all navigation route changes
      const brandDocTitle = 'Meera Crackers - Premium Fireworks & Pyrotechnics Store';
      document.title = brandDocTitle;
      const titleObserver = new MutationObserver(() => {
        if (document.title !== brandDocTitle) {
          document.title = brandDocTitle;
        }
      });
      const titleNode = document.querySelector('title');
      if (titleNode) {
        titleObserver.observe(titleNode, { childList: true, characterData: true, subtree: true });
      }

      // 2. Ensure responsive viewport meta tag for mobile browsers (Chrome, Safari iOS, Samsung Internet, Firefox)
      let metaViewport = document.querySelector('meta[name="viewport"]');
      if (!metaViewport) {
        metaViewport = document.createElement('meta');
        metaViewport.setAttribute('name', 'viewport');
        document.head.appendChild(metaViewport);
      }
      metaViewport.setAttribute(
        'content',
        'width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no, viewport-fit=cover'
      );

      // 3. Load custom Web typography
      const fontId = 'google-fonts-stylish-crackers';
      if (!document.getElementById(fontId)) {
        const link = document.createElement('link');
        link.id = fontId;
        link.rel = 'stylesheet';
        link.href =
          'https://fonts.googleapis.com/css2?family=Cinzel+Decorative:wght@700;900&family=Cinzel:wght@700;800;900&family=Outfit:wght@500;600;700;800&family=Playfair+Display:ital,wght@0,700;1,600&family=Poppins:wght@500;600;700;800&display=swap';
        document.head.appendChild(link);
      }

      // 3. Global CSS Reset for consistent cross-browser mobile layout & typography
      const cssId = 'cross-browser-mobile-reset';
      let styleEl = document.getElementById(cssId) as HTMLStyleElement | null;
      if (!styleEl) {
        styleEl = document.createElement('style');
        styleEl.id = cssId;
        document.head.appendChild(styleEl);
      }
      styleEl.textContent = `
        * {
          box-sizing: border-box !important;
          -webkit-tap-highlight-color: transparent;
        }
        html, body, #root {
          width: 100% !important;
          max-width: 100vw !important;
          margin: 0 !important;
          padding: 0 !important;
          overflow-x: hidden !important;
          -webkit-text-size-adjust: 100% !important;
          text-size-adjust: 100% !important;
        }
        input, textarea, select {
          max-width: 100% !important;
        }
        ::-webkit-scrollbar {
          display: none !important;
        }
        * {
          -ms-overflow-style: none !important;
          scrollbar-width: none !important;
        }
      `;
    }
  }, []);

  const [fontsLoaded] = useFonts({
    'Inter-Regular': Inter_400Regular,
    'Inter-Medium': Inter_500Medium,
    'Inter-SemiBold': Inter_600SemiBold,
    'Inter-Bold': Inter_700Bold,
    'Cinzel-Bold': Cinzel_700Bold,
    'Cinzel-ExtraBold': Cinzel_800ExtraBold,
    'Outfit-Medium': Outfit_500Medium,
    'Outfit-SemiBold': Outfit_600SemiBold,
    'Outfit-Bold': Outfit_700Bold,
    'Playfair-Bold': PlayfairDisplay_700Bold,
    'Playfair-BoldItalic': PlayfairDisplay_700Bold_Italic,
    ...MaterialIcons.font,
  });

  if (!fontsLoaded) {
    return <LoadingSpinner message="Initializing Meera Crackers..." />;
  }

  return (
    <SafeAreaProvider>
      <ThemeAppController>
        <NavigationContainer linking={linking}>
          <StatusBar style={isDarkMode ? 'light' : 'dark'} />
          <RootNavigator />
          <RazorpayWebViewCheckout />
          <PyrotechnicEffectOverlay />
        </NavigationContainer>
      </ThemeAppController>
    </SafeAreaProvider>
  );
}
