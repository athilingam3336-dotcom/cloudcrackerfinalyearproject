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

        {/* Prominent Kids Diwali Celebration Showcase Image */}
        <Animated.View
          style={[
            styles.kidsShowcaseCard,
            {
              opacity: sloganFade,
              transform: [{ translateY: sloganY }],
            },
          ]}
        >
          <Image
            source={LOCAL_PRODUCT_IMAGES.FESTIVE_KIDS_FIREWORKS}
            style={styles.kidsShowcaseImage}
            resizeMode="cover"
          />
          <View style={styles.kidsImageOverlay} />
        </Animated.View>
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
    justifyContent: 'space-between',
    paddingVertical: Spacing.xl,
  },
  contentContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: Spacing.marginMobile,
    zIndex: 10,
    width: '100%',
    marginTop: Spacing.md,
  },
  sparkWrapper: {
    marginBottom: Spacing.md,
    alignItems: 'center',
    justifyContent: 'center',
    width: 155,
    height: 155,
  },
  outerGlow: {
    position: 'absolute',
    width: 150,
    height: 150,
    borderRadius: 75,
    backgroundColor: 'rgba(255, 215, 0, 0.18)',
    shadowColor: '#FFD700',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.9,
    shadowRadius: 30,
  },
  innerGlow: {
    position: 'absolute',
    width: 105,
    height: 105,
    borderRadius: 52.5,
    backgroundColor: Colors.primaryContainer,
    opacity: 0.35,
  },
  iconCenter: {
    position: 'relative',
    alignItems: 'center',
    justifyContent: 'center',
  },
  splashShopLogo: {
    width: 135,
    height: 135,
    borderRadius: 67.5,
    borderWidth: 2.5,
    borderColor: '#FFD700',
  },
  brandTitle: {
    ...Typography.displayLg,
    fontFamily: 'Inter-Bold',
    color: '#ffffff',
    marginBottom: 6,
    textAlign: 'center',
    fontSize: SCREEN_WIDTH < 380 ? 38 : 46,
    lineHeight: SCREEN_WIDTH < 380 ? 44 : 54,
    letterSpacing: 0.6,
  },
  sloganText: {
    ...Typography.bodyLg,
    fontFamily: 'Inter-Regular',
    color: 'rgba(255, 255, 255, 0.85)',
    textAlign: 'center',
    maxWidth: 340,
    marginBottom: Spacing.lg,
    fontSize: 13.5,
    letterSpacing: 0.2,
  },
  kidsShowcaseCard: {
    width: SCREEN_WIDTH * 0.92,
    maxWidth: 400,
    height: 215,
    borderRadius: 22,
    overflow: 'hidden',
    borderWidth: 2.5,
    borderColor: 'rgba(255, 215, 0, 0.55)',
    marginVertical: Spacing.xs,
    shadowColor: '#FFD700',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.35,
    shadowRadius: 16,
    elevation: 10,
    backgroundColor: '#000000',
  },
  kidsShowcaseImage: {
    width: '100%',
    height: '100%',
  },
  kidsImageOverlay: {
    ...StyleSheet.absoluteFill,
    backgroundColor: 'rgba(0, 0, 0, 0.05)',
  },
  loadingContainer: {
    width: 260,
    alignItems: 'center',
    gap: Spacing.xs,
    marginBottom: Spacing.md,
  },
  progressBarTrack: {
    width: '100%',
    height: 4,
    backgroundColor: 'rgba(255,255,255,0.12)',
    borderRadius: BorderRadius.full,
    overflow: 'hidden',
  },
  progressBarFill: {
    height: '100%',
    backgroundColor: '#FFD700',
    borderRadius: BorderRadius.full,
    shadowColor: '#FFD700',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.9,
    shadowRadius: 12,
  },
  loadingText: {
    ...Typography.labelLg,
    fontFamily: 'Inter-SemiBold',
    color: 'rgba(255,255,255,0.5)',
    letterSpacing: 2.5,
    textTransform: 'uppercase',
    fontSize: 11,
  },
});

export default SplashScreen;
