-- Stewardship Capital MVP schema.
-- Apply with the Supabase CLI or paste into the Supabase SQL editor.

create extension if not exists pgcrypto with schema extensions;

create or replace function public.set_updated_at()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  full_name text,
  email text,
  profile_type text,
  household_name text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.assessments (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  version text not null default 'v1',
  status text not null default 'in_progress'
    check (status in ('in_progress', 'completed', 'abandoned')),
  percent_complete integer not null default 0
    check (percent_complete >= 0 and percent_complete <= 100),
  last_question_index integer not null default 0
    check (last_question_index >= 0),
  started_at timestamptz not null default now(),
  last_saved_at timestamptz not null default now(),
  completed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.assessment_responses (
  id uuid primary key default gen_random_uuid(),
  assessment_id uuid not null references public.assessments(id) on delete cascade,
  question_id text not null,
  question_index integer not null,
  pillar text not null check (pillar in ('Protect', 'Grow', 'Transfer', 'Impact')),
  answer_value text not null,
  answer_label text not null,
  score_value integer not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (assessment_id, question_id)
);

create table if not exists public.assessment_scores (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  assessment_id uuid not null references public.assessments(id) on delete cascade,
  stewardship_score integer not null check (stewardship_score >= 0 and stewardship_score <= 100),
  financial_readiness_score integer not null check (financial_readiness_score >= 0 and financial_readiness_score <= 100),
  legacy_impact_score integer not null check (legacy_impact_score >= 0 and legacy_impact_score <= 100),
  stewardship_stage text not null
    check (stewardship_stage in ('Survive', 'Stabilize', 'Build', 'Multiply', 'Legacy')),
  pillar_scores jsonb not null default '{}'::jsonb,
  top_priorities jsonb not null default '[]'::jsonb,
  confidence_labels jsonb not null default '[]'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (assessment_id)
);

create table if not exists public.roadmap_items (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  assessment_id uuid references public.assessments(id) on delete cascade,
  assessment_score_id uuid references public.assessment_scores(id) on delete set null,
  pillar text not null check (pillar in ('Protect', 'Grow', 'Transfer', 'Impact')),
  title text not null,
  description text not null,
  rank integer not null check (rank > 0),
  status text not null default 'open'
    check (status in ('open', 'in_progress', 'complete', 'locked')),
  source text not null default 'assessment_v1',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.dashboard_snapshots (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  assessment_id uuid references public.assessments(id) on delete set null,
  assessment_score_id uuid references public.assessment_scores(id) on delete set null,
  profile_completion_percent integer not null default 32
    check (profile_completion_percent >= 0 and profile_completion_percent <= 100),
  stewardship_score integer not null check (stewardship_score >= 0 and stewardship_score <= 100),
  financial_readiness_score integer not null check (financial_readiness_score >= 0 and financial_readiness_score <= 100),
  legacy_impact_score integer not null check (legacy_impact_score >= 0 and legacy_impact_score <= 100),
  stewardship_stage text not null
    check (stewardship_stage in ('Survive', 'Stabilize', 'Build', 'Multiply', 'Legacy')),
  pillar_snapshot jsonb not null default '{}'::jsonb,
  top_priorities jsonb not null default '[]'::jsonb,
  next_recommended_step jsonb not null default '{}'::jsonb,
  locked_modules jsonb not null default '[]'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (assessment_id)
);

create table if not exists public.reports (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  dashboard_snapshot_id uuid references public.dashboard_snapshots(id) on delete set null,
  report_type text not null,
  status text not null default 'locked'
    check (status in ('locked', 'pending', 'generated', 'failed')),
  generated_at timestamptz,
  file_path_or_url text,
  version text not null default 'v1',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create unique index if not exists assessments_one_in_progress_per_user_version_idx
  on public.assessments (user_id, version)
  where status = 'in_progress';
create index if not exists assessments_user_status_idx on public.assessments (user_id, status);
create index if not exists assessments_user_completed_at_idx on public.assessments (user_id, completed_at desc);
create index if not exists assessment_responses_assessment_idx on public.assessment_responses (assessment_id);
create index if not exists assessment_scores_user_created_idx on public.assessment_scores (user_id, created_at desc);
create index if not exists roadmap_items_user_rank_idx on public.roadmap_items (user_id, rank);
create index if not exists dashboard_snapshots_user_created_idx on public.dashboard_snapshots (user_id, created_at desc);
create index if not exists reports_user_created_idx on public.reports (user_id, created_at desc);

drop trigger if exists set_profiles_updated_at on public.profiles;
create trigger set_profiles_updated_at
before update on public.profiles
for each row execute function public.set_updated_at();

drop trigger if exists set_assessments_updated_at on public.assessments;
create trigger set_assessments_updated_at
before update on public.assessments
for each row execute function public.set_updated_at();

drop trigger if exists set_assessment_responses_updated_at on public.assessment_responses;
create trigger set_assessment_responses_updated_at
before update on public.assessment_responses
for each row execute function public.set_updated_at();

drop trigger if exists set_assessment_scores_updated_at on public.assessment_scores;
create trigger set_assessment_scores_updated_at
before update on public.assessment_scores
for each row execute function public.set_updated_at();

drop trigger if exists set_roadmap_items_updated_at on public.roadmap_items;
create trigger set_roadmap_items_updated_at
before update on public.roadmap_items
for each row execute function public.set_updated_at();

drop trigger if exists set_dashboard_snapshots_updated_at on public.dashboard_snapshots;
create trigger set_dashboard_snapshots_updated_at
before update on public.dashboard_snapshots
for each row execute function public.set_updated_at();

drop trigger if exists set_reports_updated_at on public.reports;
create trigger set_reports_updated_at
before update on public.reports
for each row execute function public.set_updated_at();

alter table public.profiles enable row level security;
alter table public.assessments enable row level security;
alter table public.assessment_responses enable row level security;
alter table public.assessment_scores enable row level security;
alter table public.roadmap_items enable row level security;
alter table public.dashboard_snapshots enable row level security;
alter table public.reports enable row level security;

grant usage on schema public to authenticated;
grant select, insert, update, delete on public.profiles to authenticated;
grant select, insert, update, delete on public.assessments to authenticated;
grant select, insert, update, delete on public.assessment_responses to authenticated;
grant select, insert, update, delete on public.assessment_scores to authenticated;
grant select, insert, update, delete on public.roadmap_items to authenticated;
grant select, insert, update, delete on public.dashboard_snapshots to authenticated;
grant select, insert, update, delete on public.reports to authenticated;

drop policy if exists "profiles_select_own" on public.profiles;
create policy "profiles_select_own"
on public.profiles for select
to authenticated
using ((select auth.uid()) = id);

drop policy if exists "profiles_insert_own" on public.profiles;
create policy "profiles_insert_own"
on public.profiles for insert
to authenticated
with check ((select auth.uid()) = id);

drop policy if exists "profiles_update_own" on public.profiles;
create policy "profiles_update_own"
on public.profiles for update
to authenticated
using ((select auth.uid()) = id)
with check ((select auth.uid()) = id);

drop policy if exists "profiles_delete_own" on public.profiles;
create policy "profiles_delete_own"
on public.profiles for delete
to authenticated
using ((select auth.uid()) = id);

drop policy if exists "assessments_select_own" on public.assessments;
create policy "assessments_select_own"
on public.assessments for select
to authenticated
using ((select auth.uid()) = user_id);

drop policy if exists "assessments_insert_own" on public.assessments;
create policy "assessments_insert_own"
on public.assessments for insert
to authenticated
with check ((select auth.uid()) = user_id);

drop policy if exists "assessments_update_own" on public.assessments;
create policy "assessments_update_own"
on public.assessments for update
to authenticated
using ((select auth.uid()) = user_id)
with check ((select auth.uid()) = user_id);

drop policy if exists "assessments_delete_own" on public.assessments;
create policy "assessments_delete_own"
on public.assessments for delete
to authenticated
using ((select auth.uid()) = user_id);

drop policy if exists "assessment_responses_select_own" on public.assessment_responses;
create policy "assessment_responses_select_own"
on public.assessment_responses for select
to authenticated
using (
  exists (
    select 1 from public.assessments
    where assessments.id = assessment_responses.assessment_id
      and assessments.user_id = (select auth.uid())
  )
);

drop policy if exists "assessment_responses_insert_own" on public.assessment_responses;
create policy "assessment_responses_insert_own"
on public.assessment_responses for insert
to authenticated
with check (
  exists (
    select 1 from public.assessments
    where assessments.id = assessment_responses.assessment_id
      and assessments.user_id = (select auth.uid())
  )
);

drop policy if exists "assessment_responses_update_own" on public.assessment_responses;
create policy "assessment_responses_update_own"
on public.assessment_responses for update
to authenticated
using (
  exists (
    select 1 from public.assessments
    where assessments.id = assessment_responses.assessment_id
      and assessments.user_id = (select auth.uid())
  )
)
with check (
  exists (
    select 1 from public.assessments
    where assessments.id = assessment_responses.assessment_id
      and assessments.user_id = (select auth.uid())
  )
);

drop policy if exists "assessment_responses_delete_own" on public.assessment_responses;
create policy "assessment_responses_delete_own"
on public.assessment_responses for delete
to authenticated
using (
  exists (
    select 1 from public.assessments
    where assessments.id = assessment_responses.assessment_id
      and assessments.user_id = (select auth.uid())
  )
);

drop policy if exists "assessment_scores_select_own" on public.assessment_scores;
create policy "assessment_scores_select_own"
on public.assessment_scores for select
to authenticated
using ((select auth.uid()) = user_id);

drop policy if exists "assessment_scores_insert_own" on public.assessment_scores;
create policy "assessment_scores_insert_own"
on public.assessment_scores for insert
to authenticated
with check ((select auth.uid()) = user_id);

drop policy if exists "assessment_scores_update_own" on public.assessment_scores;
create policy "assessment_scores_update_own"
on public.assessment_scores for update
to authenticated
using ((select auth.uid()) = user_id)
with check ((select auth.uid()) = user_id);

drop policy if exists "assessment_scores_delete_own" on public.assessment_scores;
create policy "assessment_scores_delete_own"
on public.assessment_scores for delete
to authenticated
using ((select auth.uid()) = user_id);

drop policy if exists "roadmap_items_select_own" on public.roadmap_items;
create policy "roadmap_items_select_own"
on public.roadmap_items for select
to authenticated
using ((select auth.uid()) = user_id);

drop policy if exists "roadmap_items_insert_own" on public.roadmap_items;
create policy "roadmap_items_insert_own"
on public.roadmap_items for insert
to authenticated
with check ((select auth.uid()) = user_id);

drop policy if exists "roadmap_items_update_own" on public.roadmap_items;
create policy "roadmap_items_update_own"
on public.roadmap_items for update
to authenticated
using ((select auth.uid()) = user_id)
with check ((select auth.uid()) = user_id);

drop policy if exists "roadmap_items_delete_own" on public.roadmap_items;
create policy "roadmap_items_delete_own"
on public.roadmap_items for delete
to authenticated
using ((select auth.uid()) = user_id);

drop policy if exists "dashboard_snapshots_select_own" on public.dashboard_snapshots;
create policy "dashboard_snapshots_select_own"
on public.dashboard_snapshots for select
to authenticated
using ((select auth.uid()) = user_id);

drop policy if exists "dashboard_snapshots_insert_own" on public.dashboard_snapshots;
create policy "dashboard_snapshots_insert_own"
on public.dashboard_snapshots for insert
to authenticated
with check ((select auth.uid()) = user_id);

drop policy if exists "dashboard_snapshots_update_own" on public.dashboard_snapshots;
create policy "dashboard_snapshots_update_own"
on public.dashboard_snapshots for update
to authenticated
using ((select auth.uid()) = user_id)
with check ((select auth.uid()) = user_id);

drop policy if exists "dashboard_snapshots_delete_own" on public.dashboard_snapshots;
create policy "dashboard_snapshots_delete_own"
on public.dashboard_snapshots for delete
to authenticated
using ((select auth.uid()) = user_id);

drop policy if exists "reports_select_own" on public.reports;
create policy "reports_select_own"
on public.reports for select
to authenticated
using ((select auth.uid()) = user_id);

drop policy if exists "reports_insert_own" on public.reports;
create policy "reports_insert_own"
on public.reports for insert
to authenticated
with check ((select auth.uid()) = user_id);

drop policy if exists "reports_update_own" on public.reports;
create policy "reports_update_own"
on public.reports for update
to authenticated
using ((select auth.uid()) = user_id)
with check ((select auth.uid()) = user_id);

drop policy if exists "reports_delete_own" on public.reports;
create policy "reports_delete_own"
on public.reports for delete
to authenticated
using ((select auth.uid()) = user_id);
