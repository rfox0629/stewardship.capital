-- The Saturday break gets names instead of a "snack station team".
--
-- Brooke leads it. The coffee bar and the snack station each get their own
-- people, written the way the rest of the weekend writes a split assignment,
-- and Junior keeps the AV, which was not part of what was asked for and is
-- carried through unchanged rather than dropped.
--
-- Gunner joins the weekend here.
--
-- This row is one of the four windows the published coffee bar hours are
-- read from, so its times and its coffee mark are load bearing on both
-- guides. Both are asserted.

do $migration$
declare
  shine constant uuid := 'c4c371a6-6378-4f80-9d78-f9a6359ae8db';
  brk constant uuid := '1d8a351a-a33e-481c-9f51-3027e5b06364';
  team constant text :=
    'Ryan, Parker and Gunner coffee bar; Emma and Johnny snack station; Junior AV';
  touched integer;
begin

select count(*) into touched
  from public.schedule_items s
  join public.schedule_item_ops o on o.schedule_item_id = s.id
 where s.id = brk
   and s.engagement_id = shine
   and s.day_key = 'sat'
   and s.title = 'Break and message reset'
   and o.detail ->> 'owner' = 'Ryan and Brooke'
   and o.detail ->> 'support' = 'Snack station team; Junior AV';
if touched <> 1 then
  raise exception 'break: expected the Saturday 10:15 row, matched %', touched;
end if;

update public.schedule_item_ops o
   set detail = jsonb_set(jsonb_set(o.detail, '{owner}', to_jsonb('Brooke'::text), true),
                          '{support}', to_jsonb(team), true),
       updated_at = now()
 where o.schedule_item_id = brk;
get diagnostics touched = row_count;
if touched <> 1 then raise exception 'break team: % rows', touched; end if;

/* The duty task follows its row's lead: the planner's list reads
   tasks.owner_name rather than the ops line underneath it. */
update public.tasks
   set owner_name = 'Brooke'
 where schedule_item_id = brk and engagement_id = shine;
get diagnostics touched = row_count;
if touched <> 1 then raise exception 'break duty: % rows', touched; end if;

if not exists (
  select 1
    from public.schedule_items s
    join public.schedule_item_ops o on o.schedule_item_id = s.id
   where s.id = brk
     and s.starts_label = '10:15 am' and s.ends_label = '10:30 am'
     and s.audience = 'everyone'
     and s.guest_guide -> 'opens' ? 'coffee'
     and o.detail ->> 'owner' = 'Brooke'
     and o.detail ->> 'support' = team
     and o.detail ->> 'materials' = 'Coffee, water, presentation, visual props'
     and (o.detail ->> 'duty')::boolean
) then
  raise exception 'break: the row did not come back the way it went in';
end if;

/* Still four published coffee windows, unchanged. */
select count(*) into touched
  from public.schedule_items s
 where s.engagement_id = shine and s.status = 'confirmed' and s.audience = 'everyone'
   and (s.guest_guide -> 'opens' ? 'coffee' or (s.guest_guide ->> 'kind') = 'coffee');
if touched <> 4 then raise exception 'coffee hours: % windows', touched; end if;

/* No row anywhere still assigns an unnamed station team. */
if exists (
  select 1 from public.schedule_item_ops o
   where o.engagement_id = shine and (o.detail ->> 'support') ilike '%station team%'
) then
  raise exception 'break: an unnamed station team is still assigned somewhere';
end if;

end $migration$;
