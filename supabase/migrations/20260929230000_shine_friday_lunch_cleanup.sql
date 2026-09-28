-- Johnny takes Alice's place on the Friday lunch cleanup.
--
-- Only the Friday one. Saturday has a lunch cleanup with the same title, the
-- same lead and the same four people, ending a quarter hour earlier, and it
-- was not part of what was asked for. It is asserted below so this cannot
-- have caught it, and it is worth a decision of its own.

do $migration$
declare
  shine constant uuid := 'c4c371a6-6378-4f80-9d78-f9a6359ae8db';
  cleanup constant uuid := 'aedb0bd2-e8ba-5ce7-950a-b171bbf6341b';
  team constant text := 'Keta, Emma, Scott and Johnny';
  touched integer;
begin

select count(*) into touched
  from public.schedule_items s
  join public.schedule_item_ops o on o.schedule_item_id = s.id
 where s.id = cleanup
   and s.engagement_id = shine
   and s.day_key = 'fri'
   and s.title = 'Lunch cleanup'
   and o.detail ->> 'support' = 'Alice, Keta, Emma and Scott';
if touched <> 1 then
  raise exception 'cleanup: expected the Friday 12:45 row, matched %', touched;
end if;

update public.schedule_item_ops o
   set detail = jsonb_set(o.detail, '{support}', to_jsonb(team), true),
       updated_at = now()
 where o.schedule_item_id = cleanup;
get diagnostics touched = row_count;
if touched <> 1 then raise exception 'cleanup team: % rows', touched; end if;

if not exists (
  select 1
    from public.schedule_items s
    join public.schedule_item_ops o on o.schedule_item_id = s.id
   where s.id = cleanup
     and s.starts_label = '12:45 pm' and s.ends_label = '1:15 pm'
     and o.detail ->> 'owner' = 'Keta'
     and o.detail ->> 'support' = team
     and o.detail ->> 'notes' = 'Work quietly as free time begins.'
     and (o.detail ->> 'duty')::boolean
) then
  raise exception 'cleanup: the row did not come back the way it went in';
end if;

/* The Saturday cleanup is untouched, with its own four people. */
if not exists (
  select 1
    from public.schedule_items s
    join public.schedule_item_ops o on o.schedule_item_id = s.id
   where s.engagement_id = shine and s.day_key = 'sat' and s.title = 'Lunch cleanup'
     and o.detail ->> 'support' = 'Alice, Keta, Emma and Scott'
) then
  raise exception 'cleanup: the Saturday row moved';
end if;

/* Alice is off this hour, not off the weekend. */
select count(*) into touched
  from public.schedule_item_ops o
 where o.engagement_id = shine and o.detail::text like '%Alice%';
if touched < 4 then
  raise exception 'roster: Alice is down to % rows, which is not a removal from one', touched;
end if;

end $migration$;
