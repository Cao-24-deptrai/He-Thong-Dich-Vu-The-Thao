import { useThemeStore } from '../store/useThemeStore';

export interface ThemePalette {
  mode: 'dark' | 'light';
  background: string;
  surface: string;
  surfaceElevated: string;
  surfaceHover: string;
  border: string;
  borderSubtle: string;
  borderAccent: string;

  // Brand accents (Pitch Neon Lime / Forest Green + Burnt Orange)
  accent: string;
  onAccent: string;
  accentSoft: string;
  accentSecondary: string;
  onAccentSecondary: string;
  accentSecondarySoft: string;

  // Semantic statuses (WCAG AA compliant)
  success: string;
  successSoft: string;
  warning: string;
  warningSoft: string;
  danger: string;
  dangerSoft: string;
  info: string;
  infoSoft: string;

  // Typography
  textPrimary: string;
  textHeading: string;
  textSecondary: string;
  textMuted: string;

  // Input & Controls
  inputBg: string;
  inputBorder: string;
  inputBorderFocus: string;
  placeholder: string;
  scrim: string;

  // Sports 2D Pitch Palettes
  pitchGrassDark: string;
  pitchGrassLight: string;
  pitchLine: string;
  courtBadminton: string;
  courtPickleball: string;
  esportsDark: string;

  // Legacy aliases for smooth compatibility
  card: string;
  surfaceLight: string;
  primary: string;
  primaryText: string;
  volt: string;
  successBg: string;
  warningBg: string;
  dangerBg: string;
  borderLight: string;
}

export const darkTheme: ThemePalette = {
  mode: 'dark',
  background: '#0F1110',
  surface: '#171A18',
  surfaceElevated: '#202421',
  surfaceHover: '#262B27',
  border: 'rgba(255, 255, 255, 0.10)',
  borderSubtle: 'rgba(255, 255, 255, 0.06)',
  borderAccent: 'rgba(156, 255, 147, 0.35)',

  accent: '#9CFF93',
  onAccent: '#111412',
  accentSoft: 'rgba(156, 255, 147, 0.14)',
  accentSecondary: '#EA580C',
  onAccentSecondary: '#FFFFFF',
  accentSecondarySoft: 'rgba(234, 88, 12, 0.16)',

  success: '#34D399',
  successSoft: 'rgba(52, 211, 153, 0.14)',
  warning: '#FBBF24',
  warningSoft: 'rgba(251, 191, 36, 0.14)',
  danger: '#F87171',
  dangerSoft: 'rgba(248, 113, 113, 0.14)',
  info: '#38BDF8',
  infoSoft: 'rgba(56, 189, 248, 0.14)',

  textPrimary: '#F3F4F6',
  textHeading: '#FFFFFF',
  textSecondary: '#A1A79F',
  textMuted: '#787E76',

  inputBg: '#1B1F1C',
  inputBorder: 'rgba(255, 255, 255, 0.14)',
  inputBorderFocus: '#9CFF93',
  placeholder: '#787E76',
  scrim: 'rgba(0, 0, 0, 0.72)',

  pitchGrassDark: '#14532D',
  pitchGrassLight: '#166534',
  pitchLine: 'rgba(255, 255, 255, 0.45)',
  courtBadminton: '#0369A1',
  courtPickleball: '#0F766E',
  esportsDark: '#111318',

  card: '#171A18',
  surfaceLight: '#202421',
  primary: '#9CFF93',
  primaryText: '#111412',
  volt: '#9CFF93',
  successBg: 'rgba(52, 211, 153, 0.14)',
  warningBg: 'rgba(251, 191, 36, 0.14)',
  dangerBg: 'rgba(248, 113, 113, 0.14)',
  borderLight: 'rgba(255, 255, 255, 0.14)',
};

export const lightTheme: ThemePalette = {
  mode: 'light',
  background: '#F4F6F4',
  surface: '#FFFFFF',
  surfaceElevated: '#EDF2EE',
  surfaceHover: '#E2EBE4',
  border: 'rgba(15, 23, 42, 0.10)',
  borderSubtle: 'rgba(15, 23, 42, 0.06)',
  borderAccent: 'rgba(22, 163, 74, 0.35)',

  accent: '#16A34A',
  onAccent: '#FFFFFF',
  accentSoft: 'rgba(22, 163, 74, 0.10)',
  accentSecondary: '#C2410C',
  onAccentSecondary: '#FFFFFF',
  accentSecondarySoft: 'rgba(194, 65, 12, 0.10)',

  success: '#15803D',
  successSoft: 'rgba(21, 128, 61, 0.10)',
  warning: '#B45309',
  warningSoft: 'rgba(180, 83, 9, 0.12)',
  danger: '#DC2626',
  dangerSoft: 'rgba(220, 38, 38, 0.10)',
  info: '#0369A1',
  infoSoft: 'rgba(3, 105, 161, 0.10)',

  textPrimary: '#1E293B',
  textHeading: '#0B0E0B',
  textSecondary: '#475569',
  textMuted: '#64748B',

  inputBg: '#F8FAF8',
  inputBorder: '#CBD5E1',
  inputBorderFocus: '#16A34A',
  placeholder: '#64748B',
  scrim: 'rgba(15, 23, 42, 0.55)',

  pitchGrassDark: '#15803D',
  pitchGrassLight: '#16A34A',
  pitchLine: 'rgba(255, 255, 255, 0.55)',
  courtBadminton: '#0284C7',
  courtPickleball: '#0D9488',
  esportsDark: '#1E293B',

  card: '#FFFFFF',
  surfaceLight: '#EDF2EE',
  primary: '#16A34A',
  primaryText: '#FFFFFF',
  volt: '#16A34A',
  successBg: 'rgba(21, 128, 61, 0.10)',
  warningBg: 'rgba(180, 83, 9, 0.12)',
  dangerBg: 'rgba(220, 38, 38, 0.10)',
  borderLight: 'rgba(15, 23, 42, 0.14)',
};

export const fonts = {
  headingRegular: 'Barlow_500Medium',
  heading: 'Barlow_600SemiBold',
  headingBold: 'Barlow_700Bold',
  body: 'Lexend_400Regular',
  bodyMedium: 'Lexend_500Medium',
  bodySemiBold: 'Lexend_600SemiBold',
} as const;

export const spacing = {
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 20,
  xxl: 24,
  xxxl: 32,
} as const;

export const radius = {
  sm: 8,
  md: 12,
  lg: 16,
  xl: 20,
  pill: 9999,
} as const;

export function useTheme(): ThemePalette {
  const mode = useThemeStore((s) => s.mode);
  return mode === 'light' ? lightTheme : darkTheme;
}

// Default export for static references
export const colors = darkTheme;
