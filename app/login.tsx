import { Link, useRouter } from 'expo-router';
import { useState } from 'react';
import {
  KeyboardAvoidingView,
  Platform,
  Pressable,
  SafeAreaView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';

import { signInWithSocialOAuth, type SocialAuthProvider } from '@/lib/oauth';
import { isSupabaseConfigured, supabase } from '@/lib/supabase';

export default function LoginScreen() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [oauthProviderInFlight, setOauthProviderInFlight] = useState<SocialAuthProvider | null>(null);
  const isBusy = isSubmitting || Boolean(oauthProviderInFlight);

  const handleLogin = async () => {
    setErrorMessage(null);

    if (!isSupabaseConfigured) {
      setErrorMessage('Set EXPO_PUBLIC_SUPABASE_URL and EXPO_PUBLIC_SUPABASE_ANON_KEY first.');
      return;
    }

    const normalizedEmail = email.trim().toLowerCase();

    if (!normalizedEmail || !password) {
      setErrorMessage('Email and password are required.');
      return;
    }

    setIsSubmitting(true);

    const { error } = await supabase.auth.signInWithPassword({
      email: normalizedEmail,
      password,
    });

    setIsSubmitting(false);

    if (error) {
      setErrorMessage(error.message);
      return;
    }

    router.replace('/(tabs)/distance');
  };

  const handleSocialSignIn = async (provider: SocialAuthProvider) => {
    setErrorMessage(null);

    if (!isSupabaseConfigured) {
      setErrorMessage('Set EXPO_PUBLIC_SUPABASE_URL and EXPO_PUBLIC_SUPABASE_ANON_KEY first.');
      return;
    }

    setOauthProviderInFlight(provider);
    const { error } = await signInWithSocialOAuth(provider);
    setOauthProviderInFlight(null);

    if (error) {
      setErrorMessage(error);
      return;
    }

    router.replace('/(tabs)/distance');
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        style={styles.keyboardContainer}>
        <View style={styles.topSection}>
          <View style={styles.logoCircle}>
            <Text style={styles.logoText}>BW</Text>
          </View>
          <Text style={styles.brand}>BiteWalk, Inc</Text>
        </View>

        <View style={styles.formSection}>
          <Text style={styles.title}>Login</Text>
          <Text style={styles.subtitle}>Sign in to continue</Text>

          <TextInput
            autoCapitalize="none"
            autoComplete="email"
            keyboardType="email-address"
            placeholder="Email"
            placeholderTextColor="#366b58"
            style={styles.input}
            value={email}
            onChangeText={setEmail}
          />
          <TextInput
            secureTextEntry
            autoCapitalize="none"
            autoComplete="password"
            placeholder="Password"
            placeholderTextColor="#366b58"
            style={styles.input}
            value={password}
            onChangeText={setPassword}
          />

          {errorMessage ? <Text style={styles.errorText}>{errorMessage}</Text> : null}

          <Pressable
            disabled={isBusy}
            style={[styles.primaryButton, isBusy ? styles.buttonDisabled : undefined]}
            onPress={handleLogin}>
            <Text style={styles.primaryButtonText}>{isSubmitting ? 'Signing in...' : 'Log In'}</Text>
          </Pressable>

          <View style={styles.dividerRow}>
            <View style={styles.dividerLine} />
            <Text style={styles.dividerText}>or</Text>
            <View style={styles.dividerLine} />
          </View>

          <Pressable
            disabled={isBusy}
            style={[styles.socialButton, isBusy ? styles.socialButtonDisabled : undefined]}
            onPress={() => {
              void handleSocialSignIn('google');
            }}>
            <Text style={styles.socialButtonText}>
              {oauthProviderInFlight === 'google' ? 'Connecting Google...' : 'Continue with Google'}
            </Text>
          </Pressable>

          {Platform.OS === 'ios' ? (
            <Pressable
              disabled={isBusy}
              style={[styles.socialButton, isBusy ? styles.socialButtonDisabled : undefined]}
              onPress={() => {
                void handleSocialSignIn('apple');
              }}>
              <Text style={styles.socialButtonText}>
                {oauthProviderInFlight === 'apple' ? 'Connecting Apple...' : 'Continue with Apple'}
              </Text>
            </Pressable>
          ) : null}

          <Link href="/signup" asChild>
            <Pressable style={styles.secondaryAction}>
              <Text style={styles.secondaryActionText}>Create new account</Text>
            </Pressable>
          </Link>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#d9ece5',
  },
  keyboardContainer: {
    flex: 1,
  },
  topSection: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingTop: 56,
    paddingBottom: 36,
    backgroundColor: '#f7f9f8',
  },
  logoCircle: {
    width: 86,
    height: 86,
    borderWidth: 2,
    borderColor: '#4f9f84',
    borderRadius: 43,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 10,
  },
  logoText: {
    fontSize: 30,
    fontWeight: '700',
    color: '#4f9f84',
  },
  brand: {
    fontSize: 32,
    fontWeight: '700',
    color: '#2f7f65',
  },
  formSection: {
    flex: 1,
    paddingHorizontal: 28,
    paddingTop: 42,
    gap: 14,
  },
  title: {
    fontSize: 44,
    fontWeight: '700',
    color: '#266a55',
    textAlign: 'center',
  },
  subtitle: {
    fontSize: 22,
    color: '#2b7059',
    textAlign: 'center',
    marginBottom: 8,
  },
  input: {
    height: 58,
    borderRadius: 29,
    backgroundColor: '#79c7ae',
    paddingHorizontal: 24,
    fontSize: 20,
    color: '#1f4c3e',
  },
  errorText: {
    color: '#9d2f2f',
    fontSize: 16,
    textAlign: 'center',
  },
  primaryButton: {
    height: 58,
    borderRadius: 29,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#2f7f65',
    marginTop: 6,
  },
  buttonDisabled: {
    opacity: 0.75,
  },
  primaryButtonText: {
    fontSize: 24,
    color: '#ffffff',
    fontWeight: '700',
  },
  dividerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 2,
  },
  dividerLine: {
    flex: 1,
    height: 1,
    backgroundColor: '#b4d8ca',
  },
  dividerText: {
    marginHorizontal: 12,
    color: '#2a5e4c',
    fontSize: 16,
  },
  socialButton: {
    height: 54,
    borderRadius: 27,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: '#2f7f65',
    backgroundColor: '#eef7f2',
  },
  socialButtonDisabled: {
    opacity: 0.7,
  },
  socialButtonText: {
    fontSize: 19,
    color: '#1f4f3f',
    fontWeight: '600',
  },
  secondaryAction: {
    alignItems: 'center',
    paddingVertical: 10,
  },
  secondaryActionText: {
    fontSize: 18,
    color: '#266a55',
    fontWeight: '600',
  },
});
