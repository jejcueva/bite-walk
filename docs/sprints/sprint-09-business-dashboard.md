# Sprint 9: Business Dashboard & Release 2.0 Launch

**Release:** 2.0 (Growth)
**Duration:** Weeks 17-18
**Sprint Points:** 13
**Goal:** Empower business partners with analytics dashboards and ship the stable 2.0 release.

---

## Scope

### 1. Partner Analytics Dashboard (8 pts)

**User Story:** As a business owner, I want to see how BiteWalk drives traffic to my store.

#### Tasks

| # | Task | Technical Details |
|---|------|-----------------|
| 1.1 | Build partner analytics dashboard | Web dashboard (Next.js or Supabase-hosted); auth via Supabase (business_owner role); charts: redemptions over time, unique customers, revenue impact |
| 1.2 | Create deal performance views | PostgreSQL views aggregating: total views (from `deal_impressions`), saves, redemptions per deal; conversion funnel per deal |
| 1.3 | Build CSV export Edge Function | `supabase/functions/export-analytics/index.ts`: accepts date range + business_id; queries aggregated data; returns CSV with headers; RLS-enforced to own business |
| 1.4 | Implement low-stock deal notifications | DB trigger on `vouchers` INSERT: count daily redemptions per deal; if `>= max_redemptions_per_day * 0.8`, send FCM to business owner's device token |

#### Analytics SQL Views
```sql
CREATE VIEW deal_performance AS
SELECT
  d.id AS deal_id,
  d.title,
  b.name AS business_name,
  b.owner_id,
  COUNT(DISTINCT di.id) AS total_views,
  COUNT(DISTINCT v.id) AS total_redemptions,
  COUNT(DISTINCT v.user_id) AS unique_customers,
  ROUND(COUNT(DISTINCT v.id)::DECIMAL / NULLIF(COUNT(DISTINCT di.id), 0) * 100, 2) AS conversion_rate
FROM deals d
JOIN businesses b ON d.business_id = b.id
LEFT JOIN deal_impressions di ON d.id = di.deal_id
LEFT JOIN vouchers v ON d.id = v.deal_id AND v.status = 'used'
GROUP BY d.id, d.title, b.name, b.owner_id;

-- RLS: business owners see only their own deals
CREATE POLICY "Owner sees own analytics" ON deal_performance
  FOR SELECT USING (owner_id = auth.uid());
```

#### Schema: `deal_impressions`
```sql
CREATE TABLE deal_impressions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  deal_id UUID REFERENCES deals(id) ON DELETE CASCADE NOT NULL,
  user_id UUID REFERENCES profiles(id),
  viewed_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX idx_impressions_deal ON deal_impressions(deal_id, viewed_at);
```

---

### 2. Release 2.0 Stabilization & Launch (5 pts)

**User Story:** As the team, we want a stable, polished 2.0 release.

#### Tasks

| # | Task | Technical Details |
|---|------|-----------------|
| 2.1 | Regression testing | Test matrix: auth, step tracking, points, redemption, premium, streaks, achievements, leaderboards, groups on iOS + Android; automated E2E with Detox or Maestro |
| 2.2 | Load testing Supabase | Use `pgbench` or `k6` to simulate 500 concurrent users; test connection pooling (PgBouncer config); identify slow queries with `pg_stat_statements` |
| 2.3 | RLS security review | Audit all 15+ policies; test with each role (anon, authenticated, business_owner, service_role); verify no data leaks across users |
| 2.4 | Update app store listings | New screenshots showcasing premium, streaks, leaderboards, groups; update description and "What's New" |
| 2.5 | Coordinated launch | Marketing push: social media, campus ambassadors, partner co-marketing; staged rollout (10% -> 50% -> 100%) |

---

## Dependencies

- Sprints 6-8 complete (premium, gamification, social features)
- Partner web dashboard hosting configured
- Detox/Maestro test suite set up

## Success Criteria (Release 2.0)

- [ ] 5% premium conversion rate
- [ ] 25% increase in DAU vs Release 1.0
- [ ] 10+ active business partners
- [ ] Partner dashboard accessible and generating reports
- [ ] Load test: <500ms p95 API response time at 500 concurrent users
- [ ] 0 RLS policy vulnerabilities found in security audit
