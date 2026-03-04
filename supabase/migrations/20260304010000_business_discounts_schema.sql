-- Sprint 3: Business partnerships & discounts schema

-- Ensure PostGIS is available for geo queries
create extension if not exists postgis;

-- ============================================================
-- Businesses & deals
-- ============================================================

create table if not exists public.businesses (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid references auth.users(id),
  name text not null,
  description text,
  logo_url text,
  category text check (category in ('food', 'drinks', 'retail', 'other')),
  location geography(point, 4326) not null,
  address text,
  is_active boolean default true,
  created_at timestamptz default now()
);

create index if not exists idx_businesses_location
  on public.businesses
  using gist (location);

create table if not exists public.deals (
  id uuid primary key default gen_random_uuid(),
  business_id uuid not null references public.businesses(id) on delete cascade,
  title text not null,
  description text,
  points_cost integer not null check (points_cost > 0),
  original_price numeric(10,2),
  discount_percent integer check (discount_percent between 1 and 100),
  is_premium_only boolean default false,
  max_redemptions_per_day integer,
  is_active boolean default true,
  created_at timestamptz default now(),
  expires_at timestamptz
);

create index if not exists idx_deals_business
  on public.deals (business_id);

create index if not exists idx_deals_active
  on public.deals (is_active)
  where is_active = true;

alter table public.businesses enable row level security;
alter table public.deals enable row level security;

-- Basic RLS: any authenticated user can see active businesses/deals,
-- owners can manage their own records (tied to owner_id via user_roles below).

drop policy if exists "businesses_select_active" on public.businesses;
create policy "businesses_select_active"
on public.businesses
for select
to authenticated
using (is_active = true);

drop policy if exists "deals_select_active" on public.deals;
create policy "deals_select_active"
on public.deals
for select
to authenticated
using (is_active = true);

-- ============================================================
-- User roles (business_owner)
-- ============================================================

create table if not exists public.user_roles (
  user_id uuid not null references auth.users(id) on delete cascade,
  role text not null check (role in ('user', 'business_owner', 'admin')),
  primary key (user_id, role)
);

alter table public.user_roles enable row level security;

drop policy if exists "user_roles_self_view" on public.user_roles;
create policy "user_roles_self_view"
on public.user_roles
for select
to authenticated
using (auth.uid() = user_id);

-- Business owners can manage their own business + deals

drop policy if exists "businesses_owner_manage" on public.businesses;
create policy "businesses_owner_manage"
on public.businesses
for all
to authenticated
using (
  exists (
    select 1
    from public.user_roles ur
    where ur.user_id = auth.uid()
      and ur.role = 'business_owner'
      and (businesses.owner_id = auth.uid() or businesses.owner_id is null)
  )
)
with check (
  exists (
    select 1
    from public.user_roles ur
    where ur.user_id = auth.uid()
      and ur.role = 'business_owner'
      and (businesses.owner_id = auth.uid() or businesses.owner_id is null)
  )
);

drop policy if exists "deals_owner_manage" on public.deals;
create policy "deals_owner_manage"
on public.deals
for all
to authenticated
using (
  exists (
    select 1
    from public.user_roles ur
    join public.businesses b on b.owner_id = ur.user_id
    where ur.user_id = auth.uid()
      and ur.role = 'business_owner'
      and b.id = deals.business_id
  )
)
with check (
  exists (
    select 1
    from public.user_roles ur
    join public.businesses b on b.owner_id = ur.user_id
    where ur.user_id = auth.uid()
      and ur.role = 'business_owner'
      and b.id = deals.business_id
  )
);

-- ============================================================
-- Vouchers
-- ============================================================

create table if not exists public.vouchers (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id),
  deal_id uuid not null references public.deals(id),
  ledger_entry_id uuid not null references public.point_ledger(id),
  status text default 'active' check (status in ('active', 'used', 'expired')),
  qr_code_data text not null,
  created_at timestamptz default now(),
  expires_at timestamptz not null,
  used_at timestamptz
);

create index if not exists idx_vouchers_user
  on public.vouchers (user_id, created_at desc);

create index if not exists idx_vouchers_status
  on public.vouchers (status)
  where status = 'active';

alter table public.vouchers enable row level security;

drop policy if exists "vouchers_select_own" on public.vouchers;
create policy "vouchers_select_own"
on public.vouchers
for select
to authenticated
using (auth.uid() = user_id);

