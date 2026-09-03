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

  return (
    <SafeAreaView style={styles.safeArea} edges={['top', 'left', 'right']}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => (navigation.canGoBack() ? navigation.goBack() : navigation.navigate('UserProfile'))}
          activeOpacity={0.7}
        >
          <MaterialIcons name="arrow-back" size={24} color={Colors.onSurface} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Edit Profile</Text>
        <View style={{ width: 24 }} />
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent}>
        {/* Avatar Section */}
        <View style={styles.avatarSection}>
          <TouchableOpacity
            style={styles.avatarWrapper}
            onPress={pickImage}
            activeOpacity={0.8}
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
              <MaterialIcons name="edit" size={16} color="#ffffff" />
            </View>
          </TouchableOpacity>
          <Text style={styles.avatarHint}>Tap avatar to update picture (1:1 square crop)</Text>
        </View>

        {/* Form Section */}
        <View style={styles.formSection}>
          <View style={styles.inputGroup}>
            <Text style={styles.label}>Full Name</Text>
            <TextInput
              style={styles.input}
              value={name}
              onChangeText={setName}
              placeholder="Enter your full name"
              placeholderTextColor={Colors.tertiary}
            />
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.label}>Phone Number</Text>
            <TextInput
              style={styles.input}
              value={phone}
              onChangeText={setPhone}
              placeholder="Enter your 10-digit phone number"
              placeholderTextColor={Colors.tertiary}
              keyboardType="phone-pad"
            />
          </View>
          
          <View style={styles.inputGroup}>
            <Text style={styles.label}>Email Address (Read-only)</Text>
            <TextInput
              style={[styles.input, styles.inputDisabled]}
              value={user?.email || ''}
              editable={false}
            />
          </View>

          {isSaving ? (
            <View style={styles.loadingWrapper}>
              <LoadingSpinner message="Saving profile changes..." />
            </View>
          ) : (
            <PrimaryButton
              title="Save Changes"
              onPress={handleSave}
              style={styles.saveButton}
            />
          )}
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
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    backgroundColor: Colors.surfaceContainerLowest,
    borderBottomWidth: 1,
    borderBottomColor: Colors.surfaceContainerHigh,
  },
  backButton: {
    padding: Spacing.xs,
  },
  headerTitle: {
    ...Typography.titleLg,
    color: Colors.onSurface,
    fontFamily: 'Inter-Bold',
  },
  scrollContent: {
    padding: Spacing.md,
  },
  avatarSection: {
    alignItems: 'center',
    marginVertical: Spacing.lg,
  },
  avatarWrapper: {
    position: 'relative',
    width: 120,
    height: 120,
    borderRadius: 60,
  },
  avatar: {
    width: 120,
    height: 120,
    borderRadius: 60,
  },
  avatarPlaceholder: {
    width: 120,
    height: 120,
    borderRadius: 60,
    backgroundColor: Colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarPlaceholderText: {
    ...Typography.headlineLg,
    color: Colors.onPrimary,
  },
  editIconBadge: {
    position: 'absolute',
    bottom: 0,
    right: 0,
    backgroundColor: Colors.primary,
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 3,
    borderColor: Colors.background,
  },
  avatarHint: {
    ...Typography.bodyMd,
    color: Colors.tertiary,
    marginTop: Spacing.sm,
  },
  formSection: {
    marginTop: Spacing.md,
  },
  inputGroup: {
    marginBottom: Spacing.lg,
  },
  label: {
    ...Typography.labelLg,
    color: Colors.onSurface,
    marginBottom: Spacing.xs,
    fontFamily: 'Inter-Bold',
  },
  input: {
    ...Typography.bodyLg,
    backgroundColor: Colors.surfaceContainerLowest,
    color: Colors.onSurface,
    borderRadius: BorderRadius.md,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.md,
    borderWidth: 1,
    borderColor: Colors.surfaceContainerHigh,
  },
  inputDisabled: {
    backgroundColor: Colors.surfaceContainerLow,
    color: Colors.tertiary,
  },
  saveButton: {
    marginTop: Spacing.lg,
  },
  loadingWrapper: {
    marginTop: Spacing.lg,
    alignItems: 'center',
    justifyContent: 'center',
  },
});

export default EditProfileScreen;
