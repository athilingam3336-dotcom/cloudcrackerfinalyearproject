import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  KeyboardAvoidingView,
  Platform,
  Dimensions,
  Linking,
  Image,
} from 'react-native';
import { LOCAL_PRODUCT_IMAGES } from '@/constants/productImages';
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
import { InstagramAccountChooserModal } from '@/components/auth/InstagramAccountChooserModal';
import { googleAuthService } from '@/services/googleAuthService';
import { instagramAuthService } from '@/services/instagramAuthService';
import { authService, GoogleAuthPayload, InstagramAuthPayload } from '@/services/authService';
import { RootStackParamList } from '@/navigation/types';
import { useAuthStore } from '@/store/authStore';
import { ENV } from '@/config/env';

type RegisterScreenProps = NativeStackScreenProps<RootStackParamList, 'Register'>;

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const IS_DESKTOP = SCREEN_WIDTH >= 900;

interface RegisterErrors {
  email?: string;
  otp?: string;
  password?: string;
  confirmPassword?: string;
  terms?: string;
  general?: string;
}

export const RegisterScreen: React.FC<RegisterScreenProps> = ({ navigation, route }) => {
  const routeParams = route?.params as { initialEmail?: string } | undefined;
  const [email, setEmail] = useState(routeParams?.initialEmail || '');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [acceptedTerms, setAcceptedTerms] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [isGoogleLoading, setIsGoogleLoading] = useState(false);
  const [isInstagramLoading, setIsInstagramLoading] = useState(false);
  const [showInstagramModal, setShowInstagramModal] = useState(false);
  const [errors, setErrors] = useState<RegisterErrors>({});

  // Email OTP Verification State
  const [isEmailVerified, setIsEmailVerified] = useState(false);
  const [otpSent, setOtpSent] = useState(false);
  const [isSendingOtp, setIsSendingOtp] = useState(false);
  const [isVerifyingOtp, setIsVerifyingOtp] = useState(false);
  const [otpCode, setOtpCode] = useState('');
  const [otpMessage, setOtpMessage] = useState<string | null>(null);

  useEffect(() => {
    if (routeParams?.initialEmail) {
      setEmail(routeParams.initialEmail);
    }
  }, [routeParams?.initialEmail]);

  // Live Email Availability Check States
  const [emailCheckStatus, setEmailCheckStatus] = useState<'idle' | 'checking' | 'available' | 'taken' | 'invalid'>('idle');

  const isValidEmail = (val: string) => {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(val.trim());
  };

  // Immediate + Debounced Live Email Check effect
  useEffect(() => {
    const trimmedEmail = email.trim();
    if (!trimmedEmail) {
      setEmailCheckStatus('idle');
      return;
    }

    if (!isValidEmail(trimmedEmail)) {
      setEmailCheckStatus('invalid');
      return;
    }

    setEmailCheckStatus('checking');
    const timer = setTimeout(async () => {
      try {
        const result = await authService.checkEmail(trimmedEmail);
        if (result.exists) {
          setEmailCheckStatus('taken');
          setErrors((prev) => ({ ...prev, email: 'Account already exists with this email address.' }));
        } else {
          setEmailCheckStatus('available');
          setErrors((prev) => ({ ...prev, email: undefined }));
        }
      } catch (err) {
        setEmailCheckStatus('available');
        setErrors((prev) => ({ ...prev, email: undefined }));
      }
    }, 300);

    return () => clearTimeout(timer);
  }, [email]);

  const storeRegister = useAuthStore((state) => state.register);
  const storeLoginWithGoogle = useAuthStore((state) => state.loginWithGoogle);
  const storeLoginWithInstagram = useAuthStore((state) => state.loginWithInstagram);

  useEffect(() => {
    const handleOAuthCallbacks = async () => {
      // 1. Handle Google OAuth redirect callback (#access_token=...)
      if (typeof window !== 'undefined') {
        const hash = window.location.hash ? window.location.hash.substring(1) : '';
        const search = window.location.search ? window.location.search.substring(1) : '';
        const fullParams = new URLSearchParams(hash || search);
        const accessToken = fullParams.get('access_token');

        if (accessToken) {
          setIsGoogleLoading(true);
          if (window.history && window.history.replaceState) {
            window.history.replaceState({}, document.title, window.location.pathname);
          }

          await googleAuthService.fetchProfileAndComplete(
            accessToken,
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
          return;
        }
      }

      // 2. Handle Instagram OAuth callback (?code=...)
      let code: string | null = null;
      let errorParam: string | null = null;
      let errorReason: string | null = null;
      let redirectUri =
        typeof window !== 'undefined' && window.location?.origin
          ? window.location.origin
          : 'cloudcrackers://auth/instagram/register-callback';

      if (typeof window !== 'undefined' && window.location?.search) {
        const params = new URLSearchParams(window.location.search);
        code = params.get('code');
        errorParam = params.get('error');
        errorReason = params.get('error_reason');
      } else if (route?.params) {
        const rParams = route.params as any;
        code = rParams.code || null;
        errorParam = rParams.error || null;
        errorReason = rParams.error_reason || null;
      }

      if (errorParam || errorReason) {
        if (typeof window !== 'undefined' && window.history) {
          window.history.replaceState({}, document.title, window.location.pathname);
        }
        if (errorParam === 'access_denied' || errorReason === 'user_denied') {
          setErrors({ general: 'Instagram authorization was cancelled.' });
        } else {
          setErrors({ general: 'Instagram authentication error. Please try again.' });
        }
        return;
      }

      if (code) {
        setIsLoading(true);
        if (typeof window !== 'undefined' && window.history) {
          window.history.replaceState({}, document.title, window.location.pathname);
        }
        const success = await storeLoginWithInstagram({ code, redirectUri });
        setIsLoading(false);
        if (success) {
          navigation.navigate('Home');
        } else {
          const storeError = useAuthStore.getState().error;
          setErrors({ general: storeError || 'Instagram authentication failed. Please try again.' });
        }
      }
    };
    handleOAuthCallbacks();
  }, [route?.params]);

  const validateForm = (): boolean => {
    const newErrors: RegisterErrors = {};

    // Email validation
    if (!email.trim()) {
      newErrors.email = 'Email address is required';
    } else if (!isValidEmail(email.trim())) {
      newErrors.email = 'Please enter a valid email address';
    } else if (emailCheckStatus === 'taken') {
      newErrors.email = 'Account already exists with this email address.';
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

  const handleRegister = async () => {
    if (!validateForm()) return;

    // Trigger OTP flow
    setIsSendingOtp(true);
    setErrors((prev) => ({ ...prev, general: undefined }));
    
    try {
      const res = await authService.sendEmailOtp(email.trim());
      setIsSendingOtp(false);
      setOtpSent(true);
      setOtpMessage(res.message || `Verification OTP code sent to ${email.trim()}.`);
    } catch (err: any) {
      setIsSendingOtp(false);
      const msg = err.response?.data?.message || err.message || 'Failed to send OTP code.';
      setErrors((prev) => ({ ...prev, general: msg }));
    }
  };

  const handleVerifyAndCreateAccount = async () => {
    if (otpCode.length !== 6) {
      setErrors((prev) => ({ ...prev, otp: 'Please enter a 6-digit OTP code.' }));
      return;
    }

    setIsVerifyingOtp(true);
    setErrors((prev) => ({ ...prev, otp: undefined, general: undefined }));

    try {
      const success = await authService.verifyEmailOtp(email.trim(), otpCode.trim());
      if (success) {
        // Create account without dummy full name or dummy phone
        await authService.register(
          '', // No dummy name passed
          email.trim(),
          password,
          '', // No dummy phone passed
          confirmPassword
        );
        setIsVerifyingOtp(false);
        alert('Account created successfully! Please log in.');
        navigation.navigate('Login');
      }
    } catch (err: any) {
      setIsVerifyingOtp(false);
      const msg = err.response?.data?.message || err.message || 'Verification or Registration failed.';
      setErrors((prev) => ({ ...prev, otp: msg, general: msg }));
    }
  };

  const handleGoogleLoginClick = async () => {
    setErrors({});
    setIsGoogleLoading(true);

    await googleAuthService.loginWithOfficialGoogle(
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
  };

  const handleInstagramLoginClick = () => {
    setErrors({});
    if (ENV.ENABLE_MOCK_API) {
      setIsInstagramLoading(false);
      setShowInstagramModal(true);
    } else {
      const rawRedirectUri =
        typeof window !== 'undefined' && window.location?.origin
          ? window.location.origin
          : 'cloudcrackers://auth/instagram/register-callback';
      const authUrl = instagramAuthService.getAuthorizationUrl(rawRedirectUri);

      if (Platform.OS === 'web' && typeof window !== 'undefined') {
        window.location.href = authUrl;
      } else {
        Linking.openURL(authUrl);
      }
    }
  };

  const handleInstagramAccountSelect = async (payload: InstagramAuthPayload) => {
    setIsInstagramLoading(true);
    const success = await storeLoginWithInstagram(payload);
    setIsInstagramLoading(false);

    if (success) {
      setShowInstagramModal(false);
      const user = useAuthStore.getState().user;
      if (user?.role === 'admin') {
        navigation.navigate('AdminDashboard');
      } else {
        navigation.navigate('Home');
      }
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
                <Text style={styles.heroBrandName}>Meera Crackers</Text>
                <Text style={styles.heroSubHeading}>
                  Light up the sky with Meera Crackers World.
                </Text>
                <View style={styles.heroImageCard}>
                  <Image
                    source={LOCAL_PRODUCT_IMAGES.LOGO}
                    style={{ width: 100, height: 100, borderRadius: 50, marginBottom: 12 }}
                    resizeMode="contain"
                  />
                  <Text style={styles.quoteText}>
                    "Happy & Safety Guarantee for all your celebrations."
                  </Text>
                </View>
              </View>
            )}

            {/* Right Side Form Card */}
            <View style={styles.formCard}>
              <View style={styles.headerBox}>
                <Text style={styles.formTitle}>Join the Celebration</Text>
                <Text style={styles.formSubtitle}>
                  Create your Meera Crackers account to start ordering.
                </Text>
              </View>

              {otpSent ? (
                <View style={styles.otpBox}>
                  <View style={styles.otpBoxHeader}>
                    <MaterialIcons name="mark-email-read" size={20} color={Colors.primary} />
                    <Text style={styles.otpBoxTitle}>Email Verification Code</Text>
                  </View>
                  <Text style={styles.otpBoxSubtitle}>
                    Enter the 6-digit OTP code sent to <Text style={{ fontFamily: 'Inter-Bold' }}>{email}</Text>
                  </Text>

                  {otpMessage && (
                    <View style={styles.otpBanner}>
                      <Text style={styles.otpBannerText}>{otpMessage}</Text>
                    </View>
                  )}

                  <CustomInput
                    label="OTP CODE"
                    placeholder="6-digit OTP (e.g. 123456)"
                    value={otpCode}
                    onChangeText={(text) => {
                      setOtpCode(text.replace(/\D/g, '').slice(0, 6));
                      if (errors.otp) setErrors((prev) => ({ ...prev, otp: undefined }));
                    }}
                    keyboardType="number-pad"
                    maxLength={6}
                    error={errors.otp}
                  />

                  <PrimaryButton
                    title="Verify & Create Account"
                    onPress={handleVerifyAndCreateAccount}
                    loading={isVerifyingOtp}
                    style={styles.submitButton}
                  />
                  
                  <TouchableOpacity
                    style={{ marginTop: 16, alignItems: 'center' }}
                    onPress={() => { setOtpSent(false); setOtpCode(''); }}
                  >
                    <Text style={styles.loginLink}>Back to Form</Text>
                  </TouchableOpacity>
                </View>
              ) : (
                <>
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
                    rightIcon={
                      emailCheckStatus === 'checking' ? (
                        <MaterialIcons name="sync" size={20} color={Colors.tertiary} />
                      ) : emailCheckStatus === 'available' ? (
                        <MaterialIcons name="check-circle" size={20} color="#16A34A" />
                      ) : emailCheckStatus === 'taken' ? (
                        <MaterialIcons name="cancel" size={20} color={Colors.error} />
                      ) : null
                    }
                  />

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
                </>
              )}
              {/* General Form Error Banner */}
              {errors.general && (
                <View style={styles.errorBanner}>
                  <MaterialIcons name="error-outline" size={20} color={Colors.error} />
                  <Text style={styles.errorBannerText}>{errors.general}</Text>
                </View>
              )}

              {/* Submit Button */}
              {!otpSent && (
                <PrimaryButton
                  title="Create Account"
                  onPress={handleRegister}
                  loading={isSendingOtp}
                  icon={
                    <MaterialIcons name="arrow-forward" size={20} color={Colors.onPrimary} />
                  }
                  style={styles.submitButton}
                />
              )}
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
                  <Text style={styles.socialText}>Sign up with Google</Text>
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
    paddingVertical: Spacing.md,
  },
  mainContainer: {
    width: '100%',
    maxWidth: 1100,
    flexDirection: IS_DESKTOP ? 'row' : 'column',
    alignItems: 'center',
    gap: Spacing.md,
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
    padding: Spacing.md,
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
    padding: SCREEN_WIDTH < 380 ? Spacing.sm : Spacing.gutter,
    borderWidth: 1,
    borderColor: Colors.surfaceContainerHigh,
    shadowColor: Colors.shadowColor,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 15,
    elevation: 4,
  },
  headerBox: {
    marginBottom: Spacing.sm,
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
  emailInputWrapper: {
    flexDirection: 'row',
    alignItems: 'flex-start',
  },
  sendOtpBtn: {
    backgroundColor: Colors.primary,
    paddingHorizontal: Spacing.sm,
    paddingVertical: 10,
    borderRadius: BorderRadius.md,
    justifyContent: 'center',
    alignItems: 'center',
    height: 48,
  },
  sendOtpBtnText: {
    ...Typography.labelLg,
    fontSize: 12,
    fontFamily: 'Inter-Bold',
    color: Colors.onPrimary,
  },
  verifiedBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#E8F5E9',
    paddingHorizontal: 10,
    paddingVertical: 8,
    borderRadius: BorderRadius.md,
    borderWidth: 1,
    borderColor: '#A5D6A7',
    gap: 4,
    height: 48,
  },
  verifiedBadgeText: {
    ...Typography.labelLg,
    fontSize: 12,
    fontFamily: 'Inter-Bold',
    color: '#2E7D32',
  },
  otpBox: {
    backgroundColor: '#FFF8F6',
    borderWidth: 1.5,
    borderColor: Colors.primary,
    borderRadius: BorderRadius.lg,
    padding: Spacing.sm,
    marginBottom: Spacing.sm,
  },
  otpBoxHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 4,
  },
  otpBoxTitle: {
    ...Typography.titleLg,
    fontSize: 13,
    fontFamily: 'Inter-Bold',
    color: Colors.primary,
  },
  otpBoxSubtitle: {
    ...Typography.bodyMd,
    fontSize: 12,
    color: Colors.onSurfaceVariant,
    marginBottom: 8,
  },
  otpBanner: {
    backgroundColor: '#FFF3E0',
    padding: 8,
    borderRadius: BorderRadius.md,
    borderWidth: 1,
    borderColor: '#FFE0B2',
    marginBottom: 8,
  },
  otpBannerText: {
    ...Typography.bodyMd,
    fontSize: 11,
    fontFamily: 'Inter-Bold',
    color: '#E65100',
  },
  otpRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 8,
  },
  verifyOtpBtn: {
    backgroundColor: '#2E7D32',
    paddingHorizontal: Spacing.md,
    height: 48,
    borderRadius: BorderRadius.md,
    justifyContent: 'center',
    alignItems: 'center',
  },
  verifyOtpBtnText: {
    ...Typography.labelLg,
    fontSize: 12,
    fontFamily: 'Inter-Bold',
    color: '#ffffff',
  },
  submitButton: {
    marginTop: Spacing.sm,
  },
  dividerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginVertical: Spacing.sm,
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
    height: 42,
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
    marginTop: Spacing.sm,
    paddingTop: Spacing.sm,
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
