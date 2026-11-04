/**
 * HomeAnnouncementPopupModal.tsx
 *
 * Automatic High-Impact Announcement & Festive Notice Popup for Home Page:
 * - Appears when customer visits home page if enabled by Admin.
 * - Displays festive fireworks image, urgent delivery notices (e.g. Diwali booking deadline),
 *   or special festival offers.
 * - Admin can enable/disable, change title, message, and image from Admin Panel.
 * - Responsive on both Mobile and Desktop.
 */

import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  TouchableOpacity,
  TouchableWithoutFeedback,
  Image,
  useWindowDimensions,
  Platform,
} from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { useSettingsStore } from '@/store/settingsStore';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { RootStackParamList } from '@/navigation/types';

// Preset banner images from assets
const BANNER_IMAGES: Record<string, any> = {
  diwali: require('../../../assets/theri_diwali.jpg'),
  delivery: require('../../../assets/online_delivery_banner.png'),
  giftbox: require('../../../assets/products/grand_festival_gift_box.png'),
};

const BRAND_RED = '#990000';
const ACCENT_RED = '#DC2626';

// Module-level session memory:
// Persists while browsing across pages in the website/app.
// Automatically resets ONLY when the user refreshes the page (F5 / browser reload) or restarts the app.
let hasDismissedInCurrentSession = false;

export const resetAnnouncementSession = () => {
  hasDismissedInCurrentSession = false;
};

export const HomeAnnouncementPopupModal: React.FC = () => {
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const { width: windowWidth, height: windowHeight } = useWindowDimensions();
  const isDesktop = windowWidth >= 768;

  const {
    popupEnabled,
    popupTitle,
    popupMessage,
    popupImageType,
    popupImageUrl,
    popupButtonText,
    popupButtonLink,
    fetchSettings,
  } = useSettingsStore();

  const [dismissed, setDismissed] = useState(hasDismissedInCurrentSession);

  useEffect(() => {
    fetchSettings();
  }, [fetchSettings]);

  // If disabled by Admin in settings or already dismissed by user in this session, do not render
  if (!popupEnabled || dismissed || hasDismissedInCurrentSession) {
    return null;
  }

  const handleAction = () => {
    hasDismissedInCurrentSession = true;
    setDismissed(true);
    const targetLink = (popupButtonLink || 'Categories').toLowerCase();
    if (targetLink.includes('cart')) {
      navigation.navigate('Cart');
    } else if (targetLink.includes('order')) {
      navigation.navigate('Categories');
    } else {
      navigation.navigate('Categories');
    }
  };

  const handleClose = () => {
    hasDismissedInCurrentSession = true;
    setDismissed(true);
  };

  // Determine active image source
  let imageSource = BANNER_IMAGES.diwali;
  if (popupImageType === 'delivery') {
    imageSource = BANNER_IMAGES.delivery;
  } else if (popupImageType === 'giftbox') {
    imageSource = BANNER_IMAGES.giftbox;
  } else if (popupImageType === 'custom' && popupImageUrl && popupImageUrl.trim().length > 0) {
    imageSource = { uri: popupImageUrl.trim() };
  }

  const cardWidth = isDesktop ? 460 : Math.min(windowWidth - 32, 390);

  return (
    <Modal
      visible={true}
      transparent
      animationType="fade"
      onRequestClose={handleClose}
    >
      <TouchableOpacity
        style={styles.modalOverlay}
        activeOpacity={1}
        onPress={handleClose}
      >
        <TouchableWithoutFeedback>
          <View style={[styles.popupCard, { width: cardWidth }]}>
            {/* Top Banner Image with Close Button Overlay */}
            <View style={styles.imageWrapper}>
              <Image
                source={imageSource}
                style={styles.bannerImage}
                resizeMode="cover"
              />
              {/* Dark gradient overlay for text readability */}
              <View style={styles.imageOverlayGradient} />

              {/* Top Close Button */}
              <TouchableOpacity
                style={styles.floatingCloseBtn}
                onPress={handleClose}
                activeOpacity={0.8}
                hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
              >
                <MaterialIcons name="close" size={20} color="#FFFFFF" />
              </TouchableOpacity>

              {/* Festive Floating Badge */}
              <View style={styles.badgeContainer}>
                <MaterialIcons name="campaign" size={14} color="#FFFFFF" />
                <Text style={styles.badgeText}>FESTIVE STORE NOTICE</Text>
              </View>
            </View>

            {/* Body Content */}
            <View style={styles.contentBody}>
              {/* Notice Title */}
              <Text style={styles.popupTitleText}>{popupTitle}</Text>

              {/* Notice Message */}
              <Text style={styles.popupMessageText}>{popupMessage}</Text>

              {/* Transport / Safety Pill */}
              <View style={styles.benefitPill}>
                <MaterialIcons name="local-shipping" size={16} color="#DC2626" />
                <Text style={styles.benefitText}>
                  Express Sivakasi Factory Direct Lorry Transport Active
                </Text>
              </View>

              {/* Action Buttons */}
              <View style={styles.buttonsRow}>
                <TouchableOpacity
                  style={styles.actionBtn}
                  onPress={handleAction}
                  activeOpacity={0.88}
                >
                  <Text style={styles.actionBtnText}>{popupButtonText || 'Book Diwali Crackers Now ➔'}</Text>
                  <MaterialIcons name="arrow-forward" size={18} color="#FFFFFF" />
                </TouchableOpacity>

                <TouchableOpacity
                  style={styles.dismissBtn}
                  onPress={handleClose}
                  activeOpacity={0.7}
                >
                  <Text style={styles.dismissBtnText}>Continue Browsing</Text>
                </TouchableOpacity>
              </View>
            </View>
          </View>
        </TouchableWithoutFeedback>
      </TouchableOpacity>
    </Modal>
  );
};

const styles = StyleSheet.create({
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(15, 23, 42, 0.75)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 16,
    zIndex: 999999,
  },
  popupCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 22,
    overflow: 'hidden',
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 20 },
    shadowOpacity: 0.35,
    shadowRadius: 36,
    elevation: 28,
    borderWidth: 2,
    borderColor: '#FECACA',
  },
  imageWrapper: {
    width: '100%',
    height: 180,
    position: 'relative',
    backgroundColor: '#990000',
  },
  bannerImage: {
    width: '100%',
    height: '100%',
  },
  imageOverlayGradient: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.25)',
  },
  floatingCloseBtn: {
    position: 'absolute',
    top: 12,
    right: 12,
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: 'rgba(15, 23, 42, 0.65)',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 10,
  },
  badgeContainer: {
    position: 'absolute',
    bottom: 12,
    left: 14,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: BRAND_RED,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 3,
  },
  badgeText: {
    fontSize: 10.5,
    fontWeight: '800',
    color: '#FFFFFF',
    letterSpacing: 0.5,
  },
  contentBody: {
    padding: 20,
    gap: 12,
  },
  popupTitleText: {
    fontSize: 18,
    fontWeight: '800',
    color: '#0F172A',
    lineHeight: 24,
  },
  popupMessageText: {
    fontSize: 13,
    color: '#475569',
    lineHeight: 19,
    fontWeight: '500',
  },
  benefitPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: '#FEF2F2',
    borderWidth: 1,
    borderColor: '#FECACA',
    borderRadius: 10,
    paddingHorizontal: 10,
    paddingVertical: 7,
  },
  benefitText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#990000',
    flex: 1,
  },
  buttonsRow: {
    gap: 8,
    marginTop: 4,
  },
  actionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: BRAND_RED,
    paddingVertical: 12,
    borderRadius: 12,
    shadowColor: BRAND_RED,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 4,
  },
  actionBtnText: {
    fontSize: 14,
    fontWeight: '800',
    color: '#FFFFFF',
  },
  dismissBtn: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 8,
  },
  dismissBtnText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#64748B',
  },
});

export default HomeAnnouncementPopupModal;
