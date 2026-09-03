import React, { useEffect, useRef } from 'react';
import {
  View,
  Text,
  Image,
  StyleSheet,
  Animated,
  Easing,
  Dimensions,
} from 'react-native';
import { LOCAL_PRODUCT_IMAGES } from '@/constants/productImages';
import { MaterialIcons } from '@expo/vector-icons';
import { Colors } from '@/constants/colors';
import { Typography } from '@/constants/typography';
import { Spacing, BorderRadius } from '@/constants/spacing';
import { ParticleBackground } from '@/components/common/ParticleBackground';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { RootStackParamList } from '@/navigation/types';
import { tokenStorage } from '@/storage/tokenStorage';
import { useAuthStore } from '@/store/authStore';

type SplashScreenProps = NativeStackScreenProps<RootStackParamList, 'Splash'>;

const { width: SCREEN_WIDTH } = Dimensions.get('window');

export const SplashScreen: React.FC<SplashScreenProps> = ({ navigation }) => {
  // Animation values
  const sparkY = useRef(new Animated.Value(0)).current;
  const sparkScale = useRef(new Animated.Value(1)).current;
  const glowOpacity = useRef(new Animated.Value(0.2)).current;

  const titleFade = useRef(new Animated.Value(0)).current;
  const titleY = useRef(new Animated.Value(20)).current;

  const sloganFade = useRef(new Animated.Value(0)).current;
  const sloganY = useRef(new Animated.Value(20)).current;

  const loadingFade = useRef(new Animated.Value(0)).current;
  const loadingY = useRef(new Animated.Value(20)).current;

  const progressBarWidth = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    // 1. Spark Floating & Pulsing Glow Loop
    Animated.loop(
      Animated.sequence([
        Animated.parallel([
          Animated.timing(sparkY, {
            toValue: -10,
            duration: 1500,
            easing: Easing.inOut(Easing.ease),
            useNativeDriver: true,
          }),
          Animated.timing(sparkScale, {
            toValue: 1.06,
            duration: 1500,
            easing: Easing.inOut(Easing.ease),
            useNativeDriver: true,
          }),
          Animated.timing(glowOpacity, {
            toValue: 0.45,
            duration: 1500,
            easing: Easing.inOut(Easing.ease),
            useNativeDriver: true,
          }),
        ]),
        Animated.parallel([
          Animated.timing(sparkY, {
            toValue: 0,
            duration: 1500,
            easing: Easing.inOut(Easing.ease),
            useNativeDriver: true,
          }),
          Animated.timing(sparkScale, {
            toValue: 1,
            duration: 1500,
            easing: Easing.inOut(Easing.ease),
            useNativeDriver: true,
          }),
          Animated.timing(glowOpacity, {
            toValue: 0.2,
            duration: 1500,
            easing: Easing.inOut(Easing.ease),
            useNativeDriver: true,
          }),
        ]),
      ])
    ).start();

    // 2. Entrance Stagger Animations
    Animated.stagger(200, [
      // Title entrance
      Animated.parallel([
        Animated.timing(titleFade, {
          toValue: 1,
          duration: 800,
          useNativeDriver: true,
        }),
        Animated.timing(titleY, {
          toValue: 0,
          duration: 800,
          easing: Easing.out(Easing.quad),
          useNativeDriver: true,
        }),
      ]),
      // Slogan entrance
      Animated.parallel([
        Animated.timing(sloganFade, {
          toValue: 1,
          duration: 800,
          useNativeDriver: true,
        }),
        Animated.timing(sloganY, {
          toValue: 0,
          duration: 800,
          easing: Easing.out(Easing.quad),
          useNativeDriver: true,
        }),
      ]),
      // Loading section entrance
      Animated.parallel([
        Animated.timing(loadingFade, {
          toValue: 1,
          duration: 800,
          useNativeDriver: true,
        }),
        Animated.timing(loadingY, {
          toValue: 0,
          duration: 800,
          easing: Easing.out(Easing.quad),
          useNativeDriver: true,
        }),
      ]),
    ]).start();

    // 3. Smooth Progress Bar Fill Animation (cubic bezier matching Stitch CSS)
    Animated.timing(progressBarWidth, {
      toValue: 1,
      duration: 4000,
      easing: Easing.bezier(0.65, 0, 0.35, 1),
      useNativeDriver: false,
    }).start();

    // 4. Navigation Transition Timeout with Session & Role Auth Check (4.5 seconds)
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
    }, 4500);

    return () => clearTimeout(timer);
  }, [
    navigation,
    sparkY,
    sparkScale,
    glowOpacity,
    titleFade,
    titleY,
    sloganFade,
    sloganY,
    loadingFade,
    loadingY,
    progressBarWidth,
  ]);

  const progressInterpolate = progressBarWidth.interpolate({
    inputRange: [0, 1],
    outputRange: ['0%', '100%'],
  });

  return (
    <View style={styles.container}>
      {/* Background Atmospheric Particles */}
      <ParticleBackground />

      {/* Main Content Container */}
      <View style={styles.contentContainer}>
        {/* Stylized Firework Spark Logo */}
        <Animated.View
          style={[
            styles.sparkWrapper,
            {
              transform: [{ translateY: sparkY }, { scale: sparkScale }],
            },
          ]}
        >
          {/* Multi-layered Atmospheric Glow */}
          <Animated.View
            style={[
              styles.outerGlow,
              { opacity: glowOpacity },
            ]}
          />
          <View style={styles.innerGlow} />

          {/* Central Firework Shop Logo Image */}
          <View style={styles.iconCenter}>
            <Image
              source={LOCAL_PRODUCT_IMAGES.LOGO}
              style={styles.splashShopLogo}
              resizeMode="contain"
            />
          </View>
        </Animated.View>

        {/* Elegant Brand Name */}
        <Animated.Text
          style={[
            styles.brandTitle,
            {
              opacity: titleFade,
              transform: [{ translateY: titleY }],
            },
          ]}
        >
          Meera Crackers
        </Animated.Text>

        {/* Slogan */}
        <Animated.Text
          style={[
            styles.sloganText,
            {
              opacity: sloganFade,
              transform: [{ translateY: sloganY }],
            },
          ]}
        >
          Happy & Safety Guarantee • Wholesale & Retailer
        </Animated.Text>
      </View>

      {/* Loading Progress Section */}
      <Animated.View
        style={[
          styles.loadingContainer,
          {
            opacity: loadingFade,
            transform: [{ translateY: loadingY }],
          },
        ]}
      >
        <View style={styles.progressBarTrack}>
          <Animated.View
            style={[
              styles.progressBarFill,
              { width: progressInterpolate },
            ]}
          />
        </View>
        <Text style={styles.loadingText}>INITIALIZING</Text>
      </Animated.View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.splashBackground,
    alignItems: 'center',
    justifyContent: 'center',
  },
  contentContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: Spacing.marginMobile,
    zIndex: 10,
  },
  sparkWrapper: {
    marginBottom: Spacing.lg,
    alignItems: 'center',
    justifyContent: 'center',
    width: 120,
    height: 120,
  },
  outerGlow: {
    position: 'absolute',
    width: 110,
    height: 110,
    borderRadius: BorderRadius.full,
    backgroundColor: Colors.primaryContainer,
    shadowColor: Colors.primary,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.8,
    shadowRadius: 25,
  },
  innerGlow: {
    position: 'absolute',
    width: 70,
    height: 70,
    borderRadius: BorderRadius.full,
    backgroundColor: Colors.secondaryContainer,
    opacity: 0.25,
  },
  iconCenter: {
    position: 'relative',
    alignItems: 'center',
    justifyContent: 'center',
  },
  splashShopLogo: {
    width: 100,
    height: 100,
    borderRadius: 50,
  },
  brandTitle: {
    ...Typography.displayLg,
    fontFamily: 'Inter-Bold',
    color: '#ffffff',
    marginBottom: Spacing.xs,
    textAlign: 'center',
    fontSize: SCREEN_WIDTH < 380 ? 44 : 57,
    lineHeight: SCREEN_WIDTH < 380 ? 52 : 64,
  },
  sloganText: {
    ...Typography.bodyLg,
    fontFamily: 'Inter-Regular',
    color: 'rgba(255,255,255,0.6)',
    textAlign: 'center',
    maxWidth: 320,
  },
  loadingContainer: {
    position: 'absolute',
    bottom: Spacing.xl,
    width: 256,
    alignItems: 'center',
    gap: Spacing.base,
  },
  progressBarTrack: {
    width: '100%',
    height: 4,
    backgroundColor: 'rgba(255,255,255,0.1)',
    borderRadius: BorderRadius.full,
    overflow: 'hidden',
  },
  progressBarFill: {
    height: '100%',
    backgroundColor: Colors.primary,
    borderRadius: BorderRadius.full,
    shadowColor: Colors.primary,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.8,
    shadowRadius: 10,
  },
  loadingText: {
    ...Typography.labelLg,
    fontFamily: 'Inter-SemiBold',
    color: 'rgba(255,255,255,0.4)',
    letterSpacing: 2.4,
    textTransform: 'uppercase',
  },
});

export default SplashScreen;
