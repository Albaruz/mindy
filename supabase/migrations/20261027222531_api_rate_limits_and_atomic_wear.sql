-- Shared, atomic per-user API quotas and atomic outfit-wear persistence.
-- RLS is intentionally enabled without direct policies: authenticated access
-- is limited to the scoped SECURITY DEFINER rate-limit helper.

create schema if not exists private;
revoke all on schema private from public, anon, authenticated;
grant usage on schema private to authenticated;

create table if not exists private.api_rate_limit_buckets (
  user_id uuid not null references auth.users (id) on delete cascade,
  route_key text not null,
  window_start timestamptz not null,
  hit_count integer not null check (hit_count > 0),
  primary key (user_id, route_key)
);

alter table private.api_rate_limit_buckets enable row level security;
revoke all on private.api_rate_limit_buckets from public, anon, authenticated, service_role;

create or replace function private.consume_api_rate_limit(
  p_key text,
  p_limit integer,
  p_window_ms integer
)
returns table (limited boolean, retry_after_sec integer)
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_user_id uuid := (select auth.uid());
  v_now timestamptz := clock_timestamp();
  v_window_start timestamptz;
  v_window interval;
  v_hits integer;
begin
  if v_user_id is null then
    raise exception 'Authentication required' using errcode = '42501';
  end if;

  if p_key not in ('weather', 'recommender', 'analyze', 'favorite') then
    raise exception 'Invalid rate limit key' using errcode = '22023';
  end if;

  if p_limit is null or p_limit < 1 or p_limit > 1000
     or p_window_ms is null or p_window_ms < 1000
     or p_window_ms > 86400000 or p_window_ms % 1000 <> 0 then
    raise exception 'Invalid rate limit configuration' using errcode = '22023';
  end if;

  v_window := make_interval(secs => p_window_ms::double precision / 1000);
  v_window_start := to_timestamp(
    (
      floor(extract(epoch from v_now) * 1000 / p_window_ms)
        * p_window_ms / 1000
    )::double precision
  );

  insert into private.api_rate_limit_buckets as bucket (
    user_id,
    route_key,
    window_start,
    hit_count
  )
  values (v_user_id, p_key, v_window_start, 1)
  on conflict (user_id, route_key) do update
    set window_start = excluded.window_start,
        hit_count = case
          when bucket.window_start = excluded.window_start
            then bucket.hit_count + 1
          else 1
        end
  returning hit_count into v_hits;

  return query
    select
      v_hits > p_limit,
      case
        when v_hits > p_limit then greatest(
          1,
          ceil(extract(epoch from (v_window_start + v_window - v_now)))::integer
        )
        else 0
      end;
end;
$$;

revoke all on function private.consume_api_rate_limit(text, integer, integer)
  from public, anon, authenticated, service_role;
grant execute on function private.consume_api_rate_limit(text, integer, integer)
  to authenticated;

create or replace function public.consume_api_rate_limit(
  p_key text,
  p_limit integer,
  p_window_ms integer
)
returns table (limited boolean, retry_after_sec integer)
language sql
security invoker
set search_path = ''
as $$
  select * from private.consume_api_rate_limit(p_key, p_limit, p_window_ms);
$$;

revoke all on function public.consume_api_rate_limit(text, integer, integer)
  from public, anon;
grant execute on function public.consume_api_rate_limit(text, integer, integer)
  to authenticated;

-- Store an outfit and update garment wear state within one database
-- transaction. Explicit owner checks protect array-based garment references.
create or replace function public.record_worn_outfit(
  p_garment_ids uuid[],
  p_dirty_ids uuid[],
  p_worn_date timestamptz
)
returns uuid
language plpgsql
security invoker
set search_path = ''
as $$
declare
  v_user_id uuid := (select auth.uid());
  v_owned_count integer;
  v_updated_count integer;
  v_look_id uuid;
begin
  if v_user_id is null then
    raise exception 'Authentication required' using errcode = '42501';
  end if;

  if p_garment_ids is null
     or cardinality(p_garment_ids) = 0
     or cardinality(p_garment_ids) <> (
       select count(distinct ids.garment_id)
       from unnest(p_garment_ids) as ids(garment_id)
     ) then
    raise exception 'Invalid garment list' using errcode = '22023';
  end if;

  if p_dirty_ids is null
     or cardinality(p_dirty_ids) <> (
       select count(distinct ids.garment_id)
       from unnest(p_dirty_ids) as ids(garment_id)
     )
     or exists (
       select 1
       from unnest(p_dirty_ids) as dirty(garment_id)
       where not (dirty.garment_id = any (p_garment_ids))
     ) then
    raise exception 'Invalid dirty garment list' using errcode = '22023';
  end if;

  select count(*) into v_owned_count
  from public.garments as garment
  where garment.user_id = v_user_id
    and garment.garment_id = any (p_garment_ids);

  if v_owned_count <> cardinality(p_garment_ids) then
    raise exception 'One or more garments are unavailable' using errcode = '42501';
  end if;

  insert into public.outfit_history (user_id, garment_ids, worn_date)
  values (v_user_id, p_garment_ids, coalesce(p_worn_date, now()))
  returning look_id into v_look_id;

  update public.garments as garment
  set last_worn_date = coalesce(p_worn_date, now()),
      is_dirty = case
        when garment.garment_id = any (p_dirty_ids) then true
        else garment.is_dirty
      end
  where garment.user_id = v_user_id
    and garment.garment_id = any (p_garment_ids);
  get diagnostics v_updated_count = row_count;

  if v_updated_count <> cardinality(p_garment_ids) then
    raise exception 'One or more garments could not be updated' using errcode = '42501';
  end if;

  return v_look_id;
end;
$$;

revoke all on function public.record_worn_outfit(uuid[], uuid[], timestamptz)
  from public, anon;
grant execute on function public.record_worn_outfit(uuid[], uuid[], timestamptz)
  to authenticated;
