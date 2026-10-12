-- Negative feedback for the recommender: garments the user dismissed
-- with "change garment", so future suggestions avoid similar combinations.
-- Apply with: supabase db push (or paste into the Supabase SQL editor).

create table if not exists public.garment_feedback (
  feedback_id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles (user_id) on delete cascade,
  garment_id uuid not null references public.garments (garment_id) on delete cascade,
  signal text not null check (signal in ('dismissed')),
  created_at timestamptz not null default now()
);

create index if not exists garment_feedback_user_id_idx
  on public.garment_feedback (user_id);

alter table public.garment_feedback enable row level security;

drop policy if exists "garment_feedback_select_own" on public.garment_feedback;
create policy "garment_feedback_select_own"
  on public.garment_feedback
  for select
  to authenticated
  using ((select auth.uid()) = user_id);

drop policy if exists "garment_feedback_insert_own" on public.garment_feedback;
create policy "garment_feedback_insert_own"
  on public.garment_feedback
  for insert
  to authenticated
  with check ((select auth.uid()) = user_id);

drop policy if exists "garment_feedback_delete_own" on public.garment_feedback;
create policy "garment_feedback_delete_own"
  on public.garment_feedback
  for delete
  to authenticated
  using ((select auth.uid()) = user_id);

grant select, insert, delete
  on public.garment_feedback
  to authenticated;
