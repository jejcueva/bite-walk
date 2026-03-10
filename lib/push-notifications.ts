import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';

import { supabase } from '@/lib/supabase';

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: false,
    shouldShowBanner: true,
    shouldShowList: true,
  }),
});

if (Platform.OS === 'android') {
  void Notifications.setNotificationChannelAsync('default', {
    name: 'BiteWalk',
    importance: Notifications.AndroidImportance.HIGH,
    vibrationPattern: [0, 250, 250, 250],
    lightColor: '#2f7f65',
  });
}

/**
 * Request notification permission and persist the Expo push token
 * to the user's profile row. Returns the token string or null
 * if permission was denied or unavailable.
 */
export async function registerForPushNotifications(): Promise<string | null> {
  if (Platform.OS === 'web') {
    return null;
  }

  const { status: existing } = await Notifications.getPermissionsAsync();
  let finalStatus = existing;

  if (existing !== 'granted') {
    const { status } = await Notifications.requestPermissionsAsync();
    finalStatus = status;
  }

  if (finalStatus !== 'granted') {
    return null;
  }

  const tokenData = await Notifications.getExpoPushTokenAsync({
    projectId: process.env.EXPO_PUBLIC_EAS_PROJECT_ID,
  });
  const token = tokenData.data;

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (user) {
    await supabase.from('profiles').update({ push_token: token }).eq('id', user.id);
  }

  return token;
}

/**
 * Schedule a daily local notification at 7 PM reminding the user
 * to hit their walking goal.
 */
export async function scheduleDailyGoalReminder(): Promise<void> {
  await Notifications.cancelAllScheduledNotificationsAsync();

  await Notifications.scheduleNotificationAsync({
    content: {
      title: 'Daily Walk Goal',
      body: "Don't forget your daily walk goal!",
      data: { screen: '/(tabs)/distance' },
    },
    trigger: {
      type: Notifications.SchedulableTriggerInputTypes.DAILY,
      hour: 19,
      minute: 0,
    },
  });
}

/**
 * Schedule a one-time notification warning the user their streak
 * is at risk. Fires 2 hours from now.
 */
export async function scheduleStreakAtRiskReminder(): Promise<void> {
  await Notifications.scheduleNotificationAsync({
    content: {
      title: 'Streak at Risk',
      body: 'Your streak is at risk! Walk today to keep it alive.',
      data: { screen: '/(tabs)/distance' },
    },
    trigger: {
      type: Notifications.SchedulableTriggerInputTypes.TIME_INTERVAL,
      seconds: 2 * 60 * 60,
    },
  });
}

/**
 * Handle a tap on a delivered notification by navigating to the
 * screen encoded in the notification payload.
 */
export function handleNotificationResponse(
  response: Notifications.NotificationResponse,
  navigate: (path: string) => void,
): void {
  const data = response.notification.request.content.data;
  if (data?.screen && typeof data.screen === 'string') {
    navigate(data.screen);
  }
}
