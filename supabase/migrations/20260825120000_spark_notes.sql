-- Notes on a spark: the discussion that discernment is made of.
--
-- Additive only. One table, the same RLS lines the sparks themselves draw:
-- working members and staff read and write, guests never see them, and a
-- note always names its author from the session that wrote it.

create table if not exists public.spark_notes (
  id uuid primary key default gen_random_uuid(),
  engagement_id uuid not null references public.engagements (id) on delete cascade,
  spark_id uuid not null references public.sparks (id) on delete cascade,
  author_id uuid references auth.users (id) on delete set null,
  author_email text,
  body text not null check (char_length(body) between 1 and 1000),
  created_at timestamptz not null default now()
);

create index if not exists spark_notes_spark_idx
  on public.spark_notes (spark_id, created_at);

alter table public.spark_notes enable row level security;

drop policy if exists "spark_notes_select_working" on public.spark_notes;
create policy "spark_notes_select_working"
on public.spark_notes for select
to authenticated
using (
  public.is_platform_staff()
  or public.engagement_role(engagement_id) in ('planner', 'client')
);

drop policy if exists "spark_notes_insert_working" on public.spark_notes;
create policy "spark_notes_insert_working"
on public.spark_notes for insert
to authenticated
with check (
  (public.is_platform_staff()
    or public.engagement_role(engagement_id) in ('planner', 'client'))
  and author_id = (select auth.uid())
);

drop policy if exists "spark_notes_delete_planner" on public.spark_notes;
create policy "spark_notes_delete_planner"
on public.spark_notes for delete
to authenticated
using (public.is_platform_staff() or public.is_engagement_planner(engagement_id));

revoke all on public.spark_notes from anon;
