export const POINTS_PER_MILE = 100;
export const METERS_PER_MILE = 1609.34;

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
