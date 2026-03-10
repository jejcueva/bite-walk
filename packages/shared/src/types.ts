export type WalkSource = 'manual' | 'auto';

export type VoucherStatus = 'active' | 'used' | 'expired';

export type DealCategory = 'food' | 'drinks' | 'retail' | 'other';

export type UserRole = 'user' | 'business_owner' | 'admin';

export type PointLedgerEntryType = 'credit' | 'debit';

export interface Profile {
  id: string;
  display_name: string | null;
  avatar_url: string | null;
  created_at: string;
  updated_at: string;
}

export interface Walk {
  id: string;
  user_id: string;
  walked_at: string;
  steps: number | null;
  distance_meters: number;
  points_earned: number;
  note: string | null;
  source: WalkSource;
  created_at: string;
  updated_at: string;
}

export interface PointLedgerEntry {
  id: string;
  user_id: string;
  walk_id: string | null;
  entry_type: PointLedgerEntryType;
  points_delta: number;
  description: string | null;
  created_at: string;
}

export interface Business {
  id: string;
  owner_id: string;
  name: string;
  description: string | null;
  address: string | null;
  category: DealCategory;
  logo_url: string | null;
  is_active: boolean;
  created_at: string;
}

export interface Deal {
  id: string;
  business_id: string;
  title: string;
  description: string | null;
  points_cost: number;
  original_price: number | null;
  discount_percent: number | null;
  image_url: string | null;
  subcategory: string | null;
  is_active: boolean;
  is_premium_only: boolean;
  created_at: string;
}

export interface Favorite {
  id: string;
  user_id: string;
  deal_id: string;
  created_at: string;
}

export interface BusinessHours {
  id: string;
  business_id: string;
  day_of_week: number;
  open_time: string;
  close_time: string;
  is_closed: boolean;
}

export interface DealWithBusiness extends Deal {
  business_name: string;
  business_category: DealCategory;
  business_address: string | null;
  business_logo_url: string | null;
  distance_meters?: number;
}

export interface Voucher {
  id: string;
  user_id: string;
  deal_id: string;
  ledger_entry_id: string;
  status: VoucherStatus;
  qr_code_data: string;
  expires_at: string;
  used_at: string | null;
  created_at: string;
}

export interface Discount {
  id: string;
  slug: string;
  title: string;
  description: string | null;
  partner_name: string;
  points_cost: number;
  coupon_code: string | null;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface DailyGoal {
  id: string;
  user_id: string;
  goal_date: string;
  target_steps: number;
  actual_steps: number;
  target_distance_meters: number;
  actual_distance_meters: number;
  completed_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface Streak {
  user_id: string;
  current_streak: number;
  longest_streak: number;
  last_active_date: string | null;
  created_at: string;
  updated_at: string;
}

export interface LeaderboardEntry {
  user_id: string;
  display_name: string;
  avatar_url: string | null;
  total_points: number;
  total_distance_meters: number;
  total_steps: number;
  rank: number;
}

export type LeaderboardPeriod = 'weekly' | 'monthly' | 'all_time';

export interface Friend {
  id: string;
  user_id: string;
  friend_id: string;
  status: 'pending' | 'accepted' | 'rejected';
  created_at: string;
}

export interface Subscription {
  id: string;
  user_id: string;
  plan: 'free' | 'premium';
  points_multiplier: number;
  started_at: string;
  expires_at: string | null;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}
