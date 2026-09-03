-- The idea is the anchor, and a question is attention rather than a stage.
--
-- Nothing structural is missing. Every planning table already carries
-- spark_id: schedule_items, tasks, resources, budget_lines, spark_notes, and
-- run_of_show_cues. An idea can already be its own scheduled moment, sit as
-- a cue inside somebody else's moment, own several actions, several
-- requirements, and several cost lines, all without being retyped. That is
-- reused as it stands.
--
-- What was missing is somewhere to keep an unresolved question. It lived in
-- the status column as 'discussing', which made it a workflow lane the team
-- had to manage. It becomes a field on the idea instead, so an idea can be
-- planned, scheduled, costed and still be carrying a question, and answering
-- the question is one edit rather than a move between columns.

alter table public.sparks
  add column if not exists open_question text;

comment on column public.sparks.open_question is
  'An unresolved question about this idea. Attention, never a stage: an idea '
  'with a question can still be scheduled, costed and acted on.';

do $$
declare
  eng uuid;
begin
  select e.id into eng
  from public.engagements e
  join public.organizations o on o.id = e.organization_id
  where o.slug = 'shine' and e.slug = 'founders-weekend-2026';

  if eng is null then return; end if;

  -- The five ideas that were sitting in the discussion lane. Their detail is
  -- the unresolved thing itself, so it moves to the question rather than
  -- being duplicated beside it. Nothing is discarded.
  update public.sparks
  set open_question = coalesce(detail, title),
      detail = null,
      status = 'captured'
  where engagement_id = eng
    and status = 'discussing';

  -- Approval stopped being a state the team manages. What an idea became is
  -- now told by what is attached to it, so any previously approved idea
  -- simply returns to being an idea; its schedule, actions, costs and
  -- requirements are untouched and still name it.
  update public.sparks
  set status = 'captured'
  where engagement_id = eng
    and status = 'approved';
end $$;
