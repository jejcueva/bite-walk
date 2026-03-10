# Streaks

Streaks track how many consecutive days a user completes their daily goal.

## How It Works

When a daily goal is completed, the `update_streak` function is called. If the user completed yesterday's goal too, the streak increments. If they missed a day, it resets to 1. The longest streak is always tracked.

## Database

### `streaks` table

| Column | Type | Notes |
|--------|------|-------|
| user_id | uuid | Primary key, references auth.users |
| current_streak | integer | Days in current active streak |
| longest_streak | integer | All-time best |
| last_active_date | date | Last date a goal was completed |

### RPC Functions

- `update_streak(user_id)` -- Called when a goal is completed. Handles:
  - Already active today: no-op
  - Last active yesterday: increment current_streak
  - Gap of 2+ days: reset to 1
  - Updates longest_streak if current exceeds it
- `get_streak(user_id)` -- Returns streak data. Returns zeros if no streak record exists.

## Shared Logic

`packages/shared/src/daily-goals.ts`:

- `getStreakStatus(currentStreak, lastActiveDate, today)` returns one of:
  - `'active'` -- Goal completed today
  - `'at_risk'` -- Last active yesterday, goal not yet completed today
  - `'broken'` -- Missed more than 1 day
  - `'inactive'` -- No streak history

## UI Component

### StreakBadge (`components/ui/StreakBadge.tsx`)

Displays current streak count with status icon and color:

| Status | Icon | Color |
|--------|------|-------|
| active | Fire | Green |
| at_risk | Warning | Orange |
| broken | Broken heart | Red |
| inactive | Target | Muted |

Also shows the user's best/longest streak.

Props: `currentStreak`, `longestStreak`, `status`

## Integration

The `useDailyGoal` hook manages both goal and streak state. The StreakBadge appears on the distance tab below the progress ring.
