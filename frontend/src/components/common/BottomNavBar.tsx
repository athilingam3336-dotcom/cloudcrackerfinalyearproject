import React from 'react';
import { View, Text, TouchableOpacity, Image, StyleSheet } from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { Colors } from '@/constants/colors';
import { Typography } from '@/constants/typography';
import { Spacing } from '@/constants/spacing';
import { LOCAL_PRODUCT_IMAGES } from '@/constants/productImages';

export type TabRoute = 'Home' | 'Categories' | 'Cart' | 'Wishlist' | 'Profile';

interface BottomNavBarProps {
  activeTab: TabRoute;
  onTabPress: (tab: TabRoute) => void;
}

const TABS: { id: TabRoute; label: string; icon: keyof typeof MaterialIcons.glyphMap; image?: any }[] = [
  { id: 'Home', label: 'Home', icon: 'home' },
  { id: 'Categories', label: 'Categories', icon: 'grid-view', image: LOCAL_PRODUCT_IMAGES.ROCKETS },
  { id: 'Cart', label: 'Cart', icon: 'shopping-cart' },
  { id: 'Wishlist', label: 'Wishlist', icon: 'favorite' },
  { id: 'Profile', label: 'Profile', icon: 'person' },
];

export const BottomNavBar: React.FC<BottomNavBarProps> = React.memo(
  ({ activeTab, onTabPress }) => {
    return (
      <View style={styles.container}>
        {TABS.map((tab) => {
          const isActive = activeTab === tab.id;
          return (
            <TouchableOpacity
              key={tab.id}
              style={[styles.tabButton, isActive && styles.activeTabButton]}
              onPress={() => onTabPress(tab.id)}
              activeOpacity={0.7}
            >
              {tab.image ? (
                <View style={[styles.imageWrapper, isActive && styles.activeImageWrapper]}>
                  <Image
                    source={tab.image}
                    style={styles.tabImage}
                    resizeMode="cover"
                  />
                </View>
              ) : (
                <MaterialIcons
                  name={tab.icon}
                  size={24}
                  color={isActive ? Colors.primary : Colors.tertiary}
                />
              )}
              <Text
                style={[
                  styles.tabLabel,
                  { color: isActive ? Colors.primary : Colors.tertiary },
                  isActive && styles.activeTabLabel,
                ]}
              >
                {tab.label}
              </Text>
            </TouchableOpacity>
          );
        })}
      </View>
    );
  }
);

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    height: 64,
    backgroundColor: Colors.surface,
    borderTopWidth: 1,
    borderTopColor: Colors.surfaceContainerHigh,
    alignItems: 'center',
    justifyContent: 'space-around',
    paddingHorizontal: Spacing.xs,
    elevation: 8,
    shadowColor: Colors.shadowColor,
    shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.08,
    shadowRadius: 10,
  },
  tabButton: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 6,
    paddingHorizontal: Spacing.xs,
    borderRadius: 8,
  },
  activeTabButton: {
    backgroundColor: Colors.surfaceContainerLow,
  },
  tabLabel: {
    ...Typography.labelLg,
    fontSize: 11,
    marginTop: 2,
  },
  activeTabLabel: {
    fontFamily: 'Inter-Bold',
  },
  imageWrapper: {
    width: 24,
    height: 24,
    borderRadius: 6,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: 'transparent',
  },
  activeImageWrapper: {
    borderColor: Colors.primary,
    borderWidth: 1.5,
  },
  tabImage: {
    width: '100%',
    height: '100%',
  },
});

export default BottomNavBar;
