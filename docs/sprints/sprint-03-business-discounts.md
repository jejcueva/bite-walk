# Sprint 3: Business Partnerships & Discounts

**Release:** 1.0 (MVP)
**Duration:** Weeks 5-6
**Sprint Points:** 29
**Goal:** Build the discount marketplace connecting users to local business rewards. Implement the full redemption flow with QR-code vouchers.

---

## Scope

### 1. Discount Browsing & Discovery (8 pts)

**User Story:** As a user, I want to browse available discounts so I can decide where to walk.

#### Tasks

| # | Task | Technical Details |
|---|------|-----------------|
| 1.1 | Build Discounts list screen | `app/(tabs)/discounts.tsx`; vertical scrollable list of business deal cards; pull-to-refresh |
| 1.2 | Query businesses with PostGIS geo-filtering | `SELECT *, ST_Distance(location, ST_MakePoint($lng, $lat)::geography) AS dist FROM businesses JOIN deals ON businesses.id = deals.business_id WHERE ST_DWithin(location, ST_MakePoint($lng, $lat)::geography, $radius_m) ORDER BY dist` |
| 1.3 | Display deal cards | Business name, logo (Supabase Storage public URL), deal description, points cost, distance from user; `<DealCard>` component |
| 1.4 | Add category filters | Filter chips: `food`, `drinks`, `retail`, `all`; Supabase query: `.eq('category', selected)` or omit filter for all |
| 1.5 | Integrate map view | React Native Maps with business pins; `<MapView>` with custom markers; tap marker to show deal preview bottom sheet |

#### Schema: `businesses`
```sql
CREATE TABLE businesses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_id UUID REFERENCES auth.users(id),
  name TEXT NOT NULL,
  description TEXT,
  logo_url TEXT,
  category TEXT CHECK (category IN ('food', 'drinks', 'retail', 'other')),
  location GEOGRAPHY(POINT, 4326) NOT NULL,
  address TEXT,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX idx_businesses_location ON businesses USING GIST(location);
```

#### Schema: `deals`
```sql
CREATE TABLE deals (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id UUID REFERENCES businesses(id) ON DELETE CASCADE NOT NULL,
  title TEXT NOT NULL,
  description TEXT,
  points_cost INTEGER NOT NULL CHECK (points_cost > 0),
  original_price DECIMAL(10,2),
  discount_percent INTEGER CHECK (discount_percent BETWEEN 1 AND 100),
  is_premium_only BOOLEAN DEFAULT false,
  max_redemptions_per_day INTEGER,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now(),
  expires_at TIMESTAMPTZ
);

CREATE INDEX idx_deals_business ON deals(business_id);
CREATE INDEX idx_deals_active ON deals(is_active) WHERE is_active = true;
```

---

### 2. Points Redemption Flow (13 pts)

**User Story:** As a user, I want to redeem my points for discounts at local businesses.

#### Tasks

| # | Task | Technical Details |
|---|------|-----------------|
| 2.1 | Build redemption flow UI | Deal detail screen -> "Redeem" button -> confirmation modal (shows points cost, current balance) -> QR code display screen |
| 2.2 | Create redemption Edge Function | `supabase/functions/redeem-deal/index.ts`: validate user balance >= cost, debit points, create voucher row, return voucher_id; all in single DB transaction |
| 2.3 | Implement time-limited vouchers | `vouchers` table with `expires_at = now() + INTERVAL '30 minutes'`; client-side countdown timer; auto-expire via PostgreSQL check on validation |
| 2.4 | Build redemption history screen | Query `vouchers` joined with `deals` and `businesses`; filter by status (used, expired, active); sorted by `created_at DESC` |

#### Schema: `vouchers`
```sql
CREATE TABLE vouchers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES profiles(id) NOT NULL,
  deal_id UUID REFERENCES deals(id) NOT NULL,
  ledger_entry_id UUID REFERENCES points_ledger(id) NOT NULL,
  status TEXT CHECK (status IN ('active', 'used', 'expired')) DEFAULT 'active',
  qr_code_data TEXT NOT NULL, -- JSON payload for QR
  created_at TIMESTAMPTZ DEFAULT now(),
  expires_at TIMESTAMPTZ NOT NULL,
  used_at TIMESTAMPTZ
);

CREATE INDEX idx_vouchers_user ON vouchers(user_id, created_at DESC);
CREATE INDEX idx_vouchers_status ON vouchers(status) WHERE status = 'active';
```

#### Edge Function: `redeem-deal`
```typescript
// POST /functions/v1/redeem-deal
// Body: { deal_id: string }
// Returns: { voucher_id: string, qr_data: string, expires_at: string }

const { data, error } = await supabase.rpc('redeem_deal', {
  p_user_id: user.id,
  p_deal_id: body.deal_id
});
// DB function handles: balance check, point debit, voucher creation atomically
```

---

### 3. Business Partner Admin (8 pts)

**User Story:** As a business owner, I want to list my deals on BiteWalk.

#### Tasks

| # | Task | Technical Details |
|---|------|-----------------|
| 3.1 | Create business partner auth | Separate Supabase Auth role; `user_roles` table with `role = 'business_owner'`; RLS policies scoped to `owner_id` |
| 3.2 | Build deal CRUD | Create, update, deactivate deals; RLS: `business_owner` can only modify deals where `businesses.owner_id = auth.uid()` |
| 3.3 | Upload assets to Supabase Storage | Business logos and deal images; `business-assets` bucket with RLS; public read, owner-only write; max 2MB, image/* MIME filter |
| 3.4 | Build voucher validation endpoint | Edge Function `validate-voucher`: accepts voucher_id, checks status = 'active' AND expires_at > now(), marks as 'used', returns deal info |
| 3.5 | Seed pilot business data | SQL seed script for 3-5 Bay Area businesses with sample deals; run via `supabase db seed` |

---

## Dependencies

- Sprint 2 complete (points engine, activity tracking)
- PostGIS extension enabled on Supabase project (`CREATE EXTENSION postgis;`)
- Supabase Storage bucket created
- React Native Maps configured with Google Maps API key

## Definition of Done

- [ ] User can browse deals sorted by proximity
- [ ] Category filters work correctly
- [ ] Full redemption flow: select deal -> confirm -> QR code generated
- [ ] Vouchers expire after 30 minutes (verified via DB constraint)
- [ ] Business owner can create/edit deals via admin portal
- [ ] Voucher validation endpoint returns correct status
- [ ] Seed data loaded for Bay Area pilot businesses
