import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  useWindowDimensions,
} from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { Colors } from '@/constants/colors';
import { Spacing, BorderRadius } from '@/constants/spacing';

interface AdminHeaderProps {
  unreadNotifsCount?: number;
  onNotificationPress?: () => void;
  onProfilePress?: () => void;
  onOpenMobileDrawer?: () => void;
  adminName?: string;
  selectedLocation?: string;
}

export const AdminHeader: React.FC<AdminHeaderProps> = ({
  unreadNotifsCount = 2,
  onNotificationPress,
  onProfilePress,
  onOpenMobileDrawer,
  adminName = 'Admin',
  selectedLocation = 'Tamil Nadu',
}) => {
  const { width } = useWindowDimensions();
  const isDesktop = width >= 1024;

  const todayFormatted = new Date().toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });

  return (
    <View style={styles.headerBar}>
      <View style={styles.greetingGroup}>
        {!isDesktop && (
          <TouchableOpacity
            style={styles.menuToggleBtn}
            onPress={onOpenMobileDrawer}
            activeOpacity={0.7}
          >
            <MaterialIcons name="menu" size={24} color="#0F172A" />
          </TouchableOpacity>
        )}
        <View style={styles.sunIconCircle}>
          <MaterialIcons name="wb-sunny" size={20} color="#F59E0B" />
        </View>
        <View>
          <Text style={styles.greetingText}>Good Morning, {adminName}!</Text>
          <Text style={styles.subGreetingText}>
            Here's what's happening with your store today.
          </Text>
        </View>
      </View>

      <View style={styles.headerRightActions}>
        {/* Location Dropdown */}
        <View style={styles.locationPill}>
          <MaterialIcons name="location-on" size={16} color="#475569" />
          <Text style={styles.locationText}>{selectedLocation}</Text>
          <MaterialIcons name="arrow-drop-down" size={18} color="#475569" />
        </View>

        {/* Notification Bell */}
        <TouchableOpacity
          style={styles.actionIconBtn}
          onPress={onNotificationPress}
          activeOpacity={0.75}
        >
          <MaterialIcons name="notifications-none" size={20} color="#334155" />
          {unreadNotifsCount > 0 && (
            <View style={styles.notifBadge}>
              <Text style={styles.notifBadgeText}>{unreadNotifsCount}</Text>
            </View>
          )}
        </TouchableOpacity>

        {/* Admin Profile */}
        <TouchableOpacity
          style={styles.profileBtn}
          onPress={onProfilePress}
          activeOpacity={0.75}
        >
          <View style={styles.avatarCircle}>
            <Text style={styles.avatarText}>
              {adminName.charAt(0).toUpperCase()}
            </Text>
          </View>
          {isDesktop && (
            <Text style={styles.adminNameText}>{adminName}</Text>
          )}
          <MaterialIcons name="arrow-drop-down" size={18} color="#475569" />
        </TouchableOpacity>

        {/* Date Selector Badge */}
        {isDesktop && (
          <View style={styles.datePill}>
            <MaterialIcons name="calendar-today" size={14} color="#475569" />
            <Text style={styles.dateText}>{todayFormatted}</Text>
          </View>
        )}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  headerBar: {
    width: '100%',
    backgroundColor: '#FFFFFF',
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.md,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
    gap: Spacing.md,
    flexWrap: 'wrap',
  },
  greetingGroup: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  menuToggleBtn: {
    padding: 6,
    borderRadius: BorderRadius.md,
    backgroundColor: '#F8FAFC',
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  sunIconCircle: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#FEF3C7',
    alignItems: 'center',
    justifyContent: 'center',
  },
  greetingText: {
    fontFamily: 'Inter-Bold',
    fontSize: 18,
    color: '#0F172A',
  },
  subGreetingText: {
    fontFamily: 'Inter-Regular',
    fontSize: 12,
    color: '#64748B',
    marginTop: 1,
  },
  headerRightActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  locationPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#F8FAFC',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: BorderRadius.lg,
  },
  locationText: {
    fontFamily: 'Inter-Medium',
    fontSize: 12,
    color: '#334155',
  },
  actionIconBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#F8FAFC',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
  },
  notifBadge: {
    position: 'absolute',
    top: -2,
    right: -2,
    backgroundColor: '#E11D48',
    width: 16,
    height: 16,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  notifBadgeText: {
    color: '#FFFFFF',
    fontFamily: 'Inter-Bold',
    fontSize: 9.5,
  },
  profileBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#F8FAFC',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: BorderRadius.full,
  },
  avatarCircle: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: '#0F172A',
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarText: {
    color: '#FFFFFF',
    fontFamily: 'Inter-Bold',
    fontSize: 12,
  },
  adminNameText: {
    fontFamily: 'Inter-SemiBold',
    fontSize: 12,
    color: '#0F172A',
  },
  datePill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#F8FAFC',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: BorderRadius.lg,
  },
  dateText: {
    fontFamily: 'Inter-Medium',
    fontSize: 12,
    color: '#334155',
  },
});

export default AdminHeader;
