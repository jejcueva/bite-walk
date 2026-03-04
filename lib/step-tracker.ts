export type PermissionStatus = 'granted' | 'denied' | 'undetermined';

export interface StepTracker {
  requestPermissions(): Promise<PermissionStatus>;
  checkPermissions(): Promise<PermissionStatus>;
  getStepsForDate(date: Date): Promise<number>;
  getDistanceForDate(date: Date): Promise<number>; // miles
  subscribeToStepUpdates(callback: (steps: number) => void): () => void;
}

export { getStepTracker } from './step-tracker-factory';
