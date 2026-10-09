-- RLS isolation tests (pgTAP, scaffold only - cannot execute without a local stack).
--
-- Run with (local Supabase stack required):
--   supabase db start && supabase test db
-- or directly:
--   pg_prove --dbname "postgresql://postgres:postgres@localhost:54322/postgres" supabase/tests/rls_isolation.sql
--
-- Covers tables from supabase/migrations:
--   public.profiles (pk user_id), public.garments (pk garment_id, owner user_id),
--   public.outfit_history (pk look_id, owner user_id).
-- Policies under test (see 20261002000000_create_wardrobe_schema.sql):
--   profiles_select/insert/update/delete_own, garments_select/insert/update/delete_own,
--   outfit_history_select/insert/update/delete_own (all: (select auth.uid()) = user_id).
--
-- Technique: seed rows as superuser (bypasses RLS), then impersonate
-- anon / authenticated callers via SET ROLE + request.jwt.claim.sub,
-- which is what auth.uid() reads.

begin;
select plan(11);

-- Setup: two users with one profile row, one garment row and one
-- history row each. Requires matching auth.users rows for the FK
-- profiles.user_id -> auth.users.id (insert as superuser on local stack).
select lives_ok(
  $$insert into auth.users (id, email) values
    ('11111111-1111-1111-1111-111111111111', 'a@example.com'),
    ('22222222-2222-2222-2222-222222222222', 'b@example.com')
  on conflict (id) do nothing$$,
  'setup auth users'
);

select lives_ok(
  $$insert into public.profiles (user_id) values
    ('11111111-1111-1111-1111-111111111111'),
    ('22222222-2222-2222-2222-222222222222')
  on conflict (user_id) do nothing$$,
  'setup profile rows'
);

select lives_ok(
  $$insert into public.garments (garment_id, user_id, garment_type) values
    ('a0000000-0000-0000-0000-000000000001', '11111111-1111-1111-1111-111111111111', 'top'),
    ('a0000000-0000-0000-0000-000000000002', '22222222-2222-2222-2222-222222222222', 'top')
  on conflict (garment_id) do nothing$$,
  'setup garment rows'
);

select lives_ok(
  $$insert into public.outfit_history (look_id, user_id) values
    ('b0000000-0000-0000-0000-000000000001', '11111111-1111-1111-1111-111111111111'),
    ('b0000000-0000-0000-0000-000000000002', '22222222-2222-2222-2222-222222222222')
  on conflict (look_id) do nothing$$,
  'setup outfit_history rows'
);

-- Anonymous callers see nothing.
set local role anon;
select is(
  (select count(*)::integer from public.profiles),
  0,
  'anon cannot read profiles'
);
select is(
  (select count(*)::integer from public.garments),
  0,
  'anon cannot read garments'
);
select is(
  (select count(*)::integer from public.outfit_history),
  0,
  'anon cannot read outfit_history'
);
reset role;

-- User A sees exactly their own rows, never user B rows.
set local role authenticated;
select ok(
  set_config(
    'request.jwt.claim.sub',
    '11111111-1111-1111-1111-111111111111',
    true
  ) is not null,
  'impersonate user A'
);
select is(
  (select count(*)::integer from public.profiles),
  1,
  'user A reads only their own profile'
);
select is(
  (select count(*)::integer from public.garments),
  1,
  'user A reads only their own garments'
);
select is(
  (select count(*)::integer from public.outfit_history),
  1,
  'user A reads only their own outfit_history'
);
reset role;

rollback;
