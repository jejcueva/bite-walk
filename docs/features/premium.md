# Premium Subscriptions

Premium subscribers earn a 2x points multiplier on every walk and get access to premium-only deals.

## Database

### `subscriptions` table

| Column | Type | Notes |
|--------|------|-------|
| id | uuid | Primary key |
| user_id | uuid | References auth.users |
| plan | text | `'free'` or `'premium'` |
| points_multiplier | numeric | `1.0` for free, `2.0` for premium |
| started_at | timestamptz | When the subscription began |
| expires_at | timestamptz | Nullable -- null means no expiry |
| is_active | boolean | False when cancelled |
| created_at | timestamptz | Row creation timestamp |
| updated_at | timestamptz | Last update timestamp |

### RPC Functions

- `get_subscription(p_user_id uuid)` -- Returns the subscription row for a user, or null if none exists.
- `get_points_multiplier(p_user_id uuid)` -- Returns the active multiplier for a user. Defaults to `1.0` if no active premium subscription exists.
- `calculate_points_with_multiplier(p_distance_miles numeric, p_multiplier numeric)` -- Server-side points calculation that applies the multiplier. Used in walk-logging triggers to ensure multiplier is applied consistently.

## Shared Logic

`packages/shared/src/premium.ts` exports:

- `FREE_MULTIPLIER` (1) and `PREMIUM_MULTIPLIER` (2) -- Constants for multiplier values.
- `isPremiumActive(subscription)` -- Returns `true` if the subscription is premium, active, and not expired.
- `getSubscriptionStatus(subscription)` -- Returns one of `'free'`, `'active'`, `'expired'`, or `'cancelled'`.
- `calculatePointsWithMultiplier(distanceMiles, multiplier)` -- Pure function for client-side points preview with multiplier applied.

Types exported: `SubscriptionPlan`, `SubscriptionStatus`.

## UI

### Premium Screen (`app/premium.tsx`)

Two states depending on subscription status:

**Not premium:** Hero card with "Go Premium" heading, benefits list (2x points, premium deals, priority support), price display ($4.99/month), and "Upgrade to Premium" button. The upgrade inserts a row into the `subscriptions` table.

**Premium active:** Displays a "Premium Active" header with PRO badge, a large 2x multiplier indicator, plan details (started date, expiry, multiplier), and a "Cancel Subscription" button that sets `is_active` to false.

Registered as a stack screen in `app/_layout.tsx`.

### PremiumBadge (`components/ui/PremiumBadge.tsx`)

Small gold/amber badge displayed inline. Two variants:

| Variant | Display | Usage |
|---------|---------|-------|
| `label` | "PRO" | Next to usernames, headers |
| `multiplier` | "2x" | Next to points displays |

Props: `isActive: boolean`, `variant?: 'label' | 'multiplier'`. Renders nothing when `isActive` is false.

Exported from `components/ui/index.ts`.

### Subscription Hook (`hooks/use-subscription.ts`)

```
useSubscription() => {
  subscription    -- Full Subscription object or null
  isPremium       -- Boolean from isPremiumActive()
  multiplier      -- PREMIUM_MULTIPLIER or FREE_MULTIPLIER
  status          -- SubscriptionStatus ('free' | 'active' | 'expired' | 'cancelled')
  isLoading       -- Loading state
  refetch         -- Re-fetch subscription from server
}
```

Fetches via `supabase.rpc('get_subscription', { p_user_id })`.

## How the Multiplier Affects Points

When a premium user logs a walk, points are calculated as:

```
points = round(distance_miles * POINTS_PER_MILE * multiplier)
```

For free users the multiplier is 1 (no change). For premium users it is 2, doubling all earned points. The server-side `calculate_points_with_multiplier` RPC mirrors this logic for data integrity.

## Premium-Only Deals

The `deals` table has an `is_premium_only` boolean column. Deals with this flag set to `true` are only visible to (or redeemable by) users with an active premium subscription. The app filters these in deal listing queries based on the user's subscription status.

## Distance Tab Integration

The distance tab (`app/(tabs)/distance.tsx`) integrates premium in two ways:

1. A gold "2x" `PremiumBadge` appears next to the points total when the user is premium.
2. A gold "Go Premium" link appears below the leaderboard button when the user is not premium, navigating to `/premium`.
