-- Sprint 1 completion: DB functions for points (task 2.4) + Realtime config (task 2.6)

-- ============================================================
-- Task 2.4: Database functions for points calculations
-- ============================================================

-- Pure calculation: distance in miles -> points
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

-- Atomic credit: inserts a ledger entry and returns the new balance.
-- Uses advisory lock per user to prevent race conditions.
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

  -- Per-user advisory lock to serialize point mutations
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

-- Atomic debit: deducts points and returns new balance.
-- Raises exception if insufficient balance.
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

-- Get current balance for a user
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

-- ============================================================
-- Task 2.6: Enable Supabase Realtime on key tables
-- ============================================================

-- Enable realtime publication on point_ledger and walks
do $$
begin
  if exists (select 1 from pg_publication where pubname = 'supabase_realtime') then
    if not exists (
      select 1
      from pg_publication_tables
      where pubname = 'supabase_realtime'
        and schemaname = 'public'
        and tablename = 'point_ledger'
    ) then
      alter publication supabase_realtime add table public.point_ledger;
    end if;

    if not exists (
      select 1
      from pg_publication_tables
      where pubname = 'supabase_realtime'
        and schemaname = 'public'
        and tablename = 'walks'
    ) then
      alter publication supabase_realtime add table public.walks;
    end if;
  end if;
end;
$$;
