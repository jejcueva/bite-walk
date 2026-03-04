import AsyncStorage from '@react-native-async-storage/async-storage';
import { Redirect } from 'expo-router';
import { useEffect, useState } from 'react';
import { ActivityIndicator, StyleSheet, View } from 'react-native';

import { useAuthSession } from '@/hooks/use-auth-session';

const HEALTH_PERMISSION_KEY = 'health_permission_completed';

export default function IndexScreen() {
  const { session, isLoading } = useAuthSession();
  const [healthOnboarded, setHealthOnboarded] = useState<boolean | null>(null);

  useEffect(() => {
    void AsyncStorage.getItem(HEALTH_PERMISSION_KEY).then((value) => {
      setHealthOnboarded(value === 'true');
    });
  }, []);

  if (isLoading || healthOnboarded === null) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" color="#2f7f65" />
      </View>
    );
  }

  if (!session) {
    return <Redirect href="/login" />;
  }

  if (!healthOnboarded) {
    return <Redirect href="/onboarding/health-permissions" />;
  }

  return <Redirect href="/(tabs)/distance" />;
}

const styles = StyleSheet.create({
  centered: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#d9ece5',
  },
});
