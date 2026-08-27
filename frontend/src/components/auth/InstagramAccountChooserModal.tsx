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
  instagramAuthService,
  SavedInstagramAccount,
} from '@/services/instagramAuthService';
import { InstagramAuthPayload } from '@/services/authService';

interface InstagramAccountChooserModalProps {
  visible: boolean;
  onClose: () => void;
  onSelectAccount: (payload: InstagramAuthPayload) => Promise<void>;
  isLoading?: boolean;
}

export const InstagramAccountChooserModal: React.FC<InstagramAccountChooserModalProps> = ({
  visible,
  onClose,
  onSelectAccount,
  isLoading = false,
}) => {
  const [accounts, setAccounts] = useState<SavedInstagramAccount[]>([]);
  const [selectedUsername, setSelectedUsername] = useState<string | null>(null);
  const [isCustomMode, setIsCustomMode] = useState(false);
  const [customUsername, setCustomUsername] = useState('');
  const [customName, setCustomName] = useState('');
  const [customError, setCustomError] = useState<string | null>(null);

  useEffect(() => {
    if (visible) {
      setAccounts(instagramAuthService.getSavedAccounts());
      setIsCustomMode(false);
      setSelectedUsername(null);
      setCustomUsername('');
      setCustomName('');
      setCustomError(null);
    }
  }, [visible]);

  const handleAccountClick = async (account: SavedInstagramAccount) => {
    if (isLoading) return;
    setSelectedUsername(account.username);
    instagramAuthService.saveAccountToRecent(account);
    await onSelectAccount({
      username: account.username,
      fullName: account.name,
      avatarUrl: account.avatarUrl,
      instagramId: `insta_${Date.now()}`,
    });
  };

  const handleCustomSubmit = async () => {
    const raw = customUsername.trim().replace(/^@/, '');
    if (!raw) {
      setCustomError('Please enter your Instagram username');
      return;
    }

    const formattedUsername = raw.toLowerCase();
    const name = customName.trim() || formattedUsername.charAt(0).toUpperCase() + formattedUsername.slice(1);
    const newAccount: SavedInstagramAccount = {
      username: formattedUsername,
      name,
      avatarUrl: `https://ui-avatars.com/api/?name=${encodeURIComponent(name)}&background=E1306C&color=fff`,
    };

    setSelectedUsername(formattedUsername);
    instagramAuthService.saveAccountToRecent(newAccount);
    await onSelectAccount({
      username: formattedUsername,
      fullName: name,
      avatarUrl: newAccount.avatarUrl,
      instagramId: `insta_${Date.now()}`,
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
            <View style={styles.instaBadge}>
              <MaterialIcons name="camera-alt" size={26} color="#FFFFFF" />
            </View>
            <Text style={styles.title}>Sign in with Instagram</Text>
            <Text style={styles.subtitle}>
              Connect your Instagram profile to <Text style={styles.brandName}>CloudCrackers</Text>
            </Text>
          </View>

          {/* Account list or Custom form */}
          {!isCustomMode ? (
            <ScrollView style={styles.listContainer} showsVerticalScrollIndicator={false}>
              {/* Native Instagram OAuth Window trigger button */}
              <TouchableOpacity
                style={styles.officialInstaBtn}
                onPress={async () => {
                  onClose();
                  await instagramAuthService.triggerNativeInstagramPopup(
                    async (payload) => {
                      await onSelectAccount(payload);
                    },
                    (errorMsg) => {
                      console.warn('Instagram error:', errorMsg);
                    }
                  );
                }}
                disabled={isLoading}
                activeOpacity={0.8}
              >
                <View style={styles.officialInstaBadge}>
                  <MaterialIcons name="camera-alt" size={16} color="#FFFFFF" />
                </View>
                <Text style={styles.officialInstaText}>Official Instagram Login Popup</Text>
                <MaterialIcons name="open-in-new" size={16} color="#FFFFFF" />
              </TouchableOpacity>

              {accounts.map((account) => {
                const isThisSelected = selectedUsername === account.username && isLoading;
                const initials = (account.name || account.username).charAt(0).toUpperCase();

                return (
                  <TouchableOpacity
                    key={account.username}
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
                      <Text style={styles.accountUsername} numberOfLines={1}>
                        @{account.username}
                      </Text>
                    </View>

                    {/* Action Indicator */}
                    {isThisSelected ? (
                      <ActivityIndicator size="small" color="#E1306C" />
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

              {/* Use another Instagram handle */}
              <TouchableOpacity
                style={styles.anotherAccountButton}
                onPress={() => setIsCustomMode(true)}
                disabled={isLoading}
                activeOpacity={0.7}
              >
                <View style={styles.iconCircle}>
                  <MaterialIcons name="person-add-alt-1" size={20} color="#E1306C" />
                </View>
                <Text style={styles.anotherAccountText}>Use another Instagram account</Text>
              </TouchableOpacity>
            </ScrollView>
          ) : (
            <View style={styles.customForm}>
              <Text style={styles.customFormHeader}>Enter Instagram Handle</Text>

              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>INSTAGRAM USERNAME</Text>
                <View style={styles.inputWrapper}>
                  <Text style={styles.atPrefix}>@</Text>
                  <TextInput
                    style={styles.textInput}
                    placeholder="your_username"
                    placeholderTextColor={Colors.onSurfaceVariant}
                    value={customUsername}
                    onChangeText={(text) => {
                      setCustomUsername(text);
                      if (customError) setCustomError(null);
                    }}
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
                    <Text style={styles.submitBtnText}>Continue</Text>
                  )}
                </TouchableOpacity>
              </View>
            </View>
          )}

          {/* Footer note */}
          <View style={styles.footer}>
            <Text style={styles.footerText}>
              By signing in with Instagram, CloudCrackers will access your public profile name and username.
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
    backgroundColor: 'rgba(0, 0, 0, 0.78)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: Spacing.md,
  },
  modalCard: {
    width: '100%',
    maxWidth: 440,
    backgroundColor: '#1C1917',
    borderRadius: BorderRadius.lg,
    paddingTop: Spacing.lg,
    paddingBottom: Spacing.md,
    paddingHorizontal: Spacing.lg,
    borderWidth: 1,
    borderColor: 'rgba(225, 48, 108, 0.25)',
    shadowColor: '#E1306C',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.25,
    shadowRadius: 20,
    elevation: 20,
  },
  header: {
    alignItems: 'center',
    marginBottom: Spacing.lg,
  },
  instaBadge: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: '#E1306C',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: Spacing.sm,
    shadowColor: '#E1306C',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.4,
    shadowRadius: 6,
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
    color: '#E1306C',
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
    backgroundColor: 'rgba(225, 48, 108, 0.15)',
  },
  avatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    marginRight: Spacing.md,
    borderWidth: 1,
    borderColor: '#E1306C',
  },
  initialAvatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#E1306C',
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
  accountUsername: {
    fontSize: 12,
    fontFamily: 'Inter-Regular',
    color: '#E1306C',
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
    backgroundColor: 'rgba(225, 48, 108, 0.12)',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: Spacing.md,
  },
  anotherAccountText: {
    fontSize: 14,
    fontFamily: 'Inter-Medium',
    color: '#E1306C',
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
  atPrefix: {
    color: '#E1306C',
    fontSize: 16,
    fontFamily: 'Inter-Bold',
    marginRight: 6,
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
    backgroundColor: '#E1306C',
    paddingVertical: 10,
    paddingHorizontal: Spacing.lg,
    borderRadius: BorderRadius.md,
    minWidth: 140,
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
  officialInstaBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#E1306C',
    paddingVertical: 10,
    paddingHorizontal: Spacing.md,
    borderRadius: BorderRadius.md,
    marginBottom: Spacing.md,
    gap: 8,
    shadowColor: '#E1306C',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 6,
    elevation: 4,
  },
  officialInstaBadge: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  officialInstaText: {
    fontSize: 13,
    fontFamily: 'Inter-SemiBold',
    color: '#FFFFFF',
  },
});

export default InstagramAccountChooserModal;
