import 'react-native-url-polyfill/auto';

import AsyncStorage from '@react-native-async-storage/async-storage';
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL ?? '';
const supabaseAnonKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY ?? '';

// Keep app booting even when env vars are missing, then surface setup guidance in-screen.
const fallbackUrl = 'https://example.supabase.co';
const fallbackAnonKey = 'public-anon-key-placeholder';

export const isSupabaseConfigured = Boolean(supabaseUrl && supabaseAnonKey);

export const supabase = createClient(
  supabaseUrl || fallbackUrl,
  supabaseAnonKey || fallbackAnonKey,
  {
    auth: {
      storage: AsyncStorage,
      autoRefreshToken: true,
      persistSession: true,
      detectSessionInUrl: false,
    },
  },
);
