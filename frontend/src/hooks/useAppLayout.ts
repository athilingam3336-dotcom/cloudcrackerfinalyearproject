import { Platform, useWindowDimensions } from 'react-native';
import { BREAKPOINTS } from '@/constants/responsive';

export interface AppLayoutInfo {
  platform: typeof Platform.OS;
  isWeb: boolean;
  isNative: boolean;
  width: number;
  height: number;
  isMobileWeb: boolean;
  isTabletWeb: boolean;
  isDesktopWeb: boolean;
  isWideDesktopWeb: boolean;
  isSmallScreen: boolean;
  isTabletNative: boolean;
  numGridColumns: number;
}

export function useAppLayout(): AppLayoutInfo {
  const { width, height } = useWindowDimensions();
  const platform = Platform.OS;

  const isWeb = platform === 'web';
  const isNative = platform === 'android' || platform === 'ios';

  const isMobileWeb = isWeb && width < BREAKPOINTS.tablet;
  const isTabletWeb = isWeb && width >= BREAKPOINTS.tablet && width < BREAKPOINTS.desktop;
  const isDesktopWeb = isWeb && width >= BREAKPOINTS.desktop;
  const isWideDesktopWeb = isWeb && width >= BREAKPOINTS.wideDesktop;

  const isSmallScreen = width < BREAKPOINTS.mobileMedium;
  const isTabletNative = isNative && width >= BREAKPOINTS.tablet;

  let numGridColumns = 2;
  if (isNative) {
    numGridColumns = isTabletNative ? 3 : 2;
  } else {
    if (isWideDesktopWeb) {
      numGridColumns = 5;
    } else if (isDesktopWeb) {
      numGridColumns = 4;
    } else if (isTabletWeb) {
      numGridColumns = 3;
    } else {
      numGridColumns = 2;
    }
  }

  return {
    platform,
    isWeb,
    isNative,
    width,
    height,
    isMobileWeb,
    isTabletWeb,
    isDesktopWeb,
    isWideDesktopWeb,
    isSmallScreen,
    isTabletNative,
    numGridColumns,
  };
}

export const useResponsive = useAppLayout;
export default useAppLayout;
