-- Leaderboards and social features

create table if not exists public.friends (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  friend_id uuid not null references auth.users(id) on delete cascade,
  status text not null default 'pending' check (status in ('pending', 'accepted', 'rejected')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (user_id, friend_id),
  check (user_id <> friend_id)
);

create index if not exists idx_friends_user on public.friends (user_id, status);
create index if not exists idx_friends_friend on public.friends (friend_id, status);

create table if not exists public.leaderboard_entries (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  period_type text not null check (period_type in ('weekly', 'monthly', 'all_time')),
  period_key text not null,
  total_points integer not null default 0,
  total_distance_meters numeric(12,2) not null default 0,
  total_steps integer not null default 0,
  rank integer,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (user_id, period_type, period_key)
);

create index if not exists idx_leaderboard_period_rank on public.leaderboard_entries (period_type, period_key, total_points desc);

drop trigger if exists set_friends_updated_at on public.friends;
create trigger set_friends_updated_at before update on public.friends for each row execute function public.set_updated_at();

drop trigger if exists set_leaderboard_entries_updated_at on public.leaderboard_entries;
create trigger set_leaderboard_entries_updated_at before update on public.leaderboard_entries for each row execute function public.set_updated_at();

-- RLS
alter table public.friends enable row level security;
alter table public.leaderboard_entries enable row level security;

create policy "friends_select_own" on public.friends for select to authenticated
  using (auth.uid() = user_id or auth.uid() = friend_id);
create policy "friends_insert_own" on public.friends for insert to authenticated
  with check (auth.uid() = user_id);
create policy "friends_update_own" on public.friends for update to authenticated
  using (auth.uid() = friend_id) with check (auth.uid() = friend_id);
create policy "friends_delete_own" on public.friends for delete to authenticated
  using (auth.uid() = user_id or auth.uid() = friend_id);

create policy "leaderboard_select_all" on public.leaderboard_entries for select to authenticated using (true);

-- Get leaderboard
create or replace function public.get_leaderboard(
  p_period_type text default 'weekly',
  p_limit integer default 50
)
returns table (
  user_id uuid,
  display_name text,
  avatar_url text,
  total_points integer,
  total_distance_meters numeric,
  total_steps integer,
  rank bigint
)
language sql stable security definer as $$
  with current_period as (
    select case p_period_type
      when 'weekly' then to_char(current_date, 'IYYY-IW')
      when 'monthly' then to_char(current_date, 'YYYY-MM')
      else 'all_time'
    end as key
  ),
  ranked as (
    select
      le.user_id,
      le.total_points,
      le.total_distance_meters,
      le.total_steps,
      row_number() over (order by le.total_points desc) as rank
    from public.leaderboard_entries le, current_period cp
    where le.period_type = p_period_type and le.period_key = cp.key
  )
  select
    r.user_id,
    coalesce(p.display_name, 'Anonymous') as display_name,
    p.avatar_url,
    r.total_points,
    r.total_distance_meters,
    r.total_steps,
    r.rank
  from ranked r
  left join public.profiles p on p.id = r.user_id
  order by r.rank
  limit p_limit;
$$;

-- Get friends leaderboard
create or replace function public.get_friends_leaderboard(
  p_user_id uuid,
  p_period_type text default 'weekly',
  p_limit integer default 50
)
returns table (
  user_id uuid,
  display_name text,
  avatar_url text,
  total_points integer,
  total_distance_meters numeric,
  total_steps integer,
  rank bigint
)
language sql stable security definer as $$
  with current_period as (
    select case p_period_type
      when 'weekly' then to_char(current_date, 'IYYY-IW')
      when 'monthly' then to_char(current_date, 'YYYY-MM')
      else 'all_time'
    end as key
  ),
  friend_ids as (
    select friend_id as uid from public.friends where user_id = p_user_id and status = 'accepted'
    union
    select user_id as uid from public.friends where friend_id = p_user_id and status = 'accepted'
    union
    select p_user_id as uid
  ),
  ranked as (
    select
      le.user_id,
      le.total_points,
      le.total_distance_meters,
      le.total_steps,
      row_number() over (order by le.total_points desc) as rank
    from public.leaderboard_entries le, current_period cp
    where le.period_type = p_period_type
      and le.period_key = cp.key
      and le.user_id in (select uid from friend_ids)
  )
  select
    r.user_id,
    coalesce(p.display_name, 'Anonymous') as display_name,
    p.avatar_url,
    r.total_points,
    r.total_distance_meters,
    r.total_steps,
    r.rank
  from ranked r
  left join public.profiles p on p.id = r.user_id
  order by r.rank
  limit p_limit;
$$;

-- Send friend request
create or replace function public.send_friend_request(p_user_id uuid, p_friend_id uuid)
returns public.friends
language plpgsql security definer as $$
declare v_friend public.friends;
begin
  if p_user_id = p_friend_id then raise exception 'cannot friend yourself'; end if;
  insert into public.friends (user_id, friend_id, status) values (p_user_id, p_friend_id, 'pending')
  on conflict (user_id, friend_id) do nothing
  returning * into v_friend;
  return v_friend;
end; $$;

-- Accept friend request
create or replace function public.accept_friend_request(p_request_id uuid, p_user_id uuid)
returns public.friends
language plpgsql security definer as $$
declare v_friend public.friends;
begin
  update public.friends set status = 'accepted'
  where id = p_request_id and friend_id = p_user_id and status = 'pending'
  returning * into v_friend;
  if v_friend is null then raise exception 'friend request not found'; end if;
  return v_friend;
end; $$;

-- Refresh leaderboard for current period
create or replace function public.refresh_leaderboard_entry(p_user_id uuid)
returns void
language plpgsql security definer as $$
declare
  v_weekly_key text := to_char(current_date, 'IYYY-IW');
  v_monthly_key text := to_char(current_date, 'YYYY-MM');
  v_weekly_points integer;
  v_weekly_distance numeric(12,2);
  v_weekly_steps integer;
  v_monthly_points integer;
  v_monthly_distance numeric(12,2);
  v_monthly_steps integer;
begin
  select coalesce(sum(points_earned), 0), coalesce(sum(distance_meters), 0), coalesce(sum(steps), 0)
  into v_weekly_points, v_weekly_distance, v_weekly_steps
  from public.walks
  where user_id = p_user_id and walked_at >= date_trunc('week', current_date);

  insert into public.leaderboard_entries (user_id, period_type, period_key, total_points, total_distance_meters, total_steps)
  values (p_user_id, 'weekly', v_weekly_key, v_weekly_points, v_weekly_distance, v_weekly_steps)
  on conflict (user_id, period_type, period_key) do update
  set total_points = v_weekly_points, total_distance_meters = v_weekly_distance, total_steps = v_weekly_steps;

  select coalesce(sum(points_earned), 0), coalesce(sum(distance_meters), 0), coalesce(sum(steps), 0)
  into v_monthly_points, v_monthly_distance, v_monthly_steps
  from public.walks
  where user_id = p_user_id and walked_at >= date_trunc('month', current_date);

  insert into public.leaderboard_entries (user_id, period_type, period_key, total_points, total_distance_meters, total_steps)
  values (p_user_id, 'monthly', v_monthly_key, v_monthly_points, v_monthly_distance, v_monthly_steps)
  on conflict (user_id, period_type, period_key) do update
  set total_points = v_monthly_points, total_distance_meters = v_monthly_distance, total_steps = v_monthly_steps;
end; $$;

grant execute on function public.get_leaderboard(text, integer) to authenticated;
grant execute on function public.get_friends_leaderboard(uuid, text, integer) to authenticated;
grant execute on function public.send_friend_request(uuid, uuid) to authenticated;
grant execute on function public.accept_friend_request(uuid, uuid) to authenticated;
grant execute on function public.refresh_leaderboard_entry(uuid) to authenticated;
