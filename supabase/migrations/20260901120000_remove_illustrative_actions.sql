-- The three actions that came from an example, not from the planning.
--
-- "Write welcome notes", "Confirm worship leader", and "Get barista quote"
-- were loaded from the illustration in the brief that described what an
-- action should look like, not from a Founders Weekend source sheet. They
-- carry no spark and descend from nothing, which is how they were spotted.
--
-- Removed by exact title, only where nothing has since been attached to
-- them: no owner change, no cost, no schedule link, no idea. If the team has
-- since made one of them real, it stays.

do $$
declare
  eng uuid;
begin
  select e.id into eng
  from public.engagements e
  join public.organizations o on o.id = e.organization_id
  where o.slug = 'shine' and e.slug = 'founders-weekend-2026';

  if eng is null then return; end if;

  delete from public.tasks
  where engagement_id = eng
    and title in ('Write welcome notes', 'Confirm worship leader', 'Get barista quote')
    and spark_id is null
    and schedule_item_id is null
    and status = 'todo'
    and estimated_cents = 0
    and committed_cents = 0
    and actual_cents = 0;
end $$;
