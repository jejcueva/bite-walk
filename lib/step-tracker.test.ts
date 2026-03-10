import { describe, it, expect, vi, beforeEach } from 'vitest';

const setPlatformOS = (os: string) => {
  (globalThis as { __platformOS?: string }).__platformOS = os;
};

const iosInstance = {};
const androidInstance = {};

vi.mock('./step-tracker-factory', async () => {
  const { Platform } = await import('react-native');
  let tracker: unknown = null;
  let lastPlatform: string | null = null;
  return {
    getStepTracker: vi.fn(() => {
      const currentPlatform = Platform.OS;
      if (tracker && lastPlatform === currentPlatform) return tracker;
      lastPlatform = currentPlatform;
      tracker = null;
      if (currentPlatform === 'ios') {
        tracker = iosInstance;
      } else if (currentPlatform === 'android') {
        tracker = androidInstance;
      } else {
        throw new Error(`Step tracking is not supported on ${currentPlatform}`);
      }
      return tracker;
    }),
  };
});

describe('getStepTracker', () => {
  beforeEach(() => {
    vi.resetModules();
  });

  it('returns IOSStepTracker on iOS', async () => {
    setPlatformOS('ios');
    const { getStepTracker } = await import('./step-tracker');
    const tracker = getStepTracker();
    expect(tracker).toBe(iosInstance);
  });

  it('returns AndroidStepTracker on Android', async () => {
    setPlatformOS('android');
    const { getStepTracker } = await import('./step-tracker');
    const tracker = getStepTracker();
    expect(tracker).toBe(androidInstance);
  });

  it('throws on unsupported platform', async () => {
    setPlatformOS('web');
    const { getStepTracker } = await import('./step-tracker');
    expect(() => getStepTracker()).toThrow(
      'Step tracking is not supported on web',
    );
  });

  it('caches and returns same instance on subsequent calls', async () => {
    setPlatformOS('ios');
    const { getStepTracker } = await import('./step-tracker');
    const first = getStepTracker();
    const second = getStepTracker();
    expect(first).toBe(second);
    expect(first).toBe(iosInstance);
  });
});
