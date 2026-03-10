export {
  POINTS_PER_MILE,
  METERS_PER_MILE,
  STEPS_PER_MILE,
  stepsToMiles,
  calculatePointsForWalk,
  metersToMiles,
  canRedeemDiscount,
} from './points';

export {
  DEFAULT_DAILY_STEP_GOAL,
  DEFAULT_DAILY_DISTANCE_GOAL_METERS,
  getGoalProgress,
  isGoalCompleted,
  getStreakStatus,
} from './daily-goals';

export type { StreakStatus } from './daily-goals';

export {
  DEAL_CATEGORIES,
  DEAL_SUBCATEGORIES,
  filterDealsByCategory,
  filterDealsBySubcategory,
  sortDealsByDistance,
  sortDealsByPoints,
  formatDistance,
  searchDeals,
} from './deals';

export type { DealCategoryType, DealSubcategoryType } from './deals';

export {
  FREE_MULTIPLIER,
  PREMIUM_MULTIPLIER,
  calculatePointsWithMultiplier,
  isPremiumActive,
  getSubscriptionStatus,
} from './premium';

export type { SubscriptionPlan, SubscriptionStatus } from './premium';

export type {
  WalkSource,
  VoucherStatus,
  DealCategory,
  UserRole,
  PointLedgerEntryType,
  Profile,
  Walk,
  PointLedgerEntry,
  Business,
  Deal,
  DealWithBusiness,
  Voucher,
  Discount,
  DailyGoal,
  Streak,
  LeaderboardEntry,
  LeaderboardPeriod,
  Friend,
  Subscription,
} from './types';
