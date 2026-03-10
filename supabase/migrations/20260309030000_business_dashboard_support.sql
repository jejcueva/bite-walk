-- Business dashboard support: application tracking, analytics views

-- Business applications for signup flow
create table if not exists public.business_applications (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  business_name text not null,
  description text,
  address text,
  category text check (category in ('food', 'drinks', 'retail', 'other')),
  status text not null default 'pending' check (status in ('pending', 'approved', 'rejected')),
  reviewed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.business_applications enable row level security;

create policy "business_applications_select_own" on public.business_applications
  for select to authenticated using (auth.uid() = user_id);
create policy "business_applications_insert_own" on public.business_applications
  for insert to authenticated with check (auth.uid() = user_id);

drop trigger if exists set_business_applications_updated_at on public.business_applications;
create trigger set_business_applications_updated_at before update on public.business_applications
  for each row execute function public.set_updated_at();

-- Analytics: redemption stats per deal (materialized view-like)
create or replace function public.get_deal_redemption_stats(p_business_id uuid)
returns table (
  deal_id uuid,
  deal_title text,
  total_redemptions bigint,
  total_points_spent bigint,
  last_redeemed_at timestamptz
)
language sql stable security definer as $$
  select
    d.id as deal_id,
    d.title as deal_title,
    count(v.id) as total_redemptions,
    coalesce(sum(d.points_cost), 0) as total_points_spent,
    max(v.created_at) as last_redeemed_at
  from public.deals d
  left join public.vouchers v on v.deal_id = d.id
  where d.business_id = p_business_id
  group by d.id, d.title
  order by total_redemptions desc;
$$;

-- Analytics: daily redemptions over a date range
create or replace function public.get_daily_redemptions(p_business_id uuid, p_days integer default 30)
returns table (
  redemption_date date,
  redemption_count bigint
)
language sql stable security definer as $$
  select
    v.created_at::date as redemption_date,
    count(*) as redemption_count
  from public.vouchers v
  join public.deals d on d.id = v.deal_id
  where d.business_id = p_business_id
    and v.created_at >= (current_date - p_days)
  group by v.created_at::date
  order by redemption_date;
$$;

grant execute on function public.get_deal_redemption_stats(uuid) to authenticated;
grant execute on function public.get_daily_redemptions(uuid, integer) to authenticated;
