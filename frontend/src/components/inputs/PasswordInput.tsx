import React, { useState } from 'react';
import { TouchableOpacity, StyleSheet } from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { CustomInput } from './CustomInput';
import { Colors } from '@/constants/colors';
import { TextInputProps, ViewStyle } from 'react-native';

interface PasswordInputProps extends TextInputProps {
  label?: string;
  error?: string;
  containerStyle?: ViewStyle;
}

export const PasswordInput: React.FC<PasswordInputProps> = ({
  label = 'Password',
  error,
  containerStyle,
  ...rest
}) => {
  const [showPassword, setShowPassword] = useState(false);

  const toggleVisibility = () => {
    setShowPassword((prev) => !prev);
  };

  return (
    <CustomInput
      label={label}
      error={error}
      secureTextEntry={!showPassword}
      containerStyle={containerStyle}
      leftIcon={
        <MaterialIcons name="lock-outline" size={20} color={Colors.tertiary} />
      }
      rightIcon={
        <TouchableOpacity
          onPress={toggleVisibility}
          style={styles.eyeButton}
          activeOpacity={0.7}
        >
          <MaterialIcons
            name={showPassword ? 'visibility-off' : 'visibility'}
            size={20}
            color={Colors.tertiary}
          />
        </TouchableOpacity>
      }
      {...rest}
    />
  );
};

const styles = StyleSheet.create({
  eyeButton: {
    padding: 4,
  },
});

export default PasswordInput;
