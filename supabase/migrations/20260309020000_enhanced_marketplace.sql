-- Enhanced marketplace: favorites, business hours, refined categories

create table if not exists public.favorites (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  deal_id uuid not null references public.deals(id) on delete cascade,
  created_at timestamptz not null default now(),
  unique (user_id, deal_id)
);

create index if not exists idx_favorites_user on public.favorites (user_id, created_at desc);

create table if not exists public.business_hours (
  id uuid primary key default gen_random_uuid(),
  business_id uuid not null references public.businesses(id) on delete cascade,
  day_of_week integer not null check (day_of_week between 0 and 6),
  open_time time not null,
  close_time time not null,
  is_closed boolean not null default false,
  unique (business_id, day_of_week)
);

create index if not exists idx_business_hours_business on public.business_hours (business_id);

-- Add image_url to deals
alter table public.deals add column if not exists image_url text;

-- Add subcategory for restaurant-focused filtering
alter table public.deals add column if not exists subcategory text
  check (subcategory is null or subcategory in (
    'breakfast', 'lunch', 'dinner', 'coffee', 'dessert', 'drinks', 'snacks'
  ));

-- RLS
alter table public.favorites enable row level security;
alter table public.business_hours enable row level security;

create policy "favorites_select_own" on public.favorites for select to authenticated using (auth.uid() = user_id);
create policy "favorites_insert_own" on public.favorites for insert to authenticated with check (auth.uid() = user_id);
create policy "favorites_delete_own" on public.favorites for delete to authenticated using (auth.uid() = user_id);

create policy "business_hours_select_public" on public.business_hours for select to authenticated using (true);
create policy "business_hours_owner_manage" on public.business_hours for all to authenticated
using (exists (
  select 1 from public.businesses b
  join public.user_roles ur on ur.user_id = auth.uid() and ur.role = 'business_owner'
  where b.id = business_hours.business_id and b.owner_id = auth.uid()
))
with check (exists (
  select 1 from public.businesses b
  join public.user_roles ur on ur.user_id = auth.uid() and ur.role = 'business_owner'
  where b.id = business_hours.business_id and b.owner_id = auth.uid()
));

-- Toggle favorite function
create or replace function public.toggle_favorite(p_user_id uuid, p_deal_id uuid)
returns boolean
language plpgsql security definer as $$
declare
  v_exists boolean;
begin
  select exists(
    select 1 from public.favorites where user_id = p_user_id and deal_id = p_deal_id
  ) into v_exists;

  if v_exists then
    delete from public.favorites where user_id = p_user_id and deal_id = p_deal_id;
    return false;
  else
    insert into public.favorites (user_id, deal_id) values (p_user_id, p_deal_id);
    return true;
  end if;
end; $$;

-- Get user's favorite deal IDs
create or replace function public.get_favorite_deal_ids(p_user_id uuid)
returns setof uuid
language sql stable security definer as $$
  select deal_id from public.favorites where user_id = p_user_id order by created_at desc;
$$;

grant execute on function public.toggle_favorite(uuid, uuid) to authenticated;
grant execute on function public.get_favorite_deal_ids(uuid) to authenticated;

-- Update deals view to include new columns
create or replace view public.deals_with_businesses as
select d.id, d.title, d.description, d.points_cost, d.original_price, d.discount_percent,
  d.is_premium_only, d.max_redemptions_per_day, d.is_active, d.created_at, d.expires_at,
  d.image_url, d.subcategory,
  b.name as business_name, b.logo_url as business_logo_url, b.category, b.address, b.location
from public.deals d
join public.businesses b on b.id = d.business_id
where d.is_active = true and b.is_active = true;

alter view public.deals_with_businesses owner to postgres;
