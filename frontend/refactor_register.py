import re

with open('src/screens/Authentication/RegisterScreen.tsx', 'r') as f:
    content = f.read()

# Remove name and phone state
content = re.sub(r"  const \[name, setName\] = useState\(''\);\n", "", content)
content = re.sub(r"  const \[phone, setPhone\] = useState\(''\);\n", "", content)

# Update RegisterErrors interface
content = re.sub(r"  name\?: string;\n", "", content)
content = re.sub(r"  phone\?: string;\n", "", content)

# Replace validateForm
validate_form_regex = r"  const validateForm = \(\): boolean => \{.*?(?=  const handleRegister = async \(\) => \{)"
new_validate_form = r"""  const validateForm = (): boolean => {
    const newErrors: RegisterErrors = {};

    // Email validation
    if (!email.trim()) {
      newErrors.email = 'Email address is required';
    } else {
      const emailRegex = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;
      if (!emailRegex.test(email.trim())) {
        newErrors.email = 'Please enter a valid email address';
      }
    }

    // Password validation
    if (!password) {
      newErrors.password = 'Password is required';
    } else if (password.length < 8) {
      newErrors.password = 'Password must be at least 8 characters long';
    } else if (!/[A-Z]/.test(password)) {
      newErrors.password = 'Password must contain at least one uppercase letter';
    } else if (!/[a-z]/.test(password)) {
      newErrors.password = 'Password must contain at least one lowercase letter';
    } else if (!/\d/.test(password)) {
      newErrors.password = 'Password must contain at least one number';
    } else if (!/[@$!%*#?&]/.test(password)) {
      newErrors.password = 'Password must contain at least one special character (@$!%*#?&)';
    }

    // Confirm Password validation
    if (!confirmPassword) {
      newErrors.confirmPassword = 'Please confirm your password';
    } else if (confirmPassword !== password) {
      newErrors.confirmPassword = 'Passwords do not match';
    }

    // Terms validation
    if (!acceptedTerms) {
      newErrors.terms = 'You must agree to the Terms & Privacy Policy';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

"""
match = re.search(validate_form_regex, content, flags=re.DOTALL)
if match:
    content = content[:match.start()] + new_validate_form + content[match.end():]

# Refactor submit flows
handle_register_regex = r"  const handleRegister = async \(\) => \{.*?(?=  const handleGoogleLoginClick = async \(\) => \{)"

new_handle_register = r"""  const handleRegister = async () => {
    if (!validateForm()) return;

    // Trigger OTP flow
    setIsSendingOtp(true);
    setErrors((prev) => ({ ...prev, general: undefined }));
    
    try {
      const res = await authService.sendEmailOtp(email.trim());
      setIsSendingOtp(false);
      setOtpSent(true);
      setOtpMessage(res.message || `Verification OTP code sent to ${email.trim()}.`);
    } catch (err: any) {
      setIsSendingOtp(false);
      const msg = err.response?.data?.message || err.message || 'Failed to send OTP code.';
      setErrors((prev) => ({ ...prev, general: msg }));
    }
  };

  const handleVerifyAndCreateAccount = async () => {
    if (otpCode.length !== 6) {
      setErrors((prev) => ({ ...prev, otp: 'Please enter a 6-digit OTP code.' }));
      return;
    }

    setIsVerifyingOtp(true);
    setErrors((prev) => ({ ...prev, otp: undefined, general: undefined }));

    try {
      const success = await authService.verifyEmailOtp(email.trim(), otpCode.trim());
      if (success) {
        // Now create account directly (don't use storeRegister to prevent auto-login)
        await authService.register(
          'Customer', // Dummy name
          email.trim(),
          password,
          '0000000000', // Dummy phone
          confirmPassword
        );
        setIsVerifyingOtp(false);
        // Navigate to login
        alert('Account created successfully! Please log in.');
        navigation.navigate('Login');
      }
    } catch (err: any) {
      setIsVerifyingOtp(false);
      const msg = err.response?.data?.message || err.message || 'Verification or Registration failed.';
      setErrors((prev) => ({ ...prev, otp: msg, general: msg }));
    }
  };

"""
match = re.search(handle_register_regex, content, flags=re.DOTALL)
if match:
    content = content[:match.start()] + new_handle_register + content[match.end():]

# Remove old handleSendOtp and handleVerifyOtp
remove_otp_handlers = r"  const handleSendOtp = async \(\) => \{.*?(?=  const storeRegister = useAuthStore\(\(state\) => state\.register\);)"
content = re.sub(remove_otp_handlers, "", content, flags=re.DOTALL)

# The form UI logic needs replacement.
form_ui_regex = r"              \{\/\* Full Name \*\/}.*?(?=              \{\/\* General Form Error Banner \*\/})"
new_form_ui = r"""              {otpSent ? (
                <View style={styles.otpBox}>
                  <View style={styles.otpBoxHeader}>
                    <MaterialIcons name="mark-email-read" size={20} color={Colors.primary} />
                    <Text style={styles.otpBoxTitle}>Email Verification Code</Text>
                  </View>
                  <Text style={styles.otpBoxSubtitle}>
                    Enter the 6-digit OTP code sent to <Text style={{ fontFamily: 'Inter-Bold' }}>{email}</Text>
                  </Text>

                  {otpMessage && (
                    <View style={styles.otpBanner}>
                      <Text style={styles.otpBannerText}>{otpMessage}</Text>
                    </View>
                  )}

                  <CustomInput
                    label="OTP CODE"
                    placeholder="6-digit OTP (e.g. 123456)"
                    value={otpCode}
                    onChangeText={(text) => {
                      setOtpCode(text.replace(/\D/g, '').slice(0, 6));
                      if (errors.otp) setErrors((prev) => ({ ...prev, otp: undefined }));
                    }}
                    keyboardType="number-pad"
                    maxLength={6}
                    error={errors.otp}
                  />

                  <PrimaryButton
                    title="Verify & Create Account"
                    onPress={handleVerifyAndCreateAccount}
                    loading={isVerifyingOtp}
                    style={styles.submitButton}
                  />
                  
                  <TouchableOpacity
                    style={{ marginTop: 16, alignItems: 'center' }}
                    onPress={() => { setOtpSent(false); setOtpCode(''); }}
                  >
                    <Text style={styles.loginLink}>Back to Form</Text>
                  </TouchableOpacity>
                </View>
              ) : (
                <>
                  <CustomInput
                    label="EMAIL ADDRESS"
                    placeholder="john@example.com"
                    value={email}
                    onChangeText={(text) => {
                      setEmail(text);
                      if (errors.email) setErrors((prev) => ({ ...prev, email: undefined }));
                    }}
                    keyboardType="email-address"
                    autoCapitalize="none"
                    error={errors.email}
                    leftIcon={
                      <MaterialIcons name="mail-outline" size={20} color={Colors.tertiary} />
                    }
                  />

                  <PasswordInput
                    label="PASSWORD"
                    placeholder="••••••••"
                    value={password}
                    onChangeText={(text) => {
                      setPassword(text);
                      if (errors.password) setErrors((prev) => ({ ...prev, password: undefined }));
                    }}
                    error={errors.password}
                  />

                  <PasswordInput
                    label="CONFIRM PASSWORD"
                    placeholder="••••••••"
                    value={confirmPassword}
                    onChangeText={(text) => {
                      setConfirmPassword(text);
                      if (errors.confirmPassword)
                        setErrors((prev) => ({ ...prev, confirmPassword: undefined }));
                    }}
                    error={errors.confirmPassword}
                  />

                  <View style={styles.termsContainer}>
                    <Checkbox
                      label="I agree to the Terms & Conditions and Privacy Policy"
                      checked={acceptedTerms}
                      onChange={(checked) => {
                        setAcceptedTerms(checked);
                        if (errors.terms) setErrors((prev) => ({ ...prev, terms: undefined }));
                      }}
                    />
                    {errors.terms && <Text style={styles.errorText}>{errors.terms}</Text>}
                  </View>
                </>
              )}
"""
match = re.search(form_ui_regex, content, flags=re.DOTALL)
if match:
    content = content[:match.start()] + new_form_ui + content[match.end():]

# Update Submit Button which is below "General Form Error Banner"
submit_btn_regex = r"              \{\/\* Submit Button \*\/}.*?(?=              \{\/\* Divider \*\/})"
new_submit_btn = r"""              {/* Submit Button */}
              {!otpSent && (
                <PrimaryButton
                  title="Create Account"
                  onPress={handleRegister}
                  loading={isSendingOtp}
                  icon={
                    <MaterialIcons name="arrow-forward" size={20} color={Colors.onPrimary} />
                  }
                  style={styles.submitButton}
                />
              )}
"""
match2 = re.search(submit_btn_regex, content, flags=re.DOTALL)
if match2:
    content = content[:match2.start()] + new_submit_btn + content[match2.end():]

with open('src/screens/Authentication/RegisterScreen.tsx', 'w') as f:
    f.write(content)

