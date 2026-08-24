-- Spark tenancy, identity, and access.
--
-- Stewardship.Capital
--   -> organizations   the client. SHINE.
--     -> engagements   the workspace. Founders Weekend 2026.
--       -> workspace_members
--
-- Shine is deliberately not the workspace: an organization has many
-- engagements over time, so a second Shine gathering is a new row here rather
-- than a new shape.
--
-- Supabase Auth answers who someone is. This schema answers what they may
-- reach. Row level security is defence in depth beneath the request level
-- authorization in the application, not a replacement for it.

create extension if not exists citext;

-- ---------------------------------------------------------------- tenancy

create table if not exists public.organizations (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique,
  name text not null,
  tagline text,
  theme jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create table if not exists public.engagements (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations (id) on delete cascade,
  slug text not null,
  name text not null,
  -- Groups the annual series, so every Founders Weekend is one query without
  -- needing a table between organization and engagement.
  series_slug text,
  edition_label text,
  campaign text,
  summary text,
  status text not null default 'planning'
    check (status in ('planning', 'confirmed', 'complete')),
  starts_on date,
  ends_on date,
  location text,
  venue text,
  budget_total_cents bigint not null default 0,
  guests_expected integer not null default 0,
  theme jsonb not null default '{}'::jsonb,
  reused_from_engagement_id uuid references public.engagements (id) on delete set null,
  created_at timestamptz not null default now(),
  unique (organization_id, slug)
);

create index if not exists engagements_organization_idx
  on public.engagements (organization_id);
create index if not exists engagements_series_idx
  on public.engagements (organization_id, series_slug);

-- ------------------------------------------------------------ membership

-- planner      the Spark team running the engagement
-- client       client leadership. Submit, discuss, approve, see what is settled
-- stakeholder  guests and speakers
create table if not exists public.workspace_members (
  id uuid primary key default gen_random_uuid(),
  engagement_id uuid not null references public.engagements (id) on delete cascade,
  user_id uuid not null references auth.users (id) on delete cascade,
  role text not null check (role in ('planner', 'client', 'stakeholder')),
  created_at timestamptz not null default now(),
  unique (engagement_id, user_id)
);

create index if not exists workspace_members_user_idx
  on public.workspace_members (user_id);

-- Cross engagement visibility is an explicit grant, not a role that quietly
-- bypasses tenancy. Only these people can see the planner home, which lists
-- every client on the platform.
create table if not exists public.platform_staff (
  user_id uuid primary key references auth.users (id) on delete cascade,
  created_at timestamptz not null default now()
);

-- ------------------------------------------------------------ invitations

-- The raw token is never stored. Only a hash of it, so a database read cannot
-- produce a working invitation link.
create table if not exists public.invitations (
  id uuid primary key default gen_random_uuid(),
  engagement_id uuid not null references public.engagements (id) on delete cascade,
  email citext not null,
  role text not null check (role in ('planner', 'client', 'stakeholder')),
  token_hash text not null unique,
  expires_at timestamptz not null,
  accepted_at timestamptz,
  accepted_by uuid references auth.users (id) on delete set null,
  revoked_at timestamptz,
  created_by uuid references auth.users (id) on delete set null,
  created_at timestamptz not null default now()
);

create index if not exists invitations_engagement_idx
  on public.invitations (engagement_id);
create index if not exists invitations_email_idx
  on public.invitations (email);

-- ------------------------------------------------------------- helpers

-- Security definer so a policy on workspace_members can ask about
-- workspace_members without recursing through its own policy. search_path is
-- pinned empty so the function cannot be captured by a shadowing schema.

create or replace function public.is_platform_staff()
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1 from public.platform_staff s
    where s.user_id = (select auth.uid())
  );
$$;

create or replace function public.engagement_role(target uuid)
returns text
language sql
stable
security definer
set search_path = ''
as $$
  select m.role
  from public.workspace_members m
  where m.engagement_id = target
    and m.user_id = (select auth.uid())
  limit 1;
$$;

create or replace function public.is_engagement_member(target uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select public.engagement_role(target) is not null;
$$;

create or replace function public.is_engagement_planner(target uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select public.engagement_role(target) = 'planner';
$$;

revoke all on function public.is_platform_staff() from public;
revoke all on function public.engagement_role(uuid) from public;
revoke all on function public.is_engagement_member(uuid) from public;
revoke all on function public.is_engagement_planner(uuid) from public;

grant execute on function public.is_platform_staff() to authenticated;
grant execute on function public.engagement_role(uuid) to authenticated;
grant execute on function public.is_engagement_member(uuid) to authenticated;
grant execute on function public.is_engagement_planner(uuid) to authenticated;

-- -------------------------------------------------------- row level security

alter table public.organizations enable row level security;
alter table public.engagements enable row level security;
alter table public.workspace_members enable row level security;
alter table public.platform_staff enable row level security;
alter table public.invitations enable row level security;

-- Organizations: visible only to platform staff, or to someone who belongs to
-- one of that organization's engagements.
create policy "organizations_select_member_or_staff"
on public.organizations for select
to authenticated
using (
  public.is_platform_staff()
  or exists (
    select 1
    from public.engagements e
    where e.organization_id = organizations.id
      and public.is_engagement_member(e.id)
  )
);

-- Engagements: your own, or all of them if you are platform staff.
create policy "engagements_select_member_or_staff"
on public.engagements for select
to authenticated
using (public.is_platform_staff() or public.is_engagement_member(id));

-- Membership: your own row, plus the roster if you run the engagement.
create policy "workspace_members_select_self_or_planner"
on public.workspace_members for select
to authenticated
using (
  user_id = (select auth.uid())
  or public.is_platform_staff()
  or public.is_engagement_planner(engagement_id)
);

create policy "workspace_members_write_planner"
on public.workspace_members for all
to authenticated
using (public.is_platform_staff() or public.is_engagement_planner(engagement_id))
with check (public.is_platform_staff() or public.is_engagement_planner(engagement_id));

-- Platform staff: you may see that you are staff. Nobody grants it from the
-- client; that is a service role operation.
create policy "platform_staff_select_self"
on public.platform_staff for select
to authenticated
using (user_id = (select auth.uid()));

-- Invitations: never readable by the invited person before acceptance, which
-- is what keeps the token unguessable and the list unenumerable. Redemption
-- happens server side with the service role.
create policy "invitations_select_planner_or_staff"
on public.invitations for select
to authenticated
using (public.is_platform_staff() or public.is_engagement_planner(engagement_id));

create policy "invitations_write_planner_or_staff"
on public.invitations for all
to authenticated
using (public.is_platform_staff() or public.is_engagement_planner(engagement_id))
with check (public.is_platform_staff() or public.is_engagement_planner(engagement_id));
