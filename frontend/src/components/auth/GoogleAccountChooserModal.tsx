import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  Modal,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Image,
  TextInput,
  ActivityIndicator,
  Pressable,
} from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { Colors } from '@/constants/colors';
import { Typography } from '@/constants/typography';
import { Spacing, BorderRadius } from '@/constants/spacing';
import {
  googleAuthService,
  SavedGoogleAccount,
} from '@/services/googleAuthService';
import { GoogleAuthPayload } from '@/services/authService';

interface GoogleAccountChooserModalProps {
  visible: boolean;
  onClose: () => void;
  onSelectAccount: (payload: GoogleAuthPayload) => Promise<void>;
  isLoading?: boolean;
}

export const GoogleAccountChooserModal: React.FC<GoogleAccountChooserModalProps> = ({
  visible,
  onClose,
  onSelectAccount,
  isLoading = false,
}) => {
  const [accounts, setAccounts] = useState<SavedGoogleAccount[]>([]);
  const [selectedEmail, setSelectedEmail] = useState<string | null>(null);
  const [isCustomMode, setIsCustomMode] = useState(false);
  const [customEmail, setCustomEmail] = useState('');
  const [customName, setCustomName] = useState('');
  const [customError, setCustomError] = useState<string | null>(null);

  useEffect(() => {
    if (visible) {
      setAccounts(googleAuthService.getSavedAccounts());
      setIsCustomMode(false);
      setSelectedEmail(null);
      setCustomEmail('');
      setCustomName('');
      setCustomError(null);
    }
  }, [visible]);

  const handleAccountClick = async (account: SavedGoogleAccount) => {
    if (isLoading) return;
    setSelectedEmail(account.email);
    googleAuthService.saveAccountToRecent(account);
    await onSelectAccount({
      email: account.email,
      fullName: account.name,
      avatarUrl: account.avatarUrl,
      googleId: `google_${Date.now()}`,
    });
  };

  const handleCustomSubmit = async () => {
    const trimmedEmail = customEmail.trim();
    if (!trimmedEmail) {
      setCustomError('Please enter your Gmail address');
      return;
    }
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(trimmedEmail)) {
      setCustomError('Please enter a valid email address');
      return;
    }

    const name = customName.trim() || trimmedEmail.split('@')[0].replace(/[^a-zA-Z0-9]/g, ' ');
    const formattedName = name.charAt(0).toUpperCase() + name.slice(1);
    const newAccount: SavedGoogleAccount = {
      email: trimmedEmail,
      name: formattedName,
      avatarUrl: `https://ui-avatars.com/api/?name=${encodeURIComponent(formattedName)}&background=2563eb&color=fff`,
    };

    setSelectedEmail(trimmedEmail);
    googleAuthService.saveAccountToRecent(newAccount);
    await onSelectAccount({
      email: newAccount.email,
      fullName: newAccount.name,
      avatarUrl: newAccount.avatarUrl,
      googleId: `google_${Date.now()}`,
    });
  };

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onClose}
    >
      <Pressable style={styles.overlay} onPress={isLoading ? undefined : onClose}>
        <Pressable style={styles.modalCard} onPress={(e) => e.stopPropagation()}>
          {/* Header */}
          <View style={styles.header}>
            {/* Google Brand G Logo */}
            <View style={styles.googleBadge}>
              <Text style={styles.googleGLetter}>G</Text>
            </View>
            <Text style={styles.title}>Choose an account</Text>
            <Text style={styles.subtitle}>to continue to <Text style={styles.brandName}>CloudCrackers</Text></Text>
          </View>

          {/* Account list or Custom form */}
          {!isCustomMode ? (
            <ScrollView style={styles.listContainer} showsVerticalScrollIndicator={false}>
              {accounts.map((account) => {
                const isThisSelected = selectedEmail === account.email && isLoading;
                const initials = (account.name || account.email).charAt(0).toUpperCase();

                return (
                  <TouchableOpacity
                    key={account.email}
                    style={[
                      styles.accountItem,
                      isThisSelected && styles.accountItemSelected,
                    ]}
                    onPress={() => handleAccountClick(account)}
                    disabled={isLoading}
                    activeOpacity={0.7}
                  >
                    {/* Avatar */}
                    {account.avatarUrl ? (
                      <Image source={{ uri: account.avatarUrl }} style={styles.avatar} />
                    ) : (
                      <View style={styles.initialAvatar}>
                        <Text style={styles.initialText}>{initials}</Text>
                      </View>
                    )}

                    {/* Account Info */}
                    <View style={styles.accountInfo}>
                      <Text style={styles.accountName} numberOfLines={1}>
                        {account.name}
                      </Text>
                      <Text style={styles.accountEmail} numberOfLines={1}>
                        {account.email}
                      </Text>
                    </View>

                    {/* Action Indicator */}
                    {isThisSelected ? (
                      <ActivityIndicator size="small" color={Colors.primary} />
                    ) : (
                      <MaterialIcons
                        name="chevron-right"
                        size={22}
                        color={Colors.onSurfaceVariant}
                      />
                    )}
                  </TouchableOpacity>
                );
              })}

              {/* Use another account row */}
              <TouchableOpacity
                style={styles.anotherAccountButton}
                onPress={() => setIsCustomMode(true)}
                disabled={isLoading}
                activeOpacity={0.7}
              >
                <View style={styles.iconCircle}>
                  <MaterialIcons name="person-add-alt-1" size={20} color={Colors.primary} />
                </View>
                <Text style={styles.anotherAccountText}>Use another account</Text>
              </TouchableOpacity>
            </ScrollView>
          ) : (
            <View style={styles.customForm}>
              <Text style={styles.customFormHeader}>Sign in with a Gmail account</Text>

              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>GMAIL ADDRESS</Text>
                <View style={styles.inputWrapper}>
                  <MaterialIcons name="mail-outline" size={20} color={Colors.onSurfaceVariant} style={styles.inputIcon} />
                  <TextInput
                    style={styles.textInput}
                    placeholder="example@gmail.com"
                    placeholderTextColor={Colors.onSurfaceVariant}
                    value={customEmail}
                    onChangeText={(text) => {
                      setCustomEmail(text);
                      if (customError) setCustomError(null);
                    }}
                    keyboardType="email-address"
                    autoCapitalize="none"
                    autoFocus
                  />
                </View>
                {customError && <Text style={styles.errorText}>{customError}</Text>}
              </View>

              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>FULL NAME (OPTIONAL)</Text>
                <View style={styles.inputWrapper}>
                  <MaterialIcons name="person-outline" size={20} color={Colors.onSurfaceVariant} style={styles.inputIcon} />
                  <TextInput
                    style={styles.textInput}
                    placeholder="Your Name"
                    placeholderTextColor={Colors.onSurfaceVariant}
                    value={customName}
                    onChangeText={setCustomName}
                  />
                </View>
              </View>

              <View style={styles.customActions}>
                <TouchableOpacity
                  style={styles.backBtn}
                  onPress={() => setIsCustomMode(false)}
                  disabled={isLoading}
                >
                  <Text style={styles.backBtnText}>Back</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={styles.submitBtn}
                  onPress={handleCustomSubmit}
                  disabled={isLoading}
                >
                  {isLoading ? (
                    <ActivityIndicator size="small" color="#FFFFFF" />
                  ) : (
                    <Text style={styles.submitBtnText}>Continue with Google</Text>
                  )}
                </TouchableOpacity>
              </View>
            </View>
          )}

          {/* Footer note */}
          <View style={styles.footer}>
            <Text style={styles.footerText}>
              To continue, Google will share your name, email address, and profile picture with CloudCrackers.
            </Text>
            <TouchableOpacity
              style={styles.cancelButton}
              onPress={onClose}
              disabled={isLoading}
            >
              <Text style={styles.cancelButtonText}>Cancel</Text>
            </TouchableOpacity>
          </View>
        </Pressable>
      </Pressable>
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.75)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: Spacing.md,
  },
  modalCard: {
    width: '100%',
    maxWidth: 440,
    backgroundColor: '#1E1E24',
    borderRadius: BorderRadius.lg,
    paddingTop: Spacing.lg,
    paddingBottom: Spacing.md,
    paddingHorizontal: Spacing.lg,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.5,
    shadowRadius: 20,
    elevation: 20,
  },
  header: {
    alignItems: 'center',
    marginBottom: Spacing.lg,
  },
  googleBadge: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#FFFFFF',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: Spacing.sm,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 4,
  },
  googleGLetter: {
    fontSize: 26,
    fontWeight: '700',
    color: '#4285F4',
    fontFamily: 'Inter-Bold',
  },
  title: {
    fontSize: 20,
    fontFamily: 'Inter-Bold',
    color: Colors.onSurface,
    textAlign: 'center',
    marginBottom: 4,
  },
  subtitle: {
    fontSize: 13,
    fontFamily: 'Inter-Regular',
    color: Colors.onSurfaceVariant,
    textAlign: 'center',
  },
  brandName: {
    color: Colors.primary,
    fontWeight: '600',
  },
  listContainer: {
    maxHeight: 280,
    marginBottom: Spacing.md,
  },
  accountItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: Spacing.sm + 4,
    paddingHorizontal: Spacing.sm,
    borderRadius: BorderRadius.md,
    marginBottom: 4,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255, 255, 255, 0.05)',
  },
  accountItemSelected: {
    backgroundColor: 'rgba(255, 107, 0, 0.12)',
  },
  avatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    marginRight: Spacing.md,
  },
  initialAvatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: Colors.primary,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: Spacing.md,
  },
  initialText: {
    color: '#FFFFFF',
    fontSize: 18,
    fontWeight: '600',
  },
  accountInfo: {
    flex: 1,
  },
  accountName: {
    fontSize: 15,
    fontFamily: 'Inter-Medium',
    color: Colors.onSurface,
    marginBottom: 2,
  },
  accountEmail: {
    fontSize: 12,
    fontFamily: 'Inter-Regular',
    color: Colors.onSurfaceVariant,
  },
  anotherAccountButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: Spacing.md,
    paddingHorizontal: Spacing.sm,
    marginTop: 4,
  },
  iconCircle: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: Spacing.md,
  },
  anotherAccountText: {
    fontSize: 14,
    fontFamily: 'Inter-Medium',
    color: Colors.primary,
  },
  customForm: {
    paddingVertical: Spacing.sm,
    marginBottom: Spacing.md,
  },
  customFormHeader: {
    fontSize: 15,
    fontFamily: 'Inter-SemiBold',
    color: Colors.onSurface,
    marginBottom: Spacing.md,
  },
  inputGroup: {
    marginBottom: Spacing.md,
  },
  inputLabel: {
    fontSize: 11,
    fontFamily: 'Inter-SemiBold',
    color: Colors.onSurfaceVariant,
    letterSpacing: 0.8,
    marginBottom: 6,
  },
  inputWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#121216',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.12)',
    borderRadius: BorderRadius.md,
    paddingHorizontal: Spacing.sm + 2,
    height: 48,
  },
  inputIcon: {
    marginRight: Spacing.xs,
  },
  textInput: {
    flex: 1,
    color: Colors.onSurface,
    fontSize: 14,
    fontFamily: 'Inter-Regular',
  },
  errorText: {
    color: '#EF4444',
    fontSize: 12,
    marginTop: 4,
  },
  customActions: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    alignItems: 'center',
    gap: Spacing.sm,
    marginTop: Spacing.sm,
  },
  backBtn: {
    paddingVertical: 10,
    paddingHorizontal: Spacing.md,
  },
  backBtnText: {
    color: Colors.onSurfaceVariant,
    fontSize: 14,
    fontFamily: 'Inter-Medium',
  },
  submitBtn: {
    backgroundColor: Colors.primary,
    paddingVertical: 10,
    paddingHorizontal: Spacing.lg,
    borderRadius: BorderRadius.md,
    minWidth: 150,
    alignItems: 'center',
  },
  submitBtnText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontFamily: 'Inter-SemiBold',
  },
  footer: {
    borderTopWidth: 1,
    borderTopColor: 'rgba(255, 255, 255, 0.08)',
    paddingTop: Spacing.md,
    alignItems: 'center',
  },
  footerText: {
    fontSize: 11,
    color: Colors.onSurfaceVariant,
    textAlign: 'center',
    lineHeight: 16,
    marginBottom: Spacing.sm,
  },
  cancelButton: {
    paddingVertical: Spacing.xs,
    paddingHorizontal: Spacing.md,
  },
  cancelButtonText: {
    fontSize: 14,
    color: Colors.onSurfaceVariant,
    fontFamily: 'Inter-Medium',
  },
});
