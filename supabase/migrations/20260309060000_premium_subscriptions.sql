-- Premium subscriptions

create table if not exists public.subscriptions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  plan text not null check (plan in ('free', 'premium')),
  points_multiplier numeric(3,1) not null default 1.0 check (points_multiplier >= 1.0),
  started_at timestamptz not null default now(),
  expires_at timestamptz,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_subscriptions_user on public.subscriptions (user_id, is_active);

drop trigger if exists set_subscriptions_updated_at on public.subscriptions;
create trigger set_subscriptions_updated_at before update on public.subscriptions
  for each row execute function public.set_updated_at();

-- RLS
alter table public.subscriptions enable row level security;

create policy "subscriptions_select_own" on public.subscriptions
  for select to authenticated using (auth.uid() = user_id);
create policy "subscriptions_insert_own" on public.subscriptions
  for insert to authenticated with check (auth.uid() = user_id);

-- Get user's active subscription
create or replace function public.get_subscription(p_user_id uuid)
returns public.subscriptions
language plpgsql stable security definer as $$
declare v_sub public.subscriptions;
begin
  select * into v_sub from public.subscriptions
  where user_id = p_user_id and is_active = true
    and (expires_at is null or expires_at > now())
  order by created_at desc limit 1;
  return v_sub;
end; $$;

-- Get points multiplier for a user (1.0 for free, 2.0 for premium)
create or replace function public.get_points_multiplier(p_user_id uuid)
returns numeric
language plpgsql stable security definer as $$
declare v_multiplier numeric;
begin
  select points_multiplier into v_multiplier
  from public.subscriptions
  where user_id = p_user_id and is_active = true
    and (expires_at is null or expires_at > now())
  order by created_at desc limit 1;
  return coalesce(v_multiplier, 1.0);
end; $$;

-- Updated calculate_points with multiplier
create or replace function public.calculate_points_with_multiplier(distance_miles float, multiplier numeric default 1.0)
returns integer language plpgsql immutable as $$
begin
  if distance_miles is null or distance_miles <= 0 then return 0; end if;
  return floor(distance_miles * 100 * multiplier)::integer;
end; $$;

grant execute on function public.get_subscription(uuid) to authenticated;
grant execute on function public.get_points_multiplier(uuid) to authenticated;
grant execute on function public.calculate_points_with_multiplier(float, numeric) to authenticated;
