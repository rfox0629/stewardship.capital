-- The Food section leaves the activities list.
--
-- The pizza oven and the grill are how a meal gets cooked, not something a
-- guest goes and does in their free time, and the meals have their own menus.
-- The section is drawn from the categories in this list, so removing the two
-- entries takes the heading, the icon, the count and the container with them,
-- and the sections after it close up on their own.

do $migration$
declare
  shine constant uuid := 'c4c371a6-6378-4f80-9d78-f9a6359ae8db';
  moved integer;
  kept jsonb;
begin

select jsonb_agg(activity order by ordinality) into kept
  from jsonb_array_elements(
         (select reference -> 'guide' -> 'activities' from public.engagements where id = shine)
       ) with ordinality as t(activity, ordinality)
 where activity ->> 'category' <> 'Food';

select count(*) into moved
  from public.engagements e, jsonb_array_elements(e.reference -> 'guide' -> 'activities') a
 where e.id = shine and a ->> 'category' = 'Food';
if moved <> 2 then raise exception 'activities: expected 2 in Food, found %', moved; end if;

if jsonb_array_length(kept) <> 26 then
  raise exception 'activities: expected 26 to remain, found %', jsonb_array_length(kept);
end if;
if kept::text ilike '%pizza oven%' or kept::text ilike '%Large grill%' then
  raise exception 'activities: the food entries are still listed';
end if;

update public.engagements
   set reference = jsonb_set(reference, '{guide,activities}', kept, true)
 where id = shine;
get diagnostics moved = row_count;
if moved <> 1 then raise exception 'engagement: % rows', moved; end if;

end $migration$;
