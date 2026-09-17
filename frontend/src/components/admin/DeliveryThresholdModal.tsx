import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  TouchableOpacity,
  TextInput,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { Colors } from '@/constants/colors';
import { Typography } from '@/constants/typography';
import { Spacing, BorderRadius } from '@/constants/spacing';
import { useSettingsStore } from '@/store';
import { formatCurrency } from '@/utils/currency';

interface DeliveryThresholdModalProps {
  visible: boolean;
  onClose: () => void;
}

export const DeliveryThresholdModal: React.FC<DeliveryThresholdModalProps> = ({
  visible,
  onClose,
}) => {
  const { minOnlineDeliveryAmount, updateMinOnlineDeliveryAmount, fetchSettings, isLoading } =
    useSettingsStore();

  const [thresholdInput, setThresholdInput] = useState<string>(
    String(minOnlineDeliveryAmount || 5000)
  );
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    if (visible) {
      fetchSettings();
    }
  }, [visible, fetchSettings]);

  useEffect(() => {
    setThresholdInput(String(minOnlineDeliveryAmount || 5000));
  }, [minOnlineDeliveryAmount]);

  const handleSave = async () => {
    const parsedAmount = parseFloat(thresholdInput);
    if (isNaN(parsedAmount) || parsedAmount < 0) {
      Alert.alert('Invalid Amount', 'Please enter a valid non-negative number for the minimum order threshold.');
      return;
    }

    setIsSaving(true);
    try {
      await updateMinOnlineDeliveryAmount(parsedAmount);
      setIsSaving(false);
      Alert.alert(
        'Settings Saved',
        `Online delivery minimum order threshold has been updated to ${formatCurrency(parsedAmount)}!`
      );
      onClose();
    } catch (err: any) {
      setIsSaving(false);
      Alert.alert('Update Failed', err?.message || 'Failed to update store settings.');
    }
  };

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onClose}
    >
      <View style={styles.overlay}>
        <View style={styles.modalCard}>
          {/* Header */}
          <View style={styles.header}>
            <View style={styles.titleRow}>
              <View style={styles.iconCircle}>
                <MaterialIcons name="local-shipping" size={24} color={Colors.primary} />
              </View>
              <View>
                <Text style={styles.title}>Delivery Threshold Settings</Text>
                <Text style={styles.subtitle}>Configure minimum order for Online Delivery</Text>
              </View>
            </View>

            <TouchableOpacity onPress={onClose} style={styles.closeBtn}>
              <MaterialIcons name="close" size={20} color={Colors.onSurfaceVariant} />
            </TouchableOpacity>
          </View>

          {/* Current Setting Info Card */}
          <View style={styles.infoCard}>
            <Text style={styles.infoTitle}>Current Rule:</Text>
            <Text style={styles.infoText}>
              Online Delivery is unlocked for orders of{' '}
              <Text style={styles.highlightText}>
                {formatCurrency(minOnlineDeliveryAmount)}
              </Text>{' '}
              and above.
            </Text>
          </View>

          {/* Input Field */}
          <View style={styles.fieldContainer}>
            <Text style={styles.label}>Minimum Order Amount (₹)</Text>
            <View style={styles.inputWrapper}>
              <Text style={styles.currencySymbol}>₹</Text>
              <TextInput
                style={styles.textInput}
                keyboardType="numeric"
                value={thresholdInput}
                onChangeText={setThresholdInput}
                placeholder="5000"
                placeholderTextColor={Colors.tertiary}
              />
            </View>
            <Text style={styles.fieldHelpText}>
              Cart subtotals below this amount will default to Store Pickup and show the unlock banner.
            </Text>
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
                  <Text style={styles.saveText}>Save Settings</Text>
                </>
              )}
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.55)',
    alignItems: 'center',
    justifyContent: 'center',
    padding: Spacing.md,
  },
  modalCard: {
    width: '100%',
    maxWidth: 480,
    backgroundColor: Colors.surface,
    borderRadius: BorderRadius.xl,
    padding: Spacing.lg,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.25,
    shadowRadius: 16,
    elevation: 8,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    marginBottom: Spacing.md,
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  iconCircle: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#FFEBEE',
    alignItems: 'center',
    justifyContent: 'center',
  },
  title: {
    ...Typography.titleLg,
    fontSize: 16,
    fontFamily: 'Inter-Bold',
    color: Colors.onSurface,
  },
  subtitle: {
    ...Typography.bodyMd,
    fontSize: 12,
    color: Colors.onSurfaceVariant,
    marginTop: 2,
  },
  closeBtn: {
    padding: 4,
  },
  infoCard: {
    backgroundColor: '#FFF8E1',
    borderRadius: BorderRadius.lg,
    borderWidth: 1,
    borderColor: '#FFE082',
    padding: 12,
    marginBottom: Spacing.md,
  },
  infoTitle: {
    ...Typography.labelLg,
    fontSize: 11,
    fontFamily: 'Inter-Bold',
    color: '#795548',
    marginBottom: 2,
  },
  infoText: {
    ...Typography.bodyMd,
    fontSize: 13,
    color: '#5D4037',
    lineHeight: 18,
  },
  highlightText: {
    fontFamily: 'Inter-Bold',
    color: Colors.primary,
  },
  fieldContainer: {
    marginBottom: Spacing.lg,
  },
  label: {
    ...Typography.labelLg,
    fontSize: 13,
    fontFamily: 'Inter-Bold',
    color: Colors.onSurface,
    marginBottom: 6,
  },
  inputWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.surfaceContainerLow,
    borderRadius: BorderRadius.lg,
    borderWidth: 1.5,
    borderColor: Colors.surfaceContainerHigh,
    paddingHorizontal: 12,
    height: 46,
  },
  currencySymbol: {
    ...Typography.titleLg,
    fontSize: 16,
    fontFamily: 'Inter-Bold',
    color: Colors.primary,
    marginRight: 6,
  },
  textInput: {
    flex: 1,
    ...Typography.bodyMd,
    fontSize: 16,
    fontFamily: 'Inter-Bold',
    color: Colors.onSurface,
  },
  fieldHelpText: {
    ...Typography.bodyMd,
    fontSize: 11,
    color: Colors.onSurfaceVariant,
    marginTop: 6,
    lineHeight: 15,
  },
  actionsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-end',
    gap: 10,
  },
  cancelBtn: {
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: BorderRadius.lg,
  },
  cancelText: {
    ...Typography.labelLg,
    fontSize: 13,
    fontFamily: 'Inter-Bold',
    color: Colors.onSurfaceVariant,
  },
  saveBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.primary,
    paddingVertical: 10,
    paddingHorizontal: 20,
    borderRadius: BorderRadius.lg,
    gap: 6,
  },
  saveText: {
    ...Typography.labelLg,
    fontSize: 13,
    fontFamily: 'Inter-Bold',
    color: '#FFFFFF',
  },
});
