import React, { useEffect, useState, useRef, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Dimensions,
  Image,
  TouchableOpacity,
  ScrollView,
  Platform,
} from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
  withRepeat,
  withTiming,
  withSequence,
  interpolate,
  Easing,
  runOnJS,
} from 'react-native-reanimated';
import { GestureDetector, Gesture } from 'react-native-gesture-handler';
import MaskedView from '@react-native-masked-view/masked-view';
import { Accelerometer } from 'expo-sensors';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { MaterialIcons } from '@expo/vector-icons';
import { LOCAL_PRODUCT_IMAGES } from '@/constants/productImages';

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');
const HERO_HEIGHT = Math.max(SCREEN_HEIGHT, 700);

// Colors Theme
const THEME = {
  bgDark: '#0d0d0d',
  bgMaroon: '#1a0000',
  gold: '#FFD700',
  goldLight: '#FFF2A7',
  red: '#B22222',
  brightRed: '#FF2400',
  textLight: '#E2E8F0',
  textMuted: '#A0AEC0',
};

// Types & Mock Data
export interface HeroCategory {
  id: string;
  label: string;
  icon: keyof typeof MaterialIcons.glyphMap;
}

export interface HeroProduct {
  id: string;
  name: string;
  category: string;
  price: number;
  originalPrice: number;
  badge?: string;
  image: any;
}

const CATEGORIES: HeroCategory[] = [
  { id: 'sparklers', label: 'Sparklers', icon: 'wb-twilight' },
  { id: 'rockets', label: 'Rockets', icon: 'rocket-launch' },
  { id: 'flowerpots', label: 'Flower Pots', icon: 'water-drop' },
  { id: 'chakkars', label: 'Chakkars', icon: 'celebration' },
];

const FEATURED_PRODUCTS: HeroProduct[] = [
  {
    id: 'p1',
    name: '30 Shots Aerial Finale Cake',
    category: 'Rockets & Barrages',
    price: 450,
    originalPrice: 650,
    badge: 'TOP SELLER',
    image: LOCAL_PRODUCT_IMAGES.MULTI_SHOT_30,
  },
  {
    id: 'p2',
    name: 'Deluxe Jumbo Flower Pots',
    category: 'Flower Pots',
    price: 280,
    originalPrice: 400,
    badge: 'POPULAR',
    image: LOCAL_PRODUCT_IMAGES.FLOWER_POT,
  },
  {
    id: 'p3',
    name: 'Electric Metallic Sparklers (10 Pcs)',
    category: 'Sparklers',
    price: 120,
    originalPrice: 180,
    badge: 'HOT',
    image: LOCAL_PRODUCT_IMAGES.ELECTRIC_SPARKLERS,
  },
  {
    id: 'p4',
    name: 'High-Velocity Hydro Atom Bomb',
    category: 'Sound Crackers',
    price: 350,
    originalPrice: 500,
    badge: 'LOUD BURST',
    image: LOCAL_PRODUCT_IMAGES.ATOM_BOMB,
  },
];

interface MeeraHeroHomeProps {
  onShopNowPress?: () => void;
  onCataloguePress?: () => void;
  onAddToCart?: (product: HeroProduct) => void;
  onProductPress?: (product: HeroProduct) => void;
  onCategorySelect?: (categoryId: string) => void;
}

// Micro Spark Burst Component for Category Chips
const SparkParticle: React.FC<{ index: number; trigger: number }> = ({ index, trigger }) => {
  const scale = useSharedValue(0);
  const opacity = useSharedValue(0);
  const translateX = useSharedValue(0);
  const translateY = useSharedValue(0);

  useEffect(() => {
    if (trigger === 0) return;

    const angle = (index * (360 / 8) * Math.PI) / 180;
    const distance = 25 + Math.random() * 15;

    scale.value = 0.2;
    opacity.value = 1;
    translateX.value = 0;
    translateY.value = 0;

    translateX.value = withTiming(Math.cos(angle) * distance, { duration: 400, easing: Easing.out(Easing.quad) });
    translateY.value = withTiming(Math.sin(angle) * distance, { duration: 400, easing: Easing.out(Easing.quad) });
    scale.value = withTiming(1.2, { duration: 400 });
    opacity.value = withTiming(0, { duration: 450 });
  }, [trigger, index]);

  const animStyle = useAnimatedStyle(() => ({
    transform: [
      { translateX: translateX.value },
      { translateY: translateY.value },
      { scale: scale.value },
    ],
    opacity: opacity.value,
  }));

  return (
    <Animated.View
      style={[
        styles.sparkParticle,
        { backgroundColor: index % 2 === 0 ? THEME.gold : THEME.brightRed },
        animStyle,
      ]}
    />
  );
};

const SparkCategoryChip: React.FC<{
  category: HeroCategory;
  isSelected: boolean;
  onPress: () => void;
}> = ({ category, isSelected, onPress }) => {
  const [burstTrigger, setBurstTrigger] = useState(0);
  const chipScale = useSharedValue(1);

  const handlePress = () => {
    chipScale.value = withSequence(
      withTiming(0.92, { duration: 80 }),
      withSpring(1, { damping: 12, stiffness: 200 })
    );
    setBurstTrigger((prev) => prev + 1);
    onPress();
  };

  const animChipStyle = useAnimatedStyle(() => ({
    transform: [{ scale: chipScale.value }],
  }));

  return (
    <View style={styles.chipWrapper}>
      {[0, 1, 2, 3, 4, 5, 6, 7].map((i) => (
        <SparkParticle key={i} index={i} trigger={burstTrigger} />
      ))}
      <TouchableOpacity activeOpacity={0.85} onPress={handlePress}>
        <Animated.View style={[styles.chip, isSelected && styles.chipActive, animChipStyle]}>
          <MaterialIcons
            name={category.icon}
            size={18}
            color={isSelected ? THEME.bgDark : THEME.gold}
          />
          <Text style={[styles.chipText, isSelected && styles.chipTextActive]}>
            {category.label}
          </Text>
        </Animated.View>
      </TouchableOpacity>
    </View>
  );
};

// 3D Tilt Product Card Component
const TiltProductCard: React.FC<{
  product: HeroProduct;
  onPress?: () => void;
  onAddToCart?: () => void;
}> = ({ product, onPress, onAddToCart }) => {
  const rotateX = useSharedValue(0);
  const rotateY = useSharedValue(0);
  const cardScale = useSharedValue(1);

  const panGesture = Gesture.Pan()
    .onUpdate((e) => {
      // Perspective 800 interpolation based on drag within card width/height
      rotateY.value = interpolate(e.x, [0, 160], [-12, 12]);
      rotateX.value = interpolate(e.y, [0, 220], [12, -12]);
    })
    .onEnd(() => {
      rotateX.value = withSpring(0, { damping: 15 });
      rotateY.value = withSpring(0, { damping: 15 });
    });

  const cardAnimStyle = useAnimatedStyle(() => ({
    transform: [
      { perspective: 800 },
      { rotateX: `${rotateX.value}deg` },
      { rotateY: `${rotateY.value}deg` },
      { scale: cardScale.value },
    ],
  }));

  return (
    <GestureDetector gesture={panGesture}>
      <Animated.View style={[styles.productCard, cardAnimStyle]}>
        <TouchableOpacity activeOpacity={0.9} onPress={onPress}>
          <View style={styles.productImageContainer}>
            <Image source={product.image} style={styles.productImage} resizeMode="cover" />
            {product.badge && (
              <View style={styles.productBadge}>
                <Text style={styles.productBadgeText}>{product.badge}</Text>
              </View>
            )}
          </View>
          <View style={styles.productContent}>
            <Text style={styles.productCategory}>{product.category}</Text>
            <Text style={styles.productTitle} numberOfLines={1}>
              {product.name}
            </Text>
            <View style={styles.priceRow}>
              <Text style={styles.productPrice}>₹{product.price}</Text>
              <Text style={styles.productOriginalPrice}>₹{product.originalPrice}</Text>
            </View>
            <TouchableOpacity
              activeOpacity={0.8}
              style={styles.addToCartBtn}
              onPress={onAddToCart}
            >
              <MaterialIcons name="shopping-cart" size={16} color={THEME.bgDark} />
              <Text style={styles.addToCartBtnText}>Add to Cart</Text>
            </TouchableOpacity>
          </View>
        </TouchableOpacity>
      </Animated.View>
    </GestureDetector>
  );
};

export const MeeraHeroHome: React.FC<MeeraHeroHomeProps> = ({
  onShopNowPress,
  onCataloguePress,
  onAddToCart,
  onProductPress,
  onCategorySelect,
}) => {
  const insets = useSafeAreaInsets();
  const [selectedCat, setSelectedCat] = useState<string>('sparklers');

  // Spotlight Torch Shared Coordinates
  const spotlightX = useSharedValue(SCREEN_WIDTH / 2);
  const spotlightY = useSharedValue(220);

  // Logo Badge Glow Pulse Shared Value
  const logoGlow = useSharedValue(0);

  // Auto Gyroscope drift baseline shared values
  const isTouching = useSharedValue(false);

  const touchTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // 1. Pulsing shadow animation for foreground circular logo badge
  useEffect(() => {
    logoGlow.value = withRepeat(
      withSequence(
        withTiming(1, { duration: 1500, easing: Easing.inOut(Easing.ease) }),
        withTiming(0, { duration: 1500, easing: Easing.inOut(Easing.ease) })
      ),
      -1,
      true
    );
  }, []);

  // 2. Accelerometer (Gyroscope tilt) integration with Web safety guards
  useEffect(() => {
    let subscription: any;

    if (Platform.OS !== 'web') {
      try {
        if (typeof Accelerometer.setUpdateInterval === 'function') {
          Accelerometer.setUpdateInterval(30);
        }
        if (typeof Accelerometer.addListener === 'function') {
          subscription = Accelerometer.addListener((data) => {
            'worklet';
            const targetDeltaX = -data.x * 120;
            const targetDeltaY = data.y * 120;

            if (!isTouching.value) {
              spotlightX.value = withSpring(SCREEN_WIDTH / 2 + targetDeltaX, {
                damping: 20,
                stiffness: 90,
              });
              spotlightY.value = withSpring(220 + targetDeltaY, {
                damping: 20,
                stiffness: 90,
              });
            }
          });
        }
      } catch (err) {
        console.warn('Accelerometer is not supported on this platform/device:', err);
      }
    }

    return () => {
      if (subscription && typeof subscription.remove === 'function') {
        subscription.remove();
      }
    };
  }, []);

  // Touch Gesture Handling with 150ms spring lag & 2s idle auto-gyro timer
  const resetIdleTimer = useCallback(() => {
    if (touchTimerRef.current) clearTimeout(touchTimerRef.current);
    touchTimerRef.current = setTimeout(() => {
      isTouching.value = false;
    }, 2000);
  }, []);

  const touchGesture = Gesture.Pan()
    .onStart((e) => {
      isTouching.value = true;
      spotlightX.value = withSpring(e.x, { damping: 18, stiffness: 120 });
      spotlightY.value = withSpring(e.y, { damping: 18, stiffness: 120 });
      runOnJS(resetIdleTimer)();
    })
    .onUpdate((e) => {
      isTouching.value = true;
      spotlightX.value = withSpring(e.x, { damping: 18, stiffness: 120 });
      spotlightY.value = withSpring(e.y, { damping: 18, stiffness: 120 });
      runOnJS(resetIdleTimer)();
    })
    .onEnd(() => {
      runOnJS(resetIdleTimer)();
    });

  // Torch / Spotlight Torch Ring Mask Position
  const torchMaskStyle = useAnimatedStyle(() => ({
    transform: [
      { translateX: spotlightX.value - 120 },
      { translateY: spotlightY.value - 120 },
    ],
  }));

  // Glowing Logo Badge Reanimated Style
  const logoBadgeAnimStyle = useAnimatedStyle(() => {
    const shadowR = interpolate(logoGlow.value, [0, 1], [20, 40]);
    const glowOpacity = interpolate(logoGlow.value, [0, 1], [0.5, 1]);
    return {
      shadowRadius: shadowR,
      shadowOpacity: glowOpacity,
      elevation: shadowR,
    };
  });

  // Torch Spotlight Scene Component
  const RenderSpotlightScene = () => {
    const LitRevealLayer = () => (
      <View style={styles.spotlightRevealContainer}>
        <Image
          source={LOCAL_PRODUCT_IMAGES.THERI_DIWALI}
          style={styles.heroBgImageBright}
          resizeMode="cover"
        />
        {/* Decorative Burst Effects inside the revealed layer */}
        <View style={styles.fireworkBurstOverlay} />
      </View>
    );

    return (
      <MaskedView
        style={styles.maskedViewContainer}
        maskElement={
          <Animated.View style={[styles.torchCircleMask, torchMaskStyle]} />
        }
      >
        <LitRevealLayer />
      </MaskedView>
    );
  };

  return (
    <ScrollView
      style={styles.mainScrollView}
      contentContainerStyle={styles.scrollContent}
      showsVerticalScrollIndicator={false}
      bounces={false}
    >
      {/* ----------------- LAYER 1 & 2: SPOTLIGHT HERO SECTION ----------------- */}
      <View style={[styles.heroContainer, { paddingTop: insets.top }]}>
        {/* Base Unlit Night Sky Layer */}
        <View style={StyleSheet.absoluteFill}>
          <Image
            source={LOCAL_PRODUCT_IMAGES.THERI_DIWALI}
            style={styles.heroBgImageDim}
            resizeMode="cover"
          />
          <View style={styles.darkOverlay} />
        </View>

        {/* Revealed Lit Layer with Soft Torch Mask */}
        <RenderSpotlightScene />

        {/* Gesture Detector overlay wrapping the spotlight interactive zone */}
        <GestureDetector gesture={touchGesture}>
          <View style={styles.heroInteractionTouchLayer}>
            {/* LAYER 3: Circular Glowing Logo Badge */}
            <Animated.View style={[styles.logoBadgeContainer, logoBadgeAnimStyle]}>
              <Image source={LOCAL_PRODUCT_IMAGES.LOGO} style={styles.logoBadgeImage} />
            </Animated.View>

            {/* LAYER 4: Foreground Embossed Text & Call to Actions */}
            <View style={styles.heroTextContainer}>
              <View style={styles.embossedTextWrapper}>
                <Text style={styles.titleShadow}>Fire Up Your Celebrations</Text>
                <Text style={styles.titleText}>Fire Up Your Celebrations</Text>
              </View>

              <Text style={styles.brandTitleText}>
                MEERA CRACKERS — PREMIUM WHOLESALE & RETAILER
              </Text>
              <Text style={styles.subtext}>
                Experience 100% Genuine Sivakasi Pyrotechnics with Sky-High Lighting & Unmatched Safety.
              </Text>

              {/* Action Buttons */}
              <View style={styles.heroButtonsRow}>
                <TouchableOpacity
                  activeOpacity={0.85}
                  style={styles.shopNowBtn}
                  onPress={onShopNowPress}
                >
                  <Text style={styles.shopNowBtnText}>Shop Now</Text>
                  <MaterialIcons name="arrow-forward" size={18} color={THEME.bgDark} />
                </TouchableOpacity>

                <TouchableOpacity
                  activeOpacity={0.85}
                  style={styles.catalogueBtn}
                  onPress={onCataloguePress}
                >
                  <MaterialIcons name="menu-book" size={18} color={THEME.gold} />
                  <Text style={styles.catalogueBtnText}>Catalogue</Text>
                </TouchableOpacity>
              </View>
            </View>
          </View>
        </GestureDetector>
      </View>

      {/* ----------------- SECTION: CATEGORY STRIP ----------------- */}
      <View style={styles.sectionContainer}>
        <View style={styles.sectionHeaderRow}>
          <Text style={styles.sectionTitle}>EXPLORE CATEGORIES</Text>
          <Text style={styles.sectionSub}>Pick your favorite pyrotechnic burst</Text>
        </View>

        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.categoryStripContent}
        >
          {CATEGORIES.map((cat) => (
            <SparkCategoryChip
              key={cat.id}
              category={cat}
              isSelected={selectedCat === cat.id}
              onPress={() => {
                setSelectedCat(cat.id);
                onCategorySelect?.(cat.id);
              }}
            />
          ))}
        </ScrollView>
      </View>

      {/* ----------------- SECTION: FEATURED PRODUCTS GRID ----------------- */}
      <View style={styles.sectionContainer}>
        <View style={styles.sectionHeaderRow}>
          <Text style={styles.sectionTitle}>FEATURED PYROTECHNICS</Text>
          <Text style={styles.sectionSub}>Touch-drag card for interactive 3D perspective</Text>
        </View>

        <View style={styles.productsGrid}>
          {FEATURED_PRODUCTS.map((prod) => (
            <TiltProductCard
              key={prod.id}
              product={prod}
              onPress={() => onProductPress?.(prod)}
              onAddToCart={() => onAddToCart?.(prod)}
            />
          ))}
        </View>
      </View>

      {/* ----------------- SECTION: TRUST BADGES ROW ----------------- */}
      <View style={styles.trustBadgesContainer}>
        <View style={styles.trustBadgeCard}>
          <View style={styles.trustIconCircle}>
            <MaterialIcons name="verified-user" size={24} color={THEME.gold} />
          </View>
          <Text style={styles.trustBadgeTitle}>Safety Guarantee</Text>
          <Text style={styles.trustBadgeDesc}>Certified 100% Green & Lab Tested</Text>
        </View>

        <View style={styles.trustBadgeCard}>
          <View style={styles.trustIconCircle}>
            <MaterialIcons name="local-offer" size={24} color={THEME.gold} />
          </View>
          <Text style={styles.trustBadgeTitle}>Wholesale Pricing</Text>
          <Text style={styles.trustBadgeDesc}>Direct Sivakasi Factory Discounts</Text>
        </View>

        <View style={styles.trustBadgeCard}>
          <View style={styles.trustIconCircle}>
            <MaterialIcons name="local-shipping" size={24} color={THEME.gold} />
          </View>
          <Text style={styles.trustBadgeTitle}>Pan-India Delivery</Text>
          <Text style={styles.trustBadgeDesc}>Fast Doorstep Safe Transport</Text>
        </View>
      </View>
    </ScrollView>
  );
};

export default MeeraHeroHome;

const styles = StyleSheet.create({
  mainScrollView: {
    flex: 1,
    backgroundColor: THEME.bgDark,
  },
  scrollContent: {
    paddingBottom: 60,
  },

  // HERO SECTION STYLES
  heroContainer: {
    height: HERO_HEIGHT * 0.72,
    width: SCREEN_WIDTH,
    backgroundColor: THEME.bgDark,
    position: 'relative',
    overflow: 'hidden',
  },
  heroBgImageDim: {
    width: '100%',
    height: '100%',
    opacity: 0.25,
  },
  heroBgImageBright: {
    width: SCREEN_WIDTH,
    height: HERO_HEIGHT * 0.72,
    opacity: 1,
  },
  darkOverlay: {
    ...StyleSheet.absoluteFill,
    backgroundColor: 'rgba(13, 13, 13, 0.75)',
  },
  maskedViewContainer: {
    width: SCREEN_WIDTH,
    height: HERO_HEIGHT * 0.72,
    position: 'absolute',
    top: 0,
    left: 0,
  },
  torchCircleMask: {
    width: 240,
    height: 240,
    borderRadius: 120,
    backgroundColor: '#000000',
  },
  spotlightBaseContainer: {
    width: SCREEN_WIDTH,
    height: '100%',
  },
  spotlightRevealContainer: {
    width: SCREEN_WIDTH,
    height: '100%',
    position: 'relative',
  },
  fireworkBurstOverlay: {
    ...StyleSheet.absoluteFill,
    backgroundColor: 'rgba(255, 215, 0, 0.08)',
  },
  heroInteractionTouchLayer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 20,
    zIndex: 10,
  },

  // LOGO BADGE STYLES
  logoBadgeContainer: {
    width: 110,
    height: 110,
    borderRadius: 55,
    backgroundColor: THEME.bgDark,
    borderWidth: 3,
    borderColor: THEME.gold,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: THEME.gold,
    shadowOffset: { width: 0, height: 0 },
    elevation: 25,
    marginBottom: 20,
  },
  logoBadgeImage: {
    width: 96,
    height: 96,
    borderRadius: 48,
  },

  // EMBOSSED 3D TEXT & CTA STYLES
  heroTextContainer: {
    alignItems: 'center',
    width: '100%',
  },
  embossedTextWrapper: {
    position: 'relative',
    marginBottom: 6,
    alignItems: 'center',
  },
  titleShadow: {
    fontSize: 26,
    fontWeight: '900',
    color: '#000000',
    position: 'absolute',
    top: 2,
    left: 2,
    textAlign: 'center',
  },
  titleText: {
    fontSize: 26,
    fontWeight: '900',
    color: THEME.gold,
    textAlign: 'center',
    textShadowColor: 'rgba(255, 215, 0, 0.7)',
    textShadowOffset: { width: -1, height: -1 },
    textShadowRadius: 8,
  },
  brandTitleText: {
    fontSize: 12,
    fontWeight: '800',
    color: THEME.brightRed,
    letterSpacing: 1.5,
    marginBottom: 10,
    textAlign: 'center',
  },
  subtext: {
    fontSize: 13,
    color: THEME.textMuted,
    textAlign: 'center',
    maxWidth: 320,
    lineHeight: 19,
    marginBottom: 24,
  },
  heroButtonsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
  },
  shopNowBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: THEME.gold,
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 30,
    gap: 8,
    shadowColor: THEME.gold,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.4,
    shadowRadius: 10,
    elevation: 8,
  },
  shopNowBtnText: {
    fontSize: 14,
    fontWeight: '800',
    color: THEME.bgDark,
  },
  catalogueBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(26, 0, 0, 0.8)',
    borderWidth: 1.5,
    borderColor: THEME.gold,
    paddingVertical: 12,
    paddingHorizontal: 22,
    borderRadius: 30,
    gap: 8,
  },
  catalogueBtnText: {
    fontSize: 14,
    fontWeight: '700',
    color: THEME.gold,
  },

  // SECTION STYLES
  sectionContainer: {
    marginTop: 28,
    paddingHorizontal: 16,
  },
  sectionHeaderRow: {
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: THEME.gold,
    letterSpacing: 1,
  },
  sectionSub: {
    fontSize: 12,
    color: THEME.textMuted,
    marginTop: 2,
  },

  // CATEGORY CHIP STYLES
  categoryStripContent: {
    paddingVertical: 8,
    gap: 12,
  },
  chipWrapper: {
    position: 'relative',
    alignItems: 'center',
    justifyContent: 'center',
  },
  sparkParticle: {
    position: 'absolute',
    width: 6,
    height: 6,
    borderRadius: 3,
    zIndex: 2,
  },
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(26, 0, 0, 0.7)',
    borderWidth: 1,
    borderColor: THEME.gold,
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: 25,
    gap: 8,
  },
  chipActive: {
    backgroundColor: THEME.gold,
    borderColor: THEME.goldLight,
  },
  chipText: {
    fontSize: 13,
    fontWeight: '700',
    color: THEME.gold,
  },
  chipTextActive: {
    color: THEME.bgDark,
  },

  // FEATURED PRODUCTS GRID & TILT CARDS
  productsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 14,
    justifyContent: 'space-between',
  },
  productCard: {
    width: (SCREEN_WIDTH - 46) / 2,
    backgroundColor: '#141414',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: 'rgba(255, 215, 0, 0.25)',
    overflow: 'hidden',
  },
  productImageContainer: {
    width: '100%',
    height: 140,
    backgroundColor: '#0a0a0a',
    position: 'relative',
  },
  productImage: {
    width: '100%',
    height: '100%',
  },
  productBadge: {
    position: 'absolute',
    top: 8,
    left: 8,
    backgroundColor: THEME.red,
    paddingVertical: 4,
    paddingHorizontal: 8,
    borderRadius: 8,
  },
  productBadgeText: {
    fontSize: 9,
    fontWeight: '800',
    color: '#ffffff',
  },
  productContent: {
    padding: 12,
  },
  productCategory: {
    fontSize: 10,
    color: THEME.textMuted,
    marginBottom: 4,
    textTransform: 'uppercase',
  },
  productTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: THEME.textLight,
    marginBottom: 8,
  },
  priceRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 12,
  },
  productPrice: {
    fontSize: 15,
    fontWeight: '800',
    color: THEME.gold,
  },
  productOriginalPrice: {
    fontSize: 12,
    color: THEME.textMuted,
    textDecorationLine: 'line-through',
  },
  addToCartBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: THEME.gold,
    paddingVertical: 8,
    borderRadius: 10,
    gap: 6,
  },
  addToCartBtnText: {
    fontSize: 12,
    fontWeight: '800',
    color: THEME.bgDark,
  },

  // TRUST BADGES ROW
  trustBadgesContainer: {
    marginTop: 36,
    paddingHorizontal: 16,
    gap: 12,
  },
  trustBadgeCard: {
    flexDirection: 'column',
    alignItems: 'center',
    backgroundColor: 'rgba(26, 0, 0, 0.6)',
    borderWidth: 1,
    borderColor: 'rgba(255, 215, 0, 0.2)',
    borderRadius: 16,
    padding: 16,
  },
  trustIconCircle: {
    width: 46,
    height: 46,
    borderRadius: 23,
    backgroundColor: 'rgba(255, 215, 0, 0.1)',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 10,
  },
  trustBadgeTitle: {
    fontSize: 14,
    fontWeight: '800',
    color: THEME.gold,
    marginBottom: 4,
  },
  trustBadgeDesc: {
    fontSize: 12,
    color: THEME.textMuted,
    textAlign: 'center',
  },
});
