import React from 'react';
import {
  Modal,
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  TouchableWithoutFeedback,
  Dimensions,
  Platform,
} from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { Colors } from '@/constants/colors';
import { Typography } from '@/constants/typography';

export type SweetAlertType = 'error' | 'success' | 'warning' | 'info';

export interface SweetAlertProps {
  visible: boolean;
  type?: SweetAlertType;
  title: string;
  message: string;
  confirmText?: string;
  cancelText?: string;
  onConfirm: () => void;
  onCancel?: () => void;
}

export const SweetAlertModal: React.FC<SweetAlertProps> = ({
  visible,
  type = 'error',
  title,
  message,
  confirmText = 'OK, Got It',
  cancelText,
  onConfirm,
  onCancel,
}) => {
  if (!visible) return null;

  const getIconConfig = () => {
    switch (type) {
      case 'error':
        return {
          name: 'close' as const,
          color: '#DC2626',
          ringColor: '#FECACA',
          bgColor: '#FEF2F2',
        };
      case 'success':
        return {
          name: 'check' as const,
          color: '#16A34A',
          ringColor: '#BBF7D0',
          bgColor: '#F0FDF4',
        };
      case 'warning':
        return {
          name: 'priority-high' as const,
          color: '#D97706',
          ringColor: '#FDE68A',
          bgColor: '#FFFBEB',
        };
      case 'info':
      default:
        return {
          name: 'info-outline' as const,
          color: '#2563EB',
          ringColor: '#BFDBFE',
          bgColor: '#EFF6FF',
        };
    }
  };

  const iconConfig = getIconConfig();

  return (
    <Modal visible={visible} animationType="fade" transparent onRequestClose={onConfirm}>
      <TouchableOpacity style={styles.overlay} activeOpacity={1} onPress={onConfirm}>
        <TouchableWithoutFeedback>
          <View style={styles.alertCard}>
            {/* Animated-style SweetAlert Circular Icon */}
            <View
              style={[
                styles.iconRingOuter,
                { borderColor: iconConfig.ringColor, backgroundColor: iconConfig.bgColor },
              ]}
            >
              <View style={[styles.iconRingInner, { backgroundColor: iconConfig.color }]}>
                <MaterialIcons name={iconConfig.name} size={32} color="#FFFFFF" />
              </View>
            </View>

            {/* Title */}
            <Text style={styles.alertTitle}>{title}</Text>

            {/* Message Body in Easy English */}
            <Text style={styles.alertMessage}>{message}</Text>

            {/* Actions */}
            <View style={styles.actionRow}>
              {cancelText && onCancel && (
                <TouchableOpacity
                  style={styles.cancelBtn}
                  onPress={onCancel}
                  activeOpacity={0.8}
                >
                  <Text style={styles.cancelBtnText}>{cancelText}</Text>
                </TouchableOpacity>
              )}

              <TouchableOpacity
                style={[
                  styles.confirmBtn,
                  type === 'error' && styles.errorConfirmBtn,
                  type === 'success' && styles.successConfirmBtn,
                ]}
                onPress={onConfirm}
                activeOpacity={0.85}
              >
                <Text style={styles.confirmBtnText}>{confirmText}</Text>
              </TouchableOpacity>
            </View>
          </View>
        </TouchableWithoutFeedback>
      </TouchableOpacity>
    </Modal>
  );
};

const { width } = Dimensions.get('window');

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(15, 23, 42, 0.65)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
    zIndex: 99999,
  },
  alertCard: {
    width: '100%',
    maxWidth: 420,
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    paddingTop: 32,
    paddingBottom: 24,
    paddingHorizontal: 28,
    alignItems: 'center',
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.25,
    shadowRadius: 25,
    elevation: 10,
    borderWidth: 1,
    borderColor: 'rgba(226, 232, 240, 0.8)',
  },
  iconRingOuter: {
    width: 76,
    height: 76,
    borderRadius: 38,
    borderWidth: 4,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 20,
  },
  iconRingInner: {
    width: 52,
    height: 52,
    borderRadius: 26,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.15,
    shadowRadius: 6,
    elevation: 4,
  },
  alertTitle: {
    ...Typography.headlineLg,
    fontSize: 20,
    fontFamily: 'Inter-Bold',
    color: '#0F172A',
    textAlign: 'center',
    marginBottom: 10,
    lineHeight: 26,
  },
  alertMessage: {
    ...Typography.bodyMd,
    fontSize: 14,
    fontFamily: 'Inter-Regular',
    color: '#475569',
    textAlign: 'center',
    lineHeight: 21,
    marginBottom: 26,
    paddingHorizontal: 8,
  },
  actionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 12,
    width: '100%',
  },
  cancelBtn: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 10,
    borderWidth: 1.5,
    borderColor: '#CBD5E1',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#F8FAFC',
  },
  cancelBtnText: {
    ...Typography.labelLg,
    color: '#475569',
    fontFamily: 'Inter-SemiBold',
    fontSize: 14,
  },
  confirmBtn: {
    flex: 1,
    paddingVertical: 13,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#990000', // Meera Crackers brand red
    shadowColor: '#990000',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.25,
    shadowRadius: 6,
    elevation: 3,
  },
  errorConfirmBtn: {
    backgroundColor: '#990000',
  },
  successConfirmBtn: {
    backgroundColor: '#16A34A',
    shadowColor: '#16A34A',
  },
  confirmBtnText: {
    ...Typography.labelLg,
    color: '#FFFFFF',
    fontFamily: 'Inter-Bold',
    fontSize: 14.5,
  },
});

export default SweetAlertModal;

