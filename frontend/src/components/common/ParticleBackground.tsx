import React, { useEffect, useRef } from 'react';
import { View, StyleSheet, Animated, Easing, Dimensions } from 'react-native';
import { Colors } from '@/constants/colors';

const PARTICLE_COUNT = 35;
const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');

interface Particle {
  x: number;
  y: number;
  size: number;
  color: string;
  maxOpacity: number;
  animX: Animated.Value;
  animY: Animated.Value;
  animOpacity: Animated.Value;
}

export const ParticleBackground: React.FC = () => {
  const particles = useRef<Particle[]>([]);

  if (particles.current.length === 0) {
    particles.current = Array.from({ length: PARTICLE_COUNT }).map(() => {
      const size = Math.random() * 3 + 1.5;
      const initialX = Math.random() * SCREEN_WIDTH;
      const initialY = Math.random() * SCREEN_HEIGHT;
      const maxOpacity = Math.random() * 0.45 + 0.15;
      return {
        x: initialX,
        y: initialY,
        size,
        color: Math.random() > 0.5 ? Colors.primary : Colors.secondaryContainer,
        maxOpacity,
        animX: new Animated.Value(0),
        animY: new Animated.Value(0),
        animOpacity: new Animated.Value(maxOpacity),
      };
    });
  }

  useEffect(() => {
    particles.current.forEach((particle) => {
      const duration = (8 + Math.random() * 12) * 1000;
      const deltaX = (Math.random() - 0.5) * 180;
      const deltaY = (Math.random() - 0.5) * 180;

      Animated.loop(
        Animated.sequence([
          Animated.parallel([
            Animated.timing(particle.animX, {
              toValue: deltaX,
              duration,
              easing: Easing.inOut(Easing.quad),
              useNativeDriver: true,
            }),
            Animated.timing(particle.animY, {
              toValue: deltaY,
              duration,
              easing: Easing.inOut(Easing.quad),
              useNativeDriver: true,
            }),
            Animated.timing(particle.animOpacity, {
              toValue: 0.05,
              duration: duration * 0.6,
              easing: Easing.inOut(Easing.quad),
              useNativeDriver: true,
            }),
          ]),
          Animated.parallel([
            Animated.timing(particle.animX, {
              toValue: 0,
              duration,
              easing: Easing.inOut(Easing.quad),
              useNativeDriver: true,
            }),
            Animated.timing(particle.animY, {
              toValue: 0,
              duration,
              easing: Easing.inOut(Easing.quad),
              useNativeDriver: true,
            }),
            Animated.timing(particle.animOpacity, {
              toValue: particle.maxOpacity,
              duration: duration * 0.6,
              easing: Easing.inOut(Easing.quad),
              useNativeDriver: true,
            }),
          ]),
        ])
      ).start();
    });
  }, []);

  return (
    <View style={StyleSheet.absoluteFill} pointerEvents="none">
      {particles.current.map((p, index) => (
        <Animated.View
          key={index}
          style={[
            styles.particle,
            {
              left: p.x,
              top: p.y,
              width: p.size,
              height: p.size,
              borderRadius: p.size / 2,
              backgroundColor: p.color,
              opacity: p.animOpacity,
              transform: [
                { translateX: p.animX },
                { translateY: p.animY },
              ],
            },
          ]}
        />
      ))}
    </View>
  );
};

const styles = StyleSheet.create({
  particle: {
    position: 'absolute',
  },
});

export default ParticleBackground;
