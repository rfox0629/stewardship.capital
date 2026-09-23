-- The master calendar as of September 23: six new rows, eight corrections.
--
-- A content update, row by row, against the five day sheets. Rows that still
-- exist are edited in place so their ids, their guest copy and any completion
-- survive; two Wednesday rows whose subject changed keep their slot and their
-- id but lose the assignments and notes that belonged to the old subject,
-- because carrying those forward would attribute a birthday surprise to a
-- celebration that is no longer the same thing.
--
-- Every statement checks how many rows it moved. Row level security filters
-- an UPDATE silently, and a content migration that quietly changed nothing
-- would be indistinguishable from one that worked.

do $migration$
declare
  shine constant uuid := 'c4c371a6-6378-4f80-9d78-f9a6359ae8db';
  moved integer;
  next_position integer;
  new_row record;
  made uuid;
  sweep constant text := 'Check sector to ensure it is in good condition.';
begin

/* ------------------------------------------------------------- Wednesday */

/* 7:00, which was cooking, is now the gathering itself. */
update public.schedule_items
   set title = 'Team Gathering and Fun'
 where engagement_id = shine and day_key = 'wed' and title = 'Cook and prepare team dinner';
get diagnostics moved = row_count;
if moved <> 1 then raise exception 'wed gathering: % rows', moved; end if;

update public.schedule_item_ops o
   set detail = jsonb_build_object(
         'category', 'operations',
         'duty', false,
         'purpose', 'We will gather for a celebration.',
         'materials', 'Dinner supplies, cake, cider'),
       updated_at = now()
  from public.schedule_items s
 where s.id = o.schedule_item_id and s.engagement_id = shine
   and s.day_key = 'wed' and s.title = 'Team Gathering and Fun';
get diagnostics moved = row_count;
if moved <> 1 then raise exception 'wed gathering ops: % rows', moved; end if;

/* 7:30 is no longer the team dinner and no longer the birthday surprise. */
update public.schedule_items
   set title = 'Fellowship and Relax'
 where engagement_id = shine and day_key = 'wed' and title = 'Team dinner and birthday celebration';
get diagnostics moved = row_count;
if moved <> 1 then raise exception 'wed fellowship: % rows', moved; end if;

update public.schedule_item_ops o
   set detail = jsonb_build_object(
         'category', 'operations',
         'duty', false,
         'notes', 'Brooke will discuss Thursday priorities.'),
       updated_at = now()
  from public.schedule_items s
 where s.id = o.schedule_item_id and s.engagement_id = shine
   and s.day_key = 'wed' and s.title = 'Fellowship and Relax';
get diagnostics moved = row_count;
if moved <> 1 then raise exception 'wed fellowship ops: % rows', moved; end if;

/* -------------------------------------------------------------- Thursday */

update public.schedule_items
   set starts_label = '8:00 am', ends_label = '8:30 am'
 where engagement_id = shine and day_key = 'thu' and title = 'Breakfast';
get diagnostics moved = row_count;
if moved <> 1 then raise exception 'thu breakfast: % rows', moved; end if;

/* The devotional has its leaders now, so the question about Tito goes with
   the answer rather than sitting on the row unresolved. */
update public.schedule_item_ops o
   set detail = (o.detail - 'confirm' - 'notes') || jsonb_build_object('owner', 'Ryan and Parker'),
       updated_at = now()
  from public.schedule_items s
 where s.id = o.schedule_item_id and s.engagement_id = shine
   and s.day_key = 'thu' and s.title = 'Team devotional and prayer';
get diagnostics moved = row_count;
if moved <> 1 then raise exception 'thu devotional: % rows', moved; end if;

update public.schedule_items
   set starts_label = '9:00 am'
 where engagement_id = shine and day_key = 'thu'
   and title in ('Guest-room and arrival setup', 'Balloon arch and flower vases');
get diagnostics moved = row_count;
if moved <> 2 then raise exception 'thu 9am starts: % rows', moved; end if;

update public.schedule_item_ops o
   set detail = o.detail || jsonb_build_object('support', 'Brooke, Keta, Emma'), updated_at = now()
  from public.schedule_items s
 where s.id = o.schedule_item_id and s.engagement_id = shine
   and s.day_key = 'thu' and s.title = 'Guest-room and arrival setup';
get diagnostics moved = row_count;
if moved <> 1 then raise exception 'thu guest rooms: % rows', moved; end if;

update public.schedule_item_ops o
   set detail = o.detail || jsonb_build_object('support', 'Scott and Keta'), updated_at = now()
  from public.schedule_items s
 where s.id = o.schedule_item_id and s.engagement_id = shine
   and s.day_key = 'thu' and s.title = 'Balloon arch and flower vases';
get diagnostics moved = row_count;
if moved <> 1 then raise exception 'thu balloons: % rows', moved; end if;

/* ---------------------------------------------------------------- Friday */

update public.schedule_item_ops o
   set detail = o.detail || jsonb_build_object('support', 'Brooke'), updated_at = now()
  from public.schedule_items s
 where s.id = o.schedule_item_id and s.engagement_id = shine
   and s.day_key = 'fri' and s.title = 'Free time and open coffee bar';
get diagnostics moved = row_count;
if moved <> 1 then raise exception 'fri coffee bar: % rows', moved; end if;

update public.schedule_item_ops o
   set detail = o.detail || jsonb_build_object('support', 'Emma and Ryan'), updated_at = now()
  from public.schedule_items s
 where s.id = o.schedule_item_id and s.engagement_id = shine
   and s.day_key = 'fri' and s.title = 'Fellowship, bonfire and movies';
get diagnostics moved = row_count;
if moved <> 1 then raise exception 'fri fellowship: % rows', moved; end if;

/* -------------------------------------------------------------- Saturday */

update public.schedule_item_ops o
   set detail = o.detail || jsonb_build_object('owner', 'Ryan and Parker', 'support', 'Brooke'),
       updated_at = now()
  from public.schedule_items s
 where s.id = o.schedule_item_id and s.engagement_id = shine
   and s.day_key = 'sat' and s.title = 'Open coffee bar';
get diagnostics moved = row_count;
if moved <> 1 then raise exception 'sat coffee bar: % rows', moved; end if;

/* ------------------------------------------------------------- new rows */

select coalesce(max(position), 0) + 1 into next_position
  from public.schedule_items where engagement_id = shine;

for new_row in
  select *
    from (values
      /* Wednesday gains the sector walkthrough and the lighting check. */
      ('wed', '6:30 pm', '7:00 pm', 'Sector Assignment', 0, jsonb_build_object(
        'category', 'operations', 'duty', true,
        'purpose', 'Create a sector assignment and complete a walkthrough with the team.',
        'owner', 'Mike or Brooke',
        'confirm', 'assignment',
        'notes', 'The master calendar names Mike or Brooke, and does not settle which.')),
      ('wed', '8:00 pm', '8:30 pm', 'Lights', 1, jsonb_build_object(
        'category', 'operations', 'duty', true,
        'purpose', 'Determine the appropriate light settings for night time.',
        'owner', 'Mike and Ryan')),
      /* The nightly sweep, from Thursday on. It runs over the last half hour
         of the evening, which the sheets intend: the sweep is the closing
         work while the fellowship finishes. */
      ('thu', '10:00 pm', '10:30 pm', 'Sector Sweep', 2, jsonb_build_object(
        'category', 'operations', 'duty', true,
        'purpose', sweep, 'owner', 'Brooke', 'support', 'Full team')),
      ('fri', '10:00 pm', '10:30 pm', 'Sector Sweep', 3, jsonb_build_object(
        'category', 'operations', 'duty', true,
        'purpose', sweep, 'owner', 'Brooke', 'support', 'Full team')),
      ('sat', '10:00 pm', '10:30 pm', 'Sector Sweep', 4, jsonb_build_object(
        'category', 'operations', 'duty', true,
        'purpose', sweep, 'owner', 'Brooke', 'support', 'Full team')),
      /* Friday now opens the way Saturday and Sunday already did. */
      ('fri', '7:30 am', '8:00 am', 'Morning readiness', 5, jsonb_build_object(
        'category', 'operations', 'duty', true,
        'purpose', 'Check bathrooms, light candles, check snack station.',
        'owner', 'Brooke',
        'support', 'Alice bathrooms; Brooke rope; Ryan and Emma hospitality',
        'materials', 'Cleaning supplies, coffee, rope pieces',
        'notes', 'Complete before guests gather.'))
    ) as row (day_key, starts_label, ends_label, title, slot, detail)
loop
  /* Setup, lighting, sector work and sweeps are the team's own business, so
     they are planner audience and never reach the guest guide. */
  if exists (select 1 from public.schedule_items s
              where s.engagement_id = shine and s.day_key = new_row.day_key
                and s.title = new_row.title) then
    raise exception 'row already present: % %', new_row.day_key, new_row.title;
  end if;

  insert into public.schedule_items
    (engagement_id, day_key, position, starts_label, ends_label, title,
     track, status, audience, display_mode)
  values
    (shine, new_row.day_key, next_position + new_row.slot,
     new_row.starts_label, new_row.ends_label, new_row.title,
     'program', 'confirmed', 'planner', 'normal')
  returning id into made;

  insert into public.schedule_item_ops (schedule_item_id, engagement_id, detail)
  values (made, shine, new_row.detail);

  /* A sweep is work somebody does, unlike being present at breakfast, so it
     carries a checkbox of its own. */
  insert into public.tasks
    (engagement_id, title, status, owner_name, schedule_item_id, duty)
  values (shine, new_row.title, 'todo', new_row.detail ->> 'owner', made,
          jsonb_build_object('phase', new_row.day_key, 'order',
                             next_position + new_row.slot,
                             'when', new_row.starts_label, 'fromMaster', true));
end loop;

/* Wednesday's seven o'clock is a gathering now, not preparation, so its
   checkbox goes: nobody ticks off attending a celebration. */
delete from public.tasks t
 using public.schedule_items s
 where t.schedule_item_id = s.id
   and t.engagement_id = shine
   and s.day_key = 'wed' and s.title = 'Team Gathering and Fun'
   and t.status <> 'done';

select count(*) into moved from public.schedule_items where engagement_id = shine;
if moved <> 83 then raise exception 'rows after update: expected 83, found %', moved; end if;

select count(*) into moved
  from public.tasks t
 where t.engagement_id = shine and coalesce((t.duty ->> 'fromMaster')::boolean, false);
if moved <> 66 then raise exception 'duties after update: expected 66, found %', moved; end if;

end $migration$;
