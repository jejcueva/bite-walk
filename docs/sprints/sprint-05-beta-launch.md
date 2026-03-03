# Sprint 5: Beta Testing & MVP Launch

**Release:** 1.0 (MVP)
**Duration:** Weeks 9-10
**Sprint Points:** 18
**Goal:** Conduct beta testing with UCSC students, fix critical bugs, harden security, and submit to both app stores.

---

## Scope

### 1. Beta Distribution & Testing (5 pts)

**User Story:** As the team, we want to beta test with UCSC students before public launch.

#### Tasks

| # | Task | Technical Details |
|---|------|-----------------|
| 1.1 | Deploy TestFlight build (iOS) | EAS Build `--profile preview`; upload to App Store Connect; configure TestFlight external testing group |
| 1.2 | Deploy internal testing track (Android) | EAS Build for Android; upload AAB to Google Play Console internal testing track |
| 1.3 | Set up feedback collection | In-app feedback form (modal with text input + screenshot capture); submit to `feedback` table in Supabase; external survey link (Google Forms) |
| 1.4 | Monitor Supabase dashboard | Track DB performance: query latency, connection count, storage usage; set up Supabase alerts for error rate spikes |
| 1.5 | Track analytics | Integrate PostHog/Mixpanel: track events `app_open`, `walk_started`, `points_earned`, `deal_viewed`, `deal_redeemed`; set up retention and funnel dashboards |

---

### 2. App Store Submission (5 pts)

**User Story:** As a user, I want to find and download BiteWalk from the app store.

#### Tasks

| # | Task | Technical Details |
|---|------|-----------------|
| 2.1 | Prepare App Store listing | App name, subtitle, description, keywords, privacy policy URL, 6.7" and 5.5" screenshots (generated via Fastlane snapshot or Figma), app category: Health & Fitness |
| 2.2 | Prepare Google Play Store listing | Feature graphic (1024x500), screenshots, short/full description, content rating questionnaire, data safety form |
| 2.3 | Submit for App Store review | Ensure compliance: HealthKit usage description, background modes justification, Apple Sign-In requirement met; plan for 1-2 review iterations |
| 2.4 | Submit for Google Play review | Ensure compliance: permissions declarations, data safety section accurate, target API level current |
| 2.5 | Set up app store analytics | App Store Connect analytics + Google Play Console stats; link to PostHog for install attribution |

---

### 3. Bug Fixes, Security & Launch Prep (8 pts)

**User Story:** As the team, we want to fix critical issues found in beta.

#### Tasks

| # | Task | Technical Details |
|---|------|-----------------|
| 3.1 | Triage and fix P0/P1 bugs | Categorize beta feedback; P0 = crash/data loss, P1 = broken core flow; target 0 P0s and <3 P1s at launch |
| 3.2 | Optimize Supabase queries | Run `EXPLAIN ANALYZE` on hot queries (deal listing, points balance, activity sync); add composite indexes where sequential scans detected |
| 3.3 | Implement fraud detection | SQL query for anomaly detection: flag users with `steps > 50,000/day` or `distance > 25 miles/day`; daily cron Edge Function writes to `fraud_flags` table |
| 3.4 | Tighten RLS policies | Security review checklist: verify no table accessible without RLS; test with `anon` and `authenticated` roles; ensure service_role-only operations cannot be called from client |
| 3.5 | Confirm business partners | Validate 3+ partner accounts active; deals seeded and visible; voucher validation tested end-to-end with partner |

#### Fraud Detection Query
```sql
-- Flag suspicious activity
CREATE OR REPLACE FUNCTION check_daily_anomalies()
RETURNS void AS $$
BEGIN
  INSERT INTO fraud_flags (user_id, flag_type, details, flagged_at)
  SELECT
    user_id,
    'excessive_steps',
    jsonb_build_object('steps', daily_steps, 'distance', daily_distance),
    now()
  FROM (
    SELECT user_id,
           SUM(steps) AS daily_steps,
           SUM(distance_miles) AS daily_distance
    FROM activity
    WHERE date = CURRENT_DATE
    GROUP BY user_id
    HAVING SUM(steps) > 50000 OR SUM(distance_miles) > 25
  ) AS suspects
  ON CONFLICT (user_id, flag_type, flagged_at::date) DO NOTHING;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
```

---

## Dependencies

- Sprints 1-4 complete (full MVP feature set)
- Apple Developer + Google Play Developer accounts active
- 3+ business partners onboarded with validated accounts
- Privacy policy and terms of service published

## Success Criteria (Release 1.0)

- [ ] 500 beta sign-ups
- [ ] 3+ business partners live
- [ ] 70% weekly retention among beta users
- [ ] 0 P0 bugs at launch
- [ ] App approved on both App Store and Google Play
- [ ] Fraud detection running daily
- [ ] All RLS policies reviewed and hardened
