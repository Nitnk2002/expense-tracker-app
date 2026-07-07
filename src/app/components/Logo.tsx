import React from 'react';
import { View, StyleSheet } from 'react-native';
import Svg, { Rect } from 'react-native-svg';
import { Typography } from './Typography';
import { spacing } from '../theme/tokens';
import { useTheme } from '../context/ThemeContext';

interface LogoProps {
  size?: number;
  showText?: boolean;
  style?: any;
  color?: string;
}

export const Logo = ({ size = 64, showText = true, style, color }: LogoProps) => {
  const { colors } = useTheme();

  const fill = color || colors.primary;

  return (
    <View style={[styles.logoContainer, style]}>
      <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
        <Rect x="3" y="14" width="4" height="7" rx="1" fill={fill} />
        <Rect x="10" y="9" width="4" height="12" rx="1" fill={fill} />
        <Rect x="17" y="3" width="4" height="18" rx="1" fill={fill} />
      </Svg>
      {showText && (
        <Typography variant="bodyMdStrong" style={[styles.appName, { color: fill }]}>
          Expense AI
        </Typography>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  logoContainer: {
    alignItems: 'center',
    marginBottom: spacing.xl,
  },
  appName: {
    marginTop: spacing.sm,
    letterSpacing: 1.5,
    textTransform: 'uppercase',
  },
});
