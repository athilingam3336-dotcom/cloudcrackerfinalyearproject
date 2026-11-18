import React, { useEffect } from 'react';
import { View, Text, Image, StyleSheet, Dimensions, Platform } from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  withRepeat,
  withSequence,
  interpolate,
} from 'react-native-reanimated';
import { GestureDetector, Gesture } from 'react-native-gesture-handler';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { RootStackParamList } from '@/navigation/types';
import { LOCAL_PRODUCT_IMAGES } from '@/constants/productImages';
import { tokenStorage } from '@/storage/tokenStorage';
import { useAuthStore } from '@/store/authStore';
import { GoldenTrailAnimation } from './GoldenTrailAnimation';

const { width, height } = Dimensions.get('window');

type SplashScreenProps = NativeStackScreenProps<RootStackParamList, 'Splash'>;

export const SplashScreen: React.FC<SplashScreenProps> = ({ navigation }) => {
  const glow = useSharedValue(0);
  const rotateX = useSharedValue(0);
  const rotateY = useSharedValue(0);

  useEffect(() => {
    // 1. Start the glowing loop for the 3D text/logo
    glow.value = withRepeat(
      withSequence(
        withTiming(1, { duration: 1200 }),
        withTiming(0.4, { duration: 1200 })
      ),
      -1,
      true
    );

    // 2. Navigation Transition Timeout with Session Check
    const timer = setTimeout(async () => {
      try {
        const token = await tokenStorage.getAccessToken();
        const { user, isAuthenticated } = useAuthStore.getState();

        if (token && isAuthenticated && user) {
          if (user.role === 'admin') {
            navigation.replace('AdminDashboard');
          } else {
            navigation.replace('Home');
          }
        } else {
          navigation.replace('Welcome');
        }
      } catch (e) {
        navigation.replace('Welcome');
      }
    }, 4500); // Redirects after 4.5 seconds

    return () => clearTimeout(timer);
  }, []);

  // 3D tilt on card using pan gesture
  const gesture = Gesture.Pan()
    .onUpdate((e) => {
      rotateY.value = interpolate(e.x, [0, width], [-15, 15]);
      rotateX.value = interpolate(e.y, [0, 300], [15, -15]);
    })
    .onEnd(() => {
      rotateX.value = withTiming(0);
      rotateY.value = withTiming(0);
    });

  const logoGlowStyle = useAnimatedStyle(() => ({
    shadowOpacity: glow.value,
    shadowRadius: 20 + glow.value * 20,
  }));

  const cardStyle = useAnimatedStyle(() => ({
    transform: [
      { perspective: 800 },
      { rotateX: `${rotateX.value}deg` },
      { rotateY: `${rotateY.value}deg` },
    ],
  }));

  return (
    <View style={styles.container}>
      {/* 1. Fullscreen Background Image (Vijay & Samantha Diwali Image) */}
      <Image
        source={LOCAL_PRODUCT_IMAGES.THERI_DIWALI}
        style={StyleSheet.absoluteFill}
        resizeMode="cover"
      />
      {/* Dark Dim Overlay */}
      <View style={styles.backgroundDimOverlay} />

      {/* 2. Sleek Golden Light Trail Background Layer */}
      <GoldenTrailAnimation />

      {/* 3. Foreground Reanimated Content */}
      <View style={styles.contentContainer} pointerEvents="box-none">
        {/* Parallax background dots - simulate depth (Native only) */}
        {Platform.OS !== 'web' && (
          <>
            <View style={styles.starsFar} pointerEvents="none" />
            <View style={styles.starsNear} pointerEvents="none" />
          </>
        )}

        {/* Glowing 3D Logo */}
        <Animated.View style={[styles.logoWrapper, logoGlowStyle]}>
          <Image
            source={LOCAL_PRODUCT_IMAGES.LOGO}
            style={styles.logo}
          />
        </Animated.View>

        {/* Embossed 3D Text */}
        <View style={styles.titleContainer}>
          <Text style={styles.titleShadow}>Meera Crackers</Text>
          <Text style={styles.title}>Meera Crackers</Text>
        </View>
        <Text style={styles.subtitle}>
          Happy & Safety Guarantee • Wholesale & Retailer
        </Text>

        {/* 3D Tilt Image Card */}
        <GestureDetector gesture={gesture}>
          <Animated.View style={[styles.card, cardStyle]}>
            <View style={styles.cardBorder}>
              <Image
                source={LOCAL_PRODUCT_IMAGES.THERI_DIWALI}
                style={styles.cardImage}
              />
            </View>
          </Animated.View>
        </GestureDetector>
      </View>
    </View>
  );
};

export default SplashScreen;

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0d0d0d',
    alignItems: 'center',
    justifyContent: 'center',
    ...(Platform.OS === 'web'
      ? ({
          minHeight: '100vh',
          width: '100%',
          overflow: 'hidden',
        } as any)
      : {}),
  },
  backgroundDimOverlay: {
    ...StyleSheet.absoluteFill,
    backgroundColor: 'rgba(13, 13, 13, 0.65)',
  },
  contentContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    width: '100%',
    height: '100%',
    zIndex: 10,
  },
  starsFar: {
    position: 'absolute',
    width: '100%',
    height: '100%',
    opacity: 0.3,
  },
  starsNear: {
    position: 'absolute',
    width: '100%',
    height: '100%',
    opacity: 0.6,
  },
  logoWrapper: {
    shadowColor: '#FFD700',
    shadowOffset: { width: 0, height: 0 },
    elevation: 20,
    marginBottom: 20,
    backgroundColor: 'transparent', // Added to ensure shadow appears on Android
    borderRadius: 80,
  },
  logo: {
    width: 160,
    height: 160,
    borderRadius: 80,
    borderWidth: 2,
    borderColor: '#FFD700',
  },
  titleContainer: {
    position: 'relative',
    height: 45,
    marginBottom: 5,
  },
  titleShadow: {
    position: 'absolute',
    fontSize: 34,
    fontWeight: 'bold',
    color: '#000',
    top: 2,
    left: 2,
  },
  title: {
    fontSize: 34,
    fontWeight: 'bold',
    color: '#fff',
    textShadowColor: '#FFD700',
    textShadowOffset: { width: -1, height: -1 },
    textShadowRadius: 4,
  },
  subtitle: {
    color: '#ccc',
    fontSize: 13,
    marginBottom: 30,
  },
  card: {
    width: Math.min(width * 0.85, 400),
    height: 220,
  },
  cardBorder: {
    flex: 1,
    padding: 3,
    borderRadius: 12,
    backgroundColor: '#FFD700', // Replacing LinearGradient with solid color
  },
  cardImage: {
    flex: 1,
    borderRadius: 10,
    width: '100%',
    height: '100%',
  },
});
