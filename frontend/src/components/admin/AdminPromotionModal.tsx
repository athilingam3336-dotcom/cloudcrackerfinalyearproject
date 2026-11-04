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
} from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { adminService } from '@/services/adminService';
import { SweetAlertModal, SweetAlertType } from '@/components/common/SweetAlertModal';

interface AdminPromotionModalProps {
  visible: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

export const AdminPromotionModal: React.FC<AdminPromotionModalProps> = ({
  visible,
  onClose,
  onSuccess,
}) => {
  // Mode: 'promote' | 'demote'
  const [mode, setMode] = useState<'promote' | 'demote'>('promote');

  // Promotion Steps: 'email_input' -> 'dual_otp' -> 'candidate_otp' -> 'success'
  const [step, setStep] = useState<'email_input' | 'dual_otp' | 'candidate_otp' | 'success'>('email_input');

  // Demotion Steps: 'select_admin' -> 'dual_otp'
  const [demoteStep, setDemoteStep] = useState<'select_admin' | 'dual_otp'>('select_admin');
  const [targetAdminEmail, setTargetAdminEmail] = useState<string>('');
  const [adminList, setAdminList] = useState<
    Array<{ id: string; email: string; full_name?: string; is_current_user?: boolean }>
  >([]);
  const [canDemote, setCanDemote] = useState<boolean>(false);

  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Form inputs
  const [candidateEmail, setCandidateEmail] = useState('');
  const [candidateName, setCandidateName] = useState('');
  const [temporaryPassword, setTemporaryPassword] = useState('');

  // Status & Session Data
  const [adminCount, setAdminCount] = useState<number>(0);
  const [registeredAdmins, setRegisteredAdmins] = useState<string[]>([]);
  const [sessionId, setSessionId] = useState<string>('');
  const [admin1Email, setAdmin1Email] = useState<string>('');
  const [admin2Email, setAdmin2Email] = useState<string>('');
  const [expiresInSecs, setExpiresInSecs] = useState<number>(600);

  // OTP inputs
  const [admin1Otp, setAdmin1Otp] = useState<string>('');
  const [admin2Otp, setAdmin2Otp] = useState<string>('');
  const [candidateOtp, setCandidateOtp] = useState<string>('');

  // SweetAlert State
  const [sweetAlert, setSweetAlert] = useState<{
    visible: boolean;
    type: SweetAlertType;
    title: string;
    message: string;
    confirmText?: string;
    onConfirm?: () => void;
  } | null>(null);

  useEffect(() => {
    if (visible) {
      setMode('promote');
      setStep('email_input');
      setDemoteStep('select_admin');
      setCandidateEmail('');
      setCandidateName('');
      setTemporaryPassword('');
      setAdmin1Otp('');
      setAdmin2Otp('');
      setCandidateOtp('');
      setErrorMessage(null);
      fetchStatus();
    }
  }, [visible]);

  // Countdown timer for OTP steps
  useEffect(() => {
    let timer: any;
    const isOtpStep =
      (mode === 'promote' && (step === 'dual_otp' || step === 'candidate_otp')) ||
      (mode === 'demote' && demoteStep === 'dual_otp');

    if (isOtpStep && expiresInSecs > 0) {
      timer = setInterval(() => {
        setExpiresInSecs((prev) => {
          if (prev <= 1) {
            clearInterval(timer);
            setErrorMessage('Authorization session has expired. Please request new codes.');
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    }
    return () => clearInterval(timer);
  }, [mode, step, demoteStep, expiresInSecs]);

  const fetchStatus = async () => {
    try {
      setIsLoading(true);
      const [promoRes, listRes] = await Promise.all([
        adminService.getPromotionSecurityStatus().catch(() => null),
        adminService.getActiveAdminsList().catch(() => null),
      ]);

      if (promoRes) {
        setAdminCount(promoRes.admin_count || 0);
        setRegisteredAdmins(promoRes.registered_admins || []);
      }
      if (listRes) {
        setAdminList(listRes.admins || []);
        setCanDemote(Boolean(listRes.can_demote));
        if (listRes.admins && listRes.admins.length > 0) {
          const defaultTarget = listRes.admins.find((a: any) => !a.is_current_user) || listRes.admins[0];
          setTargetAdminEmail(defaultTarget.email);
        }
      }
      setIsLoading(false);
    } catch (err: any) {
      setIsLoading(false);
      setErrorMessage(err.message || 'Failed to check admin security status.');
    }
  };

  const showSweetAlertError = (rawError: string) => {
    let title = 'Authorization Error';
    let message = rawError || 'Something went wrong. Please try again.';

    const lower = (rawError || '').toLowerCase();
    if (lower.includes('admin 2') || lower.includes('administrator 2')) {
      title = 'Admin 2 OTP Incorrect';
      message = 'The code entered for Administrator 2 is incorrect. Remember that each administrator receives a different 6-digit code. Please check Admin 2 email.';
    } else if (lower.includes('admin 1') || lower.includes('administrator 1')) {
      title = 'Admin 1 OTP Incorrect';
      message = 'The code entered for Administrator 1 is incorrect. Please check Admin 1 email and enter the valid 6-digit code.';
    } else if (lower.includes('both admin')) {
      title = 'Both Codes Invalid';
      message = 'Both Administrator authorization codes are incorrect. Please enter the valid 6-digit codes sent to each email address.';
    } else if (lower.includes('candidate otp') || lower.includes('candidate code')) {
      title = 'Candidate Verification Code Incorrect';
      message = `The verification code entered for ${candidateEmail} is incorrect. Please check the candidate inbox and try again.`;
    } else if (lower.includes('already an active administrator')) {
      title = 'Already an Administrator';
      message = `The email ${candidateEmail} is already registered as an active store administrator.`;
    } else if (lower.includes('expired')) {
      title = 'Security Window Expired';
      message = 'The 10-minute security window has expired. Please click "Resend Codes" to receive fresh verification codes.';
    }

    setSweetAlert({
      visible: true,
      type: 'error',
      title,
      message,
      confirmText: 'Try Again',
    });
  };

  // STEP 1: Request Promotion
  const handleRequestPromotion = async () => {
    const trimmedEmail = candidateEmail.trim().toLowerCase();
    if (!trimmedEmail || !trimmedEmail.includes('@') || !trimmedEmail.includes('.')) {
      setSweetAlert({
        visible: true,
        type: 'warning',
        title: 'Valid Email Required',
        message: 'Please enter a valid email address to promote as administrator.',
        confirmText: 'OK',
      });
      return;
    }

    try {
      setIsLoading(true);
      setErrorMessage(null);
      const res = await adminService.requestAdminPromotion({
        candidate_email: trimmedEmail,
        full_name: candidateName.trim() || undefined,
      });

      setSessionId(res.session_id);
      setAdmin1Email(res.admin1_email);
      setAdmin2Email(res.admin2_email);
      setExpiresInSecs(res.expires_in_seconds || 600);
      setStep('dual_otp');
      setIsLoading(false);
    } catch (err: any) {
      setIsLoading(false);
      const msg = err.message || 'Failed to initiate admin promotion authorization.';
      setErrorMessage(msg);
      showSweetAlertError(msg);
    }
  };

  // STEP 2: Verify Dual Admin OTPs
  const handleVerifyDualOtp = async () => {
    if (!admin1Otp.trim() || !admin2Otp.trim()) {
      setSweetAlert({
        visible: true,
        type: 'warning',
        title: 'Missing Codes',
        message: 'Please enter both Administrator 1 and Administrator 2 authorization codes to proceed.',
        confirmText: 'Got It',
      });
      return;
    }

    try {
      setIsLoading(true);
      setErrorMessage(null);
      const res = await adminService.verifyPromotionDualOtp({
        session_id: sessionId,
        admin1_otp: admin1Otp.trim(),
        admin2_otp: admin2Otp.trim(),
      });

      setIsLoading(false);
      setStep('candidate_otp');
      setSweetAlert({
        visible: true,
        type: 'info',
        title: 'Dual Approval Confirmed!',
        message: `Both administrators have authorized the promotion. A final 6-digit activation code has been sent directly to ${candidateEmail}.`,
        confirmText: 'Proceed to Candidate Verification',
      });
    } catch (err: any) {
      setIsLoading(false);
      const msg = err.message || 'Dual admin verification failed.';
      setErrorMessage(msg);
      showSweetAlertError(msg);
    }
  };

  // STEP 3: Verify Candidate OTP & Activate Admin
  const handleVerifyCandidateAndPromote = async () => {
    if (!candidateOtp.trim()) {
      setSweetAlert({
        visible: true,
        type: 'warning',
        title: 'Verification Code Required',
        message: `Please enter the 6-digit activation code sent to ${candidateEmail}.`,
        confirmText: 'OK',
      });
      return;
    }

    try {
      setIsLoading(true);
      setErrorMessage(null);
      await adminService.verifyCandidateAndPromote({
        session_id: sessionId,
        candidate_otp: candidateOtp.trim(),
        temporary_password: temporaryPassword.trim() || undefined,
      });

      setIsLoading(false);
      setStep('success');
      setSweetAlert({
        visible: true,
        type: 'success',
        title: 'New Administrator Promoted!',
        message: `Account ${candidateEmail} is now an active administrator with full store privileges.`,
        confirmText: 'Done',
      });

      setTimeout(() => {
        setSweetAlert(null);
        onSuccess();
        onClose();
      }, 2500);
    } catch (err: any) {
      setIsLoading(false);
      const msg = err.message || 'Candidate verification failed.';
      setErrorMessage(msg);
      showSweetAlertError(msg);
    }
  };

  const handleResendDualOtp = async () => {
    try {
      setIsLoading(true);
      await adminService.resendPromotionDualOtp(sessionId);
      setExpiresInSecs(600);
      setIsLoading(false);
      setSweetAlert({
        visible: true,
        type: 'info',
        title: 'OTPs Resent',
        message: `Fresh authorization codes sent to ${admin1Email} and ${admin2Email}.`,
        confirmText: 'OK',
      });
    } catch (err: any) {
      setIsLoading(false);
      showSweetAlertError(err.message || 'Failed to resend dual OTPs.');
    }
  };

  const handleResendCandidateOtp = async () => {
    try {
      setIsLoading(true);
      await adminService.resendCandidateOtp(sessionId);
      setIsLoading(false);
      setSweetAlert({
        visible: true,
        type: 'info',
        title: 'Activation Code Resent',
        message: `Fresh verification code sent to ${candidateEmail}.`,
        confirmText: 'OK',
      });
    } catch (err: any) {
      setIsLoading(false);
      showSweetAlertError(err.message || 'Failed to resend candidate OTP.');
    }
  };

  // DEMOTION STEP 1: Request Demotion
  const handleRequestDemotion = async () => {
    if (!targetAdminEmail) {
      setSweetAlert({
        visible: true,
        type: 'warning',
        title: 'Select Administrator',
        message: 'Please select an administrator to remove.',
        confirmText: 'OK',
      });
      return;
    }

    try {
      setIsLoading(true);
      setErrorMessage(null);
      const res = await adminService.requestAdminDemotion({
        target_admin_email: targetAdminEmail,
      });

      setSessionId(res.session_id);
      setAdmin1Email(res.admin1_email);
      setAdmin2Email(res.admin2_email);
      setExpiresInSecs(res.expires_in_seconds || 600);
      setAdmin1Otp('');
      setAdmin2Otp('');
      setDemoteStep('dual_otp');
      setIsLoading(false);
    } catch (err: any) {
      setIsLoading(false);
      const msg = err.message || 'Failed to initiate admin demotion authorization.';
      setErrorMessage(msg);
      showSweetAlertError(msg);
    }
  };

  // DEMOTION RESEND OTP
  const handleResendDemotionOtp = async () => {
    try {
      setIsLoading(true);
      await adminService.resendDemotionDualOtp(sessionId);
      setIsLoading(false);
      setExpiresInSecs(600);
      setSweetAlert({
        visible: true,
        type: 'info',
        title: 'Codes Resent',
        message: `Fresh authorization codes sent to ${admin1Email} and ${admin2Email}.`,
        confirmText: 'OK',
      });
    } catch (err: any) {
      setIsLoading(false);
      showSweetAlertError(err.message || 'Failed to resend authorization codes.');
    }
  };

  // DEMOTION STEP 2: Verify Demotion Dual OTP & Revoke
  const handleVerifyDemotion = async () => {
    if (!admin1Otp.trim() || !admin2Otp.trim()) {
      setSweetAlert({
        visible: true,
        type: 'warning',
        title: 'Missing Codes',
        message: 'Please enter both Administrator 1 and Administrator 2 authorization codes to proceed.',
        confirmText: 'Got It',
      });
      return;
    }

    try {
      setIsLoading(true);
      setErrorMessage(null);
      await adminService.verifyDemotionAndRevoke({
        session_id: sessionId,
        admin1_otp: admin1Otp.trim(),
        admin2_otp: admin2Otp.trim(),
      });

      setIsLoading(false);
      setSweetAlert({
        visible: true,
        type: 'success',
        title: 'Administrator Access Revoked',
        message: `Successfully revoked Administrator privileges for ${targetAdminEmail}. An official notification email has been dispatched to their inbox, and the account has been reverted to customer status.`,
        confirmText: 'Done',
        onConfirm: () => {
          setSweetAlert(null);
          onSuccess();
          onClose();
        },
      });
    } catch (err: any) {
      setIsLoading(false);
      const msg = err.message || 'Failed to verify authorization codes.';
      setErrorMessage(msg);
      showSweetAlertError(msg);
    }
  };

  const formatTimer = (secs: number) => {
    const m = Math.floor(secs / 60);
    const s = secs % 60;
    return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  };

  return (
    <>
      <Modal
        visible={visible}
        transparent
        animationType="fade"
        onRequestClose={isLoading ? undefined : onClose}
      >
        <TouchableOpacity
          style={styles.modalBackdrop}
          activeOpacity={1}
          onPress={isLoading ? undefined : onClose}
        >
          <TouchableWithoutFeedback>
            <View style={styles.modalCard}>
              {/* Header */}
              <View style={styles.modalHeader}>
                {/* Mode Switcher Tabs */}
                <View style={styles.modeTabBar}>
                  <TouchableOpacity
                    style={[styles.modeTab, mode === 'promote' && styles.modeTabActive]}
                    onPress={() => {
                      if (!isLoading) {
                        setMode('promote');
                        setStep('email_input');
                        setErrorMessage(null);
                      }
                    }}
                    activeOpacity={0.8}
                  >
                    <MaterialIcons
                      name="person-add-alt-1"
                      size={16}
                      color={mode === 'promote' ? '#990000' : '#64748B'}
                      style={{ marginRight: 6 }}
                    />
                    <Text style={[styles.modeTabText, mode === 'promote' && styles.modeTabTextActive]}>
                      Promote Admin
                    </Text>
                  </TouchableOpacity>

                  <TouchableOpacity
                    style={[styles.modeTab, mode === 'demote' && styles.modeTabActiveDanger]}
                    onPress={() => {
                      if (!isLoading) {
                        setMode('demote');
                        setDemoteStep('select_admin');
                        setErrorMessage(null);
                      }
                    }}
                    activeOpacity={0.8}
                  >
                    <MaterialIcons
                      name="person-remove"
                      size={16}
                      color={mode === 'demote' ? '#DC2626' : '#64748B'}
                      style={{ marginRight: 6 }}
                    />
                    <Text style={[styles.modeTabText, mode === 'demote' && styles.modeTabTextActiveDanger]}>
                      Remove Admin
                    </Text>
                  </TouchableOpacity>
                </View>

                <View style={styles.headerTitleRow}>
                  <View
                    style={[
                      styles.headerIconCircle,
                      mode === 'demote' && { backgroundColor: '#FEE2E2' },
                    ]}
                  >
                    <MaterialIcons
                      name={mode === 'promote' ? 'person-add-alt-1' : 'person-remove'}
                      size={24}
                      color={mode === 'promote' ? '#990000' : '#DC2626'}
                    />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.modalTitle}>
                      {mode === 'promote' ? 'Promote / Add Administrator' : 'Remove / Demote Administrator'}
                    </Text>
                    <Text style={styles.modalSubtitle}>
                      {mode === 'promote'
                        ? 'Dual-Admin Security Approval & Verification'
                        : 'Dual-Admin Security Authorization & Revocation'}
                    </Text>
                  </View>
                  <TouchableOpacity
                    style={styles.closeBtn}
                    onPress={onClose}
                    disabled={isLoading}
                  >
                    <MaterialIcons name="close" size={20} color="#64748B" />
                  </TouchableOpacity>
                </View>

                {/* Step indicator tabs */}
                {mode === 'promote' ? (
                  <View style={styles.stepIndicatorRow}>
                    <View style={[styles.stepPill, step === 'email_input' && styles.stepPillActive]}>
                      <Text style={[styles.stepPillText, step === 'email_input' && styles.stepPillTextActive]}>
                        1. Candidate
                      </Text>
                    </View>
                    <View style={[styles.stepPill, step === 'dual_otp' && styles.stepPillActive]}>
                      <Text style={[styles.stepPillText, step === 'dual_otp' && styles.stepPillTextActive]}>
                        2. Dual Approval
                      </Text>
                    </View>
                    <View style={[styles.stepPill, (step === 'candidate_otp' || step === 'success') && styles.stepPillActive]}>
                      <Text style={[styles.stepPillText, (step === 'candidate_otp' || step === 'success') && styles.stepPillTextActive]}>
                        3. Verify & Grant
                      </Text>
                    </View>
                  </View>
                ) : (
                  <View style={styles.stepIndicatorRow}>
                    <View style={[styles.stepPill, demoteStep === 'select_admin' && styles.stepPillActiveDanger]}>
                      <Text style={[styles.stepPillText, demoteStep === 'select_admin' && styles.stepPillTextActiveDanger]}>
                        1. Select Admin
                      </Text>
                    </View>
                    <View style={[styles.stepPill, demoteStep === 'dual_otp' && styles.stepPillActiveDanger]}>
                      <Text style={[styles.stepPillText, demoteStep === 'dual_otp' && styles.stepPillTextActiveDanger]}>
                        2. Dual Approval & Revoke
                      </Text>
                    </View>
                  </View>
                )}
              </View>

              <ScrollView style={styles.modalScrollBody} showsVerticalScrollIndicator={false}>
                {/* PROMOTION STEP 1: EMAIL INPUT */}
                {mode === 'promote' && step === 'email_input' && (
                  <View style={styles.stepContent}>
                    <View style={styles.infoBanner}>
                      <MaterialIcons name="security" size={20} color="#990000" style={{ marginRight: 10, marginTop: 2 }} />
                      <View style={{ flex: 1 }}>
                        <Text style={styles.infoBannerTitle}>High Security Access Delegation</Text>
                        <Text style={styles.infoBannerText}>
                          Promoting an account to Administrator grants full access to store orders, finances, products, and customer data.
                        </Text>
                      </View>
                    </View>

                    <View style={styles.fieldGroup}>
                      <Text style={styles.fieldLabel}>
                        Candidate Email Address <Text style={{ color: '#DC2626' }}>*</Text>
                      </Text>
                      <TextInput
                        style={styles.textInput}
                        placeholder="e.g. partner@gmail.com"
                        placeholderTextColor="#94A3B8"
                        keyboardType="email-address"
                        autoCapitalize="none"
                        value={candidateEmail}
                        onChangeText={setCandidateEmail}
                        editable={!isLoading}
                      />
                    </View>

                    <View style={styles.fieldGroup}>
                      <Text style={styles.fieldLabel}>Administrator Full Name (Optional)</Text>
                      <TextInput
                        style={styles.textInput}
                        placeholder="e.g. Athi Partner"
                        placeholderTextColor="#94A3B8"
                        value={candidateName}
                        onChangeText={setCandidateName}
                        editable={!isLoading}
                      />
                    </View>

                    <View style={styles.registeredAdminsBox}>
                      <Text style={styles.registeredAdminsTitle}>
                        🛡️ Authorization Required From Existing Admins ({adminCount}):
                      </Text>
                      {registeredAdmins.map((adm, idx) => (
                        <View key={idx} style={styles.adminBulletRow}>
                          <MaterialIcons name="verified" size={14} color="#16A34A" style={{ marginRight: 6 }} />
                          <Text style={styles.adminBulletText}>{adm}</Text>
                        </View>
                      ))}
                    </View>

                    <TouchableOpacity
                      style={[styles.primaryActionBtn, (!candidateEmail.trim() || isLoading) && styles.disabledBtn]}
                      onPress={handleRequestPromotion}
                      disabled={!candidateEmail.trim() || isLoading}
                      activeOpacity={0.85}
                    >
                      {isLoading ? (
                        <ActivityIndicator color="#FFFFFF" size="small" />
                      ) : (
                        <>
                          <MaterialIcons name="send" size={18} color="#FFFFFF" style={{ marginRight: 8 }} />
                          <Text style={styles.primaryActionBtnText}>Send Dual Authorization OTPs</Text>
                        </>
                      )}
                    </TouchableOpacity>
                  </View>
                )}

                {/* PROMOTION STEP 2: DUAL OTP ENTRY */}
                {mode === 'promote' && step === 'dual_otp' && (
                  <View style={styles.stepContent}>
                    <View style={styles.stageAlertBox}>
                      <Text style={styles.stageAlertTitle}>STEP 1 OF 2: DUAL ADMIN APPROVAL</Text>
                      <Text style={styles.stageAlertText}>
                        OTPs have been sent to both active administrators. Both codes must be verified to authorize promoting{' '}
                        <Text style={{ fontWeight: '700', color: '#1E293B' }}>{candidateEmail}</Text>.
                      </Text>
                    </View>

                    <View style={styles.timerRow}>
                      <View style={styles.timerBadge}>
                        <MaterialIcons name="timer" size={15} color="#DC2626" />
                        <Text style={styles.timerText}>Valid for: {formatTimer(expiresInSecs)}</Text>
                      </View>
                      <TouchableOpacity onPress={handleResendDualOtp} disabled={isLoading}>
                        <Text style={styles.resendBtnText}>Resend Codes</Text>
                      </TouchableOpacity>
                    </View>

                    {/* Admin 1 Input */}
                    <View style={styles.fieldGroup}>
                      <View style={styles.otpLabelRow}>
                        <View style={[styles.badgeIndex, { backgroundColor: '#DC2626' }]}>
                          <Text style={styles.badgeIndexText}>1</Text>
                        </View>
                        <Text style={styles.fieldLabel}>
                          Admin 1 Code: <Text style={styles.boldEmail}>{admin1Email}</Text>
                        </Text>
                      </View>
                      <TextInput
                        style={styles.otpInput}
                        placeholder="Enter 6-digit OTP"
                        placeholderTextColor="#94A3B8"
                        keyboardType="number-pad"
                        maxLength={6}
                        value={admin1Otp}
                        onChangeText={setAdmin1Otp}
                      />
                    </View>

                    {/* Admin 2 Input */}
                    <View style={styles.fieldGroup}>
                      <View style={styles.otpLabelRow}>
                        <View style={[styles.badgeIndex, { backgroundColor: '#B91C1C' }]}>
                          <Text style={styles.badgeIndexText}>2</Text>
                        </View>
                        <Text style={styles.fieldLabel}>
                          Admin 2 Code: <Text style={styles.boldEmail}>{admin2Email}</Text>
                        </Text>
                      </View>
                      <TextInput
                        style={styles.otpInput}
                        placeholder="Enter 6-digit OTP"
                        placeholderTextColor="#94A3B8"
                        keyboardType="number-pad"
                        maxLength={6}
                        value={admin2Otp}
                        onChangeText={setAdmin2Otp}
                      />
                    </View>

                    <Text style={styles.securityNote}>
                      🔒 If either OTP is incorrect or rejected, candidate promotion will NOT proceed.
                    </Text>

                    <TouchableOpacity
                      style={[styles.primaryActionBtn, (!admin1Otp.trim() || !admin2Otp.trim() || isLoading) && styles.disabledBtn]}
                      onPress={handleVerifyDualOtp}
                      disabled={!admin1Otp.trim() || !admin2Otp.trim() || isLoading}
                      activeOpacity={0.85}
                    >
                      {isLoading ? (
                        <ActivityIndicator color="#FFFFFF" size="small" />
                      ) : (
                        <>
                          <MaterialIcons name="check-circle" size={18} color="#FFFFFF" style={{ marginRight: 8 }} />
                          <Text style={styles.primaryActionBtnText}>Verify Dual Codes & Continue</Text>
                        </>
                      )}
                    </TouchableOpacity>
                  </View>
                )}

                {/* PROMOTION STEP 3: CANDIDATE OTP ENTRY */}
                {mode === 'promote' && step === 'candidate_otp' && (
                  <View style={styles.stepContent}>
                    <View style={styles.candidateSuccessBanner}>
                      <View style={styles.verifiedCheckBadge}>
                        <MaterialIcons name="check" size={16} color="#FFFFFF" />
                      </View>
                      <View style={{ flex: 1 }}>
                        <Text style={styles.candidateBannerTitle}>Dual-Admin Approval Verified!</Text>
                        <Text style={styles.candidateBannerText}>
                          A final 6-digit activation code has been sent directly to candidate email:
                        </Text>
                        <Text style={styles.candidateBannerEmail}>{candidateEmail}</Text>
                      </View>
                    </View>

                    <View style={styles.timerRow}>
                      <View style={styles.timerBadge}>
                        <MaterialIcons name="timer" size={15} color="#990000" />
                        <Text style={[styles.timerText, { color: '#990000' }]}>
                          Valid for: {formatTimer(expiresInSecs)}
                        </Text>
                      </View>
                      <TouchableOpacity onPress={handleResendCandidateOtp} disabled={isLoading}>
                        <Text style={[styles.resendBtnText, { color: '#990000' }]}>Resend Candidate Code</Text>
                      </TouchableOpacity>
                    </View>

                    <View style={styles.fieldGroup}>
                      <Text style={styles.fieldLabel}>
                        Candidate 6-Digit Activation Code <Text style={{ color: '#DC2626' }}>*</Text>
                      </Text>
                      <TextInput
                        style={[styles.otpInput, { borderColor: '#990000' }]}
                        placeholder="Enter 6-digit candidate code"
                        placeholderTextColor="#94A3B8"
                        keyboardType="number-pad"
                        maxLength={6}
                        value={candidateOtp}
                        onChangeText={setCandidateOtp}
                      />
                    </View>

                    <View style={styles.fieldGroup}>
                      <Text style={styles.fieldLabel}>Set Initial Password (Optional)</Text>
                      <TextInput
                        style={styles.textInput}
                        placeholder="Leave empty for default (AdminPassword123!)"
                        placeholderTextColor="#94A3B8"
                        secureTextEntry
                        value={temporaryPassword}
                        onChangeText={setTemporaryPassword}
                      />
                    </View>

                    <TouchableOpacity
                      style={[
                        styles.primaryActionBtn,
                        { backgroundColor: '#990000' },
                        (!candidateOtp.trim() || isLoading) && styles.disabledBtn,
                      ]}
                      onPress={handleVerifyCandidateAndPromote}
                      disabled={!candidateOtp.trim() || isLoading}
                      activeOpacity={0.85}
                    >
                      {isLoading ? (
                        <ActivityIndicator color="#FFFFFF" size="small" />
                      ) : (
                        <>
                          <MaterialIcons name="verified-user" size={18} color="#FFFFFF" style={{ marginRight: 8 }} />
                          <Text style={styles.primaryActionBtnText}>Verify Candidate & Activate Admin Role</Text>
                        </>
                      )}
                    </TouchableOpacity>
                  </View>
                )}

                {/* PROMOTION STEP 4: SUCCESS */}
                {mode === 'promote' && step === 'success' && (
                  <View style={styles.successContainer}>
                    <View style={styles.successIconCircle}>
                      <MaterialIcons name="check" size={40} color="#16A34A" />
                    </View>
                    <Text style={styles.successTitle}>Administrator Role Activated!</Text>
                    <Text style={styles.successText}>
                      <Text style={{ fontWeight: '700' }}>{candidateEmail}</Text> has been successfully verified
                      and granted full Administrator privileges on Meera Crackers World.
                    </Text>
                    <ActivityIndicator color="#16A34A" style={{ marginTop: 16 }} />
                  </View>
                )}

                {/* DEMOTION STEP 1: SELECT ADMIN TO REMOVE */}
                {mode === 'demote' && demoteStep === 'select_admin' && (
                  <View style={styles.stepContent}>
                    <View style={styles.dangerBanner}>
                      <MaterialIcons name="gpp-maybe" size={20} color="#DC2626" style={{ marginRight: 10, marginTop: 2 }} />
                      <View style={{ flex: 1 }}>
                        <Text style={styles.dangerBannerTitle}>High Security Role Revocation</Text>
                        <Text style={styles.dangerBannerText}>
                          Revoking Administrator privileges will immediately revert the account to standard Customer status. Store admin privileges, orders, inventory, and analytics access will be revoked.
                        </Text>
                      </View>
                    </View>

                    {!canDemote && (
                      <View style={styles.thresholdWarningBox}>
                        <MaterialIcons name="lock" size={20} color="#DC2626" style={{ marginRight: 10, marginTop: 2 }} />
                        <View style={{ flex: 1 }}>
                          <Text style={styles.thresholdWarningTitle}>Removal Protection Active</Text>
                          <Text style={styles.thresholdWarningText}>
                            At least 3 active administrators are required in the system to remove an administrator. This ensures 2 other admins can authorize the revocation and at least 2 admins remain.
                          </Text>
                          <Text style={styles.thresholdWarningCount}>
                            Current active administrators: {adminList.length} / 3 minimum
                          </Text>
                        </View>
                      </View>
                    )}

                    <View style={styles.fieldGroup}>
                      <Text style={styles.fieldLabel}>
                        Select Administrator to Remove ({adminList.length} Active):
                      </Text>
                      <View style={styles.adminCardList}>
                        {adminList.map((adm) => {
                          const isSelected = targetAdminEmail === adm.email;
                          return (
                            <TouchableOpacity
                              key={adm.id || adm.email}
                              style={[
                                styles.adminSelectCard,
                                isSelected && styles.adminSelectCardActive,
                              ]}
                              onPress={() => !isLoading && setTargetAdminEmail(adm.email)}
                              activeOpacity={0.7}
                            >
                              <View style={[styles.radioCircle, isSelected && styles.radioCircleActive]}>
                                {isSelected && <View style={styles.radioDot} />}
                              </View>
                              <View style={[styles.adminSelectAvatar, isSelected && { backgroundColor: '#FEE2E2' }]}>
                                <MaterialIcons
                                  name="admin-panel-settings"
                                  size={20}
                                  color={isSelected ? '#DC2626' : '#64748B'}
                                />
                              </View>
                              <View style={{ flex: 1 }}>
                                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                                  <Text style={[styles.adminSelectName, isSelected && styles.adminSelectNameActive]}>
                                    {adm.full_name || adm.email.split('@')[0]}
                                  </Text>
                                  {adm.is_current_user && (
                                    <View style={styles.currentUserBadge}>
                                      <Text style={styles.currentUserBadgeText}>You (Current)</Text>
                                    </View>
                                  )}
                                </View>
                                <Text style={styles.adminSelectEmail}>{adm.email}</Text>
                              </View>
                              {isSelected && (
                                <MaterialIcons name="check-circle" size={18} color="#DC2626" />
                              )}
                            </TouchableOpacity>
                          );
                        })}
                      </View>
                    </View>

                    {/* Dual-Admin Security Enforcement Notice */}
                    <View style={styles.securityExplainerBox}>
                      <Text style={styles.securityExplainerTitle}>🛡️ Dual-Admin Security Protocol</Text>
                      <View style={styles.adminBulletRow}>
                        <MaterialIcons name="security" size={14} color="#16A34A" style={{ marginRight: 6 }} />
                        <Text style={styles.securityExplainerText}>
                          Authorization OTPs will be sent exclusively to the <Text style={{ fontWeight: '700' }}>OTHER 2 administrators</Text>.
                        </Text>
                      </View>
                      <View style={styles.adminBulletRow}>
                        <MaterialIcons name="block" size={14} color="#DC2626" style={{ marginRight: 6 }} />
                        <Text style={styles.securityExplainerText}>
                          <Text style={{ fontWeight: '700' }}>{targetAdminEmail || 'Target Admin'}</Text> will <Text style={{ fontWeight: '700', color: '#DC2626' }}>NOT</Text> receive an OTP (prevents self-veto).
                        </Text>
                      </View>
                      <View style={styles.adminBulletRow}>
                        <MaterialIcons name="mail-outline" size={14} color="#2563EB" style={{ marginRight: 6 }} />
                        <Text style={styles.securityExplainerText}>
                          Upon dual OTP verification, an official revocation notice email will automatically be delivered to <Text style={{ fontWeight: '700' }}>{targetAdminEmail}</Text>.
                        </Text>
                      </View>
                    </View>

                    <TouchableOpacity
                      style={[
                        styles.dangerActionBtn,
                        (!targetAdminEmail || !canDemote || isLoading) && styles.disabledBtn,
                      ]}
                      onPress={handleRequestDemotion}
                      disabled={!targetAdminEmail || !canDemote || isLoading}
                      activeOpacity={0.85}
                    >
                      {isLoading ? (
                        <ActivityIndicator color="#FFFFFF" size="small" />
                      ) : (
                        <>
                          <MaterialIcons name="send" size={18} color="#FFFFFF" style={{ marginRight: 8 }} />
                          <Text style={styles.dangerActionBtnText}>Send Dual Revocation OTPs</Text>
                        </>
                      )}
                    </TouchableOpacity>
                  </View>
                )}

                {/* DEMOTION STEP 2: DUAL OTP ENTRY */}
                {mode === 'demote' && demoteStep === 'dual_otp' && (
                  <View style={styles.stepContent}>
                    <View style={[styles.stageAlertBox, { borderLeftColor: '#DC2626', backgroundColor: '#FEF2F2' }]}>
                      <Text style={[styles.stageAlertTitle, { color: '#B91C1C' }]}>
                        STEP 2 OF 2: DUAL AUTHORIZATION REQUIRED
                      </Text>
                      <Text style={[styles.stageAlertText, { color: '#7F1D1D' }]}>
                        Authorizing revocation for: <Text style={{ fontWeight: '700' }}>{targetAdminEmail}</Text>.
                        Codes have been dispatched to the other 2 administrators:
                      </Text>
                      <Text style={{ fontSize: 12, color: '#991B1B', marginTop: 4, fontWeight: '600' }}>
                        • Admin 1: {admin1Email}
                      </Text>
                      <Text style={{ fontSize: 12, color: '#991B1B', marginTop: 2, fontWeight: '600' }}>
                        • Admin 2: {admin2Email}
                      </Text>
                      <Text style={{ fontSize: 11.5, color: '#DC2626', marginTop: 6, fontStyle: 'italic' }}>
                        ⚠️ Notice: {targetAdminEmail} did NOT receive an authorization code.
                      </Text>
                    </View>

                    <View style={styles.timerRow}>
                      <View style={[styles.timerBadge, { backgroundColor: '#FEE2E2' }]}>
                        <MaterialIcons name="timer" size={15} color="#DC2626" />
                        <Text style={[styles.timerText, { color: '#DC2626' }]}>
                          Valid for: {formatTimer(expiresInSecs)}
                        </Text>
                      </View>
                      <TouchableOpacity onPress={handleResendDemotionOtp} disabled={isLoading}>
                        <Text style={[styles.resendBtnText, { color: '#DC2626' }]}>Resend Dual Codes</Text>
                      </TouchableOpacity>
                    </View>

                    {/* Admin 1 Input */}
                    <View style={styles.fieldGroup}>
                      <View style={styles.otpLabelRow}>
                        <View style={[styles.badgeIndex, { backgroundColor: '#DC2626' }]}>
                          <Text style={styles.badgeIndexText}>1</Text>
                        </View>
                        <Text style={styles.fieldLabel}>
                          Admin 1 Code: <Text style={styles.boldEmail}>{admin1Email}</Text>
                        </Text>
                      </View>
                      <TextInput
                        style={[styles.otpInput, { borderColor: '#DC2626' }]}
                        placeholder="Enter 6-digit OTP"
                        placeholderTextColor="#94A3B8"
                        keyboardType="number-pad"
                        maxLength={6}
                        value={admin1Otp}
                        onChangeText={setAdmin1Otp}
                      />
                    </View>

                    {/* Admin 2 Input */}
                    <View style={styles.fieldGroup}>
                      <View style={styles.otpLabelRow}>
                        <View style={[styles.badgeIndex, { backgroundColor: '#B91C1C' }]}>
                          <Text style={styles.badgeIndexText}>2</Text>
                        </View>
                        <Text style={styles.fieldLabel}>
                          Admin 2 Code: <Text style={styles.boldEmail}>{admin2Email}</Text>
                        </Text>
                      </View>
                      <TextInput
                        style={[styles.otpInput, { borderColor: '#B91C1C' }]}
                        placeholder="Enter 6-digit OTP"
                        placeholderTextColor="#94A3B8"
                        keyboardType="number-pad"
                        maxLength={6}
                        value={admin2Otp}
                        onChangeText={setAdmin2Otp}
                      />
                    </View>

                    <Text style={styles.securityNote}>
                      🔒 Both 6-digit OTPs are required. Once verified, {targetAdminEmail} will immediately lose admin access and receive an official revocation email notice.
                    </Text>

                    <TouchableOpacity
                      style={[
                        styles.dangerActionBtn,
                        (!admin1Otp.trim() || !admin2Otp.trim() || isLoading) && styles.disabledBtn,
                      ]}
                      onPress={handleVerifyDemotion}
                      disabled={!admin1Otp.trim() || !admin2Otp.trim() || isLoading}
                      activeOpacity={0.85}
                    >
                      {isLoading ? (
                        <ActivityIndicator color="#FFFFFF" size="small" />
                      ) : (
                        <>
                          <MaterialIcons name="person-remove" size={18} color="#FFFFFF" style={{ marginRight: 8 }} />
                          <Text style={styles.dangerActionBtnText}>Verify Codes & Revoke Administrator</Text>
                        </>
                      )}
                    </TouchableOpacity>
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
  modalBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(15, 23, 42, 0.65)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 16,
  },
  modalCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 18,
    width: '100%',
    maxWidth: 500,
    maxHeight: '90%',
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 12 },
    shadowOpacity: 0.2,
    shadowRadius: 28,
    elevation: 20,
    overflow: 'hidden',
  },
  modalHeader: {
    paddingHorizontal: 22,
    paddingTop: 20,
    paddingBottom: 14,
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
  },
  modeTabBar: {
    flexDirection: 'row',
    backgroundColor: '#F1F5F9',
    borderRadius: 10,
    padding: 4,
    marginBottom: 16,
  },
  modeTab: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 8,
    borderRadius: 8,
  },
  modeTabActive: {
    backgroundColor: '#FFFFFF',
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 3,
    elevation: 2,
  },
  modeTabActiveDanger: {
    backgroundColor: '#FFFFFF',
    shadowColor: '#DC2626',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.15,
    shadowRadius: 3,
    elevation: 2,
  },
  modeTabText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#64748B',
  },
  modeTabTextActive: {
    color: '#990000',
    fontWeight: '700',
  },
  modeTabTextActiveDanger: {
    color: '#DC2626',
    fontWeight: '700',
  },
  headerTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  headerIconCircle: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#FEF2F2',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 14,
  },
  modalTitle: {
    fontSize: 17,
    fontWeight: '700',
    color: '#0F172A',
  },
  modalSubtitle: {
    fontSize: 12,
    color: '#64748B',
    marginTop: 2,
  },
  closeBtn: {
    padding: 6,
    borderRadius: 8,
  },
  stepIndicatorRow: {
    flexDirection: 'row',
    gap: 6,
    marginTop: 14,
  },
  stepPill: {
    flex: 1,
    paddingVertical: 6,
    borderRadius: 8,
    backgroundColor: '#F1F5F9',
    alignItems: 'center',
  },
  stepPillActive: {
    backgroundColor: '#FEF2F2',
    borderWidth: 1,
    borderColor: '#FECACA',
  },
  stepPillActiveDanger: {
    backgroundColor: '#FEF2F2',
    borderWidth: 1,
    borderColor: '#FECACA',
  },
  stepPillText: {
    fontSize: 11,
    fontWeight: '600',
    color: '#94A3B8',
  },
  stepPillTextActive: {
    color: '#990000',
    fontWeight: '700',
  },
  stepPillTextActiveDanger: {
    color: '#DC2626',
    fontWeight: '700',
  },
  modalScrollBody: {
    padding: 22,
  },
  stepContent: {
    paddingBottom: 10,
  },
  infoBanner: {
    flexDirection: 'row',
    backgroundColor: '#FEF2F2',
    borderWidth: 1,
    borderColor: '#FECACA',
    borderRadius: 10,
    padding: 12,
    marginBottom: 16,
  },
  infoBannerTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: '#990000',
    marginBottom: 3,
  },
  infoBannerText: {
    fontSize: 12,
    color: '#334155',
    lineHeight: 16,
  },
  fieldGroup: {
    marginBottom: 16,
  },
  fieldLabel: {
    fontSize: 13,
    fontWeight: '600',
    color: '#334155',
    marginBottom: 6,
  },
  textInput: {
    borderWidth: 1.5,
    borderColor: '#E2E8F0',
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 11,
    fontSize: 14,
    color: '#0F172A',
    backgroundColor: '#F8FAFC',
  },
  registeredAdminsBox: {
    backgroundColor: '#F8FAFC',
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    padding: 12,
    marginBottom: 18,
  },
  registeredAdminsTitle: {
    fontSize: 12,
    fontWeight: '700',
    color: '#475569',
    marginBottom: 8,
  },
  adminBulletRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 4,
  },
  adminBulletText: {
    fontSize: 12,
    color: '#0F172A',
    fontWeight: '500',
  },
  stageAlertBox: {
    backgroundColor: '#FEF2F2',
    borderLeftWidth: 4,
    borderLeftColor: '#DC2626',
    borderRadius: 8,
    padding: 12,
    marginBottom: 14,
  },
  stageAlertTitle: {
    fontSize: 11,
    fontWeight: '800',
    color: '#990000',
    letterSpacing: 0.5,
    marginBottom: 4,
  },
  stageAlertText: {
    fontSize: 12,
    color: '#7F1D1D',
    lineHeight: 17,
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
    backgroundColor: '#FEE2E2',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 20,
    gap: 5,
  },
  timerText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#DC2626',
  },
  resendBtnText: {
    fontSize: 12.5,
    fontWeight: '600',
    color: '#990000',
  },
  otpLabelRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 6,
    gap: 8,
  },
  badgeIndex: {
    width: 20,
    height: 20,
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
  },
  badgeIndexText: {
    color: '#FFFFFF',
    fontSize: 11,
    fontWeight: '800',
  },
  boldEmail: {
    fontWeight: '700',
    color: '#0F172A',
  },
  otpInput: {
    borderWidth: 2,
    borderColor: '#CBD5E1',
    borderRadius: 10,
    paddingVertical: 12,
    fontSize: 22,
    fontWeight: '800',
    letterSpacing: 8,
    textAlign: 'center',
    color: '#0F172A',
    backgroundColor: '#FFFFFF',
  },
  securityNote: {
    fontSize: 12,
    color: '#64748B',
    lineHeight: 16,
    marginBottom: 16,
    textAlign: 'center',
  },
  candidateSuccessBanner: {
    flexDirection: 'row',
    backgroundColor: '#FEF2F2',
    borderWidth: 1,
    borderColor: '#FECACA',
    borderRadius: 10,
    padding: 12,
    marginBottom: 14,
    gap: 10,
  },
  verifiedCheckBadge: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: '#990000',
    justifyContent: 'center',
    alignItems: 'center',
  },
  candidateBannerTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: '#990000',
    marginBottom: 2,
  },
  candidateBannerText: {
    fontSize: 12,
    color: '#334155',
  },
  candidateBannerEmail: {
    fontSize: 13,
    fontWeight: '700',
    color: '#990000',
    marginTop: 2,
  },
  primaryActionBtn: {
    backgroundColor: '#990000',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 13,
    borderRadius: 10,
    shadowColor: '#990000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 8,
    elevation: 4,
  },
  disabledBtn: {
    opacity: 0.5,
  },
  primaryActionBtnText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  successContainer: {
    alignItems: 'center',
    paddingVertical: 24,
  },
  successIconCircle: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: '#DCFCE7',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 14,
  },
  successTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: '#15803D',
    marginBottom: 6,
  },
  successText: {
    fontSize: 13.5,
    color: '#334155',
    textAlign: 'center',
    lineHeight: 19,
    paddingHorizontal: 12,
  },
  dangerBanner: {
    flexDirection: 'row',
    backgroundColor: '#FEF2F2',
    borderWidth: 1,
    borderColor: '#FECACA',
    borderRadius: 10,
    padding: 12,
    marginBottom: 16,
  },
  dangerBannerTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: '#DC2626',
    marginBottom: 3,
  },
  dangerBannerText: {
    fontSize: 12,
    color: '#334155',
    lineHeight: 16,
  },
  thresholdWarningBox: {
    flexDirection: 'row',
    backgroundColor: '#FEF2F2',
    borderLeftWidth: 4,
    borderLeftColor: '#DC2626',
    borderRadius: 8,
    padding: 12,
    marginBottom: 16,
  },
  thresholdWarningTitle: {
    fontSize: 13,
    fontWeight: '800',
    color: '#DC2626',
    marginBottom: 4,
  },
  thresholdWarningText: {
    fontSize: 12,
    color: '#7F1D1D',
    lineHeight: 16,
  },
  thresholdWarningCount: {
    fontSize: 12,
    fontWeight: '700',
    color: '#991B1B',
    marginTop: 6,
  },
  adminCardList: {
    gap: 8,
    marginTop: 4,
  },
  adminSelectCard: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    borderRadius: 10,
    borderWidth: 1.5,
    borderColor: '#E2E8F0',
    backgroundColor: '#FFFFFF',
  },
  adminSelectCardActive: {
    borderColor: '#DC2626',
    backgroundColor: '#FEF2F2',
  },
  radioCircle: {
    width: 20,
    height: 20,
    borderRadius: 10,
    borderWidth: 2,
    borderColor: '#94A3B8',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  radioCircleActive: {
    borderColor: '#DC2626',
  },
  radioDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: '#DC2626',
  },
  adminSelectAvatar: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#F1F5F9',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  adminSelectName: {
    fontSize: 13.5,
    fontWeight: '700',
    color: '#1E293B',
  },
  adminSelectNameActive: {
    color: '#990000',
  },
  currentUserBadge: {
    backgroundColor: '#E0E7FF',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  currentUserBadgeText: {
    fontSize: 10.5,
    fontWeight: '700',
    color: '#3730A3',
  },
  adminSelectEmail: {
    fontSize: 12,
    color: '#64748B',
    marginTop: 2,
  },
  securityExplainerBox: {
    backgroundColor: '#F8FAFC',
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    padding: 12,
    marginBottom: 18,
  },
  securityExplainerTitle: {
    fontSize: 12,
    fontWeight: '700',
    color: '#475569',
    marginBottom: 8,
  },
  securityExplainerText: {
    fontSize: 12,
    color: '#0F172A',
    fontWeight: '500',
    flex: 1,
  },
  dangerActionBtn: {
    backgroundColor: '#DC2626',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 13,
    borderRadius: 10,
    shadowColor: '#DC2626',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 8,
    elevation: 4,
  },
  dangerActionBtnText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#FFFFFF',
  },
});

