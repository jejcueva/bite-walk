import * as Linking from 'expo-linking';
import * as WebBrowser from 'expo-web-browser';

import { supabase } from '@/lib/supabase';

WebBrowser.maybeCompleteAuthSession();

export type SocialAuthProvider = 'google' | 'apple';

const OAUTH_REDIRECT_PATH = 'auth/callback';
const CANCELED_AUTH_MESSAGE = 'Sign-in was canceled.';

const parseAuthCallbackParams = (callbackUrl: string) => {
  const [urlWithoutHash, hashPart = ''] = callbackUrl.split('#');
  const queryPart = urlWithoutHash.includes('?') ? (urlWithoutHash.split('?')[1] ?? '') : '';

  const merged = new Map<string, string>();
  const queryParams = new URLSearchParams(queryPart);
  const hashParams = new URLSearchParams(hashPart);

  for (const [key, value] of queryParams.entries()) {
    merged.set(key, value);
  }

  for (const [key, value] of hashParams.entries()) {
    merged.set(key, value);
  }

  return merged;
};

const getOAuthErrorMessage = (params: Map<string, string>) => {
  const errorDescription = params.get('error_description');
  if (errorDescription) {
    return errorDescription;
  }

  const errorCode = params.get('error');
  if (errorCode) {
    return `OAuth error: ${errorCode}`;
  }

  return null;
};

export const getOAuthRedirectUrl = () => Linking.createURL(OAUTH_REDIRECT_PATH);

export async function exchangeSessionFromCallbackUrl(callbackUrl: string) {
  const params = parseAuthCallbackParams(callbackUrl);
  const oauthError = getOAuthErrorMessage(params);

  if (oauthError) {
    return oauthError;
  }

  const authorizationCode = params.get('code');
  if (authorizationCode) {
    const { error } = await supabase.auth.exchangeCodeForSession(authorizationCode);
    return error ? error.message : null;
  }

  const accessToken = params.get('access_token');
  const refreshToken = params.get('refresh_token');
  if (accessToken && refreshToken) {
    const { error } = await supabase.auth.setSession({
      access_token: accessToken,
      refresh_token: refreshToken,
    });

    return error ? error.message : null;
  }

  return 'Unable to complete OAuth callback session exchange.';
}

export async function signInWithSocialOAuth(provider: SocialAuthProvider) {
  const redirectTo = getOAuthRedirectUrl();

  const { data, error } = await supabase.auth.signInWithOAuth({
    provider,
    options: {
      redirectTo,
      skipBrowserRedirect: true,
    },
  });

  if (error) {
    return { error: error.message };
  }

  if (!data?.url) {
    return { error: 'Missing OAuth authorization URL.' };
  }

  const authResult = await WebBrowser.openAuthSessionAsync(data.url, redirectTo);
  if (authResult.type !== 'success') {
    return { error: CANCELED_AUTH_MESSAGE };
  }

  const callbackError = await exchangeSessionFromCallbackUrl(authResult.url);
  return { error: callbackError };
}
