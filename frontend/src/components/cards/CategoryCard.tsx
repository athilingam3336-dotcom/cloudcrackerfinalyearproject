import React from 'react';
import { TouchableOpacity, Text, StyleSheet } from 'react-native';
import { Colors } from '@/constants/colors';
import { Typography } from '@/constants/typography';
import { BorderRadius, Spacing } from '@/constants/spacing';

interface CategoryCardProps {
  name: string;
  isSelected?: boolean;
  onPress: () => void;
}

export const CategoryCard: React.FC<CategoryCardProps> = React.memo(
  ({ name, isSelected = false, onPress }) => {
    return (
      <TouchableOpacity
        style={[styles.pill, isSelected && styles.selectedPill]}
        onPress={onPress}
        activeOpacity={0.8}
      >
        <Text style={[styles.text, isSelected && styles.selectedText]}>
          {name}
        </Text>
      </TouchableOpacity>
    );
  }
);

const styles = StyleSheet.create({
  pill: {
    paddingHorizontal: Spacing.md,
    paddingVertical: 10,
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
