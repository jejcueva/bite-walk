# Business Dashboard

A standalone Next.js web application for businesses to manage their presence on BiteWalk.

## Location

`apps/business-dashboard/` -- Next.js App Router with TypeScript and Tailwind CSS.

## Tech Stack

- Next.js 16 (App Router)
- TypeScript
- Tailwind CSS v4
- Supabase SSR (`@supabase/ssr`) for auth
- Shared Supabase backend with the mobile app

## Authentication

### Supabase Clients

| File | Usage |
|------|-------|
| `src/lib/supabase.ts` | Browser-side client (`createBrowserClient`) |
| `src/lib/supabase-server.ts` | Server-side client with cookie handling |

### Auth Flow

1. Business owner signs up at `/signup` with business name, email, password
2. Account created via Supabase Auth
3. `business_owner` role inserted into `user_roles` table
4. Middleware refreshes session on every request
5. Unauthenticated requests redirect to `/login`

### Middleware (`src/middleware.ts`)

- Refreshes Supabase session cookies
- Protects all routes except `/login`, `/signup`, `/auth/callback`, and static files
- Redirects authenticated users away from auth pages

## Pages

### Dashboard Home (`/`)

Overview cards showing:
- Active Deals count
- Total Redemptions (all-time voucher count)
- Points Spent by Users
- Active Vouchers (currently redeemable)

### Deal Management (`/deals`)

Full CRUD for business deals:
- Table listing all deals with title, points cost, status, subcategory
- Create/edit modal with form: title, description, points cost, discount %, subcategory, image URL, active toggle
- Toggle deal active/inactive inline
- Uses `DealForm` component (`src/components/DealForm.tsx`)

### Voucher Tracking (`/vouchers`)

Live feed of vouchers for the business's deals:
- Filter tabs: All, Active, Used, Expired
- Validate button on active vouchers (calls `validate_voucher` RPC)
- Auto-refreshes every 30 seconds

### Analytics (`/analytics`)

- Redemptions over last 30 days (CSS bar chart)
- Top 5 popular deals by redemption count
- Summary stats (total redemptions, average points per redemption)
- Uses `get_deal_redemption_stats` and `get_daily_redemptions` RPCs

### Business Profile (`/profile`)

Edit business info:
- Name, description, address, category
- Logo upload to Supabase `business-assets` storage bucket
- Save with success/error feedback

## Database Additions

### `business_applications` table

Tracks business signup applications (for optional review flow):

| Column | Type | Notes |
|--------|------|-------|
| id | uuid | Primary key |
| user_id | uuid | References auth.users |
| business_name | text | Submitted name |
| status | text | pending, approved, rejected |

### Analytics RPC Functions

- `get_deal_redemption_stats(business_id)` -- Per-deal redemption counts and points spent
- `get_daily_redemptions(business_id, days)` -- Daily redemption counts over a date range

## Running Locally

```bash
cd apps/business-dashboard
cp .env.local.example .env.local
# Fill in NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY
npm run dev
```

## Building

```bash
npm run build    # Production build
npm run start    # Start production server
```
