/**
 * Clerk Google OAuth Manager
 *
 * Replaces the previous manual GIS / Expo-WebBrowser token acquisition layer.
 * Clerk handles the OAuth popup/redirect; once complete we:
 *   1. Activate the Clerk session.
 *   2. Obtain a short-lived Clerk session JWT via getToken().
 *   3. Forward that token to POST /auth/google as id_token.
 *
 * The backend verifies the Clerk JWT signature against Clerk's public JWKS
 * endpoint, then extracts the verified identity from the token payload.
 * No client-supplied email is trusted by the backend.
 *
 * No Clerk secret keys are used here. Only the publishable key (safe to bundle).
 */

import { useOAuth, useAuth } from '@clerk/expo';
import { useCallback } from 'react';
import { GoogleAuthPayload } from '@/services/authService';

export type GoogleSuccessCallback = (payload: GoogleAuthPayload) => Promise<void>;
export type GoogleErrorCallback = (errorMsg: string) => void;

/**
 * React hook that returns a `loginWithGoogle` function.
 * Must be called inside a component that is a descendant of <ClerkProvider>.
 *
 * Drop-in replacement for the old googleAuthService.loginWithOfficialGoogle():
 *   const { loginWithGoogle } = useClerkGoogleLogin();
 *   await loginWithGoogle(onSuccess, onError);
 */
export function useClerkGoogleLogin() {
  const { startOAuthFlow } = useOAuth({ strategy: 'oauth_google' });
  const { signOut, getToken } = useAuth();

  const loginWithGoogle = useCallback(
    async (
      onSuccess: GoogleSuccessCallback,
      onError: GoogleErrorCallback
    ): Promise<void> => {
      try {
        // Clear any previous Clerk session state so it doesn't complain "You're already signed in"
        await signOut();

        const result = await startOAuthFlow();

        // User cancelled or the flow never completed — silently exit
        if (!result) return;

        const { createdSessionId, setActive, signIn, signUp } = result;

        // Activate the session if Clerk returned a session ID
        if (setActive && createdSessionId) {
          await setActive({ session: createdSessionId });
        }

        // --- Obtain a signed Clerk session JWT ---
        // This is cryptographically signed by Clerk's private key.
        // The backend verifies it against Clerk's public JWKS endpoint.
        // This is the ONLY trusted identity proof sent to the backend.
        const clerkSessionToken = await getToken();

        if (!clerkSessionToken) {
          onError(
            'Google Sign-In completed but no session token was returned. Please try again.'
          );
          return;
        }

        // --- Extract profile hints from Clerk resource (display only, NOT used as identity proof) ---
        const userData = (signIn as any)?.userData ?? (signUp as any)?.userData;

        const extAccounts: any[] =
          (signUp as any)?.verifications?.externalAccount
            ? [(signUp as any).verifications.externalAccount]
            : (signIn as any)?.supportedExternalProviders ?? [];
        const googleAccount = extAccounts.find?.(
          (a: any) => a?.strategy === 'oauth_google' || a?.provider === 'google'
        );

        // Full name — compose from first/last, fall back to username or email prefix
        const firstName: string = userData?.firstName ?? googleAccount?.firstName ?? '';
        const lastName: string = userData?.lastName ?? googleAccount?.lastName ?? '';
        const fullName: string =
          [firstName, lastName].filter(Boolean).join(' ').trim() ||
          userData?.username ||
          '';

        // Avatar hint (not trusted by backend as identity proof)
        const avatarUrl: string | undefined =
          userData?.imageUrl ?? googleAccount?.imageUrl ?? undefined;

        // Build the GoogleAuthPayload — id_token carries the verified identity.
        // The backend extracts email / sub from the verified token, ignoring any
        // client-supplied email field.
        const payload: GoogleAuthPayload = {
          // id_token is the Clerk session JWT, verified server-side via Clerk JWKS.
          idToken: clerkSessionToken,
          // The following are display hints only; the backend ignores them for identity.
          email: '', // placeholder — backend derives email from the verified token
          fullName: fullName || undefined,
          avatarUrl: avatarUrl || undefined,
        };

        await onSuccess(payload);
      } catch (err: any) {
        const msg: string = err?.message ?? '';
        // Silent cancel — user closed the OAuth popup
        if (
          msg.toLowerCase().includes('cancel') ||
          msg.toLowerCase().includes('dismiss') ||
          err?.code === 'cancelled'
        ) {
          return;
        }
        console.error('[ClerkGoogleAuth] OAuth error:', err);
        onError(msg || 'Google Sign-In failed. Please try again.');
      }
    },
    [startOAuthFlow, getToken]
  );

  return { loginWithGoogle };
}
