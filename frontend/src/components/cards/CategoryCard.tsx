import React from 'react';
import { TouchableOpacity, Text, Image, StyleSheet } from 'react-native';
import { Colors } from '@/constants/colors';
import { Typography } from '@/constants/typography';
import { BorderRadius, Spacing } from '@/constants/spacing';
import { resolveProductImage } from '@/constants/productImages';

interface CategoryCardProps {
  name: string;
  isSelected?: boolean;
  onPress: () => void;
  image?: any;
}

export const CategoryCard: React.FC<CategoryCardProps> = React.memo(
  ({ name, isSelected = false, onPress, image }) => {
    const imageSource = image || resolveProductImage(name);

    return (
      <TouchableOpacity
        style={[styles.pill, isSelected && styles.selectedPill]}
        onPress={onPress}
        activeOpacity={0.8}
      >
        {imageSource && (
          <Image source={imageSource} style={styles.image} resizeMode="cover" />
        )}
        <Text style={[styles.text, isSelected && styles.selectedText]}>
          {name}
        </Text>
      </TouchableOpacity>
    );
  }
);

const styles = StyleSheet.create({
  pill: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: Spacing.md,
    paddingVertical: 8,
    borderRadius: BorderRadius.full,
    backgroundColor: Colors.surfaceContainerLow,
    borderWidth: 1,
    borderColor: Colors.surfaceContainerHigh,
    marginRight: Spacing.xs,
  },
  selectedPill: {
    backgroundColor: Colors.primaryContainer,
    borderColor: Colors.primaryContainer,
  },
  image: {
    width: 22,
    height: 22,
    borderRadius: 11,
    marginRight: 6,
  },
  text: {
    ...Typography.bodyMd,
    fontFamily: 'Inter-Medium',
    color: Colors.onSurfaceVariant,
  },
  selectedText: {
    fontFamily: 'Inter-Bold',
    color: Colors.onPrimaryContainer,
  },
});

export default CategoryCard;
