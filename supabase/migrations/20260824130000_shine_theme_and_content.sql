-- SHINE Founders Weekend 2026: the approved theme, and the working content.
--
-- The theme is structured configuration read by lib/spark/theme.ts, which
-- validates every value before any of it can become CSS. Writing it here does
-- not grant it anything; a value that fails validation falls back to the
-- Spark default.
--
-- The content is the real planning state of the engagement, carried over from
-- the seeded prototype that was crafted from the founder brief. From here on
-- these are rows the team edits, not fixtures. Every insert is guarded so
-- rerunning the migration cannot duplicate work the team has since touched.

-- ------------------------------------------------------------------ theme

update public.organizations
set theme = jsonb_build_object(
  'images', jsonb_build_object('organizationLogo', '/clients/shine/shine-logo.png')
)
where slug = 'shine';

update public.engagements e
set theme = jsonb_build_object(
  'colors', jsonb_build_object(
    'primary',       '#4a533e',  -- forest
    'secondary',     '#814431',  -- rust
    'accent',        '#447c9d',  -- lake blue
    'surface',       '#faf6f1',  -- warm cream
    'surfaceRaised', '#f2ece2',
    'ink',           '#3a3a3b',  -- charcoal
    'deep',          '#662722'   -- deep burgundy
  ),
  'fonts', jsonb_build_object(
    'display', 'fraunces',
    'sub',     'aileron',
    'body',    'public-sans'
  ),
  'images', jsonb_build_object(
    'organizationLogo', '/clients/shine/shine-logo.png',
    'hero', '/clients/shine/venue/hero-lakehouse-dusk-1920.jpg',
    'gallery', jsonb_build_array(
      '/clients/shine/venue/fire-circle-pines-1200.jpg',
      '/clients/shine/venue/dock-sunrise-1200.jpg',
      '/clients/shine/venue/lakeside-fire-sunset-1200.jpg'
    )
  ),
  'copy', jsonb_build_object(
    'tagline', 'Enlarge the Tent',
    'welcome', 'A long weekend at the lake for founders and their families. Room to breathe, time to talk, and a fire that stays lit late.'
  ),
  'poweredBySpark', true
)
from public.organizations o
where e.organization_id = o.id
  and o.slug = 'shine'
  and e.slug = 'founders-weekend-2026';

-- The engagement is being planned at a real place: the Spooner Lake Island
-- Oasis, a six acre private island on Spooner Lake. The prototype's invented
-- lodge name goes away, and the two schedule rows that pointed at the wrong
-- lake follow the venue.
update public.engagements e
set venue = 'Spooner Lake Island Oasis'
from public.organizations o
where e.organization_id = o.id
  and o.slug = 'shine'
  and e.slug = 'founders-weekend-2026';

-- ---------------------------------------------------------------- content

do $$
declare
  eng uuid;
begin
  select e.id into eng
  from public.engagements e
  join public.organizations o on o.id = e.organization_id
  where o.slug = 'shine' and e.slug = 'founders-weekend-2026';

  if eng is null then
    raise exception 'the SHINE engagement is missing';
  end if;

  -- Sparks. Only when the engagement has none, so a rerun never duplicates
  -- and never overwrites what the team has captured since.
  if not exists (select 1 from public.sparks s where s.engagement_id = eng) then
    insert into public.sparks
      (engagement_id, title, detail, category, status, raised_by_name, decision, decided_at)
    values
      (eng, 'Sunrise pontoon prayer on Saturday',
       'Optional, six thirty, no more than twelve people. Coffee on the boat.',
       'Experience', 'captured', 'Sam Okafor', null, null),
      (eng, 'Shuttle from Minneapolis for out of state founders',
       'Nine guests are flying in. A shuttle removes nine rental cars.',
       'Logistics', 'captured', 'Megan Ellis', null, null),
      (eng, 'Photo book mailed thirty days after the weekend',
       'Arrives after the glow fades, which is the point.',
       'Communications', 'captured', 'Tori Chen', null, null),
      (eng, 'Sunday sending liturgy card for the drive home',
       'One card per car. Something to read out loud on the way out.',
       'Generosity', 'captured', 'Ryan Fox', null, null),
      (eng, 'Live acoustic set at the Saturday bonfire',
       'Two hours, one guitar, nothing amplified past the tree line.',
       'Experience', 'discussing', 'Megan Ellis', null, null),
      (eng, 'Late night pie bar on Friday',
       'Local pies out at nine thirty. Low effort, high memory.',
       'Hospitality', 'discussing', 'Sam Okafor', null, null),
      (eng, 'Local coffee roaster pour over bar on Saturday',
       'Lakeside Coffee would staff it for the morning.',
       'Hospitality', 'discussing', 'Sam Okafor', null, null),
      (eng, 'Hand written welcome note in every cabin',
       'One note per household, staged before anyone arrives Thursday.',
       'Hospitality', 'approved', 'Brooke Fox',
       'Approved. Brooke writes them, Megan stages the cabins Thursday morning.',
       timestamptz '2026-08-04 12:00:00-05'),
      (eng, 'Founders wall with a one sentence legacy card',
       'Every guest writes one sentence about what they want to steward well. The cards go on the wall and go home with them.',
       'Generosity', 'approved', 'Ryan Fox',
       'Approved. Forty five minutes on Saturday before dinner.',
       timestamptz '2026-08-04 12:00:00-05'),
      (eng, 'Custom flannel blanket as the weekend gift',
       'Shine label, given out Thursday so people actually use them at the fire.',
       'Generosity', 'approved', 'Tori Chen',
       'Approved at sixty units. Order by the end of August to make the date.',
       timestamptz '2026-08-18 12:00:00-05'),
      (eng, 'Printed weekend field guide with schedule and map',
       'Pocket sized. Schedule, map, house rules, and blank pages for notes.',
       'Communications', 'approved', 'Tori Chen',
       'Approved. Print by the middle of September.',
       timestamptz '2026-08-18 12:00:00-05'),
      (eng, 'Ryan opens each day with a three minute frame',
       'Not a session. Three minutes to set the day and hand off.',
       'Program', 'approved', 'Brooke Fox',
       'Approved. Ryan is emcee, not a speaker, so these stay at three minutes.',
       timestamptz '2026-08-04 12:00:00-05'),
      (eng, 'Kids craft table during Friday sessions',
       'Would let more parents attend both morning sessions.',
       'Hospitality', 'parked', 'Brooke Fox',
       'Parked for 2027. Childcare licensing is not solved for this venue.',
       timestamptz '2026-07-31 12:00:00-05'),
      (eng, 'Saturday morning polar plunge',
       'It would be memorable.',
       'Experience', 'declined', 'Ryan Fox',
       'Declined. Water temperature and liability.',
       timestamptz '2026-08-04 12:00:00-05');
  end if;

  -- The schedule, in day order. Position carries the order within a day.
  if not exists (select 1 from public.schedule_items i where i.engagement_id = eng) then
    insert into public.schedule_items
      (engagement_id, day_key, starts_label, ends_label, title, track, location, status, note, position, spark_id)
    values
      (eng, 'thu', '3:00 pm', '6:00 pm', 'Cabin check in and arrivals', 'Hospitality', 'Lodge front porch', 'confirmed', null, 1, null),
      (eng, 'thu', '6:00 pm', '7:15 pm', 'Welcome dinner', 'Meals', 'Great room', 'confirmed', null, 2, null),
      (eng, 'thu', '7:30 pm', '8:30 pm', 'Opening welcome and weekend frame', 'Program', 'Great room', 'confirmed',
       'Ryan emcees. There is no teaching session on Thursday.', 3, null),
      (eng, 'thu', '8:30 pm', '10:00 pm', 'Lakefront bonfire and s''mores', 'Experience', 'Fire ring', 'confirmed', null, 4, null),

      (eng, 'fri', '7:00 am', '8:30 am', 'Coffee and breakfast', 'Meals', 'Great room', 'confirmed', null, 1, null),
      (eng, 'fri', '8:30 am', '8:45 am', 'Morning frame', 'Program', 'Great room', 'confirmed',
       'Three minutes from the emcee, then hand off.', 2,
       (select id from public.sparks where engagement_id = eng and title = 'Ryan opens each day with a three minute frame')),
      (eng, 'fri', '8:45 am', '9:15 am', 'Morning devotional', 'Program', 'Great room', 'draft', 'Still deciding who leads.', 3, null),
      (eng, 'fri', '9:15 am', '10:30 am', 'Session one, founding with open hands', 'Program', 'Great room', 'confirmed', null, 4, null),
      (eng, 'fri', '10:30 am', '11:00 am', 'Break', 'Meals', 'Porch', 'confirmed', null, 5, null),
      (eng, 'fri', '11:00 am', '12:15 pm', 'Roundtable, the hard number', 'Program', 'Great room', 'confirmed', null, 6, null),
      (eng, 'fri', '12:15 pm', '1:30 pm', 'Lunch', 'Meals', 'Great room', 'confirmed', null, 7, null),
      (eng, 'fri', '1:30 pm', '4:30 pm', 'Open afternoon, pontoon, hiking, and rest', 'Experience', 'Spooner Lake', 'confirmed', null, 8, null),
      (eng, 'fri', '4:30 pm', '5:30 pm', 'Founder one on ones', 'Program', 'Cabins and dock', 'draft', null, 9, null),
      (eng, 'fri', '5:30 pm', '7:00 pm', 'Dinner', 'Meals', 'Great room', 'confirmed', null, 10, null),
      (eng, 'fri', '7:00 pm', '8:15 pm', 'Session two, stewardship at scale', 'Program', 'Great room', 'confirmed', null, 11, null),
      (eng, 'fri', '8:15 pm', '10:00 pm', 'Fire pit conversations', 'Experience', 'Fire ring', 'confirmed', null, 12, null),

      (eng, 'sat', '7:00 am', '8:30 am', 'Coffee and breakfast', 'Meals', 'Great room', 'confirmed', null, 1, null),
      (eng, 'sat', '8:30 am', '8:45 am', 'Morning frame', 'Program', 'Great room', 'confirmed', null, 2,
       (select id from public.sparks where engagement_id = eng and title = 'Ryan opens each day with a three minute frame')),
      (eng, 'sat', '8:45 am', '9:15 am', 'Morning devotional', 'Program', 'Great room', 'draft', null, 3, null),
      (eng, 'sat', '9:15 am', '10:45 am', 'Session three, the family table', 'Program', 'Great room', 'confirmed', null, 4, null),
      (eng, 'sat', '10:45 am', '11:15 am', 'Break', 'Meals', 'Porch', 'confirmed', null, 5, null),
      (eng, 'sat', '11:15 am', '12:30 pm', 'Workshop, writing your stewardship statement', 'Program', 'Great room', 'confirmed', null, 6, null),
      (eng, 'sat', '12:30 pm', '1:45 pm', 'Lunch', 'Meals', 'Great room', 'confirmed', null, 7, null),
      (eng, 'sat', '1:45 pm', '4:00 pm', 'Free afternoon, fishing and lake', 'Experience', 'Spooner Lake', 'confirmed', null, 8, null),
      (eng, 'sat', '4:00 pm', '5:00 pm', 'Family photos at the point', 'Experience', 'The point', 'draft', null, 9, null),
      (eng, 'sat', '5:00 pm', '5:45 pm', 'Founders wall and legacy cards', 'Experience', 'Great room', 'confirmed', null, 10,
       (select id from public.sparks where engagement_id = eng and title = 'Founders wall with a one sentence legacy card')),
      (eng, 'sat', '5:45 pm', '7:15 pm', 'Harvest dinner', 'Meals', 'Great room', 'confirmed', null, 11, null),
      (eng, 'sat', '7:15 pm', '8:45 pm', 'Closing session and commissioning', 'Program', 'Great room', 'confirmed', null, 12, null),
      (eng, 'sat', '8:45 pm', '10:30 pm', 'Bonfire, music, and testimony', 'Experience', 'Fire ring', 'confirmed', null, 13, null),

      (eng, 'sun', '8:00 am', '9:15 am', 'Breakfast and packing', 'Meals', 'Great room', 'confirmed', null, 1, null),
      (eng, 'sun', '9:15 am', '10:00 am', 'Sending and prayer', 'Program', 'Great room', 'confirmed', null, 2, null),
      (eng, 'sun', '10:00 am', '12:00 pm', 'Departure', 'Logistics', 'Front drive', 'confirmed', null, 3, null),
      (eng, 'sun', '12:00 pm', '3:00 pm', 'Pack up and venue walkthrough', 'Logistics', 'Whole property', 'confirmed',
       'Sunday is departure and pack up only. No program.', 4, null);
  end if;
end $$;
