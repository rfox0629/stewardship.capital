-- The simplified plan model, additively.
--
-- Spark, then discern, then either into the plan or at rest. The plan is
-- three kinds of record: something happens (schedule), someone does
-- something (tasks), something is needed (resources). Budget becomes the
-- rollup of costs those records carry plus the engagement's fixed lines.
-- The run of show stops being its own system and becomes the inside of a
-- scheduled moment, timed relative to it so a moment that moves takes its
-- cues along.
--
-- Nothing is dropped. Old columns keep their data, the decisions table keeps
-- its rows as archive, and every change below is a new column, a widened
-- check, or a data mapping that copies content rather than moving it.

-- ------------------------------------------------ costs live on the plan

alter table public.resources
  add column if not exists estimated_cents bigint not null default 0,
  add column if not exists committed_cents bigint not null default 0,
  add column if not exists actual_cents bigint not null default 0,
  add column if not exists schedule_item_id uuid references public.schedule_items (id) on delete set null;

alter table public.tasks
  add column if not exists estimated_cents bigint not null default 0,
  add column if not exists committed_cents bigint not null default 0,
  add column if not exists actual_cents bigint not null default 0,
  add column if not exists schedule_item_id uuid references public.schedule_items (id) on delete set null;

-- Resources widen from vendor and supply to the kinds a weekend needs.
alter table public.resources drop constraint if exists resources_kind_check;
alter table public.resources
  add constraint resources_kind_check
  check (kind in ('person', 'vendor', 'equipment', 'supply', 'deliverable'));

-- --------------------------------------------- cues become relative time

-- offset_minutes is the cue's distance from its moment's start. When the
-- moment moves, the cues move with it by construction; when the duration
-- changes, the offsets deliberately stay put.
alter table public.run_of_show_cues
  add column if not exists offset_minutes integer,
  add column if not exists note text;

update public.run_of_show_cues c
set offset_minutes = (
  (extract(hour from to_timestamp(upper(c.at_label), 'HH12:MI AM')) * 60
   + extract(minute from to_timestamp(upper(c.at_label), 'HH12:MI AM')))
  -
  (extract(hour from to_timestamp(upper(s.starts_label), 'HH12:MI AM')) * 60
   + extract(minute from to_timestamp(upper(s.starts_label), 'HH12:MI AM')))
)::integer
from public.schedule_items s
where s.id = c.schedule_item_id
  and c.offset_minutes is null;

-- ------------------------------------- the decision history lives on sparks

alter table public.sparks
  add column if not exists decided_by_name text;

-- --------------------------------- the decisions rows, represented as sparks
--
-- Discernment questions belong in discernment. Open questions become sparks
-- under discussion; questions tied to an existing spark become notes on that
-- spark; the two settled ones become settled sparks carrying their outcome.
-- The decisions rows themselves stay untouched, as archive.

do $$
declare
  eng uuid;
begin
  select e.id into eng
  from public.engagements e
  join public.organizations o on o.id = e.organization_id
  where o.slug = 'shine' and e.slug = 'founders-weekend-2026';

  if eng is null then return; end if;

  -- Open questions with no spark of their own become sparks in discernment.
  insert into public.sparks (engagement_id, title, detail, category, status, raised_by_name)
  select eng, d.question, d.context, 'Decision', 'discussing', d.owner_name
  from public.decisions d
  where d.engagement_id = eng
    and d.status in ('open', 'deferred')
    and d.spark_id is null
    and not exists (
      select 1 from public.sparks s where s.engagement_id = eng and s.title = d.question
    );

  -- Open questions about an existing spark become a note on that spark.
  insert into public.spark_notes (engagement_id, spark_id, body)
  select eng, d.spark_id,
    left('Open question: ' || d.question || coalesce(' ' || d.context, ''), 1000)
  from public.decisions d
  where d.engagement_id = eng
    and d.status in ('open', 'deferred')
    and d.spark_id is not null
    and not exists (
      select 1 from public.spark_notes n
      where n.spark_id = d.spark_id and n.body like 'Open question:%'
    );

  -- The two settled questions, mapped by hand to the outcome they reached.
  insert into public.sparks
    (engagement_id, title, detail, category, status, raised_by_name, decision, decided_at)
  select eng, v.title, v.detail, 'Decision', v.status, v.owner, v.decision, v.decided_at
  from (
    select d.question as title, d.context as detail, d.owner_name as owner,
           d.outcome as decision, d.created_at as decided_at,
           case when d.question like 'Is there any Sunday programming%' then 'declined'
                else 'approved' end as status
    from public.decisions d
    where d.engagement_id = eng and d.status = 'decided'
  ) v
  where not exists (
    select 1 from public.sparks s where s.engagement_id = eng and s.title = v.title
  );
end $$;
