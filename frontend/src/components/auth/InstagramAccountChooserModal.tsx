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
  const [customHandle, setCustomHandle] = useState('');
  const [customName, setCustomName] = useState('');
  const [customError, setCustomError] = useState<string | null>(null);

  useEffect(() => {
    if (visible) {
      setAccounts(instagramAuthService.getSavedAccounts());
      setIsCustomMode(false);
      setSelectedUsername(null);
      setCustomHandle('');
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
    const handleRaw = customHandle.trim().replace(/^@/, '');
    if (!handleRaw) {
      setCustomError('Please enter your Instagram username');
      return;
    }

    const name = customName.trim() || handleRaw.charAt(0).toUpperCase() + handleRaw.slice(1);
    const newAccount: SavedInstagramAccount = {
      username: handleRaw,
      name,
      avatarUrl: `https://ui-avatars.com/api/?name=${encodeURIComponent(name)}&background=e1306c&color=fff`,
    };

    setSelectedUsername(handleRaw);
    instagramAuthService.saveAccountToRecent(newAccount);
    await onSelectAccount({
      username: newAccount.username,
      fullName: newAccount.name,
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
      <Pressable style={styles.backdrop} onPress={onClose}>
        <Pressable style={styles.modalCard} onPress={(e) => e.stopPropagation()}>
          {/* Header */}
          <View style={styles.modalHeader}>
            <View style={styles.headerTitleRow}>
              <View style={styles.instagramBadgeCircle}>
                <MaterialIcons name="camera-alt" size={20} color="#FFFFFF" />
              </View>
              <View>
                <Text style={styles.modalTitle}>Sign in with Instagram</Text>
                <Text style={styles.modalSubtitle}>Select an account or enter your username</Text>
              </View>
            </View>
            <TouchableOpacity
              style={styles.closeBtn}
              onPress={onClose}
              disabled={isLoading}
              hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
            >
              <MaterialIcons name="close" size={20} color={Colors.tertiary} />
            </TouchableOpacity>
          </View>

          {/* Body */}
          <ScrollView
            style={styles.scrollBody}
            contentContainerStyle={styles.scrollContent}
            showsVerticalScrollIndicator={false}
          >
            {isLoading ? (
              <View style={styles.loadingContainer}>
                <ActivityIndicator size="large" color="#E1306C" />
                <Text style={styles.loadingText}>Authenticating with Instagram...</Text>
              </View>
            ) : !isCustomMode ? (
              <>
                <Text style={styles.sectionLabel}>CHOOSE AN INSTAGRAM ACCOUNT</Text>

                {accounts.map((acc) => {
                  const isSelected = selectedUsername === acc.username;
                  return (
                    <TouchableOpacity
                      key={acc.username}
                      style={[
                        styles.accountRow,
                        isSelected && styles.accountRowSelected,
                      ]}
                      onPress={() => handleAccountClick(acc)}
                      activeOpacity={0.7}
                    >
                      <Image
                        source={{
                          uri:
                            acc.avatarUrl ||
                            `https://ui-avatars.com/api/?name=${encodeURIComponent(acc.name)}&background=e1306c&color=fff`,
                        }}
                        style={styles.avatar}
                      />
                      <View style={styles.accountTextCol}>
                        <Text style={styles.accountName}>{acc.name}</Text>
                        <Text style={styles.accountUsername}>@{acc.username}</Text>
                      </View>
                      <MaterialIcons
                        name="chevron-right"
                        size={22}
                        color={isSelected ? '#E1306C' : Colors.tertiary}
                      />
                    </TouchableOpacity>
                  );
                })}

                {/* Custom Username Button */}
                <TouchableOpacity
                  style={styles.useAnotherBtn}
                  onPress={() => {
                    setIsCustomMode(true);
                    setCustomError(null);
                  }}
                  activeOpacity={0.7}
                >
                  <MaterialIcons name="alternate-email" size={20} color="#E1306C" />
                  <Text style={styles.useAnotherText}>Use another Instagram username</Text>
                </TouchableOpacity>
              </>
            ) : (
              /* Custom Username Input Form */
              <View style={styles.customForm}>
                <Text style={styles.sectionLabel}>ENTER YOUR INSTAGRAM HANDLE</Text>

                {customError && (
                  <View style={styles.errorBox}>
                    <MaterialIcons name="error-outline" size={16} color="#D32F2F" />
                    <Text style={styles.errorText}>{customError}</Text>
                  </View>
                )}

                <View style={styles.inputGroup}>
                  <Text style={styles.inputLabel}>Instagram Username *</Text>
                  <View style={styles.inputWrapper}>
                    <Text style={styles.atSymbol}>@</Text>
                    <TextInput
                      style={styles.input}
                      placeholder="username"
                      placeholderTextColor={Colors.tertiary}
                      value={customHandle}
                      onChangeText={(val) => {
                        setCustomHandle(val);
                        setCustomError(null);
                      }}
                      autoCapitalize="none"
                      autoCorrect={false}
                    />
                  </View>
                </View>

                <View style={styles.inputGroup}>
                  <Text style={styles.inputLabel}>Full Name (Optional)</Text>
                  <View style={styles.inputWrapper}>
                    <MaterialIcons name="person-outline" size={18} color={Colors.tertiary} />
                    <TextInput
                      style={styles.input}
                      placeholder="e.g. Athilingam"
                      placeholderTextColor={Colors.tertiary}
                      value={customName}
                      onChangeText={setCustomName}
                    />
                  </View>
                </View>

                <TouchableOpacity
                  style={styles.submitBtn}
                  onPress={handleCustomSubmit}
                  activeOpacity={0.8}
                >
                  <Text style={styles.submitBtnText}>Continue with Instagram</Text>
                  <MaterialIcons name="arrow-forward" size={18} color="#FFFFFF" />
                </TouchableOpacity>

                <TouchableOpacity
                  style={styles.backBtn}
                  onPress={() => setIsCustomMode(false)}
                  activeOpacity={0.7}
                >
                  <MaterialIcons name="arrow-back" size={16} color={Colors.tertiary} />
                  <Text style={styles.backBtnText}>Back to saved accounts</Text>
                </TouchableOpacity>
              </View>
            )}
          </ScrollView>
        </Pressable>
      </Pressable>
    </Modal>
  );
};

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.55)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: Spacing.marginMobile,
  },
  modalCard: {
    width: '100%',
    maxWidth: 420,
    maxHeight: '85%',
    backgroundColor: Colors.surfaceContainerLowest,
    borderRadius: BorderRadius.xl,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: Colors.surfaceContainerHigh,
    shadowColor: Colors.shadowColor,
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.15,
    shadowRadius: 16,
    elevation: 8,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: Spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: Colors.surfaceContainerHigh,
    backgroundColor: Colors.surfaceContainerLow,
  },
  headerTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    flex: 1,
  },
  instagramBadgeCircle: {
    width: 38,
    height: 38,
    borderRadius: BorderRadius.full,
    backgroundColor: '#E1306C',
    alignItems: 'center',
    justifyContent: 'center',
  },
  modalTitle: {
    ...Typography.titleLg,
    fontSize: 16,
    fontFamily: 'Inter-Bold',
    color: Colors.onSurface,
  },
  modalSubtitle: {
    ...Typography.bodyMd,
    fontSize: 12,
    color: Colors.tertiary,
    marginTop: 2,
  },
  closeBtn: {
    width: 32,
    height: 32,
    borderRadius: BorderRadius.full,
    backgroundColor: Colors.surfaceContainerLowest,
    alignItems: 'center',
    justifyContent: 'center',
  },
  scrollBody: {
    maxHeight: 450,
  },
  scrollContent: {
    padding: Spacing.md,
  },
  loadingContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: Spacing.xl,
    gap: Spacing.sm,
  },
  loadingText: {
    ...Typography.bodyMd,
    color: Colors.onSurfaceVariant,
  },
  sectionLabel: {
    ...Typography.labelLg,
    fontSize: 10,
    fontFamily: 'Inter-Bold',
    color: Colors.tertiary,
    letterSpacing: 1,
    marginBottom: Spacing.xs,
  },
  accountRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.surfaceContainerLow,
    borderRadius: BorderRadius.lg,
    padding: Spacing.sm + 2,
    marginBottom: Spacing.xs,
    borderWidth: 1,
    borderColor: Colors.surfaceContainerHigh,
    gap: Spacing.sm,
  },
  accountRowSelected: {
    borderColor: '#E1306C',
    backgroundColor: '#FFF0F5',
  },
  avatar: {
    width: 42,
    height: 42,
    borderRadius: 21,
    borderWidth: 1.5,
    borderColor: '#E1306C',
  },
  accountTextCol: {
    flex: 1,
  },
  accountName: {
    ...Typography.titleLg,
    fontSize: 14,
    fontFamily: 'Inter-Bold',
    color: Colors.onSurface,
  },
  accountUsername: {
    ...Typography.bodyMd,
    fontSize: 12,
    color: Colors.tertiary,
    marginTop: 2,
  },
  useAnotherBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: Spacing.sm + 2,
    borderRadius: BorderRadius.lg,
    borderWidth: 1,
    borderColor: '#F8BBD0',
    backgroundColor: '#FFF5F8',
    gap: 8,
    marginTop: Spacing.xs,
  },
  useAnotherText: {
    ...Typography.labelLg,
    fontSize: 13,
    fontFamily: 'Inter-Bold',
    color: '#E1306C',
  },
  customForm: {
    gap: Spacing.xs,
  },
  errorBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFEBEE',
    borderWidth: 1,
    borderColor: '#FFCDD2',
    padding: Spacing.xs + 2,
    borderRadius: BorderRadius.md,
    gap: 6,
    marginBottom: Spacing.xs,
  },
  errorText: {
    ...Typography.bodyMd,
    fontSize: 12,
    color: '#D32F2F',
  },
  inputGroup: {
    marginBottom: Spacing.xs,
  },
  inputLabel: {
    ...Typography.labelLg,
    fontSize: 12,
    color: Colors.onSurface,
    marginBottom: 4,
  },
  inputWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.surfaceContainerLow,
    borderRadius: BorderRadius.lg,
    borderWidth: 1,
    borderColor: Colors.surfaceContainerHigh,
    paddingHorizontal: Spacing.sm,
    height: 44,
    gap: 6,
  },
  atSymbol: {
    ...Typography.titleLg,
    fontSize: 15,
    fontFamily: 'Inter-Bold',
    color: '#E1306C',
  },
  input: {
    flex: 1,
    ...Typography.bodyLg,
    fontSize: 14,
    color: Colors.onSurface,
  },
  submitBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#E1306C',
    height: 46,
    borderRadius: BorderRadius.lg,
    gap: 8,
    marginTop: Spacing.xs,
  },
  submitBtnText: {
    ...Typography.labelLg,
    fontSize: 14,
    fontFamily: 'Inter-Bold',
    color: '#FFFFFF',
  },
  backBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: Spacing.xs,
    gap: 4,
    marginTop: 4,
  },
  backBtnText: {
    ...Typography.labelLg,
    fontSize: 12,
    color: Colors.tertiary,
  },
});

export default InstagramAccountChooserModal;
