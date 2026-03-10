export const POINTS_PER_MILE = 100;
export const METERS_PER_MILE = 1609.34;
export const STEPS_PER_MILE = 2112;

export function stepsToMiles(steps: number): number {
  if (!Number.isFinite(steps) || steps <= 0) {
    return 0;
  }

  return steps / STEPS_PER_MILE;
}

export function calculatePointsForWalk(distanceMiles: number): number {
  if (!Number.isFinite(distanceMiles) || distanceMiles <= 0) {
    return 0;
  }

  return Math.round(distanceMiles * POINTS_PER_MILE);
}

export function metersToMiles(meters: number): number {
  if (!Number.isFinite(meters) || meters <= 0) {
    return 0;
  }

  return meters / METERS_PER_MILE;
}

export function canRedeemDiscount(userPoints: number, pointsRequired: number): boolean {
  return userPoints >= pointsRequired;
}
