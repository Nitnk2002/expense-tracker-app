import React from 'react';
import { TouchableOpacity, Text, StyleSheet, ViewStyle, TextStyle } from 'react-native';
import { rounded, spacing } from '../theme/tokens';
import { useTheme } from '../context/ThemeContext';

interface ButtonProps {
  title: string;
  onPress: () => void;
  variant?: 'primary' | 'secondary' | 'primary-sm' | 'secondary-sm';
  style?: ViewStyle;
  disabled?: boolean;
}

export const Button = ({ title, onPress, variant = 'primary', style, disabled }: ButtonProps) => {
  const { colors, typography } = useTheme();

  const getButtonStyle = (): ViewStyle => {
    switch (variant) {
      case 'secondary':
        return {
          backgroundColor: colors.canvas,
          borderRadius: rounded.pill,
          paddingHorizontal: spacing.sm,
          paddingVertical: spacing.sm,
          borderWidth: 1,
          borderColor: colors.hairlineStrong,
        };
      case 'primary-sm':
        return {
          backgroundColor: colors.primary,
          borderRadius: rounded.pill,
          paddingHorizontal: spacing.xs,
          paddingVertical: spacing.xs,
        };
      case 'secondary-sm':
        return {
          backgroundColor: colors.canvas,
          borderRadius: rounded.pill,
          paddingHorizontal: spacing.xs,
          paddingVertical: spacing.xs,
          borderWidth: 1,
          borderColor: colors.hairlineStrong,
        };
      case 'primary':
      default:
        return {
          backgroundColor: colors.primary,
          borderRadius: rounded.pill,
          paddingHorizontal: spacing.sm,
          paddingVertical: spacing.sm,
        };
    }
  };

  const getTextStyle = (): TextStyle => {
    switch (variant) {
      case 'secondary':
        return {
          ...typography.buttonLg,
          color: colors.ink,
        };
      case 'primary-sm':
        return {
          ...typography.buttonMd,
          color: colors.onPrimary,
        };
      case 'secondary-sm':
        return {
          ...typography.buttonMd,
          color: colors.ink,
        };
      case 'primary':
      default:
        return {
          ...typography.buttonLg,
          color: colors.onPrimary,
        };
    }
  };

  return (
    <TouchableOpacity
      style={[styles.base, getButtonStyle(), disabled && styles.disabled, style]}
      onPress={onPress}
      disabled={disabled}
      activeOpacity={0.8}
    >
      <Text style={getTextStyle()}>{title}</Text>
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  base: {
    justifyContent: 'center',
    alignItems: 'center',
    flexDirection: 'row',
  },
  disabled: {
    opacity: 0.5,
  },
});
