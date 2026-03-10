# Daily Goals

Daily goals let users set a step/distance target and track progress through the day.

## How It Works

Each user gets a daily goal row created automatically when they open the app. The default target is 10,000 steps (approximately 7,620 meters). As walks are recorded throughout the day, the goal progress updates.

## Database

### `daily_goals` table

| Column | Type | Notes |
|--------|------|-------|
| id | uuid | Primary key |
| user_id | uuid | References auth.users |
| goal_date | date | Unique per user per day |
| target_steps | integer | Default 10,000 |
| actual_steps | integer | Updated as walks come in |
| target_distance_meters | numeric | Derived from target_steps |
| actual_distance_meters | numeric | Updated as walks come in |
| completed_at | timestamptz | Set when goal is met |

### RPC Functions

- `get_or_create_daily_goal(user_id, target_steps)` -- Creates today's goal if it doesn't exist, returns it
- `update_daily_goal_progress(user_id)` -- Sums today's walks and updates actual_steps/distance. If target met, sets completed_at and triggers streak update

## Shared Logic

`packages/shared/src/daily-goals.ts` contains pure functions:

- `DEFAULT_DAILY_STEP_GOAL` -- 10,000 steps
- `DEFAULT_DAILY_DISTANCE_GOAL_METERS` -- ~7,620 meters (derived from steps / STEPS_PER_MILE * METERS_PER_MILE)
- `getGoalProgress(actual, target)` -- Returns 0..1 progress ratio, capped at 1
- `isGoalCompleted(actualSteps, actualDistance, targetSteps, targetDistance)` -- True if either metric meets target

## UI Components

### ProgressRing (`components/ui/ProgressRing.tsx`)

Circular progress indicator showing daily goal completion. Renders a ring of dots that fill as progress increases. Changes color to green on completion.

Props: `progress` (0-1), `size`, `strokeWidth`, `label`, `sublabel`, `completed`

### Hook: `useDailyGoal` (`hooks/use-daily-goal.ts`)

Provides all daily goal state:

- `goal` -- Current DailyGoal record
- `streak` -- Current Streak record
- `progress` -- 0-1 number (max of step or distance progress)
- `completed` -- Boolean
- `streakStatus` -- 'active' | 'at_risk' | 'broken' | 'inactive'
- `refreshProgress()` -- Call after a walk is recorded
- `refetch()` -- Full refetch

## Integration

The distance tab (`app/(tabs)/distance.tsx`) displays the progress ring at the top. After a manual walk is saved, it calls `refreshProgress()` to update the goal. Background sync also triggers goal updates on the server side.
