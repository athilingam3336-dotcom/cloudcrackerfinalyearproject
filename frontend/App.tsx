import React from 'react';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { NavigationContainer } from '@react-navigation/native';
import {
  useFonts,
  Inter_400Regular,
  Inter_500Medium,
  Inter_600SemiBold,
  Inter_700Bold,
} from '@expo-google-fonts/inter';
import { MaterialIcons } from '@expo/vector-icons';
import { RootNavigator } from '@/navigation/RootNavigator';
import { LoadingSpinner } from '@/components/loaders/LoadingSpinner';
import { RazorpayWebViewCheckout } from '@/components/payment/RazorpayWebViewCheckout';

export default function App() {
  const [fontsLoaded] = useFonts({
    'Inter-Regular': Inter_400Regular,
    'Inter-Medium': Inter_500Medium,
    'Inter-SemiBold': Inter_600SemiBold,
    'Inter-Bold': Inter_700Bold,
    ...MaterialIcons.font,
  });

  if (!fontsLoaded) {
    return <LoadingSpinner message="Initializing CloudCrackers..." />;
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
