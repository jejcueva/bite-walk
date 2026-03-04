import AsyncStorage from '@react-native-async-storage/async-storage';
import * as BackgroundFetch from 'expo-background-fetch';
import * as TaskManager from 'expo-task-manager';

import { calculatePointsForWalk, METERS_PER_MILE, stepsToMiles } from './points';
import { createWalkId, enqueueWalk, syncQueuedWalks } from './offline-walk-queue';
import { getStepTracker } from './step-tracker-factory';
import { isSupabaseConfigured, supabase } from './supabase';

const TASK_NAME = 'STEP_SYNC_TASK';
const STORAGE_KEY_LAST_STEPS = 'step_sync_last_steps';
const STORAGE_KEY_LAST_DATE = 'step_sync_last_date';

function todayDateString(): string {
  return new Date().toISOString().slice(0, 10);
}

async function syncSteps(): Promise<void> {
  if (!isSupabaseConfigured) return;

  const { data: sessionData } = await supabase.auth.getSession();
  const userId = sessionData.session?.user.id;
  if (!userId) return;

  void syncQueuedWalks({ supabase, userId });

  const tracker = getStepTracker();
  const today = new Date();
  const todayStr = todayDateString();

  const currentSteps = await tracker.getStepsForDate(today);
  if (currentSteps <= 0) return;

  const lastDate = await AsyncStorage.getItem(STORAGE_KEY_LAST_DATE);
  const lastStepsStr = await AsyncStorage.getItem(STORAGE_KEY_LAST_STEPS);
  const lastSteps = lastDate === todayStr ? Number(lastStepsStr ?? '0') : 0;

  const delta = currentSteps - lastSteps;
  if (delta <= 0) return;

  const deltaMiles = stepsToMiles(delta);
  const points = calculatePointsForWalk(deltaMiles);
  const distanceMeters = Number((deltaMiles * METERS_PER_MILE).toFixed(2));

  if (points <= 0) return;

  const walkId = createWalkId();
  const { error } = await supabase.from('walks').insert({
    id: walkId,
    user_id: userId,
    distance_meters: distanceMeters,
    points_earned: points,
    source: 'auto',
  });

  if (!error) {
    await AsyncStorage.setItem(STORAGE_KEY_LAST_STEPS, String(currentSteps));
    await AsyncStorage.setItem(STORAGE_KEY_LAST_DATE, todayStr);
    return;
  }

  await enqueueWalk({
    walkId,
    userId,
    distanceMeters,
    pointsEarned: points,
    source: 'auto',
  });
  await AsyncStorage.setItem(STORAGE_KEY_LAST_STEPS, String(currentSteps));
  await AsyncStorage.setItem(STORAGE_KEY_LAST_DATE, todayStr);
}

TaskManager.defineTask(TASK_NAME, async () => {
  try {
    await syncSteps();
    return BackgroundFetch.BackgroundFetchResult.NewData;
  } catch {
    return BackgroundFetch.BackgroundFetchResult.Failed;
  }
});

export async function registerBackgroundStepSync(): Promise<void> {
  const isRegistered = await TaskManager.isTaskRegisteredAsync(TASK_NAME);
  if (isRegistered) return;

  await BackgroundFetch.registerTaskAsync(TASK_NAME, {
    minimumInterval: 15 * 60, // 15 minutes
    stopOnTerminate: false,
    startOnBoot: true,
  });
}

export async function unregisterBackgroundStepSync(): Promise<void> {
  const isRegistered = await TaskManager.isTaskRegisteredAsync(TASK_NAME);
  if (!isRegistered) return;

  await BackgroundFetch.unregisterTaskAsync(TASK_NAME);
}
