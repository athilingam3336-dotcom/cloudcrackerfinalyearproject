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
import { ResponsiveContainer } from '@/components/common/ResponsiveContainer';
import { MAX_ADMIN_WIDTH } from '@/constants/responsive';
import { HomeHeader } from '@/components/common/HomeHeader';
import { FooterSection } from '@/components/common/FooterSection';
import { useAppLayout } from '@/hooks/useAppLayout';

type AboutManagementScreenProps = NativeStackScreenProps<
  RootStackParamList,
  'AboutManagement'
>;

export const AboutManagementScreen: React.FC<AboutManagementScreenProps> = ({
  navigation,
}) => {
  const { isDesktopWeb: isDesktop } = useAppLayout();
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
      Alert.alert('Success', 'About Meera Crackers content saved successfully.');
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
        <LoadingSpinner message="Fetching About content..." />
      </SafeAreaView>
    );
  }

  return (
    <ResponsiveContainer maxWidth={MAX_ADMIN_WIDTH}>
      <SafeAreaView style={styles.safeArea} edges={['top', 'left', 'right']}>
        {/* Navigation Header */}
        <HomeHeader
          onBackPress={() => navigation.goBack()}
          onNotificationPress={() => navigation.navigate('Notifications')}
          onProfilePress={() => navigation.navigate('UserProfile')}
          onCartPress={() => navigation.navigate('Cart')}
        />

        <KeyboardAvoidingView
          style={{ flex: 1 }}
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        >
          <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
            {/* Header Title & Action Bar Row */}
            <View style={[styles.pageHeaderRow, isDesktop && styles.pageHeaderRowDesktop]}>
              <View style={styles.titleHeaderRow}>
                <TouchableOpacity
                  style={styles.backBtn}
                  onPress={() => (navigation.canGoBack() ? navigation.goBack() : navigation.navigate('AdminDashboard'))}
                  activeOpacity={0.7}
                  accessibilityLabel="Go back"
                >
                  <MaterialIcons name="arrow-back" size={24} color={Colors.primary} />
                </TouchableOpacity>
                <View style={{ flex: 1 }}>
                  <Text style={styles.headerTitle}>Manage About Meera Crackers Info</Text>
                  <Text style={styles.headerSubtitle}>
                    Edit app version, platform description, and dynamic content sections visible to all customers.
                  </Text>
                </View>
              </View>

              {isDesktop && (
                <View style={styles.headerActionsRowDesktop}>
                  <TouchableOpacity style={styles.addBtnHeader} onPress={handleAddSection} activeOpacity={0.8}>
                    <MaterialIcons name="add-circle-outline" size={18} color={Colors.primary} />
                    <Text style={styles.addBtnHeaderText}>Add Section</Text>
                  </TouchableOpacity>

                  <PrimaryButton
                    title={isSaving ? 'Saving...' : 'Save Configuration'}
                    onPress={handleSave}
                    disabled={isSaving}
                    style={{ minWidth: 170, height: 42 }}
                  />
                </View>
              )}
            </View>

            {/* Main Content Body Container */}
            <View style={[styles.mainBodyContainer, isDesktop && styles.mainBodyContainerDesktop]}>
              {/* Left Column / Panel: General Details */}
              <View style={[styles.leftDetailsPanel, isDesktop && styles.leftDetailsPanelDesktop]}>
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
                    placeholder="e.g. India's premier pyrotechnics platform"
                    value={description}
                    onChangeText={setDescription}
                    multiline
                    numberOfLines={3}
                    style={styles.textArea}
                    containerStyle={{ marginTop: Spacing.sm }}
                  />
                </View>

                {!isDesktop && (
                  <View style={styles.saveContainer}>
                    <PrimaryButton
                      title={isSaving ? 'Saving Changes...' : 'Save Configuration'}
                      onPress={handleSave}
                      disabled={isSaving}
                    />
                  </View>
                )}
              </View>

              {/* Right Column / Panel: Content Sections */}
              <View style={[styles.rightSectionsPanel, isDesktop && styles.rightSectionsPanelDesktop]}>
                <View style={styles.sectionHeaderRow}>
                  <Text style={styles.sectionTitle}>Content Sections ({sections.length})</Text>
                  {!isDesktop && (
                    <TouchableOpacity style={styles.addBtn} onPress={handleAddSection} activeOpacity={0.7}>
                      <MaterialIcons name="add-circle-outline" size={20} color={Colors.primary} />
                      <Text style={styles.addBtnText}>Add Section</Text>
                    </TouchableOpacity>
                  )}
                </View>

                {sections.length === 0 ? (
                  <View style={styles.emptyContainer}>
                    <MaterialIcons name="info-outline" size={40} color={Colors.tertiary} />
                    <Text style={styles.emptyText}>No about sections defined yet. Click 'Add Section' to start.</Text>
                  </View>
                ) : (
                  <View style={[styles.sectionsGrid, isDesktop && styles.sectionsGridDesktop]}>
                    {sections.map((section, index) => (
                      <View key={index} style={[styles.sectionCard, isDesktop && styles.sectionCardDesktop]}>
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
                          label="Title (with Emoji)"
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
                          numberOfLines={3}
                          style={styles.textArea}
                          containerStyle={{ marginTop: Spacing.xs }}
                        />
                      </View>
                    ))}
                  </View>
                )}
              </View>
            </View>

            <FooterSection />
          </ScrollView>
        </KeyboardAvoidingView>
      </SafeAreaView>
    </ResponsiveContainer>
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
  scrollContent: {
    padding: Spacing.md,
    paddingBottom: Spacing.xl,
  },
  pageHeaderRow: {
    marginBottom: Spacing.md,
  },
  pageHeaderRowDesktop: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: Spacing.lg,
  },
  headerActionsRowDesktop: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.md,
  },
  addBtnHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: Spacing.md,
    height: 42,
    borderRadius: BorderRadius.lg,
    backgroundColor: Colors.primaryFixed,
    gap: 6,
  },
  addBtnHeaderText: {
    ...Typography.labelLg,
    fontSize: 13,
    fontFamily: 'Inter-Bold',
    color: Colors.primary,
  },
  titleHeaderRow: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.xs,
  },
  backBtn: {
    padding: Spacing.xs,
    borderRadius: BorderRadius.md,
    backgroundColor: Colors.surfaceContainerLow,
    borderWidth: 1,
    borderColor: Colors.surfaceContainerHigh,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 6,
  },
  inlineBackRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginBottom: Spacing.xs,
  },
  inlineBackText: {
    ...Typography.labelLg,
    fontSize: 13,
    fontFamily: 'Inter-Bold',
    color: Colors.primary,
  },
  headerTitle: {
    ...Typography.headlineLg,
    fontSize: 22,
    fontFamily: 'Inter-Bold',
    color: Colors.onSurface,
  },
  headerSubtitle: {
    ...Typography.bodyMd,
    fontSize: 13,
    color: Colors.onSurfaceVariant,
    marginTop: 2,
  },
  mainBodyContainer: {
    gap: Spacing.md,
  },
  mainBodyContainerDesktop: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: Spacing.lg,
  },
  leftDetailsPanel: {
    width: '100%',
  },
  leftDetailsPanelDesktop: {
    width: 360,
  },
  rightSectionsPanel: {
    width: '100%',
  },
  rightSectionsPanelDesktop: {
    flex: 1,
  },
  card: {
    backgroundColor: Colors.surfaceContainerLowest,
    borderRadius: BorderRadius.lg,
    padding: Spacing.md,
    borderWidth: 1,
    borderColor: Colors.surfaceContainerHigh,
    marginBottom: Spacing.sm,
  },
  cardTitle: {
    ...Typography.titleLg,
    fontSize: 16,
    fontFamily: 'Inter-Bold',
    color: Colors.onSurface,
    marginBottom: Spacing.xs,
  },
  textArea: {
    minHeight: 52,
    textAlignVertical: 'top',
    paddingVertical: 4,
  },
  sectionHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: Spacing.xs,
  },
  sectionTitle: {
    ...Typography.titleLg,
    fontSize: 15,
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
    fontSize: 13,
    fontFamily: 'Inter-Bold',
    color: Colors.primary,
  },
  emptyContainer: {
    backgroundColor: Colors.surfaceContainerLowest,
    borderRadius: BorderRadius.lg,
    borderWidth: 1,
    borderColor: Colors.surfaceContainerHigh,
    padding: Spacing.md,
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.xs,
    marginBottom: Spacing.sm,
  },
  emptyText: {
    ...Typography.bodyMd,
    fontSize: 13,
    color: Colors.tertiary,
    textAlign: 'center',
  },
  sectionsGrid: {
    gap: Spacing.xs,
  },
  sectionsGridDesktop: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.md,
  },
  sectionCard: {
    backgroundColor: Colors.surfaceContainerLowest,
    borderRadius: BorderRadius.lg,
    padding: Spacing.sm,
    borderWidth: 1,
    borderColor: Colors.surfaceContainerHigh,
    marginBottom: Spacing.xs,
    width: '100%',
  },
  sectionCardDesktop: {
    width: '48.5%' as any,
    marginBottom: 0,
  },
  sectionCardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: Spacing.xs,
    borderBottomWidth: 1,
    borderBottomColor: Colors.surfaceContainerHigh,
    paddingBottom: 2,
  },
  sectionCardLabel: {
    ...Typography.labelLg,
    fontSize: 13,
    fontFamily: 'Inter-Bold',
    color: Colors.primary,
  },
  deleteBtn: {
    padding: 2,
  },
  saveContainer: {
    marginTop: Spacing.sm,
  },
});

export default AboutManagementScreen;
