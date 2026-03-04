import { Link } from 'expo-router';
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

import { isSupabaseConfigured, supabase } from '@/lib/supabase';

export default function ForgotPasswordScreen() {
  const [email, setEmail] = useState('');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleResetPassword = async () => {
    setErrorMessage(null);
    setSuccessMessage(null);

    if (!isSupabaseConfigured) {
      setErrorMessage('Set EXPO_PUBLIC_SUPABASE_URL and EXPO_PUBLIC_SUPABASE_ANON_KEY first.');
      return;
    }

    const normalizedEmail = email.trim().toLowerCase();

    if (!normalizedEmail) {
      setErrorMessage('Please enter your email address.');
      return;
    }

    setIsSubmitting(true);

    const { error } = await supabase.auth.resetPasswordForEmail(normalizedEmail);

    setIsSubmitting(false);

    if (error) {
      setErrorMessage(error.message);
      return;
    }

    setSuccessMessage('Check your email for a password reset link.');
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
          <Text style={styles.title}>Forgot Password</Text>
          <Text style={styles.subtitle}>Enter your email to receive a reset link</Text>

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

          {errorMessage ? <Text style={styles.errorText}>{errorMessage}</Text> : null}
          {successMessage ? <Text style={styles.successText}>{successMessage}</Text> : null}

          <Pressable
            disabled={isSubmitting}
            style={[styles.primaryButton, isSubmitting ? styles.buttonDisabled : undefined]}
            onPress={handleResetPassword}>
            <Text style={styles.primaryButtonText}>
              {isSubmitting ? 'Sending...' : 'Send Reset Link'}
            </Text>
          </Pressable>

          <Link href="/login" asChild>
            <Pressable style={styles.secondaryAction}>
              <Text style={styles.secondaryActionText}>Back to login</Text>
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
    fontSize: 42,
    fontWeight: '700',
    color: '#266a55',
    textAlign: 'center',
  },
  subtitle: {
    fontSize: 18,
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
  successText: {
    color: '#266a55',
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
