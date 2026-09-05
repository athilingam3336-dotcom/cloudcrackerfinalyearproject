/**
 * Official Google OAuth Manager using Expo WebBrowser & Google Identity Services (GIS)
 * Official Google Sign-In for Web and Mobile Platforms
 */

import { ENV } from '@/config/env';
import { GoogleAuthPayload } from '@/services/authService';
import { Platform } from 'react-native';
import Constants from 'expo-constants';
import * as WebBrowser from 'expo-web-browser';
import * as AuthSession from 'expo-auth-session';

WebBrowser.maybeCompleteAuthSession();

// OAuth Client IDs
const WEB_CLIENT_ID = '440996806558-b3bfcqr7j19rkiefsaqk2lffshuoh0cm.apps.googleusercontent.com';
const ANDROID_CLIENT_ID = '440996806558-k2ocedpa3p6ccv0m5a891c6fuqh65rqa.apps.googleusercontent.com';

const GOOGLE_CLIENT_ID = Platform.OS === 'web'
  ? (process.env.EXPO_PUBLIC_GOOGLE_CLIENT_ID || WEB_CLIENT_ID)
  : ANDROID_CLIENT_ID;

function parseJwt(token: string): any {
  try {
    const base64Url = token.split('.')[1];
    const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
    const jsonPayload = decodeURIComponent(
      atob(base64)
        .split('')
        .map((c) => '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2))
        .join('')
    );
    return JSON.parse(jsonPayload);
  } catch (e) {
    console.error('Failed to parse Google JWT ID token', e);
    return null;
  }
}

class GoogleAuthManager {
  private activeSuccessCallback: ((payload: GoogleAuthPayload) => Promise<void>) | null = null;
  private activeErrorCallback: ((errorMsg: string) => void) | null = null;

  constructor() {
    if (Platform.OS === 'web' && typeof window !== 'undefined') {
      this.preloadGisScript();
    }
  }

  private preloadGisScript(): void {
    if (typeof window === 'undefined' || typeof document === 'undefined') return;
    if ((window as any).google?.accounts) return;

    const existingScript = document.getElementById('google-gis-sdk');
    if (!existingScript) {
      const script = document.createElement('script');
      script.id = 'google-gis-sdk';
      script.src = 'https://accounts.google.com/gsi/client';
      script.async = true;
      script.defer = true;
      document.head.appendChild(script);
    }
  }

  private async ensureGisLoaded(): Promise<boolean> {
    if (typeof window === 'undefined') return false;
    if ((window as any).google?.accounts) return true;

    return new Promise((resolve) => {
      let attempts = 0;
      const interval = setInterval(() => {
        attempts++;
        if ((window as any).google?.accounts) {
          clearInterval(interval);
          resolve(true);
        } else if (attempts > 30) {
          clearInterval(interval);
          resolve(false);
        }
      }, 100);
    });
  }

  /**
   * Triggers Official Google OAuth Sign-In
   * Uses GIS on Web, and Expo In-App WebBrowser on Mobile App
   */
  async loginWithOfficialGoogle(
    onSuccess: (payload: GoogleAuthPayload) => Promise<void>,
    onError: (errorMsg: string) => void
  ): Promise<void> {
    this.activeSuccessCallback = onSuccess;
    this.activeErrorCallback = onError;

    // --- 1. WEB PLATFORM: Official Google Identity Services (GIS) ---
    if (Platform.OS === 'web' && typeof window !== 'undefined') {
      const isLoaded = await this.ensureGisLoaded();
      const googleObj = (window as any).google;

      if (!isLoaded || !googleObj?.accounts) {
        onError('Google Identity Services script failed to load. Please refresh and try again.');
        return;
      }

      if (googleObj.accounts.id) {
        try {
          googleObj.accounts.id.initialize({
            client_id: GOOGLE_CLIENT_ID,
            callback: async (response: any) => {
              if (response?.credential) {
                const profile = parseJwt(response.credential);
                if (profile && profile.email) {
                  const payload: GoogleAuthPayload = {
                    email: profile.email,
                    fullName: profile.name || profile.given_name || profile.email.split('@')[0],
                    avatarUrl: profile.picture,
                    googleId: profile.sub,
                    idToken: response.credential,
                  };
                  if (this.activeSuccessCallback) {
                    await this.activeSuccessCallback(payload);
                  }
                } else {
                  if (this.activeErrorCallback) {
                    this.activeErrorCallback('Could not parse Google account profile.');
                  }
                }
              }
            },
            auto_select: false,
            use_fedcm_for_prompt: false,
          });

          googleObj.accounts.id.prompt((notification: any) => {
            if (notification.isNotDisplayed() || notification.isSkippedMoment()) {
              console.log('Google prompt notification status:', notification.getNotDisplayedReason?.());
            }
          });
        } catch (e) {
          console.warn('Google ID initialize error:', e);
        }
      }

      if (googleObj.accounts.oauth2) {
        try {
          const tokenClient = googleObj.accounts.oauth2.initTokenClient({
            client_id: GOOGLE_CLIENT_ID,
            scope: 'email profile openid',
            callback: async (tokenResponse: any) => {
              if (tokenResponse.error) {
                if (tokenResponse.error !== 'popup_closed_by_user') {
                  onError(tokenResponse.error_description || tokenResponse.error);
                }
                return;
              }
              if (tokenResponse.access_token) {
                await this.fetchProfileAndComplete(tokenResponse.access_token, onSuccess, onError);
              }
            },
          });
          tokenClient.requestAccessToken({ prompt: 'select_account' });
          return;
        } catch (err: any) {
          console.warn('OAuth2 Token Client error:', err);
        }
      }
      return;
    }

    // --- 2. MOBILE NATIVE PLATFORM: Official In-App WebBrowser Session ---
    try {
      const redirectUri = AuthSession.makeRedirectUri({
        scheme: 'cloudcrackers',
        path: 'auth/google/callback',
      });

      console.log('GOOGLE OAUTH REDIRECT URI IS:', redirectUri);

      // Web Client ID is required for https://accounts.google.com/o/oauth2/v2/auth endpoint
      const clientId = WEB_CLIENT_ID;
      const authUrl = `https://accounts.google.com/o/oauth2/v2/auth?client_id=${clientId}&redirect_uri=${encodeURIComponent(
        redirectUri
      )}&response_type=token&scope=${encodeURIComponent('email profile openid')}&prompt=select_account`;

      const result = await WebBrowser.openAuthSessionAsync(authUrl, redirectUri);

      if (result.type === 'success' && result.url) {
        let accessToken: string | null = null;
        
        // Extract access_token from URL fragment or query string
        if (result.url.includes('#')) {
          const hashString = result.url.split('#')[1];
          const params = new URLSearchParams(hashString);
          accessToken = params.get('access_token');
        } else if (result.url.includes('?')) {
          const queryString = result.url.split('?')[1];
          const params = new URLSearchParams(queryString);
          accessToken = params.get('access_token');
        }

        if (accessToken) {
          await this.fetchProfileAndComplete(accessToken, onSuccess, onError);
          return;
        } else {
          onError('Google Sign-In completed but no access token was returned.');
          return;
        }
      } else if (result.type === 'cancel' || result.type === 'dismiss') {
        // User cancelled official sign in prompt
        return;
      } else {
        onError('Google Sign-In session ended without completing.');
      }
    } catch (err: any) {
      onError('Unable to open official Google Sign-In browser session.');
    }
  }

  /**
   * Fetches user profile from Google UserInfo API using access_token
   */
  async fetchProfileAndComplete(
    accessToken: string,
    onSuccess: (payload: GoogleAuthPayload) => Promise<void>,
    onError: (errorMsg: string) => void
  ): Promise<void> {
    try {
      const res = await fetch('https://www.googleapis.com/oauth2/v3/userinfo', {
        headers: { Authorization: `Bearer ${accessToken}` },
      });
      const profile = await res.json();

      if (!profile || !profile.email) {
        onError('Failed to fetch user email from Google account.');
        return;
      }

      const payload: GoogleAuthPayload = {
        email: profile.email,
        fullName: profile.name || profile.given_name || profile.email.split('@')[0],
        avatarUrl: profile.picture,
        googleId: profile.sub,
        idToken: accessToken,
      };

      await onSuccess(payload);
    } catch (err: any) {
      onError(err.message || 'Error fetching Google user profile.');
    }
  }
}

export const googleAuthService = new GoogleAuthManager();
export default googleAuthService;
