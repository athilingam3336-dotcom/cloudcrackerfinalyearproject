/**
 * StoreHeaderSettingsModal.tsx
 *
 * Store Header, Google Map, and Contact Settings:
 * - Top Announcement Banner Text
 * - Store Google Maps Location Link
 * - Store Support Email (Format validated)
 * - Call Phone (Strict 10-digit Indian Mobile Validation: 6/7/8/9)
 * - WhatsApp Number (Strict 10-digit Indian Mobile Validation: 6/7/8/9)
 * - Minimum Online Delivery Order Threshold (₹)
 *
 * Integrated with SweetAlertModal for professional error & success notifications.
 * Automatically synchronizes changes live across Header, Footer, and Profile screens.
 */

import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  TouchableOpacity,
  TextInput,
  ActivityIndicator,
  ScrollView,
  Linking,
  TouchableWithoutFeedback,
} from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { useSettingsStore } from '@/store/settingsStore';
import { SweetAlertModal, SweetAlertType } from '@/components/common/SweetAlertModal';

interface StoreHeaderSettingsModalProps {
  visible: boolean;
  onClose: () => void;
}

export const StoreHeaderSettingsModal: React.FC<StoreHeaderSettingsModalProps> = ({
  visible,
  onClose,
}) => {
  const {
    announcementText,
    locationMapUrl,
    contactEmail,
    contactPhone,
    whatsappNumber,
    minOnlineDeliveryAmount,
    fetchSettings,
    updateStoreSettings,
  } = useSettingsStore();

  const [announcement, setAnnouncement] = useState('');
  const [mapUrl, setMapUrl] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [whatsapp, setWhatsapp] = useState('');
  const [minDelivery, setMinDelivery] = useState('');
  const [isSaving, setIsSaving] = useState(false);

  // SweetAlert Modal State
  const [sweetAlert, setSweetAlert] = useState<{
    visible: boolean;
    type: SweetAlertType;
    title: string;
    message: string;
    onConfirm?: () => void;
  }>({
    visible: false,
    type: 'error',
    title: '',
    message: '',
  });

  useEffect(() => {
    if (visible) {
      fetchSettings();
    }
  }, [visible, fetchSettings]);

  useEffect(() => {
    setAnnouncement(
      announcementText ||
        'Direct Sivakasi Factory Prices | Express Delivery Across Tamil Nadu & All India'
    );
    setMapUrl(locationMapUrl || 'https://maps.app.goo.gl/6BE5qX4vxyutrkAD6?g_st=aw');
    setEmail(contactEmail || 'Meeracrackers@gmail.com');
    setPhone(contactPhone || '7339624431');
    setWhatsapp(whatsappNumber || '7339624431');
    setMinDelivery(String(minOnlineDeliveryAmount || 5000));
  }, [
    announcementText,
    locationMapUrl,
    contactEmail,
    contactPhone,
    whatsappNumber,
    minOnlineDeliveryAmount,
  ]);

  // Phone & WhatsApp number validator
  const validatePhone = (
    raw: string,
    fieldName: string
  ): { isValid: boolean; message: string; clean: string; digitCount: number } => {
    const trimmed = (raw || '').trim();
    if (!trimmed) {
      return {
        isValid: false,
        message: `${fieldName} is required. Please enter a valid 10-digit mobile number.`,
        clean: '',
        digitCount: 0,
      };
    }

    const digits = trimmed.replace(/\D/g, '');
    let normal = digits;
    if (digits.startsWith('91') && digits.length === 12) {
      normal = digits.slice(2);
    } else if (digits.startsWith('0') && digits.length === 11) {
      normal = digits.slice(1);
    }

    if (normal.length !== 10) {
      return {
        isValid: false,
        message: `${fieldName} has ${normal.length} digit${normal.length === 1 ? '' : 's'} (${trimmed}). A valid 10-digit Indian mobile number is required (e.g. 7339624431). 3 or 4 digits cannot be accepted.`,
        clean: normal,
        digitCount: normal.length,
      };
    }

    if (!/^[6-9]/.test(normal)) {
      return {
        isValid: false,
        message: `${fieldName} must start with 6, 7, 8, or 9 (standard Indian mobile format).`,
        clean: normal,
        digitCount: 10,
      };
    }

    return { isValid: true, message: '', clean: normal, digitCount: 10 };
  };

  const phoneValidation = validatePhone(phone, 'Call Phone');
  const whatsappValidation = validatePhone(whatsapp, 'WhatsApp Number');

  const handleTestMap = () => {
    if (!mapUrl.trim()) {
      setSweetAlert({
        visible: true,
        type: 'warning',
        title: 'Empty Location',
        message: 'Please enter a Google Maps link or store address first.',
      });
      return;
    }
    const target = mapUrl.trim();
    if (target.startsWith('http://') || target.startsWith('https://')) {
      Linking.openURL(target);
    } else {
      Linking.openURL(`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(target)}`);
    }
  };

  const handleSave = async () => {
    // 1. Validate Announcement
    if (!announcement.trim()) {
      setSweetAlert({
        visible: true,
        type: 'error',
        title: 'Announcement Required',
        message: 'Top announcement banner text cannot be empty.',
      });
      return;
    }

    // 2. Validate Google Maps URL / Location
    if (!mapUrl.trim()) {
      setSweetAlert({
        visible: true,
        type: 'error',
        title: 'Location Required',
        message: 'Please enter a valid Google Maps location link or store address.',
      });
      return;
    }

    // 3. Validate Support Email
    const emailRegex = /^[a-zA-Z0-9_.+-]+@[a-zA-Z0-9-]+\.[a-zA-Z0-9-.]+$/;
    if (!email.trim() || !emailRegex.test(email.trim())) {
      setSweetAlert({
        visible: true,
        type: 'error',
        title: 'Invalid Support Email',
        message: 'Please enter a valid store support email (e.g. Meeracrackers@gmail.com).',
      });
      return;
    }

    // 4. Validate Call Phone
    if (!phoneValidation.isValid) {
      setSweetAlert({
        visible: true,
        type: 'error',
        title: 'Invalid Phone Number',
        message: phoneValidation.message,
      });
      return;
    }

    // 5. Validate WhatsApp Number
    if (!whatsappValidation.isValid) {
      setSweetAlert({
        visible: true,
        type: 'error',
        title: 'Invalid WhatsApp Number',
        message: whatsappValidation.message,
      });
      return;
    }

    // 6. Validate Minimum Delivery Threshold
    const parsedMinDelivery = parseFloat(minDelivery);
    if (isNaN(parsedMinDelivery) || parsedMinDelivery < 0) {
      setSweetAlert({
        visible: true,
        type: 'error',
        title: 'Invalid Minimum Delivery',
        message: 'Minimum delivery threshold must be a valid positive amount (e.g. ₹5,000).',
      });
      return;
    }

    setIsSaving(true);
    try {
      await updateStoreSettings({
        announcement_text: announcement.trim(),
        location_map_url: mapUrl.trim(),
        contact_email: email.trim(),
        contact_phone: phoneValidation.clean,
        whatsapp_number: whatsappValidation.clean,
        min_online_delivery_amount: parsedMinDelivery,
      });

      setIsSaving(false);
      setSweetAlert({
        visible: true,
        type: 'success',
        title: 'Settings Saved Live!',
        message:
          'Top announcement banner, Call phone, WhatsApp order button, and Footer contact details have been updated live across the entire website!',
        onConfirm: () => {
          setSweetAlert((prev) => ({ ...prev, visible: false }));
          onClose();
        },
      });
    } catch (err: any) {
      setIsSaving(false);
      setSweetAlert({
        visible: true,
        type: 'error',
        title: 'Update Failed',
        message: err.message || 'Failed to update store settings. Please check your network and try again.',
      });
    }
  };

  return (
    <>
      <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
        <TouchableOpacity style={styles.overlay} activeOpacity={1} onPress={onClose}>
          <TouchableWithoutFeedback>
            <View style={styles.modalCard}>
              {/* Header */}
              <View style={styles.header}>
                <View style={styles.titleRow}>
                  <View style={styles.iconCircle}>
                    <MaterialIcons name="store" size={24} color="#DC2626" />
                  </View>
                  <View>
                    <Text style={styles.title}>Store Header & Map Settings</Text>
                    <Text style={styles.subtitle}>
                      Customize Announcement, Google Map & Contact details
                    </Text>
                  </View>
                </View>

                <TouchableOpacity onPress={onClose} style={styles.closeBtn}>
                  <MaterialIcons name="close" size={20} color="#64748B" />
                </TouchableOpacity>
              </View>

              <ScrollView
                showsVerticalScrollIndicator={false}
                contentContainerStyle={styles.scrollContent}
              >
                {/* Field 1: Announcement Text */}
                <View style={styles.fieldContainer}>
                  <Text style={styles.label}>📢 Top Announcement Banner Text</Text>
                  <TextInput
                    style={styles.textInput}
                    value={announcement}
                    onChangeText={setAnnouncement}
                    placeholder="Direct Sivakasi Factory Prices | Express Delivery..."
                    placeholderTextColor="#94A3B8"
                  />
                </View>

                {/* Field 2: Google Maps Location URL / Address */}
                <View style={styles.fieldContainer}>
                  <View style={styles.labelRow}>
                    <Text style={styles.label}>📍 Store Google Maps Link / Location</Text>
                    <TouchableOpacity onPress={handleTestMap} style={styles.testLinkBtn}>
                      <MaterialIcons name="open-in-new" size={14} color="#2563EB" />
                      <Text style={styles.testLinkText}>Test Map</Text>
                    </TouchableOpacity>
                  </View>
                  <TextInput
                    style={styles.textInput}
                    value={mapUrl}
                    onChangeText={setMapUrl}
                    placeholder="https://maps.app.goo.gl/... or Store Address"
                    placeholderTextColor="#94A3B8"
                    autoCapitalize="none"
                  />
                </View>

                {/* Field 3: Email */}
                <View style={styles.fieldContainer}>
                  <Text style={styles.label}>✉️ Store Support Email</Text>
                  <TextInput
                    style={styles.textInput}
                    value={email}
                    onChangeText={setEmail}
                    placeholder="Meeracrackers@gmail.com"
                    placeholderTextColor="#94A3B8"
                    keyboardType="email-address"
                    autoCapitalize="none"
                  />
                </View>

                {/* Field 4 & 5: Phone & WhatsApp with Real-time Error Detection */}
                <View style={styles.rowFields}>
                  {/* Call Phone */}
                  <View style={[styles.fieldContainer, { flex: 1 }]}>
                    <View style={styles.labelRow}>
                      <Text style={styles.label}>📞 Call Phone</Text>
                      {phone.trim().length > 0 && (
                        <Text
                          style={[
                            styles.badgeDigitCount,
                            phoneValidation.isValid
                              ? styles.badgeDigitValid
                              : styles.badgeDigitInvalid,
                          ]}
                        >
                          {phoneValidation.isValid ? '✅ 10 Digits' : `⚠️ ${phoneValidation.digitCount}/10`}
                        </Text>
                      )}
                    </View>
                    <TextInput
                      style={[
                        styles.textInput,
                        phone.trim().length > 0 &&
                          !phoneValidation.isValid &&
                          styles.textInputError,
                        phoneValidation.isValid && styles.textInputSuccess,
                      ]}
                      value={phone}
                      onChangeText={setPhone}
                      placeholder="7339624431"
                      placeholderTextColor="#94A3B8"
                      keyboardType="phone-pad"
                      maxLength={15}
                    />
                    {phone.trim().length > 0 && !phoneValidation.isValid && (
                      <Text style={styles.inputErrorText}>
                        {phoneValidation.digitCount < 10
                          ? `Need ${10 - phoneValidation.digitCount} more digits`
                          : 'Must start with 6, 7, 8, or 9'}
                      </Text>
                    )}
                  </View>

                  {/* WhatsApp Number */}
                  <View style={[styles.fieldContainer, { flex: 1 }]}>
                    <View style={styles.labelRow}>
                      <Text style={styles.label}>💬 WhatsApp Number</Text>
                      {whatsapp.trim().length > 0 && (
                        <Text
                          style={[
                            styles.badgeDigitCount,
                            whatsappValidation.isValid
                              ? styles.badgeDigitValid
                              : styles.badgeDigitInvalid,
                          ]}
                        >
                          {whatsappValidation.isValid
                            ? '✅ 10 Digits'
                            : `⚠️ ${whatsappValidation.digitCount}/10`}
                        </Text>
                      )}
                    </View>
                    <TextInput
                      style={[
                        styles.textInput,
                        whatsapp.trim().length > 0 &&
                          !whatsappValidation.isValid &&
                          styles.textInputError,
                        whatsappValidation.isValid && styles.textInputSuccess,
                      ]}
                      value={whatsapp}
                      onChangeText={setWhatsapp}
                      placeholder="7339624431"
                      placeholderTextColor="#94A3B8"
                      keyboardType="phone-pad"
                      maxLength={15}
                    />
                    {whatsapp.trim().length > 0 && !whatsappValidation.isValid && (
                      <Text style={styles.inputErrorText}>
                        {whatsappValidation.digitCount < 10
                          ? `Need ${10 - whatsappValidation.digitCount} more digits`
                          : 'Must start with 6, 7, 8, or 9'}
                      </Text>
                    )}
                  </View>
                </View>

                {/* Field 6: Minimum Order Delivery Threshold */}
                <View style={styles.fieldContainer}>
                  <Text style={styles.label}>🚚 Delivery Minimum Threshold (₹)</Text>
                  <TextInput
                    style={styles.textInput}
                    value={minDelivery}
                    onChangeText={setMinDelivery}
                    placeholder="5000"
                    placeholderTextColor="#94A3B8"
                    keyboardType="numeric"
                  />
                </View>

                {/* Action Buttons */}
                <View style={styles.actionsRow}>
                  <TouchableOpacity
                    style={styles.cancelBtn}
                    onPress={onClose}
                    disabled={isSaving}
                  >
                    <Text style={styles.cancelText}>Cancel</Text>
                  </TouchableOpacity>

                  <TouchableOpacity
                    style={[styles.saveBtn, isSaving && { opacity: 0.6 }]}
                    onPress={handleSave}
                    disabled={isSaving}
                  >
                    {isSaving ? (
                      <ActivityIndicator size="small" color="#FFFFFF" />
                    ) : (
                      <>
                        <MaterialIcons name="check-circle" size={18} color="#FFFFFF" />
                        <Text style={styles.saveText}>Save Live Settings</Text>
                      </>
                    )}
                  </TouchableOpacity>
                </View>
              </ScrollView>
            </View>
          </TouchableWithoutFeedback>
        </TouchableOpacity>
      </Modal>

      {/* Professional SweetAlert Feedback Modal */}
      <SweetAlertModal
        visible={sweetAlert.visible}
        type={sweetAlert.type}
        title={sweetAlert.title}
        message={sweetAlert.message}
        onConfirm={() => {
          if (sweetAlert.onConfirm) {
            sweetAlert.onConfirm();
          } else {
            setSweetAlert((prev) => ({ ...prev, visible: false }));
          }
        }}
      />
    </>
  );
};

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(15, 23, 42, 0.7)',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 16,
  },
  modalCard: {
    width: '100%',
    maxWidth: 540,
    maxHeight: '90%',
    backgroundColor: '#FFFFFF',
    borderRadius: 18,
    padding: 22,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.25,
    shadowRadius: 18,
    elevation: 10,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    marginBottom: 14,
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    flex: 1,
  },
  iconCircle: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#FEE2E2',
    alignItems: 'center',
    justifyContent: 'center',
  },
  title: {
    fontFamily: 'Inter-Bold',
    fontSize: 16.5,
    color: '#0F172A',
  },
  subtitle: {
    fontFamily: 'Inter-Regular',
    fontSize: 12,
    color: '#64748B',
    marginTop: 2,
  },
  closeBtn: {
    padding: 4,
  },
  scrollContent: {
    paddingVertical: 4,
  },
  fieldContainer: {
    marginBottom: 14,
  },
  labelRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 6,
  },
  label: {
    fontFamily: 'Inter-Bold',
    fontSize: 13,
    color: '#1E293B',
  },
  badgeDigitCount: {
    fontSize: 10.5,
    fontFamily: 'Inter-Bold',
    paddingHorizontal: 6,
    paddingVertical: 1.5,
    borderRadius: 6,
  },
  badgeDigitValid: {
    backgroundColor: '#DCFCE7',
    color: '#166534',
  },
  badgeDigitInvalid: {
    backgroundColor: '#FEE2E2',
    color: '#991B1B',
  },
  inputErrorText: {
    fontSize: 10.5,
    fontFamily: 'Inter-SemiBold',
    color: '#DC2626',
    marginTop: 4,
  },
  testLinkBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 6,
    backgroundColor: '#EFF6FF',
  },
  testLinkText: {
    fontFamily: 'Inter-Bold',
    fontSize: 11,
    color: '#2563EB',
  },
  textInput: {
    backgroundColor: '#F8FAFC',
    borderRadius: 8,
    borderWidth: 1.5,
    borderColor: '#E2E8F0',
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 13.5,
    fontFamily: 'Inter-Medium',
    color: '#0F172A',
  },
  textInputError: {
    borderColor: '#EF4444',
    backgroundColor: '#FEF2F2',
  },
  textInputSuccess: {
    borderColor: '#22C55E',
    backgroundColor: '#F0FDF4',
  },
  rowFields: {
    flexDirection: 'row',
    gap: 12,
  },
  actionsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-end',
    gap: 10,
    marginTop: 10,
    paddingTop: 14,
    borderTopWidth: 1,
    borderTopColor: '#F1F5F9',
  },
  cancelBtn: {
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: 8,
  },
  cancelText: {
    fontFamily: 'Inter-SemiBold',
    fontSize: 13,
    color: '#64748B',
  },
  saveBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#DC2626',
    paddingVertical: 10,
    paddingHorizontal: 18,
    borderRadius: 8,
    gap: 6,
  },
  saveText: {
    fontFamily: 'Inter-Bold',
    fontSize: 13,
    color: '#FFFFFF',
  },
});

export default StoreHeaderSettingsModal;
