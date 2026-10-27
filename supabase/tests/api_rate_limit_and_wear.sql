-- Integration checks for the durable quota RPC and atomic worn-outfit RPC.
begin;
select plan(5);

insert into auth.users (id, email) values
  ('41111111-1111-4111-8111-111111111111', 'rate-a@example.com'),
  ('42222222-2222-4222-8222-222222222222', 'rate-b@example.com')
on conflict (id) do nothing;

insert into public.profiles (user_id) values
  ('41111111-1111-4111-8111-111111111111'),
  ('42222222-2222-4222-8222-222222222222')
on conflict (user_id) do nothing;

insert into public.garments (garment_id, user_id, garment_type)
values
  ('a1111111-1111-4111-8111-111111111111', '41111111-1111-4111-8111-111111111111', 'top'),
  ('a2222222-2222-4222-8222-222222222222', '42222222-2222-4222-8222-222222222222', 'bottom')
on conflict (garment_id) do nothing;

set local role authenticated;
select set_config(
  'request.jwt.claim.sub',
  '41111111-1111-4111-8111-111111111111',
  true
);

select lives_ok(
  $test$
    do $body$
    declare
      limited boolean;
    begin
      for attempt in 1..30 loop
        select result.limited into limited
        from public.consume_api_rate_limit('analyze') as result;
        if limited is distinct from false then
          raise exception 'request % was limited before the configured quota', attempt;
        end if;
      end loop;
    end
    $body$;
  $test$,
  'the first thirty requests are inside the analyze quota'
);

select is(
  (select limited from public.consume_api_rate_limit('analyze')),
  true,
  'the thirty-first request exceeds the analyze quota'
);

select lives_ok(
  $$select public.record_worn_outfit(
    array['a1111111-1111-4111-8111-111111111111'::uuid],
    array['a1111111-1111-4111-8111-111111111111'::uuid],
    now()
  )$$,
  'records the outfit and updates its owned garment in one transaction'
);

select is(
  (select count(*)::integer
   from public.outfit_history
   where user_id = '41111111-1111-4111-8111-111111111111'),
  1,
  'the worn outfit is visible to its owner'
);

select throws_ok(
  $$select public.record_worn_outfit(
    array['a2222222-2222-4222-8222-222222222222'::uuid],
    array[]::uuid[],
    now()
  )$$,
  '42501',
  'One or more garments are unavailable',
  'a user cannot record another user’s garment'
);

reset role;
rollback;
