import React, { useState, useRef, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Dimensions,
  ImageBackground,
  TouchableOpacity,
  Platform,
  Animated,
  Easing,
  ScrollView,
} from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { BannerItem } from '@/constants/mockData';
import { Colors } from '@/constants/colors';
import { Typography } from '@/constants/typography';
import { Spacing, BorderRadius } from '@/constants/spacing';
import { PrimaryButton } from '@/components/buttons/PrimaryButton';
import { resolveProductImage } from '@/constants/productImages';

interface BannerCarouselProps {
  banners: BannerItem[];
  onBannerPress?: (banner: BannerItem) => void;
  speedSec?: number; // Speed of complete cycle in seconds
}

const { width: WINDOW_WIDTH } = Dimensions.get('window');
const CARD_WIDTH = Math.min(Math.max(WINDOW_WIDTH * 0.82, 340), 560);
const CARD_GAP = 16;
const CARD_TOTAL = CARD_WIDTH + CARD_GAP;

export const BannerCarousel: React.FC<BannerCarouselProps> = React.memo(
  ({ banners, onBannerPress, speedSec = 22 }) => {
    const [isPaused, setIsPaused] = useState(false);
    const [activeIdx, setActiveIdx] = useState(0);
    const scrollAnim = useRef(new Animated.Value(0)).current;
    const animationLoop = useRef<Animated.CompositeAnimation | null>(null);
    const currentOffsetRef = useRef(0);
    const scrollViewRef = useRef<ScrollView>(null);

    // Quadruple the banner list for seamless infinite loop
    const loopedBanners = React.useMemo(() => {
      if (!banners || banners.length === 0) return [];
      return [...banners, ...banners, ...banners, ...banners];
    }, [banners]);

    const singleSetWidth = banners.length * CARD_TOTAL;

    // Mobile Animated Loop
    useEffect(() => {
      if (Platform.OS === 'web') return; // Web uses hardware accelerated CSS keyframes
      if (banners.length <= 1) return;

      const duration = (singleSetWidth / 40) * 1000; // ~40px per second

      const runAnimation = () => {
        scrollAnim.setValue(0);
        animationLoop.current = Animated.loop(
          Animated.timing(scrollAnim, {
            toValue: -singleSetWidth,
            duration,
            easing: Easing.linear,
            useNativeDriver: true,
          })
        );
        if (!isPaused) {
          animationLoop.current.start();
        }
      };

      runAnimation();

      return () => {
        if (animationLoop.current) {
          animationLoop.current.stop();
        }
      };
    }, [banners.length, singleSetWidth, isPaused, scrollAnim]);

    const handlePause = useCallback(() => {
      setIsPaused(true);
      if (Platform.OS !== 'web' && animationLoop.current) {
        animationLoop.current.stop();
      }
    }, []);

    const handleResume = useCallback(() => {
      setIsPaused(false);
      if (Platform.OS !== 'web' && animationLoop.current) {
        animationLoop.current.start();
      }
    }, []);

    const handleManualScroll = useCallback(
      (direction: 'next' | 'prev') => {
        handlePause();
        setActiveIdx((prev) => {
          const next = direction === 'next' ? (prev + 1) % banners.length : (prev - 1 + banners.length) % banners.length;
          return next;
        });
        // Auto-resume after 3.5s of inactivity
        setTimeout(handleResume, 3500);
      },
      [banners.length, handlePause, handleResume]
    );

    // CSS Keyframes for Web
    const webAnimationStyle = Platform.OS === 'web'
      ? ({
          display: 'flex',
          flexDirection: 'row',
          gap: `${CARD_GAP}px`,
          width: 'max-content',
          animationName: 'bannerContinuousGlide',
          animationDuration: `${speedSec}s`,
          animationTimingFunction: 'linear',
          animationIterationCount: 'infinite',
          animationPlayState: isPaused ? 'paused' : 'running',
          willChange: 'transform',
        } as any)
      : null;

    return (
      <View
        style={styles.container}
        // @ts-ignore Web hover listeners
        onMouseEnter={handlePause}
        onMouseLeave={handleResume}
      >
        {/* Web Keyframes Injection */}
        {Platform.OS === 'web' && (
          <style
            dangerouslySetInnerHTML={{
              __html: `
                @keyframes bannerContinuousGlide {
                  0% {
                    transform: translate3d(0, 0, 0);
                  }
                  100% {
                    transform: translate3d(-${singleSetWidth}px, 0, 0);
                  }
                }
              `,
            }}
          />
        )}

        {/* Header Ribbon / Status */}
        <View style={styles.topRibbon}>
          <View style={styles.liveBadge}>
            <View style={[styles.pulseDot, isPaused && styles.pulseDotPaused]} />
            <Text style={styles.liveText}>
              {isPaused ? 'MOTION PAUSED (HOVER/TOUCH)' : 'FEATURED DEALS • AUTO GLIDING'}
            </Text>
          </View>

          {/* Nav Nudge Buttons */}
          <View style={styles.nudgeButtonsRow}>
            <TouchableOpacity
              style={styles.nudgeBtn}
              onPress={() => handleManualScroll('prev')}
              activeOpacity={0.7}
              accessibilityLabel="Previous banner"
            >
              <MaterialIcons name="chevron-left" size={18} color={Colors.primary} />
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.nudgeBtn}
              onPress={() => handleManualScroll('next')}
              activeOpacity={0.7}
              accessibilityLabel="Next banner"
            >
              <MaterialIcons name="chevron-right" size={18} color={Colors.primary} />
            </TouchableOpacity>
          </View>
        </View>

        {/* Marquee Viewport */}
        <View
          style={styles.marqueeViewport}
          onTouchStart={handlePause}
          onTouchEnd={handleResume}
          onTouchCancel={handleResume}
        >
          {Platform.OS === 'web' ? (
            <div style={webAnimationStyle}>
              {loopedBanners.map((item, idx) => (
                <View key={`${item.id}-${idx}`} style={[styles.bannerSlide, { width: CARD_WIDTH }]}>
                  <ImageBackground
                    source={resolveProductImage(item)}
                    style={styles.bannerImage}
                    imageStyle={{ borderRadius: BorderRadius.xl }}
                    resizeMode="cover"
                  >
                    <View style={styles.overlay} />
                    <View style={styles.bannerContent}>
                      <View style={styles.badgeRow}>
                        <View style={styles.tagBadge}>
                          <Text style={styles.tagText}>{item.tag}</Text>
                        </View>
                        {item.discountText ? (
                          <View style={styles.discountBadge}>
                            <Text style={styles.discountText}>{item.discountText}</Text>
                          </View>
                        ) : null}
                      </View>

                      <Text style={styles.title} numberOfLines={2}>
                        {item.title}
                      </Text>

                      <Text style={styles.subtitle} numberOfLines={2}>
                        {item.subtitle}
                      </Text>

                      <PrimaryButton
                        title={item.ctaText}
                        onPress={() => onBannerPress && onBannerPress(item)}
                        style={styles.ctaButton}
                      />
                    </View>
                  </ImageBackground>
                </View>
              ))}
            </div>
          ) : (
            <Animated.View
              style={[
                styles.nativeTrack,
                {
                  transform: [{ translateX: scrollAnim }],
                },
              ]}
            >
              {loopedBanners.map((item, idx) => (
                <View
                  key={`${item.id}-${idx}`}
                  style={[styles.bannerSlide, { width: CARD_WIDTH, marginRight: CARD_GAP }]}
                >
                  <ImageBackground
                    source={resolveProductImage(item)}
                    style={styles.bannerImage}
                    imageStyle={{ borderRadius: BorderRadius.xl }}
                    resizeMode="cover"
                  >
                    <View style={styles.overlay} />
                    <View style={styles.bannerContent}>
                      <View style={styles.badgeRow}>
                        <View style={styles.tagBadge}>
                          <Text style={styles.tagText}>{item.tag}</Text>
                        </View>
                        {item.discountText ? (
                          <View style={styles.discountBadge}>
                            <Text style={styles.discountText}>{item.discountText}</Text>
                          </View>
                        ) : null}
                      </View>

                      <Text style={styles.title} numberOfLines={2}>
                        {item.title}
                      </Text>

                      <Text style={styles.subtitle} numberOfLines={2}>
                        {item.subtitle}
                      </Text>

                      <PrimaryButton
                        title={item.ctaText}
                        onPress={() => onBannerPress && onBannerPress(item)}
                        style={styles.ctaButton}
                      />
                    </View>
                  </ImageBackground>
                </View>
              ))}
            </Animated.View>
          )}
        </View>

        {/* Dots Indicator */}
        <View style={styles.paginationRow}>
          {banners.map((_, idx) => (
            <TouchableOpacity
              key={idx}
              onPress={() => {
                setActiveIdx(idx);
                handlePause();
                setTimeout(handleResume, 3000);
              }}
              activeOpacity={0.7}
              style={styles.dotTouch}
            >
              <View
                style={[
                  styles.dot,
                  idx === activeIdx ? styles.activeDot : styles.inactiveDot,
                ]}
              />
            </TouchableOpacity>
          ))}
        </View>
      </View>
    );
  }
);

const styles = StyleSheet.create({
  container: {
    marginVertical: Spacing.xs,
    width: '100%',
    overflow: 'hidden',
  },
  topRibbon: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: Spacing.marginMobile,
    marginBottom: Spacing.xs,
  },
  liveBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: Colors.surfaceContainerLow,
    paddingHorizontal: Spacing.sm,
    paddingVertical: 3,
    borderRadius: BorderRadius.full,
    borderWidth: 1,
    borderColor: Colors.surfaceContainerHigh,
  },
  pulseDot: {
    width: 7,
    height: 7,
    borderRadius: 4,
    backgroundColor: Colors.secondary,
  },
  pulseDotPaused: {
    backgroundColor: Colors.error,
  },
  liveText: {
    ...Typography.labelLg,
    fontSize: 9,
    fontFamily: 'Inter-Bold',
    letterSpacing: 0.6,
    color: Colors.onSurfaceVariant,
  },
  nudgeButtonsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  nudgeBtn: {
    width: 26,
    height: 26,
    borderRadius: BorderRadius.full,
    backgroundColor: Colors.surfaceContainerLowest,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: Colors.surfaceContainerHigh,
  },
  marqueeViewport: {
    width: '100%',
    overflow: 'hidden',
    paddingVertical: 2,
  },
  nativeTrack: {
    flexDirection: 'row',
    width: 9999,
  },
  bannerSlide: {
    height: 230,
    borderRadius: BorderRadius.xl,
    overflow: 'hidden',
    elevation: 3,
    shadowColor: Colors.shadowColor,
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.12,
    shadowRadius: 8,
  },
  bannerImage: {
    width: '100%',
    height: '100%',
    justifyContent: 'flex-end',
  },
  overlay: {
    ...StyleSheet.absoluteFill,
    backgroundColor: 'rgba(10, 15, 20, 0.48)',
    borderRadius: BorderRadius.xl,
  },
  bannerContent: {
    padding: Spacing.lg,
    zIndex: 10,
    alignItems: 'flex-start',
  },
  badgeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.xs,
    marginBottom: Spacing.xs,
  },
  tagBadge: {
    backgroundColor: Colors.secondary,
    paddingHorizontal: Spacing.sm,
    paddingVertical: 3,
    borderRadius: BorderRadius.full,
  },
  tagText: {
    ...Typography.labelLg,
    fontFamily: 'Inter-Bold',
    color: '#000000',
    fontSize: 10,
    letterSpacing: 0.8,
    textTransform: 'uppercase',
  },
  discountBadge: {
    backgroundColor: 'rgba(255, 255, 255, 0.22)',
    paddingHorizontal: Spacing.sm,
    paddingVertical: 3,
    borderRadius: BorderRadius.full,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.45)',
  },
  discountText: {
    ...Typography.labelLg,
    fontFamily: 'Inter-Bold',
    color: '#ffffff',
    fontSize: 10,
    letterSpacing: 0.5,
  },
  title: {
    ...Typography.headlineLg,
    fontSize: 21,
    lineHeight: 27,
    fontFamily: 'Inter-Bold',
    color: '#ffffff',
    marginBottom: 4,
    textShadowColor: 'rgba(0,0,0,0.6)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 3,
  },
  subtitle: {
    ...Typography.bodyMd,
    fontFamily: 'Inter-Regular',
    color: 'rgba(255, 255, 255, 0.9)',
    marginBottom: Spacing.sm,
    maxWidth: 320,
    fontSize: 12,
    lineHeight: 16,
  },
  ctaButton: {
    paddingHorizontal: Spacing.md,
    paddingVertical: 6,
    height: 34,
    minHeight: 34,
  },
  paginationRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    marginTop: Spacing.xs,
  },
  dotTouch: {
    padding: 3,
  },
  dot: {
    height: 6,
    borderRadius: 3,
  },
  activeDot: {
    width: 22,
    backgroundColor: Colors.primary,
  },
  inactiveDot: {
    width: 6,
    backgroundColor: Colors.surfaceContainerHigh,
  },
});

export default BannerCarousel;
