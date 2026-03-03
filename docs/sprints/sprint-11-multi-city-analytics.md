# Sprint 11: Multi-City Expansion & Analytics

**Release:** 3.0 (Scale)
**Duration:** Weeks 21-22
**Sprint Points:** 16
**Goal:** Build infrastructure for launching BiteWalk at new campuses/cities. Implement deep analytics for data-driven product decisions.

---

## Scope

### 1. Multi-City Infrastructure (8 pts)

**User Story:** As the team, we want to launch in new cities efficiently.

#### Tasks

| # | Task | Technical Details |
|---|------|-----------------|
| 1.1 | Add city/region schema with PostGIS | `cities` table: `(id, name, slug, geo_boundary GEOGRAPHY(POLYGON, 4326), timezone TEXT, is_active BOOLEAN, launched_at TIMESTAMPTZ)`; assign businesses and users to cities via `ST_Contains()` |
| 1.2 | Build city management admin panel | Web admin: create city with polygon boundary (draw on map), toggle active/inactive, view city-level metrics; Supabase Auth with `admin` role |
| 1.3 | Create partner self-serve onboarding | Guided signup flow: business owner creates account -> adds business details + location -> uploads logo -> creates first deal -> submits for review; `review_status ENUM['pending','approved','rejected']` on `businesses` table |
| 1.4 | Implement geo-fenced content delivery | All deal queries scoped to user's detected city: `WHERE ST_Contains((SELECT geo_boundary FROM cities WHERE id = p_city_id), b.location)`; city auto-detected from user's GPS on app open |
| 1.5 | Build launch playbook tooling | City launch checklist table in admin; template seed data (default deals, welcome notifications); automated partner outreach email via Edge Function + SendGrid |

#### Schema: `cities`
```sql
CREATE TABLE cities (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  slug TEXT UNIQUE NOT NULL,
  geo_boundary GEOGRAPHY(POLYGON, 4326) NOT NULL,
  timezone TEXT DEFAULT 'America/Los_Angeles',
  is_active BOOLEAN DEFAULT false,
  launched_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX idx_cities_boundary ON cities USING GIST(geo_boundary);

-- Add city_id to existing tables
ALTER TABLE businesses ADD COLUMN city_id UUID REFERENCES cities(id);
ALTER TABLE profiles ADD COLUMN city_id UUID REFERENCES cities(id);

-- Auto-assign city based on location
CREATE OR REPLACE FUNCTION assign_city_to_business()
RETURNS TRIGGER AS $$
BEGIN
  NEW.city_id := (
    SELECT id FROM cities
    WHERE ST_Contains(geo_boundary, NEW.location)
    AND is_active = true
    LIMIT 1
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_assign_city
  BEFORE INSERT OR UPDATE OF location ON businesses
  FOR EACH ROW EXECUTE FUNCTION assign_city_to_business();
```

---

### 2. Deep Analytics Platform (8 pts)

**User Story:** As the team, we want deep analytics to guide product decisions.

#### Tasks

| # | Task | Technical Details |
|---|------|-----------------|
| 2.1 | Build internal analytics dashboard | Admin web dashboard; key metrics: DAU, WAU, MAU, retention curves; built with SQL queries against PostgreSQL directly; charting via Recharts or Chart.js |
| 2.2 | Create cohort analysis views | SQL views segmenting users by: city, signup week, subscription tier; calculate D1/D7/D30 retention per cohort |
| 2.3 | Track full activation funnel | Events table tracking: `app_install -> signup -> permission_granted -> first_walk -> first_points -> first_redemption`; funnel visualization with drop-off percentages |
| 2.4 | Set up automated anomaly alerts | Scheduled Edge Function (hourly): compare current metrics to 7-day rolling average; alert via FCM/email if DAU drops >20%, error rate spikes >5%, or redemption rate anomaly |

#### Cohort Analysis View
```sql
CREATE MATERIALIZED VIEW cohort_retention AS
WITH user_cohorts AS (
  SELECT
    id AS user_id,
    date_trunc('week', created_at) AS cohort_week,
    city_id
  FROM profiles
),
user_activity AS (
  SELECT
    user_id,
    date_trunc('week', date) AS activity_week
  FROM activity
  GROUP BY user_id, date_trunc('week', date)
)
SELECT
  uc.cohort_week,
  uc.city_id,
  c.name AS city_name,
  COUNT(DISTINCT uc.user_id) AS cohort_size,
  COUNT(DISTINCT CASE WHEN ua.activity_week = uc.cohort_week THEN uc.user_id END) AS week_0,
  COUNT(DISTINCT CASE WHEN ua.activity_week = uc.cohort_week + INTERVAL '1 week' THEN uc.user_id END) AS week_1,
  COUNT(DISTINCT CASE WHEN ua.activity_week = uc.cohort_week + INTERVAL '2 weeks' THEN uc.user_id END) AS week_2,
  COUNT(DISTINCT CASE WHEN ua.activity_week = uc.cohort_week + INTERVAL '4 weeks' THEN uc.user_id END) AS week_4
FROM user_cohorts uc
LEFT JOIN user_activity ua ON uc.user_id = ua.user_id
LEFT JOIN cities c ON uc.city_id = c.id
GROUP BY uc.cohort_week, uc.city_id, c.name
ORDER BY uc.cohort_week DESC;

-- Refresh daily via pg_cron
SELECT cron.schedule('refresh-cohort', '0 3 * * *', 'REFRESH MATERIALIZED VIEW CONCURRENTLY cohort_retention');
```

#### Funnel Tracking Schema
```sql
CREATE TABLE funnel_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES profiles(id),
  event_name TEXT NOT NULL CHECK (event_name IN (
    'app_install', 'signup', 'permission_granted',
    'first_walk', 'first_points', 'first_redemption'
  )),
  metadata JSONB,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX idx_funnel_user ON funnel_events(user_id, event_name);
CREATE INDEX idx_funnel_date ON funnel_events(created_at, event_name);
```

---

## Dependencies

- Sprint 10 complete (sponsored deals)
- PostGIS polygon support for city boundaries
- `pg_cron` extension enabled for materialized view refresh
- SendGrid API key for partner outreach emails (optional)

## Definition of Done

- [ ] City boundaries defined with PostGIS polygons; UCSC as first city
- [ ] Deals automatically scoped to user's detected city
- [ ] Business partner self-serve onboarding flow functional end-to-end
- [ ] Cohort retention dashboard rendering accurate D1/D7/D30 data
- [ ] Full activation funnel tracked with drop-off rates visible
- [ ] Anomaly alerts triggering correctly when metrics deviate >20%
