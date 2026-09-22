-- One duty row was left without its own task.
--
-- The Bible character name game already had a pre-event task hanging off it
-- ("Make and print Bible character game name tags"), and the previous
-- migration skipped any row that had a task of any kind. A pre-event task is
-- preparation, not the duty of running the thing, so the row needs its own.

do $migration$
declare
  shine constant uuid := 'c4c371a6-6378-4f80-9d78-f9a6359ae8db';
  found integer;
begin

insert into public.tasks
  (engagement_id, title, status, owner_name, schedule_item_id, duty)
select shine, s.title, 'todo', o.detail->>'owner', s.id,
       jsonb_build_object('phase', s.day_key, 'order', s.position,
                          'when', s.starts_label, 'fromMaster', true)
  from public.schedule_items s
  join public.schedule_item_ops o on o.schedule_item_id = s.id
 where s.engagement_id = shine
   and (o.detail->>'duty') = 'true'
   and not exists (
     select 1 from public.tasks t
      where t.engagement_id = shine
        and t.schedule_item_id = s.id
        and coalesce((t.duty ->> 'fromMaster')::boolean, false)
   );

select count(*) into found
  from public.tasks t
 where t.engagement_id = shine
   and coalesce((t.duty ->> 'fromMaster')::boolean, false);
if found <> 61 then
  raise exception 'duty tasks: expected 61, found %', found;
end if;

end $migration$;
