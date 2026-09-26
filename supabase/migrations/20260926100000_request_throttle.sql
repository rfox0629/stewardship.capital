-- A request limiter that every server instance shares.
--
-- Anything that makes the application send an email on a stranger's behalf
-- (a sign in code, an invitation's code, a website inquiry) needs a limit, and
-- the limit has to hold across every serverless instance Vercel runs. Memory
-- in one instance is not a limit; a counter in the database is.
--
-- Fixed windows, counted atomically by an upsert. The key is a SHA-256 hash
-- computed by the application, so no email address or IP address is ever
-- stored here. Rows are only useful for the length of their window and are
-- swept after a day.
--
-- The table has row level security on and no policies, and the function is
-- executable by the service role alone, so neither anonymous nor signed in
-- callers can read the counters or spend someone else's budget directly.

create table if not exists public.request_throttle (
  bucket text not null,
  key_hash text not null,
  window_start timestamptz not null,
  hits integer not null default 0,
  primary key (bucket, key_hash, window_start)
);

alter table public.request_throttle enable row level security;
revoke all on public.request_throttle from anon, authenticated;

create or replace function public.take_request_slot(
  p_bucket text,
  p_key_hash text,
  p_limit integer,
  p_window_seconds integer
) returns boolean
language plpgsql
security definer
set search_path = public
as $$
declare
  current_window timestamptz;
  counted integer;
begin
  if p_bucket is null or length(p_bucket) = 0 or length(p_bucket) > 64
     or p_key_hash !~ '^[0-9a-f]{64}$'
     or p_limit < 1 or p_window_seconds < 1 or p_window_seconds > 86400 then
    raise exception 'take_request_slot: invalid arguments';
  end if;

  current_window := to_timestamp(
    floor(extract(epoch from now()) / p_window_seconds) * p_window_seconds
  );

  insert into public.request_throttle as t (bucket, key_hash, window_start, hits)
  values (p_bucket, p_key_hash, current_window, 1)
  on conflict (bucket, key_hash, window_start)
    do update set hits = t.hits + 1
  returning t.hits into counted;

  -- Housekeeping, a little at a time rather than on a schedule.
  if random() < 0.02 then
    delete from public.request_throttle where window_start < now() - interval '1 day';
  end if;

  return counted <= p_limit;
end;
$$;

revoke all on function public.take_request_slot(text, text, integer, integer) from public;
revoke all on function public.take_request_slot(text, text, integer, integer) from anon, authenticated;
grant execute on function public.take_request_slot(text, text, integer, integer) to service_role;
