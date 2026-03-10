import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
  createWalkId,
  initOfflineWalkQueue,
  enqueueWalk,
  syncQueuedWalks,
  getQueuedWalkCount,
} from './offline-walk-queue.web';

describe('createWalkId', () => {
  it('returns a string', () => {
    const id = createWalkId();
    expect(typeof id).toBe('string');
    expect(id.length).toBeGreaterThan(0);
  });
});

describe('initOfflineWalkQueue', () => {
  it('resolves without error', async () => {
    await expect(initOfflineWalkQueue()).resolves.toBeUndefined();
  });
});

describe('enqueueWalk', () => {
  beforeEach(() => {
    vi.spyOn(console, 'warn').mockImplementation(() => {});
  });

  it('returns the provided walkId when given', async () => {
    const result = await enqueueWalk({
      walkId: 'custom-walk-id',
      userId: 'user-1',
      distanceMeters: 1500,
      pointsEarned: 93,
      source: 'manual',
    });
    expect(result.walkId).toBe('custom-walk-id');
  });

  it('returns a generated walkId when not provided', async () => {
    const result = await enqueueWalk({
      userId: 'user-2',
      distanceMeters: 800,
      pointsEarned: 50,
      source: 'auto',
    });
    expect(typeof result.walkId).toBe('string');
    expect(result.walkId.length).toBeGreaterThan(0);
  });

  it('logs a warning', async () => {
    await enqueueWalk({
      userId: 'user-3',
      distanceMeters: 1000,
      pointsEarned: 62,
      source: 'manual',
    });
    expect(console.warn).toHaveBeenCalledWith(
      '[offline-walk-queue.web] enqueueWalk is a no-op on web',
    );
  });
});

describe('syncQueuedWalks', () => {
  it('returns zeros', async () => {
    const result = await syncQueuedWalks({
      supabase: {},
      userId: 'user-1',
    });
    expect(result).toEqual({ attempted: 0, synced: 0, remaining: 0 });
  });
});

describe('getQueuedWalkCount', () => {
  it('returns 0', async () => {
    const count = await getQueuedWalkCount('user-1');
    expect(count).toBe(0);
  });
});
