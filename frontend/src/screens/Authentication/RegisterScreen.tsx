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
import { Checkbox } from '@/components/inputs/Checkbox';
import { PrimaryButton } from '@/components/buttons/PrimaryButton';
import { GoogleAccountChooserModal } from '@/components/auth/GoogleAccountChooserModal';
import { InstagramAccountChooserModal } from '@/components/auth/InstagramAccountChooserModal';
import { googleAuthService } from '@/services/googleAuthService';
import { GoogleAuthPayload, InstagramAuthPayload } from '@/services/authService';
import { RootStackParamList } from '@/navigation/types';
import { useAuthStore } from '@/store/authStore';
import { ENV } from '@/config/env';

type RegisterScreenProps = NativeStackScreenProps<RootStackParamList, 'Register'>;

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const IS_DESKTOP = SCREEN_WIDTH >= 900;

interface RegisterErrors {
  name?: string;
  email?: string;
  phone?: string;
  password?: string;
  confirmPassword?: string;
  terms?: string;
  general?: string;
}

export const RegisterScreen: React.FC<RegisterScreenProps> = ({ navigation }) => {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [acceptedTerms, setAcceptedTerms] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [isGoogleLoading, setIsGoogleLoading] = useState(false);
  const [showGoogleModal, setShowGoogleModal] = useState(false);
  const [isInstagramLoading, setIsInstagramLoading] = useState(false);
  const [showInstagramModal, setShowInstagramModal] = useState(false);
  const [errors, setErrors] = useState<RegisterErrors>({});

  const validateForm = (): boolean => {
    const newErrors: RegisterErrors = {};

    // Full Name validation (Must contain letters only, no pure numbers or special symbols)
    if (!name.trim()) {
      newErrors.name = 'Full Name is required';
    } else if (name.trim().length < 2) {
      newErrors.name = 'Full Name must be at least 2 characters';
    } else if (!/^[a-zA-Z\s.'-]+$/.test(name.trim())) {
      newErrors.name = 'Full Name must only contain letters (numbers and special characters are not allowed)';
    }

    // Email validation (Must have valid username and complete domain e.g. name@gmail.com, name@domain.com)
    if (!email.trim()) {
      newErrors.email = 'Email address is required';
    } else {
      const emailRegex = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;
      if (!emailRegex.test(email.trim())) {
        newErrors.email = 'Please enter a valid email address with a valid domain (e.g. yourname@gmail.com)';
      }
    }

    // Phone Number validation
    if (!phone.trim()) {
      newErrors.phone = 'Phone number is required';
    } else {
      const phoneClean = phone.replace(/[^0-9]/g, '');
      if (phoneClean.length < 10) {
        newErrors.phone = 'Please enter a valid 10-digit phone number';
      }
    }

    // Password validation
    if (!password) {
      newErrors.password = 'Password is required';
    } else if (password.length < 8) {
      newErrors.password = 'Password must be at least 8 characters long';
    } else if (!/[A-Z]/.test(password)) {
      newErrors.password = 'Password must contain at least one uppercase letter';
    } else if (!/[a-z]/.test(password)) {
      newErrors.password = 'Password must contain at least one lowercase letter';
    } else if (!/\d/.test(password)) {
      newErrors.password = 'Password must contain at least one number';
    } else if (!/[@$!%*#?&]/.test(password)) {
      newErrors.password = 'Password must contain at least one special character (@$!%*#?&)';
    }

    // Confirm Password validation
    if (!confirmPassword) {
      newErrors.confirmPassword = 'Please confirm your password';
    } else if (confirmPassword !== password) {
      newErrors.confirmPassword = 'Passwords do not match';
    }

    // Terms validation
    if (!acceptedTerms) {
      newErrors.terms = 'You must agree to the Terms & Privacy Policy';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const storeRegister = useAuthStore((state) => state.register);
  const storeLoginWithGoogle = useAuthStore((state) => state.loginWithGoogle);
  const storeLoginWithInstagram = useAuthStore((state) => state.loginWithInstagram);

  const handleRegister = async () => {
    if (!validateForm()) return;

    setIsLoading(true);

    // TEMPORARY RUNTIME LOGGING
    console.error('--- REGISTRATION ATTEMPT ---');
    console.error('API_BASE_URL is:', ENV.API_BASE_URL);
    console.error('EXPO_PUBLIC_API_URL is:', process.env.EXPO_PUBLIC_API_URL);

    const success = await storeRegister(
      name.trim(),
      email.trim(),
      password,
      phone.trim(),
      confirmPassword
    );
    setIsLoading(false);

    if (success) {
      navigation.navigate('Home');
    } else {
      const storeError = useAuthStore.getState().error || 'Registration failed. Please try again.';
      if (storeError.toLowerCase().includes('password')) {
        setErrors({ password: storeError });
      } else if (storeError.toLowerCase().includes('phone')) {
        setErrors({ phone: storeError });
      } else if (storeError.toLowerCase().includes('email')) {
        setErrors({ email: storeError });
      } else {
        // Generic errors like "Network Error"
        setErrors({ general: storeError });
      }
    }
  };

  const handleGoogleLoginClick = async () => {
    setErrors({});
    setIsGoogleLoading(true);

    const nativeLaunched = await googleAuthService.triggerNativeGooglePopup(
      async (payload) => {
        const success = await storeLoginWithGoogle(payload);
        setIsGoogleLoading(false);
        if (success) {
          navigation.navigate('Home');
        } else {
          const storeError = useAuthStore.getState().error;
          setErrors({ email: storeError || 'Google registration failed.' });
        }
      },
      (errorMsg) => {
        setIsGoogleLoading(false);
        setErrors({ email: errorMsg || 'Google authentication error.' });
      }
    );

    if (!nativeLaunched) {
      setIsGoogleLoading(false);
      setShowGoogleModal(true);
    }
  };

  const handleGoogleAccountSelect = async (payload: GoogleAuthPayload) => {
    setIsGoogleLoading(true);
    const success = await storeLoginWithGoogle(payload);
    setIsGoogleLoading(false);

    if (success) {
      setShowGoogleModal(false);
      navigation.navigate('Home');
    } else {
      const storeError = useAuthStore.getState().error;
      setErrors({ email: storeError || 'Google registration failed.' });
    }
  };

  const handleInstagramLoginClick = () => {
    setErrors({});
    setShowInstagramModal(true);
  };

  const handleInstagramAccountSelect = async (payload: InstagramAuthPayload) => {
    setIsInstagramLoading(true);
    const success = await storeLoginWithInstagram(payload);
    setIsInstagramLoading(false);

    if (success) {
      setShowInstagramModal(false);
      navigation.navigate('Home');
    } else {
      const storeError = useAuthStore.getState().error;
      setErrors({ email: storeError || 'Instagram registration failed.' });
    }
  };

  const handleSignIn = () => {
    navigation.navigate('Login');
  };

  return (
    <SafeAreaView style={styles.safeArea} edges={['top', 'left', 'right']}>
      <KeyboardAvoidingView
        style={styles.keyboardView}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <ScrollView
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
          <View style={styles.mainContainer}>
            {/* Desktop Left Side Branding Banner */}
            {IS_DESKTOP && (
              <View style={styles.leftBranding}>
                <Text style={styles.heroBrandName}>CloudCrackers</Text>
                <Text style={styles.heroSubHeading}>
                  Light up the sky with the most premium pyrotechnics on the market.
                </Text>
                <View style={styles.heroImageCard}>
                  <MaterialIcons name="local-fire-department" size={80} color={Colors.primary} />
                  <Text style={styles.quoteText}>
                    "The most trusted name in professional displays."
                  </Text>
                </View>
              </View>
            )}

            {/* Right Side Form Card */}
            <View style={styles.formCard}>
              <View style={styles.headerBox}>
                <Text style={styles.formTitle}>Join the Celebration</Text>
                <Text style={styles.formSubtitle}>
                  Create your CloudCrackers account to start building your show.
                </Text>
              </View>

              {/* Full Name */}
              <CustomInput
                label="FULL NAME"
                placeholder="John Doe"
                value={name}
                onChangeText={(text) => {
                  setName(text);
                  if (errors.name) setErrors((prev) => ({ ...prev, name: undefined }));
                }}
                error={errors.name}
                leftIcon={
                  <MaterialIcons name="person-outline" size={20} color={Colors.tertiary} />
                }
              />

              {/* Email Address */}
              <CustomInput
                label="EMAIL ADDRESS"
                placeholder="john@example.com"
                value={email}
                onChangeText={(text) => {
                  setEmail(text);
                  if (errors.email) setErrors((prev) => ({ ...prev, email: undefined }));
                }}
                keyboardType="email-address"
                autoCapitalize="none"
                error={errors.email}
                leftIcon={
                  <MaterialIcons name="mail-outline" size={20} color={Colors.tertiary} />
                }
              />

              {/* Phone Number */}
              <CustomInput
                label="PHONE NUMBER"
                placeholder="+1 (555) 000-0000"
                value={phone}
                onChangeText={(text) => {
                  setPhone(text);
                  if (errors.phone) setErrors((prev) => ({ ...prev, phone: undefined }));
                }}
                keyboardType="phone-pad"
                error={errors.phone}
                leftIcon={
                  <MaterialIcons name="phone-android" size={20} color={Colors.tertiary} />
                }
              />

              {/* Password */}
              <PasswordInput
                label="PASSWORD"
                placeholder="••••••••"
                value={password}
                onChangeText={(text) => {
                  setPassword(text);
                  if (errors.password) setErrors((prev) => ({ ...prev, password: undefined }));
                }}
                error={errors.password}
              />

              {/* Confirm Password */}
              <PasswordInput
                label="CONFIRM PASSWORD"
                placeholder="••••••••"
                value={confirmPassword}
                onChangeText={(text) => {
                  setConfirmPassword(text);
                  if (errors.confirmPassword)
                    setErrors((prev) => ({ ...prev, confirmPassword: undefined }));
                }}
                error={errors.confirmPassword}
              />

              {/* Terms Checkbox */}
              <View style={styles.termsContainer}>
                <Checkbox
                  label="I agree to the Terms & Conditions and Privacy Policy"
                  checked={acceptedTerms}
                  onChange={(checked) => {
                    setAcceptedTerms(checked);
                    if (errors.terms) setErrors((prev) => ({ ...prev, terms: undefined }));
                  }}
                />
                {errors.terms && <Text style={styles.errorText}>{errors.terms}</Text>}
              </View>

              {/* General Form Error Banner */}
              {errors.general && (
                <View style={styles.errorBanner}>
                  <MaterialIcons name="error-outline" size={20} color={Colors.error} />
                  <Text style={styles.errorBannerText}>{errors.general}</Text>
                </View>
              )}

              {/* Submit Button */}
              <PrimaryButton
                title="Create Account"
                onPress={handleRegister}
                loading={isLoading}
                icon={
                  <MaterialIcons name="arrow-forward" size={20} color={Colors.onPrimary} />
                }
                style={styles.submitButton}
              />

              {/* Divider */}
              <View style={styles.dividerRow}>
                <View style={styles.dividerLine} />
                <Text style={styles.dividerText}>OR SIGN UP WITH</Text>
                <View style={styles.dividerLine} />
              </View>

              {/* Social Logins */}
              <View style={styles.socialRow}>
                <TouchableOpacity
                  style={styles.socialButton}
                  activeOpacity={0.8}
                  onPress={handleGoogleLoginClick}
                  disabled={isGoogleLoading || isLoading}
                >
                  <MaterialIcons name="g-mobiledata" size={28} color="#4285F4" />
                  <Text style={styles.socialText}>Google</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={[styles.socialButton, styles.instagramBtn]}
                  activeOpacity={0.8}
                  onPress={handleInstagramLoginClick}
                  disabled={isInstagramLoading || isLoading}
                >
                  <MaterialIcons name="camera-alt" size={20} color="#E1306C" />
                  <Text style={[styles.socialText, { color: '#E1306C', fontFamily: 'Inter-SemiBold' }]}>Instagram</Text>
                </TouchableOpacity>
              </View>

              {/* Footer Login Link */}
              <View style={styles.loginRow}>
                <Text style={styles.loginText}>Already have an account? </Text>
                <TouchableOpacity onPress={handleSignIn} activeOpacity={0.7}>
                  <Text style={styles.loginLink}>Sign in here</Text>
                </TouchableOpacity>
              </View>
            </View>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>

      {/* Google Account Selector Modal */}
      <GoogleAccountChooserModal
        visible={showGoogleModal}
        onClose={() => setShowGoogleModal(false)}
        onSelectAccount={handleGoogleAccountSelect}
        isLoading={isGoogleLoading}
      />

      {/* Instagram Account Selector Modal */}
      <InstagramAccountChooserModal
        visible={showInstagramModal}
        onClose={() => setShowInstagramModal(false)}
        onSelectAccount={handleInstagramAccountSelect}
        isLoading={isInstagramLoading}
      />
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: Colors.background,
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
  mainContainer: {
    width: '100%',
    maxWidth: 1100,
    flexDirection: IS_DESKTOP ? 'row' : 'column',
    alignItems: 'center',
    gap: Spacing.xl,
  },
  leftBranding: {
    flex: 1,
    gap: Spacing.md,
  },
  heroBrandName: {
    ...Typography.displayLg,
    fontFamily: 'Inter-Bold',
    color: Colors.primary,
  },
  heroSubHeading: {
    ...Typography.titleLg,
    fontFamily: 'Inter-Regular',
    color: Colors.onSurfaceVariant,
  },
  heroImageCard: {
    height: 380,
    backgroundColor: Colors.splashBackground,
    borderRadius: BorderRadius.xl,
    alignItems: 'center',
    justifyContent: 'center',
    padding: Spacing.lg,
    borderWidth: 1,
    borderColor: Colors.surfaceContainerHigh,
  },
  quoteText: {
    ...Typography.headlineLg,
    fontFamily: 'Inter-Medium',
    fontStyle: 'italic',
    color: '#ffffff',
    textAlign: 'center',
    marginTop: Spacing.md,
  },
  formCard: {
    flex: 1,
    width: '100%',
    maxWidth: 460,
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
  },
  headerBox: {
    marginBottom: Spacing.md,
  },
  formTitle: {
    ...Typography.headlineLg,
    fontFamily: 'Inter-Bold',
    color: Colors.onSurface,
  },
  formSubtitle: {
    ...Typography.bodyMd,
    fontFamily: 'Inter-Regular',
    color: Colors.onSurfaceVariant,
    marginTop: 2,
  },
  termsContainer: {
    marginVertical: Spacing.xs,
  },
  errorText: {
    ...Typography.labelLg,
    color: Colors.error,
    marginTop: 4,
  },
  errorBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.errorContainer,
    padding: Spacing.sm,
    borderRadius: BorderRadius.sm,
    marginBottom: Spacing.sm,
    marginTop: Spacing.sm,
    gap: Spacing.xs,
  },
  errorBannerText: {
    ...Typography.bodyMd,
    color: Colors.error,
    flex: 1,
    lineHeight: 18,
  },
  submitButton: {
    marginTop: Spacing.md,
  },
  dividerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginVertical: Spacing.md,
  },
  dividerLine: {
    flex: 1,
    height: 1,
    backgroundColor: Colors.surfaceContainerHigh,
  },
  dividerText: {
    fontSize: 11,
    fontFamily: 'Inter-Medium',
    color: Colors.onSurfaceVariant,
    marginHorizontal: Spacing.sm,
    letterSpacing: 0.8,
  },
  socialRow: {
    flexDirection: 'row',
    gap: Spacing.sm,
    marginBottom: Spacing.xs,
  },
  socialButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    height: 48,
    backgroundColor: Colors.surfaceContainer,
    borderRadius: BorderRadius.md,
    borderWidth: 1,
    borderColor: Colors.surfaceContainerHigh,
    gap: Spacing.xs,
  },
  socialText: {
    fontSize: 14,
    fontFamily: 'Inter-Medium',
    color: Colors.onSurface,
  },
  instagramBtn: {
    borderColor: 'rgba(225, 48, 108, 0.4)',
    backgroundColor: 'rgba(225, 48, 108, 0.08)',
  },
  loginRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: Spacing.lg,
    paddingTop: Spacing.md,
    borderTopWidth: 1,
    borderTopColor: Colors.surfaceContainerHigh,
  },
  loginText: {
    ...Typography.bodyMd,
    fontFamily: 'Inter-Regular',
    color: Colors.onSurfaceVariant,
  },
  loginLink: {
    ...Typography.bodyMd,
    fontFamily: 'Inter-Bold',
    color: Colors.primary,
  },
});

export default RegisterScreen;
