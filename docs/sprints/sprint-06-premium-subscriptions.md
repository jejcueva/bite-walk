# Sprint 6: Premium Subscription Tier

**Release:** 2.0 (Growth)
**Duration:** Weeks 11-12
**Sprint Points:** 26
**Goal:** Launch the $4.99/month premium subscription with double points, VIP-only deals, and ad-free experience. Integrate Stripe + native IAP billing.

---

## Scope

### 1. Payment Integration & Subscription Flow (13 pts)

**User Story:** As a user, I want to upgrade to premium for better rewards.

#### Tasks

| # | Task | Technical Details |
|---|------|-----------------|
| 1.1 | Integrate Stripe for web/backend billing | Stripe Checkout for web admin; Stripe webhooks handled by Edge Function; `stripe.subscriptions.create()` with `price_id` for $4.99/mo plan |
| 1.2 | Implement Apple IAP | `react-native-iap`; configure subscription product in App Store Connect; handle `purchaseUpdatedListener` for receipt validation |
| 1.3 | Implement Google Play Billing | `react-native-iap` (shared API); configure subscription in Google Play Console; server-side receipt verification via Edge Function |
| 1.4 | Build Stripe/IAP webhook Edge Function | `supabase/functions/billing-webhook/index.ts`: handle events `invoice.paid`, `customer.subscription.deleted`, `customer.subscription.updated`; update `profiles.subscription_tier` |
| 1.5 | Add `subscription_tier` to profiles | `ALTER TABLE profiles ADD COLUMN subscription_tier TEXT DEFAULT 'free' CHECK (subscription_tier IN ('free', 'premium'));` Update RLS policies to be tier-aware |
| 1.6 | Build premium upsell screen | Feature comparison (free vs premium); CTA button triggers native IAP purchase flow; loading + success/error states |
| 1.7 | Create premium visual indicators | Premium badge on profile; gold accent color for premium UI elements; "PRO" label on premium-only deals |

#### Subscription State Machine
```
free --> purchasing --> premium
premium --> canceling --> free (at period end)
premium --> renewing --> premium
```

---

### 2. Premium Benefits Implementation (8 pts)

**User Story:** As a premium user, I want exclusive benefits that justify the cost.

#### Tasks

| # | Task | Technical Details |
|---|------|-----------------|
| 2.1 | Implement 2x points multiplier | Modify `credit_walking_points()` DB function: `v_points := FLOOR(p_distance_miles * 100 * CASE WHEN v_tier = 'premium' THEN 2 ELSE 1 END);` |
| 2.2 | Build VIP discount tier | Deals with `is_premium_only = true`; query filter: free users see `WHERE is_premium_only = false`, premium users see all; visual lock icon on premium deals for free users |
| 2.3 | Remove ads for premium | Client-side check: `if (user.subscription_tier !== 'premium') { showAd(); }`; ad placement components conditionally rendered |
| 2.4 | Add priority support channel | In-app support chat or dedicated email; route based on tier; response SLA indicator in UI |

#### Updated Points Function
```sql
CREATE OR REPLACE FUNCTION credit_walking_points(
  p_user_id UUID,
  p_distance_miles FLOAT,
  p_activity_id UUID
) RETURNS INTEGER AS $$
DECLARE
  v_points INTEGER;
  v_tier TEXT;
  v_multiplier INTEGER;
BEGIN
  SELECT subscription_tier INTO v_tier FROM profiles WHERE id = p_user_id;
  v_multiplier := CASE WHEN v_tier = 'premium' THEN 2 ELSE 1 END;
  v_points := FLOOR(p_distance_miles * 100 * v_multiplier);

  INSERT INTO points_ledger (user_id, amount, type, reason, reference_id)
  VALUES (p_user_id, v_points, 'credit', 'walking', p_activity_id)
  ON CONFLICT (user_id, reference_id) DO NOTHING;

  RETURN v_points;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
```

---

### 3. Subscription Management & Analytics (5 pts)

**User Story:** As the team, we want to manage subscriptions and prevent churn.

#### Tasks

| # | Task | Technical Details |
|---|------|-----------------|
| 3.1 | Build subscription management screen | Show current plan, next billing date, cancel button; `react-native-iap` `getSubscriptions()` for active status; cancel redirects to native subscription management |
| 3.2 | Implement grace period & renewal reminders | Edge Function cron (daily): query users with `subscription_expires_at < now() + INTERVAL '3 days'`; send FCM reminder; 7-day grace period before downgrade |
| 3.3 | Set up subscription analytics | PostgreSQL queries: `conversion_rate = premium_count / total_count`, `churn_rate = canceled_last_30d / premium_start_30d`, `LTV = avg_months_subscribed * 4.99` |
| 3.4 | Create A/B test framework | Feature flags table in Supabase; assign users to experiment groups on signup; log variant + outcome for pricing experiments |

---

## Dependencies

- Release 1.0 shipped and stable
- Stripe account with subscription product configured
- App Store Connect IAP product created
- Google Play subscription product created

## Definition of Done

- [ ] User can subscribe via Apple IAP (iOS) and Google Play Billing (Android)
- [ ] Webhook correctly updates `subscription_tier` in DB
- [ ] Premium users earn 2x points (verified in points_ledger)
- [ ] Premium-only deals visible only to premium users
- [ ] Subscription cancellation flows work on both platforms
- [ ] Analytics dashboard shows conversion and churn rates
