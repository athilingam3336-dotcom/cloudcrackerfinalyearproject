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
  TouchableWithoutFeedback,
  Alert,
} from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { adminService } from '@/services/adminService';
import { SweetAlertModal, SweetAlertType } from '@/components/common/SweetAlertModal';

interface DualAdminResetModalProps {
  visible: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

export const DualAdminResetModal: React.FC<DualAdminResetModalProps> = ({
  visible,
  onClose,
  onSuccess,
}) => {
  const [step, setStep] = useState<'initial' | 'otp_entry' | 'success'>('initial');
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Status & Session Data
  const [adminCount, setAdminCount] = useState<number>(0);
  const [registeredAdmins, setRegisteredAdmins] = useState<string[]>([]);
  const [sessionId, setSessionId] = useState<string>('');
  const [admin1Masked, setAdmin1Masked] = useState<string>('');
  const [admin2Masked, setAdmin2Masked] = useState<string>('');
  const [expiresInSecs, setExpiresInSecs] = useState<number>(600);

  // OTP inputs
  const [otp1, setOtp1] = useState<string>('');
  const [otp2, setOtp2] = useState<string>('');

  // SweetAlert State
  const [sweetAlert, setSweetAlert] = useState<{
    visible: boolean;
    type: SweetAlertType;
    title: string;
    message: string;
    confirmText?: string;
  } | null>(null);

  // Reset state when modal opens
  useEffect(() => {
    if (visible) {
      setStep('initial');
      setOtp1('');
      setOtp2('');
      setErrorMessage(null);
      fetchStatus();
    }
  }, [visible]);

  // Countdown timer when on otp_entry step
  useEffect(() => {
    let timer: any;
    if (step === 'otp_entry' && expiresInSecs > 0) {
      timer = setInterval(() => {
        setExpiresInSecs((prev) => {
          if (prev <= 1) {
            clearInterval(timer);
            setErrorMessage('Authorization OTPs have expired. Please request new codes.');
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    }
    return () => clearInterval(timer);
  }, [step, expiresInSecs]);

  const fetchStatus = async () => {
    try {
      setIsLoading(true);
      const res = await adminService.getResetSecurityStatus();
      setAdminCount(res.admin_count || 0);
      const rawList = (res as any).registered_admins || res.registered_admins_masked || [];
      setRegisteredAdmins(rawList);
      setIsLoading(false);
    } catch (err: any) {
      setIsLoading(false);
      setErrorMessage(err.message || 'Failed to check admin security status.');
    }
  };

  const displayAdminEmail = (raw: string): string => {
    if (!raw) return '';
    return raw;
  };

  const showSweetAlertError = (rawError: string) => {
    let title = 'Authorization Error';
    let message = rawError || 'Something went wrong. Please try again.';

    const lower = (rawError || '').toLowerCase();
    if (lower.includes('admin 2') || lower.includes('administrator 2')) {
      title = 'Admin 2 OTP Incorrect';
      message = 'The OTP code entered for Administrator 2 is incorrect. Remember that each administrator receives a different 6-digit code. Please check Admin 2 email and try again.';
    } else if (lower.includes('admin 1') || lower.includes('administrator 1')) {
      title = 'Admin 1 OTP Incorrect';
      message = 'The OTP code entered for Administrator 1 is incorrect. Please check Admin 1 email and enter the valid 6-digit code.';
    } else if (lower.includes('both admin')) {
      title = 'Both OTP Codes Invalid';
      message = 'Both Administrator OTP codes are incorrect. Please enter the valid 6-digit codes sent to each email address.';
    } else if (lower.includes('expired')) {
      title = 'Security Window Expired';
      message = 'The 10-minute security window has expired. Please click "Resend OTPs" to receive fresh verification codes.';
    }

    setSweetAlert({
      visible: true,
      type: 'error',
      title,
      message,
      confirmText: 'Try Again',
    });
  };

  const handleRequestOtp = async () => {
    try {
      setIsLoading(true);
      setErrorMessage(null);
      const res = await adminService.requestStoreResetOtp();
      setSessionId(res.session_id);
      setAdmin1Masked(res.admin1_email || res.admin1_masked || '');
      setAdmin2Masked(res.admin2_email || res.admin2_masked || '');
      setExpiresInSecs(res.expires_in_seconds || 600);
      setStep('otp_entry');
      setIsLoading(false);
    } catch (err: any) {
      setIsLoading(false);
      const msg = err.message || 'Failed to send dual OTP codes to administrators.';
      setErrorMessage(msg);
      showSweetAlertError(msg);
    }
  };

  const handleVerifyAndPurge = async () => {
    if (!otp1.trim() || !otp2.trim()) {
      setSweetAlert({
        visible: true,
        type: 'warning',
        title: 'Missing Codes',
        message: 'Please enter both Administrator 1 and Administrator 2 OTP codes to proceed.',
        confirmText: 'Got It',
      });
      return;
    }

    try {
      setIsLoading(true);
      setErrorMessage(null);
      const res = await adminService.verifyAndResetStore({
        session_id: sessionId,
        otp1: otp1.trim(),
        otp2: otp2.trim(),
        confirm_text: 'RESET',
      });

      setIsLoading(false);
      setStep('success');
      setSweetAlert({
        visible: true,
        type: 'success',
        title: 'Store Data Reset Successfully!',
        message: 'All order transactions, customer payments, and financial analytics have been permanently reset to ₹0.00.',
        confirmText: 'Great!',
      });

      setTimeout(() => {
        setSweetAlert(null);
        onSuccess();
        onClose();
      }, 2500);
    } catch (err: any) {
      setIsLoading(false);
      const msg = err.message || 'Verification failed. Both OTP codes must be 100% correct.';
      setErrorMessage(msg);
      showSweetAlertError(msg);
    }
  };

  const formatTimer = (secs: number) => {
    const mins = Math.floor(secs / 60);
    const remaining = secs % 60;
    return `${mins.toString().padStart(2, '0')}:${remaining.toString().padStart(2, '0')}`;
  };

  return (
    <>
      <Modal visible={visible} animationType="fade" transparent onRequestClose={onClose}>
      <TouchableOpacity style={styles.overlay} activeOpacity={1} onPress={onClose}>
        <TouchableWithoutFeedback>
          <View style={styles.card}>
            {/* Header */}
            <View style={styles.header}>
              <View style={styles.iconCircle}>
                <MaterialIcons name="security" size={24} color="#DC2626" />
              </View>
              <View style={styles.headerTextGroup}>
                <Text style={styles.title}>Dual-Admin Authorization</Text>
                <Text style={styles.subtitle}>High Security Store Data & Analytics Purge</Text>
              </View>
              <TouchableOpacity
                onPress={onClose}
                style={styles.closeBtn}
                hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
              >
                <MaterialIcons name="close" size={20} color="#64748B" />
              </TouchableOpacity>
            </View>

            <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scrollContent}>
              {/* Danger Warning Alert */}
              <View style={styles.alertBanner}>
                <MaterialIcons name="warning-amber" size={22} color="#DC2626" style={{ marginTop: 2 }} />
                <View style={{ flex: 1 }}>
                  <Text style={styles.alertBannerTitle}>PERMANENT DATA PURGE</Text>
                  <Text style={styles.alertBannerText}>
                    This action will permanently delete all orders, customer payments, and transaction history.
                    All real-time financial metrics will reset to ₹0.00. Products and registered users will NOT be
                    affected.
                  </Text>
                </View>
              </View>

              {/* Error Box */}
              {errorMessage && (
                <View style={styles.errorBox}>
                  <MaterialIcons name="error-outline" size={18} color="#B91C1C" />
                  <Text style={styles.errorText}>{errorMessage}</Text>
                </View>
              )}

              {/* STEP 1: INITIAL REQUEST */}
              {step === 'initial' && (
                <View style={styles.stepContainer}>
                  <View style={styles.infoCard}>
                    <Text style={styles.infoCardTitle}>🛡️ Dual-Custody Approval Required</Text>
                    <Text style={styles.infoCardBody}>
                      To prevent accidental or unauthorized data loss, store deletion requires simultaneous OTP
                      verification from at least <Text style={{ fontFamily: 'Inter-Bold' }}>two registered administrators</Text>.
                    </Text>

                    {adminCount >= 2 ? (
                      <View style={styles.adminListContainer}>
                        <Text style={styles.adminListLabel}>Registered Administrators ({adminCount}):</Text>
                        <View style={styles.adminChipsRow}>
                          {registeredAdmins.map((masked, idx) => (
                            <View key={idx} style={styles.adminChip}>
                              <MaterialIcons name="admin-panel-settings" size={14} color="#1E293B" />
                              <Text style={styles.adminChipText}>{masked}</Text>
                            </View>
                          ))}
                        </View>
                      </View>
                    ) : (
                      <Text style={[styles.infoCardBody, { color: '#DC2626', marginTop: 8 }]}>
                        ⚠️ Dual-approval requires at least 2 active admin accounts.
                      </Text>
                    )}
                  </View>

                  <TouchableOpacity
                    style={[styles.primaryActionBtn, (isLoading || adminCount < 2) && styles.disabledBtn]}
                    onPress={handleRequestOtp}
                    disabled={isLoading || adminCount < 2}
                    activeOpacity={0.85}
                  >
                    {isLoading ? (
                      <ActivityIndicator color="#FFFFFF" size="small" />
                    ) : (
                      <>
                        <MaterialIcons name="send" size={18} color="#FFFFFF" />
                        <Text style={styles.primaryActionBtnText}>Send OTPs to Both Admins</Text>
                      </>
                    )}
                  </TouchableOpacity>
                </View>
              )}

              {/* STEP 2: DUAL OTP ENTRY */}
              {step === 'otp_entry' && (
                <View style={styles.stepContainer}>
                  {/* Timer & Status */}
                  <View style={styles.timerRow}>
                    <View style={styles.timerBadge}>
                      <MaterialIcons name="timer" size={16} color="#DC2626" />
                      <Text style={styles.timerText}>Valid for: {formatTimer(expiresInSecs)}</Text>
                    </View>
                    <TouchableOpacity onPress={handleRequestOtp} disabled={isLoading}>
                      <Text style={styles.resendLink}>Resend OTPs</Text>
                    </TouchableOpacity>
                  </View>

                  {/* Admin 1 Input */}
                  <View style={styles.inputGroup}>
                    <View style={styles.inputHeaderRow}>
                      <View style={styles.badgeIndex}>
                        <Text style={styles.badgeIndexText}>1</Text>
                      </View>
                      <Text style={styles.inputLabel}>
                        Admin 1 OTP: <Text style={styles.inputEmailHighlight}>{admin1Masked}</Text>
                      </Text>
                    </View>
                    <TextInput
                      style={styles.otpInput}
                      placeholder="Enter 6-digit OTP"
                      placeholderTextColor="#94A3B8"
                      keyboardType="number-pad"
                      maxLength={6}
                      value={otp1}
                      onChangeText={setOtp1}
                    />
                  </View>

                  {/* Admin 2 Input */}
                  <View style={styles.inputGroup}>
                    <View style={styles.inputHeaderRow}>
                      <View style={[styles.badgeIndex, { backgroundColor: '#2563EB' }]}>
                        <Text style={styles.badgeIndexText}>2</Text>
                      </View>
                      <Text style={styles.inputLabel}>
                        Admin 2 OTP: <Text style={styles.inputEmailHighlight}>{admin2Masked}</Text>
                      </Text>
                    </View>
                    <TextInput
                      style={styles.otpInput}
                      placeholder="Enter 6-digit OTP"
                      placeholderTextColor="#94A3B8"
                      keyboardType="number-pad"
                      maxLength={6}
                      value={otp2}
                      onChangeText={setOtp2}
                    />
                  </View>

                  <Text style={styles.strictWarning}>
                    🔒 Both Admin 1 and Admin 2 OTPs must be 100% correct. If either one is wrong, deletion will be rejected.
                  </Text>

                  {/* Verify & Purge Action Button */}
                  <TouchableOpacity
                    style={[styles.deleteBtn, (isLoading || !otp1 || !otp2) && styles.disabledBtn]}
                    onPress={handleVerifyAndPurge}
                    disabled={isLoading || !otp1 || !otp2}
                    activeOpacity={0.85}
                  >
                    {isLoading ? (
                      <ActivityIndicator color="#FFFFFF" size="small" />
                    ) : (
                      <>
                        <MaterialIcons name="delete-forever" size={20} color="#FFFFFF" />
                        <Text style={styles.deleteBtnText}>Verify Dual OTPs & Reset Store Data</Text>
                      </>
                    )}
                  </TouchableOpacity>
                </View>
              )}

              {/* STEP 3: SUCCESS */}
              {step === 'success' && (
                <View style={styles.successContainer}>
                  <View style={styles.successIconCircle}>
                    <MaterialIcons name="check" size={36} color="#16A34A" />
                  </View>
                  <Text style={styles.successTitle}>Store Data Purged Successfully!</Text>
                  <Text style={styles.successText}>
                    All test orders, payments, and financial analytics have been reset to ₹0.00. Updating
                    dashboard...
                  </Text>
                  <ActivityIndicator color="#16A34A" style={{ marginTop: 16 }} />
                </View>
              )}
            </ScrollView>
          </View>
        </TouchableWithoutFeedback>
      </TouchableOpacity>
    </Modal>

    {sweetAlert && (
      <SweetAlertModal
        visible={sweetAlert.visible}
        type={sweetAlert.type}
        title={sweetAlert.title}
        message={sweetAlert.message}
        confirmText={sweetAlert.confirmText || 'OK'}
        onConfirm={() => setSweetAlert(null)}
      />
    )}
  </>
  );
};

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(15, 23, 42, 0.75)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 16,
  },
  card: {
    width: '100%',
    maxWidth: 500,
    backgroundColor: '#FFFFFF',
    borderRadius: 18,
    padding: 22,
    elevation: 16,
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.25,
    shadowRadius: 24,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
    paddingBottom: 14,
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
  },
  iconCircle: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#FEE2E2',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  headerTextGroup: {
    flex: 1,
  },
  title: {
    fontFamily: 'Inter-Bold',
    fontSize: 18,
    color: '#0F172A',
  },
  subtitle: {
    fontFamily: 'Inter-Regular',
    fontSize: 12,
    color: '#64748B',
    marginTop: 2,
  },
  closeBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#F8FAFC',
    justifyContent: 'center',
    alignItems: 'center',
    marginLeft: 8,
  },
  scrollContent: {
    paddingVertical: 2,
  },
  alertBanner: {
    flexDirection: 'row',
    backgroundColor: '#FEF2F2',
    borderWidth: 1,
    borderColor: '#FCA5A5',
    borderLeftWidth: 4,
    borderLeftColor: '#DC2626',
    borderRadius: 8,
    padding: 12,
    marginBottom: 16,
    gap: 10,
  },
  alertBannerTitle: {
    fontFamily: 'Inter-Bold',
    fontSize: 12,
    color: '#991B1B',
    letterSpacing: 0.5,
  },
  alertBannerText: {
    fontFamily: 'Inter-Regular',
    fontSize: 12,
    color: '#7F1D1D',
    lineHeight: 17,
    marginTop: 3,
  },
  errorBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFF1F2',
    borderWidth: 1,
    borderColor: '#FECDD3',
    padding: 10,
    borderRadius: 8,
    marginBottom: 14,
    gap: 8,
  },
  errorText: {
    fontFamily: 'Inter-Medium',
    fontSize: 12,
    color: '#BE123C',
    flex: 1,
  },
  stepContainer: {
    width: '100%',
  },
  infoCard: {
    backgroundColor: '#F8FAFC',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    borderRadius: 10,
    padding: 14,
    marginBottom: 18,
  },
  infoCardTitle: {
    fontFamily: 'Inter-Bold',
    fontSize: 14,
    color: '#1E293B',
    marginBottom: 6,
  },
  infoCardBody: {
    fontFamily: 'Inter-Regular',
    fontSize: 13,
    color: '#475569',
    lineHeight: 18,
  },
  adminListContainer: {
    marginTop: 12,
    paddingTop: 10,
    borderTopWidth: 1,
    borderTopColor: '#E2E8F0',
  },
  adminListLabel: {
    fontFamily: 'Inter-SemiBold',
    fontSize: 12,
    color: '#64748B',
    marginBottom: 6,
  },
  adminChipsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
  },
  adminChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#E2E8F0',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  adminChipText: {
    fontFamily: 'Inter-Medium',
    fontSize: 12,
    color: '#1E293B',
  },
  primaryActionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: '#DC2626',
    paddingVertical: 14,
    borderRadius: 10,
    shadowColor: '#DC2626',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 8,
    elevation: 4,
  },
  primaryActionBtnText: {
    fontFamily: 'Inter-Bold',
    fontSize: 14,
    color: '#FFFFFF',
  },
  disabledBtn: {
    opacity: 0.6,
  },
  timerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  timerBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#FEF2F2',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#FCA5A5',
  },
  timerText: {
    fontFamily: 'Inter-Bold',
    fontSize: 12,
    color: '#DC2626',
  },
  resendLink: {
    fontFamily: 'Inter-SemiBold',
    fontSize: 12,
    color: '#2563EB',
    textDecorationLine: 'underline',
  },
  inputGroup: {
    marginBottom: 16,
  },
  inputHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 6,
  },
  badgeIndex: {
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: '#DC2626',
    justifyContent: 'center',
    alignItems: 'center',
  },
  badgeIndexText: {
    fontFamily: 'Inter-Bold',
    fontSize: 11,
    color: '#FFFFFF',
  },
  inputLabel: {
    fontFamily: 'Inter-Medium',
    fontSize: 13,
    color: '#334155',
  },
  inputEmailHighlight: {
    fontFamily: 'Inter-Bold',
    color: '#0F172A',
  },
  otpInput: {
    backgroundColor: '#F8FAFC',
    borderWidth: 1.5,
    borderColor: '#CBD5E1',
    borderRadius: 8,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 16,
    fontFamily: 'Inter-Bold',
    letterSpacing: 4,
    color: '#0F172A',
    textAlign: 'center',
  },
  strictWarning: {
    fontFamily: 'Inter-Regular',
    fontSize: 11.5,
    color: '#64748B',
    lineHeight: 16,
    textAlign: 'center',
    marginVertical: 10,
  },
  deleteBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: '#991B1B',
    paddingVertical: 14,
    borderRadius: 10,
    shadowColor: '#991B1B',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 4,
    marginTop: 6,
  },
  deleteBtnText: {
    fontFamily: 'Inter-Bold',
    fontSize: 14,
    color: '#FFFFFF',
  },
  successContainer: {
    alignItems: 'center',
    paddingVertical: 20,
  },
  successIconCircle: {
    width: 68,
    height: 68,
    borderRadius: 34,
    backgroundColor: '#DCFCE7',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 14,
  },
  successTitle: {
    fontFamily: 'Inter-Bold',
    fontSize: 18,
    color: '#15803D',
    marginBottom: 6,
    textAlign: 'center',
  },
  successText: {
    fontFamily: 'Inter-Regular',
    fontSize: 13,
    color: '#475569',
    textAlign: 'center',
    lineHeight: 18,
    maxWidth: 360,
  },
});

export default DualAdminResetModal;

