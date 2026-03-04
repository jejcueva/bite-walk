# Sprint 2: Step Tracking & Points Engine

**Release:** 1.0 (MVP)
**Duration:** Weeks 3-4
**Sprint Points:** 29
**Goal:** Deliver real-time step tracking with platform-native health APIs and the core points accumulation system backed by ACID-safe PostgreSQL transactions.

---

## Scope

### 1. Step Tracking Integration (13 pts)

**User Story:** As a user, I want my steps tracked automatically so I earn points passively.

#### Tasks

| # | Task | Technical Details |
|---|------|-----------------|
| 1.1 | Integrate Apple HealthKit (iOS) | Use `react-native-health` or `expo-health`; request `HKQuantityTypeIdentifierStepCount` and `HKQuantityTypeIdentifierDistanceWalkingRunning` permissions |
| 1.2 | Integrate Google Fit API (Android) | Use `react-native-google-fit`; request `FITNESS_ACTIVITY_READ` scope; handle OAuth consent flow |
| 1.3 | Build background step sync service | Platform-abstracted `StepTracker` service; poll health APIs every 15 min via `expo-background-fetch`; batch sync to `activity` table |
| 1.4 | Create step-to-points conversion engine | Conversion rate: `1.0 mile = 100 points`; average step length ~2.5ft; `~2,112 steps = 1 mile`; implement in `lib/points.ts` |
| 1.5 | Handle permissions & onboarding | First-launch permission request flow; graceful degradation if denied; settings deep-link to re-enable; platform-specific permission rationale strings |

#### Step Sync Architecture
```
[HealthKit/Google Fit] --> [Background Fetch (15min)]
    --> [Local SQLite cache] --> [Supabase activity table]
    --> [Edge Function: calculate & credit points]
    --> [Realtime subscription updates UI]
```

#### Key Implementation: `StepTracker` Interface
```typescript
interface StepTracker {
  requestPermissions(): Promise<PermissionStatus>;
  getStepsForDate(date: Date): Promise<number>;
  getDistanceForDate(date: Date): Promise<number>; // miles
  subscribeToStepUpdates(callback: (steps: number) => void): () => void;
}
```

---

### 2. Walking Stats Dashboard (8 pts)

**User Story:** As a user, I want to see my walking stats so I can track my progress.

#### Tasks

| # | Task | Technical Details |
|---|------|-----------------|
| 2.1 | Build Distance Walked screen | `app/(tabs)/distance.tsx`; display today's total miles walked, step count; pull from `activity` table filtered by `date = CURRENT_DATE` |
| 2.2 | Create weekly walking chart | Bar chart (S-M-T-W-T-F-S) using `react-native-chart-kit` or `victory-native`; query `activity` table with `date >= NOW() - INTERVAL '7 days'` grouped by day |
| 2.3 | Display current points balance | Prominent balance display; query: `SELECT COALESCE(SUM(CASE WHEN type='credit' THEN amount ELSE -amount END), 0) AS balance FROM points_ledger WHERE user_id = $1` |
| 2.4 | Show conversion rate info | Static UI component: "1.0 mile = 100 points"; progress indicator showing distance to next points milestone |

---

### 3. Points Persistence & Reliability (8 pts)

**User Story:** As a user, I want my points to persist reliably across sessions.

#### Tasks

| # | Task | Technical Details |
|---|------|-----------------|
| 3.1 | Build points ledger with ACID transactions | Use DB function wrapping INSERT in transaction; prevent double-crediting via `reference_id` UNIQUE constraint on `(user_id, reference_id)` |
| 3.2 | Create atomic point transaction function | PostgreSQL function: `credit_walking_points(p_user_id UUID, p_distance FLOAT, p_activity_id UUID)` — calculates points, inserts ledger row, returns new balance; all in single transaction |
| 3.3 | Implement offline cache + sync queue | Local SQLite via `expo-sqlite`; queue unsynced activity records; sync on reconnect with conflict resolution (server timestamp wins) |
| 3.4 | Subscribe to Realtime for balance updates | `supabase.channel('points').on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'points_ledger', filter: 'user_id=eq.{uid}' }, callback)` |
| 3.5 | Write unit tests | Test points calculation (edge cases: 0 distance, fractional miles, max daily cap); test transaction atomicity (simulate concurrent writes); test offline queue ordering |

#### DB Function: Atomic Point Credit
```sql
CREATE OR REPLACE FUNCTION credit_walking_points(
  p_user_id UUID,
  p_distance_miles FLOAT,
  p_activity_id UUID
) RETURNS INTEGER AS $$
DECLARE
  v_points INTEGER;
  v_balance INTEGER;
BEGIN
  v_points := FLOOR(p_distance_miles * 100);

  INSERT INTO points_ledger (user_id, amount, type, reason, reference_id)
  VALUES (p_user_id, v_points, 'credit', 'walking', p_activity_id)
  ON CONFLICT (user_id, reference_id) DO NOTHING;

  SELECT COALESCE(SUM(CASE WHEN type = 'credit' THEN amount ELSE -amount END), 0)
  INTO v_balance
  FROM points_ledger
  WHERE user_id = p_user_id;

  RETURN v_balance;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
```

---

## Dependencies

- Sprint 1 complete (auth, DB schema, CI/CD)
- Apple Developer HealthKit entitlement configured
- Google Fit API enabled in GCP console

## Definition of Done

- [x] Steps sync from HealthKit (iOS) and Google Fit (Android) in background
- [x] Points credited correctly at 100 pts/mile rate
- [x] Points balance updates in real-time via Supabase Realtime
- [x] Weekly chart renders accurate historical data
- [x] Offline walking data syncs on reconnect without duplicates
- [x] Unit tests pass for points calculation and transaction logic
