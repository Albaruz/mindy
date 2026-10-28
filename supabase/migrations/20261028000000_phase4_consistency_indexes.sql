-- Enforce the planned-outfit shape and keep its upsert arbiter compact.
-- The production dataset was checked before adding this constraint: there are
-- no rows where is_planned disagrees with planned_date presence.
alter table public.outfit_history
  add constraint outfit_history_planned_date_consistency_check
  check (is_planned = (planned_date is not null))
  not valid;

alter table public.outfit_history
  validate constraint outfit_history_planned_date_consistency_check;

create index if not exists garment_feedback_garment_id_idx
  on public.garment_feedback (garment_id);

-- Only planned rows participate in the replaceable (user, date) uniqueness
-- rule. The RPC includes the matching predicate in its conflict target.
drop index if exists public.outfit_history_user_planned_date_idx;
create unique index outfit_history_user_planned_date_idx
  on public.outfit_history (user_id, planned_date)
  where is_planned;

create or replace function public.record_planned_outfit(
  p_garment_ids uuid[],
  p_worn_date timestamptz,
  p_planned_date date
)
returns uuid
language plpgsql
security invoker
set search_path = ''
as $$
declare
  v_user_id uuid := (select auth.uid());
  v_owned_count integer;
  v_look_id uuid;
begin
  if v_user_id is null then
    raise exception 'Authentication required' using errcode = '42501';
  end if;

  if p_planned_date is null
     or p_garment_ids is null
     or cardinality(p_garment_ids) = 0
     or cardinality(p_garment_ids) <> (
       select count(distinct ids.garment_id)
       from unnest(p_garment_ids) as ids(garment_id)
     ) then
    raise exception 'Invalid planned outfit' using errcode = '22023';
  end if;

  select count(*) into v_owned_count
  from public.garments as garment
  where garment.user_id = v_user_id
    and garment.garment_id = any (p_garment_ids);

  if v_owned_count <> cardinality(p_garment_ids) then
    raise exception 'One or more garments are unavailable' using errcode = '42501';
  end if;

  insert into public.outfit_history (
    user_id,
    garment_ids,
    worn_date,
    is_planned,
    planned_date
  )
  values (
    v_user_id,
    p_garment_ids,
    coalesce(p_worn_date, now()),
    true,
    p_planned_date
  )
  on conflict (user_id, planned_date) where is_planned
  do update set
    garment_ids = excluded.garment_ids,
    worn_date = excluded.worn_date
  returning look_id into v_look_id;

  return v_look_id;
end;
$$;

revoke all on function public.record_planned_outfit(uuid[], timestamptz, date)
  from public, anon;
grant execute on function public.record_planned_outfit(uuid[], timestamptz, date)
  to authenticated;
