-- Keep quota limits server-owned: authenticated callers may choose only a
-- route key, never the limit or window that the counter enforces.
-- Apply after 20261027222531_api_rate_limits_and_atomic_wear.

drop function if exists public.consume_api_rate_limit(text, integer, integer);
drop function if exists private.consume_api_rate_limit(text, integer, integer);

create function private.consume_api_rate_limit(p_key text)
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
  v_limit integer;
  v_window_ms integer;
begin
  if v_user_id is null then
    raise exception 'Authentication required' using errcode = '42501';
  end if;

  case p_key
    when 'weather' then
      v_limit := 30;
      v_window_ms := 3600000;
    when 'recommender' then
      v_limit := 5;
      v_window_ms := 60000;
    when 'analyze' then
      v_limit := 30;
      v_window_ms := 600000;
    when 'favorite' then
      v_limit := 60;
      v_window_ms := 60000;
    else
      raise exception 'Invalid rate limit key' using errcode = '22023';
  end case;

  v_window := make_interval(secs => v_window_ms::double precision / 1000);
  v_window_start := to_timestamp(
    (
      floor(extract(epoch from v_now) * 1000 / v_window_ms)
        * v_window_ms / 1000
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
      v_hits > v_limit,
      case
        when v_hits > v_limit then greatest(
          1,
          ceil(extract(epoch from (v_window_start + v_window - v_now)))::integer
        )
        else 0
      end;
end;
$$;

revoke all on function private.consume_api_rate_limit(text)
  from public, anon, authenticated, service_role;
grant execute on function private.consume_api_rate_limit(text)
  to authenticated;

create function public.consume_api_rate_limit(p_key text)
returns table (limited boolean, retry_after_sec integer)
language sql
security invoker
set search_path = ''
as $$
  select * from private.consume_api_rate_limit(p_key);
$$;

revoke all on function public.consume_api_rate_limit(text)
  from public, anon;
grant execute on function public.consume_api_rate_limit(text)
  to authenticated;
