-- BiteWalk schema (single source of truth)
-- Paste this file into Supabase SQL Editor for a fresh project. One file, one run.
-- Covers: auth-related tables, walks, points, discounts, businesses, deals, vouchers, functions, seed data, storage.

-- ============================================================
-- Extensions
-- ============================================================

create extension if not exists pgcrypto;
create extension if not exists postgis;

-- ============================================================
-- Helpers
-- ============================================================

create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

-- ============================================================
-- Core tables
-- ============================================================

create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  display_name text,
  avatar_url text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.walks (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  walked_at timestamptz not null default now(),
  steps integer,
  distance_meters numeric(10,2) not null check (distance_meters >= 0),
  points_earned integer not null check (points_earned >= 0),
  note text,
  source text default 'manual',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint walks_steps_check check (steps is null or steps > 0)
);

create table if not exists public.point_ledger (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  walk_id uuid references public.walks(id) on delete set null,
  entry_type text not null check (entry_type in ('walk', 'redeem', 'bonus', 'adjustment')),
  points_delta integer not null,
  description text,
  created_at timestamptz not null default now()
);

create table if not exists public.discounts (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique,
  title text not null,
  description text not null,
  partner_name text not null,
  points_cost integer not null check (points_cost > 0),
  coupon_code text,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- ============================================================
-- Businesses & deals (Sprint 3)
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

create index if not exists idx_businesses_location on public.businesses using gist (location);

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

create index if not exists idx_deals_business on public.deals (business_id);
create index if not exists idx_deals_active on public.deals (is_active) where is_active = true;

create table if not exists public.user_roles (
  user_id uuid not null references auth.users(id) on delete cascade,
  role text not null check (role in ('user', 'business_owner', 'admin')),
  primary key (user_id, role)
);

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

create index if not exists idx_vouchers_user on public.vouchers (user_id, created_at desc);
create index if not exists idx_vouchers_status on public.vouchers (status) where status = 'active';

-- ============================================================
-- Indexes (core)
-- ============================================================

create index if not exists walks_user_id_walked_at_idx on public.walks(user_id, walked_at desc);
create index if not exists point_ledger_user_id_created_at_idx on public.point_ledger(user_id, created_at desc);
create index if not exists discounts_active_points_cost_idx on public.discounts(is_active, points_cost);

-- ============================================================
-- Triggers
-- ============================================================

drop trigger if exists set_profiles_updated_at on public.profiles;
create trigger set_profiles_updated_at before update on public.profiles for each row execute function public.set_updated_at();

drop trigger if exists set_walks_updated_at on public.walks;
create trigger set_walks_updated_at before update on public.walks for each row execute function public.set_updated_at();

drop trigger if exists set_discounts_updated_at on public.discounts;
create trigger set_discounts_updated_at before update on public.discounts for each row execute function public.set_updated_at();

-- ============================================================
-- RLS
-- ============================================================

alter table public.profiles enable row level security;
alter table public.walks enable row level security;
alter table public.point_ledger enable row level security;
alter table public.discounts enable row level security;
alter table public.businesses enable row level security;
alter table public.deals enable row level security;
alter table public.user_roles enable row level security;
alter table public.vouchers enable row level security;

-- profiles
drop policy if exists "profiles_select_own" on public.profiles;
create policy "profiles_select_own" on public.profiles for select to authenticated using (auth.uid() = id);
drop policy if exists "profiles_insert_own" on public.profiles;
create policy "profiles_insert_own" on public.profiles for insert to authenticated with check (auth.uid() = id);
drop policy if exists "profiles_update_own" on public.profiles;
create policy "profiles_update_own" on public.profiles for update to authenticated using (auth.uid() = id) with check (auth.uid() = id);

-- walks
drop policy if exists "walks_select_own" on public.walks;
create policy "walks_select_own" on public.walks for select to authenticated using (auth.uid() = user_id);
drop policy if exists "walks_insert_own" on public.walks;
create policy "walks_insert_own" on public.walks for insert to authenticated with check (auth.uid() = user_id);
drop policy if exists "walks_update_own" on public.walks;
create policy "walks_update_own" on public.walks for update to authenticated using (auth.uid() = user_id) with check (auth.uid() = user_id);
drop policy if exists "walks_delete_own" on public.walks;
create policy "walks_delete_own" on public.walks for delete to authenticated using (auth.uid() = user_id);

-- point_ledger
drop policy if exists "point_ledger_select_own" on public.point_ledger;
create policy "point_ledger_select_own" on public.point_ledger for select to authenticated using (auth.uid() = user_id);
drop policy if exists "point_ledger_insert_own" on public.point_ledger;
create policy "point_ledger_insert_own" on public.point_ledger for insert to authenticated with check (auth.uid() = user_id);
drop policy if exists "point_ledger_update_own" on public.point_ledger;
create policy "point_ledger_update_own" on public.point_ledger for update to authenticated using (auth.uid() = user_id) with check (auth.uid() = user_id);
drop policy if exists "point_ledger_delete_own" on public.point_ledger;
create policy "point_ledger_delete_own" on public.point_ledger for delete to authenticated using (auth.uid() = user_id);

-- discounts
drop policy if exists "discounts_select_active" on public.discounts;
create policy "discounts_select_active" on public.discounts for select to authenticated using (is_active = true);

-- businesses
drop policy if exists "businesses_select_active" on public.businesses;
create policy "businesses_select_active" on public.businesses for select to authenticated using (is_active = true);
drop policy if exists "businesses_owner_manage" on public.businesses;
create policy "businesses_owner_manage" on public.businesses for all to authenticated
using (exists (select 1 from public.user_roles ur where ur.user_id = auth.uid() and ur.role = 'business_owner' and (businesses.owner_id = auth.uid() or businesses.owner_id is null)))
with check (exists (select 1 from public.user_roles ur where ur.user_id = auth.uid() and ur.role = 'business_owner' and (businesses.owner_id = auth.uid() or businesses.owner_id is null)));

-- deals
drop policy if exists "deals_select_active" on public.deals;
create policy "deals_select_active" on public.deals for select to authenticated using (is_active = true);
drop policy if exists "deals_owner_manage" on public.deals;
create policy "deals_owner_manage" on public.deals for all to authenticated
using (exists (select 1 from public.user_roles ur join public.businesses b on b.owner_id = ur.user_id where ur.user_id = auth.uid() and ur.role = 'business_owner' and b.id = deals.business_id))
with check (exists (select 1 from public.user_roles ur join public.businesses b on b.owner_id = ur.user_id where ur.user_id = auth.uid() and ur.role = 'business_owner' and b.id = deals.business_id));

-- user_roles
drop policy if exists "user_roles_self_view" on public.user_roles;
create policy "user_roles_self_view" on public.user_roles for select to authenticated using (auth.uid() = user_id);

-- vouchers
drop policy if exists "vouchers_select_own" on public.vouchers;
create policy "vouchers_select_own" on public.vouchers for select to authenticated using (auth.uid() = user_id);

-- ============================================================
-- Seed: discounts (legacy slug-based)
-- ============================================================

insert into public.discounts (slug, title, description, partner_name, points_cost, coupon_code, is_active)
values
  ('free-coffee', 'Free Small Coffee', 'Redeem for one free small drip coffee.', 'Bite Cafe', 250, 'BITE-COFFEE', true),
  ('dog-wash-20-off', '20% Off Dog Wash', 'Get 20% off one self-serve dog wash session.', 'Walk & Wag', 450, 'WAG20', true),
  ('pet-store-10-credit', '$10 Pet Store Credit', 'Apply a $10 credit toward any in-store purchase.', 'Paws Market', 700, 'PAWS10', true)
on conflict (slug) do update set title = excluded.title, description = excluded.description, partner_name = excluded.partner_name, points_cost = excluded.points_cost, coupon_code = excluded.coupon_code, is_active = excluded.is_active, updated_at = now();

-- ============================================================
-- Points functions
-- ============================================================

create or replace function public.calculate_points(distance_miles float)
returns integer language plpgsql immutable as $$
begin
  if distance_miles is null or distance_miles <= 0 then return 0; end if;
  return floor(distance_miles * 100)::integer;
end; $$;

create or replace function public.credit_points(p_user_id uuid, p_amount integer, p_reason text, p_walk_id uuid default null)
returns integer language plpgsql security definer as $$
declare v_balance integer;
begin
  if p_amount <= 0 then raise exception 'credit amount must be positive'; end if;
  perform pg_advisory_xact_lock(hashtext(p_user_id::text));
  insert into public.point_ledger (user_id, walk_id, entry_type, points_delta, description)
  values (p_user_id, p_walk_id, 'walk', p_amount, p_reason);
  select coalesce(sum(points_delta), 0) into v_balance from public.point_ledger where user_id = p_user_id;
  return v_balance;
end; $$;

create or replace function public.debit_points(p_user_id uuid, p_amount integer, p_reason text)
returns integer language plpgsql security definer as $$
declare v_balance integer;
begin
  if p_amount <= 0 then raise exception 'debit amount must be positive'; end if;
  perform pg_advisory_xact_lock(hashtext(p_user_id::text));
  select coalesce(sum(points_delta), 0) into v_balance from public.point_ledger where user_id = p_user_id;
  if v_balance < p_amount then raise exception 'insufficient points: have %, need %', v_balance, p_amount; end if;
  insert into public.point_ledger (user_id, entry_type, points_delta, description)
  values (p_user_id, 'redeem', -p_amount, p_reason);
  return v_balance - p_amount;
end; $$;

create or replace function public.get_points_balance(p_user_id uuid)
returns integer language sql stable security definer as $$
  select coalesce(sum(points_delta), 0)::integer from public.point_ledger where user_id = p_user_id;
$$;

-- ============================================================
-- Realtime
-- ============================================================

alter publication supabase_realtime add table public.point_ledger;
alter publication supabase_realtime add table public.walks;

-- ============================================================
-- View: deals with businesses
-- ============================================================

create or replace view public.deals_with_businesses as
select d.id, d.title, d.description, d.points_cost, d.original_price, d.discount_percent, d.is_premium_only, d.max_redemptions_per_day, d.is_active, d.created_at, d.expires_at,
  b.name as business_name, b.logo_url as business_logo_url, b.category, b.address, b.location
from public.deals d
join public.businesses b on b.id = d.business_id
where d.is_active = true and b.is_active = true;

alter view public.deals_with_businesses owner to postgres;

-- ============================================================
-- redeem_deal (ensures profile exists, 30-min voucher)
-- ============================================================

create or replace function public.redeem_deal(p_user_id uuid, p_deal_id uuid)
returns table (voucher_id uuid, qr_data text, expires_at timestamptz)
language plpgsql security definer as $$
declare
  v_points_cost integer;
  v_deal_title text;
  v_business_name text;
  v_voucher_id uuid;
  v_ledger_id uuid;
  v_expires_at timestamptz;
begin
  insert into public.profiles (id) values (p_user_id) on conflict (id) do nothing;

  select d.points_cost, d.title, b.name into v_points_cost, v_deal_title, v_business_name
  from public.deals d join public.businesses b on b.id = d.business_id
  where d.id = p_deal_id and d.is_active = true and b.is_active = true;

  if v_points_cost is null then raise exception 'deal not found or inactive'; end if;
  perform pg_advisory_xact_lock(hashtext(p_user_id::text));
  if public.get_points_balance(p_user_id) < v_points_cost then raise exception 'insufficient points'; end if;

  insert into public.point_ledger (user_id, entry_type, points_delta, description)
  values (p_user_id, 'redeem', -v_points_cost, format('Redeem: %s at %s', v_deal_title, v_business_name))
  returning id into v_ledger_id;

  v_expires_at := now() + interval '30 minutes';
  v_voucher_id := gen_random_uuid();
  insert into public.vouchers (id, user_id, deal_id, ledger_entry_id, status, qr_code_data, expires_at)
  values (v_voucher_id, p_user_id, p_deal_id, v_ledger_id, 'active',
    json_build_object('voucher_id', v_voucher_id, 'deal_id', p_deal_id, 'user_id', p_user_id)::text, v_expires_at);

  return query select v_voucher_id, qr_code_data, v_expires_at from public.vouchers where id = v_voucher_id;
end; $$;

-- ============================================================
-- validate_voucher
-- ============================================================

create or replace function public.validate_voucher(p_voucher_id uuid)
returns table (voucher_id uuid, status text, deal_title text, business_name text, points_cost integer, expires_at timestamptz, used_at timestamptz)
language plpgsql security definer as $$
declare v_status text; v_expires_at timestamptz;
begin
  select status, expires_at into v_status, v_expires_at from public.vouchers where id = p_voucher_id;
  if v_status is null then raise exception 'voucher not found'; end if;
  if v_status <> 'active' then raise exception 'voucher is not active'; end if;
  if v_expires_at <= now() then
    update public.vouchers set status = 'expired' where id = p_voucher_id;
    raise exception 'voucher has expired';
  end if;
  update public.vouchers set status = 'used', used_at = now() where id = p_voucher_id;
  return query
  select v.id, v.status, d.title, b.name, d.points_cost, v.expires_at, v.used_at
  from public.vouchers v join public.deals d on d.id = v.deal_id join public.businesses b on b.id = d.business_id
  where v.id = p_voucher_id;
end; $$;

-- ============================================================
-- get_nearby_deals (PostGIS)
-- ============================================================

create or replace function public.get_nearby_deals(p_lng double precision default null, p_lat double precision default null, p_radius_m double precision default null)
returns table (id uuid, title text, description text, points_cost integer, business_name text, business_logo_url text, category text, address text, dist_meters double precision)
language plpgsql stable security definer as $$
begin
  if p_lng is null or p_lat is null or p_radius_m is null or p_radius_m <= 0 then
    return query
    select d.id, d.title, d.description, d.points_cost, b.name::text, b.logo_url, b.category, b.address, null::double precision
    from public.deals d join public.businesses b on b.id = d.business_id
    where d.is_active = true and b.is_active = true order by d.points_cost asc;
    return;
  end if;
  return query
  select d.id, d.title, d.description, d.points_cost, b.name::text, b.logo_url, b.category, b.address,
    round(ST_Distance(b.location, ST_SetSRID(ST_MakePoint(p_lng, p_lat), 4326)::geography)::numeric, 0)::double precision
  from public.deals d join public.businesses b on b.id = d.business_id
  where d.is_active = true and b.is_active = true and ST_DWithin(b.location, ST_SetSRID(ST_MakePoint(p_lng, p_lat), 4326)::geography, p_radius_m)
  order by ST_Distance(b.location, ST_SetSRID(ST_MakePoint(p_lng, p_lat), 4326)::geography);
end; $$;

-- ============================================================
-- Grants
-- ============================================================

grant execute on function public.get_points_balance(uuid) to authenticated;
grant execute on function public.redeem_deal(uuid, uuid) to authenticated;
grant execute on function public.get_nearby_deals(double precision, double precision, double precision) to authenticated;

-- ============================================================
-- Seed: Bay Area businesses + deals
-- ============================================================

insert into public.businesses (id, name, description, category, location, address, is_active)
values
  ('a1000000-0000-4000-8000-000000000001'::uuid, 'Bite Cafe', 'Neighborhood coffee and pastries.', 'food', ST_SetSRID(ST_MakePoint(-122.4194, 37.7749), 4326)::geography, '123 Market St, San Francisco, CA', true),
  ('a1000000-0000-4000-8000-000000000002'::uuid, 'Walk & Wag', 'Pet grooming and self-serve dog wash.', 'retail', ST_SetSRID(ST_MakePoint(-122.4086, 37.7875), 4326)::geography, '456 Valencia St, San Francisco, CA', true),
  ('a1000000-0000-4000-8000-000000000003'::uuid, 'Paws Market', 'Pet supplies and treats.', 'retail', ST_SetSRID(ST_MakePoint(-122.4312, 37.7699), 4326)::geography, '789 Mission St, San Francisco, CA', true),
  ('a1000000-0000-4000-8000-000000000004'::uuid, 'Green Juice Co', 'Cold-pressed juices and smoothies.', 'drinks', ST_SetSRID(ST_MakePoint(-122.4050, 37.7850), 4326)::geography, '321 Hayes St, San Francisco, CA', true)
on conflict (id) do update set name = excluded.name, description = excluded.description, category = excluded.category, location = excluded.location, address = excluded.address, is_active = excluded.is_active;

insert into public.deals (id, business_id, title, description, points_cost, is_active)
values
  ('b2000000-0000-4000-8000-000000000001'::uuid, 'a1000000-0000-4000-8000-000000000001'::uuid, 'Free Small Coffee', 'One free small drip coffee.', 250, true),
  ('b2000000-0000-4000-8000-000000000002'::uuid, 'a1000000-0000-4000-8000-000000000002'::uuid, '20% Off Dog Wash', '20% off one self-serve dog wash.', 450, true),
  ('b2000000-0000-4000-8000-000000000003'::uuid, 'a1000000-0000-4000-8000-000000000003'::uuid, '$10 Pet Store Credit', '$10 credit toward any in-store purchase.', 700, true),
  ('b2000000-0000-4000-8000-000000000004'::uuid, 'a1000000-0000-4000-8000-000000000004'::uuid, 'Free Small Juice', 'One free small cold-pressed juice.', 300, true),
  ('b2000000-0000-4000-8000-000000000005'::uuid, 'a1000000-0000-4000-8000-000000000001'::uuid, 'Pastry of the Day', 'One free pastry with any drink purchase.', 150, true)
on conflict (id) do update set title = excluded.title, description = excluded.description, points_cost = excluded.points_cost, is_active = excluded.is_active;

-- ============================================================
-- Storage: business-assets bucket
-- ============================================================

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('business-assets', 'business-assets', true, 2097152, array['image/jpeg', 'image/png', 'image/webp', 'image/gif'])
on conflict (id) do update set public = excluded.public, file_size_limit = excluded.file_size_limit, allowed_mime_types = excluded.allowed_mime_types;

drop policy if exists "business_assets_public_read" on storage.objects;
create policy "business_assets_public_read" on storage.objects for select to public using (bucket_id = 'business-assets');

drop policy if exists "business_assets_authenticated_upload" on storage.objects;
create policy "business_assets_authenticated_upload" on storage.objects for insert to authenticated with check (bucket_id = 'business-assets');

drop policy if exists "business_assets_authenticated_update" on storage.objects;
create policy "business_assets_authenticated_update" on storage.objects for update to authenticated using (bucket_id = 'business-assets');

drop policy if exists "business_assets_authenticated_delete" on storage.objects;
create policy "business_assets_authenticated_delete" on storage.objects for delete to authenticated using (bucket_id = 'business-assets');
