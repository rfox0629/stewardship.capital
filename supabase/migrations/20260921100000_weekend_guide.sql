-- One calendar, read two ways.
--
-- A guest opening the weekend on their phone and a volunteer checking what
-- they are doing after lunch are looking at the same schedule. Nothing here
-- adds a second one. It adds what each reader needs on top of the rows that
-- already exist, and it keeps the two kinds of detail physically apart so the
-- public reading can never carry the private one.
--
--   schedule_items.guest_guide   what a guest may read about a moment: a
--                                menu, a short line, what tapping it opens.
--                                Public by definition. Nothing internal goes
--                                in here, ever.
--
--   schedule_item_ops            what the team needs to run the moment: who
--                                owns it, who supports, what to set up, the
--                                next cue, internal notes. Its own table with
--                                its own row level security, working members
--                                only, so a guest session cannot select it
--                                even by asking the API directly. A column on
--                                schedule_items could not promise that: RLS
--                                chooses rows, not columns.
--
--   tasks.duty                   the shape of a volunteer duty: which day or
--                                phase, the timing window in the words the
--                                tracker used ("After lunch"), notes. Duties
--                                are tasks, so the existing completion control
--                                and its planner only write policy still hold.
--
--   weekend_guide()              the only way a guest reads anything. It runs
--                                as its owner so it works without a session,
--                                it refuses unless the engagement has chosen
--                                to publish a guide, and it names every column
--                                it returns. Public, confirmed, Thursday to
--                                Sunday only: no Wednesday, no drafts, no team
--                                rows, no notes, no owners.
--
-- Everything is additive. The one policy change narrows what a stakeholder
-- session can read to public moments, which is what a guest was always meant
-- to see.

-- ------------------------------------------------------------ guest detail

alter table public.schedule_items
  add column if not exists guest_guide jsonb;

comment on column public.schedule_items.guest_guide is
  'What a guest may read about this moment, and nothing else: an optional '
  'guest facing title, a short line, a menu, and what tapping it opens '
  '(activities, coffee). Public by definition and returned by weekend_guide(). '
  'Operational detail belongs in schedule_item_ops, never here.';

-- ------------------------------------------------------------- team detail

create table if not exists public.schedule_item_ops (
  schedule_item_id uuid primary key references public.schedule_items(id) on delete cascade,
  engagement_id uuid not null references public.engagements(id) on delete cascade,
  detail jsonb not null default '{}'::jsonb,
  updated_at timestamptz not null default now()
);

comment on table public.schedule_item_ops is
  'How the team runs a moment: owner, emcee, support, location detail, '
  'materials and setup, the next cue, internal notes. One row per moment at '
  'most, removed with it. Working members read it; planners write it. Kept '
  'out of schedule_items so that no public or guest reading can include it.';

alter table public.schedule_item_ops enable row level security;

do $$
begin
  if not exists (select 1 from pg_policies
                  where tablename = 'schedule_item_ops'
                    and policyname = 'schedule_item_ops_select_working_members') then
    create policy schedule_item_ops_select_working_members on public.schedule_item_ops
      for select using (
        public.is_platform_staff()
        or public.engagement_role(engagement_id) = any (array['planner', 'client'])
      );
  end if;

  if not exists (select 1 from pg_policies
                  where tablename = 'schedule_item_ops'
                    and policyname = 'schedule_item_ops_write_planner') then
    create policy schedule_item_ops_write_planner on public.schedule_item_ops
      for all using (
        public.is_platform_staff() or public.is_engagement_planner(engagement_id)
      ) with check (
        public.is_platform_staff() or public.is_engagement_planner(engagement_id)
      );
  end if;
end $$;

grant select, insert, update, delete on public.schedule_item_ops to authenticated;

-- ------------------------------------------------------------------ duties

alter table public.tasks
  add column if not exists duty jsonb;

comment on column public.tasks.duty is
  'When a task is a volunteer duty: its phase (before, wed..sun, tbd), the '
  'timing window in the tracker''s own words, and notes. Timing windows are '
  'kept as written rather than converted into invented clock times.';

-- ---------------------------------------------- guests read public moments

/* A stakeholder is a guest with an account. They were already held to
   confirmed moments; they are now also held to public ones, so a team only
   setup block is never in a guest session's reach. */
drop policy if exists schedule_items_select_members on public.schedule_items;

create policy schedule_items_select_members on public.schedule_items
  for select using (
    public.is_platform_staff()
    or public.engagement_role(engagement_id) = any (array['planner', 'client'])
    or (
      public.engagement_role(engagement_id) = 'stakeholder'
      and status = 'confirmed'
      and audience = 'everyone'
    )
  );

-- --------------------------------------------------------- the public read

/* Whether a guide may be shown to someone who is not a member. Used by the
   route guard so an unpublished engagement stays exactly as closed as it was. */
create or replace function public.weekend_guide_published(
  p_client text, p_series text, p_edition text
) returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select coalesce((
    select (e.reference -> 'guide' ->> 'public') = 'true'
      from public.engagements e
      join public.organizations o on o.id = e.organization_id
     where o.slug = p_client
       and e.series_slug = p_series
       and e.edition_label = p_edition
  ), false);
$$;

create or replace function public.weekend_guide(
  p_client text, p_series text, p_edition text
) returns jsonb
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  eng record;
begin
  select e.id, e.name, e.starts_on, e.ends_on, e.location, e.venue,
         e.theme, e.reference, o.name as organization_name, o.theme as organization_theme
    into eng
    from public.engagements e
    join public.organizations o on o.id = e.organization_id
   where o.slug = p_client
     and e.series_slug = p_series
     and e.edition_label = p_edition;

  if eng.id is null then
    return null;
  end if;

  /* Published, or read by someone who already belongs to the engagement:
     members can see the guide before it goes out. */
  if not (
    coalesce((eng.reference -> 'guide' ->> 'public') = 'true', false)
    or public.is_engagement_member(eng.id)
    or public.is_platform_staff()
  ) then
    return null;
  end if;

  return jsonb_build_object(
    'name', eng.name,
    'organization', eng.organization_name,
    'startsOn', eng.starts_on,
    'endsOn', eng.ends_on,
    'location', eng.location,
    'venue', eng.venue,
    'theme', eng.theme,
    'organizationTheme', jsonb_build_object('images',
      jsonb_build_object('organizationLogo', eng.organization_theme -> 'images' -> 'organizationLogo')),
    'activities', coalesce(eng.reference -> 'guide' -> 'activities', '[]'::jsonb),
    'coffee', coalesce(eng.reference -> 'guide' -> 'coffee', '[]'::jsonb),
    'published', coalesce((eng.reference -> 'guide' ->> 'public') = 'true', false),
    /* Every column named. Nothing here can grow a field by accident. */
    'moments', coalesce((
      select jsonb_agg(jsonb_build_object(
               'id', s.id,
               'day', s.day_key,
               'starts', s.starts_label,
               'ends', s.ends_label,
               'daypart', s.daypart,
               'title', s.title,
               'location', s.location,
               'window', s.display_mode = 'background',
               'guide', s.guest_guide
             ))
        from public.schedule_items s
       where s.engagement_id = eng.id
         and s.status = 'confirmed'
         and s.audience = 'everyone'
         and s.day_key in ('thu', 'fri', 'sat', 'sun')
    ), '[]'::jsonb)
  );
end;
$$;

revoke all on function public.weekend_guide(text, text, text) from public;
revoke all on function public.weekend_guide_published(text, text, text) from public;
grant execute on function public.weekend_guide(text, text, text) to anon, authenticated;
grant execute on function public.weekend_guide_published(text, text, text) to anon, authenticated;

comment on function public.weekend_guide(text, text, text) is
  'The guest reading of one engagement''s weekend. Refuses unless the '
  'engagement publishes a guide (reference.guide.public) or the caller is a '
  'member. Returns public, confirmed, Thursday to Sunday moments with named '
  'guest safe fields only, and the guide''s activities and coffee menu.';
