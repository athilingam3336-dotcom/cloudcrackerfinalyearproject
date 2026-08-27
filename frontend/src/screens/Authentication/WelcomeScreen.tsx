import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Image,
  Dimensions,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { MaterialIcons } from '@expo/vector-icons';
import { Colors } from '@/constants/colors';
import { Typography } from '@/constants/typography';
import { Spacing, BorderRadius } from '@/constants/spacing';
import { PrimaryButton } from '@/components/buttons/PrimaryButton';
import { CustomInput } from '@/components/inputs/CustomInput';
import { RootStackParamList } from '@/navigation/types';

type WelcomeScreenProps = NativeStackScreenProps<RootStackParamList, 'Welcome'>;

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const IS_DESKTOP = SCREEN_WIDTH >= 768;

export const WelcomeScreen: React.FC<WelcomeScreenProps> = ({ navigation }) => {
  const handleGetStarted = () => {
    navigation.navigate('Login');
  };

  const handleLogin = () => {
    navigation.navigate('Login');
  };

  const handleRegister = () => {
    navigation.navigate('Register');
  };

  return (
    <SafeAreaView style={styles.safeArea} edges={['top', 'left', 'right']}>
      {/* Top Header Navigation */}
      <View style={styles.header}>
        <Text style={styles.headerBrand}>Meera Crackers</Text>
        <TouchableOpacity style={styles.headerLoginButton} onPress={handleLogin}>
          <Text style={styles.headerLoginText}>Log In</Text>
        </TouchableOpacity>
      </View>

      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* Hero Section */}
        <View style={styles.heroSection}>
          <View style={styles.heroBadge}>
            <Text style={styles.heroBadgeText}>FIREWORKS WHOLESALE & RETAILER</Text>
          </View>

          <Text style={styles.heroTitle}>
            Elevate Your Style{'\n'}with a Spark.
          </Text>

          <Text style={styles.heroDescription}>
            Experience the pinnacle of celebration. Meera Crackers World delivers unmatched quality, happy & safety guaranteed green crackers right to your door.
          </Text>

          {/* Action Buttons */}
          <View style={styles.actionRow}>
            <PrimaryButton
              title="Get Started"
              onPress={handleGetStarted}
              style={styles.primaryCta}
            />
            <PrimaryButton
              title="Log In"
              variant="outline"
              onPress={handleLogin}
              style={styles.secondaryCta}
            />
          </View>
        </View>

        {/* Feature Bento Grid */}
        <View style={styles.gridSection}>
          {/* Large Feature Card */}
          <View style={styles.largeCard}>
            <View style={styles.largeCardTextContainer}>
              <Text style={styles.cardHeaderTitle}>Curated Collections</Text>
              <Text style={styles.cardDescription}>
                Discover hand-picked selections tailored for modern celebrations,
                ranging from minimalist fountains to breathtaking aerial displays.
              </Text>
              <TouchableOpacity style={styles.linkButton} onPress={handleGetStarted}>
                <Text style={styles.linkText}>Explore Catalog</Text>
                <MaterialIcons name="arrow-forward" size={18} color={Colors.primary} />
              </TouchableOpacity>
            </View>
            <View style={styles.cardImageContainer}>
              <MaterialIcons name="auto-awesome" size={64} color={Colors.primary} />
            </View>
          </View>

          {/* Small Feature Cards Grid */}
          <View style={styles.featureRow}>
            {/* Feature 1 */}
            <View style={styles.smallCard}>
              <View style={styles.iconCircle}>
                <MaterialIcons name="security" size={24} color={Colors.primary} />
              </View>
              <Text style={styles.smallCardTitle}>Safety First</Text>
              <Text style={styles.smallCardText}>
                Rigorously tested products that meet the highest international safety standards.
              </Text>
            </View>

            {/* Feature 2 */}
            <View style={styles.smallCard}>
              <View style={styles.iconCircle}>
                <MaterialIcons name="local-shipping" size={24} color={Colors.primary} />
              </View>
              <Text style={styles.smallCardTitle}>Rapid Delivery</Text>
              <Text style={styles.smallCardText}>
                White-glove shipping to ensure your celebration arrives on time and in perfect condition.
              </Text>
            </View>

            {/* Feature 3 */}
            <View style={styles.smallCard}>
              <View style={styles.iconCircle}>
                <MaterialIcons name="stars" size={24} color={Colors.primary} />
              </View>
              <Text style={styles.smallCardTitle}>Premium Only</Text>
              <Text style={styles.smallCardText}>
                We partner exclusively with top-tier manufacturers for unrivaled visual brilliance.
              </Text>
            </View>
          </View>

          {/* Wide CTA Banner */}
          <TouchableOpacity style={styles.wideBanner} onPress={handleRegister} activeOpacity={0.9}>
            <View style={styles.wideBannerContent}>
              <Text style={styles.wideBannerTitle}>Ready to light up the night?</Text>
              <Text style={styles.wideBannerDescription}>
                Join over 10,000 professional planners and celebration enthusiasts.
              </Text>
              <View style={styles.joinButton}>
                <Text style={styles.joinButtonText}>JOIN NOW</Text>
              </View>
            </View>
            <MaterialIcons
              name="celebration"
              size={120}
              color="rgba(255,255,255,0.15)"
              style={styles.bannerWatermark}
            />
          </TouchableOpacity>
        </View>

        {/* Newsletter Section */}
        <View style={styles.newsletterSection}>
          <Text style={styles.newsletterTitle}>Stay Inspired</Text>
          <Text style={styles.newsletterDescription}>
            Subscribe for exclusive early access to seasonal collections and expert safety tips.
          </Text>
          <View style={styles.newsletterForm}>
            <CustomInput
              placeholder="Enter your email"
              keyboardType="email-address"
              autoCapitalize="none"
              containerStyle={styles.newsletterInputContainer}
            />
            <PrimaryButton
              title="Subscribe"
              onPress={() => {}}
              style={styles.subscribeButton}
            />
          </View>
          <Text style={styles.newsletterSubtext}>
            No spam. Only sparks. Unsubscribe anytime.
          </Text>
        </View>

        {/* Footer */}
        <View style={styles.footer}>
          <Text style={styles.footerBrand}>Meera Crackers World</Text>
          <View style={styles.footerLinks}>
            <Text style={styles.footerLink}>Terms</Text>
            <Text style={styles.footerLink}>Privacy</Text>
            <Text style={styles.footerLink}>Support</Text>
          </View>
          <Text style={styles.copyright}>© 2026 MEERA CRACKERS WORLD. ALL RIGHTS RESERVED.</Text>
        </View>
      </ScrollView>
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
  headerLoginButton: {
    backgroundColor: Colors.primary,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.xs,
    borderRadius: BorderRadius.default,
  },
  headerLoginText: {
    ...Typography.labelLg,
    fontFamily: 'Inter-SemiBold',
    color: Colors.onPrimary,
  },
  scrollContent: {
    paddingBottom: Spacing.xl,
  },
  heroSection: {
    paddingHorizontal: Spacing.marginMobile,
    paddingVertical: Spacing.xl,
    alignItems: 'center',
    backgroundColor: Colors.surface,
  },
  heroBadge: {
    backgroundColor: Colors.surfaceContainerHigh,
    paddingHorizontal: Spacing.sm,
    paddingVertical: Spacing.xs,
    borderRadius: BorderRadius.full,
    marginBottom: Spacing.sm,
  },
  heroBadgeText: {
    ...Typography.labelLg,
    fontFamily: 'Inter-SemiBold',
    color: Colors.primary,
    letterSpacing: 1.5,
  },
  heroTitle: {
    ...Typography.headlineLg,
    fontFamily: 'Inter-Bold',
    fontSize: IS_DESKTOP ? 48 : 32,
    lineHeight: IS_DESKTOP ? 56 : 40,
    color: Colors.onSurface,
    textAlign: 'center',
    marginBottom: Spacing.sm,
  },
  heroDescription: {
    ...Typography.bodyLg,
    fontFamily: 'Inter-Regular',
    color: Colors.tertiary,
    textAlign: 'center',
    maxWidth: 540,
    marginBottom: Spacing.md,
  },
  actionRow: {
    flexDirection: IS_DESKTOP ? 'row' : 'column',
    width: '100%',
    maxWidth: 400,
    gap: Spacing.sm,
    justifyContent: 'center',
  },
  primaryCta: {
    flex: IS_DESKTOP ? 1 : undefined,
    width: IS_DESKTOP ? undefined : '100%',
  },
  secondaryCta: {
    flex: IS_DESKTOP ? 1 : undefined,
    width: IS_DESKTOP ? undefined : '100%',
  },
  gridSection: {
    paddingHorizontal: Spacing.marginMobile,
    paddingVertical: Spacing.lg,
    gap: Spacing.md,
  },
  largeCard: {
    backgroundColor: Colors.surfaceContainerLowest,
    borderRadius: BorderRadius.xl,
    padding: Spacing.md,
    borderWidth: 1,
    borderColor: Colors.surfaceContainerHigh,
    flexDirection: IS_DESKTOP ? 'row' : 'column',
    alignItems: 'center',
    gap: Spacing.md,
  },
  largeCardTextContainer: {
    flex: 1,
  },
  cardHeaderTitle: {
    ...Typography.headlineLg,
    fontFamily: 'Inter-SemiBold',
    fontSize: 24,
    color: Colors.onSurface,
    marginBottom: Spacing.xs,
  },
  cardDescription: {
    ...Typography.bodyLg,
    fontFamily: 'Inter-Regular',
    color: Colors.tertiary,
    marginBottom: Spacing.sm,
  },
  linkButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  linkText: {
    ...Typography.bodyLg,
    fontFamily: 'Inter-Bold',
    color: Colors.primary,
  },
  cardImageContainer: {
    width: IS_DESKTOP ? 180 : '100%',
    height: 140,
    backgroundColor: Colors.surfaceContainerLow,
    borderRadius: BorderRadius.lg,
    alignItems: 'center',
    justifyContent: 'center',
  },
  featureRow: {
    flexDirection: IS_DESKTOP ? 'row' : 'column',
    gap: Spacing.md,
  },
  smallCard: {
    flex: 1,
    backgroundColor: Colors.surfaceContainerLow,
    borderRadius: BorderRadius.xl,
    padding: Spacing.md,
    borderWidth: 1,
    borderColor: Colors.surfaceContainerHigh,
  },
  iconCircle: {
    width: 44,
    height: 44,
    borderRadius: BorderRadius.full,
    backgroundColor: Colors.primaryFixed,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: Spacing.sm,
  },
  smallCardTitle: {
    ...Typography.titleLg,
    fontFamily: 'Inter-SemiBold',
    fontSize: 18,
    color: Colors.onSurface,
    marginBottom: Spacing.xs,
  },
  smallCardText: {
    ...Typography.bodyMd,
    fontFamily: 'Inter-Regular',
    color: Colors.tertiary,
  },
  wideBanner: {
    backgroundColor: Colors.primary,
    borderRadius: BorderRadius.xl,
    padding: Spacing.md,
    position: 'relative',
    overflow: 'hidden',
  },
  wideBannerContent: {
    zIndex: 2,
  },
  wideBannerTitle: {
    ...Typography.headlineLg,
    fontFamily: 'Inter-Bold',
    color: Colors.onPrimary,
    marginBottom: Spacing.xs,
  },
  wideBannerDescription: {
    ...Typography.bodyLg,
    fontFamily: 'Inter-Regular',
    color: Colors.onPrimary,
    opacity: 0.9,
    marginBottom: Spacing.md,
  },
  joinButton: {
    backgroundColor: '#ffffff',
    paddingHorizontal: Spacing.md,
    paddingVertical: 10,
    borderRadius: BorderRadius.default,
    alignSelf: 'flex-start',
  },
  joinButtonText: {
    ...Typography.labelLg,
    fontFamily: 'Inter-Bold',
    color: Colors.primary,
    letterSpacing: 1.2,
  },
  bannerWatermark: {
    position: 'absolute',
    right: -10,
    bottom: -10,
  },
  newsletterSection: {
    backgroundColor: Colors.surfaceContainerLow,
    paddingHorizontal: Spacing.marginMobile,
    paddingVertical: Spacing.xl,
    alignItems: 'center',
    marginTop: Spacing.md,
  },
  newsletterTitle: {
    ...Typography.headlineLg,
    fontFamily: 'Inter-Bold',
    color: Colors.onSurface,
    marginBottom: Spacing.xs,
  },
  newsletterDescription: {
    ...Typography.bodyLg,
    fontFamily: 'Inter-Regular',
    color: Colors.tertiary,
    textAlign: 'center',
    maxWidth: 480,
    marginBottom: Spacing.md,
  },
  newsletterForm: {
    width: '100%',
    maxWidth: 480,
    gap: Spacing.xs,
  },
  newsletterInputContainer: {
    marginBottom: Spacing.xs,
  },
  subscribeButton: {
    width: '100%',
  },
  newsletterSubtext: {
    ...Typography.labelLg,
    fontFamily: 'Inter-Regular',
    color: Colors.tertiary,
    marginTop: Spacing.xs,
    opacity: 0.7,
  },
  footer: {
    paddingHorizontal: Spacing.marginMobile,
    paddingVertical: Spacing.lg,
    borderTopWidth: 1,
    borderTopColor: Colors.surfaceContainerHigh,
    alignItems: 'center',
    gap: Spacing.sm,
  },
  footerBrand: {
    ...Typography.titleLg,
    fontFamily: 'Inter-Bold',
    color: Colors.onSurface,
    opacity: 0.6,
  },
  footerLinks: {
    flexDirection: 'row',
    gap: Spacing.md,
  },
  footerLink: {
    ...Typography.bodyMd,
    fontFamily: 'Inter-Regular',
    color: Colors.tertiary,
  },
  copyright: {
    ...Typography.labelLg,
    fontFamily: 'Inter-Regular',
    color: Colors.tertiary,
    opacity: 0.6,
  },
});

export default WelcomeScreen;
