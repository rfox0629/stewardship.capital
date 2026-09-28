-- The shared request limiter, against a real Postgres.
--
-- Each line prints PASS or FAIL. Counts are measured, never inferred from the
-- absence of an error.

\set key '''aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa'''
\set other '''bbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb'''

set role service_role;

select case when array_agg(ok order by n) = array[true, true, true, false, false]
            then 'PASS' else 'FAIL' end || ' | three per window, then refused',
       array_agg(ok order by n)
  from (select n, public.take_request_slot('t:basic', :key, 3, 900) as ok
          from generate_series(1, 5) n) s;

select case when public.take_request_slot('t:basic', :other, 3, 900)
            then 'PASS' else 'FAIL' end || ' | a different key has its own budget';

select case when public.take_request_slot('t:other-bucket', :key, 3, 900)
            then 'PASS' else 'FAIL' end || ' | a different bucket has its own budget';

select case when count(*) = 0 then 'PASS' else 'FAIL' end
       || ' | nothing but hashes is stored'
  from public.request_throttle where key_hash !~ '^[0-9a-f]{64}$';

do $$ begin
  perform public.take_request_slot('t:bad', 'not-a-hash', 3, 900);
  raise notice 'FAIL | a raw value is refused as a key';
exception when others then
  raise notice 'PASS | a raw value is refused as a key';
end $$;

reset role;

-- A row from an earlier window no longer counts.
update public.request_throttle set window_start = window_start - interval '1 hour'
 where bucket = 't:basic' and key_hash = :key;
set role service_role;
select case when public.take_request_slot('t:basic', :key, 3, 900)
            then 'PASS' else 'FAIL' end || ' | the next window starts fresh';
reset role;

-- Nobody but the service role may spend budget or read the counters.
set role anon;
do $$ begin
  perform public.take_request_slot('t:anon', repeat('c', 64), 3, 900);
  raise notice 'FAIL | anon cannot call the limiter';
exception when insufficient_privilege then
  raise notice 'PASS | anon cannot call the limiter';
end $$;
do $$ declare n integer; begin
  select count(*) into n from public.request_throttle;
  raise notice 'FAIL | anon cannot read the counters (saw % rows)', n;
exception when insufficient_privilege then
  raise notice 'PASS | anon cannot read the counters';
end $$;
reset role;

set role authenticated;
do $$ begin
  perform public.take_request_slot('t:auth', repeat('c', 64), 3, 900);
  raise notice 'FAIL | a signed in user cannot call the limiter';
exception when insufficient_privilege then
  raise notice 'PASS | a signed in user cannot call the limiter';
end $$;
do $$ declare n integer; begin
  select count(*) into n from public.request_throttle;
  raise notice 'FAIL | a signed in user cannot read the counters (saw % rows)', n;
exception when insufficient_privilege then
  raise notice 'PASS | a signed in user cannot read the counters';
end $$;
reset role;
