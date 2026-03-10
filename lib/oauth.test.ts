import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
  getOAuthRedirectUrl,
  exchangeSessionFromCallbackUrl,
  signInWithSocialOAuth,
} from './oauth';

const MOCK_REDIRECT_URL = 'exp://localhost:8081/--/auth/callback';

vi.mock('expo-linking', () => ({
  createURL: vi.fn(() => MOCK_REDIRECT_URL),
}));

vi.mock('expo-web-browser', () => ({
  maybeCompleteAuthSession: vi.fn(),
  openAuthSessionAsync: vi.fn(),
}));

vi.mock('@/lib/supabase', () => ({
  supabase: {
    auth: {
      signInWithOAuth: vi.fn(),
      exchangeCodeForSession: vi.fn(),
      setSession: vi.fn(),
    },
  },
}));

import * as Linking from 'expo-linking';
import * as WebBrowser from 'expo-web-browser';
import { supabase } from '@/lib/supabase';

beforeEach(() => {
  vi.clearAllMocks();
});

describe('getOAuthRedirectUrl', () => {
  it('returns the redirect URL using Linking.createURL', () => {
    expect(getOAuthRedirectUrl()).toBe(MOCK_REDIRECT_URL);
    expect(Linking.createURL).toHaveBeenCalledWith('auth/callback');
  });
});

describe('exchangeSessionFromCallbackUrl', () => {
  beforeEach(() => {
    vi.mocked(supabase.auth.exchangeCodeForSession).mockResolvedValue({
      data: { user: null, session: null },
      error: null,
    } as any);
    vi.mocked(supabase.auth.setSession).mockResolvedValue({
      data: { user: null, session: null },
      error: null,
    } as any);
  });

  it('returns error_description from callback URL', async () => {
    const url =
      'exp://localhost/--/auth/callback?error_description=User+denied+access';
    const result = await exchangeSessionFromCallbackUrl(url);
    expect(result).toBe('User denied access');
    expect(supabase.auth.exchangeCodeForSession).not.toHaveBeenCalled();
    expect(supabase.auth.setSession).not.toHaveBeenCalled();
  });

  it('returns error code when no description', async () => {
    const url = 'exp://localhost/--/auth/callback?error=access_denied';
    const result = await exchangeSessionFromCallbackUrl(url);
    expect(result).toBe('OAuth error: access_denied');
    expect(supabase.auth.exchangeCodeForSession).not.toHaveBeenCalled();
    expect(supabase.auth.setSession).not.toHaveBeenCalled();
  });

  it('exchanges authorization code via exchangeCodeForSession', async () => {
    const url = 'exp://localhost/--/auth/callback?code=abc123';
    const result = await exchangeSessionFromCallbackUrl(url);
    expect(result).toBeNull();
    expect(supabase.auth.exchangeCodeForSession).toHaveBeenCalledWith('abc123');
    expect(supabase.auth.setSession).not.toHaveBeenCalled();
  });

  it('returns error message when exchangeCodeForSession fails', async () => {
    vi.mocked(supabase.auth.exchangeCodeForSession).mockResolvedValue({
      data: { user: null, session: null },
      error: { message: 'Invalid code', name: 'AuthError', status: 400 } as any,
    } as any);
    const url = 'exp://localhost/--/auth/callback?code=invalid';
    const result = await exchangeSessionFromCallbackUrl(url);
    expect(result).toBe('Invalid code');
  });

  it('sets session with access_token and refresh_token from hash params', async () => {
    const url =
      'exp://localhost/--/auth/callback#access_token=at123&refresh_token=rt456';
    const result = await exchangeSessionFromCallbackUrl(url);
    expect(result).toBeNull();
    expect(supabase.auth.setSession).toHaveBeenCalledWith({
      access_token: 'at123',
      refresh_token: 'rt456',
    });
    expect(supabase.auth.exchangeCodeForSession).not.toHaveBeenCalled();
  });

  it('returns error message when setSession fails', async () => {
    vi.mocked(supabase.auth.setSession).mockResolvedValue({
      data: { user: null, session: null },
      error: { message: 'Session expired', name: 'AuthError', status: 401 } as any,
    } as any);
    const url =
      'exp://localhost/--/auth/callback#access_token=at&refresh_token=rt';
    const result = await exchangeSessionFromCallbackUrl(url);
    expect(result).toBe('Session expired');
  });

  it('returns fallback message when no code or tokens present', async () => {
    const url = 'exp://localhost/--/auth/callback';
    const result = await exchangeSessionFromCallbackUrl(url);
    expect(result).toBe(
      'Unable to complete OAuth callback session exchange.',
    );
    expect(supabase.auth.exchangeCodeForSession).not.toHaveBeenCalled();
    expect(supabase.auth.setSession).not.toHaveBeenCalled();
  });

  it('returns fallback when only access_token present without refresh_token', async () => {
    const url = 'exp://localhost/--/auth/callback#access_token=at123';
    const result = await exchangeSessionFromCallbackUrl(url);
    expect(result).toBe(
      'Unable to complete OAuth callback session exchange.',
    );
    expect(supabase.auth.setSession).not.toHaveBeenCalled();
  });
});

describe('signInWithSocialOAuth', () => {
  beforeEach(() => {
    vi.mocked(supabase.auth.signInWithOAuth).mockResolvedValue({
      data: { provider: 'google', url: 'https://auth.example.com/oauth' },
      error: null,
    } as any);
    vi.mocked(WebBrowser.openAuthSessionAsync).mockResolvedValue({
      type: 'success',
      url: 'exp://localhost/--/auth/callback?code=abc123',
    });
    vi.mocked(supabase.auth.exchangeCodeForSession).mockResolvedValue({
      data: { user: null, session: null },
      error: null,
    } as any);
  });

  it('returns error when signInWithOAuth fails', async () => {
    vi.mocked(supabase.auth.signInWithOAuth).mockResolvedValue({
      data: { provider: 'google', url: null },
      error: { message: 'Network error', name: 'AuthError', status: 0 } as any,
    } as any);
    const result = await signInWithSocialOAuth('google');
    expect(result).toEqual({ error: 'Network error' });
    expect(WebBrowser.openAuthSessionAsync).not.toHaveBeenCalled();
  });

  it('returns error when no URL in data', async () => {
    vi.mocked(supabase.auth.signInWithOAuth).mockResolvedValue({
      data: { provider: 'google', url: null },
      error: null,
    } as any);
    const result = await signInWithSocialOAuth('google');
    expect(result).toEqual({ error: 'Missing OAuth authorization URL.' });
    expect(WebBrowser.openAuthSessionAsync).not.toHaveBeenCalled();
  });

  it('returns canceled message when browser session not successful', async () => {
    vi.mocked(WebBrowser.openAuthSessionAsync).mockResolvedValue({
      type: 'cancel',
    } as any);
    const result = await signInWithSocialOAuth('google');
    expect(result).toEqual({ error: 'Sign-in was canceled.' });
    expect(supabase.auth.exchangeCodeForSession).not.toHaveBeenCalled();
  });

  it('returns canceled message when browser session type is dismiss', async () => {
    vi.mocked(WebBrowser.openAuthSessionAsync).mockResolvedValue({
      type: 'dismiss',
    } as any);
    const result = await signInWithSocialOAuth('apple');
    expect(result).toEqual({ error: 'Sign-in was canceled.' });
  });

  it('completes full flow successfully', async () => {
    const result = await signInWithSocialOAuth('google');
    expect(result).toEqual({ error: null });
    expect(supabase.auth.signInWithOAuth).toHaveBeenCalledWith({
      provider: 'google',
      options: {
        redirectTo: MOCK_REDIRECT_URL,
        skipBrowserRedirect: true,
      },
    });
    expect(WebBrowser.openAuthSessionAsync).toHaveBeenCalledWith(
      'https://auth.example.com/oauth',
      MOCK_REDIRECT_URL,
    );
    expect(supabase.auth.exchangeCodeForSession).toHaveBeenCalledWith('abc123');
  });

  it('returns error when exchangeSessionFromCallbackUrl fails during flow', async () => {
    vi.mocked(WebBrowser.openAuthSessionAsync).mockResolvedValue({
      type: 'success',
      url: 'exp://localhost/--/auth/callback?error_description=Access+denied',
    });
    const result = await signInWithSocialOAuth('google');
    expect(result).toEqual({ error: 'Access denied' });
    expect(supabase.auth.exchangeCodeForSession).not.toHaveBeenCalled();
  });
});
