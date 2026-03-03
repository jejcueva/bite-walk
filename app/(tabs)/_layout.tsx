import { Ionicons } from '@expo/vector-icons';
import { Redirect, Tabs } from 'expo-router';
import React from 'react';
import { ActivityIndicator, StyleSheet, View } from 'react-native';

import { useAuthSession } from '@/hooks/use-auth-session';

export default function TabLayout() {
  const { session, isLoading } = useAuthSession();

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
