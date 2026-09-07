import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Image,
  TouchableOpacity,
  TextInput,
  Alert,
  Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { MaterialIcons } from '@expo/vector-icons';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import * as ImagePicker from 'expo-image-picker';
import { Colors } from '@/constants/colors';
import { Typography } from '@/constants/typography';
import { Spacing, BorderRadius } from '@/constants/spacing';
import { RootStackParamList } from '@/navigation/types';
import { useAuthStore } from '@/store/authStore';
import { authService } from '@/services/authService';
import { PrimaryButton } from '@/components/buttons/PrimaryButton';
import { LoadingSpinner } from '@/components/loaders/LoadingSpinner';
import { sanitizeRemoteImageUrl } from '@/constants/productImages';
import { ResponsiveContainer } from '@/components/common/ResponsiveContainer';
import { MAX_ADMIN_WIDTH } from '@/constants/responsive';
import { HomeHeader } from '@/components/common/HomeHeader';
import { FooterSection } from '@/components/common/FooterSection';
import { useAppLayout } from '@/hooks/useAppLayout';

type EditProfileScreenProps = NativeStackScreenProps<RootStackParamList, 'EditProfile'>;

export const EditProfileScreen: React.FC<EditProfileScreenProps> = ({ navigation }) => {
  const user = useAuthStore((state) => state.user);
  const updateProfileStore = useAuthStore((state) => state.updateProfile);

  const [name, setName] = useState(user?.name || '');
  const [phone, setPhone] = useState(user?.phone || '');
  const [avatarBase64, setAvatarBase64] = useState<string | null>(null);
  const [displayAvatar, setDisplayAvatar] = useState<string | null>(user?.avatarUrl || null);
  const [isSaving, setIsSaving] = useState(false);

  const processImageFile = (file: File) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      const img = new (window as any).Image();
      img.onload = () => {
        // Create 1:1 square canvas (500x500) like WhatsApp / Instagram
        const canvas = document.createElement('canvas');
        const size = 500;
        canvas.width = size;
        canvas.height = size;
        const ctx = canvas.getContext('2d');
        if (ctx) {
          // Calculate center square crop
          const minDim = Math.min(img.width, img.height);
          const startX = (img.width - minDim) / 2;
          const startY = (img.height - minDim) / 2;
          ctx.drawImage(img, startX, startY, minDim, minDim, 0, 0, size, size);
          
          // Compress to JPEG with 0.7 quality to keep size small for MongoDB
          const compressedBase64 = canvas.toDataURL('image/jpeg', 0.7);
          setAvatarBase64(compressedBase64);
          setDisplayAvatar(compressedBase64);
        }
      };
      img.src = e.target?.result as string;
    };
    reader.readAsDataURL(file);
  };

  const pickImage = async () => {
    if (Platform.OS === 'web' && typeof document !== 'undefined') {
      const input = document.createElement('input');
      input.type = 'file';
      input.accept = 'image/*';
      input.onchange = (e: any) => {
        const file = e.target?.files?.[0];
        if (file) {
          processImageFile(file);
        }
      };
      input.click();
      return;
    }

    try {
      let result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        aspect: [1, 1], // Crop to square (1:1 aspect ratio) like WhatsApp
        quality: 0.5,   // Compress image to save MongoDB space
        base64: true,   // Get base64 representation to store in MongoDB
      });

      if (!result.canceled && result.assets && result.assets.length > 0) {
        const asset = result.assets[0];
        const base64String = asset.base64?.startsWith('data:')
          ? asset.base64
          : `data:image/jpeg;base64,${asset.base64}`;
        setAvatarBase64(base64String);
        setDisplayAvatar(asset.uri);
      }
    } catch (err: any) {
      console.error('Image picker error:', err);
      Alert.alert('Error', 'Unable to pick image.');
    }
  };

  const handleSave = async () => {
    if (!name.trim()) {
      if (Platform.OS === 'web') {
        window.alert('Name cannot be empty.');
      } else {
        Alert.alert('Error', 'Name cannot be empty.');
      }
      return;
    }
    
    setIsSaving(true);
    try {
      const updatedUser = await authService.updateProfile(
        name,
        phone,
        avatarBase64 || undefined
      );
      updateProfileStore(updatedUser);
      
      if (Platform.OS === 'web') {
        window.alert('Profile updated successfully!');
      } else {
        Alert.alert('Success', 'Profile updated successfully!');
      }
      
      navigation.goBack();
    } catch (error: any) {
      const msg = error?.response?.data?.message || error.message || 'Failed to update profile';
      if (Platform.OS === 'web') {
        window.alert(msg);
      } else {
        Alert.alert('Error', msg);
      }
    } finally {
      setIsSaving(false);
    }
  };

  const { isDesktopWeb: isDesktop } = useAppLayout();

  return (
    <ResponsiveContainer maxWidth={MAX_ADMIN_WIDTH}>
      <SafeAreaView style={styles.safeArea} edges={['top', 'left', 'right']}>
        {/* Header */}
        <HomeHeader
          onBackPress={() => (navigation.canGoBack() ? navigation.goBack() : navigation.navigate('UserProfile'))}
          onNotificationPress={() => navigation.navigate('Notifications')}
          onProfilePress={() => navigation.navigate('UserProfile')}
          onCartPress={() => navigation.navigate('Cart')}
          notificationCount={3}
          userName={name ? name.split(' ')[0] : 'User'}
        />

        <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
          {/* Centered Edit Profile Card */}
          <View style={[styles.editCard, isDesktop && styles.editCardDesktop]}>
            <View style={styles.cardHeaderRow}>
              <TouchableOpacity
                style={styles.backCircleBtn}
                onPress={() => (navigation.canGoBack() ? navigation.goBack() : navigation.navigate('UserProfile'))}
                activeOpacity={0.7}
              >
                <MaterialIcons name="arrow-back" size={20} color={Colors.onSurface} />
              </TouchableOpacity>

              <View style={{ flex: 1 }}>
                <Text style={styles.cardHeaderTitle}>Edit Profile Information</Text>
                <Text style={styles.cardHeaderSubtitle}>Update your photo, name and contact details</Text>
              </View>
            </View>

            <View style={[styles.cardBody, isDesktop && styles.cardBodyDesktop]}>
              {/* Avatar Section */}
              <View style={styles.avatarSection}>
                <TouchableOpacity
                  style={styles.avatarWrapper}
                  onPress={pickImage}
                  activeOpacity={0.85}
                >
                  {(() => {
                    const safeAvatar = sanitizeRemoteImageUrl(displayAvatar);
                    return safeAvatar ? (
                      <Image source={{ uri: safeAvatar }} style={styles.avatar} />
                    ) : (
                      <View style={styles.avatarPlaceholder}>
                        <Text style={styles.avatarPlaceholderText}>
                          {name ? name.charAt(0).toUpperCase() : 'U'}
                        </Text>
                      </View>
                    );
                  })()}

                  <View style={styles.editIconBadge}>
                    <MaterialIcons name="photo-camera" size={14} color="#ffffff" />
                  </View>
                </TouchableOpacity>

                <Text style={styles.avatarHint}>Change Photo</Text>
              </View>

              {/* Form Section */}
              <View style={[styles.formSection, isDesktop && styles.formSectionDesktop]}>
                <View style={[styles.inputGroup, isDesktop && styles.inputGroupHalf]}>
                  <Text style={styles.label}>Full Name</Text>
                  <TextInput
                    style={styles.input}
                    value={name}
                    onChangeText={setName}
                    placeholder="Enter your full name"
                    placeholderTextColor={Colors.tertiary}
                  />
                </View>

                <View style={[styles.inputGroup, isDesktop && styles.inputGroupHalf]}>
                  <Text style={styles.label}>Phone Number</Text>
                  <TextInput
                    style={styles.input}
                    value={phone}
                    onChangeText={setPhone}
                    placeholder="Enter 10-digit phone number"
                    placeholderTextColor={Colors.tertiary}
                    keyboardType="phone-pad"
                  />
                </View>

                <View style={[styles.inputGroup, isDesktop && styles.inputGroupHalf]}>
                  <Text style={styles.label}>Email Address (Read-only)</Text>
                  <TextInput
                    style={[styles.input, styles.inputDisabled]}
                    value={user?.email || ''}
                    editable={false}
                  />
                </View>

                <View style={[styles.inputGroup, isDesktop && styles.inputGroupHalf, isDesktop && { justifyContent: 'flex-end' }]}>
                  {isSaving ? (
                    <View style={styles.loadingWrapper}>
                      <LoadingSpinner message="Saving changes..." />
                    </View>
                  ) : (
                    <PrimaryButton
                      title="Save Profile Changes"
                      onPress={handleSave}
                      style={styles.saveButton}
                    />
                  )}
                </View>
              </View>
            </View>
          </View>

          <FooterSection />
        </ScrollView>
      </SafeAreaView>
    </ResponsiveContainer>
  );
};

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  scrollContent: {
    paddingBottom: Spacing.xl,
  },
  editCard: {
    marginHorizontal: Spacing.marginMobile,
    marginTop: Spacing.md,
    backgroundColor: Colors.surfaceContainerLowest,
    borderRadius: BorderRadius.xl,
    padding: Spacing.lg,
    borderWidth: 1,
    borderColor: Colors.surfaceContainerHigh,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.05,
    shadowRadius: 10,
    elevation: 2,
  },
  editCardDesktop: {
    width: '100%',
    marginHorizontal: 0,
    marginTop: Spacing.lg,
    padding: Spacing.xl,
  },
  cardHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    paddingBottom: Spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: Colors.surfaceContainerHigh,
    marginBottom: Spacing.lg,
  },
  backCircleBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: Colors.surfaceContainerLow,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cardHeaderTitle: {
    ...Typography.titleLg,
    fontSize: 18,
    fontFamily: 'Inter-Bold',
    color: Colors.onSurface,
  },
  cardHeaderSubtitle: {
    ...Typography.bodyMd,
    fontSize: 12,
    color: Colors.onSurfaceVariant,
    marginTop: 2,
  },
  cardBody: {
    alignItems: 'center',
  },
  cardBodyDesktop: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: Spacing.xl,
  },
  avatarSection: {
    alignItems: 'center',
    marginBottom: Spacing.md,
  },
  avatarWrapper: {
    position: 'relative',
    width: 90,
    height: 90,
    borderRadius: 45,
  },
  avatar: {
    width: 90,
    height: 90,
    borderRadius: 45,
  },
  avatarPlaceholder: {
    width: 90,
    height: 90,
    borderRadius: 45,
    backgroundColor: Colors.primaryFixed,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: Colors.primary,
  },
  avatarPlaceholderText: {
    fontSize: 32,
    fontFamily: 'Inter-Bold',
    color: Colors.primary,
  },
  editIconBadge: {
    position: 'absolute',
    bottom: 0,
    right: 0,
    backgroundColor: Colors.primary,
    width: 28,
    height: 28,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: '#ffffff',
  },
  avatarHint: {
    ...Typography.bodyMd,
    fontSize: 12,
    color: Colors.tertiary,
    marginTop: Spacing.xs,
    fontFamily: 'Inter-Medium',
  },
  formSection: {
    flex: 1,
    width: '100%',
  },
  formSectionDesktop: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.md,
  },
  inputGroup: {
    marginBottom: Spacing.md,
    width: '100%',
  },
  inputGroupHalf: {
    width: '48.5%' as any,
    marginBottom: Spacing.xs,
  },
  label: {
    ...Typography.labelLg,
    fontSize: 13,
    color: Colors.onSurface,
    marginBottom: 4,
    fontFamily: 'Inter-Bold',
  },
  input: {
    height: 44,
    ...Typography.bodyLg,
    fontSize: 14,
    backgroundColor: Colors.surfaceContainerLowest,
    color: Colors.onSurface,
    borderRadius: BorderRadius.md,
    paddingHorizontal: Spacing.md,
    borderWidth: 1,
    borderColor: Colors.surfaceContainerHigh,
  },
  inputDisabled: {
    backgroundColor: Colors.surfaceContainerLow,
    color: Colors.tertiary,
  },
  saveButton: {
    marginTop: 0,
    height: 44,
    justifyContent: 'center',
  },
  loadingWrapper: {
    alignItems: 'center',
    justifyContent: 'center',
    height: 44,
  },
});

export default EditProfileScreen;
