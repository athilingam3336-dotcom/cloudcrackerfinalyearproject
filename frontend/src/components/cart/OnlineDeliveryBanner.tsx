import React from 'react';
import { View, Text, StyleSheet, Image, ViewStyle } from 'react-native';
import { Colors } from '@/constants/colors';
import { Typography } from '@/constants/typography';
import { BorderRadius } from '@/constants/spacing';
import { formatCurrency } from '@/utils/currency';

interface OnlineDeliveryBannerProps {
  subtotal: number;
  minAmount: number;
  style?: ViewStyle;
}

export const OnlineDeliveryBanner: React.FC<OnlineDeliveryBannerProps> = ({
  subtotal,
  minAmount = 5000,
  style,
}) => {
  const isUnlocked = subtotal >= minAmount;
  const neededDiff = Math.max(0, minAmount - subtotal);
  const formattedMin = formatCurrency(minAmount, { hideDecimalsIfWhole: true });
  const formattedDiff = formatCurrency(neededDiff, { hideDecimalsIfWhole: true });

  return (
    <View style={[styles.mainCardContainer, style]}>
      {/* Banner Graphic Header Row with Yellow Kurta Kid Mascot */}
      <View style={styles.bannerContentRow}>
        {/* Yellow Kurta Kid Sparkler & Gifts Mascot Image */}
        <Image
          source={require('../../../assets/yellow_kurta_kid_mascot.png')}
          style={styles.mascotImage}
          resizeMode="contain"
        />

        <View style={styles.textContainer}>
          <Text style={styles.bannerTitle}>
            {isUnlocked ? 'You unlocked' : 'Unlock'}
          </Text>
          <Text style={styles.bannerHighlightTitle}>
            Online Delivery!
          </Text>
          <Text style={styles.bannerSubtitle}>
            Orders{' '}
            <Text style={styles.redHighlightAmount}>{formattedMin}+</Text>
            {' '}can be delivered to your doorstep.
          </Text>

          <View style={styles.actionPill}>
            <Text style={styles.actionPillIcon}>🚚</Text>
            <Text style={styles.actionPillText}>
              {isUnlocked ? 'Enjoy convenient home delivery →' : `Home delivery at ${formattedMin}+ →`}
            </Text>
          </View>
        </View>
      </View>

      {/* Dynamic Calculation Status Bar */}
      <View style={[styles.statusBar, isUnlocked ? styles.unlockedBar : styles.lockedBar]}>
        <Text style={styles.statusBarIcon}>{isUnlocked ? '🎉' : '🚚'}</Text>
        <Text style={[styles.statusBarText, isUnlocked ? styles.unlockedText : styles.lockedText]}>
          {isUnlocked
            ? `Online Delivery Unlocked! (${formatCurrency(subtotal, { hideDecimalsIfWhole: true })} ≥ ${formattedMin})`
            : `Add ${formattedDiff} more for doorstep delivery (${formattedMin}+ min).`}
        </Text>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  mainCardContainer: {
    width: '100%',
    borderRadius: BorderRadius.xl,
    overflow: 'hidden',
    marginBottom: 16,
    backgroundColor: '#FFF8E1', // Warm soft golden yellow background
    borderWidth: 1.5,
    borderColor: '#FFE082',
    shadowColor: '#FFE082',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 8,
    elevation: 2,
  },
  bannerContentRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 14,
    paddingHorizontal: 16,
    gap: 14,
  },
  mascotImage: {
    width: 110,
    height: 105,
  },
  textContainer: {
    flex: 1,
  },
  bannerTitle: {
    ...Typography.bodyMd,
    fontSize: 13,
    fontFamily: 'Inter-Bold',
    color: '#5D4037',
  },
  bannerHighlightTitle: {
    ...Typography.headlineLg,
    fontSize: 22,
    fontFamily: 'Inter-ExtraBold',
    color: '#C62828', // Deep Red Highlight
    marginTop: -2,
    marginBottom: 2,
  },
  bannerSubtitle: {
    ...Typography.bodyMd,
    fontSize: 13,
    color: '#4E342E',
    marginBottom: 10,
    lineHeight: 18,
  },
  redHighlightAmount: {
    fontFamily: 'Inter-ExtraBold',
    fontWeight: '800',
    color: '#D5342E', // Prominent Red Color
    fontSize: 14,
  },
  actionPill: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#C62828',
    paddingVertical: 6,
    paddingHorizontal: 14,
    borderRadius: 20,
    alignSelf: 'flex-start',
    gap: 6,
  },
  actionPillIcon: {
    fontSize: 12,
  },
  actionPillText: {
    ...Typography.labelLg,
    fontSize: 12,
    fontFamily: 'Inter-Bold',
    color: '#FFFFFF',
  },
  statusBar: {
    width: '100%',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 9,
    paddingHorizontal: 14,
    gap: 6,
  },
  unlockedBar: {
    backgroundColor: '#E8F5E9',
    borderTopWidth: 1,
    borderTopColor: '#C8E6C9',
  },
  lockedBar: {
    backgroundColor: '#FFF3E0',
    borderTopWidth: 1,
    borderTopColor: '#FFE0B2',
  },
  statusBarIcon: {
    fontSize: 14,
  },
  statusBarText: {
    ...Typography.labelLg,
    fontSize: 12,
    fontFamily: 'Inter-Bold',
  },
  unlockedText: {
    color: '#2E7D32',
  },
  lockedText: {
    color: '#E65100',
  },
});





