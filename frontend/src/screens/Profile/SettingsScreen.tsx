import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Switch,
  TouchableOpacity,
  Modal,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { MaterialIcons } from '@expo/vector-icons';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { Colors } from '@/constants/colors';
import { Typography } from '@/constants/typography';
import { Spacing, BorderRadius } from '@/constants/spacing';
import { HomeHeader } from '@/components/common/HomeHeader';
import { BottomNavBar, TabRoute } from '@/components/common/BottomNavBar';
import { PrimaryButton } from '@/components/buttons/PrimaryButton';
import { RootStackParamList } from '@/navigation/types';
import { aboutService, AboutData } from '@/services/aboutService';

type SettingsScreenProps = NativeStackScreenProps<RootStackParamList, 'Settings'>;

export const SettingsScreen: React.FC<SettingsScreenProps> = ({ navigation }) => {
  const [promoNotifs, setPromoNotifs] = useState(true);
  const [orderNotifs, setOrderNotifs] = useState(true);

  // About configuration state
  const [aboutData, setAboutData] = useState<AboutData | null>(null);

  React.useEffect(() => {
    const fetchAbout = async () => {
      try {
        const data = await aboutService.getAbout();
        setAboutData(data);
      } catch (err) {
        // Safe fallback
      }
    };
    fetchAbout();
  }, []);

  // Modal dialog state
  const [modalTitle, setModalTitle] = useState('');
  const [modalBody, setModalBody] = useState('');
  const [isModalVisible, setIsModalVisible] = useState(false);

  const handleTabPress = useCallback(
    (tab: TabRoute) => {
      if (tab === 'Home') navigation.navigate('Home');
      else if (tab === 'Categories') navigation.navigate('Categories');
      else if (tab === 'Cart') navigation.navigate('Cart');
      else if (tab === 'Wishlist') navigation.navigate('Wishlist');
      else if (tab === 'Profile') navigation.navigate('UserProfile');
    },
    [navigation]
  );

  const showAboutModal = useCallback(() => {
    setModalTitle('About Meera Crackers');
    if (aboutData) {
      const sectionsStr = aboutData.sections
        .map((s) => `${s.title}\n${s.content}`)
        .join('\n\n');
      setModalBody(
        `Meera Crackers World ${aboutData.version} — ${aboutData.description || 'Fireworks Wholesale & Retailer'}\n\n` +
        sectionsStr + '\n\n' +
        '© 2026 MEERA CRACKERS WORLD. ALL RIGHTS RESERVED.'
      );
    } else {
      setModalBody(
        'Meera Crackers World v2.4.0 — Fireworks Wholesale & Retailer.\n\n' +
        '✨ 100% Legal & Sivakasi Certified Green Crackers.\n' +
        '📞 Cell: 7339624431, 94421 72314, 96268 24431\n' +
        '📧 Email: Meeracrackers@gmail.com\n' +
        '📜 Lic No: E/SC/TN/24/685 (E 54389)\n' +
        '📍 Location: https://maps.app.goo.gl/6BE5qX4vxyutrkAD6?g_st=aw\n\n' +
        '© 2026 MEERA CRACKERS WORLD. ALL RIGHTS RESERVED.'
      );
    }
    setIsModalVisible(true);
  }, [aboutData]);

  const showPrivacyModal = useCallback(() => {
    setModalTitle('Privacy Policy');
    setModalBody(
      'Your privacy and data security are our top priorities.\n\n' +
      '🔒 256-bit SSL encryption protects all your order, payment, and address data.\n' +
      '🛡️ We strictly never sell or share customer personal information with external advertisers.\n' +
      '📍 Location data is only used for calculating precise delivery routes and timings.'
    );
    setIsModalVisible(true);
  }, []);

  const showTermsModal = useCallback(() => {
    setModalTitle('Terms of Service');
    setModalBody(
      'By placing an order on Meera Crackers World, you acknowledge and agree that:\n\n' +
      '1. You are 18+ years of age.\n' +
      '2. You comply with all applicable local, municipal, and state pyrotechnic celebration guidelines.\n' +
      '3. Orders once packed undergo quality and compliance checks before dispatch.'
    );
    setIsModalVisible(true);
  }, []);

  return (
    <SafeAreaView style={styles.safeArea} edges={['top', 'left', 'right']}>
      <HomeHeader
        onBackPress={() => (navigation.canGoBack() ? navigation.goBack() : navigation.navigate('UserProfile'))}
        onNotificationPress={() => navigation.navigate('Notifications')}
        onProfilePress={() => navigation.navigate('UserProfile')}
        onCartPress={() => navigation.navigate('Cart')}
        notificationCount={3}
      />

      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        <View style={styles.titleSection}>
          <TouchableOpacity
            style={styles.inlineBackRow}
            onPress={() => (navigation.canGoBack() ? navigation.goBack() : navigation.navigate('UserProfile'))}
            activeOpacity={0.7}
          >
            <MaterialIcons name="arrow-back" size={20} color={Colors.primary} />
            <Text style={styles.inlineBackText}>Back</Text>
          </TouchableOpacity>
          <Text style={styles.title}>Settings</Text>
        </View>

        <View style={styles.settingsGroup}>
          <Text style={styles.groupHeader}>NOTIFICATIONS</Text>

          <View style={styles.settingCard}>
            <View style={styles.settingRow}>
              <View style={styles.settingTextContent}>
                <Text style={styles.settingTitle}>Promotions & Offers</Text>
                <Text style={styles.settingSubtitle}>
                  Get notified about seasonal firework sales and coupons
                </Text>
              </View>
              <Switch
                value={promoNotifs}
                onValueChange={setPromoNotifs}
                trackColor={{ false: Colors.surfaceContainerHigh, true: Colors.primary }}
              />
            </View>

            <View style={styles.divider} />

            <View style={styles.settingRow}>
              <View style={styles.settingTextContent}>
                <Text style={styles.settingTitle}>Order Updates</Text>
                <Text style={styles.settingSubtitle}>
                  Shipping alerts and hazmat delivery tracking confirmation
                </Text>
              </View>
              <Switch
                value={orderNotifs}
                onValueChange={setOrderNotifs}
                trackColor={{ false: Colors.surfaceContainerHigh, true: Colors.primary }}
              />
            </View>
          </View>
        </View>

        <View style={styles.settingsGroup}>
          <Text style={styles.groupHeader}>ABOUT & LEGAL</Text>

          <View style={styles.settingCard}>
            <TouchableOpacity style={styles.linkRow} onPress={showAboutModal} activeOpacity={0.8}>
              <Text style={styles.linkTitle}>About Meera Crackers</Text>
              <View style={styles.linkRight}>
                <Text style={styles.versionText}>{aboutData?.version || 'v2.4.0'}</Text>
                <MaterialIcons name="chevron-right" size={20} color={Colors.tertiary} />
              </View>
            </TouchableOpacity>

            <View style={styles.divider} />

            <TouchableOpacity style={styles.linkRow} onPress={showPrivacyModal} activeOpacity={0.8}>
              <Text style={styles.linkTitle}>Privacy Policy</Text>
              <MaterialIcons name="chevron-right" size={20} color={Colors.tertiary} />
            </TouchableOpacity>

            <View style={styles.divider} />

            <TouchableOpacity style={styles.linkRow} onPress={showTermsModal} activeOpacity={0.8}>
              <Text style={styles.linkTitle}>Terms of Service</Text>
              <MaterialIcons name="chevron-right" size={20} color={Colors.tertiary} />
            </TouchableOpacity>
          </View>
        </View>
      </ScrollView>

      <BottomNavBar activeTab="Profile" onTabPress={handleTabPress} />

      {/* Info & Legal Modal */}
      <Modal
        visible={isModalVisible}
        transparent
        animationType="fade"
        onRequestClose={() => setIsModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalCard}>
            <View style={styles.modalHeader}>
              <View style={styles.modalIconBox}>
                <MaterialIcons name="info" size={24} color={Colors.primary} />
              </View>
              <Text style={styles.modalTitleText}>{modalTitle}</Text>
            </View>

            <ScrollView style={styles.modalScrollView} showsVerticalScrollIndicator={false}>
              <Text style={styles.modalBodyText}>{modalBody}</Text>
            </ScrollView>

            <TouchableOpacity
              style={styles.modalCloseBtn}
              onPress={() => setIsModalVisible(false)}
              activeOpacity={0.8}
            >
              <Text style={styles.modalCloseBtnText}>Close</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  scrollContent: {
    paddingBottom: Spacing.xl,
  },
  titleSection: {
    paddingHorizontal: Spacing.marginMobile,
    marginTop: Spacing.sm,
    marginBottom: Spacing.xs,
  },
  inlineBackRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginBottom: Spacing.xs,
  },
  inlineBackText: {
    ...Typography.labelLg,
    fontSize: 13,
    fontFamily: 'Inter-Bold',
    color: Colors.primary,
  },
  title: {
    ...Typography.headlineLg,
    fontSize: 26,
    fontFamily: 'Inter-Bold',
    color: Colors.onSurface,
  },
  settingsGroup: {
    paddingHorizontal: Spacing.marginMobile,
    marginTop: Spacing.md,
  },
  groupHeader: {
    ...Typography.labelLg,
    fontSize: 10,
    fontFamily: 'Inter-Bold',
    color: Colors.tertiary,
    letterSpacing: 1,
    marginBottom: Spacing.xs,
    marginLeft: 4,
  },
  settingCard: {
    backgroundColor: Colors.surfaceContainerLowest,
    borderRadius: BorderRadius.xl,
    padding: Spacing.md,
    borderWidth: 1,
    borderColor: Colors.surfaceContainerHigh,
    shadowColor: Colors.shadowColor,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.06,
    shadowRadius: 10,
    elevation: 3,
  },
  settingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 4,
  },
  settingTextContent: {
    flex: 1,
    marginRight: Spacing.sm,
  },
  settingTitle: {
    ...Typography.titleLg,
    fontSize: 15,
    fontFamily: 'Inter-Bold',
    color: Colors.onSurface,
  },
  settingSubtitle: {
    ...Typography.bodyMd,
    fontSize: 12,
    color: Colors.onSurfaceVariant,
    marginTop: 2,
  },
  divider: {
    height: 1,
    backgroundColor: Colors.surfaceContainerHigh,
    marginVertical: Spacing.sm,
  },
  linkRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 4,
  },
  linkTitle: {
    ...Typography.titleLg,
    fontSize: 15,
    fontFamily: 'Inter-Bold',
    color: Colors.onSurface,
  },
  linkRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  versionText: {
    ...Typography.bodyMd,
    fontSize: 12,
    color: Colors.tertiary,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.6)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: Spacing.md,
  },
  modalCard: {
    width: '100%',
    maxWidth: 500,
    backgroundColor: Colors.surfaceContainerLowest,
    borderRadius: BorderRadius.xl,
    padding: Spacing.lg,
    maxHeight: '80%',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.25,
    shadowRadius: 20,
    elevation: 10,
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    marginBottom: Spacing.md,
  },
  modalIconBox: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: Colors.primaryFixed,
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalTitleText: {
    ...Typography.headlineLg,
    fontSize: 20,
    fontFamily: 'Inter-Bold',
    color: Colors.onSurface,
  },
  modalScrollView: {
    marginBottom: Spacing.lg,
  },
  modalBodyText: {
    ...Typography.bodyLg,
    fontSize: 14,
    color: Colors.onSurfaceVariant,
    lineHeight: 22,
  },
  modalCloseBtn: {
    backgroundColor: Colors.primary,
    paddingVertical: Spacing.md,
    borderRadius: BorderRadius.lg,
    alignItems: 'center',
  },
  modalCloseBtnText: {
    ...Typography.labelLg,
    color: '#ffffff',
    fontFamily: 'Inter-Bold',
    fontSize: 14,
  },
});

export default SettingsScreen;
