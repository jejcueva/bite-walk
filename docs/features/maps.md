# Map Screen

The Map tab displays nearby deals on a full-screen map, giving users a geographic view of
available discounts around them.

## Key Files

| File | Purpose |
|------|---------|
| `app/(tabs)/map.tsx` | Map screen component |
| `app/(tabs)/_layout.tsx` | Tab navigator -- Map is the second tab |

## How It Works

1. On mount, the screen requests foreground location permission via `expo-location`.
2. If granted, the map centers on the user's current position. Otherwise it defaults to the
   San Francisco bay area (37.7749, -122.4194).
3. Deals are fetched using the same `get_nearby_deals` Supabase RPC used by the Discounts screen,
   with a 50 km radius.
4. Each deal is rendered as a colored marker on the map:
   - Food: green (`#2e8b57`)
   - Drinks: blue (`#3a7bd5`)
   - Retail: orange (`#d4832f`)
   - Other: gray (`#808080`)
5. Tapping a marker opens a callout showing the deal title, business name, and points cost.
6. Tapping the callout navigates to `/deal/[id]` for full deal details and redemption.
7. A small legend overlay at the bottom left explains the color coding.

## Dependencies

- `react-native-maps` -- `MapView`, `Marker`, `Callout` components
- `expo-location` -- foreground location permission and position
- Supabase `get_nearby_deals` RPC (PostGIS)

## Data Requirements

The `get_nearby_deals` RPC must return rows that include `latitude` and `longitude` columns
from the `businesses` table location field. Rows without coordinates are filtered out on the
client before rendering markers.
