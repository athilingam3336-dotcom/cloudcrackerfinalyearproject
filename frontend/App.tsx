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

export default function App() {
  useEffect(() => {
    if (Platform.OS === 'web' && typeof document !== 'undefined') {
      const fontId = 'google-fonts-stylish-crackers';
      if (!document.getElementById(fontId)) {
        const link = document.createElement('link');
        link.id = fontId;
        link.rel = 'stylesheet';
        link.href = 'https://fonts.googleapis.com/css2?family=Cinzel:wght@700;800;900&family=Outfit:wght@500;600;700;800&family=Playfair+Display:ital,wght@0,700;1,600&family=Poppins:wght@500;600;700&display=swap';
        document.head.appendChild(link);
      }
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
      <NavigationContainer>
        <StatusBar style="light" />
        <RootNavigator />
        <RazorpayWebViewCheckout />
      </NavigationContainer>
    </SafeAreaProvider>
  );
}
