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
import { GoogleAuthPayload, InstagramAuthPayload } from '@/services/authService';
import { RootStackParamList } from '@/navigation/types';
import { useAuthStore } from '@/store/authStore';
import { ENV } from '@/config/env';

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
  const [errors, setErrors] = useState<{ email?: string; password?: string }>({});

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
          setErrors({ email: 'Instagram authorization was cancelled.' });
        } else {
          setErrors({ email: 'Instagram authentication error. Please try again.' });
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
          setErrors({ email: storeError || 'Instagram authentication failed. Please try again.' });
        }
      }
    };
    handleMetaInstagramCallback();
  }, [route?.params]);

  const validateForm = (): boolean => {
    const newErrors: { email?: string; password?: string } = {};

    // Email validation
    if (!email.trim()) {
      newErrors.email = 'Email address is required';
    } else {
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(email.trim())) {
        newErrors.email = 'Please enter a valid email address';
      }
    }

    // Password validation
    if (!password) {
      newErrors.password = 'Password is required';
    } else if (password.length < 6) {
      newErrors.password = 'Password must be at least 6 characters';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleLogin = async () => {
    if (!validateForm()) return;

    setIsLoading(true);
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
      setErrors({ email: storeError || 'Invalid email or password.' });
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
          setErrors({ email: storeError || 'Google authentication failed.' });
        }
      },
      (errorMsg: string) => {
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
      setErrors({ email: storeError || 'Instagram authentication failed.' });
    }
  };

  const handleForgotPassword = () => {
    navigation.navigate('ForgotPassword');
  };

  const handleSignUp = () => {
    navigation.navigate('Register');
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
          {/* Main Card Container */}
          <View style={styles.cardContainer}>
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
              {errors.email && (
                <View style={styles.errorBanner}>
                  <MaterialIcons name="error-outline" size={20} color={Colors.error} />
                  <View style={styles.errorBannerContent}>
                    <Text style={styles.errorBannerText}>{errors.email}</Text>
                    <TouchableOpacity onPress={handleForgotPassword} activeOpacity={0.7}>
                      <Text style={styles.errorResetLink}>Click here to Reset Password</Text>
                    </TouchableOpacity>
                  </View>
                </View>
              )}

              {/* Email Input */}
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
                leftIcon={
                  <MaterialIcons name="mail-outline" size={20} color={Colors.tertiary} />
                }
              />

              {/* Password Input */}
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

              {/* Options Row (Remember me + Forgot Password) */}
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

              {/* Login Button */}
              <PrimaryButton
                title="Login to Account"
                onPress={handleLogin}
                loading={isLoading}
                style={styles.loginButton}
              />
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
  errorResetLink: {
    ...Typography.bodyMd,
    fontFamily: 'Inter-Bold',
    color: Colors.primary,
    textDecorationLine: 'underline',
  },
});

export default LoginScreen;
