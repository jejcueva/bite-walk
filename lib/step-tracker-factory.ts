import { Platform } from 'react-native';

import type { StepTracker } from './step-tracker';

let tracker: StepTracker | null = null;

export function getStepTracker(): StepTracker {
  if (tracker) return tracker;

  if (Platform.OS === 'ios') {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const { IOSStepTracker } = require('./step-tracker.ios') as typeof import('./step-tracker.ios');
    tracker = new IOSStepTracker();
  } else if (Platform.OS === 'android') {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const { AndroidStepTracker } = require('./step-tracker.android') as typeof import('./step-tracker.android');
    tracker = new AndroidStepTracker();
  } else {
    throw new Error(`Step tracking is not supported on ${Platform.OS}`);
  }

  return tracker;
}
