-- Two Thursday team lines.
--
-- Arrival loses Ryan and Junior and gains Scott and Johnny. The meal cleanup
-- gains Johnny. The team line on a row is also the roster the name picker is
-- built from, so this is what decides whose schedule each of them sees.
--
-- Note for whoever reads this next: the arrival row's own note still says
-- "Junior captures key moments", which was not part of what was asked for
-- and has been left exactly as it was. It is worth a second look now that
-- Junior is not on the team line.

do $migration$
declare
  shine constant uuid := 'c4c371a6-6378-4f80-9d78-f9a6359ae8db';
  arrival constant uuid := '920b31de-4366-420a-a0f5-959e7d80459a';
  cleanup constant uuid := 'db5dcd8d-d853-45ac-aadf-279c0e50198a';
  arrival_team constant text := 'Brooke, Scott and Johnny';
  cleanup_team constant text := 'Alice, Keta, Emma, Scott and Johnny';
  touched integer;
begin

/* --------------------------------------------------------------- arrival */

select count(*) into touched
  from public.schedule_items s
  join public.schedule_item_ops o on o.schedule_item_id = s.id
 where s.id = arrival
   and s.engagement_id = shine
   and s.day_key = 'thu'
   and s.title = 'Guest arrival, bellhop and room tours'
   and o.detail ->> 'support' = 'Ryan, Brooke and Junior';
if touched <> 1 then
  raise exception 'arrival: expected the Thursday 4:00 row, matched %', touched;
end if;

update public.schedule_item_ops o
   set detail = jsonb_set(o.detail, '{support}', to_jsonb(arrival_team), true),
       updated_at = now()
 where o.schedule_item_id = arrival;
get diagnostics touched = row_count;
if touched <> 1 then raise exception 'arrival team: % rows', touched; end if;

/* --------------------------------------------------------------- cleanup */

select count(*) into touched
  from public.schedule_items s
  join public.schedule_item_ops o on o.schedule_item_id = s.id
 where s.id = cleanup
   and s.engagement_id = shine
   and s.day_key = 'thu'
   and s.title = 'Meal cleanup and worship reset'
   and o.detail ->> 'support' = 'Alice, Keta, Emma and Scott';
if touched <> 1 then
  raise exception 'cleanup: expected the Thursday 6:30 row, matched %', touched;
end if;

update public.schedule_item_ops o
   set detail = jsonb_set(o.detail, '{support}', to_jsonb(cleanup_team), true),
       updated_at = now()
 where o.schedule_item_id = cleanup;
get diagnostics touched = row_count;
if touched <> 1 then raise exception 'cleanup team: % rows', touched; end if;

/* Both rows came back with everything that was not the team line. */
if not exists (
  select 1
    from public.schedule_items s
    join public.schedule_item_ops o on o.schedule_item_id = s.id
   where s.id = arrival
     and s.starts_label = '4:00 pm' and s.ends_label = '5:00 pm'
     and o.detail ->> 'owner' = 'Brooke'
     and o.detail ->> 'support' = arrival_team
     and o.detail ->> 'materials' = 'Check-in table, room list, welcome gifts'
     and (o.detail ->> 'duty')::boolean
) then
  raise exception 'arrival: the row did not come back the way it went in';
end if;

if not exists (
  select 1
    from public.schedule_items s
    join public.schedule_item_ops o on o.schedule_item_id = s.id
   where s.id = cleanup
     and s.starts_label = '6:30 pm' and s.ends_label = '6:50 pm'
     and o.detail ->> 'owner' = 'Keta'
     and o.detail ->> 'support' = cleanup_team
     and o.detail ->> 'materials' = 'Cleanup supplies, AV checklist'
     and (o.detail ->> 'duty')::boolean
) then
  raise exception 'cleanup: the row did not come back the way it went in';
end if;

/* Ryan and Junior are off this hour, not off the weekend. */
if (select o.detail ->> 'support' from public.schedule_item_ops o where o.schedule_item_id = arrival)
   ~ '(Ryan|Junior)' then
  raise exception 'arrival: Ryan or Junior is still on the team line';
end if;

select count(*) into touched
  from public.schedule_item_ops o
 where o.engagement_id = shine and o.detail::text like '%Junior%';
if touched < 3 then
  raise exception 'roster: Junior is down to % rows, which is not a removal from one', touched;
end if;

select count(*) into touched
  from public.schedule_item_ops o
 where o.engagement_id = shine and o.detail::text like '%Ryan%';
if touched < 5 then
  raise exception 'roster: Ryan is down to % rows, which is not a removal from one', touched;
end if;

end $migration$;
