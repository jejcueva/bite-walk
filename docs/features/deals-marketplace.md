# Deals Marketplace

The marketplace connects users with local restaurant and business deals redeemable with walking points.

## Database Schema

### Tables

| Table | Purpose |
|-------|---------|
| `businesses` | Business profiles with PostGIS location |
| `deals` | Individual deals per business |
| `vouchers` | Redeemed deal vouchers |
| `favorites` | User-favorited deals |
| `business_hours` | Operating hours per business per day |

### `deals` columns

| Column | Type | Notes |
|--------|------|-------|
| id | uuid | Primary key |
| business_id | uuid | References businesses |
| title | text | Deal name |
| description | text | Optional detail |
| points_cost | integer | Points required to redeem |
| original_price | numeric | Original item price |
| discount_percent | integer | 1-100 |
| image_url | text | Deal image in Supabase storage |
| subcategory | text | breakfast, lunch, dinner, coffee, dessert, drinks, snacks |
| is_premium_only | boolean | Premium subscribers only |
| is_active | boolean | Soft delete |

### View: `deals_with_businesses`

Joins `deals` and `businesses` for display. Includes `image_url`, `subcategory`, `business_name`, `business_logo_url`, `category`, `address`, `location`.

### Nearby Deals

`get_nearby_deals(lng, lat, radius_m)` uses PostGIS `ST_DWithin` to find deals within a radius, sorted by distance. Falls back to all active deals if no coordinates provided.

### Favorites

- `toggle_favorite(user_id, deal_id)` -- Adds or removes a favorite. Returns `true` if added.
- `get_favorite_deal_ids(user_id)` -- Returns set of favorited deal IDs.

## Shared Business Logic

`packages/shared/src/deals.ts`:

| Function | Purpose |
|----------|---------|
| `filterDealsByCategory(deals, category)` | Filter by business category (food, drinks, retail, other) |
| `filterDealsBySubcategory(deals, sub)` | Filter by meal subcategory (breakfast, lunch, etc.) |
| `sortDealsByDistance(deals)` | Sort by distance, nulls last |
| `sortDealsByPoints(deals, direction)` | Sort by points cost |
| `formatDistance(meters)` | Human-readable distance (500 m, 2.5 km) |
| `searchDeals(deals, query)` | Case-insensitive title search |

Constants: `DEAL_CATEGORIES`, `DEAL_SUBCATEGORIES`

## UI

### Discounts Screen (`app/(tabs)/discounts.tsx`)

- **Search bar** at top for deal title search
- **Category chips**: All, Food, Drinks, Retail, Other + Favorites toggle
- **Subcategory chips**: Horizontal scroll with restaurant-focused filters (Breakfast, Lunch, Dinner, Coffee, etc.)
- **Deal cards**: Business name, deal title, points cost, distance badge, heart favorite icon
- **Pull to refresh**: Reloads deals and favorites

### Deal Detail (`app/deal/[id].tsx`)

Full deal view with redeem button. Calls `redeem-deal` edge function.

### Voucher Display (`app/voucher/[id].tsx`)

QR code display with countdown timer for 30-minute expiry.

## Edge Functions

| Function | Path | Purpose |
|----------|------|---------|
| `redeem-deal` | `supabase/functions/redeem-deal/` | Debit points, create voucher |
| `validate-voucher` | `supabase/functions/validate-voucher/` | Mark voucher as used |

## Redemption Flow

1. User taps "Redeem" on deal detail
2. Edge function `redeem-deal` calls `debit_points` then creates voucher with 30-min expiry
3. Voucher screen shows QR code
4. Business scans QR, calls `validate-voucher` to mark as used
