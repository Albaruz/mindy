-- Smart wardrobe schema: profiles, garments, outfit_history.
--
-- Conventions: lowercase snake_case identifiers, timestamptz for timestamps,
-- text + CHECK constraints instead of native ENUM types (easier to evolve:
-- adding a value is a constraint rewrite, not a type migration).
-- RLS policies use (select auth.uid()) so the function is evaluated once
-- per statement instead of once per row.
--
-- Apply with: supabase db push  (or paste into the Supabase SQL editor).

create extension if not exists "pgcrypto";

-- ---------------------------------------------------------------------------
-- Tables
-- ---------------------------------------------------------------------------

create table if not exists public.profiles (
  user_id uuid primary key references auth.users (id) on delete cascade,
  skin_tone text,
  eye_color text,
  hair_color text,
  chest_measurement_cm integer
    check (chest_measurement_cm is null or chest_measurement_cm > 0),
  waist_measurement_cm integer
    check (waist_measurement_cm is null or waist_measurement_cm > 0),
  hip_measurement_cm integer
    check (hip_measurement_cm is null or hip_measurement_cm > 0),
  colorimetry text
    check (
      colorimetry is null
      or colorimetry in ('spring', 'summer', 'autumn', 'winter')
    ),
  morphology text
    check (
      morphology is null
      or morphology
        in ('triangle', 'inverted_triangle', 'hourglass', 'rectangle', 'oval')
    ),
  preferred_fit text
    check (
      preferred_fit is null
      or preferred_fit in ('slim', 'regular', 'oversized', 'mixed')
    ),
  lifestyle text
    check (
      lifestyle is null
      or lifestyle
        in (
          'casual_daily',
          'corporate_office',
          'active_sports',
          'home_remote',
          'social_events'
        )
    ),
  extra_preferences jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create table if not exists public.garments (
  garment_id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles (user_id) on delete cascade,
  image_url text,
  garment_type text,
  style text,
  cut_length text,
  color text,
  material text,
  season text
    check (
      season is null or season in ('summer', 'winter', 'mid_season', 'all')
    ),
  is_dirty boolean not null default false,
  last_worn_date timestamptz,
  is_external_garment boolean not null default false,
  extra_tags jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create table if not exists public.outfit_history (
  look_id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles (user_id) on delete cascade,
  -- Element-level foreign key to garments cannot be enforced natively on a
  -- uuid[] column; membership is validated at the application layer.
  garment_ids uuid[] not null default '{}',
  worn_date timestamptz not null default now(),
  created_at timestamptz not null default now()
);

-- ---------------------------------------------------------------------------
-- Indexes (foreign keys are NOT auto-indexed by Postgres)
-- ---------------------------------------------------------------------------

create index if not exists garments_user_id_idx on public.garments (user_id);
create index if not exists outfit_history_user_id_idx
  on public.outfit_history (user_id);
create index if not exists profiles_extra_preferences_gin
  on public.profiles using gin (extra_preferences);
create index if not exists garments_extra_tags_gin
  on public.garments using gin (extra_tags);
-- Fast "laundry basket" lookup: dirty garments per user.
create index if not exists garments_dirty_idx
  on public.garments (user_id)
  where is_dirty = true;

-- ---------------------------------------------------------------------------
-- Row Level Security: users can only CRUD their own rows (via user_id)
-- ---------------------------------------------------------------------------

alter table public.profiles enable row level security;
alter table public.garments enable row level security;
alter table public.outfit_history enable row level security;

-- Profiles ---------------------------------------------------------------

drop policy if exists "profiles_select_own" on public.profiles;
create policy "profiles_select_own"
  on public.profiles
  for select
  to authenticated
  using ((select auth.uid()) = user_id);

drop policy if exists "profiles_insert_own" on public.profiles;
create policy "profiles_insert_own"
  on public.profiles
  for insert
  to authenticated
  with check ((select auth.uid()) = user_id);

drop policy if exists "profiles_update_own" on public.profiles;
create policy "profiles_update_own"
  on public.profiles
  for update
  to authenticated
  using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);

drop policy if exists "profiles_delete_own" on public.profiles;
create policy "profiles_delete_own"
  on public.profiles
  for delete
  to authenticated
  using ((select auth.uid()) = user_id);

-- Garments ---------------------------------------------------------------

drop policy if exists "garments_select_own" on public.garments;
create policy "garments_select_own"
  on public.garments
  for select
  to authenticated
  using ((select auth.uid()) = user_id);

drop policy if exists "garments_insert_own" on public.garments;
create policy "garments_insert_own"
  on public.garments
  for insert
  to authenticated
  with check ((select auth.uid()) = user_id);

drop policy if exists "garments_update_own" on public.garments;
create policy "garments_update_own"
  on public.garments
  for update
  to authenticated
  using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);

drop policy if exists "garments_delete_own" on public.garments;
create policy "garments_delete_own"
  on public.garments
  for delete
  to authenticated
  using ((select auth.uid()) = user_id);

-- Outfit history ----------------------------------------------------------

drop policy if exists "outfit_history_select_own" on public.outfit_history;
create policy "outfit_history_select_own"
  on public.outfit_history
  for select
  to authenticated
  using ((select auth.uid()) = user_id);

drop policy if exists "outfit_history_insert_own" on public.outfit_history;
create policy "outfit_history_insert_own"
  on public.outfit_history
  for insert
  to authenticated
  with check ((select auth.uid()) = user_id);

drop policy if exists "outfit_history_update_own" on public.outfit_history;
create policy "outfit_history_update_own"
  on public.outfit_history
  for update
  to authenticated
  using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);

drop policy if exists "outfit_history_delete_own" on public.outfit_history;
create policy "outfit_history_delete_own"
  on public.outfit_history
  for delete
  to authenticated
  using ((select auth.uid()) = user_id);

-- ---------------------------------------------------------------------------
-- Grants (least privilege: authenticated gets CRUD only on these tables)
-- ---------------------------------------------------------------------------

grant select, insert, update, delete
  on public.profiles, public.garments, public.outfit_history
  to authenticated;
