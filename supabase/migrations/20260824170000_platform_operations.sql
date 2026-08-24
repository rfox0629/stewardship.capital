-- What operating Spark requires, as narrow grants rather than a service role.
--
-- The staff surface at /spark/platform runs under the signed in person's own
-- session. Everything it may do is either an RLS policy scoped to explicit
-- platform staff, or a security definer function that checks the same grant
-- itself. Nothing here widens what a planner, client, or stakeholder can do.

-- ------------------------------------------------ staff writes on tenancy
--
-- Organizations and engagements had no authenticated write path at all:
-- correct while every change was an operator at a terminal, and exactly what
-- the staff page now needs opened, for staff alone.

drop policy if exists "organizations_insert_staff" on public.organizations;
create policy "organizations_insert_staff"
on public.organizations for insert
to authenticated
with check (public.is_platform_staff());

drop policy if exists "organizations_update_staff" on public.organizations;
create policy "organizations_update_staff"
on public.organizations for update
to authenticated
using (public.is_platform_staff())
with check (public.is_platform_staff());

drop policy if exists "engagements_insert_staff" on public.engagements;
create policy "engagements_insert_staff"
on public.engagements for insert
to authenticated
with check (public.is_platform_staff());

drop policy if exists "engagements_update_staff" on public.engagements;
create policy "engagements_update_staff"
on public.engagements for update
to authenticated
using (public.is_platform_staff())
with check (public.is_platform_staff());

-- --------------------------------------------------------------- roster
--
-- The roster needs addresses, and addresses live in auth.users, which no
-- policy exposes. This is the one sanctioned window: engagement scoped,
-- readable only by that engagement's planner or by staff, and returning
-- nothing at all to anyone else.

create or replace function public.engagement_roster(target uuid)
returns table (user_id uuid, email text, role text, since timestamptz)
language sql
stable
security definer
set search_path = ''
as $$
  select m.user_id, u.email::text, m.role, m.created_at
  from public.workspace_members m
  join auth.users u on u.id = m.user_id
  where m.engagement_id = target
    and (public.is_platform_staff() or public.is_engagement_planner(target))
  order by m.created_at;
$$;

revoke all on function public.engagement_roster(uuid) from public;
grant execute on function public.engagement_roster(uuid) to authenticated;

-- --------------------------------------------------------- staff grants
--
-- Making someone platform staff is the one grant that crosses every client,
-- so it stays out of the tables' own policies entirely: only existing staff
-- may extend it, the subject must already be a verified identity, and the
-- answer never reveals whether an address has an account.

create or replace function public.grant_platform_staff(p_email text)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_subject uuid;
begin
  if not public.is_platform_staff() then
    return jsonb_build_object('ok', false, 'reason', 'refused');
  end if;

  select u.id into v_subject
  from auth.users u
  where lower(u.email) = lower(trim(p_email))
  limit 1;

  if v_subject is null then
    return jsonb_build_object('ok', false, 'reason', 'refused');
  end if;

  insert into public.platform_staff (user_id)
  values (v_subject)
  on conflict (user_id) do nothing;

  return jsonb_build_object('ok', true);
end;
$$;

revoke all on function public.grant_platform_staff(text) from public;
grant execute on function public.grant_platform_staff(text) to authenticated;

-- ---------------------------------------------------------- audit trail
--
-- Every membership change, written by a trigger so it cannot be forgotten:
-- the application cannot add a membership path that skips the record. The
-- actor is whoever the session belonged to; a change made by the service
-- role, for example accepting an invitation is not one, records no actor.

create table if not exists public.membership_events (
  id uuid primary key default gen_random_uuid(),
  -- The trail lives as long as the engagement does. Deleting an engagement,
  -- which real operations never do but test teardown always does, takes its
  -- trail with it rather than leaving orphaned rows forever.
  engagement_id uuid not null references public.engagements (id) on delete cascade,
  subject_user_id uuid not null,
  actor_user_id uuid,
  action text not null check (action in ('added', 'role_changed', 'removed')),
  from_role text,
  to_role text,
  at timestamptz not null default now()
);

create index if not exists membership_events_engagement_idx
  on public.membership_events (engagement_id, at desc);

alter table public.membership_events enable row level security;

-- Readable by the people who could have made the change; writable by nobody
-- directly. The trigger function is the only writer.
drop policy if exists "membership_events_select_planner_or_staff" on public.membership_events;
create policy "membership_events_select_planner_or_staff"
on public.membership_events for select
to authenticated
using (public.is_platform_staff() or public.is_engagement_planner(engagement_id));

revoke insert, update, delete on public.membership_events from authenticated;
revoke all on public.membership_events from anon;

create or replace function public.log_membership_event()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if tg_op = 'INSERT' then
    insert into public.membership_events
      (engagement_id, subject_user_id, actor_user_id, action, to_role)
    values (new.engagement_id, new.user_id, auth.uid(), 'added', new.role);
    return new;
  elsif tg_op = 'UPDATE' then
    if new.role is distinct from old.role then
      insert into public.membership_events
        (engagement_id, subject_user_id, actor_user_id, action, from_role, to_role)
      values (new.engagement_id, new.user_id, auth.uid(), 'role_changed', old.role, new.role);
    end if;
    return new;
  else
    -- A membership can vanish because someone was removed, or because the
    -- whole engagement is being deleted and the cascade is sweeping its
    -- members. Only the former is an access change worth recording; in the
    -- latter the engagement row is already gone and the trail goes with it.
    if exists (select 1 from public.engagements e where e.id = old.engagement_id) then
      insert into public.membership_events
        (engagement_id, subject_user_id, actor_user_id, action, from_role)
      values (old.engagement_id, old.user_id, auth.uid(), 'removed', old.role);
    end if;
    return old;
  end if;
end;
$$;

drop trigger if exists workspace_members_audit on public.workspace_members;
create trigger workspace_members_audit
after insert or update or delete on public.workspace_members
for each row execute function public.log_membership_event();

-- The trail, readable with addresses. Same window discipline as the roster:
-- engagement scoped, planner or staff only, empty for everyone else.
create or replace function public.membership_trail(target uuid, take integer default 8)
returns table (at timestamptz, action text, subject_email text, actor_email text, from_role text, to_role text)
language sql
stable
security definer
set search_path = ''
as $$
  select e.at, e.action, su.email::text, au.email::text, e.from_role, e.to_role
  from public.membership_events e
  left join auth.users su on su.id = e.subject_user_id
  left join auth.users au on au.id = e.actor_user_id
  where e.engagement_id = target
    and (public.is_platform_staff() or public.is_engagement_planner(target))
  order by e.at desc
  limit greatest(1, least(take, 50));
$$;

revoke all on function public.membership_trail(uuid, integer) from public;
grant execute on function public.membership_trail(uuid, integer) to authenticated;
