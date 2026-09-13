import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Linking, useWindowDimensions } from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { Colors } from '@/constants/colors';
import { Spacing, BorderRadius } from '@/constants/spacing';
import { CLIENT_INFO } from '@/constants/clientInfo';
import { MAX_CONTENT_WIDTH } from '@/constants/responsive';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { RootStackParamList } from '@/navigation/types';

export const FooterSection: React.FC = React.memo(() => {
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const { width } = useWindowDimensions();
  const isMobile = width < 768;

  const handleOpenMap = () => {
    Linking.openURL(CLIENT_INFO.locationMapUrl);
  };

  const handleEmailPress = () => {
    Linking.openURL(`mailto:${CLIENT_INFO.email}`);
  };

  const handlePhonePress = () => {
    Linking.openURL(`tel:${CLIENT_INFO.primaryPhone}`);
  };

  // ── 1. COMPACT & STREAMLINED MOBILE FOOTER (HEIGHT ~110px) ──
  if (isMobile) {
    return (
      <View style={styles.footerWrapperMobile}>
        {/* Brand Name & License Header */}
        <View style={styles.mobileHeaderRow}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
            <MaterialIcons name="local-fire-department" size={18} color="#E11D48" />
            <Text style={styles.brandTitleMobile}>{CLIENT_INFO.name}</Text>
          </View>
          <View style={styles.licenseBadgeMobile}>
            <Text style={styles.licenseTextMobile}>Lic: E/SC/TN/24/685</Text>
          </View>
        </View>

        {/* Essential Navigation Links */}
        <View style={styles.mobileNavRow}>
          <TouchableOpacity onPress={() => navigation.navigate('Home')} activeOpacity={0.7}>
            <Text style={styles.navLinkText}>Home</Text>
          </TouchableOpacity>
          <Text style={styles.dot}>•</Text>
          <TouchableOpacity onPress={() => navigation.navigate('Categories')} activeOpacity={0.7}>
            <Text style={styles.navLinkText}>Categories</Text>
          </TouchableOpacity>
          <Text style={styles.dot}>•</Text>
          <TouchableOpacity onPress={() => navigation.navigate('Cart')} activeOpacity={0.7}>
            <Text style={styles.navLinkText}>Cart</Text>
          </TouchableOpacity>
          <Text style={styles.dot}>•</Text>
          <TouchableOpacity onPress={() => navigation.navigate('UserProfile')} activeOpacity={0.7}>
            <Text style={styles.navLinkText}>Account</Text>
          </TouchableOpacity>
          <Text style={styles.dot}>•</Text>
          <TouchableOpacity onPress={() => navigation.navigate('AdminDashboard')} activeOpacity={0.7}>
            <Text style={styles.navLinkAdmin}>Admin</Text>
          </TouchableOpacity>
        </View>

        {/* Quick Contact & Store Map */}
        <View style={styles.mobileContactRow}>
          <TouchableOpacity style={styles.mobileContactItem} onPress={handlePhonePress} activeOpacity={0.7}>
            <MaterialIcons name="phone" size={13} color="#E11D48" />
            <Text style={styles.contactTextMobile}>{CLIENT_INFO.primaryPhone}</Text>
          </TouchableOpacity>

          <TouchableOpacity style={styles.mobileMapItem} onPress={handleOpenMap} activeOpacity={0.7}>
            <MaterialIcons name="place" size={14} color="#FACC15" />
            <Text style={styles.mapTextMobile}>Store Location 📍</Text>
          </TouchableOpacity>
        </View>

        {/* Copyright */}
        <Text style={styles.copyrightTextMobile}>{CLIENT_INFO.copyright}</Text>
      </View>
    );
  }

  // ── 2. DESKTOP & TABLET FOOTER (3-COLUMN LAYOUT) ──
  return (
    <View style={styles.footerWrapper}>
      <View style={styles.footerInner}>
        {/* Column 1: Store Branding & License */}
        <View style={styles.columnContainer}>
          <View style={styles.brandTitleRow}>
            <MaterialIcons name="local-fire-department" size={24} color="#E11D48" />
            <Text style={styles.brandTitle}>{CLIENT_INFO.name}</Text>
          </View>
          <Text style={styles.tagline}>Sivakasi Fireworks Wholesale & Retailer</Text>
          <View style={styles.licenseBadge}>
            <MaterialIcons name="verified" size={14} color="#F59E0B" style={{ marginRight: 4 }} />
            <Text style={styles.licenseText}>Lic: E/SC/TN/24/685 (E 54389)</Text>
          </View>
        </View>

        {/* Column 2: Essential Quick Links */}
        <View style={styles.columnContainer}>
          <Text style={styles.columnHeader}>Quick Navigation</Text>
          <View style={styles.linksGrid}>
            <TouchableOpacity style={styles.linkChip} onPress={() => navigation.navigate('Home')} activeOpacity={0.7}>
              <MaterialIcons name="home" size={15} color="#94A3B8" />
              <Text style={styles.linkText}>Home</Text>
            </TouchableOpacity>

            <TouchableOpacity style={styles.linkChip} onPress={() => navigation.navigate('Categories')} activeOpacity={0.7}>
              <MaterialIcons name="grid-view" size={15} color="#94A3B8" />
              <Text style={styles.linkText}>Categories</Text>
            </TouchableOpacity>

            <TouchableOpacity style={styles.linkChip} onPress={() => navigation.navigate('Cart')} activeOpacity={0.7}>
              <MaterialIcons name="shopping-cart" size={15} color="#94A3B8" />
              <Text style={styles.linkText}>My Cart</Text>
            </TouchableOpacity>

            <TouchableOpacity style={styles.linkChip} onPress={() => navigation.navigate('UserProfile')} activeOpacity={0.7}>
              <MaterialIcons name="person" size={15} color="#94A3B8" />
              <Text style={styles.linkText}>Account</Text>
            </TouchableOpacity>

            <TouchableOpacity style={[styles.linkChip, styles.adminLinkChip]} onPress={() => navigation.navigate('AdminDashboard')} activeOpacity={0.7}>
              <MaterialIcons name="admin-panel-settings" size={15} color="#E11D48" />
              <Text style={styles.linkTextAdmin}>Admin Panel</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Column 3: Contact & Store Location */}
        <View style={styles.columnContainer}>
          <Text style={styles.columnHeader}>Contact & Store</Text>
          <View style={styles.contactList}>
            <TouchableOpacity style={styles.contactRow} onPress={handlePhonePress} activeOpacity={0.7}>
              <View style={styles.iconCircle}>
                <MaterialIcons name="phone" size={14} color="#E11D48" />
              </View>
              <Text style={styles.contactValue}>{CLIENT_INFO.primaryPhone}</Text>
            </TouchableOpacity>

            <TouchableOpacity style={styles.contactRow} onPress={handleEmailPress} activeOpacity={0.7}>
              <View style={styles.iconCircle}>
                <MaterialIcons name="email" size={14} color="#E11D48" />
              </View>
              <Text style={styles.contactValue}>{CLIENT_INFO.email}</Text>
            </TouchableOpacity>

            <TouchableOpacity style={styles.mapBtn} onPress={handleOpenMap} activeOpacity={0.8}>
              <MaterialIcons name="place" size={16} color="#FACC15" />
              <Text style={styles.mapBtnText}>Sivakasi Store on Google Maps 📍</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>

      {/* Bottom Copyright Bar */}
      <View style={styles.bottomCopyrightBar}>
        <Text style={styles.copyrightText}>{CLIENT_INFO.copyright}</Text>
      </View>
    </View>
  );
});

const styles = StyleSheet.create({
  // ── MOBILE STYLES (Clean, Compact, Minimal) ──
  footerWrapperMobile: {
    width: '100%',
    backgroundColor: '#0F172A',
    borderTopWidth: 2,
    borderTopColor: Colors.primary,
    paddingVertical: 14,
    paddingHorizontal: 16,
    alignItems: 'center',
    gap: 10,
    marginTop: Spacing.md,
  },
  mobileHeaderRow: {
    width: '100%',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  brandTitleMobile: {
    fontSize: 15,
    fontFamily: 'Inter-Bold',
    color: '#FFFFFF',
  },
  licenseBadgeMobile: {
    backgroundColor: 'rgba(245, 158, 11, 0.12)',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: BorderRadius.sm,
    borderWidth: 1,
    borderColor: 'rgba(245, 158, 11, 0.25)',
  },
  licenseTextMobile: {
    fontSize: 10,
    fontFamily: 'Inter-Medium',
    color: '#F59E0B',
  },
  mobileNavRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    flexWrap: 'wrap',
    paddingVertical: 2,
  },
  navLinkText: {
    fontSize: 12,
    color: '#CBD5E1',
    fontFamily: 'Inter-Medium',
  },
  navLinkAdmin: {
    fontSize: 12,
    color: '#E11D48',
    fontFamily: 'Inter-Bold',
  },
  dot: {
    color: '#475569',
    fontSize: 12,
  },
  mobileContactRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 14,
  },
  mobileContactItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    backgroundColor: '#1E293B',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: BorderRadius.md,
    borderWidth: 1,
    borderColor: '#334155',
  },
  contactTextMobile: {
    fontSize: 11.5,
    color: '#F1F5F9',
    fontFamily: 'Inter-Medium',
  },
  mobileMapItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    backgroundColor: '#1E293B',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: BorderRadius.md,
    borderWidth: 1,
    borderColor: '#334155',
  },
  mapTextMobile: {
    fontSize: 11.5,
    color: '#FACC15',
    fontFamily: 'Inter-SemiBold',
  },
  copyrightTextMobile: {
    fontSize: 10,
    color: '#64748B',
    textAlign: 'center',
    fontFamily: 'Inter-Regular',
    marginTop: 2,
  },

  // ── DESKTOP STYLES ──
  footerWrapper: {
    width: '100%',
    backgroundColor: '#0F172A',
    borderTopWidth: 2,
    borderTopColor: Colors.primary,
    marginTop: Spacing.lg,
  },
  footerInner: {
    maxWidth: MAX_CONTENT_WIDTH,
    width: '100%',
    alignSelf: 'center',
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.lg,
    flexDirection: 'row',
    gap: Spacing.lg,
    justifyContent: 'space-between',
  },
  columnContainer: {
    flex: 1,
    minWidth: 220,
  },
  brandTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 4,
  },
  brandTitle: {
    fontSize: 17,
    fontFamily: 'Inter-Bold',
    color: '#FFFFFF',
    letterSpacing: 0.4,
  },
  tagline: {
    fontSize: 12,
    color: '#94A3B8',
    fontFamily: 'Inter-Regular',
    marginBottom: 10,
  },
  licenseBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(245, 158, 11, 0.12)',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: BorderRadius.md,
    alignSelf: 'flex-start',
    borderWidth: 1,
    borderColor: 'rgba(245, 158, 11, 0.25)',
  },
  licenseText: {
    fontSize: 11,
    fontFamily: 'Inter-Medium',
    color: '#F59E0B',
  },
  columnHeader: {
    fontSize: 14,
    fontFamily: 'Inter-Bold',
    color: '#FFFFFF',
    marginBottom: Spacing.xs + 4,
    letterSpacing: 0.3,
  },
  linksGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    alignItems: 'center',
  },
  linkChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#1E293B',
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: BorderRadius.md,
    borderWidth: 1,
    borderColor: '#334155',
  },
  adminLinkChip: {
    backgroundColor: 'rgba(225, 29, 72, 0.12)',
    borderColor: 'rgba(225, 29, 72, 0.3)',
  },
  linkText: {
    fontSize: 12,
    color: '#CBD5E1',
    fontFamily: 'Inter-Medium',
  },
  linkTextAdmin: {
    fontSize: 12,
    color: '#E11D48',
    fontFamily: 'Inter-Bold',
  },
  contactList: {
    gap: 10,
  },
  contactRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  iconCircle: {
    width: 26,
    height: 26,
    borderRadius: 13,
    backgroundColor: 'rgba(225, 29, 72, 0.12)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  contactValue: {
    fontSize: 13,
    fontFamily: 'Inter-Medium',
    color: '#F1F5F9',
  },
  mapBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: '#1E293B',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: BorderRadius.md,
    alignSelf: 'flex-start',
    marginTop: 4,
    borderWidth: 1,
    borderColor: '#334155',
  },
  mapBtnText: {
    fontSize: 12,
    fontFamily: 'Inter-SemiBold',
    color: '#FACC15',
  },
  bottomCopyrightBar: {
    backgroundColor: '#090D16',
    paddingVertical: Spacing.sm,
    paddingHorizontal: Spacing.md,
    alignItems: 'center',
    borderTopWidth: 1,
    borderTopColor: '#1E293B',
  },
  copyrightText: {
    fontSize: 11,
    color: '#64748B',
    textAlign: 'center',
    fontFamily: 'Inter-Medium',
  },
});

export default FooterSection;
