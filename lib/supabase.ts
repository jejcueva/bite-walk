import 'react-native-url-polyfill/auto';

import AsyncStorage from '@react-native-async-storage/async-storage';
import { createClient } from '@supabase/supabase-js';
import { Platform } from 'react-native';

const normalizeEnvValue = (value: string | undefined) =>
  (value ?? '').trim().replace(/^['"]|['"]$/g, '');

const isValidHttpUrl = (value: string) => {
  try {
    const parsed = new URL(value);
    return parsed.protocol === 'http:' || parsed.protocol === 'https:';
  } catch {
    return false;
  }
};

const configuredUrl = normalizeEnvValue(process.env.EXPO_PUBLIC_SUPABASE_URL);
const configuredAnonKey = normalizeEnvValue(process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY);
const supabaseUrl = isValidHttpUrl(configuredUrl) ? configuredUrl : '';
const supabaseAnonKey = configuredAnonKey;

// Keep app booting even when env vars are missing, then surface setup guidance in-screen.
const fallbackUrl = 'https://example.supabase.co';
const fallbackAnonKey = 'public-anon-key-placeholder';
const isServerRuntime = Platform.OS === 'web' && typeof window === 'undefined';

type AuthStorageAdapter = {
  getItem: (key: string) => string | null | Promise<string | null>;
  setItem: (key: string, value: string) => void | Promise<void>;
  removeItem: (key: string) => void | Promise<void>;
  isServer?: boolean;
};

const noOpStorage: AuthStorageAdapter = {
  getItem: () => null,
  setItem: () => undefined,
  removeItem: () => undefined,
  isServer: true,
};

const authStorage: AuthStorageAdapter = isServerRuntime ? noOpStorage : AsyncStorage;

export const isSupabaseConfigured = Boolean(supabaseUrl && supabaseAnonKey);

export const supabase = createClient(
  supabaseUrl || fallbackUrl,
  supabaseAnonKey || fallbackAnonKey,
  {
    auth: {
      storage: authStorage,
      autoRefreshToken: !isServerRuntime,
      persistSession: !isServerRuntime,
      detectSessionInUrl: false,
      flowType: 'pkce',
    },
  },
);
