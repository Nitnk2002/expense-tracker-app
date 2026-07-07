import React from 'react';
import { TextInput, TextInputProps, StyleSheet } from 'react-native';
import { rounded, spacing } from '../theme/tokens';
import { useTheme } from '../context/ThemeContext';

interface InputProps extends TextInputProps {
  variant?: 'default' | 'sm' | 'lg';
}

export const Input = ({ variant = 'default', style, ...props }: InputProps) => {
  const { colors, typography } = useTheme();

  const getInputStyle = () => {
    switch (variant) {
      case 'sm':
        return {
          ...typography.bodySm,
          height: 32,
        };
      case 'lg':
        return {
          ...typography.bodyMd,
          height: 48,
        };
      case 'default':
      default:
        return {
          ...typography.bodySm,
          height: 40,
        };
    }
  };

  return (
    <TextInput
      style={[
        {
          backgroundColor: colors.canvas,
          color: colors.ink,
          borderColor: colors.hairline,
          borderWidth: 1,
          borderRadius: rounded.sm,
          paddingHorizontal: spacing.sm,
        },
        getInputStyle(),
        style
      ]}
      placeholderTextColor={colors.mute}
      {...props}
    />
  );
};
