-- The weekend's code ends with the weekend it belongs to, whichever weekend.
--
-- open_event_session() wrote one fixed instant, the Tuesday after Founders
-- Weekend 2026, into every session it made. That was right for one weekend
-- and wrong for every other: a session opened for a later edition would have
-- expired before it began, and a code presented after the fixed date was
-- still answered with a token that opened nothing.
--
-- The end of a session is now read from the engagement itself: the close of
-- the day after it ends, Central time, which is 05:00 UTC two days after
-- ends_on. For Founders Weekend 2026 that is the same instant as before. An
-- engagement with no end date gets a week from now, so a code cannot be
-- turned into a credential that never lapses by leaving the date blank.
--
-- Once the window has passed, the code is refused outright rather than
-- answered with a dead token, and the refusal is not counted as a wrong
-- guess: nobody should be locked out of nothing.

/** When the team session for this engagement stops working. */
create or replace function public.event_session_window(
  p_client text,
  p_series text,
  p_edition text
)
returns timestamptz
language sql
stable
security definer
set search_path = public
as $$
  select case
           when e.ends_on is null then now() + interval '7 days'
           else (e.ends_on + 2)::timestamp at time zone 'UTC' + interval '5 hours'
         end
    from public.engagements e
   where e.id = public.event_engagement(p_client, p_series, p_edition)
$$;

create or replace function public.open_event_session(
  p_client text,
  p_series text,
  p_edition text,
  p_code_hash text,
  p_client_hash text
)
returns text
language plpgsql
security definer
set search_path = public
as $$
declare
  engagement uuid;
  window_end timestamptz;
  recent integer;
  token text;
begin
  engagement := public.event_engagement(p_client, p_series, p_edition);
  if engagement is null then
    return null;
  end if;

  /* The weekend is over: the code opens nothing, and trying is not guessing. */
  window_end := public.event_session_window(p_client, p_series, p_edition);
  if window_end is null or window_end <= now() then
    return null;
  end if;

  select count(*) into recent
    from public.event_code_attempts a
   where a.client_hash = p_client_hash
     and a.succeeded = false
     and a.at > now() - interval '15 minutes';

  if recent >= 8 then
    return null;
  end if;

  if not exists (
    select 1 from public.event_access x
     where x.engagement_id = engagement and x.code_hash = p_code_hash
  ) then
    insert into public.event_code_attempts (client_hash, engagement_id, succeeded)
    values (p_client_hash, engagement, false);
    return null;
  end if;

  token := encode(extensions.gen_random_bytes(32), 'hex');

  insert into public.event_sessions (token_hash, engagement_id, expires_at)
  values (encode(extensions.digest(token, 'sha256'), 'hex'), engagement, window_end);

  insert into public.event_code_attempts (client_hash, engagement_id, succeeded)
  values (p_client_hash, engagement, true);

  return token;
end;
$$;

revoke all on function public.event_session_window(text, text, text) from public;
grant execute on function public.event_session_window(text, text, text) to anon, authenticated;

comment on function public.event_session_window(text, text, text) is
  'The instant a team code session for this engagement stops working: the '
  'close of the day after ends_on, Central time. Public, because the dates '
  'of the weekend are printed on the card.';
