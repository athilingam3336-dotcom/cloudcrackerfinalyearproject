import React, { useState } from 'react';
import {
  View,
  Text,
  Modal,
  StyleSheet,
  TouchableOpacity,
  TextInput,
  ActivityIndicator,
  Pressable,
} from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { Colors } from '@/constants/colors';
import { Typography } from '@/constants/typography';
import { Spacing, BorderRadius } from '@/constants/spacing';
import { InstagramAuthPayload } from '@/services/authService';

interface InstagramLoginModalProps {
  visible: boolean;
  onClose: () => void;
  onLogin: (payload: InstagramAuthPayload) => Promise<void>;
  isLoading?: boolean;
}

export const InstagramLoginModal: React.FC<InstagramLoginModalProps> = ({
  visible,
  onClose,
  onLogin,
  isLoading = false,
}) => {
  const [username, setUsername] = useState('');
  const [fullName, setFullName] = useState('');
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async () => {
    const raw = username.trim().replace(/^@/, '');
    if (!raw) {
      setError('Please enter your Instagram username, phone or email');
      return;
    }

    setError(null);
    const cleanUser = raw.toLowerCase();
    const name = fullName.trim() || cleanUser.charAt(0).toUpperCase() + cleanUser.slice(1);

    await onLogin({
      username: cleanUser,
      fullName: name,
      avatarUrl: `https://ui-avatars.com/api/?name=${encodeURIComponent(name)}&background=E1306C&color=fff`,
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
          {/* Instagram Header */}
          <View style={styles.header}>
            <View style={styles.instaBadge}>
              <MaterialIcons name="camera-alt" size={28} color="#FFFFFF" />
            </View>
            <Text style={styles.title}>Sign in with Instagram</Text>
            <Text style={styles.subtitle}>
              Connect your Instagram account to <Text style={styles.brandName}>CloudCrackers</Text>
            </Text>
          </View>

          {/* Login Form */}
          <View style={styles.form}>
            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>INSTAGRAM USERNAME / PHONE / EMAIL</Text>
              <View style={styles.inputWrapper}>
                <Text style={styles.atPrefix}>@</Text>
                <TextInput
                  style={styles.textInput}
                  placeholder="username (e.g. mx._.athi)"
                  placeholderTextColor={Colors.onSurfaceVariant}
                  value={username}
                  onChangeText={(text) => {
                    setUsername(text);
                    if (error) setError(null);
                  }}
                  autoCapitalize="none"
                  autoCorrect={false}
                  autoFocus
                />
              </View>
              {error && <Text style={styles.errorText}>{error}</Text>}
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>FULL NAME (OPTIONAL)</Text>
              <View style={styles.inputWrapper}>
                <MaterialIcons name="person-outline" size={20} color={Colors.onSurfaceVariant} style={styles.inputIcon} />
                <TextInput
                  style={styles.textInput}
                  placeholder="Your Name"
                  placeholderTextColor={Colors.onSurfaceVariant}
                  value={fullName}
                  onChangeText={setFullName}
                />
              </View>
            </View>

            {/* Action Buttons */}
            <TouchableOpacity
              style={styles.submitBtn}
              onPress={handleSubmit}
              disabled={isLoading}
              activeOpacity={0.85}
            >
              {isLoading ? (
                <ActivityIndicator size="small" color="#FFFFFF" />
              ) : (
                <>
                  <Text style={styles.submitBtnText}>Log In with Instagram</Text>
                  <MaterialIcons name="arrow-forward" size={18} color="#FFFFFF" />
                </>
              )}
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.cancelBtn}
              onPress={onClose}
              disabled={isLoading}
            >
              <Text style={styles.cancelBtnText}>Cancel</Text>
            </TouchableOpacity>
          </View>

          {/* Footer Notice */}
          <View style={styles.footer}>
            <Text style={styles.footerText}>
              Logging in connects your Instagram handle securely to CloudCrackers Pyrotechnics.
            </Text>
          </View>
        </Pressable>
      </Pressable>
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.82)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: Spacing.md,
  },
  modalCard: {
    width: '100%',
    maxWidth: 420,
    backgroundColor: '#18181B',
    borderRadius: BorderRadius.lg,
    paddingTop: Spacing.xl,
    paddingBottom: Spacing.lg,
    paddingHorizontal: Spacing.xl,
    borderWidth: 1,
    borderColor: 'rgba(225, 48, 108, 0.3)',
    shadowColor: '#E1306C',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.3,
    shadowRadius: 24,
    elevation: 24,
  },
  header: {
    alignItems: 'center',
    marginBottom: Spacing.lg,
  },
  instaBadge: {
    width: 54,
    height: 54,
    borderRadius: 27,
    backgroundColor: '#E1306C',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: Spacing.sm + 2,
    shadowColor: '#E1306C',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.45,
    shadowRadius: 10,
    elevation: 8,
  },
  title: {
    fontSize: 22,
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
    fontFamily: 'Inter-SemiBold',
  },
  form: {
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
    backgroundColor: '#09090B',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.14)',
    borderRadius: BorderRadius.md,
    paddingHorizontal: Spacing.sm + 2,
    height: 48,
  },
  atPrefix: {
    color: '#E1306C',
    fontSize: 17,
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
  submitBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#E1306C',
    height: 48,
    borderRadius: BorderRadius.md,
    marginTop: Spacing.sm,
    gap: Spacing.xs,
    shadowColor: '#E1306C',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.35,
    shadowRadius: 8,
    elevation: 6,
  },
  submitBtnText: {
    color: '#FFFFFF',
    fontSize: 15,
    fontFamily: 'Inter-Bold',
  },
  cancelBtn: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: Spacing.sm,
    marginTop: 4,
  },
  cancelBtnText: {
    color: Colors.onSurfaceVariant,
    fontSize: 14,
    fontFamily: 'Inter-Medium',
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
    opacity: 0.8,
  },
});

export default InstagramLoginModal;
