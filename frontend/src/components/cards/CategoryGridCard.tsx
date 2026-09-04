import React, { useState, useRef } from 'react';
import { View, Text, Image, TouchableOpacity, StyleSheet, Animated } from 'react-native';
import { Colors } from '@/constants/colors';
import { Typography } from '@/constants/typography';
import { BorderRadius, Spacing } from '@/constants/spacing';
import { CategoryItem } from '@/constants/mockData';
import { resolveProductImage } from '@/constants/productImages';

interface CategoryGridCardProps {
  category: CategoryItem;
  onPress: () => void;
}

export const CategoryGridCard: React.FC<CategoryGridCardProps> = React.memo(
  ({ category, onPress }) => {
    const imageSource = resolveProductImage(category, 350);
    const [isLoaded, setIsLoaded] = useState(false);

    const fadeAnim = useRef(new Animated.Value(0)).current;
    const translateYAnim = useRef(new Animated.Value(-10)).current;
    const scaleAnim = useRef(new Animated.Value(1.05)).current;

    const handleImageLoad = () => {
      setIsLoaded(true);
      Animated.parallel([
        Animated.timing(fadeAnim, {
          toValue: 1,
          duration: 320,
          useNativeDriver: true,
        }),
        Animated.spring(translateYAnim, {
          toValue: 0,
          tension: 70,
          friction: 7,
          useNativeDriver: true,
        }),
        Animated.spring(scaleAnim, {
          toValue: 1,
          tension: 70,
          friction: 7,
          useNativeDriver: true,
        }),
      ]).start();
    };

    return (
      <TouchableOpacity
        style={styles.card}
        onPress={onPress}
        activeOpacity={0.88}
        accessibilityRole="button"
        accessibilityLabel={`Category ${category.name}, ${category.itemCount || 0} items`}
      >
        <View style={styles.imageContainer}>
          {/* Skeleton background placeholder while fetching Cloudinary image */}
          {!isLoaded && (
            <View style={styles.skeletonContainer}>
              <View style={styles.skeletonPulse} />
            </View>
          )}

          <Animated.View
            style={[
              styles.animatedImageWrapper,
              {
                opacity: fadeAnim,
                transform: [{ translateY: translateYAnim }, { scale: scaleAnim }],
              },
            ]}
          >
            <Image
              source={imageSource}
              style={styles.image}
              resizeMode="cover"
              onLoad={handleImageLoad}
            />
          </Animated.View>

          {category.tag && (
            <View style={styles.badge}>
              <Text style={styles.badgeText}>{category.tag}</Text>
            </View>
          )}

          <View style={styles.overlay} />
        </View>

        <View style={styles.content}>
          <Text style={styles.title} numberOfLines={1}>
            {category.name}
          </Text>
          {category.itemCount !== undefined && (
            <Text style={styles.countText}>{category.itemCount} items</Text>
          )}
        </View>
      </TouchableOpacity>
    );
  }
);

const styles = StyleSheet.create({
  card: {
    backgroundColor: Colors.surfaceContainerLowest,
    borderRadius: BorderRadius.xl,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: Colors.surfaceContainerHigh,
    shadowColor: Colors.shadowColor,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.06,
    shadowRadius: 10,
    elevation: 3,
    marginBottom: Spacing.sm,
  },
  imageContainer: {
    aspectRatio: 1,
    width: '100%',
    backgroundColor: Colors.surfaceContainerLow,
    position: 'relative',
    justifyContent: 'center',
    alignItems: 'center',
    overflow: 'hidden',
  },
  skeletonContainer: {
    ...StyleSheet.absoluteFill,
    backgroundColor: '#e2e8f0',
    justifyContent: 'center',
    alignItems: 'center',
  },
  skeletonPulse: {
    width: '100%',
    height: '100%',
    backgroundColor: '#cbd5e1',
    opacity: 0.5,
  },
  animatedImageWrapper: {
    width: '100%',
    height: '100%',
  },
  image: {
    width: '100%',
    height: '100%',
  },
  overlay: {
    ...StyleSheet.absoluteFill,
    backgroundColor: 'rgba(0, 0, 0, 0.03)',
  },
  badge: {
    position: 'absolute',
    top: Spacing.xs,
    left: Spacing.xs,
    backgroundColor: Colors.secondaryContainer,
    paddingHorizontal: Spacing.xs,
    paddingVertical: 2,
    borderRadius: BorderRadius.full,
    zIndex: 10,
  },
  badgeText: {
    ...Typography.labelLg,
    color: Colors.onSecondaryContainer,
    fontSize: 9,
    fontFamily: 'Inter-Bold',
    textTransform: 'uppercase',
  },
  content: {
    padding: Spacing.sm,
    alignItems: 'center',
  },
  title: {
    ...Typography.titleLg,
    fontSize: 15,
    fontFamily: 'Inter-Bold',
    color: Colors.onSurface,
    textAlign: 'center',
  },
  countText: {
    ...Typography.bodyMd,
    fontSize: 12,
    color: Colors.tertiary,
    marginTop: 2,
  },
});

export default CategoryGridCard;
