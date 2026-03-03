-- Bite Walk initial schema: profiles, walks, point ledger, and discounts.
-- This migration is designed for Supabase (Postgres + auth schema).

create extension if not exists pgcrypto;

create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

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
  steps integer not null check (steps > 0),
  distance_meters numeric(10,2) not null check (distance_meters >= 0),
  points_earned integer not null check (points_earned >= 0),
  note text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
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

create index if not exists walks_user_id_walked_at_idx
  on public.walks(user_id, walked_at desc);

create index if not exists point_ledger_user_id_created_at_idx
  on public.point_ledger(user_id, created_at desc);

create index if not exists discounts_active_points_cost_idx
  on public.discounts(is_active, points_cost);

drop trigger if exists set_profiles_updated_at on public.profiles;
create trigger set_profiles_updated_at
before update on public.profiles
for each row execute function public.set_updated_at();

drop trigger if exists set_walks_updated_at on public.walks;
create trigger set_walks_updated_at
before update on public.walks
for each row execute function public.set_updated_at();

drop trigger if exists set_discounts_updated_at on public.discounts;
create trigger set_discounts_updated_at
before update on public.discounts
for each row execute function public.set_updated_at();

alter table public.profiles enable row level security;
alter table public.walks enable row level security;
alter table public.point_ledger enable row level security;
alter table public.discounts enable row level security;

drop policy if exists "profiles_select_own" on public.profiles;
create policy "profiles_select_own"
on public.profiles
for select
to authenticated
using (auth.uid() = id);

drop policy if exists "profiles_insert_own" on public.profiles;
create policy "profiles_insert_own"
on public.profiles
for insert
to authenticated
with check (auth.uid() = id);

drop policy if exists "profiles_update_own" on public.profiles;
create policy "profiles_update_own"
on public.profiles
for update
to authenticated
using (auth.uid() = id)
with check (auth.uid() = id);

drop policy if exists "walks_select_own" on public.walks;
create policy "walks_select_own"
on public.walks
for select
to authenticated
using (auth.uid() = user_id);

drop policy if exists "walks_insert_own" on public.walks;
create policy "walks_insert_own"
on public.walks
for insert
to authenticated
with check (auth.uid() = user_id);

drop policy if exists "walks_update_own" on public.walks;
create policy "walks_update_own"
on public.walks
for update
to authenticated
using (auth.uid() = user_id)
with check (auth.uid() = user_id);

drop policy if exists "walks_delete_own" on public.walks;
create policy "walks_delete_own"
on public.walks
for delete
to authenticated
using (auth.uid() = user_id);

drop policy if exists "point_ledger_select_own" on public.point_ledger;
create policy "point_ledger_select_own"
on public.point_ledger
for select
to authenticated
using (auth.uid() = user_id);

drop policy if exists "point_ledger_insert_own" on public.point_ledger;
create policy "point_ledger_insert_own"
on public.point_ledger
for insert
to authenticated
with check (auth.uid() = user_id);

drop policy if exists "point_ledger_update_own" on public.point_ledger;
create policy "point_ledger_update_own"
on public.point_ledger
for update
to authenticated
using (auth.uid() = user_id)
with check (auth.uid() = user_id);

drop policy if exists "point_ledger_delete_own" on public.point_ledger;
create policy "point_ledger_delete_own"
on public.point_ledger
for delete
to authenticated
using (auth.uid() = user_id);

drop policy if exists "discounts_select_active" on public.discounts;
create policy "discounts_select_active"
on public.discounts
for select
to authenticated
using (is_active = true);

insert into public.discounts (
  slug,
  title,
  description,
  partner_name,
  points_cost,
  coupon_code,
  is_active
) values
  (
    'free-coffee',
    'Free Small Coffee',
    'Redeem for one free small drip coffee.',
    'Bite Cafe',
    250,
    'BITE-COFFEE',
    true
  ),
  (
    'dog-wash-20-off',
    '20% Off Dog Wash',
    'Get 20% off one self-serve dog wash session.',
    'Walk & Wag',
    450,
    'WAG20',
    true
  ),
  (
    'pet-store-10-credit',
    '$10 Pet Store Credit',
    'Apply a $10 credit toward any in-store purchase.',
    'Paws Market',
    700,
    'PAWS10',
    true
  )
on conflict (slug) do update
set
  title = excluded.title,
  description = excluded.description,
  partner_name = excluded.partner_name,
  points_cost = excluded.points_cost,
  coupon_code = excluded.coupon_code,
  is_active = excluded.is_active,
  updated_at = now();
