import React from 'react';
import { View, Text, Image, TouchableOpacity, StyleSheet } from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
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
    const imageSource = resolveProductImage(category);

    return (
      <TouchableOpacity
        style={styles.card}
        onPress={onPress}
        activeOpacity={0.88}
        accessibilityRole="button"
        accessibilityLabel={`Category ${category.name}, ${category.itemCount || 0} items`}
      >
        <View style={styles.imageContainer}>
          <Image
            source={imageSource}
            style={styles.image}
            resizeMode="cover"
          />

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
  },
  image: {
    width: '100%',
    height: '100%',
  },
  placeholderContainer: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  overlay: {
    ...StyleSheet.absoluteFill,
    backgroundColor: 'rgba(0, 0, 0, 0.05)',
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
