-- The Spark domain.
--
-- Capture freely. Discern carefully. Move intentionally.
--
-- A spark is an idea, not an approval. Ideas are easy to write down and cost
-- nothing. Only after approval does a spark become operational and create the
-- records below, each of which keeps a link back to the spark that caused it.
--
-- That separation is enforced here, not just in the interface: a client may
-- raise and discuss sparks, but only a planner may write the operational
-- tables. Changes stay proposed until a planner confirms them.

-- ---------------------------------------------------------------- sparks

create table if not exists public.sparks (
  id uuid primary key default gen_random_uuid(),
  engagement_id uuid not null references public.engagements (id) on delete cascade,
  title text not null,
  detail text,
  category text not null,
  status text not null default 'captured'
    check (status in ('captured', 'discussing', 'approved', 'parked', 'declined')),
  raised_by uuid references auth.users (id) on delete set null,
  raised_by_name text,
  decision text,
  decided_at timestamptz,
  decided_by uuid references auth.users (id) on delete set null,
  created_at timestamptz not null default now()
);

create index if not exists sparks_engagement_status_idx
  on public.sparks (engagement_id, status);

-- ------------------------------------------------- approved operational records

create table if not exists public.schedule_items (
  id uuid primary key default gen_random_uuid(),
  engagement_id uuid not null references public.engagements (id) on delete cascade,
  spark_id uuid references public.sparks (id) on delete set null,
  day_key text not null,
  starts_label text not null,
  ends_label text,
  title text not null,
  track text not null,
  location text,
  owner_id uuid references auth.users (id) on delete set null,
  owner_name text,
  status text not null default 'draft' check (status in ('draft', 'confirmed')),
  note text,
  position integer not null default 0,
  created_at timestamptz not null default now()
);

create index if not exists schedule_items_engagement_day_idx
  on public.schedule_items (engagement_id, day_key, position);

create table if not exists public.budget_lines (
  id uuid primary key default gen_random_uuid(),
  engagement_id uuid not null references public.engagements (id) on delete cascade,
  spark_id uuid references public.sparks (id) on delete set null,
  category text not null,
  label text not null,
  planned_cents bigint not null default 0,
  committed_cents bigint not null default 0,
  actual_cents bigint not null default 0,
  owner_id uuid references auth.users (id) on delete set null,
  owner_name text,
  created_at timestamptz not null default now()
);

create index if not exists budget_lines_engagement_idx
  on public.budget_lines (engagement_id, category);

create table if not exists public.tasks (
  id uuid primary key default gen_random_uuid(),
  engagement_id uuid not null references public.engagements (id) on delete cascade,
  spark_id uuid references public.sparks (id) on delete set null,
  title text not null,
  owner_id uuid references auth.users (id) on delete set null,
  owner_name text,
  due_on date,
  status text not null default 'todo'
    check (status in ('todo', 'doing', 'blocked', 'done')),
  area text,
  created_at timestamptz not null default now()
);

create index if not exists tasks_engagement_status_idx
  on public.tasks (engagement_id, status);

create table if not exists public.resources (
  id uuid primary key default gen_random_uuid(),
  engagement_id uuid not null references public.engagements (id) on delete cascade,
  spark_id uuid references public.sparks (id) on delete set null,
  kind text not null check (kind in ('vendor', 'supply')),
  name text not null,
  detail text,
  quantity text,
  owner_id uuid references auth.users (id) on delete set null,
  owner_name text,
  status text not null default 'needed'
    check (status in ('confirmed', 'holding', 'needed')),
  created_at timestamptz not null default now()
);

create index if not exists resources_engagement_idx
  on public.resources (engagement_id, kind);

create table if not exists public.run_of_show_cues (
  id uuid primary key default gen_random_uuid(),
  engagement_id uuid not null references public.engagements (id) on delete cascade,
  schedule_item_id uuid not null references public.schedule_items (id) on delete cascade,
  spark_id uuid references public.sparks (id) on delete set null,
  at_label text not null,
  cue text not null,
  who_id uuid references auth.users (id) on delete set null,
  who_name text,
  position integer not null default 0,
  created_at timestamptz not null default now()
);

create index if not exists run_of_show_cues_item_idx
  on public.run_of_show_cues (schedule_item_id, position);

create table if not exists public.decisions (
  id uuid primary key default gen_random_uuid(),
  engagement_id uuid not null references public.engagements (id) on delete cascade,
  spark_id uuid references public.sparks (id) on delete set null,
  question text not null,
  context text,
  owner_id uuid references auth.users (id) on delete set null,
  owner_name text,
  status text not null default 'open'
    check (status in ('open', 'decided', 'deferred')),
  outcome text,
  needs_by date,
  created_at timestamptz not null default now()
);

create index if not exists decisions_engagement_status_idx
  on public.decisions (engagement_id, status);

-- -------------------------------------------------------- row level security

alter table public.sparks enable row level security;
alter table public.schedule_items enable row level security;
alter table public.budget_lines enable row level security;
alter table public.tasks enable row level security;
alter table public.resources enable row level security;
alter table public.run_of_show_cues enable row level security;
alter table public.decisions enable row level security;

-- Sparks: the client team takes part. Guests do not.
create policy "sparks_select_working_members"
on public.sparks for select
to authenticated
using (
  public.is_platform_staff()
  or public.engagement_role(engagement_id) in ('planner', 'client')
);

-- A client may raise an idea. Ideas cost nothing and are meant to be easy.
create policy "sparks_insert_working_members"
on public.sparks for insert
to authenticated
with check (
  public.is_platform_staff()
  or public.engagement_role(engagement_id) in ('planner', 'client')
);

-- Deciding is not the same as raising. Only a planner writes the decision.
create policy "sparks_update_planner"
on public.sparks for update
to authenticated
using (public.is_platform_staff() or public.is_engagement_planner(engagement_id))
with check (public.is_platform_staff() or public.is_engagement_planner(engagement_id));

create policy "sparks_delete_planner"
on public.sparks for delete
to authenticated
using (public.is_platform_staff() or public.is_engagement_planner(engagement_id));

-- The schedule is what everyone came for, so every member may read it. Guests
-- see confirmed items only; nothing still being worked out.
create policy "schedule_items_select_members"
on public.schedule_items for select
to authenticated
using (
  public.is_platform_staff()
  or public.engagement_role(engagement_id) in ('planner', 'client')
  or (
    public.engagement_role(engagement_id) = 'stakeholder'
    and status = 'confirmed'
  )
);

create policy "schedule_items_write_planner"
on public.schedule_items for all
to authenticated
using (public.is_platform_staff() or public.is_engagement_planner(engagement_id))
with check (public.is_platform_staff() or public.is_engagement_planner(engagement_id));

create policy "budget_lines_select_working_members"
on public.budget_lines for select
to authenticated
using (
  public.is_platform_staff()
  or public.engagement_role(engagement_id) in ('planner', 'client')
);

create policy "budget_lines_write_planner"
on public.budget_lines for all
to authenticated
using (public.is_platform_staff() or public.is_engagement_planner(engagement_id))
with check (public.is_platform_staff() or public.is_engagement_planner(engagement_id));

create policy "tasks_select_working_members"
on public.tasks for select
to authenticated
using (
  public.is_platform_staff()
  or public.engagement_role(engagement_id) in ('planner', 'client')
);

create policy "tasks_write_planner"
on public.tasks for all
to authenticated
using (public.is_platform_staff() or public.is_engagement_planner(engagement_id))
with check (public.is_platform_staff() or public.is_engagement_planner(engagement_id));

create policy "resources_select_working_members"
on public.resources for select
to authenticated
using (
  public.is_platform_staff()
  or public.engagement_role(engagement_id) in ('planner', 'client')
);

create policy "resources_write_planner"
on public.resources for all
to authenticated
using (public.is_platform_staff() or public.is_engagement_planner(engagement_id))
with check (public.is_platform_staff() or public.is_engagement_planner(engagement_id));

-- The run of show is internal working detail. Planners only.
create policy "run_of_show_cues_select_planner"
on public.run_of_show_cues for select
to authenticated
using (public.is_platform_staff() or public.is_engagement_planner(engagement_id));

create policy "run_of_show_cues_write_planner"
on public.run_of_show_cues for all
to authenticated
using (public.is_platform_staff() or public.is_engagement_planner(engagement_id))
with check (public.is_platform_staff() or public.is_engagement_planner(engagement_id));

create policy "decisions_select_working_members"
on public.decisions for select
to authenticated
using (
  public.is_platform_staff()
  or public.engagement_role(engagement_id) in ('planner', 'client')
);

create policy "decisions_write_planner"
on public.decisions for all
to authenticated
using (public.is_platform_staff() or public.is_engagement_planner(engagement_id))
with check (public.is_platform_staff() or public.is_engagement_planner(engagement_id));
