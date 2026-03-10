-- Daily goals and streaks tables for walk-to-earn engagement loop

create table if not exists public.daily_goals (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  goal_date date not null default current_date,
  target_steps integer not null default 10000 check (target_steps > 0),
  actual_steps integer not null default 0 check (actual_steps >= 0),
  target_distance_meters numeric(10,2) not null default 8046.72 check (target_distance_meters > 0),
  actual_distance_meters numeric(10,2) not null default 0 check (actual_distance_meters >= 0),
  completed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (user_id, goal_date)
);

create index if not exists idx_daily_goals_user_date on public.daily_goals (user_id, goal_date desc);

create table if not exists public.streaks (
  user_id uuid primary key references auth.users(id) on delete cascade,
  current_streak integer not null default 0 check (current_streak >= 0),
  longest_streak integer not null default 0 check (longest_streak >= 0),
  last_active_date date,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

drop trigger if exists set_daily_goals_updated_at on public.daily_goals;
create trigger set_daily_goals_updated_at before update on public.daily_goals for each row execute function public.set_updated_at();

drop trigger if exists set_streaks_updated_at on public.streaks;
create trigger set_streaks_updated_at before update on public.streaks for each row execute function public.set_updated_at();

-- RLS
alter table public.daily_goals enable row level security;
alter table public.streaks enable row level security;

create policy "daily_goals_select_own" on public.daily_goals for select to authenticated using (auth.uid() = user_id);
create policy "daily_goals_insert_own" on public.daily_goals for insert to authenticated with check (auth.uid() = user_id);
create policy "daily_goals_update_own" on public.daily_goals for update to authenticated using (auth.uid() = user_id) with check (auth.uid() = user_id);

create policy "streaks_select_own" on public.streaks for select to authenticated using (auth.uid() = user_id);
create policy "streaks_insert_own" on public.streaks for insert to authenticated with check (auth.uid() = user_id);
create policy "streaks_update_own" on public.streaks for update to authenticated using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- Get or create today's goal for a user
create or replace function public.get_or_create_daily_goal(p_user_id uuid, p_target_steps integer default 10000)
returns public.daily_goals
language plpgsql security definer as $$
declare
  v_goal public.daily_goals;
  v_target_distance numeric(10,2);
begin
  v_target_distance := round((p_target_steps / 2112.0) * 1609.34, 2);

  insert into public.daily_goals (user_id, goal_date, target_steps, target_distance_meters)
  values (p_user_id, current_date, p_target_steps, v_target_distance)
  on conflict (user_id, goal_date) do nothing;

  select * into v_goal from public.daily_goals
  where user_id = p_user_id and goal_date = current_date;

  return v_goal;
end; $$;

-- Update daily goal progress (called after a walk is recorded)
create or replace function public.update_daily_goal_progress(p_user_id uuid)
returns public.daily_goals
language plpgsql security definer as $$
declare
  v_goal public.daily_goals;
  v_total_steps integer;
  v_total_distance numeric(10,2);
begin
  perform public.get_or_create_daily_goal(p_user_id);

  select coalesce(sum(steps), 0), coalesce(sum(distance_meters), 0)
  into v_total_steps, v_total_distance
  from public.walks
  where user_id = p_user_id and walked_at::date = current_date;

  update public.daily_goals
  set actual_steps = v_total_steps,
      actual_distance_meters = v_total_distance,
      completed_at = case
        when completed_at is null
          and (v_total_steps >= target_steps or v_total_distance >= target_distance_meters)
        then now()
        else completed_at
      end
  where user_id = p_user_id and goal_date = current_date
  returning * into v_goal;

  if v_goal.completed_at is not null then
    perform public.update_streak(p_user_id);
  end if;

  return v_goal;
end; $$;

-- Update streak when a goal is completed
create or replace function public.update_streak(p_user_id uuid)
returns public.streaks
language plpgsql security definer as $$
declare
  v_streak public.streaks;
  v_yesterday date := current_date - 1;
begin
  insert into public.streaks (user_id, current_streak, longest_streak, last_active_date)
  values (p_user_id, 0, 0, null)
  on conflict (user_id) do nothing;

  select * into v_streak from public.streaks where user_id = p_user_id for update;

  if v_streak.last_active_date = current_date then
    return v_streak;
  end if;

  if v_streak.last_active_date = v_yesterday then
    update public.streaks
    set current_streak = current_streak + 1,
        longest_streak = greatest(longest_streak, current_streak + 1),
        last_active_date = current_date
    where user_id = p_user_id
    returning * into v_streak;
  else
    update public.streaks
    set current_streak = 1,
        longest_streak = greatest(longest_streak, 1),
        last_active_date = current_date
    where user_id = p_user_id
    returning * into v_streak;
  end if;

  return v_streak;
end; $$;

-- Get user's current streak info
create or replace function public.get_streak(p_user_id uuid)
returns public.streaks
language plpgsql stable security definer as $$
declare
  v_streak public.streaks;
begin
  select * into v_streak from public.streaks where user_id = p_user_id;
  if v_streak is null then
    return row(p_user_id, 0, 0, null, now(), now())::public.streaks;
  end if;
  return v_streak;
end; $$;

grant execute on function public.get_or_create_daily_goal(uuid, integer) to authenticated;
grant execute on function public.update_daily_goal_progress(uuid) to authenticated;
grant execute on function public.update_streak(uuid) to authenticated;
grant execute on function public.get_streak(uuid) to authenticated;
