-- The Friday break splits into the two jobs it actually is.
--
-- Fifteen minutes with a coffee bar to run and a rope to put on every chair,
-- and one name on the team line. Now both jobs have their people, written
-- the way the rest of the weekend writes a split assignment: names, then
-- what those names are doing, separated by a semicolon.

do $migration$
declare
  shine constant uuid := 'c4c371a6-6378-4f80-9d78-f9a6359ae8db';
  brk constant uuid := '955e25bf-6e62-4af1-b6ff-c63485d89af1';
  team constant text := 'Scott, Johnny and Keta rope prep; Ryan and Brooke coffee bar';
  touched integer;
begin

select count(*) into touched
  from public.schedule_items s
  join public.schedule_item_ops o on o.schedule_item_id = s.id
 where s.id = brk
   and s.engagement_id = shine
   and s.day_key = 'fri'
   and s.title = 'Coffee break and rope prep'
   and o.detail ->> 'support' = 'Scott';
if touched <> 1 then
  raise exception 'break: expected the Friday 10:15 row, matched %', touched;
end if;

update public.schedule_item_ops o
   set detail = jsonb_set(o.detail, '{support}', to_jsonb(team), true),
       updated_at = now()
 where o.schedule_item_id = brk;
get diagnostics touched = row_count;
if touched <> 1 then raise exception 'break team: % rows', touched; end if;

/* The lead, the kit and the window are not what changed. This row is also
   one of the two coffee bar windows the guides publish hours from, so its
   times are load bearing beyond this screen. */
if not exists (
  select 1
    from public.schedule_items s
    join public.schedule_item_ops o on o.schedule_item_id = s.id
   where s.id = brk
     and s.starts_label = '10:15 am' and s.ends_label = '10:30 am'
     and s.guest_guide -> 'opens' ? 'coffee'
     and o.detail ->> 'owner' = 'Brooke and Ryan'
     and o.detail ->> 'support' = team
     and o.detail ->> 'materials' = 'Coffee, water, rope, knot sample'
     and (o.detail ->> 'duty')::boolean
) then
  raise exception 'break: the row did not come back the way it went in';
end if;

end $migration$;
