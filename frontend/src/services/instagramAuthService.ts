/**
 * Instagram Auth Service
 * Manages Instagram OAuth accounts, sample handles, and localStorage persistence.
 */

import { InstagramAuthPayload } from '@/services/authService';

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
    username: 'cloudcrackers_app',
    name: 'CloudCrackers Official',
    avatarUrl: 'https://images.unsplash.com/photo-1570295999919-56ceb5ecca61?auto=format&fit=crop&w=150&q=80',
  },
  {
    username: 'pyro_explorer',
    name: 'Pyro Explorer',
    avatarUrl: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&w=150&q=80',
  },
];

class InstagramAuthManager {
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
