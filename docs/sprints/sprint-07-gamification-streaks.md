# Sprint 7: Gamification & Streaks

**Release:** 2.0 (Growth)
**Duration:** Weeks 13-14
**Sprint Points:** 21
**Goal:** Add game-like mechanics (streaks, achievements, badges, avatars) to drive daily engagement and long-term retention.

---

## Scope

### 1. Walking Streaks (8 pts)

**User Story:** As a user, I want walking streaks so I stay motivated to walk daily.

#### Tasks

| # | Task | Technical Details |
|---|------|-----------------|
| 1.1 | Build `streaks` table | Columns: `user_id`, `current_streak INT`, `longest_streak INT`, `last_active_date DATE`, `streak_protected BOOLEAN`; unique on `user_id` |
| 1.2 | Create streak calculation DB function | `update_streak(p_user_id)`: if `last_active_date = CURRENT_DATE - 1` then increment; if `= CURRENT_DATE` then no-op; else reset to 1 (or protect if premium) |
| 1.3 | Build visual streak calendar | 7-day row + monthly grid view; green fill for active days; fire icon for current streak count; `react-native-calendars` or custom component |
| 1.4 | Implement streak milestones | Bonus points at thresholds: 7-day (+200), 30-day (+1000), 100-day (+5000); credited via `points_ledger` with `reason = 'streak_milestone'` |
| 1.5 | Add premium streak protection | Premium users: 1 missed day forgiven per streak; `streak_protected` flag prevents reset once; resets after use; `CASE WHEN v_tier = 'premium' AND NOT streak_protected THEN protect ELSE reset END` |

#### Schema: `streaks`
```sql
CREATE TABLE streaks (
  user_id UUID PRIMARY KEY REFERENCES profiles(id) ON DELETE CASCADE,
  current_streak INTEGER DEFAULT 0,
  longest_streak INTEGER DEFAULT 0,
  last_active_date DATE,
  streak_protected BOOLEAN DEFAULT false,
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE OR REPLACE FUNCTION update_streak(p_user_id UUID)
RETURNS INTEGER AS $$
DECLARE
  v_streak RECORD;
  v_tier TEXT;
BEGIN
  SELECT * INTO v_streak FROM streaks WHERE user_id = p_user_id;
  SELECT subscription_tier INTO v_tier FROM profiles WHERE id = p_user_id;

  IF v_streak IS NULL THEN
    INSERT INTO streaks (user_id, current_streak, longest_streak, last_active_date)
    VALUES (p_user_id, 1, 1, CURRENT_DATE);
    RETURN 1;
  END IF;

  IF v_streak.last_active_date = CURRENT_DATE THEN
    RETURN v_streak.current_streak; -- already counted today
  ELSIF v_streak.last_active_date = CURRENT_DATE - 1 THEN
    UPDATE streaks SET
      current_streak = current_streak + 1,
      longest_streak = GREATEST(longest_streak, current_streak + 1),
      last_active_date = CURRENT_DATE,
      streak_protected = false
    WHERE user_id = p_user_id;
    RETURN v_streak.current_streak + 1;
  ELSIF v_tier = 'premium' AND NOT v_streak.streak_protected
        AND v_streak.last_active_date = CURRENT_DATE - 2 THEN
    UPDATE streaks SET
      current_streak = current_streak + 1,
      longest_streak = GREATEST(longest_streak, current_streak + 1),
      last_active_date = CURRENT_DATE,
      streak_protected = true
    WHERE user_id = p_user_id;
    RETURN v_streak.current_streak + 1;
  ELSE
    UPDATE streaks SET
      current_streak = 1,
      last_active_date = CURRENT_DATE,
      streak_protected = false
    WHERE user_id = p_user_id;
    RETURN 1;
  END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
```

---

### 2. Achievements & Badges (8 pts)

**User Story:** As a user, I want achievements and badges so walking feels like a game.

#### Tasks

| # | Task | Technical Details |
|---|------|-----------------|
| 2.1 | Design achievements schema | `achievements` (id, key, title, description, icon_url, threshold_type, threshold_value); `user_achievements` (user_id, achievement_id, unlocked_at) |
| 2.2 | Build achievement evaluation triggers | DB trigger on `points_ledger` INSERT and `activity` INSERT; evaluate thresholds (total_points >= X, total_distance >= X, streak >= X); insert into `user_achievements` if not exists |
| 2.3 | Build achievement showcase on profile | Grid of badges (locked = grayscale, unlocked = color); tap for detail modal with description and unlock date |
| 2.4 | Implement progress bars & notifications | For each unearned achievement: progress bar showing `current / threshold`; FCM notification on unlock |
| 2.5 | Create weekly/monthly challenges | `challenges` table with `start_date`, `end_date`, `goal_type`, `goal_value`; Edge Function creates new challenges on schedule; leaderboard per challenge |

#### Achievement Definitions
```sql
INSERT INTO achievements (key, title, description, threshold_type, threshold_value) VALUES
  ('first_walk', 'First Steps', 'Complete your first walk', 'total_walks', 1),
  ('mile_marker', 'Mile Marker', 'Walk 1 mile total', 'total_distance', 1),
  ('ten_miles', 'Ten Miler', 'Walk 10 miles total', 'total_distance', 10),
  ('hundred_miles', 'Century Walker', 'Walk 100 miles total', 'total_distance', 100),
  ('first_redeem', 'Deal Hunter', 'Redeem your first deal', 'total_redemptions', 1),
  ('streak_7', 'Week Warrior', '7-day walking streak', 'streak', 7),
  ('streak_30', 'Monthly Master', '30-day walking streak', 'streak', 30),
  ('points_1k', 'Point Collector', 'Earn 1,000 points', 'total_points', 1000),
  ('points_10k', 'Point Hoarder', 'Earn 10,000 points', 'total_points', 10000);
```

---

### 3. Avatars & Customization (5 pts)

**User Story:** As a user, I want avatars and customization to make the app feel personal.

#### Tasks

| # | Task | Technical Details |
|---|------|-----------------|
| 3.1 | Build avatar selection screen | Grid of available avatars; selected state; save to `profiles.avatar_url` |
| 3.2 | Store assets in Supabase Storage | `avatars` bucket (public read); upload base avatar set; URL stored in `profiles.avatar_url` |
| 3.3 | Create avatar progression | Unlock new avatars at milestones (10mi, 50mi, 100mi); tied to achievements system |
| 3.4 | Design seasonal/limited-edition items | Time-gated avatars (e.g., holiday themes); `avatar_items` table with `available_from`/`available_until` dates |
| 3.5 | Display avatar on profile & leaderboard | `<Avatar>` component renders on profile header, leaderboard rows, group member lists |

---

## Dependencies

- Sprint 6 complete (premium tier for streak protection and tier-aware logic)
- FCM configured (Sprint 4) for achievement notifications
- Supabase Storage configured for avatar assets

## Definition of Done

- [ ] Streaks increment correctly on daily walks; reset on missed days (unless premium protected)
- [ ] Streak milestones award bonus points automatically
- [ ] Achievements unlock based on DB triggers (no client-side logic)
- [ ] Achievement notifications delivered via FCM
- [ ] Avatar selection persists and displays across all screens
- [ ] Weekly challenge active with visible leaderboard
