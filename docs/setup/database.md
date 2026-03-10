# BiteWalk Database

## Schema Overview

The database has 8 tables and 1 view:

| Table | Purpose |
|-------|---------|
| `profiles` | User profile (display name, avatar). Linked to `auth.users`. |
| `walks` | Walk records (user, date, steps, distance, points, source). |
| `point_ledger` | Point transactions (walk, redeem, bonus, adjustment). |
| `discounts` | Legacy slug-based discounts (e.g. free coffee). |
| `businesses` | Business locations with PostGIS geography. |
| `deals` | Deals offered by businesses (points cost, expiry). |
| `user_roles` | User roles (user, business_owner, admin). |
| `vouchers` | Redeemed vouchers (QR data, status, expiry). |

| View | Purpose |
|------|---------|
| `deals_with_businesses` | Joins deals and businesses for active deals. |

## Extensions

- **pgcrypto**: UUID generation.
- **PostGIS**: Location queries; `businesses.location` is `geography(point, 4326)`. Used by `get_nearby_deals` for distance-based search.

## Migrations

Migrations live in `supabase/migrations/` and run in filename order. Naming: `YYYYMMDDHHMMSS_description.sql`.

Current migrations (9 files):

1. `20260302201000_init_bite_walk_data.sql` – Core tables, RLS, triggers
2. `20260303010000_point_functions_and_realtime.sql` – Points functions, Realtime publication
3. `20260303020000_walks_source_and_optional_steps.sql` – Walk source, optional steps
4. `20260304010000_business_discounts_schema.sql` – Businesses, deals, user_roles, vouchers
5. `20260304020000_business_deals_view_and_voucher_functions.sql` – View, redeem_deal, validate_voucher
6. `20260304030000_redeem_profile_and_grants.sql` – Profile creation, grants
7. `20260304040000_get_nearby_deals.sql` – PostGIS get_nearby_deals
8. `20260304050000_seed_bay_area_businesses.sql` – Seed businesses and deals
9. `20260304060000_storage_business_assets.sql` – Storage bucket and policies

## schema.sql

`supabase/schema.sql` is the consolidated single source of truth. It contains the full schema (tables, indexes, triggers, RLS, functions, view, seed data, storage). Use it for:

- Fresh project setup (paste into Supabase SQL Editor)
- Understanding the full schema
- Reference when writing new migrations

Migrations are the incremental history; `schema.sql` is the current state.

## Row Level Security (RLS)

RLS is enabled on all public tables. Policies follow an "own data" pattern:

| Table | Pattern |
|-------|---------|
| `profiles` | Select/insert/update own (`auth.uid() = id`) |
| `walks` | Select/insert/update/delete own |
| `point_ledger` | Select/insert/update/delete own |
| `discounts` | Select active only |
| `businesses` | Select active; business_owner can manage own |
| `deals` | Select active; business_owner can manage own business deals |
| `user_roles` | Select own |
| `vouchers` | Select own |

## Functions

| Function | Purpose |
|----------|---------|
| `calculate_points(distance_miles)` | Points from distance (100 per mile). |
| `credit_points(user_id, amount, reason, walk_id?)` | Add points; creates ledger entry. |
| `debit_points(user_id, amount, reason)` | Subtract points; checks balance. |
| `get_points_balance(user_id)` | Current balance. |
| `redeem_deal(user_id, deal_id)` | Redeem deal; creates voucher (30-min expiry). |
| `validate_voucher(voucher_id)` | Validate and mark voucher as used. |
| `get_nearby_deals(lng?, lat?, radius_m?)` | Deals by distance (PostGIS). Without coords, returns all active deals. |

All points and voucher functions use `security definer` and advisory locks for consistency.

## Realtime

`point_ledger` and `walks` are in the `supabase_realtime` publication. Subscriptions receive INSERT/UPDATE/DELETE events for these tables.

## Storage

| Bucket | Public | Limit | Allowed Types |
|--------|--------|-------|---------------|
| `business-assets` | Read | 2MB | image/jpeg, image/png, image/webp, image/gif |

Policies:

- **Public read**: Anyone can read objects in `business-assets`.
- **Authenticated write**: Authenticated users can insert, update, delete.

## Adding New Tables

1. Create migration: `supabase/migrations/YYYYMMDDHHMMSS_description.sql`.
2. In the migration:
   - `CREATE TABLE` with columns and constraints
   - Indexes
   - `ALTER TABLE ... ENABLE ROW LEVEL SECURITY`
   - RLS policies
3. Update `supabase/schema.sql` to reflect the new table (append or merge).
4. Run migrations: `supabase db push` or apply via Supabase dashboard.
