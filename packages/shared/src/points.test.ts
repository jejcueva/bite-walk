import { describe, it, expect } from 'vitest';
import {
  POINTS_PER_MILE,
  METERS_PER_MILE,
  STEPS_PER_MILE,
  stepsToMiles,
  calculatePointsForWalk,
  metersToMiles,
  canRedeemDiscount,
} from './points';

describe('constants', () => {
  it('has correct points per mile', () => {
    expect(POINTS_PER_MILE).toBe(100);
  });

  it('has correct meters per mile', () => {
    expect(METERS_PER_MILE).toBe(1609.34);
  });

  it('has correct steps per mile', () => {
    expect(STEPS_PER_MILE).toBe(2112);
  });
});

describe('stepsToMiles', () => {
  it('returns 0 for 0 steps', () => {
    expect(stepsToMiles(0)).toBe(0);
  });

  it('returns 0 for negative steps', () => {
    expect(stepsToMiles(-100)).toBe(0);
  });

  it('returns 0 for NaN', () => {
    expect(stepsToMiles(NaN)).toBe(0);
  });

  it('returns 0 for Infinity', () => {
    expect(stepsToMiles(Infinity)).toBe(0);
  });

  it('converts STEPS_PER_MILE steps to exactly 1 mile', () => {
    expect(stepsToMiles(STEPS_PER_MILE)).toBeCloseTo(1, 4);
  });

  it('converts double STEPS_PER_MILE to 2 miles', () => {
    expect(stepsToMiles(STEPS_PER_MILE * 2)).toBeCloseTo(2, 4);
  });

  it('converts fractional steps', () => {
    expect(stepsToMiles(1056)).toBeCloseTo(0.5, 4);
  });
});

describe('metersToMiles', () => {
  it('returns 0 for 0 meters', () => {
    expect(metersToMiles(0)).toBe(0);
  });

  it('returns 0 for negative meters', () => {
    expect(metersToMiles(-500)).toBe(0);
  });

  it('returns 0 for NaN', () => {
    expect(metersToMiles(NaN)).toBe(0);
  });

  it('returns 0 for Infinity', () => {
    expect(metersToMiles(Infinity)).toBe(0);
  });

  it('converts METERS_PER_MILE to exactly 1 mile', () => {
    expect(metersToMiles(METERS_PER_MILE)).toBeCloseTo(1, 4);
  });

  it('converts 5000 meters correctly', () => {
    expect(metersToMiles(5000)).toBeCloseTo(3.1069, 3);
  });
});

describe('calculatePointsForWalk', () => {
  it('returns 0 for 0 miles', () => {
    expect(calculatePointsForWalk(0)).toBe(0);
  });

  it('returns 0 for negative miles', () => {
    expect(calculatePointsForWalk(-2)).toBe(0);
  });

  it('returns 0 for NaN', () => {
    expect(calculatePointsForWalk(NaN)).toBe(0);
  });

  it('returns 0 for Infinity', () => {
    expect(calculatePointsForWalk(Infinity)).toBe(0);
  });

  it('awards 100 points for 1 mile', () => {
    expect(calculatePointsForWalk(1)).toBe(100);
  });

  it('awards 350 points for 3.5 miles', () => {
    expect(calculatePointsForWalk(3.5)).toBe(350);
  });

  it('rounds to nearest integer', () => {
    expect(calculatePointsForWalk(0.333)).toBe(33);
    expect(calculatePointsForWalk(0.335)).toBe(34);
  });

  it('handles very small distances', () => {
    expect(calculatePointsForWalk(0.001)).toBe(0);
    expect(calculatePointsForWalk(0.005)).toBe(1);
  });
});

describe('canRedeemDiscount', () => {
  it('returns true when user has enough points', () => {
    expect(canRedeemDiscount(200, 150)).toBe(true);
  });

  it('returns true when user has exact points', () => {
    expect(canRedeemDiscount(150, 150)).toBe(true);
  });

  it('returns false when user has insufficient points', () => {
    expect(canRedeemDiscount(149, 150)).toBe(false);
  });

  it('returns true when both are 0', () => {
    expect(canRedeemDiscount(0, 0)).toBe(true);
  });
});

describe('integration: steps -> miles -> points', () => {
  it('converts steps through the full pipeline', () => {
    const miles = stepsToMiles(STEPS_PER_MILE);
    expect(calculatePointsForWalk(miles)).toBe(100);
  });

  it('converts meters through the full pipeline', () => {
    const miles = metersToMiles(METERS_PER_MILE);
    expect(calculatePointsForWalk(miles)).toBe(100);
  });

  it('handles a realistic walk (4000 steps)', () => {
    const miles = stepsToMiles(4000);
    const points = calculatePointsForWalk(miles);
    expect(points).toBe(189);
  });
});
