import React from 'react';
import { View, Text, TouchableOpacity, Image, StyleSheet } from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { Colors } from '@/constants/colors';
import { Typography } from '@/constants/typography';
import { useAppLayout } from '@/hooks/useAppLayout';

import { useCartStore } from '@/store/cartStore';

export type TabRoute = 'Home' | 'Categories' | 'Cart' | 'Wishlist' | 'Profile';

interface BottomNavBarProps {
  activeTab: TabRoute;
  onTabPress: (tab: TabRoute) => void;
}

const TABS: { id: TabRoute; label: string; icon: keyof typeof MaterialIcons.glyphMap }[] = [
  { id: 'Home', label: 'Home', icon: 'home' },
  { id: 'Categories', label: 'Categories', icon: 'grid-view' },
  { id: 'Cart', label: 'Cart', icon: 'shopping-cart' },
  { id: 'Wishlist', label: 'Wishlist', icon: 'favorite' },
  { id: 'Profile', label: 'Profile', icon: 'person' },
];

export const BottomNavBar: React.FC<BottomNavBarProps> = React.memo(
  ({ activeTab, onTabPress }) => {
    const { isDesktopWeb } = useAppLayout();
    const cartCount = useCartStore((state) => state.getItemCount());

    // HIDE BottomNavBar completely on Desktop Web browser
    if (isDesktopWeb) {
      return null;
    }

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
              <View style={{ position: 'relative' }}>
                <MaterialIcons
                  name={tab.icon}
                  size={22}
                  color={isActive ? Colors.primary : Colors.tertiary}
                />
                {tab.id === 'Cart' && cartCount > 0 && (
                  <View style={styles.badge}>
                    <Text style={styles.badgeText}>{cartCount > 99 ? '99+' : cartCount}</Text>
                  </View>
                )}
              </View>
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
    height: 58,
    backgroundColor: Colors.surface,
    borderTopWidth: 1,
    borderTopColor: Colors.surfaceContainerHigh,
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 4,
    elevation: 8,
    shadowColor: Colors.shadowColor,
    shadowOffset: { width: 0, height: -3 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    width: '100%',
  },
  tabButton: {
    flex: 1,
    maxWidth: '20%',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 4,
    borderRadius: 8,
  },
  activeTabButton: {
    backgroundColor: Colors.surfaceContainerLow,
  },
  tabLabel: {
    ...Typography.labelLg,
    fontSize: 10,
    marginTop: 2,
    textAlign: 'center',
  },
  activeTabLabel: {
    fontFamily: 'Inter-Bold',
  },
  badge: {
    position: 'absolute',
    top: -4,
    right: -10,
    backgroundColor: '#D32F2F',
    borderRadius: 9,
    minWidth: 16,
    height: 16,
    paddingHorizontal: 3,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1.5,
    borderColor: Colors.surface,
  },
  badgeText: {
    color: '#ffffff',
    fontSize: 9,
    fontFamily: 'Inter-Bold',
    lineHeight: 11,
  },
});

export default BottomNavBar;
