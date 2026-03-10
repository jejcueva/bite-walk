# Points Engine

BiteWalk awards points for walking. Points are calculated client-side and persisted via database functions and the `point_ledger` table.

## Earning Rules

| Constant | Value | Location |
|----------|-------|----------|
| `POINTS_PER_MILE` | 100 | `packages/shared/src/points.ts` |
| `STEPS_PER_MILE` | 2112 | `packages/shared/src/points.ts` |
| `METERS_PER_MILE` | 1609.34 | `packages/shared/src/points.ts` |

**Formula**: 100 points per mile walked.

## Key File

**`packages/shared/src/points.ts`** — Pure logic, no platform dependencies. Re-exported from `lib/points.ts`.

## Functions

| Function | Purpose |
|----------|---------|
| `stepsToMiles(steps)` | `steps / STEPS_PER_MILE` |
| `metersToMiles(meters)` | `meters / METERS_PER_MILE` |
| `calculatePointsForWalk(distanceMiles)` | `Math.round(distanceMiles * POINTS_PER_MILE)` |
| `canRedeemDiscount(userPoints, pointsRequired)` | `userPoints >= pointsRequired` |

## Database Schema

### point_ledger

Tracks all point transactions (credit/debit):

- `user_id`, `walk_id` (nullable), `entry_type` (`'walk' | 'redeem' | 'bonus' | 'adjustment'`)
- `points_delta` (positive for credits, negative for debits)
- `description`

### walks

Stores walk records with `points_earned`, `distance_meters`, `source` (`'auto' | 'manual'`).

## Database Functions

| Function | Purpose |
|----------|---------|
| `calculate_points(distance_miles)` | Returns `floor(distance_miles * 100)::integer` |
| `credit_points(user_id, amount, reason, walk_id?)` | Inserts ledger entry, returns new balance; uses advisory lock |
| `debit_points(user_id, amount, reason)` | Deducts points, raises if insufficient; uses advisory lock |
| `get_points_balance(user_id)` | Returns `sum(points_delta)` for user |

Defined in `supabase/migrations/20260303010000_point_functions_and_realtime.sql`.

## Flow: Walk to Points

```mermaid
flowchart LR
    A[Walk recorded] --> B[calculatePointsForWalk]
    B --> C[Insert walks row]
    C --> D[credit_points or direct insert]
    D --> E[point_ledger entry]
```

- Walk is inserted into `walks` with `points_earned` and `distance_meters`
- Points are credited via `credit_points` (or equivalent ledger insert) when using DB functions
- Background sync and offline queue insert walks directly; `credit_points` is used when the app credits points via DB RPC
