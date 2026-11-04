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
import { SweetAlertModal, SweetAlertType } from '@/components/common/SweetAlertModal';
import { googleAuthService } from '@/services/googleAuthService';
import { instagramAuthService } from '@/services/instagramAuthService';
import { authService, GoogleAuthPayload, InstagramAuthPayload } from '@/services/authService';
import { RootStackParamList } from '@/navigation/types';
import { useAuthStore } from '@/store/authStore';
import { ENV } from '@/config/env';
import { ResponsiveContainer } from '@/components/common/ResponsiveContainer';
import { MAX_FORM_WIDTH } from '@/constants/responsive';

type LoginScreenProps = NativeStackScreenProps<RootStackParamList, 'Login'>;

const { width: SCREEN_WIDTH } = Dimensions.get('window');

export const LoginScreen: React.FC<LoginScreenProps> = ({ navigation, route }) => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [rememberMe, setRememberMe] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [isGoogleLoading, setIsGoogleLoading] = useState(false);
  const [isInstagramLoading, setIsInstagramLoading] = useState(false);
  const [showInstagramModal, setShowInstagramModal] = useState(false);
  const [showColdStartNotice, setShowColdStartNotice] = useState(false);
  const [errors, setErrors] = useState<{ email?: string; password?: string; general?: string }>({});

  // SweetAlert Modal State
  const [sweetAlert, setSweetAlert] = useState<{
    visible: boolean;
    type: SweetAlertType;
    title: string;
    message: string;
    confirmText?: string;
  } | null>(null);

  const showSweetAlertError = (rawError: string) => {
    let title = 'Sign In Failed';
    let message = rawError || 'Invalid email address or password. Please try again.';

    const lower = (rawError || '').toLowerCase();
    if (lower.includes('invalid') || lower.includes('password') || lower.includes('credential')) {
      title = 'Invalid Credentials';
      message = 'The email address or password you entered is incorrect. Please check your credentials and try again.';
    } else if (lower.includes('not found') || lower.includes('no account') || lower.includes('user not')) {
      title = 'Account Not Found';
      message = 'No account was found with this email address. Please make sure you have registered or create a new account.';
    } else if (lower.includes('inactive') || lower.includes('disabled') || lower.includes('suspended')) {
      title = 'Account Restricted';
      message = 'This account has been disabled or suspended. Please contact Meera Crackers support.';
    } else if (lower.includes('network') || lower.includes('failed to fetch') || lower.includes('timeout') || lower.includes('connect')) {
      title = 'Connection Problem';
      message = 'Unable to connect to the server. Please verify your internet connection and try again.';
    } else if (lower.includes('google')) {
      title = 'Google Sign In Error';
      message = rawError || 'Google authentication could not be completed. Please try again.';
    } else if (lower.includes('instagram')) {
      title = 'Instagram Sign In Error';
      message = rawError || 'Instagram authentication could not be completed. Please try again.';
    }

    setSweetAlert({
      visible: true,
      type: 'error',
      title,
      message,
      confirmText: 'Try Again',
    });
  };

  useEffect(() => {
    let timer: any;
    if (isLoading || isGoogleLoading || isInstagramLoading) {
      timer = setTimeout(() => {
        setShowColdStartNotice(true);
      }, 4000);
    } else {
      setShowColdStartNotice(false);
    }
    return () => clearTimeout(timer);
  }, [isLoading, isGoogleLoading, isInstagramLoading]);


  const storeLogin = useAuthStore((state) => state.login);
  const storeLoginWithGoogle = useAuthStore((state) => state.loginWithGoogle);
  const storeLoginWithInstagram = useAuthStore((state) => state.loginWithInstagram);

  useEffect(() => {
    const handleMetaInstagramCallback = async () => {
      let code: string | null = null;
      let errorParam: string | null = null;
      let errorReason: string | null = null;
      let redirectUri =
        typeof window !== 'undefined' && window.location?.origin
          ? window.location.origin
          : 'cloudcrackers://auth/instagram/callback';

      if (typeof window !== 'undefined' && window.location?.search) {
        const params = new URLSearchParams(window.location.search);
        code = params.get('code');
        errorParam = params.get('error');
        errorReason = params.get('error_reason');
      } else if (route?.params) {
        const routeParams = route.params as any;
        code = routeParams.code || null;
        errorParam = routeParams.error || null;
        errorReason = routeParams.error_reason || null;
      }

      if (errorParam || errorReason) {
        if (typeof window !== 'undefined' && window.history) {
          window.history.replaceState({}, document.title, window.location.pathname);
        }
        if (errorParam === 'access_denied' || errorReason === 'user_denied') {
          const msg = 'Instagram authorization was cancelled.';
          setErrors({ general: msg });
          showSweetAlertError(msg);
        } else {
          const msg = 'Instagram authentication error. Please try again.';
          setErrors({ general: msg });
          showSweetAlertError(msg);
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
          const user = useAuthStore.getState().user;
          if (user?.role === 'admin') {
            navigation.navigate('AdminDashboard');
          } else {
            navigation.navigate('Home');
          }
        } else {
          const storeError = useAuthStore.getState().error;
          const msg = storeError || 'Instagram authentication failed. Please try again.';
          setErrors({ general: msg });
          showSweetAlertError(msg);
        }
      }
    };
    handleMetaInstagramCallback();
  }, [route?.params]);

  const validateForm = (): boolean => {
    const newErrors: { email?: string; password?: string } = {};
    if (!email.trim()) {
      newErrors.email = 'Email address is required';
    } else {
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(email.trim())) {
        newErrors.email = 'Please enter a valid email address';
      }
    }
    if (!password) {
      newErrors.password = 'Password is required';
    }
    setErrors(newErrors);

    if (Object.keys(newErrors).length > 0) {
      if (!email.trim() && !password) {
        showSweetAlertError('Please enter both your email address and password to sign in.');
      } else if (newErrors.email) {
        showSweetAlertError(newErrors.email);
      } else if (newErrors.password) {
        showSweetAlertError(newErrors.password);
      }
      return false;
    }
    return true;
  };

  const handleLogin = async () => {
    if (!validateForm()) return;

    setIsLoading(true);
    setErrors({});
    const success = await storeLogin(email.trim(), password);
    setIsLoading(false);

    if (success) {
      const user = useAuthStore.getState().user;
      if (user?.role === 'admin') {
        navigation.navigate('AdminDashboard');
      } else {
        navigation.navigate('Home');
      }
    } else {
      const storeError = useAuthStore.getState().error;
      const errorMsg = storeError || 'Invalid email or password. Please try again.';
      setErrors({ general: errorMsg });
      showSweetAlertError(errorMsg);
    }
  };

  const handleGoogleLoginClick = async () => {
    setErrors({});
    setIsGoogleLoading(true);

    await googleAuthService.loginWithOfficialGoogle(
      async (payload: GoogleAuthPayload) => {
        const success = await storeLoginWithGoogle(payload);
        setIsGoogleLoading(false);
        if (success) {
          const user = useAuthStore.getState().user;
          if (user?.role === 'admin') {
            navigation.navigate('AdminDashboard');
          } else {
            navigation.navigate('Home');
          }
        } else {
          const storeError = useAuthStore.getState().error;
          const msg = storeError || 'Google authentication failed.';
          setErrors({ general: msg });
          showSweetAlertError(msg);
        }
      },
      (errorMsg: string) => {
        setIsGoogleLoading(false);
        const msg = errorMsg || 'Google authentication error.';
        setErrors({ general: msg });
        showSweetAlertError(msg);
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
          : 'cloudcrackers://auth/instagram/callback';
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
      setErrors({ general: storeError || 'Instagram authentication failed.' });
    }
  };

  const handleForgotPassword = () => {
    navigation.navigate('ForgotPassword');
  };

  const handleNavigateToRegister = () => {
    navigation.navigate('Register', { initialEmail: email.trim() } as any);
  };

  return (
    <ResponsiveContainer maxWidth={MAX_FORM_WIDTH}>
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
          {/* Main Card Container */}
          <View style={styles.cardContainer}>
            {/* Top Navigation Shortcuts */}
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', width: '100%', marginBottom: 12, paddingHorizontal: 4 }}>
              <TouchableOpacity
                style={{ flexDirection: 'row', alignItems: 'center', paddingVertical: 6, paddingHorizontal: 12, borderRadius: BorderRadius.full, backgroundColor: Colors.surfaceContainerLow }}
                onPress={() => navigation.navigate('Home')}
                activeOpacity={0.7}
              >
                <MaterialIcons name="arrow-back" size={16} color={Colors.onSurfaceVariant} />
                <Text style={{ fontSize: 13, color: Colors.onSurfaceVariant, fontFamily: 'Inter-Medium', marginLeft: 4 }}>
                  Back to Store
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={{ flexDirection: 'row', alignItems: 'center', paddingVertical: 6, paddingHorizontal: 10 }}
                onPress={() => navigation.navigate('Register')}
                activeOpacity={0.7}
              >
                <Text style={{ fontSize: 13, color: Colors.primary, fontFamily: 'Inter-Bold' }}>
                  Sign Up
                </Text>
                <MaterialIcons name="chevron-right" size={18} color={Colors.primary} />
              </TouchableOpacity>
            </View>

            {/* Branding Header */}
            <View style={styles.brandHeader}>
              <Image
                source={LOCAL_PRODUCT_IMAGES.LOGO}
                style={styles.authLogoImage}
                resizeMode="contain"
              />
              <Text style={styles.brandTitle}>MEERA CRACKERS</Text>
              <Text style={styles.brandSubtitle}>
                Ignite your celebration with Meera Crackers World.
              </Text>
            </View>

            {/* Login Form */}
            <View style={styles.formContainer}>
              {errors.general && (
                <View style={styles.errorBanner}>
                  <MaterialIcons name="error-outline" size={20} color={Colors.error} />
                  <View style={styles.errorBannerContent}>
                    <Text style={styles.errorBannerText}>{errors.general}</Text>
                  </View>
                </View>
              )}

              {/* UNIFIED SINGLE FORM: EMAIL & PASSWORD TOGETHER */}
              <CustomInput
                label="EMAIL ADDRESS"
                placeholder="name@company.com"
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
                  <MaterialIcons name="mail-outline" size={20} color={Colors.tertiary} />
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

              <View style={styles.optionsRow}>
                <Checkbox
                  label="Keep me signed in"
                  checked={rememberMe}
                  onChange={setRememberMe}
                />
                <TouchableOpacity onPress={handleForgotPassword} activeOpacity={0.7}>
                  <Text style={styles.forgotPasswordText}>Forgot Password?</Text>
                </TouchableOpacity>
              </View>

              <PrimaryButton
                title="Login to Account"
                onPress={handleLogin}
                loading={isLoading}
                style={styles.loginButton}
              />

              {showColdStartNotice && (
                <View style={styles.noticeBanner}>
                  <MaterialIcons name="info-outline" size={18} color="#E65100" />
                  <Text style={styles.noticeText}>
                    Server waking up (Render free tier cold start). Please wait ~30-50 seconds...
                  </Text>
                </View>
              )}

              {/* Create Account Link */}
              <View style={styles.signupRow}>
                <Text style={styles.signupText}>Don't have an account? </Text>
                <TouchableOpacity onPress={handleNavigateToRegister} activeOpacity={0.7}>
                  <Text style={styles.signupLink}>Sign Up</Text>
                </TouchableOpacity>
              </View>
            </View>

            {/* Divider */}
            <View style={styles.dividerRow}>
              <View style={styles.dividerLine} />
              <Text style={styles.dividerText}>OR CONTINUE WITH</Text>
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
                <Text style={styles.socialText}>Continue with Google</Text>
              </TouchableOpacity>
            </View>
          </View>

          {/* Legal Footer */}
          <View style={styles.footer}>
            <Text style={styles.legalText}>
              © 2026 MEERA CRACKERS WORLD. ALL RIGHTS RESERVED.
            </Text>
            <View style={styles.legalLinks}>
              <Text style={styles.legalLink}>Privacy Policy</Text>
              <Text style={styles.legalLink}>Terms of Service</Text>
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

      {sweetAlert && (
        <SweetAlertModal
          visible={sweetAlert.visible}
          type={sweetAlert.type}
          title={sweetAlert.title}
          message={sweetAlert.message}
          confirmText={sweetAlert.confirmText || 'Try Again'}
          onConfirm={() => setSweetAlert(null)}
        />
      )}
    </SafeAreaView>
  </ResponsiveContainer>
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
  cardContainer: {
    width: '100%',
    maxWidth: 440,
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
    alignItems: 'center',
  },
  brandHeader: {
    alignItems: 'center',
    marginBottom: Spacing.sm,
  },
  authLogoImage: {
    width: 72,
    height: 72,
    borderRadius: 36,
    marginBottom: Spacing.xs,
  },
  brandTitle: {
    ...Typography.headlineLg,
    fontFamily: 'Inter-Bold',
    color: Colors.onSurface,
  },
  brandSubtitle: {
    ...Typography.bodyMd,
    fontFamily: 'Inter-Regular',
    color: Colors.onSurfaceVariant,
    marginTop: 2,
    textAlign: 'center',
  },
  formContainer: {
    width: '100%',
  },
  optionsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginVertical: Spacing.xs,
  },
  forgotPasswordText: {
    ...Typography.bodyMd,
    fontFamily: 'Inter-Medium',
    color: Colors.tertiary,
  },
  loginButton: {
    marginTop: Spacing.sm,
    width: '100%',
  },
  dividerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginVertical: Spacing.sm,
    width: '100%',
  },
  dividerLine: {
    flex: 1,
    height: 1,
    backgroundColor: Colors.surfaceContainerHigh,
  },
  dividerText: {
    ...Typography.labelLg,
    fontFamily: 'Inter-SemiBold',
    color: Colors.onSurfaceVariant,
    paddingHorizontal: Spacing.sm,
    fontSize: 10,
    letterSpacing: 1,
  },
  socialRow: {
    flexDirection: 'row',
    gap: Spacing.sm,
    width: '100%',
  },
  socialButton: {
    flex: 1,
    height: 42,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: Colors.surfaceContainerHigh,
    borderRadius: BorderRadius.default,
    backgroundColor: Colors.surfaceContainerLow,
    gap: Spacing.xs,
  },
  socialText: {
    ...Typography.bodyMd,
    fontFamily: 'Inter-SemiBold',
    color: Colors.onSurface,
  },
  instagramBtn: {
    borderColor: 'rgba(225, 48, 108, 0.4)',
    backgroundColor: 'rgba(225, 48, 108, 0.08)',
  },
  signupRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: Spacing.sm,
  },
  signupText: {
    ...Typography.bodyMd,
    fontFamily: 'Inter-Regular',
    color: Colors.onSurfaceVariant,
  },
  signupLink: {
    ...Typography.bodyMd,
    fontFamily: 'Inter-Bold',
    color: Colors.primary,
  },
  footer: {
    marginTop: Spacing.sm,
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
  legalLinks: {
    flexDirection: 'row',
    gap: Spacing.md,
    marginTop: Spacing.xs,
  },
  legalLink: {
    ...Typography.labelLg,
    fontFamily: 'Inter-Regular',
    color: Colors.onSurfaceVariant,
    opacity: 0.8,
  },
  errorBanner: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    backgroundColor: '#FEE2E2',
    padding: Spacing.sm,
    borderRadius: BorderRadius.default,
    marginBottom: Spacing.sm,
    width: '100%',
    gap: Spacing.xs,
    borderWidth: 1,
    borderColor: '#FCA5A5',
  },
  errorBannerContent: {
    flex: 1,
    gap: 4,
  },
  errorBannerText: {
    ...Typography.bodyMd,
    color: Colors.error,
    lineHeight: 18,
  },
  emailHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: Colors.surfaceContainerLow,
    padding: Spacing.sm,
    borderRadius: BorderRadius.md,
    marginBottom: Spacing.sm,
    borderWidth: 1,
    borderColor: Colors.surfaceContainerHigh,
  },
  activeEmailText: {
    ...Typography.bodyMd,
    fontFamily: 'Inter-Bold',
    color: Colors.onSurface,
    flex: 1,
  },
  changeEmailLink: {
    ...Typography.bodyMd,
    fontFamily: 'Inter-Bold',
    color: Colors.primary,
  },
  unregisteredBox: {
    width: '100%',
  },
  noticeBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFF3E0',
    padding: Spacing.sm,
    borderRadius: BorderRadius.md,
    marginBottom: Spacing.sm,
    gap: Spacing.xs,
    borderWidth: 1,
    borderColor: '#FFE0B2',
  },
  noticeText: {
    ...Typography.bodyMd,
    fontFamily: 'Inter-Medium',
    color: '#E65100',
    flex: 1,
    lineHeight: 18,
  },
});

export default LoginScreen;
