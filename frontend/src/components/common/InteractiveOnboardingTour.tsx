/**
 * InteractiveOnboardingTour.tsx
 *
 * Authentic Guided Product Walkthrough for Meera Crackers (CloudCrackers)
 * Styled in the interactive walkthrough pattern of Zoho Catalyst, Canva,
 * Trello, Slack, Notion, and HubSpot:
 *
 * 1. Element Spotlight: Dimmed backdrop with an exact cutout highlight frame
 *    and glowing red pulse around the live UI element.
 * 2. Directional Pointer Arrow (▲ / ▼): A crisp arrow attached to the tooltip
 *    card pointing directly at the target element (e.g., Notification Bell).
 * 3. Step-by-Step Flow:
 *    - Customer: Home -> Categories -> Search & Filter -> Cart -> Notification Bell -> Profile
 *    - Admin: Dashboard -> Notification Bell -> Promote Admin -> Reset Store Data -> Today's Sales -> AI Analytics
 * 4. Smooth Auto-Scroll: Automatically brings off-screen elements into view.
 * 5. Controls: [ ← Back ], [ Next Step → ], [ Finish Tour 🎉 ], [ Skip Tour ✕ ].
 * 6. Persistence: Saves completion status to PostgreSQL/MongoDB database & Zustand store.
 * 7. Restartable: Can be relaunched anytime via "Take a Tour" in Profile/Help or Admin Header.
 */

import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  TouchableOpacity,
  useWindowDimensions,
  Platform,
} from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { useAuthStore } from '@/store/authStore';

const BRAND_RED = '#990000';
const ACCENT_RED = '#DC2626';

export interface TourStep {
  targetId: string;
  title: string;
  targetMenu: string;
  icon: keyof typeof MaterialIcons.glyphMap;
  description: string;
  highlightText: string;
  badge: string;
}

const CUSTOMER_TOUR_STEPS: TourStep[] = [
  {
    targetId: 'tour-target-home',
    title: 'Festival Fireworks Home',
    targetMenu: 'Home Showcase',
    icon: 'storefront',
    badge: '1. Home',
    highlightText: 'Direct Sivakasi Factory Deals',
    description:
      'Welcome to Meera Crackers! Jump straight back to our Sivakasi fireworks showcase, trending combo packs, and real-time festival discounts right on our front page.',
  },
  {
    targetId: 'tour-target-categories',
    title: 'Pyrotechnic Categories',
    targetMenu: 'Product Categories',
    icon: 'category',
    badge: '2. Categories',
    highlightText: 'Browse 30+ Pyrotechnic Collections',
    description:
      'Easily navigate between Sparklers, Ground Chakkars, Flower Pots, Atom Bombs, Sky Rockets, and Grand Family Gift Boxes suited for every celebration.',
  },
  {
    targetId: 'tour-target-search',
    title: 'Search & Smart Filters',
    targetMenu: 'Search and Filters',
    icon: 'search',
    badge: '3. Search & Filter',
    highlightText: 'Find Your Favorite Firework Instantly',
    description:
      'Search by cracker name, filter by sound level (low/high), family safety rating, or price to find the exact fireworks you want in seconds.',
  },
  {
    targetId: 'tour-target-cart',
    title: 'Shopping Cart & Savings',
    targetMenu: 'Shopping Cart',
    icon: 'shopping-cart',
    badge: '4. Cart & Savings',
    highlightText: 'Instant Stock & Promo Coupons',
    description:
      'Review your items, apply festival discount coupons, view direct Sivakasi wholesale savings, and choose between Store Pickup or Express Delivery.',
  },
  {
    targetId: 'tour-target-bell',
    title: 'Notification Bell & Live Alerts',
    targetMenu: 'Notification Bell',
    icon: 'notifications-active',
    badge: '5. Real-Time Alerts',
    highlightText: 'Order Tracking & Flash Deals',
    description:
      'Stay updated in real-time! Click here to receive instant updates on order packing, transport dispatch tracking, payment confirmations, and flash festival deals.',
  },
  {
    targetId: 'tour-target-profile',
    title: 'My Profile & Walkthrough Help',
    targetMenu: 'My Profile & Help',
    icon: 'person',
    badge: '6. My Profile',
    highlightText: 'Delivery Addresses & Support',
    description:
      'Manage multiple delivery addresses, save contact details, download invoices, or replay this interactive guided walkthrough anytime from the Help section.',
  },
];

const ADMIN_TOUR_STEPS: TourStep[] = [
  {
    targetId: 'tour-target-admin-panel',
    title: 'Admin Command Center',
    targetMenu: 'Dashboard Header',
    icon: 'dashboard',
    badge: '1. Dashboard',
    highlightText: 'Real-time Financial & Store Analytics',
    description:
      'Welcome to the Command Center! Monitor real-time daily revenue, live customer orders, today’s turnover, and top location sales across Tamil Nadu.',
  },
  {
    targetId: 'tour-target-bell',
    title: 'Admin Notification Bell',
    targetMenu: 'Notification Bell',
    icon: 'notifications-active',
    badge: '2. Admin Alerts',
    highlightText: 'Instant Booking & Payment Notices',
    description:
      'Stay on top of store events! Get instant alerts when customers place new Diwali orders, complete UPI payments, or when critical cracker stock runs low.',
  },
  {
    targetId: 'tour-target-promote-admin',
    title: 'Promote / Add Administrator',
    targetMenu: 'Promote Admin Button',
    icon: 'person-add-alt-1',
    badge: '3. Security Delegation',
    highlightText: 'Dual-Admin OTP Authorization',
    description:
      'Safely delegate administrative powers. High security feature requiring dual OTP authorization from existing admins before high-privilege access is granted.',
  },
  {
    targetId: 'tour-target-reset-data',
    title: 'Reset Store Data',
    targetMenu: 'Reset Store Data',
    icon: 'security',
    badge: '4. Store Maintenance',
    highlightText: 'Dual-Admin Security Tool',
    description:
      'Safely wipe test orders, purge demo transactions, or restore baseline factory inventory without touching sensitive system configurations.',
  },
  {
    targetId: 'tour-target-sales-card',
    title: 'Today’s Live Turnover KPI',
    targetMenu: 'Sales KPI Card',
    icon: 'trending-up',
    badge: '5. Real-Time Sales',
    highlightText: 'Real-time Financial Stats',
    description:
      'Track gross sales, active order count, paid revenue breakdowns, and pending amounts updating live from real database transactions.',
  },
  {
    targetId: 'tour-target-ai-analytics',
    title: '4 AI Analytics & Insights',
    targetMenu: 'AI / ML Insights',
    icon: 'insights',
    badge: '6. Machine Learning',
    highlightText: 'K-Means, Apriori, IQR, Regression',
    description:
      'Explore Customer Segmentation (K-Means), Product Associations (Apriori), Unusual Order Detection (IQR), and Festive Sales Forecasting (Linear Regression).',
  },
];

interface ElementRect {
  top: number;
  left: number;
  width: number;
  height: number;
  bottom: number;
  right: number;
}

interface InteractiveOnboardingTourProps {
  visible: boolean;
  role?: 'user' | 'admin' | string;
  onFinish?: () => void;
  onSkip?: () => void;
}

export const InteractiveOnboardingTour: React.FC<InteractiveOnboardingTourProps> = ({
  visible,
  role = 'user',
  onFinish,
  onSkip,
}) => {
  const { width: windowWidth, height: windowHeight } = useWindowDimensions();
  const isDesktop = windowWidth >= 768;
  const completeOnboarding = useAuthStore((state) => state.completeOnboarding);

  const isAdmin = String(role).toLowerCase() === 'admin';
  const steps = isAdmin ? ADMIN_TOUR_STEPS : CUSTOMER_TOUR_STEPS;
  const [currentStepIndex, setCurrentStepIndex] = useState(0);
  const [targetRect, setTargetRect] = useState<ElementRect | null>(null);

  const currentStep = steps[currentStepIndex];
  const isFirstStep = currentStepIndex === 0;
  const isLastStep = currentStepIndex === steps.length - 1;

  // DOM Query and Target Position Measurement
  const measureTarget = useCallback((targetId: string) => {
    if (Platform.OS !== 'web' || typeof document === 'undefined') {
      setTargetRect(null);
      return;
    }

    const el =
      document.getElementById(targetId) ||
      document.querySelector(`[nativeid="${targetId}"]`) ||
      document.querySelector(`[nativeID="${targetId}"]`) ||
      document.querySelector(`[data-testid="${targetId}"]`);

    if (el) {
      const rect = el.getBoundingClientRect();
      // If target is off-viewport, smoothly scroll into view
      if (rect.top < 60 || rect.bottom > window.innerHeight - 60) {
        try {
          el.scrollIntoView({ behavior: 'smooth', block: 'center', inline: 'nearest' });
        } catch {}
      }

      setTargetRect({
        top: rect.top,
        left: rect.left,
        width: rect.width,
        height: rect.height,
        bottom: rect.bottom,
        right: rect.right,
      });
    } else {
      setTargetRect(null);
    }
  }, []);

  useEffect(() => {
    if (!visible) {
      setCurrentStepIndex(0);
      setTargetRect(null);
      return;
    }

    measureTarget(currentStep.targetId);

    // Re-check target position after smooth scroll settles
    const timer = setTimeout(() => {
      measureTarget(currentStep.targetId);
    }, 240);

    const handleWindowChange = () => {
      measureTarget(currentStep.targetId);
    };

    if (Platform.OS === 'web' && typeof window !== 'undefined') {
      window.addEventListener('resize', handleWindowChange);
      window.addEventListener('scroll', handleWindowChange, true);
    }

    return () => {
      clearTimeout(timer);
      if (Platform.OS === 'web' && typeof window !== 'undefined') {
        window.removeEventListener('resize', handleWindowChange);
        window.removeEventListener('scroll', handleWindowChange, true);
      }
    };
  }, [visible, currentStepIndex, currentStep.targetId, measureTarget]);

  if (!visible) return null;

  const handleNext = () => {
    if (isLastStep) {
      handleComplete();
    } else {
      setCurrentStepIndex((prev) => Math.min(steps.length - 1, prev + 1));
    }
  };

  const handleBack = () => {
    setCurrentStepIndex((prev) => Math.max(0, prev - 1));
  };

  const handleComplete = async () => {
    try {
      await completeOnboarding();
    } catch {}
    if (onFinish) onFinish();
  };

  const handleSkip = async () => {
    try {
      await completeOnboarding();
    } catch {}
    if (onSkip) onSkip();
    else if (onFinish) onFinish();
  };

  // Geometric calculations for Card Popover & Arrow Anchor
  const cardWidth = isDesktop ? 400 : Math.min(windowWidth - 32, 360);
  const estimatedCardHeight = 270;

  let placement: 'top' | 'bottom' | 'center' = 'center';
  let cardTop = Math.max(20, (windowHeight - estimatedCardHeight) / 2);
  let cardLeft = Math.max(16, (windowWidth - cardWidth) / 2);
  let arrowLeft = cardWidth / 2 - 10;
  const hasTarget = targetRect !== null && Platform.OS === 'web';

  if (hasTarget && targetRect) {
    const targetCenterX = targetRect.left + targetRect.width / 2;
    const spaceBelow = windowHeight - targetRect.bottom;
    const spaceAbove = targetRect.top;

    if (spaceBelow >= estimatedCardHeight + 20 || spaceBelow >= spaceAbove) {
      placement = 'bottom';
      cardTop = targetRect.bottom + 14;
    } else {
      placement = 'top';
      cardTop = Math.max(16, targetRect.top - estimatedCardHeight - 14);
    }

    // Clamp horizontally so card is completely visible on screen
    cardLeft = Math.max(16, Math.min(windowWidth - cardWidth - 16, targetCenterX - cardWidth / 2));

    // Arrow points dead-center to the target element
    arrowLeft = Math.max(24, Math.min(cardWidth - 44, targetCenterX - cardLeft - 10));
  }

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={handleSkip}
    >
      <View style={[styles.rootContainer, !hasTarget && styles.fallbackOverlay]}>
        {/* 1. Zoho / Canva / Shepherd Style Spotlight Cutout Frame */}
        {hasTarget && targetRect && (
          <View
            pointerEvents="none"
            style={[
              styles.spotlightHighlight,
              {
                top: Math.max(0, targetRect.top - 6),
                left: Math.max(0, targetRect.left - 6),
                width: targetRect.width + 12,
                height: targetRect.height + 12,
                borderRadius: Math.min(16, (targetRect.height + 12) / 2),
              },
            ]}
          >
            {/* Pulsing Target Dot Indicator */}
            <View style={styles.targetPulseDot} />
          </View>
        )}

        {/* 2. Interactive Tooltip Popover Card */}
        <View
          style={[
            styles.tooltipCard,
            {
              width: cardWidth,
              top: cardTop,
              left: cardLeft,
            },
          ]}
        >
          {/* Directional Pointer Arrow (Pointing UP at element if card is below) */}
          {hasTarget && placement === 'bottom' && (
            <View style={[styles.arrowUp, { left: arrowLeft }]} />
          )}

          {/* Directional Pointer Arrow (Pointing DOWN at element if card is above) */}
          {hasTarget && placement === 'top' && (
            <View style={[styles.arrowDown, { left: arrowLeft }]} />
          )}

          {/* Card Header: Role Badge + Step Counter + Close */}
          <View style={styles.cardHeader}>
            <View style={styles.roleBadge}>
              <MaterialIcons
                name={isAdmin ? 'admin-panel-settings' : 'celebration'}
                size={14}
                color={BRAND_RED}
              />
              <Text style={styles.roleBadgeText}>
                {isAdmin ? 'ADMIN TOUR' : 'CUSTOMER GUIDE'}
              </Text>
            </View>

            <View style={styles.stepProgressPill}>
              <Text style={styles.stepProgressText}>
                Step {currentStepIndex + 1} of {steps.length}
              </Text>
            </View>

            <TouchableOpacity
              style={styles.skipBtn}
              onPress={handleSkip}
              activeOpacity={0.7}
              hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
            >
              <Text style={styles.skipBtnText}>Skip</Text>
              <MaterialIcons name="close" size={16} color="#64748B" />
            </TouchableOpacity>
          </View>

          {/* Target Focus Banner */}
          <View style={styles.targetBanner}>
            <View style={styles.targetBannerLeft}>
              <View style={styles.iconCircle}>
                <MaterialIcons name={currentStep.icon} size={20} color="#FFFFFF" />
              </View>
              <View>
                <Text style={styles.targetBannerSmall}>SPOTLIGHT TARGET</Text>
                <Text style={styles.targetBannerName} numberOfLines={1}>
                  {currentStep.targetMenu}
                </Text>
              </View>
            </View>
            <View style={styles.highlightBadge}>
              <MaterialIcons name="bolt" size={13} color={BRAND_RED} />
              <Text style={styles.highlightBadgeText}>{currentStep.highlightText}</Text>
            </View>
          </View>

          {/* Main Content Body */}
          <View style={styles.contentBody}>
            <Text style={styles.titleText}>{currentStep.title}</Text>
            <Text style={styles.descriptionText}>{currentStep.description}</Text>
          </View>

          {/* Progress Indicators & Action Buttons */}
          <View style={styles.cardFooter}>
            {/* Step Dots */}
            <View style={styles.dotsContainer}>
              {steps.map((_, idx) => (
                <View
                  key={idx}
                  style={[
                    styles.dot,
                    idx === currentStepIndex && styles.dotActive,
                    idx < currentStepIndex && styles.dotDone,
                  ]}
                />
              ))}
            </View>

            {/* Back & Next / Finish Buttons */}
            <View style={styles.actionButtonsRow}>
              <TouchableOpacity
                style={[styles.backButton, isFirstStep && styles.backButtonDisabled]}
                onPress={handleBack}
                disabled={isFirstStep}
                activeOpacity={0.8}
              >
                <MaterialIcons
                  name="arrow-back"
                  size={16}
                  color={isFirstStep ? '#CBD5E1' : '#475569'}
                />
                <Text style={[styles.backButtonText, isFirstStep && styles.backButtonTextDisabled]}>
                  Back
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.primaryButton}
                onPress={handleNext}
                activeOpacity={0.88}
              >
                <Text style={styles.primaryButtonText}>
                  {isLastStep ? 'Finish Tour 🎉' : 'Next Step'}
                </Text>
                <MaterialIcons
                  name={isLastStep ? 'done-all' : 'arrow-forward'}
                  size={16}
                  color="#FFFFFF"
                />
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  rootContainer: {
    flex: 1,
    position: 'relative',
  },
  fallbackOverlay: {
    backgroundColor: 'rgba(15, 23, 42, 0.76)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  // Zoho Catalyst / Canva Style Cutout Frame
  spotlightHighlight: {
    position: 'absolute',
    borderWidth: 2.5,
    borderColor: '#EF4444',
    zIndex: 999990,
    ...(Platform.OS === 'web'
      ? ({
          boxShadow:
            '0 0 0 9999px rgba(15, 23, 42, 0.78), 0 0 24px rgba(239, 68, 68, 0.85), inset 0 0 12px rgba(239, 68, 68, 0.25)',
          transition: 'all 0.28s cubic-bezier(0.16, 1, 0.3, 1)',
        } as any)
      : {}),
  },
  targetPulseDot: {
    position: 'absolute',
    top: -5,
    right: -5,
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: '#EF4444',
    borderWidth: 1.5,
    borderColor: '#FFFFFF',
  },
  // Floating Tooltip Card
  tooltipCard: {
    position: 'absolute',
    backgroundColor: '#FFFFFF',
    borderRadius: 18,
    padding: 20,
    zIndex: 999999,
    borderWidth: 1.5,
    borderColor: '#FECACA',
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 16 },
    shadowOpacity: 0.3,
    shadowRadius: 28,
    elevation: 28,
    gap: 14,
    ...(Platform.OS === 'web'
      ? ({
          boxShadow: '0 20px 40px -10px rgba(0, 0, 0, 0.35), 0 0 1px 1px rgba(220, 38, 38, 0.2)',
          transition: 'all 0.28s cubic-bezier(0.16, 1, 0.3, 1)',
        } as any)
      : {}),
  },
  // Upward Arrow Triangle (Pointing to element above tooltip)
  arrowUp: {
    position: 'absolute',
    top: -10,
    width: 0,
    height: 0,
    borderLeftWidth: 10,
    borderLeftColor: 'transparent',
    borderRightWidth: 10,
    borderRightColor: 'transparent',
    borderBottomWidth: 10,
    borderBottomColor: '#FFFFFF',
    borderStyle: 'solid',
    zIndex: 1000000,
    ...(Platform.OS === 'web'
      ? ({
          filter: 'drop-shadow(0 -3px 3px rgba(0,0,0,0.12))',
        } as any)
      : {}),
  },
  // Downward Arrow Triangle (Pointing to element below tooltip)
  arrowDown: {
    position: 'absolute',
    bottom: -10,
    width: 0,
    height: 0,
    borderLeftWidth: 10,
    borderLeftColor: 'transparent',
    borderRightWidth: 10,
    borderRightColor: 'transparent',
    borderTopWidth: 10,
    borderTopColor: '#FFFFFF',
    borderStyle: 'solid',
    zIndex: 1000000,
    ...(Platform.OS === 'web'
      ? ({
          filter: 'drop-shadow(0 3px 3px rgba(0,0,0,0.12))',
        } as any)
      : {}),
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
    paddingBottom: 10,
  },
  roleBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    backgroundColor: '#FEF2F2',
    borderWidth: 1,
    borderColor: '#FECACA',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 12,
  },
  roleBadgeText: {
    fontSize: 10.5,
    fontWeight: '800',
    color: BRAND_RED,
    letterSpacing: 0.5,
  },
  stepProgressPill: {
    backgroundColor: '#F8FAFC',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 10,
  },
  stepProgressText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#475569',
  },
  skipBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    padding: 3,
  },
  skipBtnText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#64748B',
  },
  targetBanner: {
    backgroundColor: '#FFF5F5',
    borderWidth: 1,
    borderColor: '#FCA5A5',
    borderRadius: 12,
    padding: 10,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 8,
  },
  targetBannerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    flex: 1,
  },
  iconCircle: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: BRAND_RED,
    justifyContent: 'center',
    alignItems: 'center',
  },
  targetBannerSmall: {
    fontSize: 9,
    fontWeight: '800',
    color: '#DC2626',
    letterSpacing: 0.5,
  },
  targetBannerName: {
    fontSize: 13.5,
    fontWeight: '800',
    color: '#0F172A',
  },
  highlightBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#FECACA',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 12,
  },
  highlightBadgeText: {
    fontSize: 10,
    fontWeight: '700',
    color: BRAND_RED,
  },
  contentBody: {
    gap: 6,
  },
  titleText: {
    fontSize: 15.5,
    fontWeight: '800',
    color: '#0F172A',
    lineHeight: 20,
  },
  descriptionText: {
    fontSize: 12.5,
    color: '#475569',
    lineHeight: 18,
    fontWeight: '500',
  },
  cardFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderTopWidth: 1,
    borderTopColor: '#F1F5F9',
    paddingTop: 12,
    marginTop: 4,
  },
  dotsContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  dot: {
    width: 7,
    height: 7,
    borderRadius: 3.5,
    backgroundColor: '#E2E8F0',
  },
  dotActive: {
    width: 18,
    height: 7,
    borderRadius: 3.5,
    backgroundColor: BRAND_RED,
  },
  dotDone: {
    backgroundColor: '#F87171',
  },
  actionButtonsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  backButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 10,
    backgroundColor: '#F1F5F9',
  },
  backButtonDisabled: {
    opacity: 0.45,
  },
  backButtonText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#334155',
  },
  backButtonTextDisabled: {
    color: '#94A3B8',
  },
  primaryButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: BRAND_RED,
    paddingHorizontal: 14,
    paddingVertical: 7,
    borderRadius: 10,
    shadowColor: BRAND_RED,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 8,
    elevation: 3,
  },
  primaryButtonText: {
    fontSize: 12.5,
    fontWeight: '700',
    color: '#FFFFFF',
  },
});

export default InteractiveOnboardingTour;
