-- RPC: get deals near a point, sorted by distance (PostGIS)
-- Parameters: p_lng, p_lat (WGS84), p_radius_m (meters). Omit or 0 = no distance filter, return all active deals sorted by points_cost.

create or replace function public.get_nearby_deals(
  p_lng double precision default null,
  p_lat double precision default null,
  p_radius_m double precision default null
)
returns table (
  id uuid,
  title text,
  description text,
  points_cost integer,
  business_name text,
  business_logo_url text,
  category text,
  address text,
  dist_meters double precision
)
language plpgsql
stable
security definer
as $$
begin
  if p_lng is null or p_lat is null or p_radius_m is null or p_radius_m <= 0 then
    return query
    select
      d.id,
      d.title,
      d.description,
      d.points_cost,
      b.name::text,
      b.logo_url,
      b.category,
      b.address,
      null::double precision
    from public.deals d
    join public.businesses b on b.id = d.business_id
    where d.is_active = true
      and b.is_active = true
    order by d.points_cost asc;
    return;
  end if;

  return query
  select
    d.id,
    d.title,
    d.description,
    d.points_cost,
    b.name::text,
    b.logo_url,
    b.category,
    b.address,
    round(ST_Distance(b.location, ST_SetSRID(ST_MakePoint(p_lng, p_lat), 4326)::geography)::numeric, 0)::double precision
  from public.deals d
  join public.businesses b on b.id = d.business_id
  where d.is_active = true
    and b.is_active = true
    and ST_DWithin(b.location, ST_SetSRID(ST_MakePoint(p_lng, p_lat), 4326)::geography, p_radius_m)
  order by ST_Distance(b.location, ST_SetSRID(ST_MakePoint(p_lng, p_lat), 4326)::geography);
end;
$$;

grant execute on function public.get_nearby_deals(double precision, double precision, double precision) to authenticated;
