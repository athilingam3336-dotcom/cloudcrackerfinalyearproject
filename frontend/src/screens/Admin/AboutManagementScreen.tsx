import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { MaterialIcons } from '@expo/vector-icons';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { Colors } from '@/constants/colors';
import { Typography } from '@/constants/typography';
import { Spacing, BorderRadius } from '@/constants/spacing';
import { CustomInput } from '@/components/inputs/CustomInput';
import { PrimaryButton } from '@/components/buttons/PrimaryButton';
import { LoadingSpinner } from '@/components/loaders/LoadingSpinner';
import { aboutService, AboutSection, AboutData } from '@/services/aboutService';
import { RootStackParamList } from '@/navigation/types';

type AboutManagementScreenProps = NativeStackScreenProps<
  RootStackParamList,
  'AboutManagement'
>;

export const AboutManagementScreen: React.FC<AboutManagementScreenProps> = ({
  navigation,
}) => {
  const [version, setVersion] = useState('');
  const [description, setDescription] = useState('');
  const [sections, setSections] = useState<AboutSection[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);

  // Fetch current about details from backend
  const fetchAboutData = useCallback(async () => {
    setIsLoading(true);
    try {
      const data = await aboutService.getAbout();
      setVersion(data.version || 'v2.4.0');
      setDescription(data.description || '');
      setSections(data.sections || []);
    } catch (err: any) {
      const errMsg = err.response?.data?.message || err.message || 'Failed to fetch About content.';
      Alert.alert('Error', errMsg);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchAboutData();
  }, [fetchAboutData]);

  // Add a new section to the list
  const handleAddSection = () => {
    setSections((prev) => [
      ...prev,
      { title: '', content: '' },
    ]);
  };

  // Delete a section from the list
  const handleDeleteSection = (index: number) => {
    setSections((prev) => prev.filter((_, i) => i !== index));
  };

  // Update a section's fields
  const handleUpdateSection = (index: number, key: keyof AboutSection, value: string) => {
    setSections((prev) =>
      prev.map((section, i) => (i === index ? { ...section, [key]: value } : section))
    );
  };

  // Save the updated configuration to backend
  const handleSave = async () => {
    if (!version.trim()) {
      Alert.alert('Validation Error', 'Version name is required.');
      return;
    }

    // Check if any section has empty title or content
    for (let i = 0; i < sections.length; i++) {
      if (!sections[i].title.trim() || !sections[i].content.trim()) {
        Alert.alert(
          'Validation Error',
          `Section #${i + 1} has empty title or content. Please fill or delete it.`
        );
        return;
      }
    }

    setIsSaving(true);
    try {
      const payload: AboutData = {
        version: version.trim(),
        description: description.trim(),
        sections: sections.map((s) => ({
          title: s.title.trim(),
          content: s.content.trim(),
        })),
      };
      await aboutService.updateAbout(payload);
      Alert.alert('Success', 'About CloudCrackers content saved successfully.');
      navigation.goBack();
    } catch (err: any) {
      const errMsg = err.response?.data?.message || err.message || 'Failed to save changes.';
      Alert.alert('Error', errMsg);
    } finally {
      setIsSaving(false);
    }
  };

  if (isLoading) {
    return (
      <SafeAreaView style={styles.loadingContainer}>
        <LoadingSpinner size="large" color={Colors.primary} />
        <Text style={styles.loadingText}>Fetching About content...</Text>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safeArea} edges={['top', 'left', 'right']}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity style={styles.backBtn} onPress={() => navigation.goBack()} activeOpacity={0.7}>
          <MaterialIcons name="arrow-back" size={24} color={Colors.onSurface} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Manage About Info</Text>
        <View style={{ width: 40 }} />
      </View>

      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
          {/* General App Info Section */}
          <View style={styles.card}>
            <Text style={styles.cardTitle}>Application General Details</Text>
            
            <CustomInput
              label="App Version"
              placeholder="e.g. v2.4.0"
              value={version}
              onChangeText={setVersion}
              leftIcon={<MaterialIcons name="label-outline" size={20} color={Colors.outline} />}
            />

            <CustomInput
              label="General Platform Description"
              placeholder="e.g. India's premium pyrotechnics platform"
              value={description}
              onChangeText={setDescription}
              multiline
              numberOfLines={3}
              style={styles.textArea}
              containerStyle={{ marginTop: Spacing.sm }}
            />
          </View>

          {/* Dynamic Content Sections */}
          <View style={styles.sectionHeaderRow}>
            <Text style={styles.sectionTitle}>Content Sections ({sections.length})</Text>
            <TouchableOpacity style={styles.addBtn} onPress={handleAddSection} activeOpacity={0.7}>
              <MaterialIcons name="add-circle-outline" size={20} color={Colors.primary} />
              <Text style={styles.addBtnText}>Add Section</Text>
            </TouchableOpacity>
          </View>

          {sections.length === 0 ? (
            <View style={styles.emptyContainer}>
              <MaterialIcons name="info-outline" size={40} color={Colors.tertiary} />
              <Text style={styles.emptyText}>No about sections defined yet. Click 'Add Section' to start.</Text>
            </View>
          ) : (
            sections.map((section, index) => (
              <View key={index} style={styles.sectionCard}>
                <View style={styles.sectionCardHeader}>
                  <Text style={styles.sectionCardLabel}>Section #{index + 1}</Text>
                  <TouchableOpacity
                    onPress={() => handleDeleteSection(index)}
                    activeOpacity={0.7}
                    style={styles.deleteBtn}
                  >
                    <MaterialIcons name="delete-outline" size={20} color={Colors.error} />
                  </TouchableOpacity>
                </View>

                <CustomInput
                  label="Title (with Emoji if needed)"
                  placeholder="e.g. 🛡️ Safe & Compliant"
                  value={section.title}
                  onChangeText={(val) => handleUpdateSection(index, 'title', val)}
                />

                <CustomInput
                  label="Content"
                  placeholder="Enter details for this section..."
                  value={section.content}
                  onChangeText={(val) => handleUpdateSection(index, 'content', val)}
                  multiline
                  numberOfLines={4}
                  style={styles.textArea}
                  containerStyle={{ marginTop: Spacing.xs }}
                />
              </View>
            ))
          )}

          {/* Save Action */}
          <View style={styles.saveContainer}>
            <PrimaryButton
              title={isSaving ? 'Saving Changes...' : 'Save Configuration'}
              onPress={handleSave}
              disabled={isSaving}
            />
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
  loadingContainer: {
    flex: 1,
    backgroundColor: Colors.background,
    justifyContent: 'center',
    alignItems: 'center',
    gap: Spacing.sm,
  },
  loadingText: {
    ...Typography.bodyMd,
    color: Colors.onSurfaceVariant,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: Spacing.marginMobile,
    paddingVertical: Spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: Colors.surfaceContainerHigh,
    backgroundColor: Colors.surface,
  },
  backBtn: {
    padding: 4,
  },
  headerTitle: {
    ...Typography.titleLg,
    fontFamily: 'Inter-Bold',
    color: Colors.onSurface,
  },
  scrollContent: {
    padding: Spacing.marginMobile,
    paddingBottom: Spacing.xxl,
  },
  card: {
    backgroundColor: Colors.surfaceContainerLowest,
    borderRadius: BorderRadius.xl,
    padding: Spacing.md,
    borderWidth: 1,
    borderColor: Colors.surfaceContainerHigh,
    marginBottom: Spacing.lg,
  },
  cardTitle: {
    ...Typography.titleMd,
    fontFamily: 'Inter-Bold',
    color: Colors.onSurface,
    marginBottom: Spacing.md,
  },
  textArea: {
    minHeight: 80,
    textAlignVertical: 'top',
    paddingVertical: Spacing.xs,
  },
  sectionHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: Spacing.sm,
  },
  sectionTitle: {
    ...Typography.titleMd,
    fontFamily: 'Inter-Bold',
    color: Colors.onSurface,
  },
  addBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  addBtnText: {
    ...Typography.labelLg,
    fontFamily: 'Inter-Bold',
    color: Colors.primary,
  },
  emptyContainer: {
    backgroundColor: Colors.surfaceContainerLowest,
    borderRadius: BorderRadius.xl,
    borderWidth: 1,
    borderColor: Colors.surfaceContainerHigh,
    padding: Spacing.xl,
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.sm,
    marginBottom: Spacing.xl,
  },
  emptyText: {
    ...Typography.bodyMd,
    color: Colors.tertiary,
    textAlign: 'center',
  },
  sectionCard: {
    backgroundColor: Colors.surfaceContainerLowest,
    borderRadius: BorderRadius.xl,
    padding: Spacing.md,
    borderWidth: 1,
    borderColor: Colors.surfaceContainerHigh,
    marginBottom: Spacing.md,
  },
  sectionCardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: Spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: Colors.surfaceContainerHigh,
    paddingBottom: Spacing.xs,
  },
  sectionCardLabel: {
    ...Typography.labelLg,
    fontFamily: 'Inter-Bold',
    color: Colors.primary,
  },
  deleteBtn: {
    padding: 2,
  },
  saveContainer: {
    marginTop: Spacing.xl,
  },
});

export default AboutManagementScreen;
