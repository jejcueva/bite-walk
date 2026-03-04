-- Convenience view for deals joined with businesses (for app queries)

create or replace view public.deals_with_businesses as
select
  d.id,
  d.title,
  d.description,
  d.points_cost,
  d.original_price,
  d.discount_percent,
  d.is_premium_only,
  d.max_redemptions_per_day,
  d.is_active,
  d.created_at,
  d.expires_at,
  b.name as business_name,
  b.logo_url as business_logo_url,
  b.category,
  b.address,
  b.location
from public.deals d
join public.businesses b on b.id = d.business_id
where d.is_active = true
  and b.is_active = true;

alter view public.deals_with_businesses
  owner to postgres;

-- Simple RLS passthrough: rely on underlying tables' RLS

-- ============================================================
-- redeem_deal + validate_voucher functions
-- ============================================================

create or replace function public.redeem_deal(
  p_user_id uuid,
  p_deal_id uuid
)
returns table (
  voucher_id uuid,
  qr_data text,
  expires_at timestamptz
)
language plpgsql
security definer
as $$
declare
  v_points_cost integer;
  v_deal_title text;
  v_business_name text;
  v_voucher_id uuid;
  v_ledger_id uuid;
  v_expires_at timestamptz;
begin
  select d.points_cost, d.title, b.name
  into v_points_cost, v_deal_title, v_business_name
  from public.deals d
  join public.businesses b on b.id = d.business_id
  where d.id = p_deal_id
    and d.is_active = true
    and b.is_active = true;

  if v_points_cost is null then
    raise exception 'deal not found or inactive';
  end if;

  perform pg_advisory_xact_lock(hashtext(p_user_id::text));

  -- Ensure sufficient balance
  if public.get_points_balance(p_user_id) < v_points_cost then
    raise exception 'insufficient points';
  end if;

  -- Debit points via ledger
  insert into public.point_ledger (user_id, entry_type, points_delta, description)
  values (p_user_id, 'redeem', -v_points_cost, format('Redeem: %s at %s', v_deal_title, v_business_name))
  returning id into v_ledger_id;

  v_expires_at := now() + interval '30 minutes';

  v_voucher_id := gen_random_uuid();

  insert into public.vouchers (
    id,
    user_id,
    deal_id,
    ledger_entry_id,
    status,
    qr_code_data,
    expires_at
  )
  values (
    v_voucher_id,
    p_user_id,
    p_deal_id,
    v_ledger_id,
    'active',
    json_build_object(
      'voucher_id', v_voucher_id,
      'deal_id', p_deal_id,
      'user_id', p_user_id
    )::text,
    v_expires_at
  );

  return query
  select v_voucher_id, qr_code_data, expires_at
  from public.vouchers
  where id = v_voucher_id;
end;
$$;

create or replace function public.validate_voucher(
  p_voucher_id uuid
)
returns table (
  voucher_id uuid,
  status text,
  deal_title text,
  business_name text,
  points_cost integer,
  expires_at timestamptz,
  used_at timestamptz
)
language plpgsql
security definer
as $$
declare
  v_status text;
  v_expires_at timestamptz;
begin
  select status, expires_at
  into v_status, v_expires_at
  from public.vouchers
  where id = p_voucher_id;

  if v_status is null then
    raise exception 'voucher not found';
  end if;

  if v_status <> 'active' then
    raise exception 'voucher is not active';
  end if;

  if v_expires_at <= now() then
    update public.vouchers
    set status = 'expired'
    where id = p_voucher_id;
    raise exception 'voucher has expired';
  end if;

  update public.vouchers
  set status = 'used',
      used_at = now()
  where id = p_voucher_id;

  return query
  select
    v.id as voucher_id,
    v.status,
    d.title as deal_title,
    b.name as business_name,
    d.points_cost,
    v.expires_at,
    v.used_at
  from public.vouchers v
  join public.deals d on d.id = v.deal_id
  join public.businesses b on b.id = d.business_id
  where v.id = p_voucher_id;
end;
$$;

