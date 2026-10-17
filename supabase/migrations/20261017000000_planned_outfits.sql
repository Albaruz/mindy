-- Planned outfits are future calendar entries, distinct from outfits already worn.
alter table public.outfit_history
  add column if not exists is_planned boolean not null default false,
  add column if not exists planned_date date;

-- Existing worn entries keep planned_date = NULL, so this unique index only
-- enforces one replaceable planned outfit per user and calendar date.
create unique index if not exists outfit_history_user_planned_date_idx
  on public.outfit_history (user_id, planned_date);
