import React from 'react';
import { Text, TextProps } from 'react-native';
import { useTheme } from '../context/ThemeContext';
import { getTypography } from '../theme/tokens';

interface TypographyProps extends TextProps {
  variant?: keyof ReturnType<typeof getTypography>;
  children: React.ReactNode;
}

export const Typography = ({ variant = 'bodyMd', style, children, ...props }: TypographyProps) => {
  const { typography } = useTheme();
  
  return (
    <Text style={[typography[variant], style]} {...props}>
      {children}
    </Text>
  );
};
