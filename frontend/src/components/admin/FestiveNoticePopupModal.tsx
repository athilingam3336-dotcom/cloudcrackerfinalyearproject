/**
 * FestiveNoticePopupModal.tsx
 *
 * Admin Management Modal for Home Page Announcement / Festive Notice Popup:
 * - Admin can enable or disable (approve/hide) the popup modal.
 * - Admin can configure Diwali 3-day booking closure notice, festive discount offers, or transport alerts.
 * - One-click Quick Presets for fast setup.
 * - Allows selecting from preset festive images or entering custom banner image URL.
 * - Live miniature preview card showing exact customer appearance.
 * - Integrated with SweetAlertModal for smooth feedback.
 */

import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  TouchableOpacity,
  TextInput,
  ScrollView,
  Image,
  ActivityIndicator,
  Switch,
  Platform,
  useWindowDimensions,
} from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { useSettingsStore } from '@/store/settingsStore';
import { SweetAlertModal, SweetAlertType } from '@/components/common/SweetAlertModal';

interface FestiveNoticePopupModalProps {
  visible: boolean;
  onClose: () => void;
}

const BRAND_RED = '#990000';
const ACCENT_RED = '#DC2626';

const PRESET_IMAGES: Record<string, any> = {
  diwali: require('../../../assets/theri_diwali.jpg'),
  giftbox: require('../../../assets/products/grand_festival_gift_box.png'),
  delivery: require('../../../assets/online_delivery_banner.png'),
};

export const FestiveNoticePopupModal: React.FC<FestiveNoticePopupModalProps> = ({
  visible,
  onClose,
}) => {
  const { width: windowWidth, height: windowHeight } = useWindowDimensions();
  const isDesktop = windowWidth >= 768;

  const {
    popupEnabled,
    popupTitle,
    popupMessage,
    popupImageType,
    popupImageUrl,
    popupButtonText,
    popupButtonLink,
    fetchSettings,
    updateStoreSettings,
  } = useSettingsStore();

  // Local Form State
  const [enabled, setEnabled] = useState<boolean>(true);
  const [title, setTitle] = useState<string>('');
  const [message, setMessage] = useState<string>('');
  const [imageType, setImageType] = useState<string>('diwali');
  const [imageUrl, setImageUrl] = useState<string>('');
  const [buttonText, setButtonText] = useState<string>('');
  const [buttonLink, setButtonLink] = useState<string>('Categories');
  const [isSaving, setIsSaving] = useState<boolean>(false);

  // SweetAlert Modal State
  const [sweetAlert, setSweetAlert] = useState<{
    visible: boolean;
    type: SweetAlertType;
    title: string;
    message: string;
    onConfirm?: () => void;
  }>({
    visible: false,
    type: 'success',
    title: '',
    message: '',
  });

  // Sync state from settings store on modal open
  useEffect(() => {
    if (visible) {
      fetchSettings();
      setEnabled(popupEnabled);
      setTitle(popupTitle || '⚡ Urgent Diwali Booking Notice!');
      setMessage(
        popupMessage ||
          'Diwali parcel & transport bookings close 3 days prior to the festival. Sivakasi lorry dispatches are filling up fast! Place your orders right now to ensure on-time festival delivery.'
      );
      setImageType(popupImageType || 'diwali');
      setImageUrl(popupImageUrl || '');
      setButtonText(popupButtonText || 'Book Diwali Crackers Now ➔');
      setButtonLink(popupButtonLink || 'Categories');
    }
  }, [
    visible,
    popupEnabled,
    popupTitle,
    popupMessage,
    popupImageType,
    popupImageUrl,
    popupButtonText,
    popupButtonLink,
    fetchSettings,
  ]);

  // Preset Handlers
  const applyPresetDiwaliClosure = () => {
    setEnabled(true);
    setTitle('⚡ Urgent Diwali Booking Notice!');
    setMessage(
      'Diwali parcel & transport bookings close 3 days prior to the festival. Sivakasi lorry dispatches are filling up fast! Place your orders right now to ensure on-time festival delivery.'
    );
    setImageType('diwali');
    setButtonText('Book Diwali Crackers Now ➔');
    setButtonLink('Categories');
  };

  const applyPresetMegaOffer = () => {
    setEnabled(true);
    setTitle('🎉 Festive Mega Offer: Flat 20% OFF on Gift Boxes!');
    setMessage(
      'Celebrate Diwali with Sivakasi’s best fireworks! Get flat 20% festival discount on Family Assorted Combos, Ground Chakkars, and Sky Shots. Limited stocks at direct factory rates!'
    );
    setImageType('giftbox');
    setButtonText('Explore Festive Offers ➔');
    setButtonLink('Categories');
  };

  const applyPresetExpressDelivery = () => {
    setEnabled(true);
    setTitle('🚚 Sivakasi Direct Transport Dispatches Active');
    setMessage(
      'Express parcel transport is now live across Tamil Nadu, Bangalore, and Kerala! Place your orders before festival vehicle rush. Safe transport hub dispatch guaranteed.'
    );
    setImageType('delivery');
    setButtonText('Order Crackers Online ➔');
    setButtonLink('Categories');
  };

  // Save changes
  const handleSave = async () => {
    if (!title.trim()) {
      setSweetAlert({
        visible: true,
        type: 'warning',
        title: 'Title Required',
        message: 'Please provide a notice title before saving.',
      });
      return;
    }

    if (!message.trim()) {
      setSweetAlert({
        visible: true,
        type: 'warning',
        title: 'Message Required',
        message: 'Please provide announcement message details.',
      });
      return;
    }

    setIsSaving(true);
    try {
      await updateStoreSettings({
        popup_enabled: enabled,
        popup_title: title.trim(),
        popup_message: message.trim(),
        popup_image_type: imageType,
        popup_image_url: imageType === 'custom' ? imageUrl.trim() : '',
        popup_button_text: buttonText.trim() || 'View Crackers',
        popup_button_link: buttonLink.trim() || 'Categories',
      });

      setIsSaving(false);
      setSweetAlert({
        visible: true,
        type: 'success',
        title: enabled ? 'Popup Alert Activated! 🎉' : 'Popup Disabled',
        message: enabled
          ? 'Home Page festive announcement popup is now live for all visitors.'
          : 'Home Page announcement popup has been turned OFF.',
        onConfirm: () => {
          setSweetAlert((prev) => ({ ...prev, visible: false }));
          onClose();
        },
      });
    } catch {
      setIsSaving(false);
      setSweetAlert({
        visible: true,
        type: 'error',
        title: 'Update Failed',
        message: 'Failed to update popup settings. Please verify backend connection.',
      });
    }
  };

  // Preview Image Source
  let previewImageSource = PRESET_IMAGES.diwali;
  if (imageType === 'giftbox') {
    previewImageSource = PRESET_IMAGES.giftbox;
  } else if (imageType === 'delivery') {
    previewImageSource = PRESET_IMAGES.delivery;
  } else if (imageType === 'custom' && imageUrl.trim().length > 0) {
    previewImageSource = { uri: imageUrl.trim() };
  }

  const modalWidth = isDesktop ? 680 : Math.min(windowWidth - 24, 460);

  return (
    <>
      <Modal
        visible={visible}
        transparent
        animationType="fade"
        onRequestClose={onClose}
      >
        <View style={styles.backdrop}>
          <View style={[styles.dialogContainer, { width: modalWidth, maxHeight: windowHeight * 0.9 }]}>
            {/* Modal Header */}
            <View style={styles.dialogHeader}>
              <View style={styles.dialogHeaderLeft}>
                <View style={styles.headerIconBadge}>
                  <MaterialIcons name="campaign" size={24} color="#FFFFFF" />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.dialogHeaderTitle}>Home Festive Popup Alert</Text>
                  <Text style={styles.dialogHeaderSubtitle}>
                    Manage Welcome Announcement, 3-Day Diwali Closure Notice & Special Offers
                  </Text>
                </View>
              </View>
              <TouchableOpacity
                onPress={onClose}
                style={styles.closeIconButton}
                hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
              >
                <MaterialIcons name="close" size={22} color="#64748B" />
              </TouchableOpacity>
            </View>

            {/* Scrollable Content */}
            <ScrollView
              style={styles.dialogBody}
              contentContainerStyle={styles.dialogBodyContent}
              showsVerticalScrollIndicator={false}
            >
              {/* MASTER APPROVAL TOGGLE */}
              <View style={[styles.toggleContainer, enabled ? styles.toggleContainerActive : styles.toggleContainerInactive]}>
                <View style={styles.toggleLeft}>
                  <View style={[styles.toggleIconCircle, { backgroundColor: enabled ? '#DC2626' : '#94A3B8' }]}>
                    <MaterialIcons
                      name={enabled ? 'visibility' : 'visibility-off'}
                      size={20}
                      color="#FFFFFF"
                    />
                  </View>
                  <View style={{ flex: 1, marginRight: 10 }}>
                    <View style={styles.toggleTitleRow}>
                      <Text style={styles.toggleTitleText}>Show Popup to Visitors</Text>
                      <View style={[styles.statusBadge, { backgroundColor: enabled ? '#10B981' : '#E2E8F0' }]}>
                        <Text style={[styles.statusBadgeText, { color: enabled ? '#FFFFFF' : '#64748B' }]}>
                          {enabled ? 'LIVE ON HOME' : 'DISABLED'}
                        </Text>
                      </View>
                    </View>
                    <Text style={styles.toggleSubText}>
                      {enabled
                        ? 'Visitors will automatically see this popup banner upon opening the home page.'
                        : 'Popup is turned OFF. Customers will not see any modal on the home page.'}
                    </Text>
                  </View>
                </View>
                <Switch
                  value={enabled}
                  onValueChange={setEnabled}
                  trackColor={{ false: '#CBD5E1', true: '#FECACA' }}
                  thumbColor={enabled ? BRAND_RED : '#94A3B8'}
                />
              </View>

              {/* ONE-CLICK PRESET TEMPLATES */}
              <View style={styles.sectionBlock}>
                <Text style={styles.sectionTitle}>
                  <MaterialIcons name="auto-fix-high" size={16} color={BRAND_RED} /> Quick Presets (1-Click Fill)
                </Text>
                <View style={styles.presetsRow}>
                  <TouchableOpacity
                    style={[styles.presetCard, imageType === 'diwali' && styles.presetCardActive]}
                    onPress={applyPresetDiwaliClosure}
                    activeOpacity={0.7}
                  >
                    <MaterialIcons name="warning" size={18} color="#D97706" />
                    <Text style={styles.presetTitle}>Diwali 3-Day Closure</Text>
                    <Text style={styles.presetDesc}>Transport booking close warning</Text>
                  </TouchableOpacity>

                  <TouchableOpacity
                    style={[styles.presetCard, imageType === 'giftbox' && styles.presetCardActive]}
                    onPress={applyPresetMegaOffer}
                    activeOpacity={0.7}
                  >
                    <MaterialIcons name="local-offer" size={18} color="#DC2626" />
                    <Text style={styles.presetTitle}>Mega 20% Offer</Text>
                    <Text style={styles.presetDesc}>Festival gift box discount</Text>
                  </TouchableOpacity>

                  <TouchableOpacity
                    style={[styles.presetCard, imageType === 'delivery' && styles.presetCardActive]}
                    onPress={applyPresetExpressDelivery}
                    activeOpacity={0.7}
                  >
                    <MaterialIcons name="local-shipping" size={18} color="#2563EB" />
                    <Text style={styles.presetTitle}>Lorry Transport</Text>
                    <Text style={styles.presetDesc}>Direct hub dispatch guarantee</Text>
                  </TouchableOpacity>
                </View>
              </View>

              {/* BANNER IMAGE CHOOSER */}
              <View style={styles.sectionBlock}>
                <Text style={styles.sectionTitle}>
                  <MaterialIcons name="image" size={16} color={BRAND_RED} /> Select Banner Image
                </Text>
                <View style={styles.imageSelectorRow}>
                  <TouchableOpacity
                    style={[styles.imageSelectOption, imageType === 'diwali' && styles.imageSelectOptionActive]}
                    onPress={() => setImageType('diwali')}
                  >
                    <Image source={PRESET_IMAGES.diwali} style={styles.thumbImage} />
                    <Text style={[styles.thumbLabel, imageType === 'diwali' && styles.thumbLabelActive]}>
                      Diwali Night
                    </Text>
                  </TouchableOpacity>

                  <TouchableOpacity
                    style={[styles.imageSelectOption, imageType === 'giftbox' && styles.imageSelectOptionActive]}
                    onPress={() => setImageType('giftbox')}
                  >
                    <Image source={PRESET_IMAGES.giftbox} style={styles.thumbImage} resizeMode="contain" />
                    <Text style={[styles.thumbLabel, imageType === 'giftbox' && styles.thumbLabelActive]}>
                      Gift Box
                    </Text>
                  </TouchableOpacity>

                  <TouchableOpacity
                    style={[styles.imageSelectOption, imageType === 'delivery' && styles.imageSelectOptionActive]}
                    onPress={() => setImageType('delivery')}
                  >
                    <Image source={PRESET_IMAGES.delivery} style={styles.thumbImage} resizeMode="contain" />
                    <Text style={[styles.thumbLabel, imageType === 'delivery' && styles.thumbLabelActive]}>
                      Lorry Delivery
                    </Text>
                  </TouchableOpacity>

                  <TouchableOpacity
                    style={[styles.imageSelectOption, imageType === 'custom' && styles.imageSelectOptionActive]}
                    onPress={() => setImageType('custom')}
                  >
                    <View style={styles.customThumbPlaceholder}>
                      <MaterialIcons name="link" size={24} color={BRAND_RED} />
                    </View>
                    <Text style={[styles.thumbLabel, imageType === 'custom' && styles.thumbLabelActive]}>
                      Custom URL
                    </Text>
                  </TouchableOpacity>
                </View>

                {imageType === 'custom' && (
                  <View style={styles.customUrlInputBox}>
                    <Text style={styles.fieldLabel}>Custom Image URL (HTTPS)</Text>
                    <TextInput
                      style={styles.textInput}
                      value={imageUrl}
                      onChangeText={setImageUrl}
                      placeholder="https://example.com/banner.jpg"
                      placeholderTextColor="#94A3B8"
                      autoCapitalize="none"
                    />
                  </View>
                )}
              </View>

              {/* TITLE & DESCRIPTION */}
              <View style={styles.sectionBlock}>
                <Text style={styles.sectionTitle}>
                  <MaterialIcons name="edit" size={16} color={BRAND_RED} /> Popup Title & Announcement Message
                </Text>

                <View style={styles.inputGroup}>
                  <Text style={styles.fieldLabel}>Notice Heading / Title *</Text>
                  <TextInput
                    style={styles.textInput}
                    value={title}
                    onChangeText={setTitle}
                    placeholder="e.g. ⚡ Urgent Diwali Booking Notice!"
                    placeholderTextColor="#94A3B8"
                  />
                </View>

                <View style={styles.inputGroup}>
                  <Text style={styles.fieldLabel}>Announcement Message / Details *</Text>
                  <TextInput
                    style={[styles.textInput, styles.textArea]}
                    value={message}
                    onChangeText={setMessage}
                    placeholder="Enter urgent Diwali closure notice, discount offer terms, or delivery deadline info..."
                    placeholderTextColor="#94A3B8"
                    multiline
                    numberOfLines={4}
                  />
                </View>

                <View style={styles.twoColumnRow}>
                  <View style={[styles.inputGroup, { flex: 1 }]}>
                    <Text style={styles.fieldLabel}>Button Text</Text>
                    <TextInput
                      style={styles.textInput}
                      value={buttonText}
                      onChangeText={setButtonText}
                      placeholder="e.g. Order Now ➔"
                      placeholderTextColor="#94A3B8"
                    />
                  </View>
                  <View style={[styles.inputGroup, { flex: 1 }]}>
                    <Text style={styles.fieldLabel}>Button Destination</Text>
                    <TextInput
                      style={styles.textInput}
                      value={buttonLink}
                      onChangeText={setButtonLink}
                      placeholder="Categories or Cart"
                      placeholderTextColor="#94A3B8"
                    />
                  </View>
                </View>
              </View>

              {/* LIVE CUSTOMER PREVIEW CARD */}
              <View style={styles.sectionBlock}>
                <View style={styles.previewHeaderRow}>
                  <Text style={styles.sectionTitle}>
                    <MaterialIcons name="remove-red-eye" size={16} color={BRAND_RED} /> Live Customer Preview
                  </Text>
                  <Text style={styles.previewHint}>How users will see this on Home Page</Text>
                </View>

                <View style={styles.miniPreviewCard}>
                  {/* Banner Image with overlay */}
                  <View style={styles.miniImageContainer}>
                    <Image source={previewImageSource} style={styles.miniImage} resizeMode="cover" />
                    <View style={styles.miniBadge}>
                      <MaterialIcons name="campaign" size={10} color="#FFFFFF" />
                      <Text style={styles.miniBadgeText}>FESTIVE STORE NOTICE</Text>
                    </View>
                  </View>

                  {/* Body Content */}
                  <View style={styles.miniBody}>
                    <Text style={styles.miniTitle} numberOfLines={2}>
                      {title || 'Festive Announcement Title'}
                    </Text>
                    <Text style={styles.miniMessage} numberOfLines={3}>
                      {message || 'Your festive announcement or Diwali booking notice message will display here.'}
                    </Text>
                    <View style={styles.miniTransportPill}>
                      <MaterialIcons name="local-shipping" size={12} color="#DC2626" />
                      <Text style={styles.miniTransportText}>Sivakasi Factory Direct Lorry Transport Active</Text>
                    </View>
                    <View style={styles.miniButton}>
                      <Text style={styles.miniButtonText}>{buttonText || 'Book Now ➔'}</Text>
                    </View>
                  </View>
                </View>
              </View>
            </ScrollView>

            {/* Modal Footer Actions */}
            <View style={styles.dialogFooter}>
              <TouchableOpacity
                style={styles.cancelBtn}
                onPress={onClose}
                disabled={isSaving}
              >
                <Text style={styles.cancelBtnText}>Cancel</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.saveBtn, isSaving && { opacity: 0.7 }]}
                onPress={handleSave}
                disabled={isSaving}
              >
                {isSaving ? (
                  <ActivityIndicator size="small" color="#FFFFFF" />
                ) : (
                  <>
                    <MaterialIcons name="check-circle" size={18} color="#FFFFFF" />
                    <Text style={styles.saveBtnText}>Save & Apply Settings</Text>
                  </>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Professional SweetAlert Feedback */}
      <SweetAlertModal
        visible={sweetAlert.visible}
        type={sweetAlert.type}
        title={sweetAlert.title}
        message={sweetAlert.message}
        confirmText="OK"
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
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(15, 23, 42, 0.75)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 16,
  },
  dialogContainer: {
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 12 },
    shadowOpacity: 0.25,
    shadowRadius: 24,
    elevation: 20,
    display: 'flex',
    flexDirection: 'column',
  },
  dialogHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
    backgroundColor: '#FAFAFA',
  },
  dialogHeaderLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    flex: 1,
  },
  headerIconBadge: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: BRAND_RED,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: BRAND_RED,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 6,
    elevation: 4,
  },
  dialogHeaderTitle: {
    fontSize: 18,
    fontFamily: 'Inter-Bold',
    color: '#0F172A',
  },
  dialogHeaderSubtitle: {
    fontSize: 12,
    fontFamily: 'Inter-Regular',
    color: '#64748B',
    marginTop: 2,
  },
  closeIconButton: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#F1F5F9',
    justifyContent: 'center',
    alignItems: 'center',
    marginLeft: 8,
  },
  dialogBody: {
    flex: 1,
  },
  dialogBodyContent: {
    padding: 20,
    gap: 18,
  },
  toggleContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 14,
    borderRadius: 14,
    borderWidth: 1.5,
  },
  toggleContainerActive: {
    backgroundColor: '#FEF2F2',
    borderColor: '#FECACA',
  },
  toggleContainerInactive: {
    backgroundColor: '#F8FAFC',
    borderColor: '#E2E8F0',
  },
  toggleLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    flex: 1,
  },
  toggleIconCircle: {
    width: 36,
    height: 36,
    borderRadius: 18,
    justifyContent: 'center',
    alignItems: 'center',
  },
  toggleTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  toggleTitleText: {
    fontSize: 14,
    fontFamily: 'Inter-Bold',
    color: '#0F172A',
  },
  statusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 8,
  },
  statusBadgeText: {
    fontSize: 10,
    fontFamily: 'Inter-Bold',
    letterSpacing: 0.5,
  },
  toggleSubText: {
    fontSize: 12,
    fontFamily: 'Inter-Regular',
    color: '#64748B',
    marginTop: 2,
    lineHeight: 16,
  },
  sectionBlock: {
    gap: 10,
  },
  sectionTitle: {
    fontSize: 13,
    fontFamily: 'Inter-Bold',
    color: '#334155',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  presetsRow: {
    flexDirection: 'row',
    gap: 8,
    flexWrap: 'wrap',
  },
  presetCard: {
    flex: 1,
    minWidth: 140,
    backgroundColor: '#F8FAFC',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    borderRadius: 12,
    padding: 10,
    alignItems: 'flex-start',
    gap: 4,
  },
  presetCardActive: {
    borderColor: BRAND_RED,
    backgroundColor: '#FFF5F5',
  },
  presetTitle: {
    fontSize: 12,
    fontFamily: 'Inter-Bold',
    color: '#0F172A',
  },
  presetDesc: {
    fontSize: 10,
    fontFamily: 'Inter-Regular',
    color: '#64748B',
  },
  imageSelectorRow: {
    flexDirection: 'row',
    gap: 10,
    flexWrap: 'wrap',
  },
  imageSelectOption: {
    flex: 1,
    minWidth: 90,
    borderWidth: 2,
    borderColor: '#E2E8F0',
    borderRadius: 12,
    padding: 6,
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    gap: 6,
  },
  imageSelectOptionActive: {
    borderColor: BRAND_RED,
    backgroundColor: '#FEF2F2',
  },
  thumbImage: {
    width: '100%',
    height: 52,
    borderRadius: 8,
    backgroundColor: '#0F172A',
  },
  customThumbPlaceholder: {
    width: '100%',
    height: 52,
    borderRadius: 8,
    backgroundColor: '#F1F5F9',
    justifyContent: 'center',
    alignItems: 'center',
  },
  thumbLabel: {
    fontSize: 11,
    fontFamily: 'Inter-Medium',
    color: '#475569',
  },
  thumbLabelActive: {
    color: BRAND_RED,
    fontFamily: 'Inter-Bold',
  },
  customUrlInputBox: {
    marginTop: 6,
    gap: 4,
  },
  fieldLabel: {
    fontSize: 12,
    fontFamily: 'Inter-SemiBold',
    color: '#334155',
  },
  inputGroup: {
    gap: 6,
  },
  textInput: {
    backgroundColor: '#F8FAFC',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 13,
    fontFamily: 'Inter-Regular',
    color: '#0F172A',
  },
  textArea: {
    height: 74,
    textAlignVertical: 'top',
  },
  twoColumnRow: {
    flexDirection: 'row',
    gap: 12,
  },
  previewHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  previewHint: {
    fontSize: 11,
    fontFamily: 'Inter-Regular',
    color: '#94A3B8',
  },
  miniPreviewCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#FECACA',
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 10,
    elevation: 3,
  },
  miniImageContainer: {
    height: 120,
    position: 'relative',
    backgroundColor: '#1E293B',
  },
  miniImage: {
    width: '100%',
    height: '100%',
  },
  miniBadge: {
    position: 'absolute',
    top: 8,
    left: 8,
    backgroundColor: 'rgba(153, 0, 0, 0.9)',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  miniBadgeText: {
    color: '#FFFFFF',
    fontSize: 9,
    fontFamily: 'Inter-Bold',
    letterSpacing: 0.5,
  },
  miniBody: {
    padding: 14,
    gap: 8,
  },
  miniTitle: {
    fontSize: 15,
    fontFamily: 'Inter-Bold',
    color: '#0F172A',
    lineHeight: 20,
  },
  miniMessage: {
    fontSize: 12,
    fontFamily: 'Inter-Regular',
    color: '#475569',
    lineHeight: 17,
  },
  miniTransportPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#FEF2F2',
    borderWidth: 1,
    borderColor: '#FECACA',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
  },
  miniTransportText: {
    fontSize: 11,
    fontFamily: 'Inter-SemiBold',
    color: '#990000',
  },
  miniButton: {
    backgroundColor: BRAND_RED,
    paddingVertical: 10,
    borderRadius: 8,
    alignItems: 'center',
    marginTop: 4,
  },
  miniButtonText: {
    color: '#FFFFFF',
    fontSize: 13,
    fontFamily: 'Inter-Bold',
  },
  dialogFooter: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 14,
    borderTopWidth: 1,
    borderTopColor: '#F1F5F9',
    backgroundColor: '#FAFAFA',
    gap: 10,
  },
  cancelBtn: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 10,
    backgroundColor: '#F1F5F9',
  },
  cancelBtnText: {
    fontSize: 13,
    fontFamily: 'Inter-SemiBold',
    color: '#475569',
  },
  saveBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: BRAND_RED,
    paddingHorizontal: 18,
    paddingVertical: 10,
    borderRadius: 10,
    shadowColor: BRAND_RED,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
    elevation: 3,
  },
  saveBtnText: {
    fontSize: 13,
    fontFamily: 'Inter-Bold',
    color: '#FFFFFF',
  },
});

