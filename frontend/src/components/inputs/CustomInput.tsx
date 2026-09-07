import React from 'react';
import {
  View,
  TextInput,
  Text,
  StyleSheet,
  TextInputProps,
  ViewStyle,
} from 'react-native';
import { Colors } from '@/constants/colors';
import { Typography } from '@/constants/typography';
import { BorderRadius, Spacing } from '@/constants/spacing';

interface CustomInputProps extends TextInputProps {
  label?: string;
  error?: string;
  leftIcon?: React.ReactNode;
  rightIcon?: React.ReactNode;
  containerStyle?: ViewStyle;
}

export const CustomInput: React.FC<CustomInputProps> = ({
  label,
  error,
  leftIcon,
  rightIcon,
  containerStyle,
  style,
  ...rest
}) => {
  return (
    <View style={[styles.container, containerStyle]}>
      {label && <Text style={styles.label}>{label}</Text>}
      <View
        style={[
          styles.inputWrapper,
          rest.multiline && styles.multilineWrapper,
          !!error && styles.inputError,
        ]}
      >
        {leftIcon}
        <TextInput
          style={[styles.input, rest.multiline && styles.multilineInput, style]}
          placeholderTextColor={Colors.outline}
          {...rest}
        />
        {rightIcon}
      </View>
      {error && <Text style={styles.errorText}>{error}</Text>}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    marginBottom: Spacing.sm,
    width: '100%',
  },
  label: {
    ...Typography.bodyMd,
    fontWeight: '500',
    color: Colors.onBackground,
    marginBottom: Spacing.xs,
  },
  inputWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    height: 48,
    backgroundColor: Colors.surfaceContainerLow,
    borderRadius: BorderRadius.default,
    borderWidth: 1,
    borderColor: Colors.surfaceContainerHigh,
    paddingHorizontal: Spacing.sm,
    gap: Spacing.xs,
  },
  multilineWrapper: {
    height: undefined,
    minHeight: 48,
    alignItems: 'flex-start',
    paddingVertical: Spacing.xs,
  },
  inputError: {
    borderColor: Colors.error,
  },
  input: {
    flex: 1,
    height: '100%',
    ...Typography.bodyLg,
    color: Colors.onBackground,
  },
  multilineInput: {
    height: undefined,
    minHeight: 40,
    textAlignVertical: 'top',
  },
  errorText: {
    ...Typography.labelLg,
    color: Colors.error,
    marginTop: 2,
  },
});

export default CustomInput;
