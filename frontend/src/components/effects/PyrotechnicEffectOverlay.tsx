import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Animated,
  Easing,
  Dimensions,
  Platform,
} from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { Colors } from '@/constants/colors';
import { Typography } from '@/constants/typography';
import { BorderRadius, Spacing } from '@/constants/spacing';
import {
  subscribePyrotechnicEffect,
  PyrotechnicEffectItem,
  PyrotechnicType,
} from '@/utils/pyrotechnicEffects';

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');

interface ActiveEffectItem extends PyrotechnicEffectItem {
  anim: Animated.Value;
  burstAnim: Animated.Value;
}

export const PyrotechnicEffectOverlay: React.FC = () => {
  const [activeEffects, setActiveEffects] = useState<ActiveEffectItem[]>([]);
  const [toastMessage, setToastMessage] = useState<{
    text: string;
    icon: string;
    type: PyrotechnicType;
  } | null>(null);

  const toastAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    const unsubscribe = subscribePyrotechnicEffect((event) => {
      const anim = new Animated.Value(0);
      const burstAnim = new Animated.Value(0);

      const newEffect: ActiveEffectItem = {
        ...event,
        anim,
        burstAnim,
      };

      setActiveEffects((prev) => [...prev.slice(-3), newEffect]);

      // Animate flight to cart
      Animated.timing(anim, {
        toValue: 1,
        duration: 750,
        easing: Easing.out(Easing.back(1.2)),
        useNativeDriver: true,
      }).start(() => {
        // Trigger burst at destination
        Animated.timing(burstAnim, {
          toValue: 1,
          duration: 350,
          easing: Easing.ease,
          useNativeDriver: true,
        }).start(() => {
          // Remove effect item
          setActiveEffects((prev) => prev.filter((e) => e.id !== event.id));
        });
      });

      // Show pyrotechnic celebratory toast
      let toastText = `🎆 Fireworks Added to Cart!`;
      let toastIcon = 'celebration';

      if (event.type === 'rocket') {
        toastText = `🚀 ${event.title} Launched to Cart!`;
        toastIcon = 'rocket-launch';
      } else if (event.type === 'bomb') {
        toastText = `💥 BOOM! ${event.title} Added to Cart!`;
        toastIcon = 'local-fire-department';
      } else if (event.type === 'sparkler') {
        toastText = `✨ ${event.title} Sparkling into Cart!`;
        toastIcon = 'wb-twilight';
      } else if (event.type === 'chakkar') {
        toastText = `🌀 ${event.title} Spinning into Cart!`;
        toastIcon = 'autorenew';
      }

      setToastMessage({ text: toastText, icon: toastIcon, type: event.type });

      toastAnim.setValue(0);
      Animated.sequence([
        Animated.timing(toastAnim, {
          toValue: 1,
          duration: 250,
          useNativeDriver: true,
        }),
        Animated.delay(2200),
        Animated.timing(toastAnim, {
          toValue: 0,
          duration: 300,
          useNativeDriver: true,
        }),
      ]).start(() => {
        setToastMessage(null);
      });
    });

    return () => unsubscribe();
  }, [toastAnim]);

  if (activeEffects.length === 0 && !toastMessage) return null;

  return (
    <View style={styles.overlayContainer} pointerEvents="none">
      {/* Toast Pill at Top */}
      {toastMessage && (
        <Animated.View
          style={[
            styles.toastContainer,
            toastMessage.type === 'bomb' && styles.toastBomb,
            toastMessage.type === 'rocket' && styles.toastRocket,
            toastMessage.type === 'sparkler' && styles.toastSparkler,
            {
              opacity: toastAnim,
              transform: [
                {
                  translateY: toastAnim.interpolate({
                    inputRange: [0, 1],
                    outputRange: [-30, 0],
                  }),
                },
                {
                  scale: toastAnim.interpolate({
                    inputRange: [0, 1],
                    outputRange: [0.85, 1],
                  }),
                },
              ],
            },
          ]}
        >
          <MaterialIcons name={toastMessage.icon as any} size={20} color="#FFFFFF" />
          <Text style={styles.toastText}>{toastMessage.text}</Text>
        </Animated.View>
      )}

      {/* Flying Pyrotechnic Elements */}
      {activeEffects.map((item) => {
        const startX = item.startX || SCREEN_WIDTH / 2;
        const startY = item.startY || SCREEN_HEIGHT / 2 + 100;

        // Destination target: Top Right Cart Icon
        const targetX = SCREEN_WIDTH - 60;
        const targetY = 50;

        const translateX = item.anim.interpolate({
          inputRange: [0, 1],
          outputRange: [startX - 25, targetX],
        });

        const translateY = item.anim.interpolate({
          inputRange: [0, 1],
          outputRange: [startY - 25, targetY],
        });

        const scale = item.anim.interpolate({
          inputRange: [0, 0.5, 1],
          outputRange: [1, 1.4, 0.8],
        });

        const rotate = item.anim.interpolate({
          inputRange: [0, 1],
          outputRange: item.type === 'rocket' ? ['-45deg', '45deg'] : ['0deg', '360deg'],
        });

        const burstScale = item.burstAnim.interpolate({
          inputRange: [0, 0.5, 1],
          outputRange: [0.5, 2.2, 0],
        });

        const burstOpacity = item.burstAnim.interpolate({
          inputRange: [0, 0.8, 1],
          outputRange: [1, 0.8, 0],
        });

        return (
          <React.Fragment key={item.id}>
            {/* Main Flying Pyrotechnic Icon */}
            <Animated.View
              style={[
                styles.flyingItem,
                {
                  transform: [
                    { translateX },
                    { translateY },
                    { scale },
                    { rotate },
                  ],
                },
              ]}
            >
              {item.type === 'rocket' && (
                <View style={styles.rocketWrapper}>
                  <Text style={styles.emojiIcon}>🚀</Text>
                  <View style={styles.sparkleTrail} />
                </View>
              )}

              {item.type === 'bomb' && (
                <View style={styles.bombWrapper}>
                  <Text style={styles.emojiIcon}>💥</Text>
                </View>
              )}

              {item.type === 'sparkler' && (
                <View style={styles.sparklerWrapper}>
                  <Text style={styles.emojiIcon}>✨</Text>
                </View>
              )}

              {item.type === 'chakkar' && (
                <View style={styles.chakkarWrapper}>
                  <Text style={styles.emojiIcon}>🌀</Text>
                </View>
              )}

              {item.type === 'aerial' && (
                <View style={styles.aerialWrapper}>
                  <Text style={styles.emojiIcon}>🎆</Text>
                </View>
              )}
            </Animated.View>

            {/* Burst Sparks Effect over Cart Icon */}
            <Animated.View
              style={[
                styles.burstContainer,
                {
                  left: targetX - 25,
                  top: targetY - 25,
                  opacity: burstOpacity,
                  transform: [{ scale: burstScale }],
                },
              ]}
            >
              <Text style={styles.burstText}>✨🌟💥🌟✨</Text>
            </Animated.View>
          </React.Fragment>
        );
      })}
    </View>
  );
};

const styles = StyleSheet.create({
  overlayContainer: {
    ...StyleSheet.absoluteFill,
    zIndex: 99999,
    alignItems: 'center',
  },
  toastContainer: {
    position: 'absolute',
    top: Platform.OS === 'ios' ? 54 : 34,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#8B0000',
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.xs + 2,
    borderRadius: BorderRadius.full,
    gap: Spacing.xs,
    elevation: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 12,
  },
  toastBomb: {
    backgroundColor: '#B91C1C',
  },
  toastRocket: {
    backgroundColor: '#D97706',
  },
  toastSparkler: {
    backgroundColor: '#047857',
  },
  toastText: {
    ...Typography.labelLg,
    fontFamily: 'Inter-Bold',
    color: '#FFFFFF',
    fontSize: 13,
  },
  flyingItem: {
    position: 'absolute',
    width: 50,
    height: 50,
    alignItems: 'center',
    justifyContent: 'center',
  },
  rocketWrapper: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  bombWrapper: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  sparklerWrapper: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  chakkarWrapper: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  aerialWrapper: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  emojiIcon: {
    fontSize: 32,
  },
  sparkleTrail: {
    position: 'absolute',
    bottom: -6,
    width: 8,
    height: 12,
    borderRadius: 4,
    backgroundColor: '#FFD700',
  },
  burstContainer: {
    position: 'absolute',
    width: 60,
    height: 60,
    alignItems: 'center',
    justifyContent: 'center',
  },
  burstText: {
    fontSize: 20,
  },
});
