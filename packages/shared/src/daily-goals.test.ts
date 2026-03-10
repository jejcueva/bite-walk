import { describe, it, expect } from 'vitest';
import {
  DEFAULT_DAILY_STEP_GOAL,
  DEFAULT_DAILY_DISTANCE_GOAL_METERS,
  getGoalProgress,
  isGoalCompleted,
  getStreakStatus,
} from './daily-goals';

describe('constants', () => {
  it('has a default daily step goal of 10000', () => {
    expect(DEFAULT_DAILY_STEP_GOAL).toBe(10000);
  });

  it('has a default daily distance goal in meters', () => {
    expect(DEFAULT_DAILY_DISTANCE_GOAL_METERS).toBeCloseTo(7619.98, 0);
  });
});

describe('getGoalProgress', () => {
  it('returns 0 when no progress', () => {
    expect(getGoalProgress(0, 10000)).toBe(0);
  });

  it('returns 0.5 at halfway', () => {
    expect(getGoalProgress(5000, 10000)).toBeCloseTo(0.5);
  });

  it('caps at 1.0 even when exceeded', () => {
    expect(getGoalProgress(15000, 10000)).toBe(1);
  });

  it('returns 0 for 0 target', () => {
    expect(getGoalProgress(5000, 0)).toBe(0);
  });

  it('returns 0 for negative actual', () => {
    expect(getGoalProgress(-100, 10000)).toBe(0);
  });

  it('handles fractional progress', () => {
    expect(getGoalProgress(3333, 10000)).toBeCloseTo(0.3333, 3);
  });
});

describe('isGoalCompleted', () => {
  it('returns true when steps meet target', () => {
    expect(isGoalCompleted(10000, 0, 10000, 8047)).toBe(true);
  });

  it('returns true when distance meets target', () => {
    expect(isGoalCompleted(0, 8047, 10000, 8047)).toBe(true);
  });

  it('returns true when both meet target', () => {
    expect(isGoalCompleted(10000, 8047, 10000, 8047)).toBe(true);
  });

  it('returns false when neither meets target', () => {
    expect(isGoalCompleted(5000, 4000, 10000, 8047)).toBe(false);
  });

  it('returns true when steps exceed target', () => {
    expect(isGoalCompleted(12000, 0, 10000, 8047)).toBe(true);
  });
});

describe('getStreakStatus', () => {
  const today = '2026-03-09';

  it('returns active when last_active_date is today', () => {
    expect(getStreakStatus(5, today, today)).toBe('active');
  });

  it('returns at_risk when last_active_date is yesterday', () => {
    expect(getStreakStatus(5, '2026-03-08', today)).toBe('at_risk');
  });

  it('returns broken when last_active_date is older than yesterday', () => {
    expect(getStreakStatus(5, '2026-03-07', today)).toBe('broken');
  });

  it('returns inactive when streak is 0', () => {
    expect(getStreakStatus(0, null, today)).toBe('inactive');
  });

  it('returns broken when last_active_date is null but streak > 0', () => {
    expect(getStreakStatus(3, null, today)).toBe('broken');
  });
});
