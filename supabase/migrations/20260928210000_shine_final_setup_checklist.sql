-- Four more jobs on the Thursday afternoon setup.
--
-- The beach balls, the headlights, the glow arrows and the candlestick
-- holders are things somebody has to sit down and put together, and the
-- afternoon they get put together is this one. They go on the Setup line of
-- Final property setup, next to the checklist it already points at, because
-- that is the line a volunteer opens the row to read.
--
-- What happens, the lead, the team, the times and the checkbox are all
-- untouched, and no other row is.

do $migration$
declare
  shine constant uuid := 'c4c371a6-6378-4f80-9d78-f9a6359ae8db';
  setup constant uuid := 'd249a3a2-b4ae-5288-9ab0-bf9ce756243a';
  added constant text :=
    'Review setup checklist, blow up 12 beach balls, assemble 48 headlights, '
    'assemble glow celebration arrows, assemble candlestick holders';
  touched integer;
begin

/* Addressed by id, checked by name and day, so a renamed or moved row stops
   this rather than quietly taking a different Thursday afternoon. */
select count(*) into touched
  from public.schedule_items s
 where s.id = setup
   and s.engagement_id = shine
   and s.day_key = 'thu'
   and s.title = 'Final property setup';
if touched <> 1 then
  raise exception 'setup: expected the Thursday final property setup row, matched %', touched;
end if;

if (select o.detail ->> 'materials' from public.schedule_item_ops o where o.schedule_item_id = setup)
   is distinct from 'Review setup checklist' then
  raise exception 'setup: the line has changed since this was written';
end if;

update public.schedule_item_ops o
   set detail = jsonb_set(o.detail, '{materials}', to_jsonb(added), true),
       updated_at = now()
 where o.schedule_item_id = setup;
get diagnostics touched = row_count;
if touched <> 1 then raise exception 'setup: % rows', touched; end if;

/* Every item arrived, and the rest of the row did not move. */
if not exists (
  select 1 from public.schedule_item_ops o
   where o.schedule_item_id = setup
     and o.detail ->> 'materials' = added
     and o.detail ->> 'purpose' =
         'Finish guest rooms, hospitality areas, signage, tables, and exterior details.'
     and o.detail ->> 'owner' = 'Brooke'
     and o.detail ->> 'support' = 'Full team'
     and (o.detail ->> 'duty')::boolean
) then
  raise exception 'setup: the row did not come back the way it went in';
end if;

/* The checkbox is the task, and the task is still there and still open. */
select count(*) into touched
  from public.tasks t
 where t.schedule_item_id = setup and t.engagement_id = shine;
if touched <> 1 then raise exception 'setup duty: expected 1 task, found %', touched; end if;

/* Nobody else's Setup line changed. */
select count(*) into touched
  from public.schedule_item_ops o
 where o.engagement_id = shine
   and o.schedule_item_id <> setup
   and o.detail::text ilike '%beach ball%';
if touched <> 0 then raise exception 'setup: % other rows mention the beach balls', touched; end if;

end $migration$;
