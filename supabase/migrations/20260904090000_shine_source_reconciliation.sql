-- Reconciles the real SHINE planning content against its sources.
--
-- Spark's model changed several times while this data sat in it, so a record
-- being in "ideas" no longer proved it was one. This asks of each record what
-- it actually is: something we are considering, something the itinerary says
-- is happening, work, a thing that must exist, money, or reference.
--
-- Nothing here invents a planning decision. Every change is either something
-- the tentative schedule already states, or a record that said the same thing
-- twice. Ambiguous records are deliberately untouched; docs/shine-reconciliation.md
-- lists them and says why.
--
-- Everything is snapshotted into the archive schema first, by id, before a
-- single row moves.

do $$
declare
  eng uuid;
begin
  select e.id into eng
    from public.engagements e
    join public.organizations o on o.id = e.organization_id
   where o.slug = 'shine' and e.slug = 'founders-weekend-2026';
  if eng is null then
    raise notice 'SHINE engagement not present, nothing to reconcile';
    return;
  end if;

  -- ---------------------------------------------------------------- snapshot
  execute 'create table if not exists archive.shine_20260904_sparks as
             select * from public.sparks where engagement_id = $1' using eng;
  execute 'create table if not exists archive.shine_20260904_schedule_items as
             select * from public.schedule_items where engagement_id = $1' using eng;

  -- ------------------------------------------------- the schedule is the source
  --
  -- Friday's morning ran an hour early and lunch sat in the middle of the
  -- afternoon. The tentative schedule is authoritative about clock times, so
  -- these move to what it says. The two ends that contradicted their new
  -- starts are cleared rather than guessed at: the sheet gives starts.

  update public.schedule_items
     set starts_label = '9:00 am', ends_label = null
   where engagement_id = eng and id = '86b0ec99-8fce-444a-990e-b44837ef88d5'
     and starts_label = '8:00 am';

  update public.schedule_items
     set starts_label = '9:20 am', ends_label = null
   where engagement_id = eng and id = 'c6c6dabc-a9cf-42ef-b5f1-01c194251f6c'
     and starts_label = '8:50 am';

  update public.schedule_items
     set starts_label = '11:30 am'
   where engagement_id = eng and id = '2c7f67e3-6f5d-4da4-98b9-c72586f89459'
     and starts_label = '12:00 pm';

  update public.schedule_items
     set starts_label = '12:00 pm'
   where engagement_id = eng and id = '8c658bb2-d05c-4db9-b514-babc9bfdc251'
     and starts_label = '2:45 pm';

  -- Sunday's breakfast has a time in the schedule; it was being held as a
  -- part of the day. The pack and checkout window stays a daypart, because
  -- the source says "approximately".
  update public.schedule_items
     set starts_label = '7:00 am', daypart = null
   where engagement_id = eng and id = '1011d13c-09af-46b0-a9ad-2ea4a6252631'
     and daypart = 'morning';

  -- The recap names the place, not the job. This is the schedule's wording.
  update public.schedule_items
     set title = 'Gusii land recap: Mike, Victor, and Keta'
   where engagement_id = eng and id = 'ecad74c7-cf11-42b1-b171-05aad9563850'
     and title = 'Missionaries recap: Mike, Victor, and Keta';

  -- ------------------------------------------- Thursday was never on the board
  --
  -- The tentative schedule has a full Thursday evening and it existed nowhere.
  -- These are schedule facts, so they arrive as moments with no idea behind
  -- them. The daytime block keeps the source's own word in its note rather
  -- than being assigned a part of the day it does not claim.

  insert into public.schedule_items
    (id, engagement_id, day_key, starts_label, daypart, title, track, status, note, position)
  values
    ('b1f0a5d2-0f4a-4b1e-9c1a-2d5f3a7c9101', eng, 'thu', null, 'anytime',
     'Final setup and guest arrival preparation', 'Logistics', 'confirmed',
     'Daytime, before guests arrive.', 10),
    ('b1f0a5d2-0f4a-4b1e-9c1a-2d5f3a7c9102', eng, 'thu', '6:00 pm', null,
     'Appetizers and fellowship', 'Meals', 'confirmed', null, 20),
    ('b1f0a5d2-0f4a-4b1e-9c1a-2d5f3a7c9103', eng, 'thu', '7:00 pm', null,
     'Worship', 'Worship', 'confirmed', null, 30),
    ('b1f0a5d2-0f4a-4b1e-9c1a-2d5f3a7c9104', eng, 'thu', '7:20 pm', null,
     'Teaching and vision: Sammy and Suzanne', 'Program', 'confirmed', null, 40),
    ('b1f0a5d2-0f4a-4b1e-9c1a-2d5f3a7c9105', eng, 'thu', null, 'evening',
     'Fellowship', 'Experience', 'confirmed', null, 50)
  on conflict (id) do nothing;

  -- -------------------------------------- two ideas that were always schedule
  --
  -- Wednesday is the team arriving and the property being made ready. Neither
  -- is under consideration; both are what the weekend does. They keep their
  -- own words and become moments, and no clock time is invented for either.

  insert into public.schedule_items
    (id, engagement_id, day_key, starts_label, daypart, title, track, status, note, position)
  values
    ('b1f0a5d2-0f4a-4b1e-9c1a-2d5f3a7c9201', eng, 'wed', null, 'anytime',
     'Fox team arrives', 'Logistics', 'confirmed', 'Time still to be set.', 10),
    ('b1f0a5d2-0f4a-4b1e-9c1a-2d5f3a7c9202', eng, 'wed', null, 'anytime',
     'Set up and unload', 'Logistics', 'confirmed', null, 20)
  on conflict (id) do nothing;

  delete from public.sparks
   where engagement_id = eng
     and id in ('4fbd8c75-267e-4edd-b833-30b94cf1429d',   -- Fox team arrives
                'ab79a18f-c5ee-4d9c-a2af-4110a9127c92');  -- Set up and unload

  -- ------------------------------------------------ the same thing, said twice
  --
  -- Each of these was a moment already on the calendar, repeated as an idea by
  -- an earlier import. None carries any detail the moment does not, and none
  -- has an action, a requirement, a cost, a cue or a note hanging off it, so
  -- the moment is simply the canonical record.

  delete from public.sparks
   where engagement_id = eng
     and id in ('57a2ddc6-ac4c-46e4-a918-3b3a362262bc',   -- Free time, Friday
                '48ebcf91-fa1c-43f6-9787-8f32a8694095',   -- Free time, Saturday
                'f0d184de-8ce9-4536-a373-da0b72a47528',   -- Celebration, Saturday
                '373ef084-ccc1-454b-8a99-a191581e5e16',   -- Breakfast, Sunday
                'b1341d75-885a-4a7d-ad33-56d594f43e1d')   -- Pack up, Sunday
     and not exists (select 1 from public.schedule_items t where t.spark_id = public.sparks.id)
     and not exists (select 1 from public.tasks t where t.spark_id = public.sparks.id)
     and not exists (select 1 from public.resources r where r.spark_id = public.sparks.id)
     and not exists (select 1 from public.budget_lines b where b.spark_id = public.sparks.id)
     and not exists (select 1 from public.run_of_show_cues c where c.spark_id = public.sparks.id)
     and not exists (select 1 from public.spark_notes n where n.spark_id = public.sparks.id);

  -- Nothing else moves. No cue was created, because no source names the
  -- session an illustration belongs inside. No action was created, because
  -- nobody has been asked to do anything yet. The budget, the reference
  -- material and the five open questions are already right and are untouched.
end $$;
