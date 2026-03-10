import { Ionicons } from '@expo/vector-icons';
import { Redirect, Tabs } from 'expo-router';
import React, { useEffect } from 'react';
import { ActivityIndicator, Platform, StyleSheet, View } from 'react-native';

import { useAuthSession } from '@/hooks/use-auth-session';
import { useStepTracker } from '@/hooks/use-step-tracker';

export default function TabLayout() {
  const { session, isLoading } = useAuthSession();
  const { permissionStatus } = useStepTracker();

  useEffect(() => {
    if (permissionStatus !== 'granted') return;
    if (Platform.OS !== 'ios' && Platform.OS !== 'android') return;

    void (async () => {
      try {
        const { registerBackgroundStepSync } = await import('@/lib/background-step-sync');
        await registerBackgroundStepSync();
      } catch {
        // Background fetch may not be available (e.g. Expo Go)
      }
    })();
  }, [permissionStatus]);

  if (isLoading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#2f7f65" />
      </View>
    );
  }

  if (!session) {
    return <Redirect href="/login" />;
  }

  return (
    <Tabs
      screenOptions={{
        tabBarActiveTintColor: '#2f7f65',
        tabBarInactiveTintColor: '#4b6f62',
        tabBarStyle: styles.tabBar,
        headerStyle: styles.header,
        headerTitleStyle: styles.headerTitle,
      }}>
      <Tabs.Screen
        name="distance"
        options={{
          title: 'Distance',
          tabBarIcon: ({ color, size }) => <Ionicons name="walk-outline" size={size} color={color} />,
        }}
      />
      <Tabs.Screen
        name="map"
        options={{
          title: 'Map',
          tabBarIcon: ({ color, size }) => <Ionicons name="map-outline" size={size} color={color} />,
        }}
      />
      <Tabs.Screen
        name="discounts"
        options={{
          title: 'Discounts',
          tabBarIcon: ({ color, size }) => <Ionicons name="ticket-outline" size={size} color={color} />,
        }}
      />
    </Tabs>
  );
}

const styles = StyleSheet.create({
  loadingContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#d9ece5',
  },
  tabBar: {
    backgroundColor: '#eef7f2',
    borderTopColor: '#cce0d7',
  },
  header: {
    backgroundColor: '#eef7f2',
  },
  headerTitle: {
    color: '#1d4c3e',
    fontSize: 20,
    fontWeight: '700',
  },
});
