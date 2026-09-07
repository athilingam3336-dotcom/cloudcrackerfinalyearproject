import { useUiStore } from '@/store/uiStore';

// Light Mode Theme Palette
export const LightColors = {
  primary: '#b7102a',
  onPrimary: '#ffffff',
  primaryContainer: '#db313f',
  onPrimaryContainer: '#fffbff',
  primaryFixed: '#ffdad8',
  primaryFixedDim: '#ffb3b1',
  onPrimaryFixed: '#410007',
  onPrimaryFixedVariant: '#92001c',
  inversePrimary: '#ffb3b1',

  secondary: '#825500',
  onSecondary: '#ffffff',
  secondaryContainer: '#ffae1d',
  onSecondaryContainer: '#6b4500',
  secondaryFixed: '#ffddb3',
  secondaryFixedDim: '#ffb950',
  onSecondaryFixed: '#291800',
  onSecondaryFixedVariant: '#624000',

  tertiary: '#5b5c60',
  onTertiary: '#ffffff',
  tertiaryContainer: '#747479',
  onTertiaryContainer: '#fefcff',
  tertiaryFixed: '#e3e2e7',
  tertiaryFixedDim: '#c7c6cb',
  onTertiaryFixed: '#1a1b1f',
  onTertiaryFixedVariant: '#46464b',

  background: '#f8f9fa',
  onBackground: '#191c1d',
  surface: '#f8f9fa',
  onSurface: '#191c1d',
  surfaceDim: '#d9dadb',
  surfaceBright: '#f8f9fa',
  surfaceContainerLowest: '#ffffff',
  surfaceContainerLow: '#f3f4f5',
  surfaceContainer: '#edeeef',
  surfaceContainerHigh: '#e7e8e9',
  surfaceContainerHighest: '#e1e3e4',
  surfaceVariant: '#e1e3e4',
  onSurfaceVariant: '#5b403f',
  inverseSurface: '#2e3132',
  inverseOnSurface: '#f0f1f2',

  outline: '#8f6f6e',
  outlineVariant: '#e4bebc',
  surfaceTint: '#bb152c',

  error: '#ba1a1a',
  onError: '#ffffff',
  errorContainer: '#ffdad6',
  onErrorContainer: '#93000a',

  splashBackground: '#1D1E22',
  darkCard: '#25262B',
  borderLight: '#e4bebc',
  shadowColor: 'rgba(0,0,0,0.08)',
};

// Dark Mode Theme Palette
export const DarkColors = {
  primary: '#e63946',
  onPrimary: '#ffffff',
  primaryContainer: '#b7102a',
  onPrimaryContainer: '#ffffff',
  primaryFixed: '#ffdad8',
  primaryFixedDim: '#ffb3b1',
  onPrimaryFixed: '#410007',
  onPrimaryFixedVariant: '#92001c',
  inversePrimary: '#ffb3b1',

  secondary: '#ffae1d',
  onSecondary: '#191c1d',
  secondaryContainer: '#ffae1d',
  onSecondaryContainer: '#191c1d',
  secondaryFixed: '#ffddb3',
  secondaryFixedDim: '#ffb950',
  onSecondaryFixed: '#291800',
  onSecondaryFixedVariant: '#624000',

  tertiary: '#9ca3af',
  onTertiary: '#121316',
  tertiaryContainer: '#4b5563',
  onTertiaryContainer: '#f3f4f6',
  tertiaryFixed: '#374151',
  tertiaryFixedDim: '#1f2937',
  onTertiaryFixed: '#f9fafb',
  onTertiaryFixedVariant: '#d1d5db',

  background: '#121316',
  onBackground: '#f3f4f6',
  surface: '#121316',
  onSurface: '#f3f4f6',
  surfaceDim: '#1a1b1e',
  surfaceBright: '#24252a',
  surfaceContainerLowest: '#1c1d22',
  surfaceContainerLow: '#24252a',
  surfaceContainer: '#2b2c32',
  surfaceContainerHigh: '#33343c',
  surfaceContainerHighest: '#3b3c46',
  surfaceVariant: '#2b2c32',
  onSurfaceVariant: '#d1d5db',
  inverseSurface: '#f3f4f6',
  inverseOnSurface: '#121316',

  outline: '#4b5563',
  outlineVariant: '#374151',
  surfaceTint: '#e63946',

  error: '#f87171',
  onError: '#ffffff',
  errorContainer: '#7f1d1d',
  onErrorContainer: '#fca5a5',

  splashBackground: '#0d0e11',
  darkCard: '#1c1d22',
  borderLight: '#374151',
  shadowColor: 'rgba(0,0,0,0.5)',
};

// Dynamic Colors Proxy
export const Colors = new Proxy(LightColors, {
  get(target, prop: keyof typeof LightColors) {
    try {
      const isDark = useUiStore.getState().isDarkMode;
      const palette = isDark ? DarkColors : LightColors;
      return palette[prop] !== undefined ? palette[prop] : target[prop];
    } catch {
      return target[prop];
    }
  },
});
