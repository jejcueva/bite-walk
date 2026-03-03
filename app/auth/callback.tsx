import * as Linking from 'expo-linking';
import { useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import { ActivityIndicator, Pressable, StyleSheet, Text, View } from 'react-native';

import { exchangeSessionFromCallbackUrl } from '@/lib/oauth';

export default function AuthCallbackScreen() {
  const router = useRouter();
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  useEffect(() => {
    let isMounted = true;

    const completeOAuth = async () => {
      const callbackUrl = await Linking.getInitialURL();

      if (!callbackUrl) {
        if (isMounted) {
          setErrorMessage('Missing OAuth callback URL.');
        }

        return;
      }

      const callbackError = await exchangeSessionFromCallbackUrl(callbackUrl);
      if (!isMounted) {
        return;
      }

      if (callbackError) {
        setErrorMessage(callbackError);
        return;
      }

      router.replace('/(tabs)/distance');
    };

    void completeOAuth();

    return () => {
      isMounted = false;
    };
  }, [router]);

  if (errorMessage) {
    return (
      <View style={styles.container}>
        <Text style={styles.errorTitle}>Sign-in failed</Text>
        <Text style={styles.errorBody}>{errorMessage}</Text>
        <Pressable style={styles.loginButton} onPress={() => router.replace('/login')}>
          <Text style={styles.loginButtonText}>Back to login</Text>
        </Pressable>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <ActivityIndicator size="large" color="#2f7f65" />
      <Text style={styles.loadingText}>Completing sign-in...</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 24,
    backgroundColor: '#d9ece5',
  },
  loadingText: {
    marginTop: 16,
    fontSize: 17,
    color: '#1f4f3f',
  },
  errorTitle: {
    fontSize: 24,
    fontWeight: '700',
    color: '#8d2d2d',
    marginBottom: 8,
  },
  errorBody: {
    fontSize: 16,
    color: '#2a5e4c',
    textAlign: 'center',
    marginBottom: 24,
  },
  loginButton: {
    height: 50,
    minWidth: 180,
    borderRadius: 25,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#2f7f65',
    paddingHorizontal: 24,
  },
  loginButtonText: {
    color: '#ffffff',
    fontSize: 18,
    fontWeight: '700',
  },
});
