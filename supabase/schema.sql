-- BiteWalk consolidated schema (single-run SQL)
-- Use this if you want ONE file to paste into Supabase SQL editor for a fresh project.
-- It represents the current desired DB state as of Sprint 2:
-- - Base tables + RLS policies + seed discounts
-- - Points functions + Realtime publication config
-- - Walks table patch (source column + steps nullable)

-- ============================================================
-- Base schema (tables, triggers, RLS)
-- ============================================================

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

-- ============================================================
-- Points functions + Realtime
-- ============================================================

create or replace function public.calculate_points(distance_miles float)
returns integer
language plpgsql
immutable
as $$
begin
  if distance_miles is null or distance_miles <= 0 then
    return 0;
  end if;
  return floor(distance_miles * 100)::integer;
end;
$$;

create or replace function public.credit_points(
  p_user_id uuid,
  p_amount integer,
  p_reason text,
  p_walk_id uuid default null
)
returns integer
language plpgsql
security definer
as $$
declare
  v_balance integer;
begin
  if p_amount <= 0 then
    raise exception 'credit amount must be positive';
  end if;

  perform pg_advisory_xact_lock(hashtext(p_user_id::text));

  insert into public.point_ledger (user_id, walk_id, entry_type, points_delta, description)
  values (p_user_id, p_walk_id, 'walk', p_amount, p_reason);

  select coalesce(sum(points_delta), 0)
  into v_balance
  from public.point_ledger
  where user_id = p_user_id;

  return v_balance;
end;
$$;

create or replace function public.debit_points(
  p_user_id uuid,
  p_amount integer,
  p_reason text
)
returns integer
language plpgsql
security definer
as $$
declare
  v_balance integer;
begin
  if p_amount <= 0 then
    raise exception 'debit amount must be positive';
  end if;

  perform pg_advisory_xact_lock(hashtext(p_user_id::text));

  select coalesce(sum(points_delta), 0)
  into v_balance
  from public.point_ledger
  where user_id = p_user_id;

  if v_balance < p_amount then
    raise exception 'insufficient points: have %, need %', v_balance, p_amount;
  end if;

  insert into public.point_ledger (user_id, entry_type, points_delta, description)
  values (p_user_id, 'redeem', -p_amount, p_reason);

  return v_balance - p_amount;
end;
$$;

create or replace function public.get_points_balance(p_user_id uuid)
returns integer
language sql
stable
security definer
as $$
  select coalesce(sum(points_delta), 0)::integer
  from public.point_ledger
  where user_id = p_user_id;
$$;

-- Enable realtime publication on point_ledger and walks
alter publication supabase_realtime add table public.point_ledger;
alter publication supabase_realtime add table public.walks;

-- ============================================================
-- Sprint 2 patch: align walks table with app inserts
-- ============================================================

alter table public.walks
add column if not exists source text;

alter table public.walks
alter column source set default 'manual';

alter table public.walks
alter column steps drop not null;

do $$
declare
  c record;
begin
  for c in
    select conname
    from pg_constraint
    where conrelid = 'public.walks'::regclass
      and contype = 'c'
      and pg_get_constraintdef(oid) ilike '%steps%'
  loop
    execute format('alter table public.walks drop constraint if exists %I', c.conname);
  end loop;

  alter table public.walks
    add constraint walks_steps_check
    check (steps is null or steps > 0);
end $$;

