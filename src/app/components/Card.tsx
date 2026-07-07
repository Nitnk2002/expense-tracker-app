import React from 'react';
import { View, StyleSheet, ViewStyle } from 'react-native';
import { rounded, spacing } from '../theme/tokens';
import { useTheme } from '../context/ThemeContext';

interface CardProps {
  children: React.ReactNode;
  style?: ViewStyle;
  variant?: 'marketing' | 'soft' | 'auth';
}

export const Card = ({ children, style, variant = 'marketing' }: CardProps) => {
  const { colors, isDarkMode } = useTheme();

  // Define dynamic styles inline for colors
  const getDynamicStyle = () => {
    const baseStyle = {
      borderColor: colors.hairline,
      borderWidth: 1,
    };

    switch (variant) {
      case 'soft':
        return {
          ...baseStyle,
          backgroundColor: colors.canvasSoft,
          borderRadius: rounded.md,
          padding: spacing.lg,
          elevation: 0,
        };
      case 'auth':
        return {
          ...baseStyle,
          backgroundColor: colors.canvasSoft,
          borderRadius: rounded.lg,
          padding: spacing.xl,
          shadowColor: isDarkMode ? '#fff' : '#000',
          shadowOffset: { width: 0, height: 8 },
          shadowOpacity: isDarkMode ? 0.05 : 0.08,
          shadowRadius: 16,
          elevation: isDarkMode ? 2 : 4,
        };
      case 'marketing':
      default:
        return {
          ...baseStyle,
          backgroundColor: colors.canvas,
          borderRadius: rounded.md,
          padding: spacing.lg,
          shadowColor: isDarkMode ? '#fff' : '#000',
          shadowOffset: { width: 0, height: 4 },
          shadowOpacity: isDarkMode ? 0.05 : 0.08,
          shadowRadius: 12,
          elevation: isDarkMode ? 2 : 4,
        };
    }
  };

  return (
    <View style={[getDynamicStyle(), style]}>
      {children}
    </View>
  );
};
