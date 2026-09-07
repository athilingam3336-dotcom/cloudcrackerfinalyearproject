import React from 'react';
import { View, StyleSheet, ViewStyle } from 'react-native';
import { useAppLayout } from '@/hooks/useAppLayout';
import { MAX_CONTENT_WIDTH } from '@/constants/responsive';
import { Colors } from '@/constants/colors';

interface ResponsiveContainerProps {
  children: React.ReactNode;
  maxWidth?: number;
  style?: ViewStyle;
  contentContainerStyle?: ViewStyle;
  fullWidthOnMobile?: boolean;
}

export const ResponsiveContainer: React.FC<ResponsiveContainerProps> = ({
  children,
  maxWidth = MAX_CONTENT_WIDTH,
  style,
  contentContainerStyle,
}) => {
  const { isDesktopWeb, isTabletWeb } = useAppLayout();

  const isCenteredWeb = isDesktopWeb || isTabletWeb;

  return (
    <View style={[styles.outerContainer, style]}>
      <View
        style={[
          styles.innerContainer,
          isCenteredWeb && { maxWidth, alignSelf: 'center', width: '100%' },
          contentContainerStyle,
        ]}
      >
        {children}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  outerContainer: {
    flex: 1,
    width: '100%',
    backgroundColor: Colors.background,
  },
  innerContainer: {
    flex: 1,
    width: '100%',
  },
});

export default ResponsiveContainer;
