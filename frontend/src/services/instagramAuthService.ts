/**
 * Instagram Auth Service
 * Manages Instagram OAuth accounts, sample handles, and localStorage persistence.
 */

import { InstagramAuthPayload } from '@/services/authService';
import { ENV } from '@/config/env';

export interface SavedInstagramAccount {
  username: string;
  name: string;
  avatarUrl?: string;
  lastUsed?: number;
}

const STORAGE_KEY_INSTAGRAM_ACCOUNTS = 'cc_saved_instagram_accounts';

const DEFAULT_INSTAGRAM_ACCOUNTS: SavedInstagramAccount[] = [
  {
    username: 'athi_official',
    name: 'Athilingam',
    avatarUrl: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=150&q=80',
  },
  {
    username: 'meeracrackers_official',
    name: 'Meera Crackers Official',
    avatarUrl: 'https://images.unsplash.com/photo-1570295999919-56ceb5ecca61?auto=format&fit=crop&w=150&q=80',
  },
  {
    username: 'pyro_explorer',
    name: 'Pyro Explorer',
    avatarUrl: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&w=150&q=80',
  },
];

class InstagramAuthManager {
  getAuthorizationUrl(customRedirectUri?: string): string {
    const clientId = ENV.INSTAGRAM_CLIENT_ID || '2262885951230627';
    const redirectUri = encodeURIComponent(
      customRedirectUri ||
        (typeof window !== 'undefined' && window.location?.origin
          ? window.location.origin
          : 'https://cloudcrackerfinalyearproject-1.onrender.com')
    );
    return `https://api.instagram.com/oauth/authorize?client_id=${clientId}&redirect_uri=${redirectUri}&scope=user_profile,user_media&response_type=code`;
  }

  getSavedAccounts(): SavedInstagramAccount[] {
    try {
      if (typeof window !== 'undefined' && window.localStorage) {
        const stored = window.localStorage.getItem(STORAGE_KEY_INSTAGRAM_ACCOUNTS);
        if (stored) {
          const parsed = JSON.parse(stored);
          if (Array.isArray(parsed) && parsed.length > 0) {
            return parsed;
          }
        }
      }
    } catch {}
    return DEFAULT_INSTAGRAM_ACCOUNTS;
  }

  async triggerNativeInstagramPopup(
    onSuccess: (payload: InstagramAuthPayload) => void,
    onError: (error: string) => void
  ): Promise<boolean> {
    const clientId = ENV.INSTAGRAM_CLIENT_ID || '2262885951230627';
    if (!clientId) return false;
    if (typeof window === 'undefined') return false;

    try {
      const redirectUri = encodeURIComponent(
        window.location.origin || 'https://cloudcrackerfinalyearproject-1.onrender.com'
      );
      const authUrl = this.getAuthorizationUrl(
        window.location.origin || 'https://cloudcrackerfinalyearproject-1.onrender.com'
      );

      const width = 600;
      const height = 700;
      const left = window.screen.width / 2 - width / 2;
      const top = window.screen.height / 2 - height / 2;

      const popup = window.open(
        authUrl,
        'InstagramOAuth',
        `width=${width},height=${height},top=${top},left=${left},scrollbars=yes,resizable=yes`
      );

      if (!popup) {
        return false;
      }

      return true;
    } catch (err: any) {
      console.warn('Instagram popup launch error:', err);
      return false;
    }
  }

  saveAccountToRecent(account: SavedInstagramAccount) {
    try {
      const current = this.getSavedAccounts();
      const filtered = current.filter(
        (a) => a.username.toLowerCase() !== account.username.toLowerCase()
      );
      const updated = [{ ...account, lastUsed: Date.now() }, ...filtered].slice(0, 8);

      if (typeof window !== 'undefined' && window.localStorage) {
        window.localStorage.setItem(
          STORAGE_KEY_INSTAGRAM_ACCOUNTS,
          JSON.stringify(updated)
        );
      }
    } catch {}
  }
}

export const instagramAuthService = new InstagramAuthManager();
export default instagramAuthService;
