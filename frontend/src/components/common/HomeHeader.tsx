import React from 'react';
import { useAppLayout } from '@/hooks/useAppLayout';
import { WebDesktopHeader } from './WebDesktopHeader';
import { WebMobileHeader } from './WebMobileHeader';
import { NativeMobileHeader } from './NativeMobileHeader';

export interface HomeHeaderProps {
  onNotificationPress: () => void;
  onProfilePress: () => void;
  onCartPress: () => void;
  onWishlistPress?: () => void;
  onBackPress?: () => void;
  onLogoPress?: () => void;
  onNavigateTab?: (tab: string) => void;
  notificationCount?: number;
  userName?: string;
  avatarUrl?: string;
}

export const HomeHeader: React.FC<HomeHeaderProps> = React.memo((props) => {
  const { isNative, isDesktopWeb } = useAppLayout();

  if (isNative) {
    return <NativeMobileHeader {...props} />;
  }

  if (isDesktopWeb) {
    return <WebDesktopHeader {...props} />;
  }

  return <WebMobileHeader {...props} />;
});

export default HomeHeader;
