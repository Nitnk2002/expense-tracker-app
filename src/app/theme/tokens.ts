export const lightColors = {
  primary: '#059669', // Rich Emerald Green for money/fintech feel
  onPrimary: '#ffffff',
  ink: '#0f172a', // Deep slate instead of pure black for softer contrast
  body: '#475569', // Slate 600 for body text
  mute: '#94a3b8', // Slate 400 for muted text
  hairline: '#e2e8f0', // Slate 200 for borders
  hairlineStrong: '#cbd5e1', // Slate 300
  canvas: '#ffffff',
  canvasSoft: '#f8fafc', // Slate 50 for very subtle backgrounds
  canvasSoft2: '#f1f5f9', // Slate 100 for slightly deeper backgrounds
  link: '#0284c7', // Sky 600
  linkDeep: '#0369a1',
  success: '#10b981',
  error: '#ef4444',
  errorSoft: '#fee2e2',
  errorDeep: '#b91c1c',
  warning: '#f59e0b',
  text: '#0f172a', // Added for generic text
  border: '#e2e8f0', // Added for generic border
};

export const darkColors = {
  primary: '#10b981', // Slightly brighter emerald for dark mode
  onPrimary: '#ffffff',
  ink: '#f8fafc', // Inverted text
  body: '#cbd5e1', // Slate 300 for body text
  mute: '#64748b', // Slate 500 for muted text
  hairline: '#334155', // Slate 700 for borders
  hairlineStrong: '#475569', // Slate 600
  canvas: '#0f172a', // Deep slate for background
  canvasSoft: '#1e293b', // Slate 800 for slightly elevated backgrounds
  canvasSoft2: '#334155', // Slate 700 for deeper backgrounds
  link: '#38bdf8', // Sky 400
  linkDeep: '#7dd3fc', // Sky 300
  success: '#34d399',
  error: '#f87171',
  errorSoft: '#7f1d1d',
  errorDeep: '#ef4444',
  warning: '#fbbf24',
  text: '#f8fafc',
  border: '#334155',
};

export type ThemeColors = typeof lightColors;
// Fallback for backwards compatibility while migrating
export const colors = lightColors;

export const spacing = {
  xxs: 4,
  xs: 8,
  sm: 12,
  md: 16,
  lg: 24,
  xl: 32,
  '2xl': 40,
  '3xl': 48,
  '4xl': 64,
  '5xl': 96,
  '6xl': 128,
  section: 192,
};

export const rounded = {
  none: 0,
  xs: 4,
  sm: 6,
  md: 8,
  lg: 12,
  xl: 16,
  pillSm: 64,
  pill: 100,
  full: 9999,
};

// We create a function to generate typography styles dynamically based on the active color palette.
export const getTypography = (currentColors: ThemeColors) => ({
  displayLg: {
    fontSize: 32,
    fontWeight: '600' as const,
    lineHeight: 40,
    letterSpacing: -1.28,
    color: currentColors.ink,
  },
  displayMd: {
    fontSize: 24,
    fontWeight: '600' as const,
    lineHeight: 32,
    letterSpacing: -0.96,
    color: currentColors.ink,
  },
  displaySm: {
    fontSize: 20,
    fontWeight: '600' as const,
    lineHeight: 28,
    letterSpacing: -0.6,
    color: currentColors.ink,
  },
  bodyLg: {
    fontSize: 18,
    fontWeight: '400' as const,
    lineHeight: 28,
    letterSpacing: 0,
    color: currentColors.ink,
  },
  bodyMd: {
    fontSize: 16,
    fontWeight: '400' as const,
    lineHeight: 24,
    color: currentColors.ink,
  },
  bodyMdStrong: {
    fontSize: 16,
    fontWeight: '500' as const,
    lineHeight: 24,
    color: currentColors.ink,
  },
  bodySm: {
    fontSize: 14,
    fontWeight: '400' as const,
    lineHeight: 20,
    letterSpacing: -0.28,
    color: currentColors.body,
  },
  bodySmStrong: {
    fontSize: 14,
    fontWeight: '500' as const,
    lineHeight: 20,
    letterSpacing: -0.28,
    color: currentColors.ink,
  },
  caption: {
    fontSize: 12,
    fontWeight: '400' as const,
    lineHeight: 16,
    color: currentColors.body,
  },
  captionMono: {
    fontFamily: 'monospace',
    fontSize: 12,
    fontWeight: '400' as const,
    lineHeight: 16,
    color: currentColors.body,
  },
  code: {
    fontFamily: 'monospace',
    fontSize: 13,
    fontWeight: '400' as const,
    lineHeight: 20,
    color: currentColors.ink,
  },
  buttonMd: {
    fontSize: 14,
    fontWeight: '500' as const,
    lineHeight: 20,
    color: currentColors.onPrimary,
  },
  buttonLg: {
    fontSize: 16,
    fontWeight: '500' as const,
    lineHeight: 24,
    color: currentColors.onPrimary,
  },
});

export const typography = getTypography(lightColors);
