# Sprint 8: Social Features & Leaderboards

**Release:** 2.0 (Growth)
**Duration:** Weeks 15-16
**Sprint Points:** 24
**Goal:** Enable social connection and community competition. Build leaderboards, friend system, sharing, and group challenges to drive organic growth.

---

## Scope

### 1. Leaderboards & Friend System (8 pts)

**User Story:** As a user, I want to compete with friends on a leaderboard.

#### Tasks

| # | Task | Technical Details |
|---|------|-----------------|
| 1.1 | Build leaderboard SQL views | Materialized views with `RANK()` window function; weekly points, weekly distance, all-time points; refreshed every 5 min via `pg_cron` |
| 1.2 | Implement friend system | `friendships` table: `(user_a, user_b, status, created_at)`; add by username search, contacts import, QR code scan; bidirectional (both must accept) |
| 1.3 | Create campus-wide and friends-only views | Campus: all users ranked; Friends: filter leaderboard view `WHERE user_id IN (SELECT friend_ids_for(auth.uid()))`; tab toggle in UI |
| 1.4 | Subscribe to Realtime for live updates | Realtime subscription on materialized view refresh; or poll every 60s as fallback; animated rank changes in UI |
| 1.5 | Add leaderboard rewards | Scheduled Edge Function (weekly cron): top 3 by points get bonus (1st: 500pts, 2nd: 300pts, 3rd: 100pts); credited to `points_ledger` with `reason = 'leaderboard_reward'` |

#### Schema: `friendships`
```sql
CREATE TABLE friendships (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  requester_id UUID REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  addressee_id UUID REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  status TEXT CHECK (status IN ('pending', 'accepted', 'blocked')) DEFAULT 'pending',
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(requester_id, addressee_id)
);

CREATE INDEX idx_friendships_users ON friendships(requester_id, addressee_id);
CREATE INDEX idx_friendships_status ON friendships(status) WHERE status = 'accepted';

-- RLS: users can see friendships they are part of
CREATE POLICY "Users see own friendships" ON friendships
  FOR SELECT USING (auth.uid() IN (requester_id, addressee_id));
CREATE POLICY "Users can send friend requests" ON friendships
  FOR INSERT WITH CHECK (auth.uid() = requester_id);
CREATE POLICY "Addressee can accept/reject" ON friendships
  FOR UPDATE USING (auth.uid() = addressee_id);
```

#### Leaderboard View
```sql
CREATE MATERIALIZED VIEW weekly_leaderboard AS
SELECT
  p.id AS user_id,
  p.username,
  p.avatar_url,
  COALESCE(SUM(pl.amount), 0) AS weekly_points,
  RANK() OVER (ORDER BY COALESCE(SUM(pl.amount), 0) DESC) AS rank
FROM profiles p
LEFT JOIN points_ledger pl ON p.id = pl.user_id
  AND pl.type = 'credit'
  AND pl.created_at >= date_trunc('week', CURRENT_DATE)
GROUP BY p.id, p.username, p.avatar_url
ORDER BY weekly_points DESC;

CREATE UNIQUE INDEX ON weekly_leaderboard(user_id);
```

---

### 2. Social Sharing & Referrals (8 pts)

**User Story:** As a user, I want to share my achievements on social media.

#### Tasks

| # | Task | Technical Details |
|---|------|-----------------|
| 2.1 | Build shareable achievement cards | Generate image via `react-native-view-shot`; branded card with achievement name, user avatar, stats; saved to device camera roll |
| 2.2 | Integrate native share sheet | `react-native-share`; share to Instagram Stories (using sticker API), Twitter/X, iMessage; include download link with referral code |
| 2.3 | Create referral system | `referrals` table: `(referrer_id, referred_id, referral_code, bonus_credited, created_at)`; unique referral code per user; 500 bonus points for referrer when referee completes first walk |
| 2.4 | Track referral attribution | Deep link with referral code param (`bitewalk.com/invite?ref=ABC123`); captured on signup; Edge Function credits bonus after referee's first activity sync |

#### Schema: `referrals`
```sql
CREATE TABLE referrals (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  referrer_id UUID REFERENCES profiles(id) NOT NULL,
  referred_id UUID REFERENCES profiles(id) UNIQUE, -- one referral per user
  referral_code TEXT UNIQUE NOT NULL,
  bonus_credited BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT now()
);
```

---

### 3. Group Challenges (8 pts)

**User Story:** As a user, I want to join walking groups or challenges with others.

#### Tasks

| # | Task | Technical Details |
|---|------|-----------------|
| 3.1 | Build groups schema | `groups` (id, name, description, creator_id, is_public, max_members, created_at); `group_members` (group_id, user_id, role ENUM['admin','member'], joined_at) |
| 3.2 | Create group walking challenges | `group_challenges` (group_id, title, goal_type, goal_value, start_date, end_date); aggregate scoring: `SUM(points)` per group from members' `points_ledger` entries within date range |
| 3.3 | Build group management flows | Create group, invite members (by username or link), join public groups, leave group; RLS: only admins can delete group or remove members |
| 3.4 | Implement group progress via Realtime | Subscribe to `group_challenges` and member activity; live progress bar showing team total vs. goal; member contribution breakdown |
| 3.5 | Add group activity feed | `group_activity` table or view; events: member joined, member hit milestone, challenge progress update; reverse-chronological feed on group detail screen |

#### RLS for Groups
```sql
-- Members can see their groups
CREATE POLICY "Members see group" ON groups
  FOR SELECT USING (
    id IN (SELECT group_id FROM group_members WHERE user_id = auth.uid())
    OR is_public = true
  );

-- Only admins can update group
CREATE POLICY "Admins update group" ON groups
  FOR UPDATE USING (
    id IN (SELECT group_id FROM group_members WHERE user_id = auth.uid() AND role = 'admin')
  );
```

---

## Dependencies

- Sprint 7 complete (achievements system for sharing)
- Deep linking configured (Sprint 4) for referral codes
- FCM configured for friend request and group notifications

## Definition of Done

- [ ] Leaderboard displays weekly rankings with correct rank calculation
- [ ] Friend requests can be sent, accepted, rejected
- [ ] Friends-only leaderboard filters correctly
- [ ] Top 3 weekly walkers receive bonus points via automated Edge Function
- [ ] Achievement cards shareable to Instagram Stories and other platforms
- [ ] Referral code generates and tracks attribution through signup
- [ ] Groups can be created, joined, and display challenge progress in real-time
