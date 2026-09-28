-- Friday's morning readiness stops carrying rope.
--
-- The rope pieces leave the setup line and Brooke's rope job leaves the team
-- line, so the two say the same thing. Brooke still leads the half hour, and
-- the Saturday readiness, which carries stakes rather than rope, is a
-- different row and is not touched.

do $migration$
declare
  shine constant uuid := 'c4c371a6-6378-4f80-9d78-f9a6359ae8db';
  readiness constant uuid := '74f603fc-8977-4689-806a-40db842fc0c3';
  team constant text := 'Alice bathrooms; Ryan and Emma hospitality';
  kit constant text := 'Cleaning supplies, coffee';
  touched integer;
begin

select count(*) into touched
  from public.schedule_items s
  join public.schedule_item_ops o on o.schedule_item_id = s.id
 where s.id = readiness
   and s.engagement_id = shine
   and s.day_key = 'fri'
   and s.title = 'Morning readiness'
   and o.detail ->> 'support' = 'Alice bathrooms; Brooke rope; Ryan and Emma hospitality'
   and o.detail ->> 'materials' = 'Cleaning supplies, coffee, rope pieces';
if touched <> 1 then
  raise exception 'readiness: expected the Friday 7:30 row, matched %', touched;
end if;

update public.schedule_item_ops o
   set detail = jsonb_set(jsonb_set(o.detail, '{support}', to_jsonb(team), true),
                          '{materials}', to_jsonb(kit), true),
       updated_at = now()
 where o.schedule_item_id = readiness;
get diagnostics touched = row_count;
if touched <> 1 then raise exception 'readiness: % rows', touched; end if;

if exists (
  select 1 from public.schedule_item_ops o
   where o.schedule_item_id = readiness and o.detail::text ilike '%rope%'
) then
  raise exception 'readiness: the rope is still on this row';
end if;

/* Brooke still leads it, and the times and the note did not move. */
if not exists (
  select 1
    from public.schedule_items s
    join public.schedule_item_ops o on o.schedule_item_id = s.id
   where s.id = readiness
     and s.starts_label = '7:30 am' and s.ends_label = '8:00 am'
     and o.detail ->> 'owner' = 'Brooke'
     and o.detail ->> 'support' = team
     and o.detail ->> 'materials' = kit
     and o.detail ->> 'notes' = 'Complete before guests gather.'
     and (o.detail ->> 'duty')::boolean
) then
  raise exception 'readiness: the row did not come back the way it went in';
end if;

/* The Saturday readiness is a different row and still carries its stakes. */
if not exists (
  select 1
    from public.schedule_items s
    join public.schedule_item_ops o on o.schedule_item_id = s.id
   where s.engagement_id = shine and s.day_key = 'sat' and s.title = 'Morning readiness'
     and o.detail ->> 'materials' = 'Cleaning supplies, coffee, prepared stakes'
) then
  raise exception 'readiness: the Saturday row moved';
end if;

end $migration$;
