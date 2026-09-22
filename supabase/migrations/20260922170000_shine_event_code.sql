-- The team's own door: one shared code, one weekend, nothing else.
--
-- Spark is invitation only, and that is right for a workspace. It is wrong
-- for fifteen volunteers who need the run of show on their phones on a
-- Thursday. So this weekend's team guide gets a credential of its own: a code
-- that opens the team reading of one engagement, for as long as that
-- engagement is happening, and reaches nothing else in the product.
--
-- What an event session can do is exactly two things, both defined here:
-- read the team guide of its own engagement, and mark a duty of that
-- engagement done or not done. It cannot edit the calendar, see the budget,
-- reach another client, or become a Spark session. There is no path from it
-- into anything that is not on this page.
--
-- The code itself never appears in the database. The server hashes what was
-- typed and sends the hash; a row holds the hash of the real code; neither
-- side ever handles the other's plaintext.

create table if not exists public.event_access (
  engagement_id uuid primary key references public.engagements (id) on delete cascade,
  code_hash text not null,
  updated_at timestamptz not null default now()
);

create table if not exists public.event_sessions (
  token_hash text primary key,
  engagement_id uuid not null references public.engagements (id) on delete cascade,
  created_at timestamptz not null default now(),
  expires_at timestamptz not null
);

create index if not exists event_sessions_engagement on public.event_sessions (engagement_id);

create table if not exists public.event_code_attempts (
  id bigint generated always as identity primary key,
  client_hash text not null,
  engagement_id uuid,
  succeeded boolean not null,
  at timestamptz not null default now()
);

create index if not exists event_code_attempts_recent
  on public.event_code_attempts (client_hash, at desc);

/* No policies anywhere: every row here is reached through the functions
   below, which check what they are asked to check. A table nobody can select
   cannot leak a code, a live session, or who has been guessing. */
alter table public.event_access enable row level security;
alter table public.event_sessions enable row level security;
alter table public.event_code_attempts enable row level security;

revoke all on public.event_access from anon, authenticated;
revoke all on public.event_sessions from anon, authenticated;
revoke all on public.event_code_attempts from anon, authenticated;

insert into public.event_access (engagement_id, code_hash)
values ('c4c371a6-6378-4f80-9d78-f9a6359ae8db',
        '331e5f5ebf68fd8615720d980e06af87609bd9beccf4a83fbfcdbb5be24166a1')
on conflict (engagement_id) do update set code_hash = excluded.code_hash, updated_at = now();

create or replace function public.event_engagement(p_client text, p_series text, p_edition text)
returns uuid
language sql
stable
security definer
set search_path = public
as $$
  select e.id
    from public.engagements e
    join public.organizations o on o.id = e.organization_id
   where o.slug = p_client and e.series_slug = p_series and e.edition_label = p_edition
$$;

/**
 * Open a session with the weekend's code.
 *
 * Takes the hash of what someone typed, never the code. Refuses after eight
 * wrong answers from the same caller in fifteen minutes, so the four thousand
 * guesses a minute a script would like to make are not available. Returns the
 * session token once, to be handed straight to a cookie; only its hash is
 * kept, so a copy of this table opens nothing.
 */
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
  recent integer;
  token text;
begin
  engagement := public.event_engagement(p_client, p_series, p_edition);
  if engagement is null then
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
  values (encode(extensions.digest(token, 'sha256'), 'hex'), engagement,
          /* The weekend ends on the Sunday; the session ends with it. */
          timestamptz '2026-10-06 05:00:00+00');

  insert into public.event_code_attempts (client_hash, engagement_id, succeeded)
  values (p_client_hash, engagement, true);

  return token;
end;
$$;

/** Whether this token currently opens this engagement. For the route guard. */
create or replace function public.event_session_active(
  p_token_hash text,
  p_client text,
  p_series text,
  p_edition text
)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
      from public.event_sessions s
     where s.token_hash = p_token_hash
       and s.expires_at > now()
       and s.engagement_id = public.event_engagement(p_client, p_series, p_edition)
  )
$$;

/**
 * The team's reading of the weekend, for a member or for a code.
 *
 * Every field is named, as in weekend_guide(): the shape of what a code can
 * read is written down here rather than left to whatever a query happens to
 * select. Duties come back as the task that carries their completion, because
 * ticking one off is the other thing a code may do.
 */
create or replace function public.weekend_team_guide(
  p_client text,
  p_series text,
  p_edition text,
  p_token_hash text default null
)
returns jsonb
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  engagement uuid;
  by_code boolean;
begin
  engagement := public.event_engagement(p_client, p_series, p_edition);
  if engagement is null then
    return null;
  end if;

  by_code := p_token_hash is not null and exists (
    select 1 from public.event_sessions s
     where s.token_hash = p_token_hash
       and s.expires_at > now()
       and s.engagement_id = engagement
  );

  if not by_code
     and not public.is_platform_staff()
     and not exists (
       select 1 from public.workspace_members m
        where m.engagement_id = engagement
          and m.user_id = auth.uid()
          and m.role in ('planner', 'client')
     )
  then
    return null;
  end if;

  return jsonb_build_object(
    'moments', coalesce((
      select jsonb_agg(jsonb_build_object(
               'id', s.id,
               'day', s.day_key,
               'starts', s.starts_label,
               'ends', s.ends_label,
               'title', s.title,
               'location', s.location,
               'window', s.display_mode = 'background',
               'teamOnly', s.audience = 'planner',
               'guide', s.guest_guide,
               'ops', o.detail
             ) order by s.position)
        from public.schedule_items s
        left join public.schedule_item_ops o on o.schedule_item_id = s.id
       where s.engagement_id = engagement
         and s.status = 'confirmed'
    ), '[]'::jsonb),
    'duties', coalesce((
      select jsonb_agg(jsonb_build_object(
               'taskId', t.id,
               'momentId', t.schedule_item_id,
               'status', t.status))
        from public.tasks t
       where t.engagement_id = engagement
         and t.schedule_item_id is not null
         and coalesce((t.duty ->> 'fromMaster')::boolean, false)
    ), '[]'::jsonb),
    'prep', coalesce((
      select jsonb_agg(jsonb_build_object(
               'id', t.id,
               'title', t.title,
               'owner', t.owner_name,
               'status', t.status,
               'when', t.duty ->> 'when',
               'notes', t.duty ->> 'notes',
               'order', coalesce((t.duty ->> 'order')::integer, 999))
             order by coalesce((t.duty ->> 'order')::integer, 999))
        from public.tasks t
       where t.engagement_id = engagement
         and (t.duty ->> 'phase') = 'before'
    ), '[]'::jsonb),
    /* A code opens the guide. Editing the weekend stays with the planners. */
    'canEdit', not by_code and (public.is_platform_staff() or exists (
      select 1 from public.workspace_members m
       where m.engagement_id = engagement
         and m.user_id = auth.uid()
         and m.role = 'planner'
    ))
  );
end;
$$;

/**
 * Mark a duty done, as a member or as the weekend's code.
 *
 * Status only, on a duty only, in the caller's own engagement only. The code
 * is shared, so what it records is shared too: the duty is done, not that a
 * particular person did it. Choosing a name in the list is a filter, and this
 * function is never told about it.
 */
create or replace function public.set_duty_done(
  p_task uuid,
  p_done boolean,
  p_token_hash text default null
)
returns boolean
language plpgsql
security definer
set search_path = public
as $$
declare
  owner_engagement uuid;
begin
  select t.engagement_id into owner_engagement
    from public.tasks t
   where t.id = p_task
     and coalesce((t.duty ->> 'fromMaster')::boolean, false);

  if owner_engagement is null then
    return false;
  end if;

  if not (public.is_platform_staff()
          or exists (
            select 1
              from public.workspace_members m
             where m.engagement_id = owner_engagement
               and m.user_id = auth.uid()
               and m.role in ('planner', 'client')
          )
          or (p_token_hash is not null and exists (
            select 1
              from public.event_sessions s
             where s.token_hash = p_token_hash
               and s.expires_at > now()
               and s.engagement_id = owner_engagement
          ))) then
    return false;
  end if;

  update public.tasks
     set status = case when p_done then 'done' else 'todo' end
   where id = p_task;

  return true;
end;
$$;

revoke all on function public.event_engagement(text, text, text) from public, anon, authenticated;
revoke all on function public.open_event_session(text, text, text, text, text) from public;
revoke all on function public.event_session_active(text, text, text, text) from public;
revoke all on function public.weekend_team_guide(text, text, text, text) from public;
revoke all on function public.set_duty_done(uuid, boolean, text) from public;

grant execute on function public.open_event_session(text, text, text, text, text) to anon, authenticated;
grant execute on function public.event_session_active(text, text, text, text) to anon, authenticated;
grant execute on function public.weekend_team_guide(text, text, text, text) to anon, authenticated;
grant execute on function public.set_duty_done(uuid, boolean, text) to anon, authenticated;

comment on function public.open_event_session(text, text, text, text, text) is
  'Exchanges the hash of a typed event code for a session token that opens '
  'one engagement''s team guide until the weekend ends. Rate limited per '
  'caller. Never receives or stores a plaintext code.';
