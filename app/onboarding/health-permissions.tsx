import AsyncStorage from '@react-native-async-storage/async-storage';
import { useRouter } from 'expo-router';
import { useState } from 'react';
import { Platform, Pressable, SafeAreaView, StyleSheet, Text, View } from 'react-native';

import { useStepTracker } from '@/hooks/use-step-tracker';
import { registerForPushNotifications } from '@/lib/push-notifications';

const HEALTH_PERMISSION_KEY = 'health_permission_completed';

export async function hasCompletedHealthOnboarding(): Promise<boolean> {
  const value = await AsyncStorage.getItem(HEALTH_PERMISSION_KEY);
  return value === 'true';
}

export default function HealthPermissionsScreen() {
  const router = useRouter();
  const { requestPermissions } = useStepTracker();
  const [isRequesting, setIsRequesting] = useState(false);
  const [step, setStep] = useState<'health' | 'notifications'>('health');

  const platformName = Platform.OS === 'ios' ? 'Apple Health' : 'Health Connect';
  const rationale =
    Platform.OS === 'ios'
      ? 'BiteWalk uses Apple Health to automatically count your steps and walking distance. Your health data stays on your device.'
      : 'BiteWalk uses Health Connect to automatically count your steps and walking distance. Your health data stays on your device.';

  const finishOnboarding = async () => {
    await AsyncStorage.setItem(HEALTH_PERMISSION_KEY, 'true');
    router.replace('/(tabs)/distance');
  };

  const handleEnableHealth = async () => {
    setIsRequesting(true);
    await requestPermissions();
    setIsRequesting(false);
    setStep('notifications');
  };

  const handleSkipHealth = () => {
    setStep('notifications');
  };

  const handleEnableNotifications = async () => {
    setIsRequesting(true);
    await registerForPushNotifications();
    setIsRequesting(false);
    await finishOnboarding();
  };

  const handleSkipNotifications = async () => {
    await finishOnboarding();
  };

  if (step === 'notifications') {
    return (
      <SafeAreaView style={styles.safeArea}>
        <View style={styles.container}>
          <View style={styles.content}>
            <Text style={styles.icon}>&#x1F514;</Text>
            <Text style={styles.title}>Stay on Track</Text>
            <Text style={styles.subtitle}>
              Get reminders about your walking goals and streak progress.
            </Text>
            <View style={styles.card}>
              <Text style={styles.cardTitle}>Enable Notifications</Text>
              <Text style={styles.cardBody}>
                BiteWalk sends daily goal reminders and streak alerts so you never miss a day. You
                can change this anytime in Settings.
              </Text>
            </View>
          </View>

          <View style={styles.buttons}>
            <Pressable
              disabled={isRequesting}
              style={[styles.primaryButton, isRequesting ? styles.buttonDisabled : undefined]}
              onPress={handleEnableNotifications}>
              <Text style={styles.primaryButtonText}>
                {isRequesting ? 'Requesting...' : 'Enable Notifications'}
              </Text>
            </Pressable>
            <Pressable style={styles.skipButton} onPress={handleSkipNotifications}>
              <Text style={styles.skipButtonText}>Skip for now</Text>
            </Pressable>
          </View>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.container}>
        <View style={styles.content}>
          <Text style={styles.icon}>&#x1F6B6;</Text>
          <Text style={styles.title}>Track Your Steps</Text>
          <Text style={styles.subtitle}>
            Automatically earn points as you walk — no manual logging needed.
          </Text>
          <View style={styles.card}>
            <Text style={styles.cardTitle}>Connect to {platformName}</Text>
            <Text style={styles.cardBody}>{rationale}</Text>
          </View>
        </View>

        <View style={styles.buttons}>
          <Pressable
            disabled={isRequesting}
            style={[styles.primaryButton, isRequesting ? styles.buttonDisabled : undefined]}
            onPress={handleEnableHealth}>
            <Text style={styles.primaryButtonText}>
              {isRequesting ? 'Requesting...' : 'Enable Step Tracking'}
            </Text>
          </Pressable>
          <Pressable style={styles.skipButton} onPress={handleSkipHealth}>
            <Text style={styles.skipButtonText}>Skip for now</Text>
          </Pressable>
        </View>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#d9ece5',
  },
  container: {
    flex: 1,
    padding: 24,
    justifyContent: 'space-between',
  },
  content: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    gap: 16,
  },
  icon: {
    fontSize: 64,
  },
  title: {
    fontSize: 32,
    fontWeight: '800',
    color: '#1d4c3e',
    textAlign: 'center',
  },
  subtitle: {
    fontSize: 17,
    color: '#366b58',
    textAlign: 'center',
    lineHeight: 24,
    paddingHorizontal: 12,
  },
  card: {
    backgroundColor: '#eef7f2',
    borderRadius: 18,
    padding: 20,
    gap: 8,
    width: '100%',
    marginTop: 8,
  },
  cardTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#1d4c3e',
  },
  cardBody: {
    fontSize: 15,
    color: '#366b58',
    lineHeight: 22,
  },
  buttons: {
    gap: 12,
  },
  primaryButton: {
    height: 56,
    borderRadius: 28,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#2f7f65',
  },
  primaryButtonText: {
    color: '#ffffff',
    fontWeight: '700',
    fontSize: 19,
  },
  buttonDisabled: {
    opacity: 0.75,
  },
  skipButton: {
    height: 48,
    alignItems: 'center',
    justifyContent: 'center',
  },
  skipButtonText: {
    color: '#4b6f62',
    fontWeight: '600',
    fontSize: 16,
  },
});
