import React from 'react';
import { View, TextInput, StyleSheet, TouchableOpacity } from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { Colors } from '@/constants/colors';
import { Typography } from '@/constants/typography';
import { Spacing, BorderRadius } from '@/constants/spacing';

interface SearchBarProps {
  value: string;
  onChangeText: (text: string) => void;
  onClear?: () => void;
  onFilterPress?: () => void;
  placeholder?: string;
}

export const SearchBar: React.FC<SearchBarProps> = React.memo(
  ({
    value,
    onChangeText,
    onClear,
    onFilterPress,
    placeholder = 'Search pyrotechnics...',
  }) => {
    return (
      <View style={styles.container}>
        <View style={styles.inputWrapper}>
          <MaterialIcons
            name="search"
            size={20}
            color={Colors.onSurfaceVariant}
            style={styles.searchIcon}
          />
          <TextInput
            style={styles.input}
            value={value}
            onChangeText={onChangeText}
            placeholder={placeholder}
            placeholderTextColor={Colors.tertiary}
            accessibilityLabel="Search input"
            accessibilityRole="search"
            returnKeyType="search"
            clearButtonMode="while-editing"
          />
          {value.length > 0 && (
            <TouchableOpacity
              onPress={onClear || (() => onChangeText(''))}
              style={styles.clearButton}
              accessibilityLabel="Clear search text"
              accessibilityRole="button"
            >
              <MaterialIcons name="close" size={18} color={Colors.tertiary} />
            </TouchableOpacity>
          )}
        </View>
        {onFilterPress && (
          <TouchableOpacity
            style={styles.filterButton}
            onPress={onFilterPress}
            activeOpacity={0.7}
            accessibilityLabel="Filter products"
            accessibilityRole="button"
          >
            <MaterialIcons name="tune" size={20} color={Colors.primary} />
          </TouchableOpacity>
        )}
      </View>
    );
  }
);

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: Spacing.marginMobile,
    paddingVertical: Spacing.xs,
    gap: Spacing.xs,
  },
  inputWrapper: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.surfaceContainer,
    borderRadius: BorderRadius.full,
    paddingHorizontal: Spacing.md,
    height: 48,
    borderWidth: 1,
    borderColor: Colors.surfaceContainerHigh,
  },
  searchIcon: {
    marginRight: Spacing.xs,
  },
  input: {
    flex: 1,
    ...Typography.bodyMd,
    fontFamily: 'Inter-Regular',
    color: Colors.onSurface,
    height: '100%',
    paddingVertical: 0,
  },
  clearButton: {
    padding: 4,
  },
  filterButton: {
    width: 48,
    height: 48,
    borderRadius: BorderRadius.full,
    backgroundColor: Colors.surfaceContainerLow,
    borderWidth: 1,
    borderColor: Colors.surfaceContainerHigh,
    alignItems: 'center',
    justifyContent: 'center',
  },
});

export default SearchBar;
