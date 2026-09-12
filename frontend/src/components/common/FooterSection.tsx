import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Linking } from 'react-native';
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

  const handleOpenMap = () => {
    Linking.openURL(CLIENT_INFO.locationMapUrl);
  };

  const handleEmailPress = () => {
    Linking.openURL(`mailto:${CLIENT_INFO.email}`);
  };

  const handlePhonePress = () => {
    Linking.openURL(`tel:${CLIENT_INFO.primaryPhone}`);
  };

  return (
    <View style={styles.footerWrapper}>
      <View style={styles.footerInner}>
        {/* Column 1: Store Branding & License */}
        <View style={styles.columnContainer}>
          <View style={styles.brandTitleRow}>
            <MaterialIcons name="local-fire-department" size={22} color="#E11D48" />
            <Text style={styles.brandTitle}>{CLIENT_INFO.name}</Text>
          </View>
          <Text style={styles.tagline}>Sivakasi Fireworks Wholesale & Retailer</Text>
          <View style={styles.licenseBadge}>
            <Text style={styles.licenseText}>Lic: E/SC/TN/24/685 (E 54389)</Text>
          </View>
        </View>

        {/* Column 2: Essential Quick Links */}
        <View style={styles.columnContainer}>
          <Text style={styles.columnHeader}>Quick Links</Text>
          <View style={styles.linksGrid}>
            <TouchableOpacity style={styles.linkItem} onPress={() => navigation.navigate('Home')}>
              <Text style={styles.linkText}>Home</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.linkItem} onPress={() => navigation.navigate('Categories')}>
              <Text style={styles.linkText}>Categories</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.linkItem} onPress={() => navigation.navigate('Cart')}>
              <Text style={styles.linkText}>Cart</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.linkItem} onPress={() => navigation.navigate('UserProfile')}>
              <Text style={styles.linkText}>My Account</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.linkItem} onPress={() => navigation.navigate('AdminDashboard')}>
              <Text style={styles.linkTextAdmin}>Admin Panel</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Column 3: Contact & Store Location */}
        <View style={styles.columnContainer}>
          <Text style={styles.columnHeader}>Contact Us</Text>
          <View style={{ gap: 8 }}>
            <TouchableOpacity style={styles.contactRow} onPress={handlePhonePress} activeOpacity={0.7}>
              <MaterialIcons name="phone" size={16} color="#E11D48" />
              <Text style={styles.contactValue}>{CLIENT_INFO.primaryPhone}</Text>
            </TouchableOpacity>

            <TouchableOpacity style={styles.contactRow} onPress={handleEmailPress} activeOpacity={0.7}>
              <MaterialIcons name="email" size={16} color="#E11D48" />
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
    paddingVertical: Spacing.md + 4,
    flexDirection: 'row',
    flexWrap: 'wrap',
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
    gap: 6,
    marginBottom: 4,
  },
  brandTitle: {
    fontSize: 16,
    fontFamily: 'Inter-Bold',
    color: '#FFFFFF',
    letterSpacing: 0.3,
  },
  tagline: {
    fontSize: 12,
    color: '#94A3B8',
    fontFamily: 'Inter-Regular',
    marginBottom: 8,
  },
  licenseBadge: {
    backgroundColor: 'rgba(245, 158, 11, 0.12)',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: BorderRadius.md,
    alignSelf: 'flex-start',
    borderWidth: 1,
    borderColor: 'rgba(245, 158, 11, 0.25)',
  },
  licenseText: {
    fontSize: 10.5,
    fontFamily: 'Inter-Medium',
    color: '#F59E0B',
  },
  columnHeader: {
    fontSize: 13.5,
    fontFamily: 'Inter-Bold',
    color: '#FFFFFF',
    marginBottom: Spacing.xs + 2,
  },
  linksGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
    alignItems: 'center',
  },
  linkItem: {
    paddingVertical: 2,
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
  contactRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  contactValue: {
    fontSize: 12.5,
    fontFamily: 'Inter-Medium',
    color: '#F1F5F9',
  },
  mapBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#1E293B',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: BorderRadius.md,
    alignSelf: 'flex-start',
    marginTop: 2,
  },
  mapBtnText: {
    fontSize: 11,
    fontFamily: 'Inter-SemiBold',
    color: '#FACC15',
  },
  bottomCopyrightBar: {
    backgroundColor: '#090D16',
    paddingVertical: Spacing.xs + 2,
    paddingHorizontal: Spacing.md,
    alignItems: 'center',
    borderTopWidth: 1,
    borderTopColor: '#1E293B',
  },
  copyrightText: {
    fontSize: 10.5,
    color: '#64748B',
    textAlign: 'center',
    fontFamily: 'Inter-Medium',
  },
});

export default FooterSection;
