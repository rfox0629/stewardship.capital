-- The working spreadsheets become the workspace.
--
-- Ryan's sheets are now the source of truth for the Founders Weekend plan.
-- The planning content that came before them was prototype material built
-- from an older handwritten sheet; it is archived in the archive schema
-- (archive.shine_20260901_*) before this migration runs, and nothing here
-- touches tenancy, membership, invitations, staff grants, or the audit trail.
--
-- Where the sheet is uncertain, the uncertainty is the data. An idea whose
-- wording or cost is unresolved is loaded as something to discuss, carrying
-- the question in its own words, rather than being quietly decided here.

do $$
declare
  eng uuid;
  venue_id uuid;
begin
  select e.id into eng
  from public.engagements e
  join public.organizations o on o.id = e.organization_id
  where o.slug = 'shine' and e.slug = 'founders-weekend-2026';

  if eng is null then return; end if;

  -- Superseded planning content. Membership, invitations, staff, audit, and
  -- the engagement's own identity are untouched.
  delete from public.run_of_show_cues where engagement_id = eng;
  delete from public.spark_notes where engagement_id = eng;
  delete from public.tasks where engagement_id = eng;
  delete from public.resources where engagement_id = eng;
  delete from public.budget_lines where engagement_id = eng;
  delete from public.decisions where engagement_id = eng;
  delete from public.schedule_items where engagement_id = eng;
  delete from public.sparks where engagement_id = eng;

  -- ------------------------------------------------------------- the ideas
  --
  -- Wording is the sheet's, kept letter for letter. 'discussing' marks the
  -- entries the sheet itself leaves open, with the open question in detail.
  insert into public.sparks (engagement_id, title, detail, status, tentative_day, tentative_daypart)
  values
    (eng, 'Fox team arrives', null, 'captured', 'wed', null),
    (eng, 'Set up and unload', null, 'captured', 'wed', null),

    (eng, 'Candles or lanterns along the drive', null, 'captured', 'thu', 'evening'),
    (eng, 'Guests arrive between approximately 6 to 7 PM?', 'The sheet leaves the arrival window open, written with a question mark.', 'discussing', 'thu', 'evening'),
    (eng, 'Bathroom flowers with SHINE logo and anchor Scripture', null, 'captured', 'thu', null),
    (eng, 'Bible character icebreaker', null, 'captured', 'thu', 'evening'),
    (eng, 'Printed name tags and blank tags', null, 'captured', 'thu', null),
    (eng, 'Flowers in the pool?', 'Only if weather permits. The sheet leaves this conditional.', 'discussing', 'thu', null),
    (eng, 'Hors d''oeuvres and dessert', null, 'captured', 'thu', 'evening'),
    (eng, 'Black box welcome gift in each room with SHINE sticker and Scripture', null, 'captured', 'thu', null),
    (eng, 'Handwritten personalized note from Sammy and Suzanne', null, 'captured', 'thu', null),
    (eng, 'Hula hoop passing activity around circle after worship and welcome', null, 'captured', 'thu', 'evening'),

    (eng, 'Breakfast: egg bake, yogurt parfait, sausage, fruit', null, 'captured', 'fri', 'morning'),
    (eng, 'Barista and SHINE specialty drink', null, 'captured', 'fri', 'morning'),
    (eng, 'Tactical sermon illustration', null, 'captured', 'fri', 'morning'),
    (eng, 'Build the Tent race', 'The sheet notes "$25 per tent?" without settling it.', 'discussing', 'fri', null),
    (eng, 'Military knot tying technique', null, 'captured', 'fri', null),
    (eng, 'Human knot tying game', null, 'captured', 'fri', null),
    (eng, 'Lunch: cold sandwiches, chips, salad, vegetables', null, 'captured', 'fri', 'afternoon'),
    (eng, 'Free time', null, 'captured', 'fri', 'afternoon'),
    (eng, 'Bingo of Waypoint/Waymani''s favorite things', 'Wording carried across from the sheet as written. The name needs clarification.', 'discussing', 'fri', 'afternoon'),
    (eng, 'Dinner: surf and turf, salmon, steak, Brussels sprouts or asparagus, salad', null, 'captured', 'fri', 'evening'),
    (eng, 'Bonfire or arcades and movie', null, 'captured', 'fri', 'evening'),
    (eng, 'Chill and candy', null, 'captured', 'fri', 'evening'),

    (eng, 'Breakfast: waffle bar or French toast sticks, fruit, bacon', null, 'captured', 'sat', 'morning'),
    (eng, 'Barista and SHINE specialty', null, 'captured', 'sat', 'morning'),
    (eng, 'Tactical sermon illustration', null, 'captured', 'sat', 'morning'),
    (eng, 'Rope Holder', null, 'captured', 'sat', null),
    (eng, 'Lunch: wood fired pizzas', null, 'captured', 'sat', 'afternoon'),
    (eng, 'Free time', null, 'captured', 'sat', 'afternoon'),
    (eng, 'Boat ride or cornhole tournament', null, 'captured', 'sat', 'afternoon'),
    (eng, 'Prizes for first, second, and third place teams', null, 'captured', 'sat', 'afternoon'),
    (eng, 'Stakes to take home for the night', null, 'captured', 'sat', 'evening'),
    (eng, 'Dinner: brisket, potatoes, salad, dessert', null, 'captured', 'sat', 'evening'),
    (eng, '$1 Billion Balloon Decor', 'Wording carried across from the sheet as written. Needs clarification.', 'discussing', 'sat', 'evening'),
    (eng, 'Celebration', null, 'captured', 'sat', 'evening'),
    (eng, 'Glow run or walk', null, 'captured', 'sat', 'evening'),

    (eng, 'Morning oatmeal or French toast bake, egg bites, fruit to go', null, 'captured', 'sun', 'morning'),
    (eng, 'Breakfast', null, 'captured', 'sun', 'morning'),
    (eng, 'Pack up', null, 'captured', 'sun', null),
    (eng, 'Departure and sending', null, 'captured', 'sun', null);

  -- The sheet settles one thing outright, so it is recorded as settled.
  insert into public.sparks
    (engagement_id, title, detail, status, decision, decided_at, decided_by_name)
  values
    (eng, 'Sunday programming', 'The schedule sheet reads "No Sunday program".', 'parked',
     'No Sunday program. Sunday is grab and go breakfast, pack, checkout, departures, and final cleanup.',
     now(), 'Working sheet');

  -- ---------------------------------------------------------- the schedule
  --
  -- Exactly what the sheet shows. Entries the sheet gives without a clock
  -- time keep no clock time; they carry the part of day it names instead.
  insert into public.schedule_items
    (engagement_id, day_key, starts_label, daypart, title, track, status, position)
  values
    (eng, 'fri', null,      'morning',   'Breakfast and coffee', 'Meals', 'confirmed', 1),
    (eng, 'fri', '9:00 am', null, 'Worship', 'Worship', 'confirmed', 2),
    (eng, 'fri', '9:20 am', null, 'Devotional', 'Program', 'confirmed', 3),
    (eng, 'fri', '9:30 am', null, 'Missionaries recap: Mike, Victor, and Keta', 'Program', 'confirmed', 4),
    (eng, 'fri', '10:15 am', null, 'Break', 'Hospitality', 'confirmed', 5),
    (eng, 'fri', '10:30 am', null, 'SHINE What''s Next: Mike', 'Program', 'confirmed', 6),
    (eng, 'fri', '11:30 am', null, 'Word from Sammy and Suzanne on SHINE What''s Next', 'Program', 'confirmed', 7),
    (eng, 'fri', '12:00 pm', null, 'Lunch', 'Meals', 'confirmed', 8),
    (eng, 'fri', null,      'afternoon', 'Free time', 'Experience', 'confirmed', 9),
    (eng, 'fri', '5:00 pm', null, 'Dinner', 'Meals', 'confirmed', 10),
    (eng, 'fri', '6:30 pm', null, 'Worship', 'Worship', 'confirmed', 11),
    (eng, 'fri', '6:50 pm', null, 'Impact: Rev. Canna and videos', 'Program', 'confirmed', 12),
    (eng, 'fri', null,      'evening',   'Fellowship', 'Experience', 'confirmed', 13),

    (eng, 'sat', null,      'morning',   'Breakfast and coffee', 'Meals', 'confirmed', 1),
    (eng, 'sat', '9:00 am', null, 'Worship', 'Worship', 'confirmed', 2),
    (eng, 'sat', '9:20 am', null, 'Devotional', 'Program', 'confirmed', 3),
    (eng, 'sat', '9:30 am', null, 'Impact stories', 'Program', 'confirmed', 4),
    (eng, 'sat', '10:15 am', null, 'Break', 'Hospitality', 'confirmed', 5),
    (eng, 'sat', '10:30 am', null, 'Sammy big vision message', 'Program', 'confirmed', 6),
    (eng, 'sat', '11:30 am', null, 'Partner ask', 'Program', 'confirmed', 7),
    (eng, 'sat', '11:45 am', null, 'Giving logistics: Mike', 'Program', 'confirmed', 8),
    (eng, 'sat', '12:00 pm', null, 'Lunch', 'Meals', 'confirmed', 9),
    (eng, 'sat', null,      'afternoon', 'Free time', 'Experience', 'confirmed', 10),
    (eng, 'sat', '5:00 pm', null, 'Dinner', 'Meals', 'confirmed', 11),
    (eng, 'sat', null,      'evening',   'Celebration: concert, bonfires, games, trivia, desserts', 'Experience', 'confirmed', 12),

    (eng, 'sun', null, 'morning', 'Grab and go breakfast and coffee', 'Meals', 'confirmed', 1),
    (eng, 'sun', null, 'anytime', 'Pack, checkout, departures, final cleanup', 'Logistics', 'confirmed', 2);

  -- ------------------------------------------------------------ the budget
  insert into public.budget_lines
    (engagement_id, category, label, planned_cents, committed_cents, actual_cents, status, note)
  values
    (eng, 'Venue', 'Lodging and property', 2500000, 0, 0, 'estimate', null),
    (eng, 'Recreation', 'Pontoon rental', 300000, 0, 0, 'discuss', null),
    (eng, 'Recreation', 'Two jet ski rentals', 0, 0, 0, 'discuss', 'Amount to be determined. The sheet shows no figure.'),
    (eng, 'Food', 'Meals, snacks, and desserts', 1250000, 0, 0, 'estimate', null),
    (eng, 'Hospitality', 'Barista and espresso equipment', 150000, 0, 0, 'discuss', null),
    (eng, 'Program', 'Worship leader', 250000, 0, 0, 'discuss', null),
    (eng, 'Production', 'Photo and video', 350000, 0, 0, 'discuss', null),
    (eng, 'Decor', 'Flowers, arrival, and room touches', 150000, 0, 0, 'estimate', null),
    (eng, 'Hospitality', 'SHINE swag and welcome gifts', 150000, 0, 0, 'estimate', null),
    (eng, 'Experience', 'Games, prizes, and glow supplies', 50000, 0, 0, 'estimate', null),
    (eng, 'Print', 'Programs, signage, journals, and cards', 50000, 0, 0, 'estimate', null),
    (eng, 'Hospitality', 'Bathroom and room essentials', 50000, 0, 0, 'estimate', null),
    (eng, 'Program', 'Tent, rope, stakes, and message props', 50000, 0, 0, 'estimate', null),
    (eng, 'Reserve', 'Contingency', 250000, 0, 0, 'protected', null);

  -- ----------------------------------------------------------- the actions
  insert into public.tasks (engagement_id, title, owner_name, due_on, status)
  values
    (eng, 'Write welcome notes', 'Sammy', date '2026-09-20', 'todo'),
    (eng, 'Confirm worship leader', 'Ryan', date '2026-09-10', 'todo'),
    (eng, 'Get barista quote', 'Brooke', date '2026-09-08', 'todo');

  -- The venue itself is event identity, not prototype content, so it stays.
  insert into public.resources (engagement_id, kind, name, detail, status)
  values (eng, 'vendor', 'Spooner Lake Island Oasis',
          'The property for the weekend.', 'confirmed')
  returning id into venue_id;
end $$;
