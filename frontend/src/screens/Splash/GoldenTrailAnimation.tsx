import React, { useEffect } from 'react';
import { View, StyleSheet, Dimensions } from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  withDelay,
  withSequence,
  Easing,
} from 'react-native-reanimated';

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');

export const GoldenTrailAnimation: React.FC = () => {
  const translateX = useSharedValue(-SCREEN_WIDTH);
  const opacity = useSharedValue(0);
  const scaleY = useSharedValue(1);

  useEffect(() => {
    // Elegant, fast golden streak wiping across the screen
    opacity.value = withTiming(1, { duration: 300 });
    
    translateX.value = withSequence(
      withDelay(
        200, // Slight delay on mount
        withTiming(SCREEN_WIDTH + 100, {
          duration: 1800,
          easing: Easing.bezier(0.25, 0.1, 0.25, 1),
        })
      )
    );

    // Pulse the thickness slightly as it travels
    scaleY.value = withSequence(
      withDelay(600, withTiming(2, { duration: 300 })),
      withTiming(0.5, { duration: 800 })
    );

    // Fade out towards the end of the animation
    opacity.value = withDelay(1600, withTiming(0, { duration: 400 }));
  }, []);

  const streakStyle = useAnimatedStyle(() => ({
    transform: [
      { translateX: translateX.value },
      { scaleY: scaleY.value }
    ],
    opacity: opacity.value,
  }));

  return (
    <View style={styles.container} pointerEvents="none">
      <Animated.View style={[styles.streakContainer, streakStyle]}>
        {/* Core Bright Light */}
        <View style={styles.coreLight} />
        {/* Outer Golden Glow */}
        <View style={styles.outerGlow} />
        {/* Long Trail (fades to left) */}
        <View style={styles.trail} />
      </Animated.View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    ...StyleSheet.absoluteFill,
    justifyContent: 'center', // Centers vertically
    alignItems: 'flex-start',
    zIndex: 1, // Behind the foreground UI but above background
  },
  streakContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    position: 'absolute',
    left: 0,
    top: '48%', // Aligned slightly above center, hitting the logo
  },
  coreLight: {
    width: 60,
    height: 4,
    backgroundColor: '#FFFFFF',
    borderRadius: 2,
    shadowColor: '#FFFFFF',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 1,
    shadowRadius: 10,
    elevation: 10,
    zIndex: 3,
  },
  outerGlow: {
    position: 'absolute',
    right: 0, // Aligned to the core
    width: 120,
    height: 12,
    backgroundColor: 'rgba(255, 215, 0, 0.8)', // Gold
    borderRadius: 6,
    shadowColor: '#FFD700',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.9,
    shadowRadius: 20,
    elevation: 8,
    zIndex: 2,
  },
  trail: {
    position: 'absolute',
    right: 30, // Start just behind the core
    width: SCREEN_WIDTH * 0.8, // Very long trail
    height: 2,
    backgroundColor: 'rgba(255, 140, 0, 0.4)', // Faded orange/gold
    zIndex: 1,
  },
});
