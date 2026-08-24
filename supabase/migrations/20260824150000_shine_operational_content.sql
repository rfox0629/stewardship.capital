-- The operational layer of Founders Weekend 2026, and one structural fix.
--
-- Content first written as the seeded prototype, crafted from the founder
-- brief, becomes rows the team edits: the budget, the task list, resources,
-- open and settled decisions, and the run of show. Where a line traces back
-- to a spark, the row carries the spark's id, so provenance is data rather
-- than convention.
--
-- Every block is guarded so a rerun cannot duplicate work the team has since
-- touched.

-- --------------------------------------------------- route triple uniqueness
--
-- Review finding F1. The route address of an engagement is derived as
-- coalesce(series_slug, slug) / coalesce(edition_label, 'current'), and until
-- now nothing made that derivation unique, so two rows could answer to one
-- URL and the guard would authorize a member of either for both. The index
-- makes the collision impossible instead of unlikely.

create unique index if not exists engagements_route_triple_idx
  on public.engagements (
    organization_id,
    coalesce(series_slug, slug),
    coalesce(edition_label, 'current')
  );

-- ------------------------------------------------------------------ content

do $$
declare
  eng uuid;
  v_spark_notes uuid;
  v_spark_wall uuid;
  v_spark_blanket uuid;
  v_spark_guide uuid;
  v_spark_shuttle uuid;
  v_spark_acoustic uuid;
  v_spark_pourover uuid;
begin
  select e.id into eng
  from public.engagements e
  join public.organizations o on o.id = e.organization_id
  where o.slug = 'shine' and e.slug = 'founders-weekend-2026';

  if eng is null then
    raise exception 'the SHINE engagement is missing';
  end if;

  select id into v_spark_notes    from public.sparks where engagement_id = eng and title = 'Hand written welcome note in every cabin';
  select id into v_spark_wall     from public.sparks where engagement_id = eng and title = 'Founders wall with a one sentence legacy card';
  select id into v_spark_blanket  from public.sparks where engagement_id = eng and title = 'Custom flannel blanket as the weekend gift';
  select id into v_spark_guide    from public.sparks where engagement_id = eng and title = 'Printed weekend field guide with schedule and map';
  select id into v_spark_shuttle  from public.sparks where engagement_id = eng and title = 'Shuttle from Minneapolis for out of state founders';
  select id into v_spark_acoustic from public.sparks where engagement_id = eng and title = 'Live acoustic set at the Saturday bonfire';
  select id into v_spark_pourover from public.sparks where engagement_id = eng and title = 'Local coffee roaster pour over bar on Saturday';

  -- ---------------------------------------------------------------- budget
  if not exists (select 1 from public.budget_lines b where b.engagement_id = eng) then
    insert into public.budget_lines
      (engagement_id, category, label, planned_cents, committed_cents, actual_cents, owner_name, spark_id)
    values
      (eng, 'Venue and lodging', 'Spooner Lake Island Oasis, three nights, full property', 1800000, 1800000, 900000, 'Dave Lindquist', null),
      (eng, 'Venue and lodging', 'Lakeside cabins', 480000, 480000, 240000, 'Dave Lindquist', null),
      (eng, 'Venue and lodging', 'Cleaning and damage deposit', 120000, 120000, 0, 'Dave Lindquist', null),
      (eng, 'Food and beverage', 'Thursday welcome dinner', 240000, 240000, 60000, 'Sam Okafor', null),
      (eng, 'Food and beverage', 'Friday meals, all day', 360000, 360000, 0, 'Sam Okafor', null),
      (eng, 'Food and beverage', 'Saturday meals, all day', 390000, 320000, 0, 'Sam Okafor', null),
      (eng, 'Food and beverage', 'Sunday breakfast', 110000, 0, 0, 'Sam Okafor', null),
      (eng, 'Food and beverage', 'Coffee, snacks, and fire pit s''mores', 140000, 0, 0, 'Sam Okafor', null),
      (eng, 'Food and beverage', 'Dietary accommodations', 110000, 0, 0, 'Sam Okafor', null),
      (eng, 'Program and speakers', 'Guest speaker honorarium, two sessions', 400000, 400000, 200000, 'Brooke Fox', null),
      (eng, 'Program and speakers', 'Speaker travel and lodging', 180000, 100000, 0, 'Brooke Fox', null),
      (eng, 'Program and speakers', 'Workshop materials', 90000, 0, 0, 'Tori Chen', null),
      (eng, 'Program and speakers', 'Devotional guide licensing', 80000, 0, 0, 'Brooke Fox', null),
      (eng, 'Experience', 'Pontoon and boat rental, two days', 160000, 160000, 80000, 'Megan Ellis', null),
      (eng, 'Experience', 'Bonfire wood, chairs, and lighting', 90000, 55000, 0, 'Megan Ellis', null),
      (eng, 'Experience', 'Saturday live acoustic set', 120000, 0, 0, 'Megan Ellis', v_spark_acoustic),
      (eng, 'Experience', 'Fishing guides and gear', 110000, 0, 0, 'Megan Ellis', null),
      (eng, 'Production and AV', 'Sound system, mics, and operator', 220000, 180000, 90000, 'Megan Ellis', null),
      (eng, 'Production and AV', 'Lighting for the great room', 100000, 0, 0, 'Megan Ellis', null),
      (eng, 'Gifts and print', 'Custom flannel blanket, sixty units', 180000, 0, 0, 'Tori Chen', v_spark_blanket),
      (eng, 'Gifts and print', 'Printed weekend field guide', 90000, 64000, 0, 'Tori Chen', v_spark_guide),
      (eng, 'Gifts and print', 'Legacy cards and founders wall', 50000, 35000, 0, 'Tori Chen', v_spark_wall),
      (eng, 'Gifts and print', 'Welcome notes and cabin baskets', 40000, 25000, 0, 'Brooke Fox', v_spark_notes),
      (eng, 'Travel', 'Airport shuttle, Minneapolis', 160000, 0, 0, 'Megan Ellis', v_spark_shuttle),
      (eng, 'Travel', 'Local transport and fuel', 80000, 0, 0, 'Megan Ellis', null),
      (eng, 'Contingency', 'Weather and overflow contingency', 100000, 0, 0, 'Brooke Fox', null);
  end if;

  -- ----------------------------------------------------------------- tasks
  if not exists (select 1 from public.tasks t where t.engagement_id = eng) then
    insert into public.tasks
      (engagement_id, title, owner_name, due_on, status, area, spark_id)
    values
      (eng, 'Confirm the final guest count with the venue', 'Brooke Fox', date '2026-09-04', 'doing', 'Logistics', null),
      (eng, 'Lock the Saturday dinner menu with Spooner Provisions', 'Sam Okafor', date '2026-08-28', 'todo', 'Hospitality', null),
      (eng, 'Write and stage cabin welcome notes', 'Brooke Fox', date '2026-09-25', 'todo', 'Hospitality', v_spark_notes),
      (eng, 'Book the sound operator for both program days', 'Megan Ellis', date '2026-09-01', 'blocked', 'Logistics', null),
      (eng, 'Design the founders wall and legacy cards', 'Tori Chen', date '2026-09-11', 'doing', 'Generosity', v_spark_wall),
      (eng, 'Lay out and print the weekend field guide', 'Tori Chen', date '2026-09-18', 'todo', 'Communications', v_spark_guide),
      (eng, 'Place the flannel blanket order, sixty units', 'Tori Chen', date '2026-08-31', 'todo', 'Generosity', v_spark_blanket),
      (eng, 'Confirm pontoon rental dates', 'Megan Ellis', date '2026-08-24', 'done', 'Logistics', null),
      (eng, 'Collect dietary needs from the guest form', 'Sam Okafor', date '2026-09-08', 'todo', 'Hospitality', null),
      (eng, 'Send the second guest email with travel details', 'Brooke Fox', date '2026-09-02', 'todo', 'Communications', null),
      (eng, 'Walk the property with Dave and mark the fire ring', 'Megan Ellis', date '2026-09-19', 'todo', 'Logistics', null),
      (eng, 'Draft the run of show for both program days', 'Brooke Fox', date '2026-09-12', 'doing', 'Program', null),
      (eng, 'Confirm speaker travel and lodging', 'Brooke Fox', date '2026-08-26', 'doing', 'Program', null),
      (eng, 'Build the Sunday pack up checklist', 'Dave Lindquist', date '2026-10-01', 'todo', 'Logistics', null);
  end if;

  -- ------------------------------------------------------------- resources
  if not exists (select 1 from public.resources r where r.engagement_id = eng) then
    insert into public.resources
      (engagement_id, kind, name, detail, quantity, owner_name, status, spark_id)
    values
      (eng, 'vendor', 'Spooner Lake Island Oasis', 'The full island, three nights on Spooner Lake. Lodging, great room, and grounds.', null, 'Dave Lindquist', 'confirmed', null),
      (eng, 'vendor', 'Spooner Provisions Catering', 'All meals Thursday through Sunday.', null, 'Sam Okafor', 'holding', null),
      (eng, 'vendor', 'Timber and Tone Audio', 'Sound system, mics, and an operator for both program days.', null, 'Megan Ellis', 'needed', null),
      (eng, 'vendor', 'Fox Print Studio', 'Field guide, legacy cards, and signage.', null, 'Tori Chen', 'confirmed', v_spark_guide),
      (eng, 'vendor', 'Lakeside Coffee Co.', 'Saturday morning pour over bar. Still under discussion.', null, 'Sam Okafor', 'needed', v_spark_pourover),
      (eng, 'supply', 'Custom flannel blankets', 'Shine label, handed out Thursday at check in.', '60 units', 'Tori Chen', 'needed', v_spark_blanket),
      (eng, 'supply', 'Fire wood and fire ring seating', 'Delivered Thursday morning and restocked Saturday.', '4 cords, 30 chairs', 'Megan Ellis', 'holding', null),
      (eng, 'supply', 'Cabin welcome baskets', 'Hand written note, water, snacks, and a map.', '26 baskets', 'Brooke Fox', 'needed', v_spark_notes);
  end if;

  -- ------------------------------------------------------------- decisions
  if not exists (select 1 from public.decisions d where d.engagement_id = eng) then
    insert into public.decisions
      (engagement_id, question, context, owner_name, status, outcome, needs_by, spark_id)
    values
      (eng, 'Do we add a live acoustic set on Saturday night?',
       'The spark is in discernment. A budget line exists at 1,200 dollars and nothing is committed.',
       'Megan Ellis', 'open', null, date '2026-08-28', v_spark_acoustic),
      (eng, 'Do we run an airport shuttle from Minneapolis?',
       'Nine guests are flying. Travel has 1,600 dollars planned and nothing committed.',
       'Brooke Fox', 'open', null, date '2026-09-04', v_spark_shuttle),
      (eng, 'Is Friday afternoon fully open, or do we schedule one on ones?',
       'The Friday one on ones are still a draft on the schedule, and the answer gates the field guide print date.',
       'Brooke Fox', 'open', null, date '2026-08-28', null),
      (eng, 'Do we add the Saturday pour over bar?',
       'Adds about 700 dollars and one more vendor to manage on the busiest morning.',
       'Sam Okafor', 'deferred', null, date '2026-09-11', v_spark_pourover),
      (eng, 'Blanket or field guide as the primary gift?',
       'Gift budget is capped at 3,600 dollars.',
       'Tori Chen', 'decided',
       'Both. The blanket is the gift and the field guide is a tool. Gift spend stays at 3,600.',
       date '2026-08-14', null),
      (eng, 'Is there any Sunday programming?',
       'Several people asked for a Sunday morning session.',
       'Brooke Fox', 'decided',
       'No. Sunday is sending, departure, and pack up only. The weekend ends well by ending on time.',
       date '2026-08-07', null);
  end if;

  -- ----------------------------------------------------------- run of show
  if not exists (select 1 from public.run_of_show_cues c where c.engagement_id = eng) then
    insert into public.run_of_show_cues
      (engagement_id, schedule_item_id, at_label, cue, who_name, position, spark_id)
    select eng, s.id, v.at_label, v.cue, v.who_name, v.position, v.spark
    from (values
      ('thu', 'Opening welcome and weekend frame', '7:30 pm', 'House lights down, walk in music fades', 'Megan Ellis', 1, null::uuid),
      ('thu', 'Opening welcome and weekend frame', '7:32 pm', 'Ryan opens, three minutes, welcome and the weekend frame. Emcee, not a session.', 'Ryan Fox', 2, null),
      ('thu', 'Opening welcome and weekend frame', '7:36 pm', 'Brooke covers cabins, meals, and quiet hours', 'Brooke Fox', 3, null),
      ('thu', 'Opening welcome and weekend frame', '7:45 pm', 'Table introductions, two minutes each', 'Ryan Fox', 4, null),
      ('fri', 'Session one, founding with open hands', '9:15 am', 'Ryan introduces the speaker, ninety seconds', 'Ryan Fox', 1, null),
      ('fri', 'Session one, founding with open hands', '9:17 am', 'Session one begins, mic check already confirmed', 'Megan Ellis', 2, null),
      ('fri', 'Session one, founding with open hands', '10:20 am', 'Ten minute warning to the speaker', 'Megan Ellis', 3, null),
      ('sat', 'Founders wall and legacy cards', '5:00 pm', 'Cards and pens already on every table', 'Tori Chen', 1, null),
      ('sat', 'Founders wall and legacy cards', '5:05 pm', 'Ryan explains the founders wall, two minutes', 'Ryan Fox', 2, null),
      ('sat', 'Founders wall and legacy cards', '5:20 pm', 'Guests post cards, music underneath', 'Megan Ellis', 3, null),
      ('sat', 'Closing session and commissioning', '7:15 pm', 'Lights to warm, fire lit outside for afterwards', 'Megan Ellis', 1, null),
      ('sat', 'Closing session and commissioning', '8:30 pm', 'Commissioning, everyone stands', 'Brooke Fox', 2, null)
    ) as v(day_key, item_title, at_label, cue, who_name, position, spark)
    join public.schedule_items s
      on s.engagement_id = eng and s.day_key = v.day_key and s.title = v.item_title;

    -- The founders wall cues descend from the spark that started it.
    update public.run_of_show_cues c
       set spark_id = v_spark_wall
      from public.schedule_items s
     where c.schedule_item_id = s.id
       and c.engagement_id = eng
       and s.title = 'Founders wall and legacy cards';
  end if;
end $$;
