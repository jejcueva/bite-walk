import { describe, it, expect } from 'vitest';
import {
  FREE_MULTIPLIER,
  PREMIUM_MULTIPLIER,
  calculatePointsWithMultiplier,
  isPremiumActive,
  getSubscriptionStatus,
} from './premium';

describe('constants', () => {
  it('free multiplier is 1.0', () => {
    expect(FREE_MULTIPLIER).toBe(1);
  });

  it('premium multiplier is 2.0', () => {
    expect(PREMIUM_MULTIPLIER).toBe(2);
  });
});

describe('calculatePointsWithMultiplier', () => {
  it('returns 100 for 1 mile at 1x', () => {
    expect(calculatePointsWithMultiplier(1, FREE_MULTIPLIER)).toBe(100);
  });

  it('returns 200 for 1 mile at 2x', () => {
    expect(calculatePointsWithMultiplier(1, PREMIUM_MULTIPLIER)).toBe(200);
  });

  it('returns 0 for 0 miles', () => {
    expect(calculatePointsWithMultiplier(0, PREMIUM_MULTIPLIER)).toBe(0);
  });

  it('returns 0 for negative miles', () => {
    expect(calculatePointsWithMultiplier(-5, PREMIUM_MULTIPLIER)).toBe(0);
  });

  it('returns 0 for NaN miles', () => {
    expect(calculatePointsWithMultiplier(NaN, PREMIUM_MULTIPLIER)).toBe(0);
  });

  it('rounds correctly with multiplier', () => {
    expect(calculatePointsWithMultiplier(0.33, PREMIUM_MULTIPLIER)).toBe(66);
  });

  it('handles fractional multipliers', () => {
    expect(calculatePointsWithMultiplier(1, 1.5)).toBe(150);
  });
});

describe('isPremiumActive', () => {
  it('returns true for active subscription with no expiry', () => {
    expect(isPremiumActive({ plan: 'premium', is_active: true, expires_at: null })).toBe(true);
  });

  it('returns true for active subscription with future expiry', () => {
    const future = new Date(Date.now() + 86400000).toISOString();
    expect(isPremiumActive({ plan: 'premium', is_active: true, expires_at: future })).toBe(true);
  });

  it('returns false for expired subscription', () => {
    const past = new Date(Date.now() - 86400000).toISOString();
    expect(isPremiumActive({ plan: 'premium', is_active: true, expires_at: past })).toBe(false);
  });

  it('returns false for inactive subscription', () => {
    expect(isPremiumActive({ plan: 'premium', is_active: false, expires_at: null })).toBe(false);
  });

  it('returns false for free plan', () => {
    expect(isPremiumActive({ plan: 'free', is_active: true, expires_at: null })).toBe(false);
  });

  it('returns false for null subscription', () => {
    expect(isPremiumActive(null)).toBe(false);
  });
});

describe('getSubscriptionStatus', () => {
  it('returns free for null subscription', () => {
    expect(getSubscriptionStatus(null)).toBe('free');
  });

  it('returns active for valid premium', () => {
    expect(getSubscriptionStatus({ plan: 'premium', is_active: true, expires_at: null })).toBe('active');
  });

  it('returns expired for past expiry', () => {
    const past = new Date(Date.now() - 86400000).toISOString();
    expect(getSubscriptionStatus({ plan: 'premium', is_active: true, expires_at: past })).toBe('expired');
  });

  it('returns cancelled for inactive premium', () => {
    expect(getSubscriptionStatus({ plan: 'premium', is_active: false, expires_at: null })).toBe('cancelled');
  });
});
