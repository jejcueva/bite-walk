export const POINTS_PER_MILE = 10;

export function calculatePointsForWalk(distanceMiles: number): number {
  if (!Number.isFinite(distanceMiles) || distanceMiles <= 0) {
    return 0;
  }

  return Math.round(distanceMiles * POINTS_PER_MILE);
}

export function canRedeemDiscount(userPoints: number, pointsRequired: number): boolean {
  return userPoints >= pointsRequired;
}
