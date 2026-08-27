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
  Linking,
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
import { googleAuthService } from '@/services/googleAuthService';
import { GoogleAuthPayload } from '@/services/authService';
import { RootStackParamList } from '@/navigation/types';
import { useAuthStore } from '@/store/authStore';

type LoginScreenProps = NativeStackScreenProps<RootStackParamList, 'Login'>;

const { width: SCREEN_WIDTH } = Dimensions.get('window');

export const LoginScreen: React.FC<LoginScreenProps> = ({ navigation }) => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [rememberMe, setRememberMe] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [isGoogleLoading, setIsGoogleLoading] = useState(false);
  const [showGoogleModal, setShowGoogleModal] = useState(false);
  const [errors, setErrors] = useState<{ email?: string; password?: string }>({});

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

  const storeLogin = useAuthStore((state) => state.login);
  const storeLoginWithGoogle = useAuthStore((state) => state.loginWithGoogle);
  const storeLoginWithInstagram = useAuthStore((state) => state.loginWithInstagram);

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

    // Try Google Identity Services native popup first (if client ID is configured)
    const nativeLaunched = await googleAuthService.triggerNativeGooglePopup(
      async (payload) => {
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
      (errorMsg) => {
        setIsGoogleLoading(false);
        setErrors({ email: errorMsg || 'Google authentication error.' });
      }
    );

    // If native GIS popup not available or not configured, open interactive Google Account Chooser modal
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
  };

  const handleInstagramLoginClick = () => {
    setErrors({});
    const clientId = '2262885951230627';
    const redirectUri = encodeURIComponent(
      typeof window !== 'undefined' && window.location?.origin
        ? window.location.origin
        : 'https://cloudcrackerfinalyearproject-1.onrender.com'
    );
    const authUrl = `https://api.instagram.com/oauth/authorize?client_id=${clientId}&redirect_uri=${redirectUri}&scope=user_profile,user_media&response_type=code`;

    if (Platform.OS === 'web' && typeof window !== 'undefined') {
      window.location.href = authUrl;
    } else {
      Linking.openURL(authUrl);
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
              <View style={styles.logoBox}>
                <MaterialIcons name="save-as" size={28} color={Colors.onPrimary} />
              </View>
              <Text style={styles.brandTitle}>CloudCrackers</Text>
              <Text style={styles.brandSubtitle}>
                Ignite your experience with premium pyrotechnics.
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
                <Text style={styles.socialText}>Google</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.socialButton, styles.instagramBtn]}
                activeOpacity={0.8}
                onPress={handleInstagramLoginClick}
                disabled={isLoading}
              >
                <MaterialIcons name="camera-alt" size={20} color="#E1306C" />
                <Text style={[styles.socialText, { color: '#E1306C', fontFamily: 'Inter-SemiBold' }]}>Instagram</Text>
              </TouchableOpacity>
            </View>

            {/* Signup Redirect */}
            <View style={styles.signupRow}>
              <Text style={styles.signupText}>Don't have an account? </Text>
              <TouchableOpacity onPress={handleSignUp} activeOpacity={0.7}>
                <Text style={styles.signupLink}>Sign Up</Text>
              </TouchableOpacity>
            </View>
          </View>

          {/* Legal Footer */}
          <View style={styles.footer}>
            <Text style={styles.legalText}>
              © 2026 CLOUDCRACKERS PYROTECHNICS. ALL RIGHTS RESERVED.
            </Text>
            <View style={styles.legalLinks}>
              <Text style={styles.legalLink}>Privacy Policy</Text>
              <Text style={styles.legalLink}>Terms of Service</Text>
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
  brandHeader: {
    alignItems: 'center',
    marginBottom: Spacing.lg,
  },
  logoBox: {
    width: 48,
    height: 48,
    borderRadius: BorderRadius.lg,
    backgroundColor: Colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: Spacing.xs,
    shadowColor: Colors.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 10,
    elevation: 4,
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
    marginTop: Spacing.md,
    width: '100%',
  },
  dividerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginVertical: Spacing.lg,
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
    height: 48,
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
    marginTop: Spacing.lg,
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
