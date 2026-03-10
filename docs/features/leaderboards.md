# Leaderboards

Leaderboards let users compete by total points, distance, and steps across
configurable time periods. Users can view a global ranking or filter to
friends only.

---

## Database Tables

### `leaderboard_entries`

Stores pre-aggregated ranking data per user. Rows are upserted by the
`refresh_leaderboard_entry` RPC so reads are fast and avoid real-time
aggregation over the walks table.

| Column | Type | Description |
|--------|------|-------------|
| `user_id` | `uuid` (PK, FK to `profiles`) | The ranked user |
| `display_name` | `text` | Denormalized display name from profile |
| `avatar_url` | `text` | Denormalized avatar URL (nullable) |
| `total_points` | `integer` | Aggregate reward points for the period |
| `total_distance_meters` | `numeric` | Aggregate walk distance in meters |
| `total_steps` | `integer` | Aggregate step count |
| `period_type` | `text` | One of `weekly`, `monthly`, `all_time` |
| `updated_at` | `timestamptz` | Last refresh timestamp |

A composite unique constraint exists on `(user_id, period_type)`.

### `friends`

Tracks directional friend relationships between users.

| Column | Type | Description |
|--------|------|-------------|
| `id` | `uuid` (PK) | Row identifier |
| `user_id` | `uuid` (FK to `profiles`) | The user who sent the request |
| `friend_id` | `uuid` (FK to `profiles`) | The target of the request |
| `status` | `text` | `pending`, `accepted`, or `rejected` |
| `created_at` | `timestamptz` | When the request was created |

RLS ensures users can only read rows where they appear as `user_id` or
`friend_id`, insert rows where they are `user_id`, and update rows where
they are `friend_id` (to accept or reject).

---

## RPC Functions

### `get_leaderboard(p_period_type text, p_limit integer)`

Returns the top N users globally for the given period, ordered by
`total_points DESC`. Each row includes a `rank` computed via `ROW_NUMBER()`.

### `get_friends_leaderboard(p_user_id uuid, p_period_type text, p_limit integer)`

Returns the top N users from the caller's accepted friends (plus the caller
themselves), ordered by `total_points DESC` with rank.

### `send_friend_request(p_friend_id uuid)`

Inserts a row into `friends` with `status = 'pending'`. Raises an error if
a relationship already exists in either direction.

### `accept_friend_request(p_friendship_id uuid)`

Sets `status = 'accepted'` on the given friendship row. Only the
`friend_id` (recipient) may call this.

### `refresh_leaderboard_entry(p_user_id uuid)`

Re-aggregates the user's walks for each period type and upserts the
corresponding `leaderboard_entries` rows. This is called:

- After a walk is inserted or updated (via a database trigger).
- On demand from the client when the user opens the leaderboard (to ensure
  freshness).
- Periodically via `pg_cron` (every 5 minutes) for all active users.

---

## UI

The leaderboard screen (`app/leaderboard.tsx`) is a standalone screen
accessible from the distance tab via a "Leaderboard" button placed after
the streak badge.

### Period Selector

A segmented control at the top switches between Weekly, Monthly, and
All Time. Changing the period re-fetches data from the appropriate RPC.

### Scope Toggle

Two chips below the period selector switch between Global and Friends
scope. Global calls `get_leaderboard`; Friends calls
`get_friends_leaderboard`.

### Ranking List

Each row displays:

- **Rank badge** -- gold (#d4a017), silver (#8a8a8a), or bronze (#b5651d)
  background for the top 3; neutral for everyone else.
- **Avatar** -- shows initials derived from the display name (image
  avatars supported in future).
- **Display name** -- with a "(you)" suffix for the current user.
- **Distance and steps** -- secondary line.
- **Points** -- right-aligned, bold green.

The current user's row is highlighted with a card background and green
border so it is easy to locate.

### Pull to Refresh

The list supports pull-to-refresh, which re-invokes the active RPC.

---

## How Entries Are Refreshed

`refresh_leaderboard_entry` is the single source of truth for
leaderboard data. It reads from the `walks` table, filtering by date
range per period:

- **weekly**: walks from the start of the current ISO week.
- **monthly**: walks from the first day of the current month.
- **all_time**: all walks.

It sums `points_earned`, `distance_meters`, and `steps`, then upserts
into `leaderboard_entries`. Because the leaderboard reads from a
pre-aggregated table rather than scanning walks on every request, queries
stay fast even as the walks table grows.
