import AppleHealthKit, {
  HealthKitPermissions,
  HealthUnit,
  HealthValue,
} from 'react-native-health';

import type { PermissionStatus, StepTracker } from './step-tracker';

const permissions: HealthKitPermissions = {
  permissions: {
    read: [
      AppleHealthKit.Constants.Permissions.StepCount,
      AppleHealthKit.Constants.Permissions.DistanceWalkingRunning,
    ],
    write: [],
  },
};

function startOfDay(date: Date): Date {
  const d = new Date(date);
  d.setHours(0, 0, 0, 0);
  return d;
}

export class IOSStepTracker implements StepTracker {
  async requestPermissions(): Promise<PermissionStatus> {
    return new Promise((resolve) => {
      AppleHealthKit.initHealthKit(permissions, (err) => {
        if (err) {
          resolve('denied');
          return;
        }
        resolve('granted');
      });
    });
  }

  async checkPermissions(): Promise<PermissionStatus> {
    return new Promise((resolve) => {
      AppleHealthKit.getAuthStatus(permissions, (err, result) => {
        if (err || !result) {
          resolve('undetermined');
          return;
        }
        // HealthKit doesn't expose granular read permission status;
        // after initHealthKit succeeds we treat it as granted.
        resolve('granted');
      });
    });
  }

  async getStepsForDate(date: Date): Promise<number> {
    const start = startOfDay(date);

    return new Promise((resolve) => {
      AppleHealthKit.getStepCount(
        { date: start.toISOString(), includeManuallyAdded: true },
        (err, results: HealthValue) => {
          if (err) {
            resolve(0);
            return;
          }
          resolve(results.value ?? 0);
        },
      );
    });
  }

  async getDistanceForDate(date: Date): Promise<number> {
    const start = startOfDay(date);

    return new Promise((resolve) => {
      AppleHealthKit.getDistanceWalkingRunning(
        { date: start.toISOString(), unit: HealthUnit.mile },
        (err, results: HealthValue) => {
          if (err) {
            resolve(0);
            return;
          }
          resolve(results.value ?? 0);
        },
      );
    });
  }

  subscribeToStepUpdates(callback: (steps: number) => void): () => void {
    // Poll every 30 seconds for step updates
    const interval = setInterval(async () => {
      const steps = await this.getStepsForDate(new Date());
      callback(steps);
    }, 30_000);

    // Fire immediately
    void this.getStepsForDate(new Date()).then(callback);

    return () => clearInterval(interval);
  }
}
