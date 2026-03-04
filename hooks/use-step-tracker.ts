import { useCallback, useEffect, useRef, useState } from 'react';
import { Platform } from 'react-native';

import type { PermissionStatus } from '@/lib/step-tracker';
import { stepsToMiles } from '@/lib/points';

export function useStepTracker() {
  const [todaySteps, setTodaySteps] = useState(0);
  const [todayDistance, setTodayDistance] = useState(0);
  const [permissionStatus, setPermissionStatus] = useState<PermissionStatus>('undetermined');
  const unsubscribeRef = useRef<(() => void) | null>(null);

  const isSupported = Platform.OS === 'ios' || Platform.OS === 'android';

  useEffect(() => {
    if (!isSupported) return;

    void (async () => {
      try {
        const { getStepTracker } = await import('@/lib/step-tracker-factory');
        const tracker = getStepTracker();
        const status = await tracker.checkPermissions();
        setPermissionStatus(status);

        if (status === 'granted') {
          const distance = await tracker.getDistanceForDate(new Date());
          setTodayDistance(distance);

          unsubscribeRef.current = tracker.subscribeToStepUpdates((steps) => {
            setTodaySteps(steps);
            setTodayDistance(stepsToMiles(steps));
          });
        }
      } catch {
        // Step tracking unavailable (e.g. running in Expo Go)
      }
    })();

    return () => {
      unsubscribeRef.current?.();
      unsubscribeRef.current = null;
    };
  }, [isSupported]);

  const requestPermissions = useCallback(async (): Promise<PermissionStatus> => {
    if (!isSupported) return 'denied';

    try {
      const { getStepTracker } = await import('@/lib/step-tracker-factory');
      const tracker = getStepTracker();
      const status = await tracker.requestPermissions();
      setPermissionStatus(status);

      if (status === 'granted') {
        const steps = await tracker.getStepsForDate(new Date());
        setTodaySteps(steps);
        const distance = await tracker.getDistanceForDate(new Date());
        setTodayDistance(distance);

        unsubscribeRef.current?.();
        unsubscribeRef.current = tracker.subscribeToStepUpdates((s) => {
          setTodaySteps(s);
          setTodayDistance(stepsToMiles(s));
        });
      }

      return status;
    } catch {
      return 'denied';
    }
  }, [isSupported]);

  return {
    todaySteps,
    todayDistance,
    permissionStatus,
    requestPermissions,
    isSupported,
  };
}
