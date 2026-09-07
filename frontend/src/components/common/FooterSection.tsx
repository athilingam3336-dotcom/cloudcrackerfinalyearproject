import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Linking, Platform } from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { Colors } from '@/constants/colors';
import { Typography } from '@/constants/typography';
import { Spacing, BorderRadius } from '@/constants/spacing';
import { CLIENT_INFO } from '@/constants/clientInfo';
import { MAX_CONTENT_WIDTH } from '@/constants/responsive';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { RootStackParamList } from '@/navigation/types';

export const FooterSection: React.FC = React.memo(() => {
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();

  const handleOpenMap = () => {
    Linking.openURL(CLIENT_INFO.locationMapUrl);
  };

  const handleEmailPress = () => {
    Linking.openURL(`mailto:${CLIENT_INFO.email}`);
  };

  const handlePhonePress = (phone: string) => {
    const sanitized = phone.replace(/\s+/g, '');
    Linking.openURL(`tel:${sanitized}`);
  };

  return (
    <View style={styles.footerWrapper}>
      <View style={styles.footerInner}>
        {/* Grid Column 1: Store Branding & Map Location CTA */}
        <View style={styles.columnContainer}>
          <View style={styles.brandTitleRow}>
            <MaterialIcons name="local-fire-department" size={26} color="#FF4500" />
            <Text style={styles.brandTitle}>{CLIENT_INFO.name}</Text>
          </View>
          <Text style={styles.tagline}>{CLIENT_INFO.tagline}</Text>
          <Text style={styles.licenseBadge}>{CLIENT_INFO.licenseNo}</Text>

          {/* Interactive Google Map Location Card */}
          <TouchableOpacity style={styles.mapCardBtn} onPress={handleOpenMap} activeOpacity={0.85}>
            <View style={styles.mapIconCircle}>
              <MaterialIcons name="place" size={22} color="#FFFFFF" />
            </View>
            <View style={styles.mapTextContainer}>
              <Text style={styles.mapCardHeader}>Sivakasi Store Location</Text>
              <Text style={styles.mapCardSub}>Open in Google Maps 📍</Text>
            </View>
            <MaterialIcons name="open-in-new" size={18} color="#FFD700" />
          </TouchableOpacity>
        </View>

        {/* Grid Column 2: Contact Info (Email & Phone Lines) */}
        <View style={styles.columnContainer}>
          <Text style={styles.columnHeader}>Contact Information</Text>

          {/* Email Address Link */}
          <TouchableOpacity style={styles.contactRow} onPress={handleEmailPress} activeOpacity={0.7}>
            <View style={[styles.contactIconBox, { backgroundColor: '#EEF2FF' }]}>
              <MaterialIcons name="email" size={18} color="#4F46E5" />
            </View>
            <View>
              <Text style={styles.contactLabel}>Email Us</Text>
              <Text style={styles.contactValue}>{CLIENT_INFO.email}</Text>
            </View>
          </TouchableOpacity>

          {/* Primary Phone Line */}
          <TouchableOpacity
            style={styles.contactRow}
            onPress={() => handlePhonePress(CLIENT_INFO.primaryPhone)}
            activeOpacity={0.7}
          >
            <View style={[styles.contactIconBox, { backgroundColor: '#ECFDF5' }]}>
              <MaterialIcons name="phone-in-talk" size={18} color="#059669" />
            </View>
            <View>
              <Text style={styles.contactLabel}>Primary Call Hotline ({CLIENT_INFO.allDaysAvailable})</Text>
              <Text style={styles.contactValue}>{CLIENT_INFO.primaryPhone}</Text>
            </View>
          </TouchableOpacity>

          {/* Additional Phone Numbers Grid */}
          <View style={styles.phonePillsContainer}>
            {CLIENT_INFO.phoneNumbers.slice(1).map((phone, idx) => (
              <TouchableOpacity
                key={idx}
                style={styles.phonePill}
                onPress={() => handlePhonePress(phone)}
                activeOpacity={0.7}
              >
                <MaterialIcons name="call" size={12} color={Colors.primary} />
                <Text style={styles.phonePillText}>{phone}</Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        {/* Grid Column 3: Quick Links & Devotional Blessings */}
        <View style={styles.columnContainer}>
          <Text style={styles.columnHeader}>Quick Navigation</Text>

          <View style={styles.linksGrid}>
            <TouchableOpacity style={styles.linkTouch} onPress={() => navigation.navigate('Home')}>
              <MaterialIcons name="chevron-right" size={16} color={Colors.primary} />
              <Text style={styles.linkText}>Home</Text>
            </TouchableOpacity>

            <TouchableOpacity style={styles.linkTouch} onPress={() => navigation.navigate('Categories')}>
              <MaterialIcons name="chevron-right" size={16} color={Colors.primary} />
              <Text style={styles.linkText}>Categories Catalog</Text>
            </TouchableOpacity>

            <TouchableOpacity style={styles.linkTouch} onPress={() => navigation.navigate('Wishlist')}>
              <MaterialIcons name="chevron-right" size={16} color={Colors.primary} />
              <Text style={styles.linkText}>Wishlist Saved</Text>
            </TouchableOpacity>

            <TouchableOpacity style={styles.linkTouch} onPress={() => navigation.navigate('Cart')}>
              <MaterialIcons name="chevron-right" size={16} color={Colors.primary} />
              <Text style={styles.linkText}>Shopping Cart</Text>
            </TouchableOpacity>

            <TouchableOpacity style={styles.linkTouch} onPress={() => navigation.navigate('UserProfile')}>
              <MaterialIcons name="chevron-right" size={16} color={Colors.primary} />
              <Text style={styles.linkText}>My Account</Text>
            </TouchableOpacity>

            <TouchableOpacity style={styles.linkTouch} onPress={() => navigation.navigate('AdminDashboard')}>
              <MaterialIcons name="chevron-right" size={16} color={Colors.primary} />
              <Text style={styles.linkText}>Admin Panel</Text>
            </TouchableOpacity>
          </View>

          {/* Devotional Blessings */}
          <View style={styles.devotionalBox}>
            <Text style={styles.devotionalTitle}>{CLIENT_INFO.devotionalText.blessing}</Text>
            <Text style={styles.devotionalSub}>
              {CLIENT_INFO.devotionalText.uvari} • {CLIENT_INFO.devotionalText.sudalai}
            </Text>
          </View>
        </View>
      </View>

      {/* Bottom Copyright Sub-Bar */}
      <View style={styles.bottomCopyrightBar}>
        <Text style={styles.copyrightText}>{CLIENT_INFO.copyright}</Text>
      </View>
    </View>
  );
});

const styles = StyleSheet.create({
  footerWrapper: {
    width: '100%',
    backgroundColor: '#111827',
    borderTopWidth: 3,
    borderTopColor: Colors.primary,
    marginTop: Spacing.xl,
  },
  footerInner: {
    maxWidth: MAX_CONTENT_WIDTH,
    width: '100%',
    alignSelf: 'center',
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.xl,
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.xl,
    justifyContent: 'space-between',
  },
  columnContainer: {
    flex: 1,
    minWidth: 260,
  },
  brandTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: Spacing.xs,
  },
  brandTitle: {
    ...Typography.headlineLg,
    fontSize: 20,
    fontFamily: 'Inter-Bold',
    color: '#FFFFFF',
    letterSpacing: 0.5,
  },
  tagline: {
    ...Typography.bodyMd,
    fontSize: 12.5,
    color: '#9CA3AF',
    marginBottom: Spacing.sm,
    lineHeight: 18,
  },
  licenseBadge: {
    ...Typography.labelLg,
    fontSize: 11,
    fontFamily: 'Inter-SemiBold',
    color: '#F59E0B',
    backgroundColor: 'rgba(245, 158, 11, 0.12)',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: BorderRadius.md,
    alignSelf: 'flex-start',
    marginBottom: Spacing.md,
    borderWidth: 1,
    borderColor: 'rgba(245, 158, 11, 0.3)',
  },
  mapCardBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    backgroundColor: '#1F2937',
    padding: Spacing.md,
    borderRadius: BorderRadius.lg,
    borderWidth: 1,
    borderColor: '#374151',
  },
  mapIconCircle: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: Colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  mapTextContainer: {
    flex: 1,
  },
  mapCardHeader: {
    ...Typography.titleLg,
    fontSize: 13,
    fontFamily: 'Inter-Bold',
    color: '#FFFFFF',
  },
  mapCardSub: {
    ...Typography.labelLg,
    fontSize: 11,
    color: '#FBBF24',
    marginTop: 2,
  },
  columnHeader: {
    ...Typography.titleLg,
    fontSize: 16,
    fontFamily: 'Inter-Bold',
    color: '#FFFFFF',
    marginBottom: Spacing.md,
    borderBottomWidth: 2,
    borderBottomColor: Colors.primary,
    paddingBottom: 4,
    alignSelf: 'flex-start',
  },
  contactRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginBottom: Spacing.sm + 2,
  },
  contactIconBox: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },
  contactLabel: {
    ...Typography.labelLg,
    fontSize: 10.5,
    color: '#9CA3AF',
  },
  contactValue: {
    ...Typography.bodyLg,
    fontSize: 13,
    fontFamily: 'Inter-Bold',
    color: '#F3F4F6',
  },
  phonePillsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
    marginTop: Spacing.xs,
  },
  phonePill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#1F2937',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: BorderRadius.full,
    borderWidth: 1,
    borderColor: '#374151',
  },
  phonePillText: {
    ...Typography.labelLg,
    fontSize: 11,
    color: '#D1D5DB',
    fontFamily: 'Inter-Medium',
  },
  linksGrid: {
    gap: 8,
    marginBottom: Spacing.md,
  },
  linkTouch: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  linkText: {
    ...Typography.bodyMd,
    fontSize: 13,
    color: '#D1D5DB',
    fontFamily: 'Inter-Medium',
  },
  devotionalBox: {
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    padding: Spacing.sm + 2,
    borderRadius: BorderRadius.md,
    borderLeftWidth: 3,
    borderLeftColor: Colors.secondary,
  },
  devotionalTitle: {
    ...Typography.titleLg,
    fontSize: 13,
    fontFamily: 'Inter-Bold',
    color: Colors.secondary,
  },
  devotionalSub: {
    ...Typography.labelLg,
    fontSize: 10.5,
    color: '#9CA3AF',
    marginTop: 2,
  },
  bottomCopyrightBar: {
    backgroundColor: '#0F172A',
    paddingVertical: Spacing.sm + 2,
    paddingHorizontal: Spacing.md,
    alignItems: 'center',
    borderTopWidth: 1,
    borderTopColor: '#1E293B',
  },
  copyrightText: {
    ...Typography.labelLg,
    fontSize: 11,
    color: '#64748B',
    textAlign: 'center',
    fontFamily: 'Inter-Medium',
  },
});

export default FooterSection;
