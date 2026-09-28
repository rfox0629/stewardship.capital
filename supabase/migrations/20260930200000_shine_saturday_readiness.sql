-- Saturday's readiness: Ryan on the stakes, Keta on hospitality.
--
-- The two jobs swap hands. The bathrooms are unchanged, and so is the kit,
-- which still includes the prepared stakes Ryan is now putting out.

do $migration$
declare
  shine constant uuid := 'c4c371a6-6378-4f80-9d78-f9a6359ae8db';
  readiness constant uuid := 'f752c677-c595-5167-9585-18cd42a88595';
  team constant text := 'Emma and Scott bathrooms; Ryan stakes; Keta hospitality';
  touched integer;
begin

select count(*) into touched
  from public.schedule_items s
  join public.schedule_item_ops o on o.schedule_item_id = s.id
 where s.id = readiness and s.engagement_id = shine and s.day_key = 'sat'
   and s.title = 'Morning readiness'
   and o.detail ->> 'support' = 'Emma and Scott bathrooms; Keta and Emma stakes; Ryan hospitality';
if touched <> 1 then
  raise exception 'readiness: expected the Saturday 7:30 row, matched %', touched;
end if;

update public.schedule_item_ops o
   set detail = jsonb_set(o.detail, '{support}', to_jsonb(team), true),
       updated_at = now()
 where o.schedule_item_id = readiness;
get diagnostics touched = row_count;
if touched <> 1 then raise exception 'readiness: % rows', touched; end if;

if not exists (
  select 1
    from public.schedule_items s
    join public.schedule_item_ops o on o.schedule_item_id = s.id
   where s.id = readiness
     and s.starts_label = '7:30 am' and s.ends_label = '8:00 am'
     and o.detail ->> 'owner' = 'Brooke'
     and o.detail ->> 'support' = team
     and o.detail ->> 'materials' = 'Cleaning supplies, coffee, prepared stakes'
     and o.detail ->> 'notes' = 'Complete before guests gather.'
     and (o.detail ->> 'duty')::boolean
) then
  raise exception 'readiness: the row did not come back the way it went in';
end if;

/* Emma keeps the bathrooms on this row and the rest of her weekend. */
if (select o.detail ->> 'support' from public.schedule_item_ops o where o.schedule_item_id = readiness)
   not like '%Emma and Scott bathrooms%' then
  raise exception 'readiness: the bathrooms changed hands';
end if;

/* Friday's readiness, which has no stakes on it, was no part of this. */
if not exists (
  select 1
    from public.schedule_items s
    join public.schedule_item_ops o on o.schedule_item_id = s.id
   where s.engagement_id = shine and s.day_key = 'fri' and s.title = 'Morning readiness'
     and o.detail ->> 'support' = 'Alice bathrooms; Ryan and Emma hospitality'
) then
  raise exception 'readiness: the Friday row moved';
end if;

end $migration$;
