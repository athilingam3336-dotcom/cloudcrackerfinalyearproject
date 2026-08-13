import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  KeyboardAvoidingView,
  Platform,
  Dimensions,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { MaterialIcons } from '@expo/vector-icons';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { Colors } from '@/constants/colors';
import { Typography } from '@/constants/typography';
import { Spacing, BorderRadius } from '@/constants/spacing';
import { CustomInput } from '@/components/inputs/CustomInput';
import { PasswordInput } from '@/components/inputs/PasswordInput';
import { PrimaryButton } from '@/components/buttons/PrimaryButton';
import { RootStackParamList } from '@/navigation/types';
import { authService } from '@/services/authService';
import { useAuthStore } from '@/store/authStore';

type ForgotPasswordScreenProps = NativeStackScreenProps<
  RootStackParamList,
  'ForgotPassword'
>;

const { width: SCREEN_WIDTH } = Dimensions.get('window');

export const ForgotPasswordScreen: React.FC<ForgotPasswordScreenProps> = ({
  navigation,
}) => {
  const [step, setStep] = useState<1 | 2 | 3>(1); // 1: Email verification, 2: New Password, 3: Success
  const [email, setEmail] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [errors, setErrors] = useState<{
    email?: string;
    password?: string;
    confirmPassword?: string;
    general?: string;
  }>({});

  const storeResetPassword = useAuthStore((state) => state.resetPassword);

  const validateEmailStep = (): boolean => {
    const newErrors: typeof errors = {};
    if (!email.trim()) {
      newErrors.email = 'Email address is required';
    } else {
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(email.trim())) {
        newErrors.email = 'Please enter a valid email address';
      }
    }
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const validatePasswordStep = (): boolean => {
    const newErrors: typeof errors = {};
    if (!newPassword) {
      newErrors.password = 'New password is required';
    } else if (newPassword.length < 8) {
      newErrors.password = 'Password must be at least 8 characters long';
    } else if (!/[A-Z]/.test(newPassword)) {
      newErrors.password = 'Password must contain at least one uppercase letter';
    } else if (!/[a-z]/.test(newPassword)) {
      newErrors.password = 'Password must contain at least one lowercase letter';
    } else if (!/\d/.test(newPassword)) {
      newErrors.password = 'Password must contain at least one number';
    } else if (!/[@$!%*#?&]/.test(newPassword)) {
      newErrors.password = 'Password must contain at least one special character (@$!%*#?&)';
    }

    if (!confirmPassword) {
      newErrors.confirmPassword = 'Please confirm your new password';
    } else if (confirmPassword !== newPassword) {
      newErrors.confirmPassword = 'Passwords do not match';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleVerifyEmail = async () => {
    if (!validateEmailStep()) return;
    setIsLoading(true);
    setErrors({});

    try {
      await authService.forgotPassword(email.trim());
      setIsLoading(false);
      setStep(2);
    } catch (err: any) {
      setIsLoading(false);
      setErrors({ email: err.message || 'No account associated with this email.' });
    }
  };

  const handleResetPasswordSubmit = async () => {
    if (!validatePasswordStep()) return;
    setIsLoading(true);
    setErrors({});

    const success = await storeResetPassword(
      email.trim(),
      newPassword,
      confirmPassword
    );
    setIsLoading(false);

    if (success) {
      setStep(3);
    } else {
      const storeError = useAuthStore.getState().error;
      setErrors({ general: storeError || 'Failed to reset password. Please try again.' });
    }
  };

  const handleBackToLogin = () => {
    navigation.navigate('Login');
  };

  const handleGoHome = () => {
    navigation.navigate('Home');
  };

  return (
    <SafeAreaView style={styles.safeArea} edges={['top', 'left', 'right']}>
      {/* Top Bar Header */}
      <View style={styles.header}>
        <TouchableOpacity
          style={styles.headerIconButton}
          onPress={handleBackToLogin}
        >
          <MaterialIcons name="arrow-back" size={24} color={Colors.primary} />
        </TouchableOpacity>
        <Text style={styles.headerBrand}>CloudCrackers</Text>
        <View style={styles.headerIconButton} />
      </View>

      <KeyboardAvoidingView
        style={styles.keyboardView}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <ScrollView
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
          <View style={styles.cardContainer}>
            {/* Security Illustration Badge */}
            <View style={styles.illustrationContainer}>
              <View style={styles.glowAura} />
              <View style={styles.iconCircle}>
                <MaterialIcons
                  name={
                    step === 3
                      ? 'verified'
                      : step === 2
                      ? 'lock-open'
                      : 'lock-reset'
                  }
                  size={52}
                  color={step === 3 ? '#10B981' : Colors.primary}
                />
              </View>
            </View>

            {/* STEP 1: Email Verification */}
            {step === 1 && (
              <View style={styles.stepContainer}>
                <View style={styles.textGroup}>
                  <Text style={styles.title}>Reset Your Password</Text>
                  <Text style={styles.description}>
                    Enter your registered email address to verify your account and set a new password.
                  </Text>
                </View>

                <View style={styles.form}>
                  <CustomInput
                    label="EMAIL ADDRESS"
                    placeholder="e.g. athi@gmail.com"
                    value={email}
                    onChangeText={(text) => {
                      setEmail(text);
                      if (errors.email) setErrors((prev) => ({ ...prev, email: undefined }));
                    }}
                    keyboardType="email-address"
                    autoCapitalize="none"
                    autoCorrect={false}
                    error={errors.email}
                    leftIcon={
                      <MaterialIcons
                        name="mail-outline"
                        size={20}
                        color={Colors.tertiary}
                      />
                    }
                  />

                  <PrimaryButton
                    title="Continue"
                    onPress={handleVerifyEmail}
                    loading={isLoading}
                    icon={
                      <MaterialIcons
                        name="arrow-forward"
                        size={20}
                        color={Colors.onPrimary}
                      />
                    }
                    style={styles.submitButton}
                  />
                </View>
              </View>
            )}

            {/* STEP 2: Set New Password */}
            {step === 2 && (
              <View style={styles.stepContainer}>
                <View style={styles.textGroup}>
                  <Text style={styles.title}>Create New Password</Text>
                  <Text style={styles.description}>
                    Setting new password for{' '}
                    <Text style={styles.emailHighlight}>{email}</Text>
                  </Text>
                </View>

                {errors.general && (
                  <View style={styles.errorBanner}>
                    <MaterialIcons name="error-outline" size={18} color={Colors.error} />
                    <Text style={styles.errorBannerText}>{errors.general}</Text>
                  </View>
                )}

                <View style={styles.form}>
                  <PasswordInput
                    label="NEW PASSWORD"
                    placeholder="••••••••"
                    value={newPassword}
                    onChangeText={(text) => {
                      setNewPassword(text);
                      if (errors.password)
                        setErrors((prev) => ({ ...prev, password: undefined }));
                    }}
                    error={errors.password}
                  />

                  <PasswordInput
                    label="CONFIRM NEW PASSWORD"
                    placeholder="••••••••"
                    value={confirmPassword}
                    onChangeText={(text) => {
                      setConfirmPassword(text);
                      if (errors.confirmPassword)
                        setErrors((prev) => ({ ...prev, confirmPassword: undefined }));
                    }}
                    error={errors.confirmPassword}
                  />

                  <View style={styles.requirementsBox}>
                    <Text style={styles.requirementsTitle}>Password Requirements:</Text>
                    <Text style={styles.requirementItem}>• At least 8 characters</Text>
                    <Text style={styles.requirementItem}>• Uppercase & lowercase letters</Text>
                    <Text style={styles.requirementItem}>• At least one number (0-9) and symbol (@$!%*#?&)</Text>
                  </View>

                  <PrimaryButton
                    title="Reset Password & Sign In"
                    onPress={handleResetPasswordSubmit}
                    loading={isLoading}
                    icon={
                      <MaterialIcons
                        name="check"
                        size={20}
                        color={Colors.onPrimary}
                      />
                    }
                    style={styles.submitButton}
                  />

                  <TouchableOpacity
                    onPress={() => setStep(1)}
                    style={styles.changeEmailButton}
                    activeOpacity={0.7}
                  >
                    <Text style={styles.changeEmailText}>Use different email</Text>
                  </TouchableOpacity>
                </View>
              </View>
            )}

            {/* STEP 3: Success Confirmation */}
            {step === 3 && (
              <View style={styles.successContainer}>
                <View style={styles.successBadge}>
                  <MaterialIcons
                    name="check-circle"
                    size={48}
                    color={'#10B981'}
                  />
                </View>
                <Text style={styles.successTitle}>Password Updated!</Text>
                <Text style={styles.successDescription}>
                  Your password has been successfully reset for{' '}
                  <Text style={styles.emailHighlight}>{email}</Text>. You are now signed in.
                </Text>

                <PrimaryButton
                  title="Continue to Home"
                  onPress={handleGoHome}
                  style={styles.successLoginButton}
                  icon={
                    <MaterialIcons
                      name="storefront"
                      size={20}
                      color={Colors.onPrimary}
                    />
                  }
                />
              </View>
            )}

            {/* Back to Login Footer Action */}
            {step !== 3 && (
              <TouchableOpacity
                style={styles.backToLoginRow}
                onPress={handleBackToLogin}
                activeOpacity={0.7}
              >
                <MaterialIcons
                  name="chevron-left"
                  size={20}
                  color={Colors.tertiary}
                />
                <Text style={styles.backToLoginText}>Back to Login</Text>
              </TouchableOpacity>
            )}
          </View>

          {/* Legal Footer */}
          <View style={styles.footer}>
            <Text style={styles.legalText}>
              © 2026 CLOUDCRACKERS PYROTECHNICS. ALL RIGHTS RESERVED.
            </Text>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  header: {
    height: 60,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: Spacing.marginMobile,
    backgroundColor: Colors.surface,
    borderBottomWidth: 1,
    borderBottomColor: Colors.surfaceContainerHigh,
  },
  headerBrand: {
    ...Typography.titleLg,
    fontFamily: 'Inter-Bold',
    color: Colors.primary,
  },
  headerIconButton: {
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  keyboardView: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: Spacing.marginMobile,
    paddingVertical: Spacing.xl,
  },
  cardContainer: {
    width: '100%',
    maxWidth: 440,
    backgroundColor: Colors.surfaceContainerLowest,
    borderRadius: BorderRadius.xl,
    padding: SCREEN_WIDTH < 380 ? Spacing.md : Spacing.lg,
    borderWidth: 1,
    borderColor: Colors.surfaceContainerHigh,
    shadowColor: Colors.shadowColor,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 15,
    elevation: 4,
    alignItems: 'center',
  },
  illustrationContainer: {
    width: 110,
    height: 110,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: Spacing.md,
    position: 'relative',
  },
  glowAura: {
    position: 'absolute',
    width: 100,
    height: 100,
    borderRadius: BorderRadius.full,
    backgroundColor: Colors.primaryContainer,
    opacity: 0.2,
  },
  iconCircle: {
    width: 80,
    height: 80,
    borderRadius: BorderRadius.full,
    backgroundColor: Colors.surfaceContainerLow,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: Colors.surfaceContainerHigh,
  },
  stepContainer: {
    width: '100%',
    alignItems: 'center',
  },
  textGroup: {
    alignItems: 'center',
    marginBottom: Spacing.lg,
  },
  title: {
    ...Typography.headlineLg,
    fontFamily: 'Inter-Bold',
    color: Colors.onSurface,
    textAlign: 'center',
    marginBottom: Spacing.xs,
  },
  description: {
    ...Typography.bodyLg,
    fontFamily: 'Inter-Regular',
    color: Colors.onSurfaceVariant,
    textAlign: 'center',
    maxWidth: 340,
  },
  emailHighlight: {
    fontFamily: 'Inter-Bold',
    color: Colors.primary,
  },
  form: {
    width: '100%',
  },
  requirementsBox: {
    backgroundColor: Colors.surfaceContainerLow,
    padding: Spacing.sm,
    borderRadius: BorderRadius.default,
    marginVertical: Spacing.xs,
    borderWidth: 1,
    borderColor: Colors.surfaceContainerHigh,
  },
  requirementsTitle: {
    ...Typography.labelLg,
    fontWeight: '600',
    color: Colors.onSurface,
    marginBottom: 2,
  },
  requirementItem: {
    ...Typography.bodyMd,
    color: Colors.onSurfaceVariant,
    lineHeight: 18,
  },
  errorBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FEE2E2',
    padding: Spacing.sm,
    borderRadius: BorderRadius.default,
    marginBottom: Spacing.sm,
    width: '100%',
    gap: Spacing.xs,
  },
  errorBannerText: {
    ...Typography.bodyMd,
    color: Colors.error,
    flex: 1,
  },
  submitButton: {
    marginTop: Spacing.md,
  },
  changeEmailButton: {
    marginTop: Spacing.sm,
    alignItems: 'center',
    paddingVertical: Spacing.xs,
  },
  changeEmailText: {
    ...Typography.bodyMd,
    fontFamily: 'Inter-Medium',
    color: Colors.primary,
  },
  successContainer: {
    width: '100%',
    alignItems: 'center',
    backgroundColor: Colors.surfaceContainerLow,
    padding: Spacing.lg,
    borderRadius: BorderRadius.xl,
    borderWidth: 1,
    borderColor: Colors.surfaceContainerHigh,
  },
  successBadge: {
    marginBottom: Spacing.sm,
  },
  successTitle: {
    ...Typography.headlineLg,
    fontFamily: 'Inter-Bold',
    color: Colors.onSurface,
    marginBottom: Spacing.xs,
    fontSize: 24,
  },
  successDescription: {
    ...Typography.bodyLg,
    fontFamily: 'Inter-Regular',
    color: Colors.onSurfaceVariant,
    textAlign: 'center',
    marginBottom: Spacing.lg,
  },
  successLoginButton: {
    width: '100%',
  },
  backToLoginRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: Spacing.lg,
    gap: 4,
  },
  backToLoginText: {
    ...Typography.bodyMd,
    fontFamily: 'Inter-Medium',
    color: Colors.tertiary,
  },
  footer: {
    marginTop: Spacing.lg,
    alignItems: 'center',
  },
  legalText: {
    ...Typography.labelLg,
    fontFamily: 'Inter-Regular',
    color: Colors.onSurfaceVariant,
    opacity: 0.6,
    fontSize: 10,
    letterSpacing: 1,
    textAlign: 'center',
  },
});

export default ForgotPasswordScreen;
