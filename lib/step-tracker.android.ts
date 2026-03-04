import {
  getSdkStatus,
  initialize,
  readRecords,
  requestPermission,
  SdkAvailabilityStatus,
} from 'react-native-health-connect';

import type { PermissionStatus, StepTracker } from './step-tracker';

function startOfDay(date: Date): Date {
  const d = new Date(date);
  d.setHours(0, 0, 0, 0);
  return d;
}

function endOfDay(date: Date): Date {
  const d = new Date(date);
  d.setHours(23, 59, 59, 999);
  return d;
}

const METERS_TO_MILES = 0.000621371;

export class AndroidStepTracker implements StepTracker {
  private initialized = false;

  private async ensureInitialized(): Promise<boolean> {
    if (this.initialized) return true;

    const status = await getSdkStatus();
    if (status !== SdkAvailabilityStatus.SDK_AVAILABLE) {
      return false;
    }

    const result = await initialize();
    this.initialized = result;
    return result;
  }

  async requestPermissions(): Promise<PermissionStatus> {
    const ready = await this.ensureInitialized();
    if (!ready) return 'denied';

    try {
      const granted = await requestPermission([
        { accessType: 'read', recordType: 'Steps' },
        { accessType: 'read', recordType: 'Distance' },
      ]);

      return granted.length > 0 ? 'granted' : 'denied';
    } catch {
      return 'denied';
    }
  }

  async checkPermissions(): Promise<PermissionStatus> {
    const ready = await this.ensureInitialized();
    if (!ready) return 'undetermined';

    // Health Connect doesn't have a direct "check permission" API;
    // attempt a minimal read to see if we have access.
    try {
      await readRecords('Steps', {
        timeRangeFilter: {
          operator: 'between',
          startTime: new Date().toISOString(),
          endTime: new Date().toISOString(),
        },
      });
      return 'granted';
    } catch {
      return 'undetermined';
    }
  }

  async getStepsForDate(date: Date): Promise<number> {
    const ready = await this.ensureInitialized();
    if (!ready) return 0;

    try {
      const result = await readRecords('Steps', {
        timeRangeFilter: {
          operator: 'between',
          startTime: startOfDay(date).toISOString(),
          endTime: endOfDay(date).toISOString(),
        },
      });

      return result.records.reduce((sum, record) => sum + record.count, 0);
    } catch {
      return 0;
    }
  }

  async getDistanceForDate(date: Date): Promise<number> {
    const ready = await this.ensureInitialized();
    if (!ready) return 0;

    try {
      const result = await readRecords('Distance', {
        timeRangeFilter: {
          operator: 'between',
          startTime: startOfDay(date).toISOString(),
          endTime: endOfDay(date).toISOString(),
        },
      });

      const totalMeters = result.records.reduce(
        (sum, record) => sum + record.distance.inMeters,
        0,
      );
      return totalMeters * METERS_TO_MILES;
    } catch {
      return 0;
    }
  }

  subscribeToStepUpdates(callback: (steps: number) => void): () => void {
    // Health Connect doesn't support live observers; poll every 30 seconds
    const interval = setInterval(async () => {
      const steps = await this.getStepsForDate(new Date());
      callback(steps);
    }, 30_000);

    // Fire immediately
    void this.getStepsForDate(new Date()).then(callback);

    return () => clearInterval(interval);
  }
}
