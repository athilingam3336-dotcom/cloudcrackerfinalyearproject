/**
 * Google Auth Service
 * Supports:
 * 1. Google Identity Services (GIS) Web OAuth2 Token Client Popup (prompt: 'select_account')
 *    which opens Google's native popup listing all signed-in Gmail accounts on the user's browser/system.
 * 2. System / Saved Account Picker fallback with custom Gmail entry and localStorage persistence.
 */

import { ENV } from '@/config/env';
import { GoogleAuthPayload } from '@/services/authService';

export interface SavedGoogleAccount {
  email: string;
  name: string;
  avatarUrl?: string;
  lastUsed?: number;
}

const STORAGE_KEY_GOOGLE_ACCOUNTS = 'cc_saved_google_accounts';

const DEFAULT_SYSTEM_ACCOUNTS: SavedGoogleAccount[] = [
  {
    email: 'athi@gmail.com',
    name: 'Athi',
    avatarUrl: 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?auto=format&fit=crop&w=150&q=80',
  },
  {
    email: 'athi.dev@gmail.com',
    name: 'Athi (Developer)',
    avatarUrl: 'https://images.unsplash.com/photo-1570295999919-56ceb5ecca61?auto=format&fit=crop&w=150&q=80',
  },
  {
    email: 'Meeracrackers@gmail.com',
    name: 'Meera Crackers User',
    avatarUrl: 'https://images.unsplash.com/photo-1580489944761-15a19d654956?auto=format&fit=crop&w=150&q=80',
  },
];

class GoogleAuthManager {
  private gisLoaded = false;

  /**
   * Dynamically loads the Google Identity Services SDK on Web if not already present
   */
  async loadGoogleGisScript(): Promise<boolean> {
    if (typeof window === 'undefined' || typeof document === 'undefined') {
      return false;
    }

    if ((window as any).google?.accounts?.oauth2) {
      this.gisLoaded = true;
      return true;
    }

    return new Promise((resolve) => {
      const existingScript = document.getElementById('google-gis-sdk');
      if (existingScript) {
        existingScript.onload = () => {
          this.gisLoaded = true;
          resolve(true);
        };
        return;
      }

      const script = document.createElement('script');
      script.id = 'google-gis-sdk';
      script.src = 'https://accounts.google.com/gsi/client';
      script.async = true;
      script.defer = true;
      script.onload = () => {
        this.gisLoaded = true;
        resolve(true);
      };
      script.onerror = () => {
        resolve(false);
      };
      document.head.appendChild(script);
    });
  }

  /**
   * Initializes Google OAuth Token Client with 'select_account' prompt
   */
  async triggerNativeGooglePopup(
    onSuccess: (payload: GoogleAuthPayload) => void,
    onError: (error: string) => void
  ): Promise<boolean> {
    const clientId = ENV.GOOGLE_CLIENT_ID || '440996806558-b3bfcqr7j19rkiefsaqk2lffshuoh0cm.apps.googleusercontent.com';
    if (!clientId) {
      return false;
    }

    try {
      const loaded = await this.loadGoogleGisScript();
      if (!loaded || !(window as any).google?.accounts?.oauth2) {
        return false;
      }

      const tokenClient = (window as any).google.accounts.oauth2.initTokenClient({
        client_id: clientId,
        scope: 'email profile openid',
        prompt: 'select_account',
        callback: async (tokenResponse: any) => {
          if (tokenResponse.error) {
            onError(tokenResponse.error_description || tokenResponse.error);
            return;
          }

          try {
            // Fetch User profile info from Google UserInfo endpoint
            const res = await fetch('https://www.googleapis.com/oauth2/v3/userinfo', {
              headers: { Authorization: `Bearer ${tokenResponse.access_token}` },
            });
            const profile = await res.json();

            const payload: GoogleAuthPayload = {
              email: profile.email,
              fullName: profile.name || profile.given_name,
              avatarUrl: profile.picture,
              googleId: profile.sub,
              idToken: tokenResponse.id_token,
            };

            this.saveAccountToRecent({
              email: payload.email,
              name: payload.fullName || payload.email.split('@')[0],
              avatarUrl: payload.avatarUrl,
              lastUsed: Date.now(),
            });

            onSuccess(payload);
          } catch (err: any) {
            onError(err.message || 'Failed to retrieve Google profile data.');
          }
        },
      });

      tokenClient.requestAccessToken({ prompt: 'select_account' });
      return true;
    } catch (err: any) {
      console.warn('Google GIS native popup error:', err);
      return false;
    }
  }

  /**
   * Retrieves saved/system Google accounts from localStorage
   */
  getSavedAccounts(): SavedGoogleAccount[] {
    try {
      if (typeof window !== 'undefined' && window.localStorage) {
        const stored = window.localStorage.getItem(STORAGE_KEY_GOOGLE_ACCOUNTS);
        if (stored) {
          const parsed = JSON.parse(stored);
          if (Array.isArray(parsed) && parsed.length > 0) {
            return parsed;
          }
        }
      }
    } catch {}
    return DEFAULT_SYSTEM_ACCOUNTS;
  }

  /**
   * Adds or bumps a chosen Google account to the top of recent accounts list
   */
  saveAccountToRecent(account: SavedGoogleAccount) {
    try {
      const current = this.getSavedAccounts();
      const filtered = current.filter((a) => a.email.toLowerCase() !== account.email.toLowerCase());
      const updated = [{ ...account, lastUsed: Date.now() }, ...filtered].slice(0, 8);

      if (typeof window !== 'undefined' && window.localStorage) {
        window.localStorage.setItem(STORAGE_KEY_GOOGLE_ACCOUNTS, JSON.stringify(updated));
      }
    } catch {}
  }
}

export const googleAuthService = new GoogleAuthManager();
export default googleAuthService;
