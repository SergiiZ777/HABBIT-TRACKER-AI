import '@/global.css';

import { Platform } from 'react-native';

export const Colors = {
  light: {
    text: '#16151A',
    textSecondary: '#6E6B76',
    background: '#F6F5F1',
    backgroundElement: '#FFFFFF',
    backgroundSelected: '#ECEAE4',
    border: '#E7E5DF',
    accent: '#5B5BF7',
    onAccent: '#FFFFFF',
  },
  dark: {
    text: '#F4F3F7',
    textSecondary: '#9A97A3',
    background: '#0E0E12',
    backgroundElement: '#19191F',
    backgroundSelected: '#26262E',
    border: '#2A2A32',
    accent: '#8B8BFF',
    onAccent: '#0E0E12',
  },
} as const;

export type ThemeColor = keyof typeof Colors.light & keyof typeof Colors.dark;

/** Colors a user can pick for a habit. Chosen to read well on both light and dark cards. */
export const HabitColors = ['#5B5BF7', '#F2994A', '#27AE60', '#EB5757', '#2D9CDB', '#BB6BD9', '#E0A800'] as const;

export const HabitEmojis = ['💧', '🏃', '📚', '🧘', '🥗', '😴', '✍️', '💪', '🚭', '🎯', '🌞', '💊'] as const;

export const Fonts = Platform.select({
  ios: {
    sans: 'system-ui',
    serif: 'ui-serif',
    rounded: 'ui-rounded',
    mono: 'ui-monospace',
  },
  default: {
    sans: 'normal',
    serif: 'serif',
    rounded: 'normal',
    mono: 'monospace',
  },
  web: {
    sans: 'var(--font-display)',
    serif: 'var(--font-serif)',
    rounded: 'var(--font-rounded)',
    mono: 'var(--font-mono)',
  },
});

export const Spacing = {
  half: 2,
  one: 4,
  two: 8,
  three: 16,
  four: 24,
  five: 32,
  six: 64,
} as const;

export const Radius = {
  sm: 12,
  md: 18,
  lg: 24,
  pill: 999,
} as const;

export const BottomTabInset = Platform.select({ ios: 50, android: 80 }) ?? 0;
export const MaxContentWidth = 800;
