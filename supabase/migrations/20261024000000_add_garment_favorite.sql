-- Add favorite flag to garments for quick generator access
alter table public.garments
  add column if not exists is_favorite boolean not null default false;

-- Partial index: fast lookups for "my favorites" without scanning all rows
create index if not exists idx_garments_user_favorite
  on public.garments (user_id)
  where is_favorite;

-- RLS already enforced by existing policy (user_id = auth.uid())
-- No additional policy needed; the column is user-scoped by row ownership.