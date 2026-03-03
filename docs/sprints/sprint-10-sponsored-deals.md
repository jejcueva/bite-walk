# Sprint 10: Sponsored Deals & Ad Platform

**Release:** 3.0 (Scale)
**Duration:** Weeks 19-20
**Sprint Points:** 21
**Goal:** Launch the sponsored deals marketplace as a new B2B revenue stream. Enable businesses to pay for promoted placement with impression/click tracking and Stripe metered billing.

---

## Scope

### 1. Sponsored Deals Backend (13 pts)

**User Story:** As a business owner, I want to promote my deals to more users.

#### Tasks

| # | Task | Technical Details |
|---|------|-----------------|
| 1.1 | Build `sponsored_deals` table | Columns: `deal_id FK`, `budget_cents INT`, `spent_cents INT`, `cpm_cents INT` (cost per 1000 impressions), `priority INT`, `status ENUM['active','paused','exhausted']`, `start_date`, `end_date` |
| 1.2 | Create self-serve ad purchase flow | Web form for business partners: select deal to promote, set daily budget, choose date range; Stripe payment method on file; create `sponsored_deals` row |
| 1.3 | Build sponsored deal serving Edge Function | `supabase/functions/serve-sponsored/index.ts`: query active sponsored deals within user's geo-radius; weighted random selection by priority and remaining budget; return deal + `impression_id` |
| 1.4 | Implement impression/click tracking | `ad_events` table: `(id, sponsored_deal_id, user_id, event_type ENUM['impression','click','redemption'], created_at)`; client fires impression on render, click on tap |
| 1.5 | Build Stripe metered billing | Stripe metered subscription for ad spend; Edge Function reports usage daily: `stripe.subscriptionItems.createUsageRecord()`; business charged based on actual impressions delivered |

#### Schema: `sponsored_deals`
```sql
CREATE TABLE sponsored_deals (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  deal_id UUID REFERENCES deals(id) ON DELETE CASCADE NOT NULL,
  business_id UUID REFERENCES businesses(id) NOT NULL,
  budget_cents INTEGER NOT NULL CHECK (budget_cents > 0),
  spent_cents INTEGER DEFAULT 0,
  cpm_cents INTEGER NOT NULL DEFAULT 500, -- $5 CPM default
  priority INTEGER DEFAULT 1 CHECK (priority BETWEEN 1 AND 10),
  status TEXT CHECK (status IN ('active', 'paused', 'exhausted')) DEFAULT 'active',
  start_date DATE NOT NULL,
  end_date DATE NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now(),
  CHECK (end_date > start_date)
);

CREATE INDEX idx_sponsored_active ON sponsored_deals(status, start_date, end_date)
  WHERE status = 'active';
```

#### Schema: `ad_events`
```sql
CREATE TABLE ad_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  sponsored_deal_id UUID REFERENCES sponsored_deals(id) NOT NULL,
  user_id UUID REFERENCES profiles(id),
  event_type TEXT CHECK (event_type IN ('impression', 'click', 'redemption')) NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX idx_ad_events_sponsored ON ad_events(sponsored_deal_id, event_type);
CREATE INDEX idx_ad_events_date ON ad_events(created_at);

-- Daily budget exhaustion check trigger
CREATE OR REPLACE FUNCTION check_budget_exhaustion()
RETURNS TRIGGER AS $$
BEGIN
  UPDATE sponsored_deals
  SET spent_cents = (
    SELECT COUNT(*) * cpm_cents / 1000
    FROM ad_events
    WHERE sponsored_deal_id = NEW.sponsored_deal_id
    AND event_type = 'impression'
  )
  WHERE id = NEW.sponsored_deal_id;

  UPDATE sponsored_deals
  SET status = 'exhausted'
  WHERE id = NEW.sponsored_deal_id
  AND spent_cents >= budget_cents;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_check_budget
  AFTER INSERT ON ad_events
  FOR EACH ROW
  WHEN (NEW.event_type = 'impression')
  EXECUTE FUNCTION check_budget_exhaustion();
```

---

### 2. Sponsored Deal UX (8 pts)

**User Story:** As a user, I want sponsored deals to feel relevant, not intrusive.

#### Tasks

| # | Task | Technical Details |
|---|------|-----------------|
| 2.1 | Design native-feeling sponsored cards | "Sponsored" label (subtle, compliant with ad guidelines); same card layout as organic deals; slightly elevated/highlighted border |
| 2.2 | Implement location + preference targeting | PostGIS proximity filter + user's category preferences (from `profiles.preferences` JSONB); score: `0.6 * geo_score + 0.4 * preference_score` |
| 2.3 | Add user feedback on relevance | Thumbs up/down on sponsored cards; stored in `ad_feedback` table; negative feedback reduces that deal's targeting score for that user |
| 2.4 | Build frequency capping | Edge Function logic: max 3 sponsored impressions per user per day; max 1 impression per sponsored deal per user per day; tracked via `ad_events` count queries |

#### Serving Algorithm (Edge Function)
```typescript
// Pseudo-code for sponsored deal selection
const eligibleDeals = await supabase.rpc('get_eligible_sponsored_deals', {
  p_user_id: userId,
  p_lat: userLat,
  p_lng: userLng,
  p_radius_m: 5000,
  p_max_daily_impressions: 3
});

// Weighted random selection by priority
const selected = weightedRandom(eligibleDeals, deal => deal.priority);
```

---

## Dependencies

- Release 2.0 shipped
- Stripe account with metered billing products configured
- PostGIS extension active
- Ad disclosure compliance reviewed (FTC guidelines)

## Definition of Done

- [ ] Business can create a sponsored deal campaign with budget and date range
- [ ] Sponsored deals appear in user feed with "Sponsored" label
- [ ] Impressions and clicks tracked accurately in `ad_events`
- [ ] Budget exhaustion pauses sponsored deal automatically
- [ ] Stripe metered billing charges based on actual impressions
- [ ] Frequency capping limits user exposure
- [ ] User feedback (thumbs up/down) stored and affects targeting
