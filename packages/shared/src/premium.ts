import { POINTS_PER_MILE } from './points';

export const FREE_MULTIPLIER = 1;
export const PREMIUM_MULTIPLIER = 2;

export type SubscriptionPlan = 'free' | 'premium';
export type SubscriptionStatus = 'free' | 'active' | 'expired' | 'cancelled';

type SubscriptionLike = {
  plan: string;
  is_active: boolean;
  expires_at: string | null;
} | null;

export function calculatePointsWithMultiplier(
  distanceMiles: number,
  multiplier: number,
): number {
  if (!Number.isFinite(distanceMiles) || distanceMiles <= 0) return 0;
  return Math.round(distanceMiles * POINTS_PER_MILE * multiplier);
}

export function isPremiumActive(subscription: SubscriptionLike): boolean {
  if (!subscription) return false;
  if (subscription.plan !== 'premium') return false;
  if (!subscription.is_active) return false;
  if (subscription.expires_at && new Date(subscription.expires_at) <= new Date()) return false;
  return true;
}

export function getSubscriptionStatus(subscription: SubscriptionLike): SubscriptionStatus {
  if (!subscription) return 'free';
  if (!subscription.is_active) return 'cancelled';
  if (subscription.expires_at && new Date(subscription.expires_at) <= new Date()) return 'expired';
  if (subscription.plan === 'premium') return 'active';
  return 'free';
}
