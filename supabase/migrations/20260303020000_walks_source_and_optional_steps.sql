-- Sprint 2 patch: align `walks` table with app inserts.
-- - App inserts do not provide `steps`, so `steps` must be nullable and allow NULL in constraints.
-- - App writes `source` ('auto' | 'manual') for provenance.

-- Add `source` if missing (nullable) and default for new rows
alter table public.walks
add column if not exists source text;

alter table public.walks
alter column source set default 'manual';

-- Make steps optional (app does not send it)
alter table public.walks
alter column steps drop not null;

-- Replace any existing steps-related CHECK constraint(s) with one that permits NULL.
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

