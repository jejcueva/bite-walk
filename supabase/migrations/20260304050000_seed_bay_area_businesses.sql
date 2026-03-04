-- Seed 3–5 Bay Area businesses with sample deals (Sprint 3 DoD)

-- Use explicit UUIDs so seed is idempotent (run multiple times safely)
insert into public.businesses (id, name, description, category, location, address, is_active)
values
  (
    'a1000000-0000-4000-8000-000000000001'::uuid,
    'Bite Cafe',
    'Neighborhood coffee and pastries.',
    'food',
    ST_SetSRID(ST_MakePoint(-122.4194, 37.7749), 4326)::geography,
    '123 Market St, San Francisco, CA',
    true
  ),
  (
    'a1000000-0000-4000-8000-000000000002',
    'Walk & Wag',
    'Pet grooming and self-serve dog wash.',
    'retail',
    ST_SetSRID(ST_MakePoint(-122.4086, 37.7875), 4326)::geography,
    '456 Valencia St, San Francisco, CA',
    true
  ),
  (
    'a1000000-0000-4000-8000-000000000003',
    'Paws Market',
    'Pet supplies and treats.',
    'retail',
    ST_SetSRID(ST_MakePoint(-122.4312, 37.7699), 4326)::geography,
    '789 Mission St, San Francisco, CA',
    true
  ),
  (
    'a1000000-0000-4000-8000-000000000004',
    'Green Juice Co',
    'Cold-pressed juices and smoothies.',
    'drinks',
    ST_SetSRID(ST_MakePoint(-122.4050, 37.7850), 4326)::geography,
    '321 Hayes St, San Francisco, CA',
    true
  )
on conflict (id) do update set
  name = excluded.name,
  description = excluded.description,
  category = excluded.category,
  location = excluded.location,
  address = excluded.address,
  is_active = excluded.is_active;

insert into public.deals (id, business_id, title, description, points_cost, is_active)
values
  (
    'b2000000-0000-4000-8000-000000000001'::uuid,
    'a1000000-0000-4000-8000-000000000001'::uuid,
    'Free Small Coffee',
    'One free small drip coffee.',
    250,
    true
  ),
  (
    'b2000000-0000-4000-8000-000000000002'::uuid,
    'a1000000-0000-4000-8000-000000000002'::uuid,
    '20% Off Dog Wash',
    '20% off one self-serve dog wash.',
    450,
    true
  ),
  (
    'b2000000-0000-4000-8000-000000000003'::uuid,
    'a1000000-0000-4000-8000-000000000003'::uuid,
    '$10 Pet Store Credit',
    '$10 credit toward any in-store purchase.',
    700,
    true
  ),
  (
    'b2000000-0000-4000-8000-000000000004'::uuid,
    'a1000000-0000-4000-8000-000000000004'::uuid,
    'Free Small Juice',
    'One free small cold-pressed juice.',
    300,
    true
  ),
  (
    'b2000000-0000-4000-8000-000000000005'::uuid,
    'a1000000-0000-4000-8000-000000000001'::uuid,
    'Pastry of the Day',
    'One free pastry with any drink purchase.',
    150,
    true
  )
on conflict (id) do update set
  title = excluded.title,
  description = excluded.description,
  points_cost = excluded.points_cost,
  is_active = excluded.is_active;
