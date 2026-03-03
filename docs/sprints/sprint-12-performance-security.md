# Sprint 12: Performance, Security & 3.0 Launch

**Release:** 3.0 (Scale)
**Duration:** Weeks 23-24
**Sprint Points:** 21
**Goal:** Optimize for scale with query tuning and connection pooling, harden security with fraud detection and audit, and ship the 3.0 release across multiple campuses.

---

## Scope

### 1. Performance Optimization (8 pts)

**User Story:** As a user, I want the app to be fast and reliable at all times.

#### Tasks

| # | Task | Technical Details |
|---|------|-----------------|
| 1.1 | Optimize PostgreSQL queries | Run `EXPLAIN ANALYZE` on top 20 queries (by frequency from `pg_stat_statements`); add composite indexes; convert sequential scans to index scans; target <50ms p95 for hot queries |
| 1.2 | Configure connection pooling | PgBouncer in transaction mode via Supabase dashboard; set `pool_size` based on load test results; use connection string with `?pgbouncer=true` in Edge Functions |
| 1.3 | Implement CDN caching for Storage | Configure Supabase Storage CDN cache headers (`Cache-Control: public, max-age=86400`); use image transforms for responsive sizes (`?width=200&height=200`) |
| 1.4 | Optimize app cold start | Target <2s on both platforms; lazy load non-critical screens; reduce JS bundle with `metro.config.js` tree shaking; preload critical data during splash screen |

#### Index Optimization Examples
```sql
-- Hot query: get user's points balance (called on every app open)
CREATE INDEX idx_points_balance ON points_ledger(user_id, type);

-- Hot query: nearby active deals
CREATE INDEX idx_deals_active_business ON deals(business_id, is_active)
  WHERE is_active = true;

-- Hot query: weekly leaderboard
CREATE INDEX idx_points_weekly ON points_ledger(user_id, created_at, amount)
  WHERE type = 'credit';

-- Hot query: user's active vouchers
CREATE INDEX idx_vouchers_active ON vouchers(user_id, status, expires_at)
  WHERE status = 'active';

-- Monitor query performance
SELECT query, calls, mean_exec_time, total_exec_time
FROM pg_stat_statements
ORDER BY total_exec_time DESC
LIMIT 20;
```

#### Bundle Size Optimization
```javascript
// metro.config.js
module.exports = {
  transformer: {
    getTransformOptions: async () => ({
      transform: {
        experimentalImportSupport: true,
        inlineRequires: true, // defer module loading
      },
    }),
  },
};
```

---

### 2. Security Hardening (8 pts)

**User Story:** As the team, we want robust fraud protection and security.

#### Tasks

| # | Task | Technical Details |
|---|------|-----------------|
| 2.1 | Build step count anomaly detection | SQL pattern analysis on `activity` table: flag users with >50K steps/day, >25mi/day, or >10K steps in single sync; compare against device motion sensor data if available |
| 2.2 | Add rate limiting on Edge Functions | Implement token bucket rate limiting in Edge Functions: max 5 redemptions/hour per user, max 100 API calls/min per user; store counters in Redis or Supabase table with TTL |
| 2.3 | Conduct security audit | Checklist: all tables have RLS enabled, no `public` schema functions callable by anon, service_role key not in client bundle, API endpoints tested for injection, auth flows tested for session fixation |
| 2.4 | Verify encryption | Supabase default: data encrypted at rest (AES-256); TLS 1.2+ enforced for all connections; verify `sslmode=require` in all connection strings |
| 2.5 | Rotate API keys | Rotate `anon` key and `service_role` key; update all Edge Functions and client config; verify no keys committed to git; add `.env` to `.gitignore` |

#### Rate Limiting Implementation
```sql
CREATE TABLE rate_limits (
  user_id UUID NOT NULL,
  action TEXT NOT NULL,
  window_start TIMESTAMPTZ NOT NULL,
  count INTEGER DEFAULT 1,
  PRIMARY KEY (user_id, action, window_start)
);

CREATE OR REPLACE FUNCTION check_rate_limit(
  p_user_id UUID,
  p_action TEXT,
  p_max_count INTEGER,
  p_window_minutes INTEGER
) RETURNS BOOLEAN AS $$
DECLARE
  v_window TIMESTAMPTZ;
  v_count INTEGER;
BEGIN
  v_window := date_trunc('hour', now())
    + (EXTRACT(MINUTE FROM now())::INT / p_window_minutes)
    * (p_window_minutes || ' minutes')::INTERVAL;

  INSERT INTO rate_limits (user_id, action, window_start, count)
  VALUES (p_user_id, p_action, v_window, 1)
  ON CONFLICT (user_id, action, window_start)
  DO UPDATE SET count = rate_limits.count + 1
  RETURNING count INTO v_count;

  RETURN v_count <= p_max_count;
END;
$$ LANGUAGE plpgsql;
```

#### Fraud Detection Patterns
```sql
-- Daily anomaly scan (scheduled via pg_cron)
CREATE OR REPLACE FUNCTION scan_fraud_patterns()
RETURNS void AS $$
BEGIN
  -- Pattern 1: Excessive daily steps
  INSERT INTO fraud_flags (user_id, flag_type, severity, details)
  SELECT user_id, 'excessive_steps', 'high',
    jsonb_build_object('steps', SUM(steps), 'date', date)
  FROM activity WHERE date = CURRENT_DATE
  GROUP BY user_id, date HAVING SUM(steps) > 50000
  ON CONFLICT DO NOTHING;

  -- Pattern 2: Suspicious sync patterns (large step dumps)
  INSERT INTO fraud_flags (user_id, flag_type, severity, details)
  SELECT user_id, 'bulk_sync', 'medium',
    jsonb_build_object('steps_per_sync', steps, 'synced_at', synced_at)
  FROM activity WHERE synced_at > now() - INTERVAL '1 day' AND steps > 10000
  ON CONFLICT DO NOTHING;

  -- Pattern 3: Rapid redemptions
  INSERT INTO fraud_flags (user_id, flag_type, severity, details)
  SELECT user_id, 'rapid_redemption', 'high',
    jsonb_build_object('count', COUNT(*), 'window', '1 hour')
  FROM vouchers WHERE created_at > now() - INTERVAL '1 hour'
  GROUP BY user_id HAVING COUNT(*) > 5
  ON CONFLICT DO NOTHING;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

SELECT cron.schedule('fraud-scan', '0 * * * *', 'SELECT scan_fraud_patterns()');
```

---

### 3. Multi-Campus 3.0 Launch (5 pts)

**User Story:** As the team, we want a successful 3.0 launch across multiple cities.

#### Tasks

| # | Task | Technical Details |
|---|------|-----------------|
| 3.1 | Final QA pass | Full regression on both platforms; E2E test suite green; performance benchmarks met (<2s cold start, <50ms p95 API) |
| 3.2 | Coordinate multi-campus launch | Activate 2-3 new city records in `cities` table; seed partner data per city; staggered rollout via feature flag |
| 3.3 | Execute marketing campaign | App store "What's New" update; push notification to existing users; social media campaign; campus ambassador activation |
| 3.4 | Set up monitoring dashboard | Supabase dashboard + custom Grafana/PostHog dashboards; alerts for: error rate >1%, p95 latency >500ms, DB connections >80% pool |
| 3.5 | Document incident runbook | On-call rotation; escalation paths; common issues and resolutions (DB connection exhaustion, Edge Function cold starts, FCM delivery failures); rollback procedures |

---

## Dependencies

- Sprints 10-11 complete (sponsored deals, multi-city, analytics)
- `pg_cron` extension for scheduled fraud scans
- `pg_stat_statements` extension for query analysis
- Monitoring infrastructure (Grafana or equivalent) provisioned

## Success Criteria (Release 3.0)

- [ ] Expansion to 2+ campuses with local business partners
- [ ] Ad revenue live via sponsored deals platform
- [ ] <2s cold start on both platforms
- [ ] <50ms p95 for top 20 API queries
- [ ] 0 critical security vulnerabilities in audit
- [ ] Fraud detection flagging anomalous accounts
- [ ] Rate limiting preventing abuse on redemption endpoints
- [ ] Incident runbook documented and team trained
- [ ] DAU target: 2,000+
- [ ] Weekly retention: 80%
