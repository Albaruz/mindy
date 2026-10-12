-- Bound the free-form extra_tags JSONB: it must be an object and its
-- serialized form may not exceed 4000 chars (client caps tags at 40/80
-- chars, so legitimate rows are far below). Closed columns already have
-- CHECK constraints; this closes the remaining free-form write path so a
-- crafted client cannot store oversized JSONB blobs.
--
-- Normalization first (mirrors 20261004000000): non-object values are
-- reset to '{}' so the constraint never fails on legacy rows.
--
-- Apply with: supabase db push  (or paste into the Supabase SQL editor).

update public.garments
set extra_tags = '{}'::jsonb
where extra_tags is null or jsonb_typeof(extra_tags) <> 'object';

alter table public.garments
  drop constraint if exists garments_extra_tags_shape_check;
alter table public.garments
  add constraint garments_extra_tags_shape_check
  check (
    jsonb_typeof(extra_tags) = 'object'
    and length(extra_tags::text) <= 4000
  );
