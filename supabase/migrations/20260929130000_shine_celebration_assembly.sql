-- The things that have to be assembled get their own hour.
--
-- The beach balls, the headlights, the glow arrows and the candlestick
-- holders went onto the Thursday afternoon setup line, where they sat behind
-- "finish guest rooms, hospitality areas, signage" as a fifth item on a
-- sentence. They are an hour of somebody's morning, not a footnote to
-- somebody else's afternoon, so they become a row of their own at ten with
-- their own lead, their own team and their own checkbox, and the afternoon
-- goes back to reviewing its checklist.
--
-- The list lives in the row's notes, because that is where it was asked to
-- be. Setup is left empty rather than guessing at what gets carried in.

do $migration$
declare
  shine constant uuid := 'c4c371a6-6378-4f80-9d78-f9a6359ae8db';
  afternoon constant uuid := 'd249a3a2-b4ae-5288-9ab0-bf9ce756243a';
  assembly constant uuid := 'd65366ff-c2c1-4932-b6c3-c6975dbac798';
  listed constant text :=
    'Blow up 12 beach balls, assemble 48 headlights, assemble glow '
    'celebration arrows, assemble candlestick holders.';
  touched integer;
begin

/* ------------------------------------------- the afternoon lets them go */

select count(*) into touched
  from public.schedule_items s
  join public.schedule_item_ops o on o.schedule_item_id = s.id
 where s.id = afternoon
   and s.engagement_id = shine
   and s.day_key = 'thu'
   and s.title = 'Final property setup'
   and o.detail ->> 'materials' like '%beach balls%';
if touched <> 1 then
  raise exception 'afternoon: expected the Thursday setup row carrying the list, matched %', touched;
end if;

update public.schedule_item_ops o
   set detail = jsonb_set(o.detail, '{materials}', to_jsonb('Review setup checklist'::text), true),
       updated_at = now()
 where o.schedule_item_id = afternoon;
get diagnostics touched = row_count;
if touched <> 1 then raise exception 'afternoon setup: % rows', touched; end if;

if exists (
  select 1 from public.schedule_item_ops o
   where o.schedule_item_id = afternoon
     and o.detail::text ~* '(beach ball|headlight|celebration arrow|candlestick)'
) then
  raise exception 'afternoon: the list is still on this row';
end if;

/* ------------------------------------------------- and the hour gets them */

if exists (select 1 from public.schedule_items where id = assembly) then
  raise exception 'assembly: the row already exists';
end if;

insert into public.schedule_items
  (id, engagement_id, day_key, starts_label, ends_label, title, track, status,
   position, daypart, display_mode, audience)
values
  (assembly, shine, 'thu', '10:00 am', '11:00 am', 'Celebration supplies assembly',
   'Operations', 'confirmed', 83, 'morning', 'normal', 'planner');
get diagnostics touched = row_count;
if touched <> 1 then raise exception 'assembly: % rows', touched; end if;

insert into public.schedule_item_ops (schedule_item_id, engagement_id, detail)
values (assembly, shine, jsonb_build_object(
  'duty', true,
  'category', 'operations',
  'purpose', 'Put together the celebration supplies for the weekend.',
  'owner', 'Brooke',
  'support', 'Scott and Johnny',
  'notes', listed));
get diagnostics touched = row_count;
if touched <> 1 then raise exception 'assembly ops: % rows', touched; end if;

/* A duty row carries the task that holds its checkbox, the same shape every
   other duty on this weekend was generated with. */
insert into public.tasks
  (engagement_id, title, status, owner_name, schedule_item_id, duty)
values (shine, 'Celebration supplies assembly', 'todo', 'Brooke', assembly,
        jsonb_build_object('phase', 'thu', 'order', 83, 'when', '10:00 am', 'fromMaster', true));
get diagnostics touched = row_count;
if touched <> 1 then raise exception 'assembly duty: % rows', touched; end if;

/* It came back whole, and the weekend has exactly one of it. */
if not exists (
  select 1
    from public.schedule_items s
    join public.schedule_item_ops o on o.schedule_item_id = s.id
    join public.tasks t on t.schedule_item_id = s.id
   where s.id = assembly
     and s.starts_label = '10:00 am'
     and s.ends_label = '11:00 am'
     and s.status = 'confirmed'
     and s.audience = 'planner'
     and o.detail ->> 'owner' = 'Brooke'
     and o.detail ->> 'support' = 'Scott and Johnny'
     and o.detail ->> 'notes' = listed
     and (o.detail ->> 'duty')::boolean
     and t.status = 'todo'
) then
  raise exception 'assembly: the row did not come back whole';
end if;

select count(*) into touched
  from public.schedule_item_ops o
 where o.engagement_id = shine
   and o.detail::text ~* '(beach ball|headlight|celebration arrow|candlestick)';
if touched <> 1 then raise exception 'assembly: % rows carry the list', touched; end if;

end $migration$;
